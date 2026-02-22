import { test, expect } from '@playwright/test';

test.describe('Landing and routes', () => {
  test('landing page loads and shows hero and connect CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Harcamaları Böl|Split/i);
    await expect(page.getByRole('button', { name: /Cüzdanı Bağla|Connect/i })).toBeVisible();
  });

  test('dashboard shows landing when not connected', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.getByRole('main').getByRole('button', { name: /Cüzdanı Bağla & Başla|Connect/i })).toBeVisible({ timeout: 10000 });
  });

  test('group route shows landing or connect when not connected', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/group/1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).or(page.getByRole('button', { name: /Cüzdanı Bağla|Connect|Freighter/i })).first()).toBeVisible({ timeout: 15000 });
  });

  test('group route with numeric id shows landing or connect when not connected', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/group/999', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).or(page.getByRole('button', { name: /Cüzdanı Bağla|Connect|Freighter/i })).first()).toBeVisible({ timeout: 15000 });
  });

  test('logo and nav elements are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByText('StellarSplit')).toBeVisible();
  });
});
