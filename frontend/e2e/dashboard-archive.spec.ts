import { test, expect, type Page } from '@playwright/test';

const E2E_WALLET = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK';

async function recoverFromErrorBoundary(page: Page): Promise<void> {
  const errorTitle = page.getByRole('heading', { name: /Bir hata oluştu|Something went wrong/i });
  if (!(await errorTitle.isVisible().catch(() => false))) return;
  await page.getByRole('button', { name: /Tekrar dene|Retry/i }).click();
  await expect(errorTitle).toBeHidden({ timeout: 10000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((wallet: string) => {
    (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ = wallet;
    localStorage.setItem('stellarsplit_demo_mode', 'true');
    localStorage.setItem('stellarsplit_joyride_done_v2', 'true');
    localStorage.removeItem('stellarsplit_groups');
    localStorage.removeItem('stellarsplit_demo_expenses');
  }, E2E_WALLET);
});

test.describe('Dashboard archive filter', () => {
  test('clicking Archive shows archive empty state when no settled groups', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await recoverFromErrorBoundary(page);

    const connectBtn = page.getByTestId('landing-connect-btn');
    if (await connectBtn.isVisible().catch(() => false)) {
      await connectBtn.click();
    }

    await recoverFromErrorBoundary(page);
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

    const archiveFilterBtn = page.getByTestId('filter-archive');
    await expect(archiveFilterBtn).toBeVisible({ timeout: 10000 });
    await archiveFilterBtn.click();
    await expect(archiveFilterBtn).toHaveClass(/bg-indigo-500/);
    await expect(page.getByTestId('group-card')).toHaveCount(0);
  });
});
