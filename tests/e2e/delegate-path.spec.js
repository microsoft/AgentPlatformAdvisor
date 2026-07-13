// @ts-check
const { test, expect } = require('@playwright/test');

async function openDelegate(page) {
  await page.goto('/');
  await page.locator('#start-btn').click();
  await expect(page.locator('#prescreen-section')).toBeVisible();
  await page.locator('#prescreen-delegate').click();
  await expect(page.locator('#delegate-section')).toBeVisible();
}

test.describe('Delegate Path (Cowork / Scout)', () => {
  test('on-demand + Microsoft 365 recommends Cowork', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="ondemand"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
    await expect(page.locator('#rec-second-card')).toBeEmpty();
  });

  test('continuous work recommends Scout', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="continuous"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft Scout');
  });

  test('cross-environment reach recommends Scout', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="ondemand"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="cross"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft Scout');
  });

  test('undecided answers present both as a complementary pair', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="unsure"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
    await expect(page.locator('#rec-pair-banner')).toBeVisible();
    await expect(page.locator('#rec-second-card')).toContainText('Microsoft Scout');
  });

  test('button is disabled until both questions answered', async ({ page }) => {
    await openDelegate(page);
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="cadence"][data-value="ondemand"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeEnabled();
  });

  test('delegate result hides scored UI', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="continuous"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="cross"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-score-toggle')).toBeHidden();
    await expect(page.locator('#rec-score-comparison')).toBeHidden();
    await expect(page.locator('#rec-fasttrack-prompt')).toBeHidden();
    await expect(page.locator('#rec-nav')).toBeHidden();
  });

  test('delegate result via URL params', async ({ page }) => {
    await page.goto('/?dt=scout&r=scout&d=20260713&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft Scout');
  });

  test('both via URL params shows pair', async ({ page }) => {
    await page.goto('/?dt=both&mode=card');
    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
    await expect(page.locator('#rec-second-card')).toContainText('Microsoft Scout');
  });

  test('back from delegate returns to prescreen', async ({ page }) => {
    await openDelegate(page);
    await page.goBack();
    await expect(page.locator('#prescreen-section')).toBeVisible();
  });

  test('Cowork spotlight no longer appears on M365 fast-track card', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-yes').click();
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
    await expect(page.locator('#rec-primary-card .rec-spotlight')).toHaveCount(0);
  });
});
