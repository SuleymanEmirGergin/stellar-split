import { test, expect, type Page } from '@playwright/test';

const E2E_WALLET = 'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK';
const E2E_SECOND_MEMBER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((wallet: string) => {
    (window as unknown as { __PLAYWRIGHT_E2E_WALLET__?: string }).__PLAYWRIGHT_E2E_WALLET__ = wallet;
    localStorage.setItem('stellarsplit_demo_mode', 'true');
    localStorage.setItem('stellarsplit_joyride_done_v2', 'true');
  }, E2E_WALLET);
});

async function recoverFromErrorBoundary(page: Page): Promise<void> {
  const errorTitle = page.getByRole('heading', { name: /Bir hata oluştu|Something went wrong/i });
  if (!(await errorTitle.isVisible().catch(() => false))) return;
  await page.getByRole('button', { name: /Tekrar dene|Retry/i }).click();
  await expect(errorTitle).toBeHidden({ timeout: 10000 });
}

async function ensureDashboardReady(page: Page): Promise<void> {
  const createGroupBtn = page.getByTestId('create-group-btn');
  await recoverFromErrorBoundary(page);
  if (await createGroupBtn.isVisible().catch(() => false)) return;

  const connectBtn = page.getByTestId('landing-connect-btn');
  if (await connectBtn.isVisible().catch(() => false)) {
    await connectBtn.click();
  }

  const tryDemoBtn = page.getByTestId('landing-try-demo');
  if (!(await createGroupBtn.isVisible().catch(() => false)) && (await tryDemoBtn.isVisible().catch(() => false))) {
    await tryDemoBtn.click();
  }

  await recoverFromErrorBoundary(page);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(createGroupBtn).toBeVisible({ timeout: 15000 });
}

async function openCreateGroupModal(page: Page): Promise<void> {
  const createGroupBtn = page.getByTestId('create-group-btn');
  const createGroupNameInput = page.getByTestId('create-group-name-input');
  const createGroupModal = page.locator('[aria-labelledby="create-group-modal-title"]');

  await ensureDashboardReady(page);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await createGroupNameInput.isVisible().catch(() => false)) return;
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('stellarsplit:new-group')));
    await page.waitForTimeout(200);
    if (await createGroupNameInput.isVisible().catch(() => false)) return;
    await createGroupBtn.dispatchEvent('click');
    await page.waitForTimeout(200);
  }

  await expect(createGroupNameInput).toBeVisible({ timeout: 10000 });
  await expect(createGroupModal).toBeVisible({ timeout: 10000 });
  // Framer-motion enter animation can cause intermittent detached-element races.
  await page.waitForTimeout(300);
}

async function fillCreateGroupFields(page: Page, name: string, members: string): Promise<void> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await openCreateGroupModal(page);
      const createGroupNameInput = page.getByTestId('create-group-name-input');
      const createGroupMembersInput = page.getByTestId('create-group-members-input');
      await createGroupNameInput.fill(name);
      await createGroupMembersInput.fill(members);
      await expect(createGroupNameInput).toHaveValue(name);
      await expect(createGroupMembersInput).toHaveValue(members);
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr instanceof Error) throw lastErr;
  throw new Error('Failed to fill create-group form after retries.');
}

test.describe('Create group flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('create group in demo mode persists and appears on dashboard', async ({ page }) => {
    page.setDefaultTimeout(15000);

    const groupName = `grp-${Date.now()}`;
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
    await ensureDashboardReady(page);

    const beforeCount = await page.getByTestId('group-card').count();
    await fillCreateGroupFields(page, groupName, E2E_SECOND_MEMBER);

    const submitCreate = page.getByTestId('create-group-submit');
    await expect(submitCreate).toBeEnabled();
    await submitCreate.click();

    await expect(page.getByTestId('create-group-name-input')).toBeHidden({ timeout: 20000 });
    const createdGroupCard = page.getByTestId('group-card').filter({ hasText: groupName }).first();
    await expect(createdGroupCard).toBeVisible({ timeout: 15000 });
    await expect
      .poll(async () => await page.getByTestId('group-card').count())
      .toBe(beforeCount + 1);

    // Demo persistence check.
    await expect(
      page.evaluate((name) => {
        const raw = localStorage.getItem('stellarsplit_groups');
        if (!raw) return false;
        const groups = JSON.parse(raw) as Array<{ name?: string; members?: string[] }>;
        return groups.some((g) => g.name === name && Array.isArray(g.members) && g.members.length >= 2);
      }, groupName)
    ).resolves.toBe(true);
  });

  test('create group modal shows estimated fee when form is valid', async ({ page }) => {
    page.setDefaultTimeout(15000);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
    await ensureDashboardReady(page);

    await openCreateGroupModal(page);
    await page.getByTestId('create-group-name-input').fill('Fee test group');

    await expect(page.getByText(/stroops|Estimated network fee|Tahmini/i)).toBeVisible({ timeout: 8000 });
  });
});
