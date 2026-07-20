# Changelog

All notable changes to Agent Platform Advisor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), organized by repository commit date.

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
