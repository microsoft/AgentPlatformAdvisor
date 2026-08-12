// @ts-check
const { test, expect } = require('@playwright/test');

const QUESTION_ORDER = ['q1', 'q8', 'q2', 'q4', 'q3'];

async function answerToConstraints(page, answers = {
  q1: 'q1c',
  q8: 'q8a',
  q2: 'q2b',
  q4: 'q4f',
  q3: 'q3f',
}) {
  await page.goto('/');
  await page.locator('#start-btn').click();
  await page.locator('#prescreen-no').click();

  for (const qId of QUESTION_ORDER) {
    await page.locator(`#options-list .option-card[data-option-id="${answers[qId]}"]`).click();
    await page.locator('#next-btn').click();
  }

  await expect(page.locator('#constraints-section')).toBeVisible();
}

async function readDownloadText(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test.describe('Coverage gaps for v3 result extras and constraints', () => {
  test('constraints support keyboard multi-select, clear, and back navigation', async ({ page }) => {
    await answerToConstraints(page);

    const privateNet = page.locator('.option-card[data-constraint-id="c_private_net"]');
    await expect(privateNet).toHaveAttribute('role', 'checkbox');
    await expect(privateNet).toHaveAttribute('aria-checked', 'false');

    await privateNet.focus();
    await page.keyboard.press('Space');
    await expect(privateNet).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#constraints-continue-btn')).toContainText('See recommendation');

    const alm = page.locator('.option-card[data-constraint-id="c_alm"]');
    await alm.focus();
    await page.keyboard.press('Enter');
    await expect(alm).toHaveAttribute('aria-checked', 'true');

    await privateNet.focus();
    await page.keyboard.press('Space');
    await expect(privateNet).toHaveAttribute('aria-checked', 'false');

    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.locator('#assessment-section')).toBeVisible();
    await expect(page.locator('#question-counter')).toContainText('Question 5');

    await page.locator('#next-btn').click();
    await expect(page.locator('#constraints-section')).toBeVisible();
    await expect(page.locator('.option-card[data-constraint-id="c_alm"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.option-card[data-constraint-id="c_private_net"]')).toHaveAttribute('aria-checked', 'false');
  });

  test('constraint URL parsing ignores unknown ids while preserving valid ids', async ({ page }) => {
    await page.goto('/?q1=q1c&q8=q8a&q2=q2b&q4=q4f&q3=q3f&c=c_private_net,unknown,c_alm&r=foundry&d=20260810&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();

    const shareUrl = await page.evaluate(() => buildShareableURL());
    expect(shareUrl).toContain('c_private_net');
    expect(shareUrl).toContain('c_alm');
    expect(shareUrl).not.toContain('unknown');
  });

  test('constraint boosts are capped at the configured maximum', async ({ page }) => {
    await page.goto('/');
    const scores = await page.evaluate(() => {
      const answers = { q1: 'q1c', q8: 'q8a', q2: 'q2b', q4: 'q4f', q3: 'q3f' };
      const base = rankPlatforms(answers, []).find(r => r.id === 'foundry').score;
      const boosted = rankPlatforms(answers, ['c_private_net', 'c_airgap', 'c_alm', 'c_regulated'])
        .find(r => r.id === 'foundry').score;
      return { base, boosted };
    });

    expect(scores.boosted - scores.base).toBe(2);
  });

  test('legacy delegate cadence aliases still route through the current reach-first rules', async ({ page }) => {
    await page.goto('/');
    const routes = await page.evaluate(() => ({
      oldOnDemand: resolveDelegateResult('delegate', null, 'ondemand', 'm365'),
      oldContinuousM365: resolveDelegateResult('delegate', null, 'continuous', 'm365'),
      oldContinuousCross: resolveDelegateResult('delegate', null, 'continuous', 'cross'),
    }));

    expect(routes).toEqual({
      oldOnDemand: 'cowork',
      oldContinuousM365: 'cowork',
      oldContinuousCross: 'scout',
    });
  });

  // "Microsoft 356" shipped once in the delegate reach option. Guard the product
  // name across every string the app can render, not just the one that broke.
  test('no user-visible copy misspells the Microsoft 365 product name', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#start-btn')).toBeVisible();

    const misspellings = await page.evaluate(() => {
      const bad = /Microsoft\s+3(?!65\b)\d\d/g;
      const hits = [];

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const found = node.textContent.match(bad);
        if (found) hits.push(...found);
      }

      const found = JSON.stringify(window.apa || {}).match(bad);
      if (found) hits.push(...found);

      return [...new Set(hits)];
    });

    expect(misspellings).toEqual([]);
  });

  test('downloaded markdown includes constraints and the canonical share link', async ({ page }) => {
    await page.goto('/?q1=q1c&q8=q8a&q2=q2b&q4=q4f&q3=q3f&c=c_private_net&r=foundry&d=20260810&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-md-btn').click();
    const text = await readDownloadText(await downloadPromise);

    expect(text).toContain('# Agent Platform Advisor');
    expect(text).toContain('### Enterprise constraints selected');
    expect(text).toMatch(/### Enterprise constraints selected\s+- Private networking, VNet isolation, or private endpoints required/);
    expect(text).toContain('### Share link (canonical)');
    expect(text).toContain('c=c_private_net');
    await expect(page.locator('#export-md-btn')).toContainText('Downloaded');
  });

  test('negative feedback issue link carries answers, constraints, and share URL', async ({ page }) => {
    await page.goto('/?q1=q1c&q8=q8a&q2=q2b&q4=q4f&q3=q3f&c=c_private_net&r=foundry&d=20260810&mode=card');
    await expect(page.locator('#rec-feedback')).toBeVisible();

    await page.locator('.btn-feedback', { hasText: 'No' }).click();

    const href = await page.locator('#feedback-thanks a').getAttribute('href');
    const decoded = decodeURIComponent(href || '');
    expect(decoded).toContain('- Recommended: foundry');
    expect(decoded).toContain('- q1: q1c');
    expect(decoded).toContain('- Constraints: c_private_net');
    expect(decoded).toContain('Share URL:');
    expect(decoded).toContain('c=c_private_net');
  });

  test('feedback ignores duplicate submissions after the confirmation appears', async ({ page }) => {
    await page.goto('/?ft=1');
    await expect(page.locator('#rec-feedback')).toBeVisible();

    await page.locator('.btn-feedback', { hasText: 'Yes' }).click();
    await page.evaluate(() => submitFeedback(false));

    await expect(page.locator('#feedback-thanks')).toContainText('glad it helped');
    await expect(page.locator('#feedback-thanks a')).toHaveCount(0);
  });
});

