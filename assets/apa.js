// === STATE ===
let apa = null; // populated from YAML
let answers = {}; // { q1: 'q1a', q2: 'q2b', ... }
let fastTrack = false;
let delegateResult = null; // 'm365_copilot' | 'cowork' | 'scout' | 'both' — set on the entry-point path
let delegateStart = null;  // 'chat' | 'agents' — which surface inside Microsoft 365 Copilot to start with
let delegateAnswers = {}; // { involvement: 'interactive'|'delegate', taskType: 'general'|'specialized', cadence: 'oneshot'|'recurring'|'alwayson'|'unsure', reach: 'm365'|'cross'|'unsure' }
let currentQuestionIndex = 0;
let listenersReady = false;
let recommendedPlatformId = null;
let isURLLoaded = false; // true when loaded from shared URL params
let originalPlatformId = null; // from &r= URL param for temporal comparison
let originalDate = null; // from &d= URL param
let feedbackSubmitted = false;
let runtimeTieBreakerActive = false;

// === UTILITIES ===
function showSection(id) {
  ['loading-section','error-section','welcome-section','prescreen-section',
   'delegate-section','exploration-section','assessment-section',
   'recommendation-section'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle('hidden', s !== id);
  });
  updateProgressBar(id);
}

// === HISTORY NAVIGATION ===
function pushState(section, questionIndex, runtimeTieBreaker = false) {
  const state = { section, questionIndex: questionIndex ?? null, runtimeTieBreaker };
  history.pushState(state, '', '');
}

window.addEventListener('popstate', (e) => {
  const state = e.state;
  if (!state) {
    showSection('welcome-section');
    return;
  }
  if (state.section === 'assessment-section' && state.questionIndex != null) {
    if (state.runtimeTieBreaker) {
      renderRuntimeTieBreaker();
    } else {
      currentQuestionIndex = state.questionIndex;
      renderQuestion();
    }
  } else if (state.section === 'recommendation-section') {
    renderRecommendation();
  } else if (state.section === 'exploration-section') {
    renderExploration();
  }
  showSection(state.section);
});

function updateProgressBar(sectionId) {
  const steps = ['Welcome', 'Assessment', 'Recommendation'];
  const activeIndex = {
    'loading-section': 0,
    'error-section': 0,
    'welcome-section': 0,
    'prescreen-section': 0,
    'delegate-section': 1,
    'assessment-section': 1,
    'recommendation-section': 2,
  }[sectionId] ?? 0;

  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  bar.className = 'progress-bar';
  bar.innerHTML = steps.map((label, i) => {
    const cls = i < activeIndex ? 'complete' : i === activeIndex ? 'active' : '';
    const connector = i < steps.length - 1
      ? `<div class="progress-connector"></div>` : '';
    return `
      <div class="progress-step ${cls}">
        <div class="progress-dot"></div>
        <span>${label}</span>
      </div>${connector}`;
  }).join('');
}

// === SCORING ENGINE ===

// Returns positive-score contributions for a platform, sorted descending
function getContributions(platformId, answersMap) {
  const contributions = [];
  apa.questions.forEach(q => {
    const optionId = answersMap[q.id];
    if (!optionId) return;
    const option = q.options.find(o => o.id === optionId);
    if (!option) return;
    const score = option.scores[platformId] ?? 0;
    if (score > 0) {
      contributions.push({ questionLabel: q.label, optionLabel: option.label, score });
    }
  });
  contributions.sort((a, b) => b.score - a.score);
  return contributions;
}

// Returns { platformId: true } for each platform that must be zeroed
function getZeroedPlatforms(answersMap) {
  const zeroed = {};
  const hardRules = apa.scoring.hard_rules || {};
  Object.values(answersMap).forEach(optionId => {
    if (hardRules[optionId]) {
      hardRules[optionId].zero.forEach(p => { zeroed[p] = true; });
    }
  });
  // Prescreen "No — I need a custom agent" excludes M365 Copilot from the full assessment.
  // M365 Copilot is only appropriate when the user explicitly wants a built-in experience.
  if (!fastTrack) zeroed['m365_copilot'] = true;
  return zeroed;
}

// Returns { platformId: number } raw totals before tiebreaker
function sumRawScores(answersMap, questions, zeroed) {
  const platformIds = apa.meta.platforms.map(p => p.id);
  const totals = Object.fromEntries(platformIds.map(id => [id, 0]));

  questions.forEach(q => {
    const selectedOptionId = answersMap[q.id];
    if (!selectedOptionId) return;
    const option = q.options.find(o => o.id === selectedOptionId);
    if (!option) return;
    platformIds.forEach(pid => {
      const base = option.scores[pid] ?? 0;
      totals[pid] += zeroed[pid] ? 0 : base;
    });
  });

  return totals;
}

function getThresholdLabel(score, thresholds) {
  const rounded = Math.round(score);
  const t = thresholds.find(t => rounded >= t.min && rounded <= t.max);
  return t ? t.label : 'Not recommended';
}

