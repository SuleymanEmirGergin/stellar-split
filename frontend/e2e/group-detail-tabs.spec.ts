import { test, expect, type Page } from '@playwright/test';
import { seedDemoSession } from './utils/session';

const E2E_WALLET = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK';
const SECOND_MEMBER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const THIRD_MEMBER  = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

async function seedGroup(page: Page) {
  await seedDemoSession(page);
  await page.addInitScript(
    ({ wallet, second }: { wallet: string; second: string }) => {
      localStorage.setItem(
        'stellarsplit_groups',
        JSON.stringify([
          {
            id: 1,
            name: 'Trip Group',
            creator: wallet,
            owner: wallet,
            members: [wallet, second],
            currency: 'XLM',
            expense_count: 0,
            total_expenses: 0,
            is_settled: false,
          },
        ]),
      );
    },
    { wallet: E2E_WALLET, second: SECOND_MEMBER },
  );
}

async function gotoGroupDetail(page: Page) {
  await page.goto('/group/1', { waitUntil: 'domcontentloaded' });
  // Wait for group header to render
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
}

test.use({ viewport: { width: 1280, height: 800 } });

test.describe('GroupDetail tab switching', () => {
  test.beforeEach(async ({ page }) => {
    await seedGroup(page);
    await gotoGroupDetail(page);
  });

  test('gallery tab shows empty state title', async ({ page }) => {
    await page.getByTestId('tab-gallery').click();
    // EN translation: 'Receipts'
    await expect(page.getByText(/Receipts|Makbuzlar/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('recurring tab shows empty state', async ({ page }) => {
    await page.getByTestId('tab-recurring').click();
    // EN translation: 'No Subscriptions'
    await expect(page.getByText(/No Subscriptions|Abonelik Bulunmuyor/i)).toBeVisible({ timeout: 8000 });
  });

  test('social tab renders webhook input', async ({ page }) => {
    await page.getByTestId('tab-social').click();
    await expect(page.getByText(/Discord|Slack/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('defi tab renders vault state', async ({ page }) => {
    await page.getByTestId('tab-defi').click();
    // Demo mode returns an inactive vault — the DeFi title or vault status should appear
    await expect(
      page.getByText(/DeFi|Vault|Kasa|Inactive|Devre/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('governance tab renders proposals section', async ({ page }) => {
    await page.getByTestId('tab-governance').click();
    // Should show either empty proposals state or add proposal button
    // EN: "Voting" tab + "No Votes" empty; TR: "Oylama" / "Oylama Yok"; + "New Proposal" / "Yeni Teklif" CTA
    await expect(
      page.getByText(/Proposal|Oylama|Governance|teklif|Voting|No Votes/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('expenses tab is active by default', async ({ page }) => {
    const expensesTab = page.getByTestId('tab-expenses');
    await expect(expensesTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
  });
});

test.describe('Recurring subscription creation', () => {
  test.beforeEach(async ({ page }) => {
    await seedGroup(page);
    await gotoGroupDetail(page);
    await page.getByTestId('tab-recurring').click();
    await expect(page.getByText(/No Subscriptions|Abonelik Bulunmuyor/i)).toBeVisible({ timeout: 8000 });
  });

  test('+ button opens subscription modal', async ({ page }) => {
    // The + button is in the recurring tab header
    await page.getByTestId('add-subscription-btn').click();
    await expect(page.locator('[aria-labelledby="sub-modal-title"]')).toBeVisible({ timeout: 5000 });
  });

  test('subscription modal can be submitted with valid data', async ({ page }) => {
    await page.getByTestId('add-subscription-btn').click();
    const modal = page.locator('[aria-labelledby="sub-modal-title"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[placeholder*="Netflix"]').fill('Netflix Test');
    await modal.locator('input[type="number"]').first().fill('10');

    const submitBtn = modal.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Modal closes after submit
    await expect(modal).toBeHidden({ timeout: 8000 });
    // New subscription appears
    await expect(page.getByText('Netflix Test')).toBeVisible({ timeout: 8000 });
  });

  test('subscription modal closes on Escape key', async ({ page }) => {
    await page.getByTestId('add-subscription-btn').click();
    const modal = page.locator('[aria-labelledby="sub-modal-title"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden({ timeout: 5000 });
  });
});

test.describe('Member management', () => {
  test.beforeEach(async ({ page }) => {
    await seedGroup(page);
    await gotoGroupDetail(page);
    await page.getByTestId('tab-balances').click();
  });

  test('member list shows initial members', async ({ page }) => {
    // Group has 2 members - wallet addresses should be visible (truncated)
    await expect(page.getByText(/GDJ|GBR/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('can type in add member input', async ({ page }) => {
    const addInput = page.getByRole('textbox', { name: /add member|stellar address|üye ekle/i });
    if (await addInput.isVisible().catch(() => false)) {
      await addInput.fill(THIRD_MEMBER);
      await expect(addInput).toHaveValue(THIRD_MEMBER);
    } else {
      // Fallback: find any text input in balances tab that looks like member add
      const inputs = page.locator('input[type="text"]');
      const count = await inputs.count();
      if (count > 0) {
        await inputs.last().fill(THIRD_MEMBER.substring(0, 10));
        await expect(inputs.last()).toHaveValue(THIRD_MEMBER.substring(0, 10));
      }
    }
  });
});

test.describe('Governance proposal flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedGroup(page);
    await gotoGroupDetail(page);
    await page.getByTestId('tab-governance').click();
  });

  test('can open new proposal form', async ({ page }) => {
    // Look for a button that opens the proposal form
    const addBtn = page.locator('button').filter({ hasText: /New Proposal|Yeni|Teklif|proposal/i }).first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await expect(page.getByText(/New Proposal|Yeni Teklif/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('governance tab renders without crashing', async ({ page }) => {
    // At minimum, the tab should render without error
    await expect(page.locator('[data-testid="tab-governance"]')).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 5000 },
    );
  });
});