test.describe('Markdown export strips markup completely', () => {
  // The export previously used a single s.replace(/<[^>]+>/g, '') pass, which
  // CodeQL flagged as incomplete multi-character sanitization (js/incomplete-
  // multi-character-sanitization, high). Two distinct bypasses exist, and the
  // obvious "loop until stable" fix only closes the first:
  //   nested   — "<scr<b>ipt>" exposes a new tag once the inner one is removed
  //   unterminated — "<b><script" has no closing ">", so the pattern never
  //                  matches it and it survives any number of passes
  const CASES = [
    ['<strong>Copilot Studio</strong>', 'Copilot Studio'],
    ['plain text', 'plain text'],
    ['<scr<b>ipt>', 'ipt'],
    ['<<script>script>alert(1)', 'scriptalert(1)'],
    ['<b><script', 'script'],
    ['<script', 'script'],
    ['<img src=x onerror=alert(1)', 'img src=x onerror=alert(1)'],
  ];

  test('no input can leave an angle bracket behind', async ({ page }) => {
    await page.goto('/');
    for (const [input, expected] of CASES) {
      const out = await page.evaluate(s => stripHtmlTags(s), input);
      expect(out, `stripHtmlTags(${JSON.stringify(input)})`).toBe(expected);
      expect(out, `${JSON.stringify(input)} must not leave < or >`).not.toMatch(/[<>]/);
    }
  });

  test('exported markdown carries no markup', async ({ page }) => {
    await page.goto('/?q1=q1c&q8=q8a&q2=q2d&q4=q4b&q3=q3b&r=copilot_studio&mode=card');
    await expect(page.locator('#recommendation-section')).toBeVisible();

    // apa.yaml persona rationales embed anchor tags; the export must be plain text.
    const md = await page.evaluate(() => {
      let captured = '';
      const realCreate = URL.createObjectURL;
      URL.createObjectURL = blob => { captured = blob; return 'blob:stub'; };
      try { downloadRecommendationMarkdown(); } finally { URL.createObjectURL = realCreate; }
      return captured ? captured.text() : '';
    });

    expect(md.length, 'export produced no content').toBeGreaterThan(0);
    expect(md, 'markdown export must not contain HTML tags').not.toMatch(/<[a-zA-Z/]/);
  });
});