// Returns platforms sorted by final score descending: [{id, score, label}, ...]
function rankPlatforms(answersMap) {
  const zeroed = getZeroedPlatforms(answersMap);
  const questions = apa.questions.filter(q => answersMap[q.id]); // only answered
  const final = sumRawScores(answersMap, questions, zeroed);

  const tiebreakers = apa.scoring.tie_handling.tiebreakers || [];

  const ranked = apa.meta.platforms
    .map(p => ({
      id: p.id,
      score: Math.round(final[p.id]),
      label: getThresholdLabel(final[p.id], apa.scoring.recommendation_thresholds),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // On a tie, check if a persona-based tiebreaker applies
      const rule = tiebreakers.find(t =>
        t.platforms.includes(a.id) && t.platforms.includes(b.id) &&
        Object.entries(t.when).every(([qId, optId]) => answersMap[qId] === optId)
      );
      if (rule) {
        if (a.id === rule.prefer) return -1;
        if (b.id === rule.prefer) return 1;
      }
      return 0;
    });

  // Persona preferences: soft overrides that force ranking regardless of score
  const prefs = apa.scoring.persona_preferences || [];
  prefs.forEach(pref => {
    const match = Object.entries(pref.when).every(
      ([qId, optId]) => answersMap[qId] === optId
    );
    if (!match) return;
    const preferIdx = ranked.findIndex(r => r.id === pref.prefer);
    const overIdx = ranked.findIndex(r => r.id === pref.over);
    if (preferIdx > overIdx && preferIdx >= 0 && overIdx >= 0) {
      // Move the preferred platform just above the "over" platform
      const [preferred] = ranked.splice(preferIdx, 1);
      ranked.splice(overIdx, 0, preferred);
    }
  });

  return ranked;
}

// Reduces a display string carrying inline markup (e.g. <strong>) to plain text
// for the markdown export.
//
// A single s.replace(/<[^>]+>/g, '') pass is not enough, and looping is not
// enough either. Stripping a complete tag can expose a new one
// ("<scr<b>ipt>"), so removal has to run until the string stops changing. An
// UNTERMINATED tag has no closing ">" at all, so the pattern never matches it
// and "<b><script" survives any number of passes — hence the final sweep of
// orphan angle brackets. The guarantee callers rely on is that the result
// cannot contain "<" or ">".
function stripHtmlTags(value) {
  let out = String(value);
  let prev;
  do {
    prev = out;
    out = out.replace(/<[^>]*>/g, '');
  } while (out !== prev);
  return out.replace(/[<>]/g, '');
}

// Returns up to 3 bullet strings summarising key scoring factors (or disqualifying rules) for the given platform
function getKeyFactors(platformId, answersMap) {
  const factors = [];

  // 0. Persona preference override rationale (if this platform was boosted)
  const prefs = apa.scoring.persona_preferences || [];
  prefs.forEach(pref => {
    if (pref.prefer !== platformId) return;
    const match = Object.entries(pref.when).every(
      ([qId, optId]) => answersMap[qId] === optId
    );
    if (match) factors.push(`💡 ${pref.rationale.trim()}`);
  });

  // 1. All hard rules that zeroed this platform
  getHardRuleLabels(platformId, answersMap).forEach(label => {
    factors.push(`⚠️ ${label}`);
  });

  // 2. Top-scoring questions for this platform
  getContributions(platformId, answersMap)
    .slice(0, 3 - factors.length)
    .forEach(c => {
      factors.push(`<em>${c.questionLabel}</em> ${c.optionLabel}`);
    });

  return factors.slice(0, 3);
}

// Match answer maps against a when-clause. Values may be a string or array of option ids.
function answersMatchWhen(answersMap, when) {
  if (!when) return true;
  return Object.entries(when).every(([qid, expected]) => {
    const actual = answersMap[qid];
    if (Array.isArray(expected)) return expected.includes(actual);
    return actual === expected;
  });
}

// Returns contextual notes for contradictory answer combinations and winner mismatches
function getCrossQuestionNotes(answersMap, winnerId) {
  const notes = [];
  const crossNotes = apa.scoring.cross_question_notes || [];
  crossNotes.forEach(rule => {
    if (answersMatchWhen(answersMap, rule.when)) notes.push(rule.note.trim());
  });

  const personaNotes = apa.scoring.winner_persona_notes || [];
  personaNotes.forEach(rule => {
    if (rule.winner && rule.winner !== winnerId) return;
    if (Array.isArray(rule.winner_in) && !rule.winner_in.includes(winnerId)) return;
    if (rule.persona && answersMap.q1 !== rule.persona) return;
    if (rule.when && !answersMatchWhen(answersMap, rule.when)) return;
    notes.push(rule.note.trim());
  });

  return notes;
}

// Unscored adjacent-path callouts (SharePoint agents, Agents Toolkit, etc.)
// driven by winner + answer pattern. Not scored winners — guidance only.
function getResultCallouts(answersMap, winnerId) {
  const callouts = apa.result_callouts || [];
  return callouts.filter(c => {
    if (c.winner && c.winner !== winnerId) return false;
    if (Array.isArray(c.winner_in) && !c.winner_in.includes(winnerId)) return false;
    if (c.when && !answersMatchWhen(answersMap, c.when)) return false;
    return true;
  });
}

function renderResultCallouts(answersMap, winnerId) {
  const callouts = getResultCallouts(answersMap, winnerId);
  if (!callouts.length) return '';
  return callouts.map(c => {
    const title = c.url
      ? `<a href="${c.url}" target="_blank" rel="noopener noreferrer">${c.label}</a>`
      : c.label;
    return `<div class="rec-callout" data-callout-id="${c.id || ''}"><strong>${title}</strong> — ${c.summary}</div>`;
  }).join('');
}

function renderCrossNotes(answersMap, winnerId) {
  const container = document.getElementById('rec-cross-notes');
  if (!container) return;
  const notes = getCrossQuestionNotes(answersMap, winnerId);
  if (notes.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  container.innerHTML = notes.map(n =>
    `<div class="cross-note">⚠️ ${n}</div>`
  ).join('');
  container.classList.remove('hidden');
}

const PLATFORM_ICONS = {
  agent_builder:  'images/copilot.png',
  m365_copilot:   'images/m365-copilot-logo.png',
  copilot_studio: 'images/copilot-studio.png',
  foundry:        'images/foundry.svg',
  cowork:         'images/cowork.png',
  scout:          'images/scout.svg',
};

// Destinations reached through the entry-point wizard rather than the scored wizard.
const ENTRY_POINT_PLATFORMS = ['m365_copilot', 'cowork', 'scout'];

function badgeClass(label) {
  if (label.startsWith('Strong'))   return 'badge-strong';
  if (label.startsWith('Good'))     return 'badge-good';
  if (label.startsWith('Partial'))  return 'badge-possible';
  return 'badge-not';
}

function normalizeRuntimeOptionId(optionId) {
  const runtime = apa.runtime_tiebreaker;
  if (!runtime || !optionId) return null;
  if ((runtime.legacy_managed_option_ids || []).includes(optionId)) return 'q9a';
  return runtime.options.some(option => option.id === optionId) ? optionId : null;
}

function shouldAskRuntimeTieBreaker(answersMap) {
  const runtime = apa.runtime_tiebreaker;
  if (!runtime) return false;

  const baseAnswers = { ...answersMap };
  delete baseAnswers[runtime.id];
  const zeroed = getZeroedPlatforms(baseAnswers);
  const ranked = rankPlatforms(baseAnswers);
  const [firstId, secondId] = runtime.compare;
  const first = ranked.find(platform => platform.id === firstId);
  const second = ranked.find(platform => platform.id === secondId);
  const topTwoIds = new Set(ranked.slice(0, 2).map(platform => platform.id));

  return !!(
    first && second &&
    topTwoIds.has(firstId) && topTwoIds.has(secondId) &&
    !zeroed[firstId] && !zeroed[secondId] &&
    first.score > 0 && second.score > 0 &&
    Math.abs(first.score - second.score) <= runtime.threshold_points
  );
}

function resolveCopilotStudioHarness(answersMap) {
  if (answersMap.q9 === 'q9d') return null;
  if (answersMap.q4 === 'q4d' || answersMap.q4 === 'q4e') return 'github_copilot';
  if (answersMap.q2 === 'q2c' || answersMap.q4 === 'q4c') return 'workflow';
  if (answersMap.q2 === 'q2a' && answersMap.q4 === 'q4a') return 'copilot_chat';
  return 'standard';
}

function buildPlatformCard(platformId, ranked, answersMap, isPrimary, showBadge, startKey) {
  const rec = apa.recommendations[platformId];
  if (!rec) return `<div class="rec-card"><p>Platform data unavailable.</p></div>`;
  const rankEntry = ranked.find(r => r.id === platformId);
  // Entry-point destinations are single-card results with nothing to compare against,
  // so their accordions start expanded — the card is the whole page. Scored platform
  // cards stay collapsed to keep the comparison scannable.
  const detailsOpen = ENTRY_POINT_PLATFORMS.includes(platformId) ? ' open' : '';
  // showBadge is true only for scored primary cards; key factors are only meaningful in that same context
  const factors = isPrimary && showBadge ? getKeyFactors(platformId, answersMap) : [];
  const icon = PLATFORM_ICONS[platformId] || '';

  const badgeHtml = showBadge && rankEntry
    ? `<span class="rec-badge ${badgeClass(rankEntry.label)}">${rankEntry.label}</span>`
    : '';

  const factorsHtml = factors.length > 0 ? `
    <div class="rec-section-title rec-section-title--spaced">Why this was recommended</div>
    <ul class="rec-list">${factors.map(f => `<li>${f}</li>`).join('')}</ul>` : '';

  const resourcesHtml = rec.resources_url
    ? `<a class="rec-resources-link" href="${rec.resources_url}" target="_blank" rel="noopener noreferrer">
        Explore ${rec.headline} resources →</a>`
    : '';

  const adjacentHtml = (rec.adjacent_paths || []).length > 0
    ? rec.adjacent_paths.map(p => {
        const title = p.url
          ? `<a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.label}</a>`
          : p.label;
        return `<div class="rec-adjacent-note"><strong>${title}</strong> — ${p.summary}</div>`;
      }).join('')
    : '';

  // Conditional callouts only on the primary scored card (need answers + winner).
  const calloutHtml = isPrimary && showBadge
    ? renderResultCallouts(answersMap, platformId)
    : '';

  const bestFor = (rec.best_for || []).map(f => `<li>${f}</li>`).join('');
  const watchOut = (rec.watch_out_for || []).map(f => `<li>${f}</li>`).join('');
  // A start_here entry (chosen by the entry-point wizard) takes precedence over a
  // static spotlight: it tells the user which surface of this platform to open first.
  const startHere = startKey && rec.start_here ? rec.start_here[startKey] : null;
  const spotlight = startHere || rec.spotlight;
  const spotlightEyebrow = startHere ? 'Start Here' : 'Featured Capability';
  const spotlightHtml = spotlight ? (() => {
    const nameHtml = spotlight.url
      ? `<a href="${spotlight.url}" target="_blank" rel="noopener noreferrer">${spotlight.label}</a>`
      : spotlight.label;
    return `
    <div class="rec-spotlight">
      <div class="rec-spotlight-eyebrow">${spotlightEyebrow}</div>
      <div class="rec-spotlight-name">${nameHtml}</div>
      <div class="rec-spotlight-tagline">${spotlight.tagline}</div>
      <p class="rec-spotlight-description">${spotlight.description}</p>
    </div>`;
  })() : '';

  const harnessKey = isPrimary && platformId === 'copilot_studio'
    ? resolveCopilotStudioHarness(answersMap)
    : null;
  const harness = harnessKey && rec.harnesses ? rec.harnesses[harnessKey] : null;
  const harnessHtml = harness ? `
    <div class="rec-spotlight rec-harness-guidance" data-harness="${harnessKey}">
      <div class="rec-spotlight-eyebrow">Start with this harness</div>
      <div class="rec-spotlight-name">
        <a href="${harness.url}" target="_blank" rel="noopener noreferrer">${harness.label}</a>
      </div>
      <div class="rec-spotlight-tagline">${harness.tagline}</div>
      <p class="rec-spotlight-description">${harness.description}</p>
      ${(harness.considerations || []).length > 0
        ? `<ul class="rec-list rec-harness-considerations">${harness.considerations.map(item => `<li>${item}</li>`).join('')}</ul>`
        : ''}
    </div>` : '';

  const firstPartyHtml = (rec.first_party_agents || []).length > 0 ? `
    <details class="rec-accordion"${detailsOpen}>
      <summary class="rec-accordion-trigger">
        <span class="rec-section-title">${rec.first_party_label || 'Available First-Party Copilot Agents'}</span>
        <span class="rec-accordion-count">${rec.first_party_agents.length}</span>
        <svg class="rec-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      <ul class="rec-list">${rec.first_party_agents.map(a => {
      const label = a.url
        ? `<a href="${a.url}" target="_blank" rel="noopener noreferrer">${a.label}</a>`
        : a.label;
      return `<li><strong>${label}</strong> — ${a.description}</li>`;
    }).join('')}</ul>
    </details>` : '';

  const templatesHtml = (rec.templates || []).length > 0 ? `
    <details class="rec-accordion"${detailsOpen}>
      <summary class="rec-accordion-trigger">
        <span class="rec-section-title">Available Templates</span>
        <span class="rec-accordion-count">${rec.templates.length}</span>
        <svg class="rec-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      <ul class="rec-list">${rec.templates.map(t => {
      const label = t.url
        ? `<a href="${t.url}" target="_blank" rel="noopener noreferrer">${t.label}</a>`
        : t.label;
      return `<li><strong>${label}</strong> — ${t.description}</li>`;
    }).join('')}</ul>
    </details>` : '';

  const descriptionHtml = rec.description
    ? `<p class="rec-description">${rec.description}</p>`
    : '';

  return `
    <div class="rec-card ${isPrimary ? 'primary' : 'secondary'}">
      <div class="rec-header">
        <img class="rec-platform-icon" src="${icon}" alt="${rec.headline}">
        <div>
          <div class="rec-platform-name">${rec.headline}${badgeHtml}</div>
        </div>
      </div>
      ${descriptionHtml}
      <p class="rec-summary">${rec.summary}</p>
      ${spotlightHtml}
      ${harnessHtml}
      ${rec.persona_tips && rec.persona_tips[answersMap.q1]
        ? `<div class="rec-dev-note">${rec.persona_tips[answersMap.q1]}</div>`
        : ''}
      ${calloutHtml}
      ${factorsHtml}
      ${adjacentHtml}
      ${resourcesHtml}
      ${bestFor ? `<details class="rec-accordion"${detailsOpen}>
        <summary class="rec-accordion-trigger">
          <span class="rec-section-title">Best For</span>
          <span class="rec-accordion-count">${(rec.best_for || []).length}</span>
          <svg class="rec-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </summary>
        <ul class="rec-list">${bestFor}</ul>
      </details>` : ''}
      ${watchOut ? `<details class="rec-accordion"${detailsOpen}>
        <summary class="rec-accordion-trigger">
          <span class="rec-section-title">Important Considerations</span>
          <span class="rec-accordion-count">${(rec.watch_out_for || []).length}</span>
          <svg class="rec-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </summary>
        <ul class="rec-list">${watchOut}</ul>
      </details>` : ''}
      ${firstPartyHtml}
      ${templatesHtml}
      ${isPrimary ? `<div class="rec-card-share">
        <button id="decision-card-share" class="btn-decision btn-decision-primary" aria-label="Copy shareable link to clipboard" onclick="copyShareLink()">
          📋 Share your results
        </button>
      </div>` : ''}
    </div>`;
}

const DEFAULT_TITLE = 'Agent Platform Advisor';

// === SESSION STORAGE ===
function saveAnswersToStorage() {
  try { sessionStorage.setItem('apa-answers', JSON.stringify(answers)); } catch (e) { /* private browsing */ }
}

function clearAnswersFromStorage() {
  try { sessionStorage.removeItem('apa-answers'); } catch (e) { /* private browsing */ }
}

function restoreAnswersFromStorage() {
  try {
    const stored = sessionStorage.getItem('apa-answers');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const normalized = {};
    // Schema drift check: validate every key/value against current YAML
    const validQuestionIds = new Set(apa.questions.map(q => q.id));
    for (const [qId, optId] of Object.entries(parsed)) {
      if (qId === apa.runtime_tiebreaker?.id) {
        const normalizedRuntime = normalizeRuntimeOptionId(optId);
        if (!normalizedRuntime) { clearAnswersFromStorage(); return null; }
        normalized[qId] = normalizedRuntime;
        continue;
      }
      if (qId === 'q4' && optId === 'q4f') {
        normalized.q4 = 'q4d';
        normalized[apa.runtime_tiebreaker.id] = 'q9d';
        continue;
      }
      if (!validQuestionIds.has(qId)) { clearAnswersFromStorage(); return null; }
      const question = apa.questions.find(q => q.id === qId);
      if (!question.options.some(o => o.id === optId)) { clearAnswersFromStorage(); return null; }
      normalized[qId] = optId;
    }
    return normalized;
  } catch (e) { return null; }
}

// === BOOT ===
async function boot() {
  showSection('loading-section');
  try {
    const res = await fetch('./apa.yaml');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    apa = jsyaml.load(text);

    // YAML schema validation
    if (!apa.questions || !Array.isArray(apa.questions) || apa.questions.length === 0)
      throw new Error('Missing or empty "questions" array');
    if (!apa.scoring || !apa.scoring.recommendation_thresholds)
      throw new Error('Missing "scoring.recommendation_thresholds"');
    if (!apa.recommendations || typeof apa.recommendations !== 'object')
      throw new Error('Missing "recommendations" object');
    if (!apa.meta || !apa.meta.platforms)
      throw new Error('Missing "meta.platforms"');

    setupListeners();
    renderLastUpdated();

    // Check for URL params (shared link) — URL params always win over sessionStorage
    const urlResult = parseURLParams();
    if (urlResult) {
      if (urlResult.mode === 'wizard') {
        // Pre-fill wizard with answers from URL
        currentQuestionIndex = 0;
        renderQuestion();
        showSection('assessment-section');
        history.replaceState({ section: 'assessment-section', questionIndex: 0 }, '', '');
      } else {
        // mode=card (default): skip wizard, render card directly
        isURLLoaded = true;
        if (typeof clarity === 'function') clarity('set', 'card_url_loaded', 'true');
        renderRecommendation();
        showSection('recommendation-section');
        // Don't push history state for URL-loaded cards (eng review decision 3A)
        history.replaceState({ section: 'recommendation-section' }, '', '');
      }
    } else {
      // Try restoring from sessionStorage
      const restored = restoreAnswersFromStorage();
      if (restored && Object.keys(restored).length > 0) {
        answers = restored;
        const answeredCore = apa.questions.filter(question => answers[question.id]).length;
        currentQuestionIndex = Math.min(answeredCore, apa.questions.length - 1);
        const resumeRuntimeTieBreaker =
          answeredCore === apa.questions.length &&
          shouldAskRuntimeTieBreaker(answers);
        if (resumeRuntimeTieBreaker) {
          renderRuntimeTieBreaker();
        } else {
          renderQuestion();
        }
        showSection('assessment-section');
        history.replaceState({
          section: 'assessment-section',
          questionIndex: currentQuestionIndex,
          runtimeTieBreaker: resumeRuntimeTieBreaker,
        }, '', '');
      } else {
        showSection('welcome-section');
        history.replaceState({ section: 'welcome-section' }, '', '');
      }
    }
  } catch (err) {
    document.getElementById('error-message').textContent =
      `Could not load advisor data: ${err.message}`;
    showSection('error-section');
  }
}

function setupListeners() {
  if (listenersReady) return;
  listenersReady = true;
  document.getElementById('logo-home-link').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('welcome-section');
    pushState('welcome-section');
  });
  document.getElementById('start-btn').addEventListener('click', () => {
    showSection('prescreen-section');
    pushState('prescreen-section');
  });
  document.getElementById('next-btn').addEventListener('click', handleNext);
  document.getElementById('prev-btn').addEventListener('click', handlePrev);
}

