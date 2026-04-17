/**
 * Notification Service for Social Bot Integration.
 * Supports Discord, Slack, and generic webhooks.
 */
import { forwardToWebhookProxy } from './webhook-proxy';

export interface WebhookPayload {
  [key: string]: unknown;
  content?: string;
  username?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
}

export async function sendWebhookNotification(
  url: string, 
  expenseData: { description: string; amount: number; payer: string; groupName: string }
): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;

  const amountXlm = (expenseData.amount / 10_000_000).toFixed(2);
  const payload: WebhookPayload = {
    username: 'Birik Bot',
    content: `🚀 **Yeni Harcama!**\n**Grup:** ${expenseData.groupName}\n**Açıklama:** ${expenseData.description}\n**Miktar:** ${amountXlm} XLM\n**Ödeyen:** ${expenseData.payer}`,
  };

  try {
    return await forwardToWebhookProxy(url, payload);
  } catch (err) {
    console.warn('Webhook notification failed:', err);
    return true; 
  }
}

/** Settlement planı hazır olduğunda gönderilebilecek bildirim. */
export async function sendSettlementReadyNotification(
  url: string,
  data: { groupName: string; transactionCount: number }
): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  const payload: WebhookPayload = {
    username: 'Birik Bot',
    content: `✅ **Settlement planı hazır**\n**Grup:** ${data.groupName}\n**Transfer sayısı:** ${data.transactionCount}`,
  };
  try {
    return await forwardToWebhookProxy(url, payload);
  } catch (err) {
    console.warn('Webhook settlement notification failed:', err);
    return true;
  }
}

export function generateTelegramShareUrl(groupId: number, groupName: string): string {
  const text = `Join my Birik group: ${groupName}!\n\nUse this link to join and split expenses on-chain: https://stellarsplit.app/join/${groupId}\n\nProtocol: stellarsplit:join:${groupId}`;
  return `https://t.me/msg?text=${encodeURIComponent(text)}`;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Tarayıcınız masaüstü bildirimlerini desteklemiyor.');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export function sendLocalNotification(title: string, body: string, icon: string = '/favicon.svg') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon,
      badge: '/favicon.svg'
    });
    
    setTimeout(() => notification.close(), 5000);
  } catch {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon,
          badge: '/favicon.svg'
        });
      });
    }
  }
}
