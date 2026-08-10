# Changelog

All notable changes to Agent Platform Advisor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), organized by repository commit date.

## Unreleased

### Added

- **`TODO.md` backlog for the mid-2026 guidance & scoring overhaul.** Prioritized P0–P3 work from a deep analysis of copy, routing, and scoring against current Microsoft Learn (Cowork schedules/event-driven tasks, CS multi-agent GA, Agent Builder vs Agents Toolkit vs custom engine, CS↔Foundry discrimination). Includes iteration plan (A–D), golden-path calibration table, acceptance criteria, and file touch lists — no product behavior changes yet.

### Changed

- **Refreshed platform guidance in `apa.yaml` for mid-2026 product updates** (content only — the scoring matrix is unchanged, so `docs/SCORING.md` distribution figures still hold). Verified against Microsoft Learn and June 2026 release notes that two constraints are still accurate and left them in place: the no-code **Agent Builder is still reactive Q&A/retrieval only** (no action execution or event triggers — MCP Apps add UI, not actions), and **Cowork is still Microsoft 365-only** (no desktop/shell/browser/local runtime), so its reach split with Scout is unchanged.
  - **Copilot Cowork now runs scheduled prompts.** Added a *Best For* line for scheduling recurring Microsoft 365 tasks (daily briefings, status roundups, inbox triage), and rewrote the "on demand and user-initiated" caution to distinguish Cowork's *scheduled/recurring* runs from Scout's *always-on, condition-monitoring* autonomy. Sourced from the Cowork overview (Learn, updated 2026-07-27).
  - **Microsoft Foundry:** called out the **Agent Optimizer** evaluate-and-optimize loop in the lifecycle bullet and added a *Best For* line for **Foundry Local on Azure Local** (air-gapped, disconnected, or on-premises deployment).
  - **Copilot Studio:** noted that **multi-agent orchestration is now generally available** (was preview) in the agent-to-agent orchestration bullet.
  - **Microsoft 365 Copilot:** added the **Agent Store** as a built-in capability entry (discover and add first- and third-party agents) and noted that agents can render **interactive UI (forms and cards) inline via MCP Apps** in the Copilot Chat description.

## 2026-07-24

### Changed

