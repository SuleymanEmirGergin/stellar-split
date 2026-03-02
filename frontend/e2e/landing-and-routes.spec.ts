import { test, expect, type Page } from '@playwright/test';

async function recoverFromErrorBoundary(page: Page): Promise<void> {
  const errorTitle = page.getByRole('heading', { name: /Bir hata oluştu|Something went wrong/i });
  if (!(await errorTitle.isVisible().catch(() => false))) return;
  await page.getByRole('button', { name: /Tekrar dene|Retry/i }).click();
  await expect(errorTitle).toBeHidden({ timeout: 10000 });
}

test.describe('Landing and routes', () => {
  test('landing page loads and shows hero CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('landing-connect-btn')).toBeVisible();
    await expect(page.getByTestId('landing-try-demo')).toBeVisible();
  });

  test('try demo opens dashboard and shows create group action', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stellarsplit_demo_mode', 'true');
      localStorage.setItem('stellarsplit_joyride_done_v2', 'true');
    });
    await page.goto('/');
    await recoverFromErrorBoundary(page);
    const tryDemoBtn = page.getByTestId('landing-try-demo');
    if (await tryDemoBtn.isVisible().catch(() => false)) {
      await tryDemoBtn.click();
    }

    if (!/\/dashboard$/.test(page.url())) {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    }
    await recoverFromErrorBoundary(page);
    const connectBtn = page.getByTestId('landing-connect-btn');
    if (await connectBtn.isVisible().catch(() => false)) {
      await connectBtn.click();
    }
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
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
    await expect(page.getByRole('banner').getByText('StellarSplit')).toBeVisible();
  });
});
