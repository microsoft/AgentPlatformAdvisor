const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// The head is what unfurls in Teams, Slack, and search. Share links are a core
// feature here, so more people meet this app through the unfurl than the page.
// These guards exist because the body copy was fixed once while og:description
// kept serving the old build-framed sentence.
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

test.describe('Social/SEO metadata', () => {
  test('declares exactly one description meta', async () => {
    const matches = html.match(/name="description"/g) || [];
    expect(matches.length).toBe(1);
  });

  test('og:description matches the on-page welcome copy', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('#welcome-section:not(.hidden)');
    const body = (
      await page.locator('#welcome-section .welcome-description').textContent()
    ).trim();
    const meta = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content');
    expect(meta.trim()).toBe(body);
  });

  test('metadata does not promise a build platform for every visitor', async () => {
    const meta = html.match(
      /property="og:description"\s*\n\s*content="([^"]+)"/
    )[1];
    // The app routes two intents: get work done, and build. Copy that only
    // names the build outcome undersells the entry-point path.
    expect(meta).toMatch(/get work done/i);
    expect(meta).toMatch(/build/i);
  });

  test('title metadata agrees with the product name', async ({ page }) => {
    await page.goto('/index.html');
    const title = await page.title();
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute('content');
    const siteName = await page
      .locator('meta[property="og:site_name"]')
      .getAttribute('content');
    expect(ogTitle).toBe(title);
    expect(siteName).toBe(title);
    // "CAT" was the shared Power CAT prefix, stripped from the logo and favicon
    // in an earlier release but left behind in og:title.
    expect(ogTitle).not.toMatch(/\bCAT\b/);
  });
});
