import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env['E2E_EMAIL'] ?? 'admin@intersig.local';
const PASSWORD = process.env['E2E_PASSWORD'] ?? 'admin';

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(vehicules|dashboard|chatbot)/, { timeout: 10_000 });
}

/** Ensure the conversation sidebar is expanded (state may be persisted closed). */
async function openSidebar(page: Page): Promise<void> {
  const sidebar = page.locator('app-conversation-sidebar .sidebar');
  const isOpen = await sidebar.evaluate((el) => !el.classList.contains('sidebar--closed'));
  if (!isOpen) {
    await page.locator('.sidebar__toggle').click();
    await page.waitForTimeout(300);
  }
}

/** Poll the sidebar entry count until it stops changing (async list load). */
async function stableEntryCount(page: Page): Promise<number> {
  let prev = -1;
  for (let i = 0; i < 12; i++) {
    const c = await page.locator('.sidebar__entry').count();
    if (c === prev) return c;
    prev = c;
    await page.waitForTimeout(300);
  }
  return prev;
}

test.describe('Chatbot page', () => {
  test.beforeEach(async ({ page }) => {
    // Auto-accept any native confirm() (e.g. delete confirmation). Registered
    // here so it is always active before any action can trigger a dialog.
    page.on('dialog', (dialog) => dialog.accept());
    await login(page);
    await page.goto('/chatbot');
    await page.waitForSelector('.sidebar__toggle', { timeout: 10_000 });
  });

  test('sidebar toggle button is visible', async ({ page }) => {
    const toggle = page.locator('.sidebar__toggle');
    await expect(toggle).toBeVisible();
  });

  test('sidebar collapses and expands on toggle click', async ({ page }) => {
    const sidebar = page.locator('app-conversation-sidebar .sidebar');

    // Force open first (state may be persisted as closed)
    const isOpen = await sidebar.evaluate((el) => !el.classList.contains('sidebar--closed'));
    if (!isOpen) {
      await page.locator('.sidebar__toggle').click();
      await page.waitForTimeout(300);
    }

    const openWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
    expect(openWidth).toBeGreaterThan(200);

    // Collapse
    await page.locator('.sidebar__toggle').click();
    await page.waitForTimeout(300);
    const closedWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
    expect(closedWidth).toBeLessThan(60);

    // Re-open
    await page.locator('.sidebar__toggle').click();
    await page.waitForTimeout(300);
    const reopenedWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
    expect(reopenedWidth).toBeGreaterThan(200);
  });

  // Several fleet questions covering distinct indexed sources (interventions,
  // pneus, composants). Each must yield a real answer — never the no-data
  // fallback nor a connection error.
  const PROMPTS = [
    'Quelles interventions de vidange ont été réalisées ?',
    'Parle-moi des changements de pneus.',
    'Quels types de composants existent dans le parc ?',
  ];

  test('sends multiple prompts and the assistant answers each correctly', async ({ page }) => {
    const input = page.locator('.chatbot-input-row__input');
    await expect(input).toBeVisible();

    for (let i = 0; i < PROMPTS.length; i++) {
      await input.fill(PROMPTS[i]);
      await input.press('Enter');

      // One assistant bubble per sent prompt should now exist.
      await expect(page.locator('.bubble--assistant')).toHaveCount(i + 1, { timeout: 90_000 });

      // Streaming finished when no bubble shows the streaming cursor.
      await expect(page.locator('.bubble__cursor')).toHaveCount(0, { timeout: 90_000 });

      const answer = page.locator('.bubble--assistant .bubble__text').nth(i);
      await expect(answer).not.toBeEmpty();
      const text = (await answer.textContent())?.trim() ?? '';
      expect(text).not.toContain('Erreur de connexion');
      expect(text).not.toContain('Aucune donnée trouvée');
    }
  });

  test('shows a single thinking indicator (no duplicate empty bubble)', async ({ page }) => {
    const input = page.locator('.chatbot-input-row__input');
    await input.fill('hi');
    await input.press('Enter');

    // While the assistant is "thinking" (before the first token), there must be
    // exactly one indicator: the typing dots, and NO empty assistant bubble.
    // Poll the whole thinking window; the invariant must hold at every sample.
    for (let i = 0; i < 20; i++) {
      const typing = await page.locator('.chatbot-typing').count();
      const emptyAssistant = await page
        .locator('.bubble--assistant .bubble__text')
        .filter({ hasText: /^\s*$/ })
        .count();
      // Never both a typing indicator and an empty assistant bubble at once.
      expect(typing + emptyAssistant).toBeLessThanOrEqual(1);
      const hasText = await page.locator('.bubble--assistant .bubble__text').count() > 0
        && ((await page.locator('.bubble--assistant .bubble__text').first().textContent())?.trim().length ?? 0) > 0;
      if (hasText) break; // streaming started
      await page.waitForTimeout(150);
    }
    // Let it finish so the next test starts clean.
    await expect(page.locator('.bubble__cursor')).toHaveCount(0, { timeout: 90_000 });
  });

  test('answers a vehicle-count question with a real number', async ({ page }) => {
    const input = page.locator('.chatbot-input-row__input');
    await expect(input).toBeVisible();

    await input.fill('Combien de véhicules y a-t-il dans le parc ?');
    await input.press('Enter');

    await expect(page.locator('.bubble--assistant')).toHaveCount(1, { timeout: 90_000 });
    await expect(page.locator('.bubble__cursor')).toHaveCount(0, { timeout: 90_000 });

    const text = (await page.locator('.bubble--assistant .bubble__text').first().textContent())?.trim() ?? '';
    expect(text).toMatch(/\d/); // a concrete count, not a refusal
    expect(text).not.toContain('Erreur de connexion');
    expect(text).not.toContain('Aucune donnée trouvée');
    expect(text).not.toMatch(/ne permettent pas de déterminer/i);
  });

  test('the history list scrolls internally without scrolling the page', async ({ page }) => {
    await openSidebar(page);
    const list = page.locator('.sidebar__list');
    await expect(list).toBeVisible();

    // Seed enough conversations to guarantee the list overflows its panel.
    const input = page.locator('.chatbot-input-row__input');
    while ((await page.locator('.sidebar__entry').count()) < 12) {
      await page.locator('.sidebar__new').click();
      await input.fill('Bonjour');
      await input.press('Enter');
      await expect(page.locator('.bubble__cursor')).toHaveCount(0, { timeout: 90_000 });
    }

    const overflowY = await list.evaluate((el) => getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');

    // The whole page must NOT scroll — the sidebar is bounded to the layout
    // height and the list scrolls inside it.
    const pageScrolls = await page.evaluate(() => {
      const d = document.scrollingElement!;
      return d.scrollHeight > d.clientHeight + 1;
    });
    expect(pageScrolls).toBe(false);

    // The list is its own scroll container (content taller than its viewport).
    const listScrolls = await list.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    expect(listScrolls).toBe(true);

    const fitsWithinSidebar = await list.evaluate((el) => {
      const sidebar = el.closest('.sidebar') as HTMLElement;
      return el.getBoundingClientRect().bottom <= sidebar.getBoundingClientRect().bottom + 1;
    });
    expect(fitsWithinSidebar).toBe(true);
  });

  test('the input is a centered floating card', async ({ page }) => {
    const wrap = page.locator('.chatbot-input-row__wrap');
    const screen = page.locator('.chatbot-screen');
    await expect(wrap).toBeVisible();

    const wrapBox = await wrap.boundingBox();
    const screenBox = await screen.boundingBox();
    expect(wrapBox).not.toBeNull();
    expect(screenBox).not.toBeNull();
    if (!wrapBox || !screenBox) return;

    // Capped width (max-width: 780px) and horizontally centered within the screen.
    expect(wrapBox.width).toBeLessThanOrEqual(781);
    const wrapCenter = wrapBox.x + wrapBox.width / 2;
    const screenCenter = screenBox.x + screenBox.width / 2;
    expect(Math.abs(wrapCenter - screenCenter)).toBeLessThan(20);
  });

  test('a conversation is registered in history only after the first prompt', async ({ page }) => {
    await openSidebar(page);
    const beforeCount = await stableEntryCount(page);

    // Clicking "+ Nouvelle conversation" must NOT create a history entry.
    await page.locator('.sidebar__new').click();
    await page.waitForTimeout(700);
    expect(await page.locator('.sidebar__entry').count()).toBe(beforeCount);

    // Sending a prompt registers exactly one new conversation.
    const input = page.locator('.chatbot-input-row__input');
    await input.fill('Parle-moi des vidanges réalisées.');
    await input.press('Enter');
    await expect(page.locator('.bubble__cursor')).toHaveCount(0, { timeout: 90_000 });

    await expect(page.locator('.sidebar__entry')).toHaveCount(beforeCount + 1, { timeout: 10_000 });
  });

  test('can delete a conversation from the sidebar', async ({ page }) => {
    await openSidebar(page);

    // Guarantee at least one conversation exists, then wait for the history list
    // to fully settle BEFORE deleting — sending a prompt creates a conversation
    // whose async list-reload would otherwise race the delete's reload.
    const beforeCount = await stableEntryCount(page);
    if (beforeCount === 0) {
      const input = page.locator('.chatbot-input-row__input');
      await input.fill('Liste des changements de pneus.');
      await input.press('Enter');
      await expect(page.locator('.bubble__cursor')).toHaveCount(0, { timeout: 90_000 });
    }
    const settledCount = await stableEntryCount(page);
    expect(settledCount).toBeGreaterThan(0);

    // Click delete (confirm auto-accepted in beforeEach) and wait for the DELETE
    // to actually complete — deterministic, immune to dialog/render timing.
    const deleteDone = page.waitForResponse(
      (r) => r.request().method() === 'DELETE' && /\/api\/ai\/conversations\/\d+$/.test(r.url()),
      { timeout: 10_000 },
    );
    await page.locator('.sidebar__entry').first().locator('.sidebar__delete').click();
    await deleteDone;

    await expect(page.locator('.sidebar__entry')).toHaveCount(settledCount - 1, { timeout: 10_000 });
  });

});
