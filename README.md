# Agent Platform Advisor

Choose the right Microsoft agent experience for what you want to do: use built-in Copilot capabilities, delegate work to a personal agent, or build a custom agent on the right platform.

The live tool is at [https://microsoft.github.io/AgentPlatformAdvisor/index.html](https://microsoft.github.io/AgentPlatformAdvisor/index.html).

---

## What it does

The Agent Platform Advisor is a static single-page web app that helps people navigate the Microsoft agent landscape. It has evolved from a simple build-platform picker into a broader advisor for three distinct intents:

1. **Use agents** — start with built-in Microsoft 365 Copilot experiences when they already cover the need.
2. **Delegate work** — choose between ready-made personal agents, **Copilot Cowork** and **Microsoft Scout**.
3. **Build agents** — answer a scored assessment that recommends **Agent Builder**, **Copilot Studio**, or **Microsoft Foundry**.

The start page presents six ways to use or build agents:

| Intent | Destination | Best for |
|---|---|---|
| Use | Microsoft 365 Copilot | Built-in, permission-aware chat, search, app-native Copilot, Pages, Notebooks, and Microsoft-built agents |
| Delegate | Copilot Cowork | On-demand multi-step Microsoft 365 work with approval checkpoints |
| Delegate | Microsoft Scout | Always-on, proactive work across desktop, browser, local files, shell, and Microsoft 365 |
| Build | Agent Builder | No-code Microsoft 365 Copilot agents for small-team knowledge, web, file, and connector-backed scenarios |
| Build | Copilot Studio | Governed low-code agents with tools, workflows, triggers, evaluation, monitoring, and broad deployment |
| Build | Microsoft Foundry | Code-first production agents with managed runtime, custom retrieval, identity, networking, observability, and Azure-scale controls |

## User paths

From **Get Started**, users choose one of four paths:

1. **Built-in Microsoft 365 Copilot fast-track** — skips the wizard and recommends Microsoft 365 Copilot when first-party Copilot capabilities and agents already solve the scenario.
2. **Ready-made agent delegation** — asks two routing questions, then recommends Cowork, Scout, or both as a complementary pair.
3. **Custom agent assessment** — runs the scored 5-question wizard for Agent Builder, Copilot Studio, and Foundry.
4. **Explore what's possible** — compares ways to use or build agents before deciding whether to take the assessment.

The custom agent assessment asks about:

- Who is building the agent: business user, low-code maker, professional developer, or data scientist/AI engineer
- Who will use it: small internal team, broad internal audience, external users, or undecided
- Where users will interact with it: Microsoft 365 Copilot chat, custom app, background/event-triggered runtime, or multiple places
- What the agent should do: Q&A, multi-turn conversation, content/data analysis, multi-step action workflows, or complex orchestration
- What information it needs: Microsoft 365 content, connector-backed systems, Dataverse/custom APIs, public web/uploaded files, or custom retrieval architecture

After completing a path, users get:

- A primary recommendation with fit badge, key factors, and platform-specific guidance
- A secondary "Also Consider" card when another option is close or complementary
- A score comparison panel for the scored wizard
- Contextual warnings for contradictory answer combinations
- A "Why not?" explainer when the top two scored platforms are within 2 points
- A shareable link that encodes the path, answers, recommendation, and recommendation date

The app supports dark mode, browser history navigation, answer persistence through `sessionStorage`, shared result links, and temporal-change banners when a saved recommendation changes after `apa.yaml` is updated.

## Project structure

```text
agent-platform-advisor/
├── index.html              # App shell and static markup
├── apa.yaml                # Source of truth for questions, scores, routing, recommendations, and content
├── assets/
│   ├── apa.css             # All styles, theme tokens, responsive layout, and dark mode
│   └── apa.js              # State, rendering, routing, scoring engine, sharing, and persistence
├── images/                 # Platform icons and favicons
├── docs/
│   ├── CHANGELOG.md        # Version history
│   ├── DESIGN.md           # Design system reference
│   ├── FLOWCHART.md        # Scoring and routing decision tree
│   └── SCORING.md          # Scoring system reference
└── tests/
    └── e2e/                # Playwright end-to-end tests
```

The app is purely static: no backend, no bundler, and no build step. `index.html` loads `assets/apa.js`, which fetches `apa.yaml` at runtime and renders the experience from that data.

## How recommendation logic works

See [docs/SCORING.md](docs/SCORING.md) for the full reference and [docs/FLOWCHART.md](docs/FLOWCHART.md) for the visual decision tree.

There are three recommendation modes:

1. **Microsoft 365 Copilot fast-track** is non-scored. It is selected only when the user explicitly wants a built-in Microsoft 365 Copilot experience.
2. **Cowork and Scout delegation** is non-scored. A two-question micro-decision routes on cadence and reach:
   - Continuous work or cross-environment reach -> Scout
   - On-demand work inside Microsoft 365 -> Cowork
   - Undecided signals -> both
3. **Custom agent assessment** is scored across Agent Builder, Copilot Studio, and Foundry:
   - Hard rules zero out platforms for disqualifying combinations before scoring.
   - Raw scores sum across 5 questions, with a maximum of 15 points per platform.
   - Persona preferences and tiebreakers adjust ranking when scores are tied or misleading for the selected builder persona.
   - Thresholds map scores to fit labels: Strong fit (12-15), Good fit (8-11), Partial fit (4-7), Not recommended (0-3).

Microsoft 365 Copilot, Cowork, and Scout are not part of the 0-15 scored wizard. They are reached only through their prescreen paths.

## Current platform positioning

The advisor reflects the current split between Microsoft agent options:

- **Agent Builder** has expanded beyond SharePoint/OneDrive-only scenarios. It now covers no-code agents grounded in Microsoft 365 content, scoped web, uploaded files, and admin-enabled Microsoft 365 Copilot connectors, including lightweight content and data-analysis helpers.
- **Copilot Studio** is the default governed low-code path for enterprise agents that need actions, workflows, triggers, connectors, MCP tools, computer use, connected agents, evaluation, monitoring, and multi-channel deployment.
- **Microsoft Foundry** is the developer-controlled production runtime for prompt agents, hosted code agents, custom retrieval, managed endpoints, toolboxes, MCP, identity, private networking, tracing, evaluation, monitoring, and custom app/service integration.
- **Microsoft 365 Copilot** is treated as the built-in productivity layer: Copilot Chat, Copilot Search, app-native Copilot, Pages, Notebooks, and Microsoft-built agents.
- **Copilot Cowork** and **Microsoft Scout** are personal agents you delegate work to, not platforms in the scored build assessment.

## Sharing results

Share links encode the recommendation path:

- Wizard results include selected answers, the recommended platform, and the recommendation date.
- Delegate results include `dt=cowork`, `dt=scout`, or `dt=both`.
- Recipients can view the recommendation directly or retake the assessment with answers pre-filled.

When `apa.yaml` changes after a link is shared, the app can show a temporal-change banner if the recommendation changed. If the question schema changes, a schema drift note explains that the criteria have been updated.

## Running the tests

The project uses [Playwright](https://playwright.dev/) for end-to-end tests. Tests run against a local static file server on port 4173.

```bash
npm install
npm test              # headless
npm run test:headed   # with browser visible
```

There are 32 tests across 6 spec files covering wizard completion, shared link loading, temporal change detection, the Microsoft 365 Copilot fast-track path, delegate path routing, and share button behavior. CI runs automatically on push and pull request via GitHub Actions.

## Contributing

Content changes go in `apa.yaml`: questions, scores, recommendations, platform descriptions, hard rules, tiebreakers, delegate routing content, and exploration copy. UI behavior goes in `assets/apa.js`. Styles go in `assets/apa.css`.

Read [docs/DESIGN.md](docs/DESIGN.md) before making visual changes. Always update [docs/CHANGELOG.md](docs/CHANGELOG.md) after making changes. Update [docs/FLOWCHART.md](docs/FLOWCHART.md) and [docs/SCORING.md](docs/SCORING.md) when changes affect routing, scoring, hard rules, tiebreakers, or user flow.
