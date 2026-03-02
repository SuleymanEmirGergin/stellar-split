import { test, expect } from '@playwright/test';

const E2E_WALLET = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK';

test.describe('Join page', () => {
  test('join page shows connect CTA when not connected', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/join/1', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('join-connect-btn')).toBeVisible({ timeout: 10000 });
  });

  test('join page with unknown id still shows connect CTA', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/join/99999', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('join-connect-btn')).toBeVisible({ timeout: 10000 });
  });

  test('join flow: open group lands on group detail', async ({ page }) => {
    await page.addInitScript((wallet: string) => {
      (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ = wallet;
      localStorage.setItem('stellarsplit_demo_mode', 'true');
      localStorage.setItem('stellarsplit_joyride_done_v2', 'true');
    }, E2E_WALLET);

    page.setDefaultTimeout(15000);
    await page.goto('/join/1', { waitUntil: 'domcontentloaded' });

    const openGroupBtn = page.getByTestId('join-open-group-btn');
    await expect(openGroupBtn).toBeVisible({ timeout: 10000 });
    await openGroupBtn.click();

    await expect(page).toHaveURL(/\/group\/1$/, { timeout: 10000 });
    await expect(page.getByTestId('add-expense-btn')).toBeVisible({ timeout: 15000 });
  });
});