- **New favicon built from the app's own robot-face mark.** The previous `favicon.png` was the shared CAT icon at an odd 232×193, declared as `type="image/x-icon"` though it was a PNG. The replacement is the header logo's robot redrawn as a *solid* white head on the `#0078D4` tile, with the eyes and smile knocked out in blue and the side nubs kept as filled bars. Solid shapes were necessary: the outlined head reads as a robot at 32px but collapses into mush below ~24px, and dropping the outline entirely (so the tile acts as the head) reads as a generic smiley rather than an agent. Ships `favicon.svg` (scalable, used by Chrome/Firefox at every size), 16px/32px PNG fallbacks, and a full-bleed 180px `apple-touch-icon.png` with square corners, since iOS applies its own mask.
- **Repointed the Open Graph URLs at the live site.** `og:image`, `twitter:image`, and `og:url` all pointed under `microsoft.github.io/cat/agent-platform-advisor/`, which is now only a meta-refresh redirect stub — the app is served from `microsoft.github.io/AgentPlatformAdvisor/`. The old `og:image` path 404s, so link previews had no image to fetch regardless of which file it named; `og:url` also advertised the stub as the canonical URL. All three now use the `AgentPlatformAdvisor` host.
- **Replaced the Open Graph preview image with a screenshot of the app.** The card previously pointed at the shared `powercattools.png` CAT logo, which said nothing about this tool; links now unfurl to `images/og-image.png`, a 1200×630 capture of the start page showing the six platforms the advisor chooses between. Corrected `og:image:height` (was declared as `1200` for a 1200×1200 image), added `og:image:type` and a descriptive `og:image:alt`, and added `twitter:card="summary_large_image"` so X/Twitter renders the wide card instead of a thumbnail.
- **Refreshed `README.md` and `.github/copilot-instructions.md`** for the merged Microsoft 365 Copilot destination: the entry-point wizard now lists three destinations plus a starting surface, the share-link section documents `dt=m365_copilot` / `st=chat|agents` and the legacy `ft=1` / `dt=copilot_chat` links, and the test count is corrected to 39. The Copilot instructions also gained a local-dev note (the app must be served over HTTP or the `apa.yaml` fetch fails), a share-link parameter table, a spec-file map, single-test commands, and corrected design facts (IBM Plex fonts, warm charcoal canvas, rem `--fs-*` tokens with a 12px floor) that had drifted from `docs/DESIGN.md`.
- **Entry-point recommendation cards now open their accordions by default.** Microsoft 365 Copilot, Cowork, and Scout are single-card results with nothing to compare against — the card *is* the page — so *Best For*, *Important Considerations*, and the capability list start expanded instead of hiding the substance behind three clicks. Scored platform cards (Agent Builder, Copilot Studio, Foundry) stay collapsed so the comparison stays scannable. Driven by a new `ENTRY_POINT_PLATFORMS` constant in `apa.js`, replacing the `platformId === 'm365_copilot'` special case.
- **Merged the `copilot_chat` destination into `m365_copilot`.** Copilot Chat is a surface *of* Microsoft 365 Copilot — as is each built-in agent — so modeling it as a sibling destination to Cowork and Scout claimed a product boundary that doesn't exist (and, after the headline rename, produced two identically-titled cards). The entry-point wizard's hands-on path now always resolves to the single **Microsoft 365 Copilot** card.
  - The **task type** answer no longer picks a destination; it picks which surface the card tells you to **Start Here** with, rendered through the previously unused `spotlight` slot: general help → **Copilot Chat**, specialized task → **built-in agents** (Researcher, Analyst, Facilitator, Interpreter).
  - Added `recommendations.m365_copilot.start_here.{chat,agents}` to `apa.yaml` and folded the old `copilot_chat` guidance into `m365_copilot`'s new `best_for` / `watch_out_for`; deleted the `copilot_chat` recommendation block.
  - `resolveDelegateStart()` in `apa.js` derives the surface; `buildPlatformCard()` takes a `startKey` and labels the spotlight **Start Here** (a static `spotlight` still renders as *Featured Capability*).
  - Share links carry the surface as `&st=chat|agents`. The legacy `?dt=copilot_chat` link still works and resolves to Microsoft 365 Copilot with the Copilot Chat surface featured.
  - Cowork's and Scout's "use X instead" notes now point to *Microsoft 365 Copilot (Copilot Chat)* rather than a sibling product. Updated `docs/SCORING.md`, `docs/FLOWCHART.md`, the prescreen copy, and `tests/e2e/delegate-path.spec.js` (39 tests passing).
- **Renamed the `copilot_chat` destination headline to "Microsoft 365 Copilot"** (was "Copilot Chat"), which makes it share a headline with the `m365_copilot` destination. Updated `tests/e2e/delegate-path.spec.js` so the two are no longer distinguished by headline substring alone: a new `expectPrimaryCard()` helper asserts the exact `.rec-platform-name` text plus a description phrase unique to each destination ("conversational Microsoft 365 Copilot experience" vs. "Built-in, permission-aware AI across Microsoft 365"), so the two paths can't silently swap.
- **Rebuilt the type scale on rem tokens and raised every size one step.** An audit found the CSS had drifted a full step below the scale documented in `docs/DESIGN.md` — body copy shipped at 14px (20 rules) against a documented 15px, captions at 12px, and badges/eyebrows at 10-11px — and every one of the 74 `font-size` declarations used `px`, so a reader's browser font-size preference had no effect.
  - Added `--fs-display` … `--fs-mono-sm` rem tokens on `:root` and `html { font-size: 100% }`; all 74 declarations now reference a token.
  - Sizes move up one step: body 14 → 15/16px, caption 13 → 14px, mono 12 → 13px, and everything at 10-11px comes up to a **12px floor** (`.sc-badge`, `.pq-legend`, `.rec-spotlight-eyebrow`, `.exploration-card-spotlight-eyebrow`).
  - Removed the two responsive overrides that *shrank* text on small screens (`.progress-bar` → 11px at 768px, `.sc-badge` → 10px at 480px).
  - Capped running prose at `70ch` — the 1024px container was producing ~95ch lines.
  - Updated the `docs/DESIGN.md` type scale with the token names plus rules on rem-only sizing, the 12px floor, no mobile shrinkage, and measure.
