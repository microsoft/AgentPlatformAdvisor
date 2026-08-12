// @ts-check
const { test, expect } = require('@playwright/test');

const QUESTION_ORDER = ['q1', 'q8', 'q2', 'q4', 'q3'];

/** Click option by data-value / option id rendered as data-option-id if present, else by index. */
async function answerWizard(page, answers) {
  await page.goto('/');
  await expect(page.locator('#welcome-section')).toBeVisible();
  await page.locator('#start-btn').click();
  await expect(page.locator('#prescreen-section')).toBeVisible();
  await page.locator('#prescreen-no').click();
  await expect(page.locator('#assessment-section')).toBeVisible();

  for (const qId of QUESTION_ORDER) {
    const optionId = answers[qId];
    const options = page.locator('#options-list .option-card');
    // Options use data-option-id when rendered from apa.js
    const byId = page.locator(`#options-list .option-card[data-option-id="${optionId}"]`);
    if (await byId.count()) {
      await byId.click();
    } else {
      // Fallback: match text containing option id is not available — use index from YAML order
      // Prefer clicking via evaluating window if needed
      await page.evaluate((id) => {
        const cards = [...document.querySelectorAll('#options-list .option-card')];
        const match = cards.find(c => c.dataset.optionId === id || c.getAttribute('data-option-id') === id);
        if (match) match.click();
        else throw new Error('Option not found: ' + id);
      }, optionId);
    }
    await page.locator('#next-btn').click();
  }
  // Optional constraints step before results
  await expect(page.locator('#constraints-section')).toBeVisible();
  await page.locator('#constraints-continue-btn').click();
  await expect(page.locator('#recommendation-section')).toBeVisible();
}

async function answerEntryPoint(page, { involvement, taskType, cadence, reach }) {
  await page.goto('/');
  await expect(page.locator('#welcome-section')).toBeVisible();
  await page.locator('#start-btn').click();
  await page.locator('#prescreen-delegate').click();
  await expect(page.locator('#delegate-section')).toBeVisible();

  await page.locator(`.delegate-option[data-group="involvement"][data-value="${involvement}"]`).click();
  if (involvement === 'interactive') {
    await page.locator(`.delegate-option[data-group="taskType"][data-value="${taskType}"]`).click();
  } else {
    await page.locator(`.delegate-option[data-group="cadence"][data-value="${cadence}"]`).click();
    await page.locator(`.delegate-option[data-group="reach"][data-value="${reach}"]`).click();
  }
  await page.locator('#delegate-next-btn').click();
  await expect(page.locator('#recommendation-section')).toBeVisible();
}

/** Scored cards put the fit badge inside .rec-platform-name — match headline prefix. */
function expectPrimaryName(page, nameOrPattern) {
  const loc = page.locator('#rec-primary-card .rec-platform-name');
  if (nameOrPattern instanceof RegExp) {
    return expect(loc).toHaveText(nameOrPattern);
  }
  return expect(loc).toHaveText(new RegExp(`^${nameOrPattern}`));
}

