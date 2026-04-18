import { test, expect } from '@playwright/test';
import { ensureDashboardReady, seedDemoSession } from './utils/session';

test.describe('Landing and routes', () => {
  test('landing page loads and shows hero CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible();
    await expect(page.getByTestId('landing-try-demo')).toBeVisible();
  });

  test('try demo opens dashboard and shows create group action', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto('/');

    const tryDemoBtn = page.getByTestId('landing-try-demo');
    if (await tryDemoBtn.isVisible().catch(() => false)) {
      await tryDemoBtn.click();
    }

    await ensureDashboardReady(page);
    await expect(page.getByTestId('create-group-btn')).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('stellarsplit_demo_mode')))
      .toBe('true');
  });

  test('dashboard route shows landing when not connected', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 10000 });
  });

  test('group route shows landing when not connected', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/group/1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 15000 });
  });

  test('logo and nav elements are visible', async ({ page }) => {
    await page.goto('/');
    // Brand wordmark after rebrand is "birik" (lowercase, in header)
    await expect(page.getByRole('banner').getByText(/birik/i)).toBeVisible();
  });
});
