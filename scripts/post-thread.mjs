#!/usr/bin/env node
/**
 * Birik — Twitter/X thread auto-poster.
 *
 * Reads the source of truth at `docs/social/twitter-threads.md`, extracts a
 * named thread (1, 2, or 3), posts each tweet sequentially as a reply chain,
 * attaches listed screenshots, and prints a summary.
 *
 * Usage (from GitHub Actions or locally):
 *   node scripts/post-thread.mjs --thread=1 --dry-run
 *   node scripts/post-thread.mjs --thread=2
 *
 * Environment variables required when NOT in --dry-run mode:
 *   TWITTER_API_KEY
 *   TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN
 *   TWITTER_ACCESS_TOKEN_SECRET
 *
 * See docs/TWITTER_AUTOMATION.md for credential setup.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── CLI args ────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) return [];
    return [[m[1], m[2] === undefined ? true : m[2]]];
  }),
);

const DRY_RUN = args['dry-run'] === true || args['dry-run'] === 'true';
const THREAD_NUMBER = Number.parseInt(args.thread ?? '1', 10);

if (!Number.isInteger(THREAD_NUMBER) || THREAD_NUMBER < 1) {
  console.error('Error: --thread=<n> must be a positive integer (1, 2, or 3).');
  process.exit(1);
}

// ── Paths ───────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const THREADS_MD = path.join(REPO_ROOT, 'docs/social/twitter-threads.md');
const SCREENSHOTS_DIR = path.join(REPO_ROOT, 'docs/screenshots');

// ── Markdown parser ─────────────────────────────────────────────────────────

/**
 * Parse the threads markdown into structured data.
 *
 * The expected format (stable since session 3 rewrite) is:
 *   # 🧵 Thread N — *Title*
 *   ...
 *   ### Tweet X/Y
 *   `N chars` · 📎 `filename.png`  (or · no image)
 *
 *   ```
 *   tweet content, possibly multi-line
 *   ```
 *
 * Tweet boundaries are driven by fenced code blocks. The metadata line
 * between `### Tweet` header and the opening fence is where we pick up
 * image attachments. Other code blocks in the document (FAQ replies,
 * reference listings) are ignored because they live outside `# 🧵 Thread`
 * sections.
 */
