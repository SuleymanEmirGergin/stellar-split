import { test, expect } from '@playwright/test';
import { seedDemoSession } from './utils/session';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function seedGroupAndGoGroup(page: import('@playwright/test').Page) {
  await seedDemoSession(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'stellarsplit_groups',
      JSON.stringify([{ id: 1, name: 'Trip Group', memberCount: 3, currency: 'XLM' }]),
    );
  });
  // Navigate directly to /group/1 — walletAddress is initialized synchronously from
  // window.__PLAYWRIGHT_E2E_WALLET__ so the auth guard won't redirect us back.
  await page.goto('/group/1', { waitUntil: 'domcontentloaded' });
  // Wait for group to render (back button or group heading)
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Mobile navigation — GroupDetail bottom bar', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('desktop sidebar nav is hidden on mobile', async ({ page }) => {
    await seedGroupAndGoGroup(page);
    const sidebar = page.locator('nav[role="tablist"]');
    await expect(sidebar).toBeHidden({ timeout: 10000 });
  });

  test('mobile bottom tab bar is visible', async ({ page }) => {
    await seedGroupAndGoGroup(page);
    const bottomBar = page.locator('.sm\\:hidden.fixed.bottom-0');
    await expect(bottomBar).toBeVisible({ timeout: 10000 });
  });

  test('bottom bar has exactly 6 buttons (5 primary + More)', async ({ page }) => {
    await seedGroupAndGoGroup(page);
    const bottomBar = page.locator('.sm\\:hidden.fixed.bottom-0');
    await expect(bottomBar).toBeVisible({ timeout: 10000 });
    await expect(bottomBar.locator('button')).toHaveCount(6, { timeout: 5000 });
  });

  test('"More" opens the bottom sheet grid', async ({ page }) => {
    await seedGroupAndGoGroup(page);
    const bottomBar = page.locator('.sm\\:hidden.fixed.bottom-0');
    await expect(bottomBar).toBeVisible({ timeout: 10000 });
    await bottomBar.locator('button').last().click();
    // Use testid — page has a separate `.grid-cols-3` for the balance-summary widget
    const sheet = page.getByTestId('mobile-more-sheet');
    await expect(sheet).toBeVisible({ timeout: 5000 });
  });

  test('selecting from More sheet closes it', async ({ page }) => {
    await seedGroupAndGoGroup(page);
    const bottomBar = page.locator('.sm\\:hidden.fixed.bottom-0');
    await bottomBar.locator('button').last().click();
    const sheet = page.getByTestId('mobile-more-sheet');
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await sheet.locator('button').first().click();
    await expect(sheet).toBeHidden({ timeout: 5000 });
  });

  test('content area has pb-20 padding on mobile', async ({ page }) => {
    await seedGroupAndGoGroup(page);
    await expect(page.locator('.pb-20')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Desktop sidebar — GroupDetail', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('sidebar nav is visible on desktop', async ({ page }) => {
    await seedGroupAndGoGroup(page);
    await expect(page.locator('nav[role="tablist"]')).toBeVisible({ timeout: 10000 });
  });

  test('mobile bottom bar is absent on desktop', async ({ page }) => {
    await seedGroupAndGoGroup(page);
    await expect(page.locator('.sm\\:hidden.fixed.bottom-0')).toBeHidden({ timeout: 8000 });
  });
});
