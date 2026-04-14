import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

// ─── Job shape ────────────────────────────────────────────────────────────────

interface NotificationJobData {
  notificationId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

// ─── Discord Rich Embed types ─────────────────────────────────────────────────

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordWebhookBody {
  username: string;
  embeds: DiscordEmbed[];
}

// ─── Slack Block Kit types ────────────────────────────────────────────────────

interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

interface SlackSectionBlock {
  type: 'section';
  text: SlackTextObject;
  fields?: SlackTextObject[];
}

interface SlackDividerBlock {
  type: 'divider';
}

interface SlackContextBlock {
  type: 'context';
  elements: SlackTextObject[];
}

type SlackBlock = SlackSectionBlock | SlackDividerBlock | SlackContextBlock;

interface SlackWebhookBody {
  blocks: SlackBlock[];
}

// ─── Embed / block builder ────────────────────────────────────────────────────

/** Discord colour palette keyed by event-type prefix. */
const DISCORD_COLORS: Record<string, number> = {
  'expense:added':        0x5865f2, // blurple
  'expense:cancelled':    0xed4245, // red
  'settlement:confirmed': 0x57f287, // green
  'settlement:failed':    0xed4245, // red
  'member:joined':        0xfee75c, // yellow
  'member:left':          0xfee75c, // yellow
  'recurring:triggered':  0xeb459e, // pink
  'token:minted':         0x57f287, // green
};

const DISCORD_COLOR_DEFAULT = 0x99aab5; // grey

/** Human-readable title for each notification type. */
const TYPE_LABELS: Record<string, string> = {
  'expense:added':        'New Expense Added',
  'expense:cancelled':    'Expense Cancelled',
  'settlement:confirmed': 'Settlement Confirmed',
  'settlement:failed':    'Settlement Failed',
  'member:joined':        'Member Joined Group',
  'member:left':          'Member Left Group',
  'recurring:triggered':  'Recurring Expense Created',
  'token:minted':         'Reputation Token Minted',
};

function buildDiscordEmbed(
  type: string,
  payload: Record<string, unknown>,
  notificationId: string,
): DiscordWebhookBody {
  const color = DISCORD_COLORS[type] ?? DISCORD_COLOR_DEFAULT;
  const title = TYPE_LABELS[type] ?? `Notification: ${type}`;

  const fields: DiscordEmbedField[] = [];

  // Populate well-known fields from the payload
  if (payload['groupName'])  fields.push({ name: 'Group',       value: String(payload['groupName']),  inline: true });
  if (payload['amount'])     fields.push({ name: 'Amount',      value: String(payload['amount']),     inline: true });
  if (payload['currency'])   fields.push({ name: 'Currency',    value: String(payload['currency']),   inline: true });
  if (payload['paidBy'])     fields.push({ name: 'Paid by',     value: String(payload['paidBy']),     inline: true });
  if (payload['description'])fields.push({ name: 'Description', value: String(payload['description']), inline: false });
  if (payload['userName'])   fields.push({ name: 'User',        value: String(payload['userName']),   inline: true });

  // Catch-all: include any remaining payload keys not already handled
  const handled = new Set(['groupName','amount','currency','paidBy','description','userName']);
  for (const [key, val] of Object.entries(payload)) {
    if (!handled.has(key) && val !== undefined && val !== null) {
      fields.push({ name: key, value: String(val), inline: true });
    }
  }

  const embed: DiscordEmbed = {
    title,
    color,
    fields: fields.length > 0 ? fields : undefined,
    footer: { text: `StellarSplit · id: ${notificationId}` },
    timestamp: new Date().toISOString(),
  };

  return { username: 'StellarSplit', embeds: [embed] };
}

function buildSlackBlocks(
  type: string,
  payload: Record<string, unknown>,
  notificationId: string,
): SlackWebhookBody {
  const title = TYPE_LABELS[type] ?? `Notification: ${type}`;

  // Header section
  const headerBlock: SlackSectionBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: `*${title}*` },
  };

  // Payload fields section (pair them for two-column layout)
  const fieldOrder = ['groupName', 'amount', 'currency', 'paidBy', 'description', 'userName'];
  const fieldTexts: SlackTextObject[] = [];

  for (const key of fieldOrder) {
    if (payload[key] !== undefined && payload[key] !== null) {
      fieldTexts.push({ type: 'mrkdwn', text: `*${key}*\n${String(payload[key])}` });
    }
  }

  // Remaining keys not in the ordered list
  const handled = new Set(fieldOrder);
  for (const [key, val] of Object.entries(payload)) {
    if (!handled.has(key) && val !== undefined && val !== null) {
      fieldTexts.push({ type: 'mrkdwn', text: `*${key}*\n${String(val)}` });
    }
  }

  const blocks: SlackBlock[] = [headerBlock];

  if (fieldTexts.length > 0) {
    // Slack allows max 10 fields per section
    const chunk = fieldTexts.slice(0, 10);
    const fieldsSection: SlackSectionBlock = {
      type: 'section',
      text: { type: 'mrkdwn', text: ' ' },
      fields: chunk,
    };
    blocks.push(fieldsSection);
  }

  blocks.push({ type: 'divider' });

  const contextBlock: SlackContextBlock = {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `StellarSplit · event: \`${type}\` · id: \`${notificationId}\`` }],
  };
  blocks.push(contextBlock);

  return { blocks };
}

// ─── Worker ───────────────────────────────────────────────────────────────────

@Processor('notifications')
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId, userId, type, payload } = job.data;
    this.logger.log({ notificationId, userId, type }, 'Processing notification');

    await Promise.all([
      this.sendDiscord(notificationId, type, payload),
      this.sendSlack(notificationId, type, payload),
    ]);
  }

  // ── Discord ──────────────────────────────────────────────────────────────

  private async sendDiscord(
    notificationId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const url = this.config.get<string>('DISCORD_WEBHOOK_URL');
    if (!url) return;

    const secret = this.config.get<string>('DISCORD_WEBHOOK_SECRET');
    const embedBody = buildDiscordEmbed(type, payload, notificationId);
    const body = JSON.stringify(embedBody);
    const sig = crypto.createHmac('sha256', secret ?? '').update(body).digest('hex');

    try {
      await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json', 'X-Signature': sig },
        timeout: 5000,
      });
      this.logger.log({ notificationId }, 'Discord notification sent');
    } catch (err) {
      this.logger.warn({ notificationId, err: String(err) }, 'Discord notification failed');
      throw err; // triggers BullMQ retry
    }
  }

  // ── Slack ────────────────────────────────────────────────────────────────

  private async sendSlack(
    notificationId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const url = this.config.get<string>('SLACK_WEBHOOK_URL');
    if (!url) return;

    const secret = this.config.get<string>('SLACK_WEBHOOK_SECRET');
    const blockBody = buildSlackBlocks(type, payload, notificationId);
    const body = JSON.stringify(blockBody);
    const sig = crypto.createHmac('sha256', secret ?? '').update(body).digest('hex');

    try {
      await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json', 'X-Signature': sig },
        timeout: 5000,
      });
      this.logger.log({ notificationId }, 'Slack notification sent');
    } catch (err) {
      this.logger.warn({ notificationId, err: String(err) }, 'Slack notification failed');
      // Slack failures are non-fatal — do not rethrow so Discord success is not lost
    }
  }
}
