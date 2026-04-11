import { test, expect } from '@playwright/test';
import { seedDemoSession } from './utils/session';

/**
 * Seed session then navigate directly to /dashboard.
 * walletAddress is initialized synchronously from window.__PLAYWRIGHT_E2E_WALLET__
 * so the auth guard won't redirect us back to /.
 */
async function goDashboard(page: import('@playwright/test').Page) {
  await seedDemoSession(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  await expect(page.getByTestId('create-group-btn')).toBeVisible({ timeout: 15000 });
}

test.describe('Settings page', () => {
  test('settings route redirects to landing when not connected', async ({ page }) => {
    // Fresh context — no wallet in localStorage or window
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    // Guard redirects to '/' and Landing renders
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible({ timeout: 10000 });
  });

  test('settings gear button is visible in header when connected', async ({ page }) => {
    await goDashboard(page);
    await expect(page.locator('button[title="Settings (S)"]')).toBeVisible({ timeout: 8000 });
  });

  test('navigates to /settings via gear button', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[title="Settings (S)"]').click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 8000 });
  });

  test('navigates to /settings via keyboard shortcut S', async ({ page }) => {
    await goDashboard(page);
    await page.keyboard.press('s');
    await expect(page).toHaveURL(/\/settings$/, { timeout: 8000 });
  });

  test('settings page renders Account and Appearance sections', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[title="Settings (S)"]').click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 8000 });
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  });

  test('disconnect button shows inline confirmation', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[title="Settings (S)"]').click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 8000 });
    const disconnectBtn = page.getByRole('button', { name: /Disconnect wallet/i });
    await expect(disconnectBtn).toBeVisible({ timeout: 8000 });
    await disconnectBtn.click();
    await expect(page.getByRole('button', { name: /^Yes$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Cancel$/i })).toBeVisible();
  });

  test('cancel on disconnect keeps user on settings', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[title="Settings (S)"]').click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 8000 });
    await page.getByRole('button', { name: /Disconnect wallet/i }).click();
    await page.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(page.getByRole('button', { name: /Disconnect wallet/i })).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('theme toggle switches label between Dark and Light', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[title="Settings (S)"]').click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 8000 });
    const themeBtn = page.locator('button').filter({ hasText: /Dark|Light/ }).first();
    await expect(themeBtn).toBeVisible({ timeout: 8000 });
    const before = await themeBtn.textContent();
    await themeBtn.click();
    const after = await themeBtn.textContent();
    expect(after).not.toBe(before);
  });

  test('language segmented control shows one active lang button', async ({ page }) => {
    await goDashboard(page);
    await page.locator('button[title="Settings (S)"]').click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 8000 });
    // One of TR/EN/DE/ES buttons should be present
    await expect(
      page.getByRole('button', { name: /^(TR|EN|DE|ES)$/ }).first()
    ).toBeVisible({ timeout: 8000 });
  });
});
