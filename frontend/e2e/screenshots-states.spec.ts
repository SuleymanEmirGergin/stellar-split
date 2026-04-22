/**
 * Birik — state-dependent screenshot capture spec.
 *
 * Complements `screenshots.spec.ts` (simple viewport/theme shots).
 * This spec sets up actual demo state (groups, expenses, contributions)
 * and captures screenshots of modals/tabs/mobile sheets.
 *
 * NOT part of the CI test suite — run manually when README screenshots need refresh:
 *
 *   cd frontend
 *   npx playwright test e2e/screenshots-states.spec.ts --project=chromium --reporter=list
 *
 * Output: ../docs/screenshots/*.png (relative to frontend/)
 *
 * Covers 5 state-dependent shots:
 *   A. settle-modal-minflow.png  — Settle tab with min-flow settlement rows
 *   B. savings-roadmap.png       — Savings tab roadmap teaser (demo mode ships "coming soon")
 *   C. splt-reward.png           — Reputation-earned success toast after settle
 *   D. activity-feed.png         — Insights tab's ActivityFeed with mocked on-chain ops
 *   E. mobile-bottomsheet.png    — Mobile FAB → bottom sheet (MORE TABS)
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { seedDemoSession, ensureDashboardReady, E2E_WALLET } from './utils/session';

const OUT_DIR = path.join('..', 'docs', 'screenshots');

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const MEMBERS = [
  'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
  'GBYRVKBAGIIWT5JZX6BWR4XWIHIEPLVCJHHNLMK6YPVRSDQBVHGIH5HH',
  'GA5NXRQW4X2MJNWRM6BRCACKEPPDONX6BZFGFRXZQNYQJDWPG4WV7BSX',
];

const GROUP_ID = 9001;

async function setThemeDark(page: Page) {
  await page.addInitScript(() => localStorage.setItem('stellarsplit_theme', 'dark'));
}

async function setLocaleEn(page: Page) {
  await page.addInitScript(() => localStorage.setItem('stellarsplit_lang', 'en'));
}

async function seedGroupInStorage(page: Page) {
  await page.addInitScript(
    ({ id, wallet, second, third, fourth }) => {
      localStorage.setItem(
        'stellarsplit_groups',
        JSON.stringify([
          {
            id,
            name: 'Settle Demo',
            creator: wallet,
            owner: wallet,
            members: [wallet, second, third, fourth],
            currency: 'XLM',
            expense_count: 0,
            total_expenses: 0,
            is_settled: false,
          },
        ]),
      );
    },
    {
      id: GROUP_ID,
      wallet: E2E_WALLET,
      second: MEMBERS[0],
      third: MEMBERS[1],
      fourth: MEMBERS[2],
    },
  );
}

async function gotoGroupDetail(page: Page) {
  await page.goto(`/group/${GROUP_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
}

async function capture(page: Page, filename: string, fullPage = false) {
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage,
    animations: 'disabled',
  });
}

async function addExpenseViaUI(page: Page, description: string, amount: string) {
  const addBtn = page.getByTestId('add-expense-btn').first();
  await expect(addBtn).toBeVisible({ timeout: 8000 });
  await addBtn.click();
  const modal = page.locator('[aria-labelledby="add-expense-modal-title"]');
  await expect(modal).toBeVisible({ timeout: 8000 });
  await page.getByTestId('expense-description-input').fill(description);
  await page.getByTestId('expense-amount-input').fill(amount);
  await page.getByTestId('add-expense-modal-submit').click();
  await expect(modal).toBeHidden({ timeout: 8000 });
}

test.describe.configure({ mode: 'serial' });

// ───────────────────────────────────────────────────────────────
// A. settle-modal-minflow.png — Settle tab with settlement rows
// (getBalances/computeSettlements mocks in demo mode return 2 rows:
//   caller → GBR3...DEMO1: 150, GAV2...DEMO2 → GBR3...DEMO1: 100 —
//   i.e. min-flow reduces what would be 4 transfers into 2)
// ───────────────────────────────────────────────────────────────
test('A — settle-modal-minflow', async ({ page }) => {
  await setThemeDark(page);
  await setLocaleEn(page);
  await seedDemoSession(page, { clearGroups: true, clearDemoExpenses: true });
  await seedGroupInStorage(page);
  await page.setViewportSize(DESKTOP);

  await gotoGroupDetail(page);
  await addExpenseViaUI(page, 'Hotel', '120');
  await addExpenseViaUI(page, 'Groceries', '45');

  await page.getByTestId('tab-settle').click();
  await expect(page.getByTestId('tab-settle')).toHaveAttribute('aria-selected', 'true', {
    timeout: 5000,
  });
  await page.waitForTimeout(1500); // let settlement rows compute + animate
  await capture(page, 'settle-modal-minflow.png');
});

// ───────────────────────────────────────────────────────────────
// B. savings-roadmap.png — demo mode renders SocialSavings
// "coming soon" roadmap card. The real SavingsPool UI requires a
// backend JWT which isn't available in demo mode. This screenshot
// is used as a roadmap teaser in the README.
// ───────────────────────────────────────────────────────────────
test('B — savings-roadmap', async ({ page }) => {
  await setThemeDark(page);
  await setLocaleEn(page);
  await seedDemoSession(page, { clearGroups: true, clearDemoExpenses: true });
  await seedGroupInStorage(page);
  await page.setViewportSize(DESKTOP);

  await gotoGroupDetail(page);
  const savingsTab = page.getByTestId('tab-savings');
  await savingsTab.click();
  await page.waitForTimeout(1000);
  await capture(page, 'savings-roadmap.png');
});

// ───────────────────────────────────────────────────────────────
// C. splt-reward.png — toast capture after Mark-Group-Settled
// Toast text: "Reputation points earned!" (group.reward_earned)
// Button text: "Mark Group As Settled" (group.mark_group_settled)
// Capture strategy: wait for toast selector, then screenshot.
// ───────────────────────────────────────────────────────────────
test('C — splt-reward', async ({ page }) => {
  await setThemeDark(page);
  await setLocaleEn(page);
  await seedDemoSession(page, { clearGroups: true, clearDemoExpenses: true });
  await seedGroupInStorage(page);
  await page.setViewportSize(DESKTOP);

  await gotoGroupDetail(page);
  await addExpenseViaUI(page, 'Dinner', '60');

  await page.getByTestId('tab-settle').click();
  await page.waitForTimeout(1500);

  // Find the real settle button (EN: "Mark Group As Settled")
  const settleBtn = page
    .locator('button')
    .filter({ hasText: /Mark Group As Settled/i })
    .first();

  if (await settleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await settleBtn.click();
    // Toast appears within ~100ms. Wait for it, then screenshot while visible.
    const toast = page.locator('text=/Reputation points earned/i').first();
    try {
      await toast.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // Toast may not appear in demo (demo addToast path is conditional).
      // Screenshot anyway — captures post-settle state.
    }
    await page.waitForTimeout(200);
  }
  await capture(page, 'splt-reward.png');
});

// ───────────────────────────────────────────────────────────────
// D. activity-feed.png — Insights tab → ActivityFeed with mocked
// on-chain operations. TxHistory.tsx exists but is not mounted in
// any route; ActivityFeed plays the same role (Horizon ops + links
// to Stellar Expert) and IS rendered on the Insights tab.
// ───────────────────────────────────────────────────────────────
test('D — activity-feed', async ({ page }) => {
  await setThemeDark(page);
  await setLocaleEn(page);
  await seedDemoSession(page, { clearGroups: true, clearDemoExpenses: true });
  await seedGroupInStorage(page);
  await page.setViewportSize(DESKTOP);

  const now = new Date();
  const iso = (offsetMin: number) =>
    new Date(now.getTime() - offsetMin * 60_000).toISOString();

  await page.route('https://horizon-testnet.stellar.org/accounts/*/operations*', async (route) => {
    const records = [
      {
        id: '1',
        type: 'invoke_host_function',
        created_at: iso(5),
        source_account: E2E_WALLET,
        transaction_hash: 'c4b13aaf245715d0ca8b1b721fb54043ec12eb097a91da384e7c89d381adc2bc',
      },
      {
        id: '2',
        type: 'payment',
        created_at: iso(42),
        source_account: MEMBERS[0],
        transaction_hash: 'a1f92bb0d3e7c4f6ef2d1826cc0193fd5f21e62ba9e9bb3f9fcb3e9cb9d9cbda',
      },
      {
        id: '3',
        type: 'invoke_host_function',
        created_at: iso(210),
        source_account: MEMBERS[1],
        transaction_hash: 'fa3d1e51c2ff82aa77b89e0f5e2c8f6a3b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
      },
      {
        id: '4',
        type: 'payment',
        created_at: iso(1440),
        source_account: MEMBERS[2],
        transaction_hash: 'bb1122334455667788990011223344556677889900aabbccddeeff0011223344',
      },
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ _embedded: { records } }),
    });
  });

  await gotoGroupDetail(page);
  await page.getByTestId('tab-insights').click();
  await page.waitForTimeout(2500); // fetch + render ActivityFeed
  // fullPage: insights dashboard top + ActivityFeed at bottom show together
  await capture(page, 'activity-feed.png', /* fullPage */ true);
});

// ───────────────────────────────────────────────────────────────
// E. mobile-bottomsheet.png — mobile FAB → bottom sheet
// ───────────────────────────────────────────────────────────────
test('E — mobile-bottomsheet', async ({ page }) => {
  await setThemeDark(page);
  await setLocaleEn(page);
  await seedDemoSession(page, { clearGroups: true, clearDemoExpenses: true });
  await seedGroupInStorage(page);
  await page.setViewportSize(MOBILE);

  await gotoGroupDetail(page);
  await page.waitForTimeout(800);

  const moreBtn = page.locator('.sm\\:hidden.fixed.bottom-0').locator('button').last();
  if (await moreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await moreBtn.click();
    await page.waitForTimeout(600);
  }
  await capture(page, 'mobile-bottomsheet.png');
});
