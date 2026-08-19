// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('P2 features', () => {
  test('welcome shows use-vs-build context and links the changelog', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#welcome-section')).toBeVisible();
    await expect(page.locator('#welcome-section')).toContainText(/Use ready-made agents|Build agents/i);
    await expect(page.locator('.footer-changelog')).toBeVisible();
    // The guidance version strip is deliberately shown once, on the result card,
    // where freshness actually changes a decision — not on welcome or in the footer.
    await expect(page.locator('.guidance-meta:visible')).toHaveCount(0);
  });

  test('conditional runtime distinction favors Foundry for engineering ownership', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-no').click();

    const picks = {
      q1: 'q1c',
      q8: 'q8a',
      q2: 'q2b',
      q4: 'q4b',
      q3: 'q3f',
    };
    for (const qId of ['q1', 'q8', 'q2', 'q4', 'q3']) {
      await page.locator(`#options-list .option-card[data-option-id="${picks[qId]}"]`).click();
      await page.locator('#next-btn').click();
    }

    await expect(page.locator('#question-counter')).toContainText('One final distinction');
    await page.locator('#options-list .option-card').filter({ hasText: 'engineering team' }).click();
    await page.locator('#next-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText(/^Microsoft Foundry/);
  });

  test('share URL includes the conditional runtime answer', async ({ page }) => {
    await page.goto('/?q1=q1c&q8=q8a&q2=q2b&q4=q4d&q3=q3f&q9=q9d&r=foundry&d=20260819&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    const shareUrl = await page.evaluate(() => buildShareableURL());
    expect(shareUrl).toContain('q9=q9d');
  });

  test('results show feedback, export, and version strip', async ({ page }) => {
    await page.goto('/?q1=q1c&q8=q8a&q2=q2d&q4=q4b&q3=q3b&r=copilot_studio&d=20260810&mode=card');
    await expect(page.locator('#rec-guidance-meta')).toBeVisible();
    await expect(page.locator('#rec-guidance-meta')).toContainText(/Guidance v/);
    await expect(page.locator('#rec-feedback')).toBeVisible();
    await expect(page.locator('#export-md-btn')).toBeVisible();

    await page.locator('.btn-feedback', { hasText: 'Yes' }).click();
    await expect(page.locator('#feedback-thanks')).toBeVisible();
    await expect(page.locator('#feedback-thanks')).toContainText(/Thanks/i);
  });

  test('cross-note for maker + custom RAG', async ({ page }) => {
    await page.goto('/?q1=q1b&q8=q8c&q2=q2d&q4=q4c&q3=q3f&r=copilot_studio&d=20260810&mode=card');
    await expect(page.locator('#rec-cross-notes')).toBeVisible();
    await expect(page.locator('#rec-cross-notes')).toContainText(/Custom retrieval/i);
  });

  test('legacy ft=1 and dt=copilot_chat still resolve', async ({ page }) => {
    await page.goto('/?ft=1&mode=card');
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText('Microsoft 365 Copilot');

    await page.goto('/?dt=copilot_chat&mode=card');
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText('Microsoft 365 Copilot');
  });
});