test.describe('Golden paths — scored', () => {
  test('G01/G02 Agent Builder + SharePoint callout', async ({ page }) => {
    await answerWizard(page, {
      q1: 'q1a', q8: 'q8a', q2: 'q2a', q4: 'q4a', q3: 'q3a',
    });
    await expectPrimaryName(page, 'Agent Builder');
    await expect(page.locator('#rec-primary-card [data-callout-id="sharepoint_site_tip"]')).toBeVisible();
  });

  test('G03 Copilot Studio for maker + Dataverse + actions', async ({ page }) => {
    await answerWizard(page, {
      q1: 'q1b', q8: 'q8c', q2: 'q2d', q4: 'q4c', q3: 'q3c',
    });
    await expectPrimaryName(page, 'Copilot Studio');
  });

  test('G04 Toolkit callout for pro-dev + M365 chat + actions', async ({ page }) => {
    await answerWizard(page, {
      q1: 'q1c', q8: 'q8a', q2: 'q2a', q4: 'q4c', q3: 'q3b',
    });
    await expectPrimaryName(page, /^(Copilot Studio|Microsoft Foundry)/);
    await expect(page.locator('#rec-primary-card [data-callout-id="toolkit_m365_extensibility"]')).toBeVisible();
  });

  test('G05 Foundry for custom app + custom RAG', async ({ page }) => {
    await answerWizard(page, {
      q1: 'q1c', q8: 'q8a', q2: 'q2b', q4: 'q4f', q3: 'q3f',
    });
    await expectPrimaryName(page, 'Microsoft Foundry');
  });

  test('G11 Copilot Studio for background actions (computer-use style)', async ({ page }) => {
    await answerWizard(page, {
      q1: 'q1b', q8: 'q8c', q2: 'q2c', q4: 'q4c', q3: 'q3c',
    });
    await expectPrimaryName(page, 'Copilot Studio');
    await expect(page.locator('#rec-primary-card .rec-platform-name')).not.toContainText('Microsoft Scout');
  });

  test('G12 External website zeros Agent Builder', async ({ page }) => {
    await answerWizard(page, {
      q1: 'q1c', q8: 'q8b', q2: 'q2b', q4: 'q4b', q3: 'q3e',
    });
    await expectPrimaryName(page, /^(Copilot Studio|Microsoft Foundry)/);
    await expect(page.locator('#rec-primary-card .rec-platform-name')).not.toContainText('Agent Builder');
  });
});

test.describe('Golden paths — entry point', () => {
  test('G06 interactive general → M365 Copilot Chat start', async ({ page }) => {
    await answerEntryPoint(page, { involvement: 'interactive', taskType: 'general' });
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText('Microsoft 365 Copilot');
    await expect(page.locator('#rec-primary-card')).toContainText(/Copilot Chat|Start here/i);
  });

  test('G07 interactive specialized → M365 agents start', async ({ page }) => {
    await answerEntryPoint(page, { involvement: 'interactive', taskType: 'specialized' });
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText('Microsoft 365 Copilot');
    await expect(page.locator('#rec-primary-card')).toContainText(/Researcher|built-in agents|Start here/i);
  });

  test('G08 one-shot M365 → Cowork', async ({ page }) => {
    await answerEntryPoint(page, {
      involvement: 'delegate', cadence: 'oneshot', reach: 'm365',
    });
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText('Copilot Cowork');
  });

  test('G09 recurring M365 → Cowork', async ({ page }) => {
    await answerEntryPoint(page, {
      involvement: 'delegate', cadence: 'recurring', reach: 'm365',
    });
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText('Copilot Cowork');
  });

  test('G10 always-on cross → Scout + access note', async ({ page }) => {
    await answerEntryPoint(page, {
      involvement: 'delegate', cadence: 'alwayson', reach: 'cross',
    });
    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText('Microsoft Scout');
    await expect(page.locator('#rec-cross-notes')).toBeVisible();
    await expect(page.locator('#rec-cross-notes')).toContainText(/Frontier/i);
  });

  test('Explore surfaces SharePoint agents adjacent path', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-explore').click();
    await expect(page.locator('#exploration-section')).toBeVisible();
    await expect(page.locator('#exploration-groups')).toContainText('SharePoint agents');
    await expect(page.locator('#exploration-groups')).toContainText('Agents Toolkit');
  });

  test('Entry-point tips mention Chat then Cowork', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-delegate').click();
    // Chat is a surface of Microsoft 365 Copilot, not a sibling destination, so the
    // tip must name the parent product — an unqualified "Copilot Chat" here reads as
    // a fourth entry point (and collides with the separate M365 Copilot Chat SKU).
    await expect(page.locator('#involvement-tip')).toContainText(/Microsoft 365 Copilot chat/i);
    await expect(page.locator('#involvement-tip')).toContainText(/Cowork/i);
    // The handoff goes to Cowork unfinished; "finished" describes what comes back.
    await expect(page.locator('#involvement-tip')).toContainText(/hand off the whole multi-step job/i);
  });
});
