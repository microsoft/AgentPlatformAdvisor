// @ts-check
const { test, expect } = require('@playwright/test');

// Share links are public and hand-editable, so the URL is an untrusted input to
// the scoring engine. These guard the two ways a crafted link could produce a
// confidently wrong recommendation.

test.describe('Share links cannot smuggle answers across questions', () => {
  // Hard rules key off the option id alone (getZeroedPlatforms iterates
  // Object.values(answers) with no question context), so validating option ids
  // against one global set let ?q1=q3f apply q3f's disqualification while
  // scoring zero for q1 — flipping Agent Builder/Strong into Copilot Studio/Good.
  test('an option id from another question is rejected, not applied', async ({ page }) => {
    const legit = 'q1=q1a&q8=q8a&q2=q2a&q4=q4a&q3=q3a&r=agent_builder&d=20260810&mode=card';
    await page.goto(`/?${legit}`);
    await expect(page.locator('#recommendation-section')).toBeVisible();
    const expected = await page.locator('#rec-primary-card .rec-platform-name').textContent();

    // q3f is a real option id, but it belongs to q3 — not q1.
    const smuggled = legit.replace('q1=q1a', 'q1=q3f');
    await page.goto(`/?${smuggled}`);
    await expect(page.locator('#recommendation-section')).toBeVisible();

    const stored = await page.evaluate(() => JSON.parse(JSON.stringify(answers)));
    expect(stored.q1, 'a cross-question option id must not be stored').toBeUndefined();

    const zeroed = await page.evaluate(() => getZeroedPlatforms(answers));
    expect(
      zeroed.agent_builder,
      "q3f's hard rule must not fire from the q1 slot"
    ).toBeUndefined();

    await expect(page.locator('#rec-primary-card .rec-platform-name')).toHaveText(expected.trim());
    // The dropped answer is schema drift, and the user is told.
    await expect(page.locator('#decision-card-drift')).toBeVisible();
  });

  test('a valid answer still scores normally', async ({ page }) => {
    await page.goto('/?q1=q1a&q8=q8a&q2=q2a&q4=q4a&q3=q3a&r=agent_builder&d=20260810&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(JSON.stringify(answers)));
    expect(stored).toEqual({ q1: 'q1a', q8: 'q8a', q2: 'q2a', q4: 'q4a', q3: 'q3a' });
  });
});

test.describe('Legacy fast-track never leaks into the scored wizard', () => {
  // fastTrack suppresses the rule that always zeroes m365_copilot in the scored
  // wizard, so ft=1 must resolve to the card even when mode=wizard is present.
  test('ft=1&mode=wizard still resolves to the M365 Copilot card', async ({ page }) => {
    await page.goto('/?ft=1&mode=wizard');
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#assessment-section')).toBeHidden();
    await expect(page.locator('#rec-primary-card .rec-platform-name'))
      .toHaveText('Microsoft 365 Copilot');
  });

  test('m365_copilot is zeroed once a scored wizard run begins', async ({ page }) => {
    await page.goto('/?ft=1&mode=wizard');
    await expect(page.locator('#recommendation-section')).toBeVisible();

    // Start Over clears fast-track state before any scored question is answered.
    await page.getByRole('button', { name: /Start Over/i }).click();
    await expect(page.locator('#welcome-section')).toBeVisible();
    const zeroed = await page.evaluate(() =>
      getZeroedPlatforms({ q1: 'q1a', q8: 'q8a', q2: 'q2a', q4: 'q4a', q3: 'q3a' })
    );
    expect(zeroed.m365_copilot, 'M365 Copilot never competes in the scored wizard').toBe(true);
  });
});