function handlePrescreenNo() {
  fastTrack = false;
  delegateResult = null;
  runtimeTieBreakerActive = false;
  if (Object.keys(answers).length === 0) {
    currentQuestionIndex = 0;
  }
  renderQuestion();
  showSection('assessment-section');
  pushState('assessment-section', currentQuestionIndex);
}

function handlePrescreenExplore() {
  renderExploration();
  showSection('exploration-section');
  pushState('exploration-section');
}

function handlePrescreenDelegate() {
  fastTrack = false;
  delegateResult = null;
  delegateAnswers = {};
  // Reset any prior selections in the static delegate section
  document.querySelectorAll('#delegate-section .delegate-option').forEach(el => el.classList.remove('selected'));
  ['interactive-followup', 'delegate-followup', 'reach-followup'].forEach(id => {
    const followup = document.getElementById(id);
    if (followup) {
      followup.classList.remove('is-open');
      followup.setAttribute('aria-hidden', 'true');
    }
  });
  const btn = document.getElementById('delegate-next-btn');
  if (btn) btn.disabled = true;
  if (typeof clarity === 'function') clarity('set', 'delegate_path', 'true');
  showSection('delegate-section');
  pushState('delegate-section');
}

function selectDelegateOption(el, group, value) {
  delegateAnswers[group] = value;
  document.querySelectorAll(`#delegate-section .delegate-option[data-group="${group}"]`)
    .forEach(o => o.classList.toggle('selected', o === el));

  // The involvement answer controls which follow-up questions apply.
  // Interactive → ask what kind of task (which Microsoft 365 Copilot surface to start with).
  // Delegate → ask cadence first; reach is revealed only once cadence is answered.
  if (group === 'involvement') {
    setFollowupEnabled('interactive-followup', value === 'interactive', ['taskType']);
    setFollowupEnabled('delegate-followup', value === 'delegate', ['cadence']);
    setFollowupEnabled('reach-followup', false, ['reach']);
  }

  // Reach only becomes relevant once the user has told us the cadence, so we
  // reveal it progressively instead of showing both delegate questions at once.
  if (group === 'cadence') {
    setFollowupEnabled('reach-followup', true, ['reach']);
  }

  const btn = document.getElementById('delegate-next-btn');
  if (btn) btn.disabled = !isDelegateReady();
}

