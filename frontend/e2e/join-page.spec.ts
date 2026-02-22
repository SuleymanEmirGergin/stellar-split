import { test, expect } from '@playwright/test';

const E2E_WALLET = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK';

test.describe('Join page', () => {
  test('join page shows title and connect CTA when not connected', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/join/1', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Join this group|Bu gruba katıl|Gruppe beitreten|Unirse al grupo/i }).or(
        page.getByRole('button', { name: /Connect wallet|Cüzdanı Bağla|Wallet verbinden|Conectar wallet/i })
      ).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('join page with invalid id still shows join or connect', async ({ page }) => {
    await page.goto('/join/99999', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Join|katıl|beitreten|Unirse/i }).or(
        page.getByRole('button', { name: /Connect|Cüzdan|Wallet|Conectar/i })
      ).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('join flow: connect (demo) then open group lands on group detail', async ({ page }) => {
    await page.addInitScript((wallet: string) => {
      (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ = wallet;
      localStorage.setItem('stellarsplit_demo_mode', 'true');
      localStorage.setItem('stellarsplit_onboarding_done', 'true');
    }, E2E_WALLET);
    page.setDefaultTimeout(12_000);
    await page.goto('/');
    await page.goto('/join/1', { waitUntil: 'networkidle' });
    const openGroupBtn = page.getByRole('button', { name: /Open group|Grubu Aç|Gruppe öffnen|Abrir grupo/i });
    await expect(openGroupBtn).toBeVisible({ timeout: 10000 });
    await openGroupBtn.click();
    await expect(page).toHaveURL(/\/group\/1/, { timeout: 8000 });
    await expect(
      page.getByRole('button', { name: /Geri|Back/i }).or(page.getByRole('link', { name: /Harcamalar|Expenses|Bakiyeler|Balances/i }).first())
    ).toBeVisible({ timeout: 5000 });
  });
});
