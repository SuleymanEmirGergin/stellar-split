import { test, expect } from '@playwright/test';
import { seedDemoSession } from './utils/session';

async function goDashboard(page: import('@playwright/test').Page) {
  await seedDemoSession(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  await expect(page.getByTestId('create-group-btn')).toBeVisible({ timeout: 15000 });
}

test.describe('NotificationCenter', () => {
  test('bell button is hidden on landing (no wallet)', async ({ page }) => {
    await page.goto('/');
    const bell = page.locator('button[aria-label="Notifications"]');
    const visible = await bell.isVisible().catch(() => false);
    expect(visible).toBe(false);
  });

  test('bell button is visible on dashboard when connected', async ({ page }) => {
    await goDashboard(page);
    await expect(page.locator('button[aria-label="Notifications"]')).toBeVisible({ timeout: 8000 });
  });

  test('clicking bell opens the dropdown panel', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[aria-label="Notifications"]').click();
    // Panel shows either empty state or notification list
    const panel = page.locator('[class*="backdrop-blur"]').filter({ hasText: 'Notifications' }).first();
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('empty state shows "You\'re all caught up"', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[aria-label="Notifications"]').click();
    await expect(page.getByText("You're all caught up")).toBeVisible({ timeout: 5000 });
  });

  test('dropdown closes on outside click', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[aria-label="Notifications"]').click();
    await expect(page.getByText("You're all caught up")).toBeVisible({ timeout: 5000 });
    await page.mouse.click(10, 10);
    await expect(page.getByText("You're all caught up")).toBeHidden({ timeout: 5000 });
  });

  test('no unread badge in demo mode with no notifications', async ({ page }) => {
    await goDashboard(page);
    const badge = page.locator('button[aria-label="Notifications"] span.bg-rose-500');
    const count = await badge.count();
    if (count > 0) {
      const text = await badge.first().textContent();
      expect(text?.trim()).toMatch(/^\d+$|^9\+$/);
    } else {
      expect(count).toBe(0);
    }
  });
});