// Enable/disable a follow-up block, clearing its stale answers and selections when hidden.
function setFollowupEnabled(id, enabled, groups) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('is-open', enabled);
  el.setAttribute('aria-hidden', String(!enabled));
  if (!enabled) {
    groups.forEach(g => delete delegateAnswers[g]);
    el.querySelectorAll('.delegate-option').forEach(o => o.classList.remove('selected'));
  }
}

// Ready when interactive help has a task type, or a delegation is fully specified.
function isDelegateReady() {
  if (delegateAnswers.involvement === 'interactive') return !!delegateAnswers.taskType;
  if (delegateAnswers.involvement === 'delegate') {
    return !!(delegateAnswers.cadence && delegateAnswers.reach);
  }
  return false;
}

// Routing rule for the "where should I get work done" entry-point wizard:
// Staying hands-on always lands on Microsoft 365 Copilot — Copilot Chat and the
// built-in agents (Researcher, Analyst, Facilitator, Interpreter, …) are surfaces of
// that one product, not separate destinations, so the task type selects which surface
// to start with (see resolveDelegateStart) rather than which card to show.
// When delegating, reach is primary for recurring/event and always-on work:
//   cross-environment (desktop/browser/local/shell) → Scout
//   Microsoft 365 only + a concrete cadence (one-shot, recurring/event, or always-on
//     still scoped to M365) → Cowork
//   undecided cadence or reach → both (complementary pair)
// Scout is the personal Autopilot / cross-environment path — not "anything that isn't one-shot".
// Legacy aliases: ondemand→oneshot, continuous→alwayson (pre-P0.1 option ids).
function resolveDelegateResult(involvement, taskType, cadence, reach) {
  if (involvement === 'interactive') return 'm365_copilot';
  const c = cadence === 'ondemand' ? 'oneshot'
    : cadence === 'continuous' ? 'alwayson'
    : cadence;
  if (reach === 'cross') return 'scout';
  if (reach === 'm365' && (c === 'oneshot' || c === 'recurring' || c === 'alwayson')) return 'cowork';
  return 'both';
}

// Which Microsoft 365 Copilot surface the result card should feature.
function resolveDelegateStart(involvement, taskType) {
  if (involvement !== 'interactive') return null;
  return taskType === 'specialized' ? 'agents' : 'chat';
}

function finishDelegate() {
  if (!isDelegateReady()) return;
  delegateResult = resolveDelegateResult(
    delegateAnswers.involvement, delegateAnswers.taskType,
    delegateAnswers.cadence, delegateAnswers.reach);
  delegateStart = resolveDelegateStart(delegateAnswers.involvement, delegateAnswers.taskType);
  renderRecommendation();
  showSection('recommendation-section');
  pushState('recommendation-section');
}

function renderExploration() {
  const groupsContainer = document.getElementById('exploration-groups');
  if (!groupsContainer) return;
  const explorationGroups = apa.exploration_groups || [];
  const renderCard = pid => {
    const rec = apa.recommendations[pid];
    if (!rec) return '';
    const bestFor = rec.exploration_best_for || rec.scoring_summary;
    const summary = (rec.exploration_summary || rec.summary || '').trim();
    const url = rec.resources_url || '#';
    // Exactly one link per card: the whole card is a stretched link to the
    // resources site. A second link inside would sit on top of the stretched
    // one and split the click target, so any future "featured" treatment has
    // to render as text, not an anchor.
    return `
      <div class="exploration-card">
        <div class="exploration-card-label">${bestFor}</div>
        <h3 class="exploration-card-title">${rec.headline}</h3>
        <p class="exploration-card-summary">${summary}</p>
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="exploration-card-link">Explore resources →</a>
      </div>`;
  };
  const renderAdjacentCard = path => {
    if (!path) return '';
    const url = path.url || '#';
    return `
      <div class="exploration-card exploration-card--adjacent">
        <div class="exploration-card-label">${path.exploration_best_for || 'Related path'}</div>
        <h3 class="exploration-card-title">${path.label}</h3>
        <p class="exploration-card-summary">${(path.summary || '').trim()}</p>
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="exploration-card-link">Learn more →</a>
      </div>`;
  };

  const adjacentPaths = apa.adjacent_build_paths || [];
  const adjacentGroup = apa.exploration_adjacent_group || {};
  const adjacentSection = adjacentPaths.length > 0 ? `
    <section class="exploration-section-group" aria-labelledby="exploration-related-build-paths">
      <div class="exploration-group-header">
        <h3 class="exploration-group-title" id="exploration-related-build-paths">${adjacentGroup.title || ''}</h3>
        <p class="exploration-group-description">${adjacentGroup.description || ''}</p>
      </div>
      <div class="exploration-grid">
        ${adjacentPaths.map(renderAdjacentCard).join('')}
      </div>
    </section>` : '';

  groupsContainer.innerHTML = explorationGroups.map(group => `
    <section class="exploration-section-group" aria-labelledby="exploration-${group.title.toLowerCase().replace(/\s+/g, '-')}">
      <div class="exploration-group-header">
        <h3 class="exploration-group-title" id="exploration-${group.title.toLowerCase().replace(/\s+/g, '-')}">${group.title}</h3>
        <p class="exploration-group-description">${group.description}</p>
      </div>
      <div class="exploration-grid">
        ${group.platforms.map(renderCard).join('')}
      </div>
    </section>
  `).join('') + adjacentSection;
}

function renderQuestion() {
  runtimeTieBreakerActive = false;
  const question = apa.questions[currentQuestionIndex];
  const total = apa.questions.length;

  document.getElementById('question-counter').textContent =
    `Question ${currentQuestionIndex + 1} of ${total}`;
  document.getElementById('question-title').textContent = question.label;
  document.getElementById('question-subtitle').textContent = question.prompt || '';

  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';
  question.options.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'option-card' + (answers[question.id] === opt.id ? ' selected' : '');
    div.dataset.optionId = opt.id;
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    const isSelected = answers[question.id] === opt.id;
    div.setAttribute('aria-pressed', String(isSelected));
    div.innerHTML = `
      <div class="option-radio-indicator" aria-hidden="true">
        <div class="option-radio-outer">${isSelected ? '<div class="option-radio-inner"></div>' : ''}</div>
      </div>
      <div class="option-content">
        <div class="option-label">${opt.label}</div>
      </div>`;
    const select = () => {
      answers[question.id] = opt.id;
      saveAnswersToStorage();
      renderQuestion();
    };
    div.addEventListener('click', select);
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
    optionsList.appendChild(div);
  });

  const nextBtn = document.getElementById('next-btn');
  nextBtn.disabled = !answers[question.id];
  nextBtn.textContent = currentQuestionIndex === total - 1
    ? 'Get Recommendation ▶' : 'Next ▶';

  document.getElementById('prev-btn').disabled = false;
}

function renderRuntimeTieBreaker() {
  const runtime = apa.runtime_tiebreaker;
  if (!runtime) return;
  runtimeTieBreakerActive = true;

  document.getElementById('question-counter').textContent = 'One final distinction';
  document.getElementById('question-title').textContent = runtime.label;
  document.getElementById('question-subtitle').textContent = runtime.prompt;

  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';
  runtime.options.forEach(option => {
    const isSelected = answers[runtime.id] === option.id;
    const div = document.createElement('div');
    div.className = 'option-card' + (isSelected ? ' selected' : '');
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-pressed', String(isSelected));
    div.innerHTML = `
      <div class="option-radio-indicator" aria-hidden="true">
        <div class="option-radio-outer">${isSelected ? '<div class="option-radio-inner"></div>' : ''}</div>
      </div>
      <div class="option-content">
        <div class="option-label">${option.label}</div>
      </div>`;
    const select = () => {
      answers[runtime.id] = option.id;
      saveAnswersToStorage();
      renderRuntimeTieBreaker();
    };
    div.addEventListener('click', select);
    div.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
    optionsList.appendChild(div);
  });

  const nextBtn = document.getElementById('next-btn');
  nextBtn.disabled = !answers[runtime.id];
  nextBtn.textContent = 'Get Recommendation ▶';
  document.getElementById('prev-btn').disabled = false;
}

function handleNext() {
  if (runtimeTieBreakerActive) {
    renderRecommendation();
    showSection('recommendation-section');
    pushState('recommendation-section');
    return;
  }
  if (currentQuestionIndex < apa.questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
    pushState('assessment-section', currentQuestionIndex);
  } else {
    if (!answers[apa.runtime_tiebreaker?.id] && shouldAskRuntimeTieBreaker(answers)) {
      renderRuntimeTieBreaker();
      pushState('assessment-section', currentQuestionIndex, true);
    } else {
      renderRecommendation();
      showSection('recommendation-section');
      pushState('recommendation-section');
    }
  }
}

