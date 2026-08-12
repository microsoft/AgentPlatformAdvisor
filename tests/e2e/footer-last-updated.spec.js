const { test, expect } = require('@playwright/test');

test.describe('Footer last-updated date', () => {
  test('renders below the Created by credit with a machine-readable date', async ({ page }) => {
    await page.goto('/');

    const stamp = page.locator('#footer-last-updated');
    await expect(stamp).toBeVisible();
    await expect(stamp).toContainText(/^Last updated: /);

    // The <time> value is what makes the date machine-readable; the visible
    // label must not drift from it (timezone parsing is the usual culprit).
    const time = stamp.locator('time');
    const iso = await time.getAttribute('datetime');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const [y, m, d] = iso.split('-').map(Number);
    const expected = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
    await expect(time).toHaveText(expected);
  });

  test('sits directly below the Created by credit', async ({ page }) => {
    await page.goto('/');

    const credit = page.locator('.footer a[href*="linkedin.com"]');
    const stamp = page.locator('#footer-last-updated');

    const creditBox = await credit.boundingBox();
    const stampBox = await stamp.boundingBox();
    expect(stampBox.y).toBeGreaterThan(creditBox.y);

    // Anything else landing between the two would break the requested order.
    const docLinks = await page.locator('.footer-doc-links').boundingBox();
    expect(stampBox.y).toBeLessThan(docLinks.y);
  });
});