- **Made the start-page platform tiles read as informational, not clickable.** They were styled as bordered, filled cards with a hover border-color change, which implied they were selectable. Removed the hover treatment and the card chrome (filled background, full border, rounded corners) in favor of flat, center-aligned entries separated by a hairline top rule, plus `cursor: default`. Added a lead-in line — "Here's what the advisor chooses between — select **Get Started** below to find your fit." — so the section reads as a preview of the destinations rather than a menu.
- **Center-aligned the start-page platform previews** — icon, title, and description all sit on a shared center axis (`.platform-preview-icon` is a centered flex box; `.platform-preview` is `text-align: center`).
- **Increased the platform preview card title** from 16px to 20px, matching the `subhead` type token in `docs/DESIGN.md`, so platform names read as card titles rather than body copy.
- **Increased the delegate group label size** from 11px to 13px (weight 500 → 600) so the "…" section dividers above the delegate platform grid are legible at a glance.
- **Swapped the teal signal color for Microsoft blue** at the user's request: the accent used for selected options, progress, the winning platform, focus rings, and primary CTAs is now `#0078D4` (hover `#2B9AEE`, dim `#0B5187`) in dark mode and `#005A9E` in light mode. Warm charcoal canvas, neutrals, typography, and the no-glow rule are unchanged; `--success` / `--warning` / `--error` semantics are untouched. Updated `docs/DESIGN.md`.

## 2026-07-22

### Changed

- **Replaced the two-question delegate path with an entry-point wizard** ("Where should you get this work done?") that helps end users choose between Copilot Chat, Microsoft 365 Copilot's built-in agents, Cowork, and Scout from work patterns instead of product names — addressing the pain point of Microsoft asking users to pick among too many entry points.
  - New first question — **Involvement**: stay hands-on and iterate vs. hand it off to an agent.
  - **Hands-on** now asks a follow-up — **Task type**: general help (→ **Copilot Chat**) vs. a specialized task (→ **Microsoft 365 Copilot built-in agents**: Researcher, Analyst, Facilitator, Interpreter, …).
  - **Hand it off** asks Cadence + Reach (→ **Cowork**, **Scout**, or both). The wizard uses **progressive disclosure**: each follow-up is revealed only when its branch is chosen (smooth grid expand, respects `prefers-reduced-motion`), and collapsed follow-ups leave the tab order — no dimmed/greyed dead content. **Reach is now gated behind Cadence** — selecting "Hand off the whole task" reveals only the Cadence question; the Reach question ("Where does it need to reach?") appears once a cadence is picked, so both delegate follow-ups no longer show at once.
  - **Removed the standalone "built-in Microsoft 365 Copilot experience" prescreen tile** — that destination is now reached through the wizard, eliminating the naming overlap with Copilot Chat. `m365_copilot` is reused as the wizard destination; the legacy `?ft=1` share link still resolves to the same card.
  - Reframed the prescreen entry to **"Help me find the right place to get work done."**
  - Added a `copilot_chat` recommendation block to `apa.yaml` with `use X instead when…` cross-references to the built-in agents, Cowork, and Scout (and vice versa).
  - Shareable via `?dt=copilot_chat` and `?dt=m365_copilot`.
  - Tightened the wizard option copy to echo the "Microsoft 365 Copilot: what to use and when" task vocabulary — general help (brainstorm, find info, catch up on email/meetings, draft & edit docs), on-demand (multi-step job / multiple artifacts in one go), and continuous (always-on, manage & coordinate my day) — so users self-identify faster.
  - Updated `docs/SCORING.md` and `docs/FLOWCHART.md`; extended Playwright coverage for the entry-point wizard and built-in-agents destination.
- **Refreshed the visual identity to the Warm Charcoal Instrument** (via `/design-shotgun`): the previous near-black `#0C0F14` canvas with a single cyan-blue signal glow read as the generic AI-tool aesthetic. New system keeps IBM Plex Sans/Mono but swaps to a warm matte charcoal canvas (`#1A1714`, no blue-black) with a single restrained **teal** signal (`#17B0A7`) and no colored glows.
  - Retokenized dark + light `:root` palettes; removed the two blue `box-shadow` glows and the blue canvas grid tint.
  - Updated `docs/DESIGN.md` (direction, color table, light-mode note, no-glow rule, Decisions Log). All 38 Playwright tests passing.
## 2026-07-20

### Added

- Added a content-analysis task option for lightweight document, chart, image, and data-analysis scenarios.
- Added a web/uploaded-files data option for scoped web sources, PDFs, Office files, and embedded content.

### Changed