function handlePrev() {
  if (runtimeTieBreakerActive) {
    delete answers[apa.runtime_tiebreaker?.id];
    saveAnswersToStorage();
    currentQuestionIndex = apa.questions.length - 1;
    renderQuestion();
    pushState('assessment-section', currentQuestionIndex);
    return;
  }
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
    pushState('assessment-section', currentQuestionIndex);
  } else {
    showSection('prescreen-section');
    pushState('prescreen-section');
  }
}

// === SCORE COMPARISON ===

// Short labels for questions in the per-question grid
const Q_SHORT_LABELS = {
  q1: 'Builder',
  q8: 'Audience',
  q2: 'Deployment',
  q4: 'Task type',
  q3: 'Data access',
};

// Returns all hard-rule labels that zeroed a platform
function getHardRuleLabels(platformId, answersMap) {
  const labels = [];
  const hardRules = apa.scoring.hard_rules || {};
  Object.values(answersMap).forEach(optionId => {
    if (hardRules[optionId] && hardRules[optionId].zero.includes(platformId)) {
      labels.push(hardRules[optionId].label ?? optionId);
    }
  });
  return labels;
}

// Returns per-question scores for a platform: [{qId, score, maxScore}]
function getPerQuestionScores(platformId, answersMap) {
  return apa.questions.map(q => {
    const optionId = answersMap[q.id];
    if (!optionId) return { qId: q.id, score: 0, max: 3 };
    const option = q.options.find(o => o.id === optionId);
    return { qId: q.id, score: option ? (option.scores[platformId] ?? 0) : 0, max: 3 };
  });
}

// Returns a comparative reason for a platform's score
function getScoreReason(platformId, ranked, answersMap) {
  const rec = apa.recommendations[platformId];
  const rankEntry = ranked.find(r => r.id === platformId);
  const zeroed = getZeroedPlatforms(answersMap);

  if (zeroed[platformId]) {
    const labels = getHardRuleLabels(platformId, answersMap);
    if (labels.length > 0) return labels.map(l => `⚠️ ${l}`).join('<br>');
    if (platformId === 'm365_copilot' && !fastTrack) {
      return 'Only available via the entry-point wizard — excluded from custom agent assessment.';
    }
    return rec ? rec.scoring_summary : 'Not applicable for this scenario.';
  }

  if (!rankEntry) return rec ? rec.scoring_summary : '';

  const score = rankEntry.score;
  const winner = ranked[0];
  const isWinner = winner && winner.id === platformId;
  const contribs = getContributions(platformId, answersMap);
  const perQ = getPerQuestionScores(platformId, answersMap);
  const perfectCount = perQ.filter(q => q.score === 3).length;
  const zeroCount = perQ.filter(q => q.score === 0).length;

  if (isWinner) {
    if (perfectCount === 5) return 'Perfect fit — scored highest on every dimension.';
    if (perfectCount >= 4) return 'Strong match across nearly all dimensions.';
    const tops = contribs.slice(0, 2).map(c => `<em>${c.questionLabel.replace(/\?$/, '')}</em>`);
    return `Strongest on ${tops.join(' and ')}.`;
  }

  // Runner-up or lower: explain gap relative to winner
  if (winner && score > 0) {
    const gap = winner.score - score;
    const weakQs = perQ
      .filter(q => {
        const winnerOpt = answersMap[q.qId];
        if (!winnerOpt) return false;
        const wq = apa.questions.find(x => x.id === q.qId);
        const wOpt = wq?.options.find(o => o.id === winnerOpt);
        const winnerScore = wOpt ? (wOpt.scores[winner.id] ?? 0) : 0;
        return winnerScore - q.score >= 2;
      })
      .map(q => Q_SHORT_LABELS[q.qId] || q.qId);

    if (gap <= 2 && weakQs.length > 0) {
      return `Close — lost ground on ${weakQs.join(' and ').toLowerCase()}.`;
    }
    if (zeroCount >= 3) {
      return rec ? rec.scoring_summary : 'Limited fit for this scenario.';
    }
    if (weakQs.length > 0) {
      return `Weaker fit on ${weakQs.join(' and ').toLowerCase()}.`;
    }
    const tops = contribs.slice(0, 2).map(c => `<em>${c.questionLabel.replace(/\?$/, '')}</em>`);
    if (tops.length > 0) return `Best on ${tops.join(' and ')}, but outscored overall.`;
  }

  return rec ? rec.scoring_summary : '';
}

