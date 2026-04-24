// One-shot screenshot capture for submission evidence.
//
//   • metrics-dashboard.png   → Landing hero + LiveMetricsRow (public KPIs
//     from GET /analytics/summary — DAU / WAU / groups / volume).
//   • monitoring-dashboard.png → /dashboard rendered with a mock wallet
//     (uses the built-in __PLAYWRIGHT_E2E_WALLET__ init-script hook in
//     App.tsx), so StatsPanel, SPLT balance widget and activity feed
//     all show real state instead of the Landing redirect.
//
// Usage (from repo root):
//   node frontend/scripts/capture-metrics-dashboard.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../../docs/screenshots');

const TARGET = process.env.TARGET_URL ?? 'https://stellar-split.vercel.app';
const MOCK_WALLET =
  process.env.MOCK_WALLET ?? 'GASWXOC7I2T7YVJZBIZWGFND55SJGPXOWC7PKNHPWLRNY6236FPWULLP'; // Tuğba — real testnet user

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    deviceScaleFactor: 2,
  });

  // ── 1. Landing / LiveMetricsRow ──────────────────────────────────────
  const landing = await ctx.newPage();
  await landing.goto(TARGET, { waitUntil: 'networkidle', timeout: 60_000 });
  await landing.waitForTimeout(2500);
  // Scroll so the LiveMetricsRow (KPIs) sits within the 900px viewport.
  await landing.evaluate(() => window.scrollTo({ top: 280, behavior: 'instant' }));
  await landing.waitForTimeout(800);
  await landing.screenshot({
    path: resolve(outDir, 'metrics-dashboard.png'),
    fullPage: false,
  });
  console.log('✔ metrics-dashboard.png written (landing + live KPIs)');
  await landing.close();

  // ── 2. /dashboard with mocked wallet ────────────────────────────────
  const dash = await ctx.newPage();
  await dash.addInitScript((addr) => {
    // App.tsx reads this synchronously from the useState initializer.
    (window).__PLAYWRIGHT_E2E_WALLET__ = addr;
    // Mark all first-run onboarding flags as already-seen so the StatsPanel
    // isn't covered by a tutorial modal / Joyride tour.
    try {
      localStorage.setItem('wizard_v1_done', 'true');
      localStorage.setItem('stellarsplit_joyride_done_v2', 'true');
    } catch {
      /* SSR / private-mode safety */
    }
  }, MOCK_WALLET);
  await dash.goto(`${TARGET}/dashboard`, { waitUntil: 'networkidle', timeout: 60_000 });
  await dash.waitForTimeout(2000);
  // Dismiss any onboarding / welcome modals that cover the StatsPanel.
  // There can be multiple in sequence (welcome → tour step 1 → …), so loop.
  for (let i = 0; i < 6; i++) {
    const skip = dash.getByRole('button', { name: /^(Atla|Skip|Kapat|Close)$/i }).first();
    if (await skip.isVisible().catch(() => false)) {
      await skip.click().catch(() => {});
      await dash.waitForTimeout(400);
      continue;
    }
    // Fall back to ESC — most of the tour steps accept it.
    await dash.keyboard.press('Escape').catch(() => {});
    await dash.waitForTimeout(300);
    // Also click top-right X buttons if present.
    const close = dash.locator('button[aria-label*="lose" i], button[aria-label*="apat" i]').first();
    if (await close.isVisible().catch(() => false)) {
      await close.click().catch(() => {});
      await dash.waitForTimeout(300);
    }
  }
  await dash.waitForTimeout(2500); // give StatsPanel + SPLT widget time to fetch
  await dash.screenshot({
    path: resolve(outDir, 'monitoring-dashboard.png'),
    fullPage: false,
  });
  console.log('✔ monitoring-dashboard.png written (/dashboard w/ StatsPanel)');
  await dash.close();

  await browser.close();
})();
