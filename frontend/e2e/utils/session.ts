import { expect, type Page } from '@playwright/test';

export const E2E_WALLET = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK';

type DemoSessionOptions = {
  wallet?: string | null;
  demoMode?: boolean;
  markJoyrideDone?: boolean;
  clearStorage?: boolean;
  clearGroups?: boolean;
  clearDemoExpenses?: boolean;
};

export async function seedDemoSession(
  page: Page,
  options: DemoSessionOptions = {}
): Promise<void> {
  const {
    wallet = E2E_WALLET,
    demoMode = true,
    markJoyrideDone = true,
    clearStorage = false,
    clearGroups = false,
    clearDemoExpenses = false,
  } = options;

  await page.addInitScript(
    (cfg: {
      wallet: string | null;
      demoMode: boolean;
      markJoyrideDone: boolean;
      clearStorage: boolean;
      clearGroups: boolean;
      clearDemoExpenses: boolean;
    }) => {
      if (cfg.clearStorage) localStorage.clear();
      if (cfg.wallet) {
        (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ = cfg.wallet;
      }
      if (cfg.demoMode) {
        localStorage.setItem('stellarsplit_demo_mode', 'true');
      }
      if (cfg.markJoyrideDone) {
        localStorage.setItem('stellarsplit_joyride_done_v2', 'true');
      }
      if (cfg.clearGroups) {
        localStorage.removeItem('stellarsplit_groups');
      }
      if (cfg.clearDemoExpenses) {
        localStorage.removeItem('stellarsplit_demo_expenses');
      }
      // Force EN locale so copy-dependent assertions in tests are stable.
      // Default app locale is 'tr' which changes button/heading text.
      localStorage.setItem('stellarsplit_lang', 'en');
    },
    { wallet, demoMode, markJoyrideDone, clearStorage, clearGroups, clearDemoExpenses }
  );
}

export async function recoverFromErrorBoundary(page: Page): Promise<void> {
  const errorTitle = page.getByRole('heading', { name: /Bir hata|Something went wrong/i });
  if (!(await errorTitle.isVisible().catch(() => false))) return;
  await page.getByRole('button', { name: /Tekrar dene|Retry/i }).click();
  await expect(errorTitle).toBeHidden({ timeout: 10000 });
}

export async function ensureDashboardReady(page: Page): Promise<void> {
  const createGroupBtn = page.getByTestId('create-group-btn');

  await recoverFromErrorBoundary(page);
  if (await createGroupBtn.isVisible().catch(() => false)) return;

  const connectBtn = page.getByTestId('landing-connect-btn');
  if (await connectBtn.isVisible().catch(() => false)) {
    await connectBtn.click();
  }

  const tryDemoBtn = page.getByTestId('landing-try-demo');
  if (await tryDemoBtn.isVisible().catch(() => false)) {
    await tryDemoBtn.click();
  }

  await recoverFromErrorBoundary(page);
  if (!/\/dashboard$/.test(page.url())) {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await recoverFromErrorBoundary(page);
  }

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(createGroupBtn).toBeVisible({ timeout: 15000 });
}
