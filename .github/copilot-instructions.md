# Copilot Instructions — Agent Platform Advisor

## Architecture

This is a static single-page web app (no build step, no backend) that recommends a Microsoft agent platform based on a scored wizard assessment. All content — questions, scores, platform descriptions, hard rules, tiebreakers — lives in `apa.yaml` and is fetched at runtime by `assets/apa.js`.

Key files:
- `apa.yaml` — source of truth for all content and scoring logic
- `assets/apa.js` — all JavaScript (state, rendering, scoring engine)
- `assets/apa.css` — all styles
- `index.html` — app shell

Content changes go in `apa.yaml`. UI logic goes in `assets/apa.js`. Styles go in `assets/apa.css`.

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, border radius, shadows, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

Key constraints:

- Primary blue is `#0078D4` — not `#0090FF` or any other blue
- Body font is `Segoe UI Variable` with system fallbacks — never use Inter, Roboto, etc.
- `Geist Mono` is only for scores, platform labels, and step counters — not body text
- Canvas background is a 3-stop diagonal gradient, not a flat color

## Scoring Pipeline

Four platforms are scored: Agent Builder, Copilot Studio, Microsoft Foundry, Microsoft 365 Copilot. The pipeline (documented in `docs/SCORING.md` and `docs/FLOWCHART.md`):

1. **Hard rules** zero out platforms for disqualifying answer combinations
2. **Raw scores** sum across 5 questions (max 15 per platform)
3. **Tiebreakers** in `apa.yaml` resolve equal scores using persona context
4. **Thresholds** map scores to fit labels: Strong (12–15), Good (8–11), Partial (4–7), Not recommended (0–3)

M365 Copilot is only recommended via the prescreen fast-track path, never through the scored wizard.

## Testing

Playwright end-to-end tests run against a local static file server on port 4173.

```bash
npm install                  # install dependencies
npm test                     # run all tests headless
npm run test:headed          # run with browser visible
npx playwright test tests/e2e/wizard-completion.spec.js  # single test file
npx playwright test -g "completes full wizard"           # single test by name
```

Tests cover: wizard completion, shared link loading, temporal change detection, M365 fast-track path, and share button behavior.

## Conventions

- Always update `docs/CHANGELOG.md` after making changes.
- Always update `docs/FLOWCHART.md` and `docs/SCORING.md` after making changes that affect user flow or scoring logic.
- Question IDs in `apa.yaml` are not sequential (e.g., `q1, q8, q2, q4, q3`) — they preserve identity across schema changes. The display order is the array order in `apa.yaml`, not the numeric ID.
