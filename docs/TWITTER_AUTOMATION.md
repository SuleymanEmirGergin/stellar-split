# Twitter/X Auto-Poster — setup + operation

Repo-native thread posting: the workflow at [`.github/workflows/post-thread.yml`](../.github/workflows/post-thread.yml) picks a thread from [`docs/social/twitter-threads.md`](./social/twitter-threads.md) and posts it via the X API.

Companion doc for short-term manual-scheduling workflow: [`docs/social/TYPEFULLY_SETUP.md`](./social/TYPEFULLY_SETUP.md). Typefully is the **easier** route for this week's 3 threads; this repo-native automation is what you run **after** those, for always-on content.

---

## What this gives you

- 🤖 One-click post from the GitHub Actions tab — no local Node setup
- 🧪 Dry-run mode that parses the thread markdown and prints previews without touching X
- 🧪 Test suite that runs **before every post** to catch char-limit / missing-image bugs
- 🔒 Credentials live only in GitHub Secrets — never in the repo
- 🎯 Optional scheduled cron (commented out by default — enable after manual verification)

---

## Prerequisites

1. **Dedicated X account for Birik** — e.g. `@BirikApp`. Never use your personal account as the target; OAuth tokens leaking would compromise it.
2. **Admin access to this GitHub repo** (to add Secrets).

---

## Step 1 — Create X Developer App (~10 min)

