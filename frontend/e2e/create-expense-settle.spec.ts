import { test, expect } from '@playwright/test';

// Valid Stellar public key format for E2E (no real wallet). Demo mode uses localStorage.
const E2E_WALLET = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((wallet: string) => {
    (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ = wallet;
    localStorage.setItem('stellarsplit_demo_mode', 'true');
    localStorage.setItem('stellarsplit_onboarding_done', 'true');
  }, E2E_WALLET);
});

test.describe('Create group → Add expense → Settle flow', () => {
  test('full flow in demo mode: create group, add expense, open settle tab', async ({ page }) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);
    const groupName = `grp-${Date.now()}`;

    await page.goto('/');
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Dashboard: assert visible + enabled then click (data-testid = no strict mode)
    const newGroupBtn = page.getByTestId('create-group-btn');
    await expect(newGroupBtn).toBeVisible({ timeout: 10000 });
    await expect(newGroupBtn).toBeEnabled();
    await newGroupBtn.click();

    // Create group modal: wait for heading, fill unique name, submit by testid
    await expect(page.getByRole('heading', { name: /Yeni Grup|New Group/i })).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Eğlence|Tatil|vs\./).fill(groupName);
    const submitCreate = page.getByTestId('create-group-submit');
    await expect(submitCreate).toBeVisible();
    await expect(submitCreate).toBeEnabled();
    await submitCreate.click();

    await expect(page.getByRole('heading', { name: /Yeni Grup|New Group/i })).not.toBeVisible({ timeout: 5000 });
    const groupLink = page.getByRole('link', { name: new RegExp(groupName, 'i') });
    await expect(groupLink).toBeVisible({ timeout: 10000 });

    // Open group: wait for URL and click together (SPA navigation)
    await Promise.all([
      page.waitForURL(/\/group\/\d+/, { timeout: 10000 }),
      groupLink.click(),
    ]);
    await page.waitForLoadState('networkidle');

    // Group detail: Add Expense by testid (single match, no text flakiness)
    const addExpenseBtn = page.getByTestId('add-expense-btn');
    await expect(addExpenseBtn).toBeVisible({ timeout: 15000 });
    await expect(addExpenseBtn).toBeEnabled();
    await addExpenseBtn.click();

    await expect(page.getByRole('heading', { name: /Yeni Harcama|New Expense/i })).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Ne için|What for/i).fill('Kahve');
    await page.getByPlaceholder('0.00').fill('10');
    const submitExpense = page.getByTestId('add-expense-modal-submit');
    await expect(submitExpense).toBeVisible();
    await expect(submitExpense).toBeEnabled();
    await submitExpense.click();

    await expect(page.getByRole('heading', { name: /Yeni Harcama|New Expense/i })).not.toBeVisible({ timeout: 6000 });
    const row = page.getByTestId('expense-row').filter({ hasText: 'Kahve' }).first();
    await expect(row.getByTestId('expense-title')).toHaveText(/Kahve/i);
    await expect(row.getByTestId('expense-amount')).toHaveText(/10(\.00)?\s*XLM/i);

    // Settle tab by testid (tab-settle)
    const settleTab = page.getByTestId('tab-settle');
    await expect(settleTab).toBeVisible();
    await expect(settleTab).toBeEnabled();
    await settleTab.click();
    await expect(page.getByText(/Optimized Settlements|Hemen Öde|Settle now/i).first()).toBeVisible({ timeout: 5000 });

    const settleBtn = page.getByRole('button', { name: /Hemen Öde|Settle now/i });
    await expect(settleBtn).toBeVisible({ timeout: 3000 });
  });

  test('create group modal shows estimated fee when form is valid', async ({ page }) => {
    page.setDefaultTimeout(10_000);
    await page.goto('/');
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const newGroupBtn = page.getByTestId('create-group-btn');
    await expect(newGroupBtn).toBeVisible({ timeout: 10000 });
    await newGroupBtn.click();

    await expect(page.getByRole('heading', { name: /Yeni Grup|New Group/i })).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Eğlence|Tatil|vs\./).fill('Fee test group');
    // With name + creator as sole member, estimate runs in demo mode
    await expect(
      page.getByText(/stroops|Tahmini ağ ücreti|Estimated network fee|Geschätzte|Comisión de red estimada/i)
    ).toBeVisible({ timeout: 8000 });
  });
});
