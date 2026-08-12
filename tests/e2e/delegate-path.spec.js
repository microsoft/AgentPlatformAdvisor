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

// Copilot Chat and the built-in agents are surfaces of Microsoft 365 Copilot, not
// separate destinations: staying hands-on always lands on the one Microsoft 365
// Copilot card, and the task type only decides which surface it says to start with.
async function expectM365Card(page, startHere) {
  await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText('Microsoft 365 Copilot');
  if (startHere) {
    await expect(page.locator('#rec-primary-card .rec-spotlight-eyebrow')).toHaveText('Start Here');
    await expect(page.locator('#rec-primary-card .rec-spotlight-name')).toContainText(startHere);
  } else {
    await expect(page.locator('#rec-primary-card .rec-spotlight')).toHaveCount(0);
  }
}

test.describe('Entry-point wizard (Microsoft 365 Copilot / Cowork / Scout)', () => {
  test('interactive + general help starts with Copilot Chat', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="involvement"][data-value="interactive"]').click();
    // The interactive follow-up (task type) is now revealed; button stays disabled until answered
    await expect(page.locator('#interactive-followup')).toHaveClass(/is-open/);
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="taskType"][data-value="general"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeEnabled();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expectM365Card(page, 'Copilot Chat');
    await expect(page.locator('#rec-second-card')).toBeEmpty();
  });

  test('interactive + specialized job starts with the built-in agents', async ({ page }) => {
    await openDelegate(page);
    await page.locator('.delegate-option[data-group="involvement"][data-value="interactive"]').click();
    await page.locator('.delegate-option[data-group="taskType"][data-value="specialized"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expectM365Card(page, 'Researcher');
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

  test('one-shot + Microsoft 365 recommends Cowork', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="oneshot"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
    await expect(page.locator('#rec-second-card')).toBeEmpty();
  });

  test('recurring/event + Microsoft 365 recommends Cowork', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="recurring"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
    await expect(page.locator('#rec-second-card')).toBeEmpty();
  });

  test('recurring/event + cross-environment recommends Scout', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="recurring"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="cross"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft Scout');
  });

  test('always-on + Microsoft 365 recommends Cowork (M365-scoped)', async ({ page }) => {
    // Reach is primary: always-on personal Autopilot still maps to Cowork when
    // the work stays inside Microsoft 365 (schedules/triggers), not Scout.
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="alwayson"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
  });

  test('always-on + cross-environment recommends Scout', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="alwayson"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="cross"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft Scout');
  });

  test('one-shot + cross-environment recommends Scout', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="oneshot"]').click();
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
    await page.locator('.delegate-option[data-group="cadence"][data-value="oneshot"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="reach"][data-value="m365"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeEnabled();
  });

  test('switching from delegate to interactive swaps the follow-up questions', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="oneshot"]').click();
    await page.locator('.delegate-option[data-group="involvement"][data-value="interactive"]').click();
    // Delegate follow-up collapses; interactive follow-up opens and gates the button
    await expect(page.locator('#delegate-followup')).not.toHaveClass(/is-open/);
    await expect(page.locator('#interactive-followup')).toHaveClass(/is-open/);
    await expect(page.locator('#delegate-next-btn')).toBeDisabled();
    await page.locator('.delegate-option[data-group="taskType"][data-value="general"]').click();
    await expect(page.locator('#delegate-next-btn')).toBeEnabled();
    await page.locator('#delegate-next-btn').click();
    await expectM365Card(page, 'Copilot Chat');
  });

  test('entry-point result hides scored UI', async ({ page }) => {
    await openDelegate(page);
    await chooseDelegate(page);
    await page.locator('.delegate-option[data-group="cadence"][data-value="alwayson"]').click();
    await page.locator('.delegate-option[data-group="reach"][data-value="cross"]').click();
    await page.locator('#delegate-next-btn').click();

    await expect(page.locator('#rec-score-toggle')).toBeHidden();
    await expect(page.locator('#rec-score-comparison')).toBeHidden();
    await expect(page.locator('#rec-fasttrack-prompt')).toBeHidden();
    await expect(page.locator('#rec-nav')).toBeHidden();
  });

  test('legacy Copilot Chat share link resolves to the Microsoft 365 Copilot card', async ({ page }) => {
    await page.goto('/?dt=copilot_chat&r=copilot_chat&d=20260713&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expectM365Card(page, 'Copilot Chat');
  });

  test('start-surface share links feature the right surface', async ({ page }) => {
    await page.goto('/?dt=m365_copilot&st=chat&r=m365_copilot&d=20260713&mode=card');
    await expectM365Card(page, 'Copilot Chat');

    await page.goto('/?dt=m365_copilot&st=agents&r=m365_copilot&d=20260713&mode=card');
    await expectM365Card(page, 'Researcher');
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

  test('Cowork share link still resolves', async ({ page }) => {
    await page.goto('/?dt=cowork&r=cowork&d=20260713&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Copilot Cowork');
  });

  test('back from delegate returns to prescreen', async ({ page }) => {
    await openDelegate(page);
    await page.goBack();
    await expect(page.locator('#prescreen-section')).toBeVisible();
  });

  test('Microsoft 365 Copilot card without a start surface shows no spotlight', async ({ page }) => {
    await page.goto('/?dt=m365_copilot&r=m365_copilot&d=20260713&mode=card');
    await expectM365Card(page, null);
  });

  test('Explore surfaces adjacent build paths', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-explore').click();
    await expect(page.locator('#exploration-section')).toBeVisible();
    await expect(page.locator('#exploration-related-build-paths')).toHaveText('Related build paths');
    await expect(page.locator('#exploration-groups')).toContainText('SharePoint agents');
    await expect(page.locator('#exploration-groups')).toContainText('Microsoft 365 Agents Toolkit');
    await expect(page.locator('#exploration-groups')).toContainText('Custom engine agents');
  });
});
