import { test, expect } from '@playwright/test';
import { ensureDashboardReady, seedDemoSession } from './utils/session';

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page, { clearGroups: true, clearDemoExpenses: true });
});

test.describe('Dashboard archive filter', () => {
  test('clicking Archive shows archive empty state when no settled groups', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await ensureDashboardReady(page);

    const archiveFilterBtn = page.getByTestId('filter-archive');
    await expect(archiveFilterBtn).toBeVisible({ timeout: 10000 });
    await archiveFilterBtn.click();
    await expect(archiveFilterBtn).toHaveClass(/bg-indigo-500/);
    await expect(page.getByTestId('group-card')).toHaveCount(0);
  });
});
