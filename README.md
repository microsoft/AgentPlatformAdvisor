# Agent Platform Advisor

Answer a few questions about what you're trying to build, and get a recommendation for the best Microsoft agent platform for your scenario.

**[Try it live →](https://microsoft.github.io/cat/agent-platform-advisor/index.html)**

## What It Does

The Agent Platform Advisor is an interactive assessment that evaluates your scenario across five dimensions — builder persona, target audience, deployment surface, agent capabilities, and data access — then recommends one of four Microsoft platforms:

| Platform | Best for |
|---|---|
| **Agent Builder** | No-code agents within Microsoft 365 |
| **Microsoft 365 Copilot** | Built-in Copilot experiences across M365 apps |
| **Copilot Studio** | Low-code agents connecting to external systems |
| **Microsoft Foundry** | Custom-coded agents with full AI/ML control |

Results include fit badges, key scoring factors, score breakdowns, and shareable links.

## How It Works

The app is entirely **YAML-driven**. All questions, scoring weights, hard rules, recommendation copy, and platform content are defined in [`apa.yaml`](apa.yaml). The JavaScript engine reads this file at runtime, runs a weighted scoring pipeline, and renders the recommendation — no build step required.

**Scoring pipeline:**
1. **Hard rules** — Zero out platforms that can't meet hard constraints (e.g., Agent Builder can't publish externally)
2. **Raw scoring** — Sum per-platform weights (0–3) across all answered questions (max 15)
3. **Threshold mapping** — Strong fit (12–15), Good fit (8–11), Partial fit (4–7), Not recommended (0–3)
4. **Tie handling** — If the top two platforms are within 2 points, present them as a complementary pair

## Project Structure

```
index.html       # Page structure and section markup
apa.yaml         # All content, questions, scoring, and recommendations
assets/
  apa.js         # Scoring engine, rendering, state management
  apa.css        # Styles (Fluent 2 design tokens, CSS custom properties)
images/          # Platform logos and favicon
```

## Running Locally

No dependencies or build step. Open `index.html` in a browser, or serve with any static file server:

```sh
npx serve .
# or
python -m http.server
```

> **Note:** The app fetches `apa.yaml` via `fetch()`, so opening `index.html` directly from the filesystem may be blocked by CORS. Use a local server.

## Contributing

To change questions, scoring, or recommendation copy, edit **`apa.yaml`** only — no JS changes needed for content updates.

If you encounter a problem, please [create an issue](https://github.com/microsoft/AgentPlatformAdvisor/issues/new).

## Credits

Created by [Robert Standefer](https://www.linkedin.com/in/rstandefer/) and the [Microsoft Copilot Acceleration Team](https://aka.ms/wearecat).
