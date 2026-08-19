// @ts-check
const { test, expect } = require('@playwright/test');

// docs/DESIGN.md: "All interactive targets must be at least 44px tall or wide."
// This rule regressed twice on the v3 branch because it lived only in prose, so
// it is enforced here across the screens where controls are actually rendered.
const MIN_TARGET_PX = 44;
const CONTROL_SELECTOR = '.btn, .option-card, .theme-toggle, .btn-decision';

async function shortTargets(page) {
  return page.evaluate(({ sel, min }) => {
    return [...document.querySelectorAll(sel)]
      .filter(el => {
        if (el.offsetParent === null) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < min || r.height < min);
      })
      .map(el => {
        const r = el.getBoundingClientRect();
        return `${el.id || el.className} (${Math.round(r.width)}×${Math.round(r.height)}px) "${(el.textContent || '').trim().slice(0, 40)}"`;
      });
  }, { sel: CONTROL_SELECTOR, min: MIN_TARGET_PX });
}

test.describe('Touch targets meet the 44px minimum', () => {
  test('welcome and prescreen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#welcome-section')).toBeVisible();
    expect(await shortTargets(page)).toEqual([]);

    await page.locator('#start-btn').click();
    await expect(page.locator('#prescreen-section')).toBeVisible();
    expect(await shortTargets(page)).toEqual([]);
  });

  test('entry-point wizard', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-delegate').click();
    await expect(page.locator('#delegate-section')).toBeVisible();
    expect(await shortTargets(page)).toEqual([]);
  });

  test('scored wizard, conditional runtime distinction, and results', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-no').click();
    await expect(page.locator('#assessment-section')).toBeVisible();
    expect(await shortTargets(page)).toEqual([]);

    for (const optionId of ['q1c', 'q8a', 'q2b', 'q4d', 'q3f']) {
      const byId = page.locator(`#options-list .option-card[data-option-id="${optionId}"]`);
      if (await byId.count()) await byId.click();
      else await page.locator('#options-list .option-card').first().click();
      await page.locator('#next-btn').click();
    }

    await expect(page.locator('#question-counter')).toContainText('One final distinction');
    expect(await shortTargets(page)).toEqual([]);

    await page.locator('#options-list .option-card').filter({ hasText: 'Microsoft should manage' }).click();
    await page.locator('#next-btn').click();
    await expect(page.locator('#recommendation-section')).toBeVisible();
    expect(await shortTargets(page)).toEqual([]);
  });

  test('results at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?q1=q1c&q8=q8a&q2=q2d&q4=q4b&q3=q3b&r=copilot_studio&d=20260810&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    expect(await shortTargets(page)).toEqual([]);
  });
});
