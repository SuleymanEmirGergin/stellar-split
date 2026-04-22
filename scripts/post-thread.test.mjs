/**
 * Tests for post-thread.mjs.
 *
 * Run with:  node --test scripts/post-thread.test.mjs
 * Or via:    cd scripts && npm test
 *
 * Covers:
 *  - parseThreadsMarkdown on the real twitter-threads.md file
 *  - parseThreadsMarkdown on inline fixtures (edge cases)
 *  - getThread lookup semantics
 *  - postThread in dry-run mode (no network)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseThreadsMarkdown, getThread, postThread } from './post-thread.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const THREADS_MD = path.join(REPO_ROOT, 'docs/social/twitter-threads.md');

// ── parseThreadsMarkdown ──────────────────────────────────────────────────

test('parseThreadsMarkdown returns empty on empty input', () => {
  assert.deepEqual(parseThreadsMarkdown(''), []);
});

test('parseThreadsMarkdown extracts a single-thread fixture with one tweet', () => {
  const md = [
    '# 🧵 Thread 1 — *Test title*',
    '',
    '### Tweet 1/1',
    '`50 chars` · no image',
    '',
    '```',
    'Hello world from Birik.',
    '```',
    '',
  ].join('\n');

  const threads = parseThreadsMarkdown(md);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].number, 1);
  assert.equal(threads[0].title, 'Test title');
  assert.equal(threads[0].tweets.length, 1);
  assert.equal(threads[0].tweets[0].text, 'Hello world from Birik.');
  assert.equal(threads[0].tweets[0].imagePath, null);
});

test('parseThreadsMarkdown picks up image attachments', () => {
  const md = [
    '# 🧵 Thread 1 — *Images*',
    '',
    '### Tweet 1/2',
    '`40 chars` · 📎 `landing-desktop-dark.png`',
    '',
    '```',
    'Tweet with image.',
    '```',
    '',
    '### Tweet 2/2',
    '`30 chars` · no image',
    '',
    '```',
    'No image.',
    '```',
    '',
  ].join('\n');

  const threads = parseThreadsMarkdown(md);
  assert.equal(threads[0].tweets.length, 2);
  assert.equal(threads[0].tweets[0].imagePath, 'landing-desktop-dark.png');
  assert.equal(threads[0].tweets[1].imagePath, null);
});

test('parseThreadsMarkdown separates multiple threads', () => {
  const md = [
    '# 🧵 Thread 1 — *First*',
    '',
    '### Tweet 1/1',
    '`10` · no image',
    '',
    '```',
    'one',
    '```',
    '',
    '# 🧵 Thread 2 — *Second*',
    '',
    '### Tweet 1/1',
    '`10` · no image',
    '',
    '```',
    'two',
    '```',
  ].join('\n');

  const threads = parseThreadsMarkdown(md);
  assert.equal(threads.length, 2);
  assert.equal(threads[0].number, 1);
  assert.equal(threads[1].number, 2);
  assert.equal(threads[0].tweets[0].text, 'one');
  assert.equal(threads[1].tweets[0].text, 'two');
});

test('parseThreadsMarkdown ignores code blocks outside thread sections', () => {
  const md = [
    '# 🧵 Thread 1 — *Real thread*',
    '',
    '### Tweet 1/1',
    '`10` · no image',
    '',
    '```',
    'real tweet',
    '```',
    '',
    '## ⚡ Pre-written quote-tweet replies',
    '',
    '### Q1: "Something?"',
    '```',
    'This is a FAQ reply, not a tweet.',
    '```',
  ].join('\n');

  const threads = parseThreadsMarkdown(md);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].tweets.length, 1);
  assert.equal(threads[0].tweets[0].text, 'real tweet');
});

test('parseThreadsMarkdown preserves multi-line tweet content exactly', () => {
  const md = [
    '# 🧵 Thread 1 — *Multi-line*',
    '',
    '### Tweet 1/1',
    '`100` · no image',
    '',
    '```',
    'Line 1 of the tweet.',
    '',
    'Line 3 after blank.',
    'Line 4.',
    '```',
  ].join('\n');

  const threads = parseThreadsMarkdown(md);
  assert.equal(
    threads[0].tweets[0].text,
    'Line 1 of the tweet.\n\nLine 3 after blank.\nLine 4.',
  );
});

// ── Parse the real source-of-truth file ────────────────────────────────────

test('real twitter-threads.md parses into exactly 3 threads', async () => {
  const md = await readFile(THREADS_MD, 'utf8');
  const threads = parseThreadsMarkdown(md);
  assert.equal(threads.length, 3, `expected 3 threads, got ${threads.length}`);
  assert.deepEqual(
    threads.map((t) => t.number),
    [1, 2, 3],
  );
});

test('real threads have the expected tweet counts (8/9/8)', async () => {
  const md = await readFile(THREADS_MD, 'utf8');
  const threads = parseThreadsMarkdown(md);
  const counts = threads.map((t) => t.tweets.length);
  assert.deepEqual(counts, [8, 9, 8]);
});

test('every real tweet is within Twitter/X 280-character limit', async () => {
  const md = await readFile(THREADS_MD, 'utf8');
  const threads = parseThreadsMarkdown(md);
  for (const t of threads) {
    for (const tw of t.tweets) {
      const len = [...tw.text].length; // count unicode code points, not bytes
      assert.ok(
        len <= 280,
        `Thread ${t.number} Tweet ${tw.index}/${tw.total} is ${len} chars (max 280)`,
      );
    }
  }
});

test('every image attachment references a file that exists on disk', async () => {
  const md = await readFile(THREADS_MD, 'utf8');
  const threads = parseThreadsMarkdown(md);
  const { existsSync } = await import('node:fs');
  const screenshotsDir = path.join(REPO_ROOT, 'docs/screenshots');
  for (const t of threads) {
    for (const tw of t.tweets) {
      if (tw.imagePath) {
        const full = path.join(screenshotsDir, tw.imagePath);
        assert.ok(
          existsSync(full),
          `Missing image for Thread ${t.number} Tweet ${tw.index}: ${tw.imagePath}`,
        );
      }
    }
  }
});

// ── getThread ──────────────────────────────────────────────────────────────

test('getThread returns the matching thread by number', () => {
  const threads = [
    { number: 1, title: 'a', tweets: [] },
    { number: 2, title: 'b', tweets: [] },
  ];
  assert.equal(getThread(threads, 2).title, 'b');
});

test('getThread throws with available list when thread not found', () => {
  const threads = [{ number: 1, title: 'a', tweets: [] }];
  assert.throws(
    () => getThread(threads, 5),
    /Thread 5 not found.*Available: 1/,
  );
});

// ── postThread (dry-run) ───────────────────────────────────────────────────

test('postThread in dry-run mode returns placeholder ids and does not touch network', async () => {
  const thread = {
    number: 1,
    title: 'Dry run test',
    tweets: [
      { index: 1, total: 2, text: 'First tweet.', imagePath: null },
      { index: 2, total: 2, text: 'Second tweet.', imagePath: null },
    ],
  };
  const ids = await postThread(thread, {
    dryRun: true,
    screenshotsDir: path.join(REPO_ROOT, 'docs/screenshots'),
    client: null,
  });
  assert.equal(ids.length, 2);
  assert.ok(ids.every((id) => id.startsWith('dry-run-')));
});

test('postThread dry-run rejects a tweet that references a missing image', async () => {
  const thread = {
    number: 1,
    title: 'Bad image',
    tweets: [
      { index: 1, total: 1, text: 'Has image.', imagePath: 'does-not-exist-12345.png' },
    ],
  };
  await assert.rejects(
    postThread(thread, {
      dryRun: true,
      screenshotsDir: path.join(REPO_ROOT, 'docs/screenshots'),
      client: null,
    }),
    /Image not found/,
  );
});
