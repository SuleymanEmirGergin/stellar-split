# Typefully Setup — schedule 3 Birik threads in 20 minutes

Companion to [`twitter-threads.md`](./twitter-threads.md). This guide walks through getting all three threads queued on Typefully's free tier, with images attached and scheduled for the optimal timeslots.

**Why Typefully over Buffer or DIY scripts for this week:**
- Purpose-built for threads (Buffer treats them as a pile of scheduled tweets; Typefully keeps them as one unit)
- Free tier covers exactly our use case (up to 3 scheduled items + unlimited drafts)
- Native image support with per-tweet attachment
- Built-in preview of how the thread will look on X
- Set-and-forget: once scheduled, no intervention needed

Long-term automation (repo-native, GitHub Actions-triggered) is covered separately in [`TWITTER_AUTOMATION.md`](../TWITTER_AUTOMATION.md).

---

## ⏱ Timeline

| Step | Time |
|------|------|
| Typefully account + X connection | 5 min |
| Import & schedule Thread 1 | 5 min |
| Import & schedule Thread 2 | 5 min |
| Import & schedule Thread 3 | 5 min |
| **Total** | **20 min** |

---

## Prerequisites

- [ ] A dedicated Twitter/X account for Birik — **do not use your personal account**. Even though Typefully is trustworthy, dedicated accounts let you delegate, sunset, or hand off without risk. If you don't have one: [x.com/signup](https://x.com/signup), verify email, set display name / handle / avatar (the bird-sized logo version of our landing screenshot works).
- [ ] 5 screenshots ready in `docs/screenshots/` — already there: `landing-desktop-dark.png`, `settle-modal-minflow.png`, `splt-reward.png`, `mobile-bottomsheet.png`, `activity-feed.png`, `landing-mobile-dark.png`. You can download directly from GitHub by right-click → Save image as.
- [ ] The `twitter-threads.md` doc open in another tab — you'll copy tweet content from its code blocks.

---

## Step 1 — Create Typefully account (3 min)