// Builds a per-question dot grid for all platforms
function buildPerQuestionGrid(answersMap) {
  const platforms = apa.meta.platforms.filter(p => p.id !== 'm365_copilot');
  const zeroed = getZeroedPlatforms(answersMap);

  const headerCells = platforms.map(p => {
    const icon = PLATFORM_ICONS[p.id] || '';
    return `<th class="pq-platform-header"><img class="pq-icon" src="${icon}" alt="${p.label}" title="${p.label}"></th>`;
  }).join('');

  const rows = apa.questions.map(q => {
    const optionId = answersMap[q.id];
    if (!optionId) return '';
    const option = q.options.find(o => o.id === optionId);
    if (!option) return '';
    const shortLabel = Q_SHORT_LABELS[q.id] || q.label;

    const cells = platforms.map(p => {
      if (zeroed[p.id]) return `<td class="pq-cell"><span class="pq-dot pq-zeroed" role="img" aria-label="${shortLabel}, ${p.label}: disqualified" title="Disqualified">—</span></td>`;
      const score = option.scores[p.id] ?? 0;
      const cls = score === 3 ? 'pq-strong' : score === 2 ? 'pq-moderate' : score === 1 ? 'pq-weak' : 'pq-none';
      const title = score === 3 ? 'Strong fit' : score === 2 ? 'Moderate fit' : score === 1 ? 'Weak fit' : 'No fit';
      return `<td class="pq-cell"><span class="pq-dot ${cls}" role="img" aria-label="${shortLabel}, ${p.label}: ${title} (${score} of 3)" title="${title} (${score}/3)"></span></td>`;
    }).join('');

    return `<tr><td class="pq-label">${shortLabel}</td>${cells}</tr>`;
  }).join('');

  return `
    <table class="pq-grid">
      <thead><tr><th class="pq-label-header"></th>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildScoreComparison(ranked, answersMap) {
  const maxScore = apa.scoring.raw_score_max || 15;
  const zeroed = getZeroedPlatforms(answersMap);

  const rows = apa.meta.platforms
    .filter(p => p.id !== 'm365_copilot')
    .map(p => {
    const rankEntry = ranked.find(r => r.id === p.id);
    const score = rankEntry ? rankEntry.score : 0;
    const label = rankEntry ? rankEntry.label : 'Not recommended';
    const pct = zeroed[p.id] ? 0 : Math.round((score / maxScore) * 100);
    const icon = PLATFORM_ICONS[p.id] || '';
    const reason = getScoreReason(p.id, ranked, answersMap);
    const badge = `<span class="rec-badge sc-badge ${badgeClass(label)}">${label}</span>`;

    return `
      <div class="sc-row">
        <div class="sc-platform">
          <img class="sc-icon" src="${icon}" alt="${p.label}">
          <span class="sc-name">${p.label}</span>
        </div>
        <div class="sc-bar-area">
          <div class="sc-bar-track">
            <div class="sc-bar-fill" style="--bar-pct: ${pct}%"></div>
          </div>
          <span class="sc-score">${score}/${maxScore}</span>
          ${badge}
        </div>
        <p class="sc-reason">${reason}</p>
      </div>`;
  }).join('');

  // Close-score callout
  const top = ranked[0];
  const second = ranked[1];
  let closeCallout = '';
  if (top && second && !zeroed[second.id] && (top.score - second.score) <= 2 && second.score > 0) {
    const gap = Math.abs(top.score - second.score);
    const gapText = gap === 0 ? 'Zero points separate' : `Only ${gap} point${gap !== 1 ? 's' : ''} separate${gap === 1 ? 's' : ''}`;
    closeCallout = `<p class="sc-close-callout">📊 ${gapText} the top two platforms — your choice may come down to team skills and existing tooling.</p>`;
  }

  return `
    <div class="sc-panel">
      <div class="sc-heading">Score Breakdown</div>
      ${rows}
      ${closeCallout}
      <div class="sc-grid-section">
        <div class="sc-grid-heading">Per-question fit</div>
        ${buildPerQuestionGrid(answersMap)}
        <div class="pq-legend">
          <span class="pq-dot pq-strong"></span> Strong
          <span class="pq-dot pq-moderate"></span> Moderate
          <span class="pq-dot pq-weak"></span> Weak
          <span class="pq-dot pq-none"></span> None
          <span class="pq-dot pq-zeroed">—</span> Disqualified
        </div>
      </div>
    </div>`;
}

function toggleScoreComparison() {
  const panel = document.getElementById('rec-score-comparison');
  const btn = document.getElementById('rec-score-toggle');
  const chevron = btn.querySelector('.score-toggle-chevron');
  const isHidden = panel.classList.toggle('hidden');
  chevron.textContent = isHidden ? '▾' : '▴';
  if (!isHidden) {
    // Trigger bar animation after reveal
    requestAnimationFrame(() => {
      panel.querySelectorAll('.sc-bar-fill').forEach(bar => bar.classList.add('animate'));
    });
  } else {
    panel.querySelectorAll('.sc-bar-fill').forEach(bar => bar.classList.remove('animate'));
  }
}

function showRecNav(hasSecondary) {
  const nav = document.getElementById('rec-nav');
  const alsoLink = document.getElementById('rec-nav-also');
  const alsoSep = document.getElementById('rec-nav-also-sep');
  nav.style.display = '';
  alsoLink.style.display = hasSecondary ? '' : 'none';
  alsoSep.style.display = hasSecondary ? '' : 'none';
}

// Renders the entry-point result (Copilot Chat / Cowork / Scout). Non-scored:
// no score breakdown, no decision card — mirrors the fast-track branch.
// Scout/Cowork access tips can still surface as cross-notes.
function renderDelegateRecommendation() {
  const ids = delegateResult === 'both' ? ['cowork', 'scout'] : [delegateResult];
  recommendedPlatformId = ids[0];

  document.getElementById('rec-primary-card').innerHTML =
    buildPlatformCard(ids[0], [], {}, true, false, delegateStart);

  const pairBanner = document.getElementById('rec-pair-banner');
  const secondLabel = document.getElementById('rec-second-label');
  if (ids.length > 1) {
    pairBanner.innerHTML =
      '<strong>Consider both.</strong> Scout can be the always-on layer that monitors and coordinates, ' +
      'while Cowork assembles Microsoft 365 deliverables (one-shot, scheduled, or event-triggered).';
    pairBanner.classList.remove('hidden');
    secondLabel.textContent = 'Also consider';
    secondLabel.classList.remove('hidden');
    document.getElementById('rec-second-card').innerHTML =
      buildPlatformCard(ids[1], [], {}, false, false);
  } else {
    pairBanner.classList.add('hidden');
    secondLabel.classList.add('hidden');
    document.getElementById('rec-second-card').innerHTML = '';
  }

  document.getElementById('rec-fasttrack-prompt').classList.add('hidden');
  document.getElementById('rec-score-toggle').classList.add('hidden');
  document.getElementById('rec-score-comparison').classList.add('hidden');
  // Entry-point access notes (e.g. Scout Frontier gates) from winner_persona_notes
  renderCrossNotes({}, recommendedPlatformId);
  document.getElementById('rec-nav').style.display = 'none';
  document.getElementById('decision-card').style.display = 'none';

  updateTabTitle();
  if (typeof clarity === 'function') clarity('set', 'platform', recommendedPlatformId);
  renderResultExtras();
}

function renderRecommendation() {
  clearAnswersFromStorage();
  if (delegateResult) {
    renderDelegateRecommendation();
    return;
  }
  if (fastTrack) {
    recommendedPlatformId = 'm365_copilot';
    document.getElementById('rec-primary-card').innerHTML =
      buildPlatformCard('m365_copilot', [], {}, true, false);
    document.getElementById('rec-pair-banner').classList.add('hidden');
    document.getElementById('rec-second-label').classList.add('hidden');
    document.getElementById('rec-second-card').innerHTML = '';
    document.getElementById('rec-fasttrack-prompt').classList.remove('hidden');
    document.getElementById('rec-score-toggle').classList.add('hidden');
    document.getElementById('rec-score-comparison').classList.add('hidden');
    // Hide nav for fast-track (no scores, no secondary)
    document.getElementById('rec-nav').style.display = 'none';
    updateTabTitle();
    if (typeof clarity === 'function') clarity('set', 'platform', recommendedPlatformId);
    renderCrossNotes(answers, recommendedPlatformId);
    renderDecisionCard();
    renderResultExtras();
    return;
  }

  document.getElementById('rec-fasttrack-prompt').classList.add('hidden');

  const ranked = rankPlatforms(answers);
  const top = ranked[0];
  recommendedPlatformId = top ? top.id : null;
  const second = ranked[1];

  if (!top || !second) {
    document.getElementById('rec-primary-card').innerHTML =
      '<div class="rec-card"><p>Unable to generate a recommendation. Please contact the CAT team.</p></div>';
    return;
  }

  document.getElementById('rec-primary-card').innerHTML =
    buildPlatformCard(top.id, ranked, answers, true, true);

  const pairBanner = document.getElementById('rec-pair-banner');
  const secondLabel = document.getElementById('rec-second-label');

  // Hide secondary card when second platform is "Not recommended" (score 0–3)
  if (second.label === 'Not recommended') {
    pairBanner.classList.add('hidden');
    secondLabel.classList.add('hidden');
    document.getElementById('rec-second-card').innerHTML = '';
    document.getElementById('rec-score-comparison').innerHTML = buildScoreComparison(ranked, answers);
    document.getElementById('rec-score-comparison').classList.remove('hidden');
    document.getElementById('rec-score-toggle').classList.add('hidden');
    requestAnimationFrame(() => {
      document.getElementById('rec-score-comparison').querySelectorAll('.sc-bar-fill').forEach(bar => bar.classList.add('animate'));
    });
    // Show nav without "Also Consider"
    showRecNav(false);
    updateTabTitle();
    if (typeof clarity === 'function') {
      clarity('set', 'wizard_completed', 'true');
      if (recommendedPlatformId) clarity('set', 'platform', recommendedPlatformId);
    }
    renderCrossNotes(answers, recommendedPlatformId);
    renderDecisionCard();
    renderResultExtras();
    return;
  }

  const scoreDiff = top.score - second.score;
  const isPair = scoreDiff <= apa.scoring.tie_handling.threshold_points;
  const pairEntry = isPair
    ? (apa.scoring.tie_handling.valid_pairs || []).find(p =>
        p.platforms.includes(top.id) && p.platforms.includes(second.id))
    : null;

  if (pairEntry) {
    let bannerHtml = `💡 ${pairEntry.rationale}`;
    // "Why not?" explainer for close scores
    const whyNot = computeWhyNot(top, second, answers);
    if (whyNot) bannerHtml += `<p class="why-not-sentence">${whyNot}</p>`;
    pairBanner.innerHTML = bannerHtml;
    pairBanner.classList.remove('hidden');
    secondLabel.textContent = 'Complementary platform:';
    secondLabel.classList.remove('hidden');
  } else if (isPair) {
    // Close scores but not a valid pair — still show "Why not?"
    const whyNot = computeWhyNot(top, second, answers);
    if (whyNot) {
      pairBanner.innerHTML = `<p class="why-not-sentence">${whyNot}</p>`;
      pairBanner.classList.remove('hidden');
    } else {
      pairBanner.classList.add('hidden');
    }
    secondLabel.textContent = 'Also consider:';
    secondLabel.classList.remove('hidden');
  } else {
    pairBanner.classList.add('hidden');
    secondLabel.textContent = 'Also consider:';
    secondLabel.classList.remove('hidden');
  }

  document.getElementById('rec-second-card').innerHTML =
    buildPlatformCard(second.id, ranked, answers, false, false);

  document.getElementById('rec-score-comparison').innerHTML = buildScoreComparison(ranked, answers);
  document.getElementById('rec-score-comparison').classList.remove('hidden');
  document.getElementById('rec-score-toggle').classList.add('hidden');
  requestAnimationFrame(() => {
    document.getElementById('rec-score-comparison').querySelectorAll('.sc-bar-fill').forEach(bar => bar.classList.add('animate'));
  });

  // Show nav with "Also Consider"
  showRecNav(true);
  updateTabTitle();
  // Clarity analytics
  if (typeof clarity === 'function') {
    clarity('set', 'wizard_completed', 'true');
    if (recommendedPlatformId) clarity('set', 'platform', recommendedPlatformId);
  }
  renderCrossNotes(answers, recommendedPlatformId);
  renderDecisionCard();
  renderResultExtras();
}

function updateTabTitle() {
  if (!recommendedPlatformId) return;
  const platformMeta = (apa.meta.platforms || []).find(p => p.id === recommendedPlatformId);
  if (platformMeta) {
    document.title = `APA: ${platformMeta.label} recommended`;
  } else if (apa.recommendations[recommendedPlatformId]) {
    document.title = `APA: ${apa.recommendations[recommendedPlatformId].headline} recommended`;
  }
}

function restart() {
  answers = {};
  runtimeTieBreakerActive = false;
  feedbackSubmitted = false;
  fastTrack = false;
  delegateResult = null;
  delegateStart = null;
  delegateAnswers = {};
  currentQuestionIndex = 0;
  recommendedPlatformId = null;
  isURLLoaded = false;
  originalPlatformId = null;
  originalDate = null;
  clearAnswersFromStorage();
  document.title = DEFAULT_TITLE;
  // Clear URL params
  if (window.location.search) {
    history.replaceState(null, '', window.location.pathname);
  }
  showSection('welcome-section');
  pushState('welcome-section');
}

function startFullAssessment() {
  fastTrack = false;
  delegateResult = null;
  delegateStart = null;
  answers = {};
  runtimeTieBreakerActive = false;
  feedbackSubmitted = false;
  currentQuestionIndex = 0;
  renderQuestion();
  showSection('assessment-section');
  pushState('assessment-section', 0);
}

// === URL PARAMETER PARSING ===
// Returns { mode: 'card'|'wizard' } if valid params found, or null
function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.size === 0) return null;

  const mode = params.get('mode') || 'card';
  originalPlatformId = params.get('r') || null;
  // d= is documented as YYYYMMDD. Reject anything else at the boundary so a
  // malformed value can't travel further into the app.
  const rawDate = params.get('d');
  originalDate = rawDate && /^\d{8}$/.test(rawDate) ? rawDate : null;

  // Entry-point path handling (Microsoft 365 Copilot / Cowork / Scout).
  // dt=copilot_chat is a legacy alias from when Copilot Chat was its own destination;
  // it now resolves to Microsoft 365 Copilot with the Copilot Chat surface featured.
  const dt = params.get('dt');
  if (dt && ['copilot_chat', 'm365_copilot', 'cowork', 'scout', 'both'].includes(dt)) {
    delegateResult = dt === 'copilot_chat' ? 'm365_copilot' : dt;
    const st = params.get('st');
    delegateStart = dt === 'copilot_chat' ? 'chat'
      : (['chat', 'agents'].includes(st) ? st : null);
    fastTrack = false;
    answers = {};
    return { mode: 'card' };
  }

  // Fast-track handling (legacy ft=1 → M365 Copilot card).
  // Force card mode like dt= does: fastTrack suppresses the m365_copilot
  // zeroing rule, so letting ft=1 fall through to mode=wizard would replay the
  // scored wizard with M365 Copilot still in the running, which it never is.
  if (params.get('ft') === '1') {
    fastTrack = true;
    answers = {};
    return { mode: 'card' };
  }

  // Build answers from URL params.
  // Option ids must be validated PER QUESTION, not against one global set:
  // hard rules key off the option id alone (see getZeroedPlatforms), so a link
  // like ?q1=q3f would smuggle q3f's disqualification into the q1 slot, score
  // zero for q1, and silently hand back a different winner.
  const validOptionIdsByQuestion = new Map(
    apa.questions.map(q => [q.id, new Set(q.options.map(o => o.id))])
  );

  let hasValidAnswer = false;
  let hasDrift = false;

  validOptionIdsByQuestion.forEach((validForQuestion, qId) => {
    const value = params.get(qId);
    if (qId === 'q4' && value === 'q4f') {
      answers.q4 = 'q4d';
      answers[apa.runtime_tiebreaker.id] = 'q9d';
      hasValidAnswer = true;
      return;
    }
    if (value && validForQuestion.has(value)) {
      answers[qId] = value;
      hasValidAnswer = true;
    } else if (value) {
      // Unknown option, or an option belonging to a different question —
      // schema drift or a tampered link. Ignore it.
      hasDrift = true;
    }
  });

  const runtimeId = apa.runtime_tiebreaker?.id;
  const runtimeValue = runtimeId ? params.get(runtimeId) : null;
  if (runtimeValue) {
    const normalizedRuntime = normalizeRuntimeOptionId(runtimeValue);
    if (normalizedRuntime) {
      answers[runtimeId] = normalizedRuntime;
    } else {
      hasDrift = true;
    }
  }

  // Check for questions in YAML not present in URL
  apa.questions.forEach(q => {
    if (!answers[q.id]) hasDrift = true;
  });

  if (!hasValidAnswer) return null;

  // Store drift flag for later display
  window._decisionCardDrift = hasDrift;

  fastTrack = false;
  return { mode };
}

// === DECISION CARD ===
function buildShareableURL() {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();

  if (delegateResult) {
    params.set('dt', delegateResult);
    if (delegateStart) params.set('st', delegateStart);
  } else if (fastTrack) {
    params.set('ft', '1');
  } else {
    apa.questions.forEach(q => {
      if (answers[q.id]) params.set(q.id, answers[q.id]);
    });
    const runtimeId = apa.runtime_tiebreaker?.id;
    if (runtimeId && answers[runtimeId]) params.set(runtimeId, answers[runtimeId]);
  }

  params.set('r', recommendedPlatformId || '');
  params.set('d', formatDate(new Date()));
  params.set('mode', 'card');

  return `${base}?${params.toString()}`;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Formats a YYYYMMDD share-link date for display. Returns '' for anything that
// is not a real calendar date.
//
// The month and day were already parsed as integers, but the year was returned
// straight from the input via substring(0, 4) — so the d= URL param put four
// attacker-chosen characters into the page. An out-of-range month also rendered
// literal "undefined" via months[m - 1]. Both are handled here rather than only
// at the call site, so the next caller inherits the guarantee.
function formatDateDisplay(yyyymmdd) {
  const raw = String(yyyymmdd == null ? '' : yyyymmdd);
  const parts = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!parts) return '';

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';

  // Reject dates that don't exist, e.g. 20260231.
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day) return '';

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
}

// Compute key factors using delta algorithm: (winning_platform_score − best_runner_up_score)
function computeDecisionKeyFactors() {
  if (fastTrack || !recommendedPlatformId) return [];
  const ranked = rankPlatforms(answers);
  const runnerId = ranked.length > 1 ? ranked[1].id : null;

  const deltas = [];
  apa.questions.forEach(q => {
    const optionId = answers[q.id];
    if (!optionId) return;
    const option = q.options.find(o => o.id === optionId);
    if (!option) return;

    const winnerScore = option.scores[recommendedPlatformId] ?? 0;
    const runnerScore = runnerId ? (option.scores[runnerId] ?? 0) : 0;
    const delta = winnerScore - runnerScore;

    deltas.push({
      questionLabel: q.label,
      optionLabel: option.label,
      delta
    });
  });

  deltas.sort((a, b) => b.delta - a.delta);
  return deltas.slice(0, 3).filter(d => d.delta > 0);
}

// "Why not?" explainer: explains what tipped the balance in close scores
function computeWhyNot(winner, runner, answersMap) {
  if (!winner || !runner) return null;
  const winnerMeta = (apa.meta.platforms || []).find(p => p.id === winner.id);
  const runnerMeta = (apa.meta.platforms || []).find(p => p.id === runner.id);
  if (!winnerMeta || !runnerMeta) return null;

  // Pair-specific guidance from valid_pairs (stronger than generic delta sentence)
  const pair = (apa.scoring.tie_handling.valid_pairs || []).find(p =>
    p.platforms.includes(winner.id) && p.platforms.includes(runner.id)
  );
  const pairWhy = pair && pair.why_not
    ? pair.why_not.replace('{winner}', winnerMeta.label).replace('{runner}', runnerMeta.label)
    : null;

  // Find the question where the winner most outscored the runner-up
  let bestDelta = null;
  apa.questions.forEach(q => {
    const optionId = answersMap[q.id];
    if (!optionId) return;
    const option = q.options.find(o => o.id === optionId);
    if (!option) return;
    const wScore = option.scores[winner.id] ?? 0;
    const rScore = option.scores[runner.id] ?? 0;
    const delta = wScore - rScore;
    if (!bestDelta || delta > bestDelta.delta) {
      bestDelta = { qId: q.id, questionLabel: q.label, optionLabel: option.label, delta };
    }
  });

  if (!bestDelta || bestDelta.delta <= 0) return pairWhy || null;
  const dimension = Q_SHORT_LABELS[bestDelta.qId] || bestDelta.questionLabel;
  const deltaSentence =
    `${winnerMeta.label} edged out ${runnerMeta.label} on <strong>${dimension.toLowerCase()}</strong> — you selected "${bestDelta.optionLabel}".`;
  return pairWhy ? `${pairWhy} ${deltaSentence}` : deltaSentence;
}

function renderDecisionCard() {
  const card = document.getElementById('decision-card');
  if (!card || !recommendedPlatformId) return;

  // Recipient context (URL-loaded only)
  const contextEl = document.getElementById('decision-card-context');
  contextEl.style.display = isURLLoaded ? '' : 'none';

  // Temporal change banner
  const bannerEl = document.getElementById('decision-card-banner');
  if (isURLLoaded && originalPlatformId && originalPlatformId !== recommendedPlatformId) {
    const dateStr = (originalDate && formatDateDisplay(originalDate)) || 'a previous visit';
    // Built as nodes, not an innerHTML template. dateStr derives from the d=
    // URL param, and share links are pasted around by people who did not build
    // them, so it never gets to be parsed as markup.
    bannerEl.textContent =
      `Your recommendation has changed since ${dateStr}. The platform landscape has been updated. `;
    const retakeLink = document.createElement('a');
    retakeLink.href = 'javascript:void(0)';
    retakeLink.textContent = 'Retake assessment →';
    retakeLink.addEventListener('click', restart);
    bannerEl.appendChild(retakeLink);
    bannerEl.style.display = '';
    if (typeof clarity === 'function') clarity('set', 'temporal_change', 'true');
  } else {
    bannerEl.style.display = 'none';
  }

  // Schema drift note
  const driftEl = document.getElementById('decision-card-drift');
  if (window._decisionCardDrift) {
    driftEl.textContent = 'ℹ Some evaluation criteria have been updated since this recommendation was generated.';
    driftEl.style.display = '';
  } else {
    driftEl.style.display = 'none';
  }

  // Only show card if there's visible content (URL-loaded scenarios)
  const hasVisibleContent = contextEl.style.display !== 'none'
    || bannerEl.style.display !== 'none'
    || driftEl.style.display !== 'none';
  card.style.display = hasVisibleContent ? '' : 'none';
}

// Guidance version strip, export, feedback — shown on every result
function renderResultExtras() {
  renderGuidanceMeta('rec-guidance-meta');
  resetFeedbackUI();
  const exportBtn = document.getElementById('export-md-btn');
  if (exportBtn) exportBtn.classList.toggle('hidden', !recommendedPlatformId);
}

function renderGuidanceMeta(elId) {
  const el = document.getElementById(elId);
  if (!el || !apa || !apa.meta) return;
  const ver = apa.meta.version || '';
  const verified = apa.meta.guidance_verified || '';
  // Changelog lives once in the footer nav — do not repeat it on every guidance strip.
  el.innerHTML =
    `<span class="guidance-meta-text">Guidance v${ver}` +
    (verified ? ` · Verified against Microsoft Learn: ${verified}` : '') +
    `</span>`;
  el.classList.remove('hidden');
}

// Footer "Last updated" date. Parsed as UTC so the displayed day doesn't shift
// west of Greenwich, where `new Date('2026-08-12')` would render as Aug 11.
function renderLastUpdated() {
  const el = document.getElementById('footer-last-updated');
  if (!el || !apa || !apa.meta || !apa.meta.last_updated) return;
  const raw = String(apa.meta.last_updated).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (isNaN(d.getTime())) return;
  const label = d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
  el.innerHTML = `Last updated: <time datetime="${raw}">${label}</time>`;
  el.classList.remove('hidden');
}

function resetFeedbackUI() {
  feedbackSubmitted = false;
  const wrap = document.getElementById('rec-feedback');
  if (!wrap) return;
  wrap.classList.remove('hidden');
  const q = document.getElementById('feedback-question');
  const thanks = document.getElementById('feedback-thanks');
  if (q) q.classList.remove('hidden');
  if (thanks) {
    thanks.classList.add('hidden');
    thanks.textContent = '';
  }
}

function submitFeedback(helpful) {
  if (feedbackSubmitted) return;
  feedbackSubmitted = true;
  if (typeof clarity === 'function') {
    clarity('set', 'feedback_helpful', helpful ? 'yes' : 'no');
    if (recommendedPlatformId) clarity('set', 'feedback_platform', recommendedPlatformId);
  }
  const q = document.getElementById('feedback-question');
  const thanks = document.getElementById('feedback-thanks');
  // Activating the button removes it, which drops focus to <body>. Move focus to
  // the confirmation only for keyboard users, so a mouse click isn't hijacked.
  const fromKeyboard = !!(q && document.activeElement && q.contains(document.activeElement)
    && typeof document.activeElement.matches === 'function'
    && document.activeElement.matches(':focus-visible'));
  if (q) q.classList.add('hidden');
  if (thanks) {
    const message = helpful
      ? 'Thanks — glad it helped.'
      : `Thanks for the signal. <a href="${buildFeedbackIssueURL()}" target="_blank" rel="noopener noreferrer">Open a GitHub issue</a> with this scenario if something looked wrong.`;
    // Unhide (and take focus) before writing the text: a live region only
    // announces changes made while it is already in the accessibility tree.
    thanks.classList.remove('hidden');
    if (fromKeyboard) thanks.focus();
    thanks.innerHTML = message;
  }
}

function buildFeedbackIssueURL() {
  const title = encodeURIComponent('APA feedback: recommendation not helpful');
  const lines = [
    '## Scenario',
    `- Recommended: ${recommendedPlatformId || 'n/a'}`,
    `- Guidance version: ${apa?.meta?.version || 'n/a'}`,
    '',
    '### Answers',
  ];
  if (delegateResult) {
    lines.push(`- Entry-point destination: ${delegateResult}`);
    if (delegateStart) lines.push(`- Start surface: ${delegateStart}`);
  } else {
    Object.entries(answers).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
  }
  lines.push('', '### What was wrong?', '', '(please describe)', '', `Share URL: ${buildShareableURL()}`);
  const body = encodeURIComponent(lines.join('\n'));
  return `https://github.com/microsoft/AgentPlatformAdvisor/issues/new?title=${title}&body=${body}`;
}

