// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('P2 features', () => {
  test('welcome shows use-vs-build context and guidance version', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#welcome-section')).toBeVisible();
    await expect(page.locator('#welcome-section')).toContainText(/Use ready-made agents|Build agents/i);
    await expect(page.locator('#welcome-guidance-meta')).toBeVisible();
    await expect(page.locator('#welcome-guidance-meta')).toContainText(/Guidance v/);
    await expect(page.locator('#welcome-guidance-meta')).toContainText(/Changelog/i);
    await expect(page.locator('.footer-changelog')).toBeVisible();
    await expect(page.locator('#footer-guidance-meta')).toContainText(/Microsoft Learn/i);
  });

  test('optional constraints soft-boost Foundry for private networking', async ({ page }) => {
    // Pro-dev path that is close CS vs Foundry; private net should favor Foundry
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

    await expect(page.locator('#constraints-section')).toBeVisible();
    await page.locator('.option-card[data-constraint-id="c_private_net"]').click();
    await page.locator('#constraints-continue-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText(/^Microsoft Foundry/);
    await expect(page.locator('#rec-primary-card')).toContainText(/Constraint soft boost/i);
  });

  test('share URL includes constraint ids', async ({ page }) => {
    await page.goto('/?q1=q1c&q8=q8a&q2=q2b&q4=q4f&q3=q3f&c=c_private_net,c_airgap&r=foundry&d=20260810&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    const shareUrl = await page.evaluate(() => buildShareableURL());
    expect(shareUrl).toContain('c=');
    expect(shareUrl).toMatch(/c_private_net/);
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
