# Copilot Instructions — Agent Platform Advisor

## Architecture

A static single-page web app — no build step, no backend, no framework, no modules — deployed to GitHub Pages. `index.html` contains the markup for every section up front; `assets/apa.js` fetches `apa.yaml` at runtime, parses it with the js-yaml CDN script into one global `apa` object, and swaps sections with `showSection()`. Views are built as template-literal HTML strings assigned to `innerHTML`. All state and functions are file-level globals in `assets/apa.js`.

Key files:
- `apa.yaml` — source of truth for all content and scoring logic
- `assets/apa.js` — all JavaScript (state, rendering, scoring engine)
- `assets/apa.css` — all styles
- `index.html` — app shell

Content changes go in `apa.yaml`. UI logic goes in `assets/apa.js`. Styles go in `assets/apa.css`. Never hardcode user-facing platform copy in JS or HTML — it belongs in `apa.yaml` under `recommendations`, `questions`, or `adjacent_build_paths`. Start-page one-liners in `index.html` must stay aligned with recommendation cards.

## Local development

There is nothing to build, but the app must be served over HTTP — opening `index.html` from the filesystem breaks the `fetch('./apa.yaml')` call:

```bash
npx serve . -l 4173      # then open http://localhost:4173
```

## Testing

Playwright end-to-end tests. `playwright.config.js` starts the static server itself (`npx serve . -l 4173`, `reuseExistingServer` locally), so no separate server is needed.

```bash
npm install                                              # install dependencies
npm test                                                 # golden_paths.py then Playwright
npm run test:golden                                      # scored G01–G05/G11–G12 only
npm run test:e2e                                         # Playwright only
npm run test:headed                                      # run with browser visible
npx playwright test tests/e2e/wizard-completion.spec.js  # single test file
npx playwright test -g "completes full wizard"           # single test by name
```

Specs in `tests/e2e/`: `wizard-completion` (scored path), `delegate-path` (entry-point wizard), `golden-paths` (G01–G12 + callouts), `shared-link` and `temporal-change` (URL-loaded results), `fast-track` (legacy `?ft=1`), `share-buttons`. Scored calibration also lives in `scripts/golden_paths.py` and the table in `docs/SCORING.md`.

## Two paths through the app

**Scored wizard** — "Build a custom agent." Five questions score `agent_builder`, `copilot_studio`, and `foundry`.

**Entry-point wizard** — "Help me find the right place to get work done." Non-scored routing to `m365_copilot`, `cowork`, `scout`, or a Cowork+Scout pair, based on work pattern (involvement → task type, or cadence → reach) rather than product names. Logic lives in `resolveDelegateResult()` / `resolveDelegateStart()`.

Cadence options: `oneshot` | `recurring` | `alwayson` | `unsure`. **Reach is primary** for recurring/always-on: `cross` → Scout; `m365` + concrete cadence → Cowork; undecided → both. Scout is personal Autopilot / cross-environment — not “anything that isn’t one-shot.” Legacy aliases `ondemand`→`oneshot`, `continuous`→`alwayson` are accepted in JS.

Copilot Chat and the built-in agents (Researcher, Analyst, Facilitator, Interpreter) are **surfaces of** Microsoft 365 Copilot, not separate destinations. The task-type answer selects a `start_here` surface (`chat` or `agents`) rendered in the "Start Here" spotlight on the single `m365_copilot` card. Do not reintroduce them as sibling platforms.

**Agent Builder** is the no-code declarative path inside Microsoft 365 Copilot only — not SharePoint agents, not Agents Toolkit, not custom engine. Adjacent paths live in `apa.adjacent_build_paths` and per-card `adjacent_paths`. Q4 splits multi-agent: `q4d` low-code/business → CS strong; `q4f` code-first/custom runtime → Foundry strong.

## Scoring pipeline

Documented in `docs/SCORING.md` and `docs/FLOWCHART.md`:

1. **Hard rules** zero out platforms for disqualifying answer combinations
2. **Raw scores** sum across 5 questions (max 15 per platform)
3. **Tiebreakers** in `apa.yaml` resolve equal scores using persona context
4. **Thresholds** map scores to fit labels: Strong (12–15), Good (8–11), Partial (4–7), Not recommended (0–3)

`meta.platforms` lists four platforms, but `m365_copilot` is always zeroed in the scored wizard (`if (!fastTrack) zeroed['m365_copilot'] = true`), so only three can actually win. M365 Copilot is reached through the entry-point wizard, or via the legacy `?ft=1` / `?dt=copilot_chat` share links.

## Share-link contract

Result links are shared externally, so **old parameter shapes must keep resolving**. Add new params; don't repurpose existing ones.

| Param | Meaning |
|---|---|
| `q1`, `q8`, `q2`, `q4`, `q3` | Scored-wizard answers (option IDs) |
| `c=id1,id2` | Optional governance constraint soft boosts (e.g. `c_private_net`) |
| `dt=m365_copilot\|cowork\|scout\|both` | Entry-point destination |
| `st=chat\|agents` | Which M365 Copilot surface to feature |
| `r=<platform>` + `d=YYYYMMDD` | Original recommendation + date; drive the temporal-change banner |
| `mode=card\|wizard` | Render a result card or replay the wizard |
| `ft=1` (legacy), `dt=copilot_chat` (legacy) | Resolve to the M365 Copilot card |

Answers also persist in `sessionStorage` under `apa-answers`; URL params always win over stored answers.

## Design System

Always read `docs/DESIGN.md` before making any visual or UI decision. Fonts, colors, spacing, radius, shadows, motion, and aesthetic direction are defined there. Do not deviate without explicit user approval. In QA mode, flag any code that doesn't match `docs/DESIGN.md`.

Key constraints:

- Signal color is `#0078D4` in dark mode and `#005A9E` in light — one signal color only. Blue *text* on the dark canvas must use `#2B9AEE` (`#0078D4` is 3.94:1 and fails AA as text)
- Canvas is warm matte charcoal `#1A1714` with a faint grid — not blue-black, and no colored glows or `box-shadow` bloom on the accent
- Body font is `IBM Plex Sans`; `IBM Plex Mono` is only for scores, IDs, counters, badges, and diagnostic labels — not body text
- Font sizes are always `rem` via the `--fs-*` tokens on `:root`, never `px`. 12px (`--fs-mono-sm`) is the floor, and type never shrinks at mobile breakpoints

## Conventions

- Always update `docs/CHANGELOG.md` after making changes. Sections are dated by commit date (`## 2026-07-24`); work in progress sits under `## Unreleased` until it's committed.
- Always update `docs/FLOWCHART.md` and `docs/SCORING.md` after changes that affect user flow or scoring logic.
- Question IDs in `apa.yaml` are not sequential (e.g., `q1, q8, q2, q4, q3`) — they preserve identity across schema changes. Display order is the array order in `apa.yaml`, not the numeric ID.
- Entry-point cards (`ENTRY_POINT_PLATFORMS` in `apa.js`) render their accordions expanded; scored comparison cards stay collapsed.
- In tests, don't identify a recommendation card by a headline substring alone — several destinations share "Microsoft 365 Copilot" wording. Assert exact `.rec-platform-name` text plus something distinguishing.
