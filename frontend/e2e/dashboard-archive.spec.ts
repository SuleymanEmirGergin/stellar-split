import { test, expect } from '@playwright/test';

const E2E_WALLET = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((wallet: string) => {
    (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ = wallet;
    localStorage.setItem('stellarsplit_demo_mode', 'true');
    localStorage.setItem('stellarsplit_onboarding_done', 'true');
  }, E2E_WALLET);
});

test.describe('Dashboard archive filter', () => {
  test('clicking Archive shows archive empty state when no settled groups', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Click Archive filter (TR: Arşiv, EN: Archive, DE: Archiv)
    await page.getByRole('button', { name: /Arşiv|Archive|Archiv/i }).click();

    // Expect empty state: "No settled groups" / "Takas edilmiş grup yok" or hint "Settled groups appear here"
    await expect(
      page.getByText(/No settled groups|Takas edilmiş grup yok|Keine abgeschlossenen Gruppen|Settled groups appear here|Takas edilmiş gruplar burada/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
