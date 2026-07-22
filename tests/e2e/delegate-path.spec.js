// @ts-check
const { test, expect } = require('@playwright/test');

async function openDelegate(page) {
  await page.goto('/');
  await page.locator('#start-btn').click();
  await expect(page.locator('#prescreen-section')).toBeVisible();
  await page.locator('#prescreen-delegate').click();
  await expect(page.locator('#delegate-section')).toBeVisible();
}

async function chooseDelegate(page) {
  await page.locator('.delegate-option[data-group="involvement"][data-value="delegate"]').click();
}

test.describe('Entry-point wizard (Copilot Chat / Cowork / Scout)', () => {
  test('interactive + general help recommends Copilot Chat', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="involvement"][data-value="interactive"]').click();
    // The interactive follow-up (task type) is now revealed; button stays disabled until answered
    await expect(page.locator('#interactive-followup')).toHaveClass(/is-open/);
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="taskType"][data-value="general"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeEnabled();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Chat');
    await expect(page.locator('#rec-second-card')).toBeEmpty();
  });

  test('interactive + specialized job recommends Microsoft 365 Copilot built-in agents', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="involvement"][data-value="interactive"]').click();
    await page.locator('.delegate-option[data-group="taskType"][data-value="specialized"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
    await expect(page.locator('#rec-second-card')).toBeEmpty();
  });

  test('only the relevant follow-up is revealed as you answer', async ({ page }) => {
    await openDelegate(page);
    await expect(page.locator('#delegate-followup')).not.toHaveClass(/is-open/);
    await expect(page.locator('#interactive-followup')).not.toHaveClass(/is-open/);
    await chooseDelegate(page);
    await expect(page.locator('#delegate-followup')).toHaveClass(/is-open/);
    await expect(page.locator('#interactive-followup')).not.toHaveClass(/is-open/);
  });

  test('on-demand + Microsoft 365 recommends Cowork', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="ondemand"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
    await expect(page.locator('#rec-second-card')).toBeEmpty();
  });

  test('continuous work recommends Scout', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="continuous"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft Scout');
  });

  test('cross-environment reach recommends Scout', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="ondemand"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="cross"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft Scout');
  });

  test('undecided answers present both as a complementary pair', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="unsure"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
    await expect(page.locator('#rec-pair-banner')).toBeVisible();
    await expect(page.locator('#rec-second-card')).toContainText('Microsoft Scout');
  });

  test('button is disabled until the wizard has enough answers', async ({ page }) => {
    await openDelegate(page);
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await chooseDelegate(page);
    // Delegating requires cadence + reach
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="cadence"][data-value="ondemand"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeEnabled();
  });

  test('switching from delegate to interactive swaps the follow-up questions', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="ondemand"]').click();
    await page.locator('.delegate-option[data-group="involvement"][data-value="interactive"]').click();
    // Delegate follow-up collapses; interactive follow-up opens and gates the button
    await expect(page.locator('#delegate-followup')).not.toHaveClass(/is-open/);
    await expect(page.locator('#interactive-followup')).toHaveClass(/is-open/);
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="taskType"][data-value="general"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeEnabled();
    await page.locator('#delegate-next-btn').click();
    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Chat');
  });

  test('entry-point result hides scored UI', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="continuous"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="cross"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-score-toggle')).toBeHidden();
    await expect(page.locator('#rec-score-comparison')).toBeHidden();
    await expect(page.locator('#rec-fasttrack-prompt')).toBeHidden();
    await expect(page.locator('#rec-nav')).toBeHidden();
  });

  test('Copilot Chat result via URL params', async ({ page }) => {
    await page.goto('/?dt=copilot_chat&r=copilot_chat&d=20260713&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Chat');
  });

  test('Scout result via URL params', async ({ page }) => {
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

  test('Microsoft 365 Copilot card shows no Cowork spotlight', async ({ page }) => {
    await page.goto('/?dt=m365_copilot&r=m365_copilot&d=20260713&mode=card');
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
    await expect(page.locator('#rec-primary-card .rec-spotlight')).toHaveCount(0);
  });
});