function downloadRecommendationMarkdown() {
  if (!recommendedPlatformId || !apa) return;
  const rec = apa.recommendations[recommendedPlatformId];
  const headline = rec ? rec.headline : recommendedPlatformId;
  const ranked = (!delegateResult && !fastTrack) ? rankPlatforms(answers) : [];
  const lines = [
    `# Agent Platform Advisor — ${headline}`,
    '',
    `Guidance version: ${apa.meta.version || 'n/a'}`,
    apa.meta.guidance_verified ? `Verified against Microsoft Learn: ${apa.meta.guidance_verified}` : '',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `## Recommendation`,
    '',
    `**${headline}**`,
    rec?.summary ? '' : '',
    rec?.summary ? rec.summary.trim() : '',
    '',
  ].filter(l => l !== undefined);

  if (ranked.length) {
    const top = ranked.find(r => r.id === recommendedPlatformId) || ranked[0];
    lines.push(`Fit: ${top.label} (${top.score})`, '');
    lines.push('### Score comparison', '');
    ranked.filter(r => r.id !== 'm365_copilot').forEach(r => {
      lines.push(`- ${apa.recommendations[r.id]?.headline || r.id}: ${r.score} — ${r.label}`);
    });
    lines.push('');
    const factors = getKeyFactors(recommendedPlatformId, answers);
    if (factors.length) {
      lines.push('### Why this was recommended', '');
      factors.forEach(f => lines.push(`- ${stripHtmlTags(f)}`));
      lines.push('');
    }
  }

  if (rec?.best_for?.length) {
    lines.push('### Best for', '');
    rec.best_for.forEach(b => lines.push(`- ${b}`));
    lines.push('');
  }
  if (rec?.watch_out_for?.length) {
    lines.push('### Important considerations', '');
    rec.watch_out_for.forEach(b => lines.push(`- ${b}`));
    lines.push('');
  }

  lines.push('### Share link (canonical)', '', buildShareableURL(), '');
  lines.push('---', 'Generated by [Agent Platform Advisor](https://microsoft.github.io/AgentPlatformAdvisor/).');

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `apa-recommendation-${recommendedPlatformId}.md`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
  confirmExportDownload();
  if (typeof clarity === 'function') clarity('set', 'export_md', 'true');
}

