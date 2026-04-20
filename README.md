# Agent Platform Advisor

Answer a few questions about what you're trying to build, and get a recommendation for the best Microsoft agent platform for your scenario.

[Try it out](https://microsoft.github.io/AgentPlatformAdvisor/index.html)

---

## What it does

The Agent Platform Advisor is a single-page web app that recommends the right Microsoft agent platform — **Agent Builder**, **Copilot Studio**, **Microsoft Foundry**, or **Microsoft 365 Copilot** — based on a short scored assessment.

From the welcome screen you choose one of three paths:

1. **Take the assessment** — a 5-question wizard that scores each platform and produces a recommendation
2. **Microsoft 365 Copilot fast-track** — skips the wizard when the user only needs built-in M365 Copilot experiences
3. **Guided exploration** — browse all four platforms with scenario-focused summaries before deciding whether to start the assessment

The assessment asks about:

- Who is building the agent (business user, low-code maker, developer, data scientist)
- Who will use it (internal employees or external users)
- Where users will interact with it (Microsoft 365 apps, a custom app, or background/event-triggered)
- What the agent should do (Q&A, multi-turn conversation, multi-step tasks, or complex orchestration)
- What data the agent needs to access (Microsoft 365 content, external systems, or advanced data sources)

After completing the assessment, you get:

- A primary recommendation with fit badge, key factors, and persona-specific tips
- A runner-up "Also Consider" card when a second platform is close
- A score comparison panel with animated per-platform score bars
- Contextual warnings when answer combinations are contradictory
- A "Why not?" explainer when the top two platforms score within 2 points
- A shareable link that encodes your answers and the recommendation date

The app also supports **dark mode** (toggle in the header, respects OS preference) and preserves wizard answers across page refreshes via sessionStorage.

## Project structure

```
agent-platform-advisor/
├── index.html              # App shell (YAML-driven)
├── apa.yaml                # Scoring matrix, questions, recommendations, and all content
├── assets/
│   ├── apa.css             # All styles (light + dark mode)
│   └── apa.js              # All JavaScript (state, rendering, scoring engine)
├── images/                 # Platform icons and favicons
├── docs/
│   ├── CHANGELOG.md        # Version history
│   ├── DESIGN.md           # Design system reference (Fluent 2)
│   ├── FLOWCHART.md        # Scoring pipeline decision tree
│   └── SCORING.md          # Scoring system reference
└── tests/
    └── e2e/                # Playwright end-to-end tests
```

The app is purely static — no build step, no backend. All content (questions, scores, platform descriptions, hard rules, tiebreakers, structure data, implementation checklists) lives in `apa.yaml` and is fetched at runtime. The YAML is validated against the expected schema on load.

## How scoring works

See [docs/SCORING.md](docs/SCORING.md) for the full reference and [docs/FLOWCHART.md](docs/FLOWCHART.md) for a visual decision tree. The short version:

1. **Hard rules** zero out platforms for certain answer combinations (e.g., Agent Builder is zeroed for external users, custom apps, background execution, or advanced data sources).
2. **Raw scores** are summed across all 5 questions (max 15 points per platform).
3. **Tiebreakers** in `apa.yaml` resolve equal scores using persona context (e.g., professional developer + tie → Copilot Studio preferred over Agent Builder).
4. **Thresholds** map final scores to fit labels: Strong fit (12–15), Good fit (8–11), Partial fit (4–7), Not recommended (0–3).

Microsoft 365 Copilot is only recommended via the prescreen fast-track path, never through the scored wizard.

## Running the tests

The project uses [Playwright](https://playwright.dev/) for end-to-end tests. Tests run against a local static file server on port 4173.

```bash
npm install
npm test              # headless
npm run test:headed   # with browser visible
```

25 tests across 5 spec files cover wizard completion, shared link loading, temporal change detection, the M365 fast-track path, and share button behavior. CI runs automatically on push and pull request via GitHub Actions.

## Sharing results

After completing the assessment, a **Share link** button copies a URL encoding your answers and the recommendation date. Recipients can view the recommendation directly or retake the assessment with your answers pre-filled (`?mode=wizard`).

If `apa.yaml` is updated after a link was shared and the recommendation has changed, the app shows a temporal change banner explaining what shifted. If the schema itself has changed (questions added or removed), a schema drift note explains that criteria have been updated.

## Contributing

Content changes (question text, scores, platform descriptions, hard rules) go in `apa.yaml`. UI changes go in `assets/apa.css` and `assets/apa.js`. Read [docs/DESIGN.md](docs/DESIGN.md) before making any visual changes — colors, spacing, typography, and component specs are all defined there.

Always update [docs/CHANGELOG.md](docs/CHANGELOG.md) after making changes. Update [docs/FLOWCHART.md](docs/FLOWCHART.md) and [docs/SCORING.md](docs/SCORING.md) if changes affect the scoring pipeline or user flow.
