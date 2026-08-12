const { test, expect } = require('@playwright/test');

// The Explore cards highlight on hover, so the whole card must be the click
// target. Guards against the highlight becoming a false affordance again.
async function gotoExplore(page) {
  await page.goto('/');
  await page.locator('#start-btn').click();
  await page.locator('#prescreen-explore').click();
  await expect(page.locator('#exploration-section')).toBeVisible();
}

test.describe('Explore cards are clickable edge to edge', () => {
  test('every card has exactly one link whose hit area covers the card', async ({ page }) => {
    await gotoExplore(page);

    const cards = page.locator('.exploration-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const title = await card.locator('.exploration-card-title').innerText();

      // A stretched link only works when it is the card's sole destination.
      await expect(card.locator('a'), `card "${title}" must have one link`).toHaveCount(1);

      const box = await card.boundingBox();
      expect(box.width * box.height, `card "${title}" should be a large target`).toBeGreaterThan(50000);

      // Probe the card's center, well outside the anchor's own text box.
      // elementFromPoint is viewport-relative, so scroll the card into view first.
      await card.scrollIntoViewIfNeeded();
      const probed = await card.boundingBox();
      const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? el.closest('a')?.className || '' : '';
      }, [probed.x + probed.width / 2, probed.y + probed.height / 2]);

      expect(hit, `card "${title}" center must resolve to its link`).toContain('exploration-card-link');
    }
  });

  test('cards signal clickability and keep the anchor focusable', async ({ page }) => {
    await gotoExplore(page);

    const card = page.locator('.exploration-card').first();
    await expect(card).toHaveCSS('cursor', 'pointer');

    const link = card.locator('a');
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toHaveAttribute('href', /https?:\/\//);
  });
});
