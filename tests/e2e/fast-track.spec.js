// @ts-check
const { test, expect } = require('@playwright/test');

// Microsoft 365 Copilot's built-in agents are now reached through the entry-point
// wizard (interactive → a specialized job), not a dedicated prescreen tile.
async function openWizard(page) {
  await page.goto('/');
  await expect(page.locator('#welcome-section')).toBeVisible();
  await page.locator('#start-btn').click();
  await expect(page.locator('#prescreen-section')).toBeVisible();
  await page.locator('#prescreen-delegate').click();
  await expect(page.locator('#delegate-section')).toBeVisible();
}

async function chooseBuiltInAgents(page) {
  await page.locator('.delegate-option[data-group="involvement"][data-value="interactive"]').click();
  await page.locator('.delegate-option[data-group="taskType"][data-value="specialized"]').click();
  await page.locator('#delegate-next-btn').click();
}

test.describe('Microsoft 365 Copilot built-in agents (via entry-point wizard)', () => {
  test('specialized interactive task recommends Microsoft 365 Copilot', async ({ page }) => {
    await openWizard(page);
    await chooseBuiltInAgents(page);

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#assessment-section')).toBeHidden();
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
  });

  test('built-in agents result hides scored UI', async ({ page }) => {
    await openWizard(page);
    await chooseBuiltInAgents(page);

    await expect(page.locator('#rec-score-toggle')).toBeHidden();
    await expect(page.locator('#rec-score-comparison')).toBeHidden();
    await expect(page.locator('#rec-fasttrack-prompt')).toBeHidden();
    await expect(page.locator('#rec-nav')).toBeHidden();
  });

  test('built-in agents card lists first-party agents', async ({ page }) => {
    await openWizard(page);
    await chooseBuiltInAgents(page);

    await expect(page.locator('#rec-primary-card')).toContainText('Researcher');
    await expect(page.locator('#rec-primary-card')).toContainText('Analyst');
  });

  test('the built-in Microsoft 365 Copilot prescreen tile has been removed', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await expect(page.locator('#prescreen-yes')).toHaveCount(0);
  });

  test('Microsoft 365 Copilot result via wizard URL params', async ({ page }) => {
    await page.goto('/?dt=m365_copilot&r=m365_copilot&d=20260713&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
  });

  test('legacy fast-track URL still resolves to Microsoft 365 Copilot', async ({ page }) => {
    await page.goto('/?ft=1&r=m365_copilot&d=20260401&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
  });

  test('built-in agents result updates tab title', async ({ page }) => {
    await openWizard(page);
    await chooseBuiltInAgents(page);
    await expect(page).toHaveTitle(/APA:.*recommended/);
  });
});
