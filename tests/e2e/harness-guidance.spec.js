// @ts-check
const { test, expect } = require('@playwright/test');

function resultUrl(overrides = {}) {
  const answers = {
    q1: 'q1b',
    q8: 'q8c',
    q2: 'q2a',
    q4: 'q4b',
    q3: 'q3b',
    ...overrides,
  };
  const params = new URLSearchParams({
    ...answers,
    r: 'copilot_studio',
    d: '20260819',
    mode: 'card',
  });
  return `/?${params.toString()}`;
}

async function expectHarness(page, key, label) {
  await expect(page.locator('#recommendation-section')).toBeVisible();
  await expect(page.locator('#rec-primary-card .rec-platform-name')).toContainText('Copilot Studio');
  const guidance = page.locator(`#rec-primary-card .rec-harness-guidance[data-harness="${key}"]`);
  await expect(guidance).toBeVisible();
  await expect(guidance).toContainText(label);
}

test.describe('Copilot Studio harness guidance', () => {
  test('recommends GitHub Copilot harness for managed adaptive work', async ({ page }) => {
    await page.goto(resultUrl({ q4: 'q4d' }));
    await expectHarness(page, 'github_copilot', 'GitHub Copilot harness');
  });

  test('recommends standard harness for predictable conversations', async ({ page }) => {
    await page.goto(resultUrl({ q4: 'q4b' }));
    await expectHarness(page, 'standard', 'Standard harness');
  });

  test('recommends workflow for deterministic action automation', async ({ page }) => {
    await page.goto(resultUrl({ q2: 'q2c', q4: 'q4c' }));
    await expectHarness(page, 'workflow', 'Copilot Studio workflow');
  });

  test('recommends Copilot chat harness for internal knowledge extensions', async ({ page }) => {
    await page.goto(resultUrl({ q4: 'q4a', q3: 'q3a' }));
    await expectHarness(page, 'copilot_chat', 'Copilot chat harness');
  });
});