export function parseThreadsMarkdown(markdown) {
  const lines = markdown.split('\n');
  const threads = [];
  let currentThread = null;
  let currentTweet = null;
  let pendingMetadata = false;
  let inCodeBlock = false;
  let codeBuffer = [];

  for (const line of lines) {
    // H1 — thread boundary
    const threadMatch = line.match(/^#\s+🧵\s+Thread\s+(\d+)\s*—\s*\*?([^*\n]+?)\*?\s*$/);
    if (threadMatch) {
      if (currentThread) threads.push(currentThread);
      currentThread = {
        number: Number.parseInt(threadMatch[1], 10),
        title: threadMatch[2].trim(),
        tweets: [],
      };
      currentTweet = null;
      pendingMetadata = false;
      inCodeBlock = false;
      codeBuffer = [];
      continue;
    }

    // Any other H1 — ends the current thread (e.g. `## ⚡ Pre-written ...`
    // actually starts with ##, so we also guard against H2 not starting
    // with 🧵 below).
    if (/^#\s/.test(line) && !/🧵/.test(line)) {
      if (currentThread) {
        threads.push(currentThread);
        currentThread = null;
      }
      currentTweet = null;
      pendingMetadata = false;
      inCodeBlock = false;
      codeBuffer = [];
      continue;
    }

    // A `## H2` with a non-🧵 leading character also signals we've left
    // the thread section (e.g. "## ⚡ Pre-written quote-tweet replies").
    if (/^##\s/.test(line) && currentThread && !/🧵/.test(line)) {
      threads.push(currentThread);
      currentThread = null;
      currentTweet = null;
      pendingMetadata = false;
      inCodeBlock = false;
      codeBuffer = [];
      continue;
    }

    if (!currentThread) continue;

    // Tweet header
    const tweetMatch = line.match(/^###\s+Tweet\s+(\d+)\/(\d+)\s*$/);
    if (tweetMatch) {
      currentTweet = {
        index: Number.parseInt(tweetMatch[1], 10),
        total: Number.parseInt(tweetMatch[2], 10),
        text: '',
        imagePath: null,
      };
      pendingMetadata = true;
      inCodeBlock = false;
      codeBuffer = [];
      continue;
    }

    if (!currentTweet) continue;

    // Metadata line (first non-empty line after `### Tweet`)
    if (pendingMetadata && line.trim() !== '') {
      const imgMatch = line.match(/📎\s+`([^`]+)`/);
      if (imgMatch) currentTweet.imagePath = imgMatch[1];
      pendingMetadata = false;
      continue;
    }

    // Code block fence
    if (line.trim() === '```') {
      if (inCodeBlock) {
        // Closing fence — finalize tweet
        currentTweet.text = codeBuffer.join('\n').trim();
        currentThread.tweets.push(currentTweet);
        currentTweet = null;
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
    }
  }

  if (currentThread) threads.push(currentThread);
  return threads;
}

/** Look up a thread by its number. Throws if not found. */
export function getThread(threads, number) {
  const match = threads.find((t) => t.number === number);
  if (!match) {
    const avail = threads.map((t) => t.number).join(', ');
    throw new Error(`Thread ${number} not found. Available: ${avail || 'none'}`);
  }
  return match;
}

// ── Posting ─────────────────────────────────────────────────────────────────

/**
 * Post a thread via the X API. When dryRun is true, just print what *would*
 * be posted without hitting the network.
 *
 * @param {Object} thread  parsed thread from parseThreadsMarkdown()
 * @param {Object} opts
 * @param {boolean} opts.dryRun
 * @param {string} opts.screenshotsDir  absolute path to image dir
 * @param {any} [opts.client]  twitter-api-v2 client (omit in dry-run)
 */
export async function postThread(thread, opts) {
  const { dryRun, screenshotsDir, client } = opts;
  const postedIds = [];
  let replyToId = null;

  console.log(`\n── Thread ${thread.number}: "${thread.title}" — ${thread.tweets.length} tweets`);
  console.log(`── Mode: ${dryRun ? 'DRY RUN (no network)' : 'LIVE POST'}`);

  for (const tweet of thread.tweets) {
    const charCount = [...tweet.text].length;
    console.log(`\n  Tweet ${tweet.index}/${tweet.total} (${charCount} chars)`);

    // Resolve image path if any
    let mediaPath = null;
    if (tweet.imagePath) {
      mediaPath = path.join(screenshotsDir, tweet.imagePath);
      if (!existsSync(mediaPath)) {
        throw new Error(`Image not found: ${mediaPath}`);
      }
      console.log(`    📎 ${tweet.imagePath}`);
    }

    // Print first 80 chars preview
    const preview = tweet.text.replace(/\n/g, ' \\n ').slice(0, 80);
    console.log(`    preview: ${preview}${tweet.text.length > 80 ? '…' : ''}`);

    if (dryRun) {
      postedIds.push(`dry-run-${tweet.index}`);
      replyToId = postedIds[postedIds.length - 1];
      continue;
    }

    // Live post
    let mediaId = null;
    if (mediaPath) {
      mediaId = await client.v1.uploadMedia(mediaPath);
    }

    const tweetOptions = {};
    if (replyToId) tweetOptions.reply = { in_reply_to_tweet_id: replyToId };
    if (mediaId) tweetOptions.media = { media_ids: [mediaId] };

    const response = await client.v2.tweet(tweet.text, tweetOptions);
    const postedId = response.data?.id ?? null;
    if (!postedId) throw new Error('No tweet id returned from X API');
    postedIds.push(postedId);
    replyToId = postedId;
    console.log(`    ✅ posted: ${postedId}`);

    // Respect X API pacing (basic back-off between tweets)
    await sleep(500);
  }

  console.log(`\n── Done. Posted ${postedIds.length} tweets.`);
  return postedIds;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`Reading ${path.relative(REPO_ROOT, THREADS_MD)}`);
  const markdown = await readFile(THREADS_MD, 'utf8');
  const threads = parseThreadsMarkdown(markdown);
  console.log(`Parsed ${threads.length} threads: ${threads.map((t) => `${t.number}(${t.tweets.length})`).join(', ')}`);

  const thread = getThread(threads, THREAD_NUMBER);

  let client = null;
  if (!DRY_RUN) {
    const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } = process.env;
    const missing = [
      ['TWITTER_API_KEY', TWITTER_API_KEY],
      ['TWITTER_API_SECRET', TWITTER_API_SECRET],
      ['TWITTER_ACCESS_TOKEN', TWITTER_ACCESS_TOKEN],
      ['TWITTER_ACCESS_TOKEN_SECRET', TWITTER_ACCESS_TOKEN_SECRET],
    ].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      console.error(`Missing env vars: ${missing.join(', ')}`);
      console.error('See docs/TWITTER_AUTOMATION.md for setup.');
      process.exit(1);
    }
    const { TwitterApi } = await import('twitter-api-v2');
    client = new TwitterApi({
      appKey: TWITTER_API_KEY,
      appSecret: TWITTER_API_SECRET,
      accessToken: TWITTER_ACCESS_TOKEN,
      accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  await postThread(thread, {
    dryRun: DRY_RUN,
    screenshotsDir: SCREENSHOTS_DIR,
    client,
  });
}

// Only run main() when invoked directly (not when imported for tests).
// Using fileURLToPath handles both POSIX and Windows path separators.
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  main().catch((err) => {
    console.error('\n❌ Failed:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
}
