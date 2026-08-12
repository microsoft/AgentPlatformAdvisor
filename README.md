# Agent Platform Advisor

Choose the right Microsoft agent experience for what you want to do: use built-in Copilot capabilities, delegate work to a personal agent, or build a custom agent on the right platform.

The live tool is at [https://microsoft.github.io/AgentPlatformAdvisor/index.html](https://microsoft.github.io/AgentPlatformAdvisor/index.html).

---

## What it does

The Agent Platform Advisor is a static single-page web app that helps people navigate the Microsoft agent landscape. It has evolved from a simple build-platform picker into a broader advisor for two distinct intents:

1. **Get work done** — an entry-point wizard routes end users to the right place to do the work — **Microsoft 365 Copilot**, **Copilot Cowork**, or **Microsoft Scout** — based on how the work should happen, not which product they name. When it lands on Microsoft 365 Copilot it also says which surface to start with: Copilot Chat, or a built-in agent such as Researcher, Analyst, Facilitator, or Interpreter.
2. **Build agents** — answer a scored assessment that recommends **Agent Builder**, **Copilot Studio**, or **Microsoft Foundry**.

The start page presents ways to use or build agents:

| Intent | Destination | Best for |
|---|---|---|
| Use | Microsoft 365 Copilot | Chat, Search, app-native help, built-in agents, and Agent Store — not chat only |
| Delegate | Copilot Cowork | Multi-step Microsoft 365 work: one-shot deliverables, schedules, event triggers, approvals |
| Delegate | Microsoft Scout | Always-on personal Autopilot across desktop, browser, local files, shell, and Microsoft 365 (Frontier preview) |
| Build | Agent Builder | No-code declarative agents inside Microsoft 365 Copilot (knowledge helpers — not actions/workflows) |
| Build | Copilot Studio | Governed low-code agents: actions, triggers, connectors, multi-agent (GA), eval, multi-channel |
| Build | Microsoft Foundry | Pro-code managed runtime: custom engine/models/retrieval, identity, networking, Azure-scale controls |

Explore also surfaces **adjacent (unscored) build paths**: SharePoint agents, Microsoft 365 Agents Toolkit (declarative), and custom engine agents.

## User paths

From **Get Started**, users choose one of three paths:

1. **Entry-point wizard** ("Help me find the right place to get work done") — asks how hands-on you want to be, then routes to Microsoft 365 Copilot (featuring either Copilot Chat or its built-in agents), Cowork, Scout, or a Cowork+Scout pair. Non-scored. Delegate path: cadence (one-shot / recurring-or-event / always-on) then reach; **reach is primary** for recurring and always-on (M365 → Cowork, cross-environment → Scout).
2. **Custom agent assessment** — runs the scored 5-question wizard for Agent Builder, Copilot Studio, and Foundry.
3. **Explore what's possible** — compares ways to use or build agents, plus adjacent paths (SharePoint agents, Agents Toolkit, custom engine).

The custom agent assessment asks about:

- Who is building the agent: business user, low-code maker, professional developer, or data scientist/AI engineer
- Who will use it: small internal team, broad internal audience, external users, or undecided
- Where users will interact with it: Microsoft 365 Copilot chat, custom app, background/event-triggered runtime, or multiple places
- What the agent should do: Q&A, multi-turn conversation, content/data analysis, multi-step action workflows, low-code multi-agent / business orchestration, or code-first multi-agent / custom runtime
- What information it needs: Microsoft 365 content, connector-backed systems, Dataverse/custom APIs, public web/uploaded files, or custom retrieval architecture

After completing a path, users get:

- A primary recommendation with fit badge, key factors, and platform-specific guidance
- A "Start Here" callout on entry-point results naming the surface to open first
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

There are two recommendation modes:

1. **Entry-point wizard** is non-scored. It first asks how hands-on the user wants to be:
   - Hands-on → **Microsoft 365 Copilot**, plus a task-type question that picks the starting surface: general help -> Copilot Chat; a specialized job (research, data, meetings, translation) -> a built-in agent (Researcher, Analyst, Facilitator, Interpreter)
   - Hand it off → cadence (one-shot / recurring-or-event / always-on) + reach: cross-environment → Scout; Microsoft 365 + concrete cadence → Cowork; undecided → both

   Copilot Chat and the built-in agents are surfaces *of* Microsoft 365 Copilot, not competing destinations, so the hands-on path always produces a single Microsoft 365 Copilot card.
2. **Custom agent assessment** is scored across Agent Builder, Copilot Studio, and Foundry:
   - Hard rules zero out platforms for disqualifying combinations before scoring.
   - Raw scores sum across 5 questions, with a maximum of 15 points per platform.
   - Persona preferences and tiebreakers adjust ranking when scores are tied or misleading for the selected builder persona.
   - Thresholds map scores to fit labels: Strong fit (12-15), Good fit (8-11), Partial fit (4-7), Not recommended (0-3).

Microsoft 365 Copilot, Cowork, and Scout are not part of the 0-15 scored wizard. They are reached only through the entry-point wizard.

## Current platform positioning

The advisor reflects the current split between Microsoft agent options:

- **Agent Builder** has expanded beyond SharePoint/OneDrive-only scenarios. It now covers no-code agents grounded in Microsoft 365 content, scoped web, uploaded files, and admin-enabled Microsoft 365 Copilot connectors, including lightweight content and data-analysis helpers.
- **Copilot Studio** is the default governed low-code path for enterprise agents that need actions, workflows, triggers, connectors, MCP tools, computer use, connected agents, evaluation, monitoring, and multi-channel deployment.
- **Microsoft Foundry** is the developer-controlled production runtime for prompt agents, hosted code agents, custom retrieval, managed endpoints, toolboxes, MCP, identity, private networking, tracing, evaluation, monitoring, and custom app/service integration.
- **Microsoft 365 Copilot** is treated as the built-in productivity layer, and as one product rather than several: Copilot Chat, Copilot Search, app-native Copilot, Pages, Notebooks, and Microsoft-built agents are all surfaces within it.
- **Copilot Cowork** and **Microsoft Scout** are personal agents you delegate work to, not platforms in the scored build assessment.

## Sharing results

Share links encode the recommendation path:

- Wizard results include selected answers, the recommended platform, and the recommendation date.
- Entry-point results include `dt=m365_copilot`, `dt=cowork`, `dt=scout`, or `dt=both`, plus `st=chat` or `st=agents` for the Microsoft 365 Copilot starting surface.
- Older links keep working: `ft=1` and `dt=copilot_chat` both resolve to the Microsoft 365 Copilot card.
- Recipients can view the recommendation directly or retake the assessment with answers pre-filled.

When `apa.yaml` changes after a link is shared, the app can show a temporal-change banner if the recommendation changed. If the question schema changes, a schema drift note explains that the criteria have been updated.

## Running the tests

The project uses [Playwright](https://playwright.dev/) for end-to-end tests. Tests run against a local static file server on port 4173.

```bash
npm install
npm test              # headless
npm run test:headed   # with browser visible
```

There are 94 Playwright tests across 15 spec files (including P2 constraints/export/feedback, share-link integrity, and temporal-banner XSS), plus a scored golden-path script (`scripts/golden_paths.py`, which needs `PyYAML` — install with `python3 -m pip install -r requirements.txt`). `npm test` runs the golden script first, then Playwright. Coverage includes wizard completion, optional governance constraints, shared links, temporal change, legacy fast-track, entry-point routing, share buttons, G01–G12 golden paths, share-link parameter validation, temporal-banner injection guards, and export/feedback. Single file: `npx playwright test tests/e2e/p2-features.spec.js`.

## Contributing

Content changes go in `apa.yaml`: questions, scores, recommendations, platform descriptions, hard rules, tiebreakers, delegate routing content, and exploration copy. UI behavior goes in `assets/apa.js`. Styles go in `assets/apa.css`.

Read [docs/DESIGN.md](docs/DESIGN.md) before making visual changes. Always update [docs/CHANGELOG.md](docs/CHANGELOG.md) after making changes. Update [docs/FLOWCHART.md](docs/FLOWCHART.md) and [docs/SCORING.md](docs/SCORING.md) when changes affect routing, scoring, hard rules, tiebreakers, or user flow.