// Browser download chrome is unreliable (hidden shelves, mobile share sheets),
// so confirm the export on the control the user actually pressed.
function confirmExportDownload() {
  const btn = document.getElementById('export-md-btn');
  if (!btn || btn.dataset.confirming === 'true') return;
  const original = btn.textContent;
  btn.dataset.confirming = 'true';
  btn.textContent = 'Downloaded ✓';
  setTimeout(() => {
    btn.textContent = original;
    delete btn.dataset.confirming;
  }, 2000);
}

// === SHARE & DOWNLOAD ===
function copyShareLink() {
  const url = buildShareableURL();
  const btn = document.getElementById('decision-card-share');
  const originalText = btn.textContent;

  function showSuccess() {
    if (typeof clarity === 'function') clarity('set', 'card_shared', 'true');
    btn.textContent = '✓ Copied!';
    btn.classList.add('btn-decision-copied');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('btn-decision-copied');
    }, 2000);
  }

  function showError() {
    btn.textContent = 'Copy failed';
    btn.classList.add('btn-decision-error');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('btn-decision-error');
    }, 2000);
    // Show manual copy input below card
    let fallback = document.getElementById('decision-card-fallback-url');
    if (!fallback) {
      fallback = document.createElement('input');
      fallback.id = 'decision-card-fallback-url';
      fallback.type = 'text';
      fallback.readOnly = true;
      fallback.style.cssText = 'width:100%;margin-top:8px;padding:8px;font-size:var(--fs-mono);border:1px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font-mono);';
      document.getElementById('decision-card').appendChild(fallback);
    }
    fallback.value = url;
    fallback.style.display = '';
    fallback.select();
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(showSuccess, () => {
      // Fallback: execCommand
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showSuccess();
      } catch { showError(); }
    });
  } else {
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showSuccess();
    } catch { showError(); }
  }
}

// === THEME TOGGLE ===
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try { localStorage.setItem('cat-theme', next); } catch (e) { /* private browsing */ }
  });
}

document.addEventListener('DOMContentLoaded', boot);
document.addEventListener('DOMContentLoaded', initThemeToggle);