1. Go to [developer.twitter.com](https://developer.twitter.com) and sign in with the **@BirikApp** account (not your personal).
2. Apply for a developer account. Select use case: **Making a bot / automated posting**. Free tier is enough (1,500 tweets/month, media upload included).
3. Once approved (usually instant), open the **Default Project** → **Default App**.
4. **App permissions** must be set to **Read and write** (Settings → User authentication settings → App permissions). Default is Read-only. If you miss this, post calls return 403.
5. **Authentication type:** OAuth 1.0a (user context). OAuth 2.0 would also work but requires a refresh token handler we don't ship — OAuth 1.0a tokens don't expire.

---

## Step 2 — Generate 4 keys

From **Keys and tokens** tab in the same app page:

| Key | Where it appears in Twitter | Maps to secret |
|-----|----------------------------|----------------|
| **API Key** | Consumer Keys → API Key | `TWITTER_API_KEY` |
| **API Secret** | Consumer Keys → API Key Secret | `TWITTER_API_SECRET` |
| **Access Token** | Access Token and Secret → Access Token | `TWITTER_ACCESS_TOKEN` |
| **Access Token Secret** | Access Token and Secret → Access Token Secret | `TWITTER_ACCESS_TOKEN_SECRET` |

> ⚠️ Tokens shown only once. If you miss them, click **Regenerate** — but regenerating revokes the old ones.

---

## Step 3 — Add keys to GitHub Secrets

1. Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Add all four:
   - `TWITTER_API_KEY`
   - `TWITTER_API_SECRET`
   - `TWITTER_ACCESS_TOKEN`
   - `TWITTER_ACCESS_TOKEN_SECRET`

Secrets are encrypted at rest and only exposed to workflow runs — they never appear in logs even when `echo $TWITTER_API_KEY` is run. GitHub auto-masks them.

---

## Step 4 — First dry-run (safe)

1. Repo → **Actions** tab → **Post Twitter Thread** workflow (left sidebar).
2. Click **Run workflow** (top right).
3. Pick:
   - **Thread:** `1`
   - **Dry-run:** ✅ checked
4. Run it. The job should:
   - Install dependencies
   - Run the test suite (14 tests pass)
   - Print a preview of every tweet in Thread 1 + listed image attachments
   - Exit 0 **without calling the X API**

Watch the job log to confirm the full preview is printed. If any test fails, the post step is skipped — ship a fix before going live.

---

## Step 5 — First live post

Only once the dry-run above succeeds and the preview looks right:

1. Same workflow, same inputs, but **Dry-run: unchecked**.
2. Run. Output should show `✅ posted: <tweet-id>` for each tweet.
3. Open `x.com/BirikApp` and confirm the thread is live in the correct order with images.

If anything looks off:
- Delete the posted tweets manually from X
- Fix the markdown (regex, formatting, image path)
- Dry-run again, then re-post

---

## Step 6 — Enabling the cron schedule (optional)

After you've posted a few threads live without issue, you may want to run on cron so new threads post themselves when added to the markdown.

1. Edit [`.github/workflows/post-thread.yml`](../.github/workflows/post-thread.yml).
2. Uncomment the `schedule:` block. Each cron line includes a comment with the TR-timezone equivalent.
3. To support cron, the workflow also needs a **default thread selection** at that time. The current `inputs.thread` only reflects manual runs. For cron, you can either:
   - Hard-code the thread in the YAML (`--thread=1` in the `Post thread` step when `github.event_name == 'schedule'`)
   - Add a `threads.json` file with a queue and pop from it
   - Use GitHub Actions' `schedule` matrix to dispatch different threads on different weekdays

Pick whichever fits your rhythm. Start simple.

---

## Troubleshooting

### "403 Forbidden" on post
App permissions are still Read-only. Go back to Step 1 (4) — set to Read and write, **regenerate** the Access Token (it inherits old perms otherwise), and update the secret.

### "401 Unauthorized"
One of the 4 secrets is wrong or copy-pasted with extra whitespace. Regenerate in the Twitter developer portal and re-paste carefully.

### "Duplicate content"
Twitter rejects the exact same text within a short window. If you're re-testing quickly, change a word or wait 30 minutes.

### "Rate limit exceeded"
Free tier allows ~50 tweets / 24h for a user. A single 8-tweet thread is fine. If you test live-posting multiple times in an hour, you'll trip this. Sleep, retry later.

### "Test failed: every real tweet is within Twitter/X 280-character limit"
Someone added a tweet that overflows. The failing test output names the exact Thread+Tweet. Edit `twitter-threads.md` to trim it down.

### "Image not found"
The `📎 foo.png` reference in the markdown doesn't match a file in `docs/screenshots/`. Either regenerate the screenshot via the Playwright spec or fix the filename in the markdown.

### Workflow doesn't appear in Actions tab
It only appears after the YAML file is **pushed to the default branch** (`master`). The `workflow_dispatch` trigger needs to live on master to be runnable, even when you trigger it from a feature branch.

---

## Security notes

- The GitHub workflow only runs on `workflow_dispatch` events — it cannot be triggered by pushes, PRs, or external webhooks. That means a compromised PR can't smuggle a malicious `post-thread.yml` that exfiltrates tokens.
- The `if: github.event_name == 'workflow_dispatch'` guard on the `post` job is a belt-and-suspenders redundancy.
- Secrets are never logged even if you `echo` them — GitHub's masker catches them.
- If you ever suspect a leak: **Twitter developer portal → Regenerate all 4 keys** → update the 4 GitHub secrets. Old keys stop working within seconds.

---

## What this does NOT do

- ❌ **Post arbitrary text from user input.** Only thread content already committed to the markdown can be posted. This is deliberate — no remote-code-execution surface.
- ❌ **Edit or delete tweets.** Only creates them. Deletion is manual on x.com.
- ❌ **Multi-account support.** One app, one @BirikApp account. Add another secret set + workflow if you need more.
- ❌ **Reply to comments / DM handling.** Out of scope.

---

## Operating a thread post — quick reference

```
1. Edit docs/social/twitter-threads.md
2. Commit + push to master
3. Actions → Post Twitter Thread → Run workflow
   ├── thread: pick 1/2/3
   └── dry_run: ✅ (always check once first)
4. Review job output
5. If OK, re-run with dry_run: ✗
6. Watch @BirikApp on x.com for the thread to appear
```

~2 minutes from "Run workflow" click to thread live on X.