- **Implemented Graphite Decision Instrument design system** across the entire application:
  - Dark graphite canvas (`#0C0F14`) with subtle grid texture as default theme
  - IBM Plex Sans + IBM Plex Mono typography (replacing Segoe UI / Geist Mono)
  - Azure-cyan `#2BA8FF` accent for all signal colors, progress, and CTAs
  - Dark-first approach: dark is default, light mode is the alternate
  - Updated type scale: title 36px, heading 26px, subhead 20px, body 15px
  - Refined component styling: lit-edge cards, instrument-grade score bars, surface hierarchy
  - Maintained full WCAG AA contrast compliance
  - All 32 Playwright tests passing
- Updated `README.md` to reflect the current evolution of the tool: built-in Copilot use, personal-agent delegation, ways to use or build agents, current platform positioning, delegate routing, and the latest test coverage.
- Refreshed Agent Builder guidance and scoring for current capabilities: Microsoft 365 content, scoped web, uploaded files, Teams/Outlook/People knowledge, admin-enabled Microsoft 365 Copilot connectors, code interpreter, and image generation.
- Repositioned Agent Builder beyond SharePoint/OneDrive-only scenarios and increased scores for small-team no-code knowledge, connector-backed, web/uploaded-file, and lightweight content/data-analysis scenarios.
- Clarified that Agent Builder remains disqualified for external audiences, custom app deployment, background/event-driven execution, direct business system integrations, custom retrieval architectures, and multi-step action workflows that submit forms or update external systems.
- Split internal audience guidance into small-team versus broad internal deployment and clarified connector-backed business systems, direct business integrations, and custom retrieval architectures.
- Refreshed Copilot Studio guidance and scoring for the latest agent experience, generative orchestration, event-triggered workflows, computer use, MCP tools/resources, connected/child agents, A2A integrations, Microsoft IQ, Foundry IQ preview, per-user memory preview, model selection, built-in evaluation, monitoring, agent inventory, and Copilot Credits cost considerations.
- Increased Copilot Studio scoring for background/event-triggered agents, Dataverse/custom connector/API integration, complex-but-low-code orchestration, and AI/ML personas, while preserving Foundry as the stronger fit for custom model training, arbitrary BYO model/runtime control, high-scale code-first orchestration, and custom retrieval architecture.
- Split data-source guidance into business-system integration (Dataverse, custom connectors, direct APIs: Copilot Studio strongest) and custom retrieval architecture (custom RAG, Azure AI Search, private indexes, Foundry IQ, engineering-managed retrieval: Foundry strongest). The scored matrix now has 1,920 answer combinations.
- Refreshed Microsoft Foundry guidance and scoring to reflect current Foundry Agent Service capabilities: prompt-based agents, hosted code agents, stable managed endpoints, publishing to Microsoft 365 Copilot and Teams, custom app/service integration, Foundry IQ, toolboxes, MCP, agent identities, RBAC, private networking, tracing, evaluation, optimization, monitoring, and Azure-scale production controls.
- Increased Foundry scoring for custom app deployment, multi-surface deployment, Microsoft 365 Copilot/Teams publishing, developer-controlled content/data analysis, and Microsoft 365/web/file grounding, while keeping Foundry strongest for custom retrieval architecture and full-code production agents.
- Removed over-specific Foundry memory-positioning language and replaced it with more conservative production-runtime guidance.
- Refreshed Microsoft 365 Copilot guidance to cover Copilot Chat, Copilot Search, app-native Copilot experiences, Copilot Pages and Notebooks, and Microsoft-built agents as the built-in productivity layer for licensed internal users.
- Added Copilot Search and Copilot Pages/Notebooks to the Microsoft 365 Copilot recommendation card, updated Researcher to use the official Learn page, and clarified Facilitator and Interpreter capabilities.
- Added Cowork and Scout as their own cards on the Explore page.
- Updated the recommendation-card accordion label so Microsoft 365 Copilot can show built-in capabilities alongside first-party agents.
- Moved the "Use agents" home-page row above the "Build agents" row, with Microsoft 365 Copilot, Cowork, and Scout shown before Agent Builder, Copilot Studio, and Microsoft Foundry.
- Reorganized the Explore page into a three-card desktop grid so the six cards form two rows of three.
- Moved README, Changelog, Flowchart, and Scoring links from the header hamburger menu into a footer documentation row beneath the "Created by" credit.
- Corrected the Explore starting-point copy to use the approved "ways to use or build agents" decision model.
- Grouped the Explore page into "Use agents" and "Build agents" sections so the page reflects the current decision model instead of a flat gallery.
- Replaced the design system with the Graphite Decision Instrument direction: dark graphite surfaces, IBM Plex typography, Azure-cyan signal color, decision rails, evidence panels, and stricter anti-slop rules.
- Updated `docs/SCORING.md` and `docs/FLOWCHART.md` to match the current scoring matrix and recommendation guidance.

