// @ts-check
const { test, expect } = require('@playwright/test');

// CodeQL js/xss (high), assets/apa.js — the temporal-change banner built its
// markup with innerHTML while interpolating formatDateDisplay(originalDate),
// and originalDate is the d= share-link param. formatDateDisplay parsed month
// and day as integers but returned the YEAR raw via substring(0, 4), so four
// attacker-chosen characters reached the DOM as markup.
//
// Measured before the fix: ?d=<img0101 injected a real IMG element, and the
// injected tag swallowed the "Retake assessment" link into its own attributes,
// so the banner lost its only control.

const BASE = 'q1=q1a&q8=q8a&q2=q2a&q4=q4a&q3=q3a&r=copilot_studio&mode=card';
const banner = '#decision-card-banner';

// Each payload is exactly 8 chars, because the old length check required it.
const PAYLOADS = ['<img0101', '<b>x0101', '<svg0101', '"><b0101', '<a  0101'];

test.describe('Temporal banner cannot be injected via the d= param', () => {
  test('no payload injects an element', async ({ page }) => {
    for (const d of PAYLOADS) {
      await page.goto(`/?${BASE}&d=${encodeURIComponent(d)}`);
      await expect(page.locator(banner)).toBeVisible();

      const tags = await page.locator(banner).evaluate(
        el => [...el.querySelectorAll('*')].map(n => n.tagName)
      );
      // The retake anchor is the ONLY element the banner may ever contain.
      expect(tags, `payload ${JSON.stringify(d)} injected ${tags.join()}`).toEqual(['A']);
      await expect(page.locator(banner)).toContainText('a previous visit');
    }
  });

  test('the retake link survives every payload and still works', async ({ page }) => {
    // Pre-fix, the injected tag absorbed this link and the banner lost its control.
    await page.goto(`/?${BASE}&d=${encodeURIComponent('<img0101')}`);
    const link = page.locator(`${banner} a`);
    await expect(link).toHaveText('Retake assessment →');

    // The handler moved from an inline onclick to addEventListener; prove it fires.
    await link.click();
    await expect(page.locator('#welcome-section')).toBeVisible();
  });

  test('a real date still renders, and impossible ones are refused', async ({ page }) => {
    await page.goto(`/?${BASE}&d=20260401`);
    await expect(page.locator(banner)).toContainText('Apr 1, 2026');

    for (const bad of ['20261301', '20260231', '20260000', '2026041', 'abcdefgh']) {
      await page.goto(`/?${BASE}&d=${bad}`);
      await expect(page.locator(banner), `d=${bad} should not render a date`)
        .toContainText('a previous visit');
    }
  });

  test('formatDateDisplay never returns raw input', async ({ page }) => {
    await page.goto('/');
    const results = await page.evaluate(
      list => list.map(v => formatDateDisplay(v)),
      ['<img0101', '20261301', '20260231', '', null, '2026-4-1', '20260401']
    );
    expect(results.slice(0, 6).every(r => r === '')).toBe(true);
    expect(results[6]).toBe('Apr 1, 2026');
    results.forEach(r => expect(r).not.toMatch(/[<>]/));
  });
});
