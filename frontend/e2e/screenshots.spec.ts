/**
 * Birik screenshot capture spec.
 *
 * NOT part of the CI test suite — run manually when README screenshots need refresh:
 *
 *   cd frontend
 *   npx playwright test e2e/screenshots.spec.ts --project=chromium --reporter=list
 *
 * Output: ../docs/screenshots/*.png (relative to frontend/)
 *
 * What it captures:
 *  - Landing page: desktop dark/light, mobile dark/light, tablet dark
 *  - Dashboard (demo mode): desktop dark/light, mobile dark/light
 *
 * Manual-only screenshots (need specific on-chain state — see SCREENSHOT_CHECKLIST.md):
 *  - Settle modal with 10→3 transfer visualization
 *  - Savings pool with funded progress bar
 *  - SPLT reward notification + balance
 *  - Transaction history showing real settle tx
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { seedDemoSession, ensureDashboardReady } from './utils/session';

// Output dir relative to frontend/
const OUT_DIR = path.join('..', 'docs', 'screenshots');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 }, // iPhone 14 Pro
  tablet: { width: 768, height: 1024 }, // iPad portrait
} as const;

/** Set theme via init script BEFORE the page loads (so first paint is correct). */
async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.addInitScript((t) => {
    localStorage.setItem('stellarsplit_theme', t);
  }, theme);
}

/** Force English locale so screenshots are consistent across runs. */
async function setLocale(page: Page, lang: 'en' | 'tr' = 'en') {
  await page.addInitScript((l) => {
    localStorage.setItem('stellarsplit_lang', l);
  }, lang);
}

async function capture(page: Page, filename: string, fullPage = false) {
  await page.waitForLoadState('networkidle');
  // Small settle for animations/fonts
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage,
    animations: 'disabled',
  });
}

// Run screenshots serially to avoid interleaved state/cache issues
test.describe.configure({ mode: 'serial' });

test.describe('Landing — desktop', () => {
  test('landing-desktop-dark', async ({ page }) => {
    await setTheme(page, 'dark');
    await setLocale(page, 'en');
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 15000 });
    await capture(page, 'landing-desktop-dark.png');
  });

  test('landing-desktop-light', async ({ page }) => {
    await setTheme(page, 'light');
    await setLocale(page, 'en');
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 15000 });
    await capture(page, 'landing-desktop-light.png');
  });

  test('landing-desktop-dark-fullpage', async ({ page }) => {
    await setTheme(page, 'dark');
    await setLocale(page, 'en');
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 15000 });
    await capture(page, 'landing-desktop-dark-fullpage.png', /* fullPage */ true);
  });
});

test.describe('Landing — mobile', () => {
  test('landing-mobile-dark', async ({ page }) => {
    await setTheme(page, 'dark');
    await setLocale(page, 'en');
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 15000 });
    await capture(page, 'landing-mobile-dark.png');
  });

  test('landing-mobile-light', async ({ page }) => {
    await setTheme(page, 'light');
    await setLocale(page, 'en');
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 15000 });
    await capture(page, 'landing-mobile-light.png');
  });
});

test.describe('Landing — tablet', () => {
  test('landing-tablet-dark', async ({ page }) => {
    await setTheme(page, 'dark');
    await setLocale(page, 'en');
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/');
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 15000 });
    await capture(page, 'landing-tablet-dark.png');
  });
});

test.describe('Dashboard — demo mode', () => {
  test('dashboard-desktop-dark', async ({ page }) => {
    await setTheme(page, 'dark');
    await setLocale(page, 'en');
    await seedDemoSession(page);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await ensureDashboardReady(page);
    await capture(page, 'dashboard-desktop-dark.png');
  });

  test('dashboard-desktop-light', async ({ page }) => {
    await setTheme(page, 'light');
    await setLocale(page, 'en');
    await seedDemoSession(page);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await ensureDashboardReady(page);
    await capture(page, 'dashboard-desktop-light.png');
  });

  test('dashboard-mobile-dark', async ({ page }) => {
    await setTheme(page, 'dark');
    await setLocale(page, 'en');
    await seedDemoSession(page);
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await ensureDashboardReady(page);
    await capture(page, 'dashboard-mobile-dark.png');
  });

  test('dashboard-mobile-light', async ({ page }) => {
    await setTheme(page, 'light');
    await setLocale(page, 'en');
    await seedDemoSession(page);
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await ensureDashboardReady(page);
    await capture(page, 'dashboard-mobile-light.png');
  });
});