1. Go to [typefully.com](https://typefully.com) → **Sign up**.
2. Sign up with the **same email as your Birik/X account** (makes connection smoother).
3. Skip the onboarding tour if offered — it's a 30-second walkthrough you can revisit later.

**Free tier confirmation:** Account page should show *Free plan · 3 scheduled posts* in the sidebar. If you see a paywall prompt, you're fine — the free tier is available, just not foregrounded.

---

## Step 2 — Connect your X/Twitter account (2 min)

1. Settings → **Accounts** → **Connect X (Twitter)**.
2. Authorize Typefully on the X OAuth prompt.
3. Back in Typefully, your handle should appear with a ✅.

> ⚠️ If the connection fails with *Error fetching account*, it's usually because X is rate-limiting the OAuth redirect. Wait 5 minutes and retry. Happens maybe 1 in 10 times.

---

## Step 3 — Pick your strategy

Default: **Strategy A (Awareness-first)** — use this unless you're racing to collect 5+ testnet users by a hard deadline.

### Strategy A — Awareness-first (default)

| Thread | Schedule (TR timezone) |
|--------|------------------------|
| Thread 1 — *Why Birik?* | Today, 20:00 |
| Thread 2 — *Under the hood* | +2 days, 16:00 |
| Thread 3 — *Testnet beta open* | +4 days, 18:00 |

### Strategy B — Conversion-first (if you need testnet users NOW)

| Thread | Schedule (TR timezone) |
|--------|------------------------|
| Thread 3 — *Testnet beta open* | Today, 20:00 |
| Thread 1 — *Why Birik?* | +2 days, 20:00 |
| Thread 2 — *Under the hood* | +4 days, 18:00 |

**Typefully scheduler timezone:** Typefully honors your browser timezone by default. Verify in *Settings → General → Timezone* that it shows *Europe/Istanbul (UTC+3)* before scheduling, otherwise your 20:00 might post at 17:00.

---

## Step 4 — Import a thread (repeat 3x)

For each thread:

### 4.1 Create a new thread
- Dashboard → **+ New Thread** button (top-left).
- You'll land in the compose editor.

### 4.2 Paste tweet 1
- Open [`twitter-threads.md`](./twitter-threads.md) on GitHub.
- Find Thread N → Tweet 1's code block.
- Click the **copy icon** in the top-right of the code block.
- Paste into Typefully's first compose box.
- Typefully shows a live character count — verify it matches the count in the markdown header (e.g., `270 chars`).

### 4.3 Attach Tweet 1's image (if listed)
- If the tweet's header says `📎 foo.png`, click the paperclip icon below the compose box.
- Upload the file from `docs/screenshots/foo.png` (download from GitHub if you don't have it locally).
- Image preview appears inline — Typefully auto-compresses and serves a 16:9 or original-aspect version.

### 4.4 Add tweet 2
- Below tweet 1, click **+ Add Tweet** (appears when you hover between tweets).
- Paste tweet 2's code block content. Attach its image if any.
- Repeat for all 8 or 9 tweets in the thread.

### 4.5 Preview
- Click **Preview** (top-right). Typefully renders the thread as it'll appear on X — checks thread chaining, image positioning, character truncation.
- Common issues to catch here:
  - Line breaks collapse: make sure the code-block paste preserved newlines. If any tweet looks like a single paragraph when it should have blank lines, re-paste from the markdown.
  - Emoji rendering: mobile preview may differ from desktop. The emoji we used (⚡🧪📝🌍📱🚀→) are all in every OS's base set, no issue expected.
  - Hashtag overflow: hashtags on the last tweet should all fit — if the char count shows >280, remove one hashtag.

### 4.6 Schedule
- Click **Schedule** (top-right, next to Preview).
- Calendar opens → pick date + time per the strategy table above.
- **Confirm the timezone shown** in the scheduler — should read *UTC+3* or *Europe/Istanbul*.
- Click **Schedule thread**.

### 4.7 Verify in queue
- Dashboard → **Queue** (left sidebar) → thread appears with timestamp.
- You should end up with 3 items in Queue after completing all three threads.

---

## Step 5 — Day-of sanity check

1 hour before each thread's scheduled post time:

- [ ] Open Typefully → Queue → hover the scheduled thread
- [ ] Click **Preview** once more — confirm nothing got corrupted
- [ ] Check the connected X account is still valid (Settings → Accounts — green ✅)

At post time, Typefully sends the thread via X API. You'll get an email/push confirmation when it goes live (Settings → Notifications).

---

## Step 6 — Post-publish follow-up

For each published thread, within 2 hours:

- [ ] Open on X, pin the first tweet to profile (for Thread 1 only — biggest hook)
- [ ] Quote-tweet your own Thread 1 post with a single-emoji "🧵" reply to boost algorithm signals
- [ ] Reply to your own last tweet with a CTA variation ("drop a ⭐ if you liked this, it helps us a lot")
- [ ] Respond to replies quickly — Twitter's algorithm rewards threads where the author engages within the first 2 hours

Fill in engagement numbers in `twitter-threads.md` → *Engagement tracking* table 72 hours later.

---

## Troubleshooting

### "Character count shows 280+ but the markdown says 270"
Typefully counts the trailing newline you might paste by accident. Trim any trailing whitespace/newline after pasting.

### "Image upload fails: File too large"
Typefully's free tier caps at 5MB/image. Our screenshots are all under 1MB — shouldn't hit this. If you see it, right-click the screenshot → "Compress" or run `tinypng.com` → re-upload.

### "Scheduled thread didn't post at the exact minute"
Typefully schedules with ~1-3 minute drift. It won't post 10 minutes late but may post at `20:02` instead of `20:00`. Not a problem for our use case.

### "I need to edit a scheduled thread"
Queue → click the thread → edit → re-schedule or save. No penalty.

### "I want to post a 4th thread but hit the free tier cap"
- Move to Buffer's free tier as a backup (3 scheduled posts, 10 in queue for up to 3 channels)
- OR post thread 1 manually during work hours so it leaves the queue
- OR upgrade to Typefully Starter ($14/month, 10 scheduled posts + AI ghostwriter) — not needed for 3 threads

---

## What this does NOT cover

- **Long-term always-on content** (monthly posting cadence, 10+ threads/month) — use [`TWITTER_AUTOMATION.md`](../TWITTER_AUTOMATION.md) and the GitHub Actions auto-poster for that
- **Cross-posting to LinkedIn / Threads / Mastodon** — Typefully Pro ($29/month) supports this; for now, manually mirror if needed
- **Analytics deep dive** — Typefully's free analytics are enough for the 72-hour tracking in the playbook; for deeper, use X's native analytics or Metricool free tier

---

## Quick reference — what to click where

```
Typefully dashboard
├── + New Thread ................ start a thread import
├── Queue ....................... see all scheduled posts
├── Drafts ...................... in-progress threads
├── Sent ........................ history after publish
└── Settings
    ├── Accounts ................ connect / disconnect X
    ├── General ................. timezone (set to Europe/Istanbul)
    └── Notifications ........... enable email + browser push
```

---

## Green-light criteria

You're ready to close this doc when:

- [ ] Typefully account created, free tier confirmed
- [ ] X account connected, handle shows ✅
- [ ] Timezone set to *Europe/Istanbul*
- [ ] All 3 threads imported, previewed, scheduled
- [ ] Queue shows 3 items with correct timestamps
- [ ] Notifications enabled so you know when each goes live

Total elapsed: **~20 minutes**.

Go.
