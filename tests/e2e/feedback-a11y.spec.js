const { test, expect } = require('@playwright/test');

// The "Was this helpful?" buttons are removed on activation. Without a live
// region the confirmation is silent, and without focus management the keyboard
// user is dumped back to <body>.
async function gotoResult(page) {
  await page.goto('/?ft=1');
  await expect(page.locator('#rec-feedback')).toBeVisible();
}

test.describe('Feedback confirmation is announced and keeps focus', () => {
  test('the confirmation is a live region', async ({ page }) => {
    await gotoResult(page);

    const thanks = page.locator('#feedback-thanks');
    await expect(thanks).toHaveAttribute('role', 'status');

    // The region must already be in the accessibility tree when its text
    // changes, or the announcement is dropped.
    await page.locator('.btn-feedback', { hasText: 'Yes' }).first().click();
    await expect(thanks).toBeVisible();
    await expect(thanks).toHaveText(/glad it helped/i);
  });

  test('keyboard activation moves focus to the confirmation', async ({ page }) => {
    await gotoResult(page);

    const yes = page.locator('.btn-feedback', { hasText: 'Yes' }).first();
    await yes.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#feedback-thanks')).toBeFocused();
  });

  test('mouse activation does not steal focus', async ({ page }) => {
    await gotoResult(page);

    await page.locator('.btn-feedback', { hasText: 'Yes' }).first().click();

    await expect(page.locator('#feedback-thanks')).toBeVisible();
    await expect(page.locator('#feedback-thanks')).not.toBeFocused();
  });

  test('the No path exposes the issue link inside the live region', async ({ page }) => {
    await gotoResult(page);

    await page.locator('.btn-feedback', { hasText: 'No' }).first().click();

    const link = page.locator('#feedback-thanks a');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /github\.com.*issues\/new/);
  });
});
