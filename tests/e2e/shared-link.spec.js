// @ts-check
const { test, expect } = require('@playwright/test');

// Pre-built URL params that produce a Copilot Studio recommendation:
// q1=q1c (pro dev), q8=q8a (internal), q2=q2d (multiple), q4=q4b (convo), q3=q3b (other systems)
const SHARED_PARAMS = 'q1=q1c&q8=q8a&q2=q2d&q4=q4b&q3=q3b&r=copilot_studio&d=20260401&mode=card';

test.describe('Shared Link Loading', () => {
  test('loads results directly from URL parameters', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);

    // Should skip wizard and show results directly
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#welcome-section')).toBeHidden();
    await expect(page.locator('#assessment-section')).toBeHidden();
  });

  test('displays shared context for URL-loaded results', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);

    // Decision card metadata section should be visible
    await expect(page.locator('#decision-card')).toBeVisible();

    // "Take your own assessment" link should be visible (URL-loaded mode)
    await expect(page.locator('#decision-card-context')).toBeVisible();
    await expect(page.locator('#decision-card-context')).toContainText('Take your own assessment');
  });

  test('renders platform recommendation card', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);

    // Primary recommendation card should exist
    await expect(page.locator('#rec-primary-card .rec-card')).toBeVisible();
  });

  test('handles invalid URL params gracefully', async ({ page }) => {
    // Load with completely bogus params
    await page.goto('/?q1=invalid&q2=garbage');

    // Should fall back to welcome screen
    await expect(page.locator('#welcome-section')).toBeVisible();
  });

  test('handles partial URL params with schema drift', async ({ page }) => {
    // Only 3 of 5 answers — should still load results but flag drift
    const partialParams = 'q1=q1c&q8=q8a&q2=q2d&r=copilot_studio&d=20260401&mode=card';
    await page.goto(`/?${partialParams}`);

    // Should show results
    await expect(page.locator('#recommendation-section')).toBeVisible();

    // Drift note should be visible
    await expect(page.locator('#decision-card-drift')).toBeVisible();
  });

  test('preserves pre-q9 links without treating the conditional question as schema drift', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#decision-card-drift')).toBeHidden();
  });

  test('maps previous managed q9 options to the new runtime distinction', async ({ page }) => {
    const params = `${SHARED_PARAMS}&q9=q9b`;
    await page.goto(`/?${params}`);
    const shareUrl = await page.evaluate(() => buildShareableURL());
    expect(shareUrl).toContain('q9=q9a');
  });

  test('maps temporary q4f links to complex orchestration plus engineering ownership', async ({ page }) => {
    const params = 'q1=q1c&q8=q8a&q2=q2b&q4=q4f&q3=q3f&r=foundry&d=20260812&mode=card';
    await page.goto(`/?${params}`);
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText(/^Microsoft Foundry/);
    const shareUrl = await page.evaluate(() => buildShareableURL());
    expect(shareUrl).toContain('q4=q4d');
    expect(shareUrl).toContain('q9=q9d');
    expect(shareUrl).not.toContain('q4=q4f');
  });
});