## 2026-07-14

### Added

- Added a separate Cowork and Scout delegate group on the landing page.
- Added short captions beneath all platform and delegate tiles.

### Changed

- Centered delegate cards beneath the four build platforms under an "Or delegate" divider.
- Renamed `LICENSE.md` to `LICENSE`.

## 2026-07-13

### Added

- Added Copilot Cowork and Microsoft Scout as delegate destinations in `apa.yaml`, with recommendation content and imagery.
- Added a prescreen path for users who want a ready-made agent to do work for them.
- Added cadence/reach routing for Cowork versus Scout: on-demand Microsoft 365 work routes to Cowork; continuous or cross-environment work routes to Scout; undecided signals show both.
- Added shareable delegate result URLs via `dt=cowork|scout|both`.
- Added end-to-end tests for delegate path routing and URL loading.

### Changed

- Documented the delegate path in `docs/CHANGELOG.md`, `docs/FLOWCHART.md`, and `docs/SCORING.md`.

## 2026-06-10

### Added

- Added `.github/improvements.md`.

### Changed

- Elevated Copilot Cowork across Microsoft 365 Copilot surfaces.
- Added a dedicated Cowork spotlight on the Microsoft 365 Copilot recommendation card.
- Updated Microsoft 365 Copilot recommendation, exploration, and start-page copy to lead with Cowork and first-party agents.

## 2026-05-09

### Changed

- Bumped `fast-uri` from 3.1.0 to 3.1.2 in `package-lock.json`.

## 2026-04-30

### Changed

- Updated recommendation and assessment text based on feedback.

## 2026-04-24

### Added

- Added the repository license.
- Added bug report and feature request issue templates.

### Changed

- Updated issue templates.

## 2026-04-21

### Changed

- Auto-expanded Microsoft 365 Copilot accordions on the fast-track recommendation path.
- Updated Microsoft 365 Copilot recommendation content.
- Adjusted Cowork information in the Microsoft 365 Copilot surfaces.

### Fixed

- Fixed README formatting.

## 2026-04-20

### Added

- Added a hamburger documentation menu in the header with links to README, Changelog, Flowchart, and Scoring docs.
- Added `.github/copilot-instructions.md`.

### Changed

- Updated README to reflect v2 features and current state.
- Updated changelog structure.
- Updated the landing page.
- Refreshed the prescreen UI with icons, colored accents, and updated typography.

### Removed

- Removed `CLAUDE.md` after moving relevant instructions to `.github/copilot-instructions.md`.

## 2026-04-10

### Changed

- Removed the Agent Builder hard rule for connector-backed business systems (`q3b`), reflecting limited but non-zero connector capability.
- Updated Agent Builder scoring for mixed Microsoft 365 plus connector-backed systems (`q3d`).
- Updated `docs/FLOWCHART.md` and `docs/SCORING.md` for the scoring changes.

### Removed

- Removed the duplicate root `CHANGELOG.md`; `docs/CHANGELOG.md` became the single changelog source.

## 2026-04-08

### Added

- Added Clarity analytics.
- Added documentation updates for scoring and flowchart behavior.

### Changed

- Updated scoring and result logic.
- Moved the share-results button into the recommendation flow.
- Updated `apa.yaml`, `assets/apa.js`, `assets/apa.css`, `index.html`, and Playwright tests for the revised logic.

## 2026-04-07

### Added

- Added the initial Agent Platform Advisor v2 static web app: `apa.yaml`, `assets/apa.css`, `assets/apa.js`, and `index.html`.
- Added platform imagery for Agent Builder, Microsoft 365 Copilot, Copilot Studio, and Microsoft Foundry.
- Added initial README and changelog files.
- Added Microsoft-required `SECURITY.md`.
- Added design, scoring, and flowchart docs under `docs/`.
- Added Playwright configuration and end-to-end tests for fast-track, sharing, shared links, temporal changes, and wizard completion.
- Added package manifest and lockfile.
- Added favicon and image fixes.
- Added a resources CTA button.

### Changed

- Refined initial UI, CSS, and app behavior.
- Updated `.gitignore`.
- Updated README and app content after the initial import.

### Removed

- Removed temporary `TODOS.md`.
