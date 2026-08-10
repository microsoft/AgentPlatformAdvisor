# Scoring System — Agent Platform Advisor

Reference document for how the APA scoring engine works. All data is driven from `apa.yaml`.

## Platforms

| ID | Label | Description |
|---|---|---|
| `agent_builder` | Agent Builder | No-code declarative agents **inside Microsoft 365 Copilot** (not all declarative agents) |
| `m365_copilot` | Microsoft 365 Copilot | Built-in Copilot experiences — Chat, Search, app-native assistance, Agent Store, and Microsoft-built agents (entry-point wizard only) |
| `copilot_studio` | Copilot Studio | Governed low-code enterprise agents with tools, workflows, triggers, multi-agent (GA), computer use, evaluation, monitoring, and broad publishing |
| `foundry` | Microsoft Foundry | Managed production agent runtime for prompt agents, hosted code agents, custom retrieval, tools, identity, observability, and Azure-scale controls |

M365 Copilot is excluded from the scored assessment. It is only recommended via the entry-point wizard (or the legacy `?ft=1` / `?dt=copilot_chat` share links). In the full wizard, `m365_copilot` is always zeroed.

### Adjacent build paths (unscored)

Microsoft’s build taxonomy is wider than the three scored winners. Explore and recommendation footnotes surface:

| Path | When |
|---|---|
| **SharePoint agents** | Site/library-scoped Q&A; no-code; SharePoint + Teams + M365 Copilot |
| **Microsoft 365 Agents Toolkit (declarative)** | Pro-code API plugins, Adaptive Cards, CI/CD — still Copilot orchestrator |
| **Custom engine agents** | Bring-your-own orchestrator/models → Foundry / Agents SDK |

These are **not** scored winners. Agent Builder hard zeros for actions/background/external/custom app/custom RAG remain correct for the *no-code Builder* path only — do not credit Builder for Toolkit-only capabilities.

## Non-scored destinations: entry-point wizard (Microsoft 365 Copilot, Cowork & Scout)

Microsoft 365 Copilot, Cowork, and Scout are **not** build platforms — they are ready-made places to *get work done*, not platforms you build on. They are **not** part of the scored wizard, are **not** in `meta.platforms`, and never enter the 0–15 sum. They are reached via the prescreen path **"Help me find the right place to get work done,"** which opens a short **entry-point wizard** ("Where should you get this work done?"). This wizard exists because Microsoft asks end users to choose between too many entry points (Microsoft 365 Copilot vs. Cowork vs. Scout); the wizard resolves that choice from work patterns instead of product names. There is no longer a separate "built-in Microsoft 365 Copilot experience" prescreen tile — that destination now lives inside this wizard.

**Copilot Chat is not a destination.** Copilot Chat and the built-in agents (Researcher, Analyst, Facilitator, Interpreter, …) are *surfaces of* Microsoft 365 Copilot, not products that compete with it. Staying hands-on therefore always resolves to the single `m365_copilot` card; the task-type answer only selects which surface the card tells you to **Start Here** with, via `recommendations.m365_copilot.start_here` in `apa.yaml` (`chat` or `agents`).

The first question forks the flow:

| Question | Options |
|---|---|
| **Involvement** — how do you want to work? | Stay hands-on and iterate turn-by-turn · Hand it off and let an agent run |

- **Hands-on / interactive** → a follow-up asks **what kind of task** it is:

  | Question | Options |
  |---|---|
  | **Task type** | General help (brainstorm, find info, catch up on email/meetings, draft & edit documents) · A specialized task (deep research, data analysis, meeting facilitation, translation) |

  Both answers resolve to **Microsoft 365 Copilot** (`m365_copilot`). General selects the **Copilot Chat** start surface; specialized selects the **built-in agents** start surface (Researcher, Analyst, Facilitator, Interpreter, …). Interactive deep research → Researcher; hand off a research deliverable → Cowork (delegate path).

- **Hand it off / delegate** → two follow-up questions decide between Cowork and Scout. They are asked **progressively**: Cadence appears first, and Reach is revealed only once a cadence has been answered (so both questions never show at once).

  | Question | Options |
  |---|---|
  | **Cadence** (asked first) — how should the work run? | **One-shot deliverable** · **Recurring or event-triggered** (schedules, inbox/Teams triggers, repeating briefings) · **Always-on personal Autopilot** · Not sure |
  | **Reach** (revealed after Cadence; **primary** for recurring/always-on) — where does it need to reach? | Microsoft 365 only · Also desktop/browser/local/CLI · Not sure |

**Routing rule** (`resolveDelegateResult(involvement, taskType, cadence, reach)` in `apa.js`):

| Condition | Result |
|---|---|
| Involvement = interactive | **Microsoft 365 Copilot** (`m365_copilot`) — `resolveDelegateStart` then picks the start surface: specialized → `agents`, general → `chat` |
| Reach = cross-environment | **Scout** |
| Reach = Microsoft 365 **and** cadence ∈ {oneshot, recurring, alwayson} | **Cowork** |
| Otherwise (undecided cadence or reach) | **Both** (Cowork + Scout), shown as a complementary pair |

**Rule notes:**

- Reach is primary for recurring/event and always-on work. Daily briefings, inbox triage on a schedule, and “when a VIP emails me…” that stay inside Microsoft 365 → **Cowork**.
- Always-on + M365-scoped → **Cowork** (still M365 schedules/triggers). Always-on across desktop + M365 → **Scout**.
- Scout is the personal Autopilot / cross-environment / desktop-app identity path — **not** “anything that isn’t one-shot.”
- Legacy option ids `ondemand` / `continuous` still map to `oneshot` / `alwayson` inside `resolveDelegateResult` if ever passed.
- Share links use `dt=cowork|scout|both|m365_copilot` (and legacy `dt=copilot_chat`, `ft=1`) — cadence values are not URL params.

**Readiness** (`isDelegateReady` in `apa.js`): interactive requires a task type; delegate requires both cadence and reach before the wizard can finish.

> `m365_copilot` still exists in `meta.platforms` for content, but is always zeroed in the scored wizard (`if (!fastTrack) zeroed['m365_copilot'] = true`) — it only surfaces as this wizard destination. The legacy `?ft=1` share link still resolves to the same card for backward compatibility, as does the legacy `?dt=copilot_chat` link (it maps to `dt=m365_copilot` with the `chat` start surface). New share links carry the surface as `&st=chat|agents`.

## Questions and Scoring Matrix

Five questions, each scored 0–3 per platform. Max raw score: **15** (5 × 3). Q4 has six options (including the q4d / q4f multi-agent split); still one answer per question.

### Q1 — Who is building this agent?

| Option | ID | Agent Builder | CS | Foundry |
|---|---|---|---|---|
| Business user / SME — no coding | q1a | **3** | 1 | 0 |
| Low-code maker / IT pro | q1b | 1 | **3** | 0 |
| Professional developer | q1c | 0 | 2 | **3** |
| Data scientist / ML engineer | q1d | 0 | 1 | **3** |

CS gets 2 for q1c because it supports pro developers via YAML authoring and the VS Code extension. Pro-dev building **API-plugin declarative agents** for M365 Copilot should also see **Agents Toolkit** guidance (unscored) — Foundry is not the only answer.

### Q8 — Who will use this agent?

Audience scope separates Agent Builder's quick small-team sweet spot from Copilot Studio's managed deployment model. External-facing remains a hard constraint that eliminates Agent Builder and M365 Copilot.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Me or a small internal team | q8a | **3** | 2 | 1 | — |
| Department or broad internal audience | q8c | 1 | **3** | 2 | — |
| External users | q8b | 0 | **3** | **3** | Zeros AB, M365 |
| Not decided yet | q8d | 2 | 2 | 1 | — |

### Q2 — Where will users interact with this agent?

Deployment surface is still a hard constraint. Agent Builder runs inside Microsoft 365 Copilot chat surfaces, not custom apps or event-driven runtimes.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Microsoft 365 Copilot chat | q2a | **3** | **3** | 2 | — |
| Custom app (website/mobile) | q2b | 0 | **3** | **3** | Zeros AB |
| Background (event-driven) | q2c | 0 | **3** | **3** | Zeros AB |
| Multiple / not decided | q2d | 1 | **3** | **3** | — |

Foundry scores higher for deployment flexibility because Foundry agents can publish stable endpoints, integrate with custom applications and services, and be published to Microsoft 365 Copilot or Teams. Copilot Studio remains tied or stronger when the target is low-code Microsoft 365 or Power Platform delivery.

### Q4 — What should this agent do?

Task complexity is the strongest discriminator between Agent Builder, Copilot Studio, and Foundry. **Multi-agent is split:** low-code business orchestration favors CS (GA); code-first / custom runtime favors Foundry. Foundry should win on **runtime ownership**, not the keyword “multi-agent.”

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Simple Q&A / lookups | q4a | **3** | **3** | 1 | — |
| Conversational (multi-turn) | q4b | 2 | **3** | 2 | — |
| Create/analyze content in Copilot | q4e | **3** | 2 | 2 | — |
| Multi-step tasks with actions | q4c | 0 | **3** | **3** | Zeros AB |
| Low-code multi-agent / long-running **business** orchestration | q4d | 0 | **3** | 2 | Zeros AB, M365 |
| Code-first multi-agent / custom protocols / high-scale hosted agents | q4f | 0 | 1 | **3** | Zeros AB, M365 |

### Q3 — What information does this agent need to access?

Agent Builder is no longer treated as "Microsoft 365 files only." It can use Microsoft 365 content, scoped web, embedded files, and admin-enabled Microsoft 365 Copilot connectors. Copilot Studio is the strongest low-code option for Dataverse, custom connectors, business APIs, and Power Platform integration. Foundry now gets weak credit for Microsoft 365, web, and file grounding because Foundry tools and Foundry IQ can reach those sources, but it remains strongest for custom RAG, Azure AI Search, private indexes, tuned Foundry IQ knowledge bases, and engineering-managed retrieval systems.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Microsoft 365 content | q3a | **3** | 2 | 1 | — |
| Connector-backed business systems | q3b | 2 | **3** | 2 | — |
| Dataverse / custom connectors / business APIs | q3c | 0 | **3** | 2 | Zeros AB |
| M365 + connector-backed systems | q3d | 2 | **3** | 2 | — |
| Public websites or uploaded files | q3e | **3** | 2 | 1 | — |
| Custom RAG / Azure AI Search / private indexes / Foundry IQ | q3f | 0 | 1 | **3** | Zeros AB |

## Scoring Pipeline

### Step 1 — Hard rules (pre-sum)

Hard rules zero out platforms before scores are summed. They represent real platform limitations.

| Trigger | Platforms zeroed | Reason |
|---|---|---|
| q8b (external users) | AB, M365 | Cannot publish externally |
| q4d (low-code multi-agent / business orchestration) | AB, M365 | Requires Copilot Studio or Foundry |
| q4f (code-first multi-agent / custom runtime) | AB, M365 | Requires Foundry-class runtime ownership |
| q4c (multi-step action workflows) | AB | Cannot submit forms, update records, or take actions across systems |
| q2b (custom app) | AB | Can only run inside Microsoft 365 Copilot surfaces |
| q2c (background) | AB | No event-driven or autonomous background runtime |
| q3c (direct business system integration) | AB | Cannot directly connect to Dataverse, custom connectors, or business APIs |
| q3f (custom retrieval architecture) | AB | Cannot directly use custom RAG, Azure AI Search, private indexes, Foundry IQ, or engineering-managed retrieval systems |

Additionally, M365 Copilot is always zeroed in the full assessment (hard-coded in JS).

### Step 2 — Sum raw scores

For each platform not zeroed: sum the scores from all answered questions. Range: 0–15.

### Step 2.5 — Persona preferences (soft overrides)

Persona preferences force one platform above another in ranking regardless of scores. Unlike hard rules, all scores are preserved — the override only affects sort order. A rationale message is displayed as a key factor on the recommendation card.

| Trigger | Prefer | Over | Rationale |
|---|---|---|---|
| q1d (data scientist / AI-ML) | Copilot Studio | Agent Builder | CS supports curated model selection, evaluations, Foundry IQ integration, code-first development, and flexible orchestration that AB lacks |

### Step 3 — Threshold labels

| Score | Label |
|---|---|
| 12–15 | Strong fit |
| 8–11 | Good fit |
| 4–7 | Partial fit |
| 0–3 | Not recommended |

Secondary “Also consider” cards are hidden when the runner-up label is **Not recommended** (0–3), not 0–5.

### Step 4 — Rank and recommend

Platforms are sorted by score descending. The highest-scoring platform is the primary recommendation. The second-highest is shown as "Also consider" when it is viable.

### Step 5 — Tie handling

When the top two platforms score within **2 points**, they're presented as a complementary pair when that pair is listed in `valid_pairs`.

| Pair | Rationale |
|---|---|
| Copilot Studio + Foundry | CS for channels/connectors/makers/multi-agent business orchestration; Foundry for custom retrieval, hosted code, private net, runtime ownership |
| M365 Copilot + Copilot Studio | M365 Copilot for end users, CS for customization |
| Agent Builder + M365 Copilot | AB for no-code M365 knowledge agents, M365 for day-to-day surfaces |

**Persona-based tiebreakers** — when two platforms score equally and a specific persona answer is selected, one platform is preferred:

| Trigger | Platforms | Prefer | Rationale |
|---|---|---|---|
| q1c (professional developer) | AB, CS | CS | CS supports code-first authoring via VS Code extension |
| q1d (data scientist / AI-ML) | CS, Foundry | CS | Faster path to production; Foundry still wins via q3f / q4f / custom app / private net signals |

### Step 6 — Cross-question notes

Contextual warning banners when answer combinations are logically contradictory:

| Condition | Note |
|---|---|
| q2c + q4a | Background agent doing simple Q&A — contradictory |
| q8b + q2a | External users in Microsoft 365 Copilot chat — external users can't access your tenant |
| q1a + q4d | Business user wants multi-agent business orchestration — maker/IT partnership recommended |
| q1a + q4f | Business user wants code-first multi-agent — requires pro-dev / Foundry partnership |
| q1a + q3c | Business user needs direct business system integration — requires technical expertise |
| q1a + q3f | Business user needs custom retrieval architecture — requires engineering expertise |

### Step 7 — Winner-persona mismatch

When Foundry wins but the builder is a business user (q1a), a banner advises partnering with a development team.

## Distribution Analysis

Across all **2,304** possible answer combinations (4 × 4 × 4 × 6 × 6 after adding q4f):

| Platform | Wins | % |
|---|---:|---:|
| Copilot Studio | 1,874 | 81.3% |
| Foundry | 370 | 16.1% |
| Agent Builder | 60 | 2.6% |

Compared with the prior 1,920-combo matrix (CS 82.8% / Foundry 14.1% / AB 3.1%), CS multi-agent GA (q4d → CS:3) plus a dedicated code-first option (q4f) slightly reduces CS “undecided multi-agent” dominance while giving Foundry a clearer runtime-ownership lane.

**Exact top-score ties and close (±2) cases** remain common on CS/Foundry pairs — intentional overlap between governed low-code and developer-controlled runtimes.

### When Agent Builder wins

AB’s sweet spot is: **business user or low-code maker, small team or undecided internal audience, Microsoft 365 Copilot surface, Q&A/conversation/content-analysis, and Microsoft 365, web/uploaded, or connector-backed knowledge**.

Agent Builder still loses whenever the user needs external publishing, custom app deployment, background execution, direct business system integration, custom retrieval architecture, or action workflows that update external systems. Builder is **not** credited for Toolkit-only or custom-engine capabilities.

### When Foundry wins

Foundry wins on **runtime ownership** signals: pro dev or ML persona (q1c/q1d), custom app or multi-surface deployment (q2b/q2d), **code-first multi-agent** (q4f), custom retrieval architecture (q3f), external-facing scenarios, or a need for managed endpoints, hosted code agents, private networking, tracing, evaluation, and full Azure control.

Foundry does **not** automatically win on “multi-agent” alone — low-code multi-agent / child agents / A2A business orchestration (q4d) strongly favors Copilot Studio.

### When Copilot Studio wins multi-agent

Coordinate multiple CS agents / A2A for a department process (q4d) can recommend CS as **Strong** without requiring Foundry. Example: maker + department + M365 chat + q4d + Dataverse → CS 15 / Foundry 8.

### Copilot Studio dominance

CS remains the default recommendation for most combinations because it bridges Agent Builder's no-code Microsoft 365-native scenarios and Foundry's full-code scenarios. It wins when the user needs broader internal or external deployment, actions, branching workflows, event triggers, enterprise governance, Dataverse/custom connectors, MCP tools, computer use, evaluation, monitoring, multi-agent business orchestration, or a safer path when scope is undecided.

### Score ranges when winning

| Platform | Min | Max | Avg (approx.) |
|---|---:|---:|---:|
| Agent Builder | 11 | 15 | 12.7 |
| Copilot Studio | 9 | 15 | 12.4 |
| Foundry | 9 | 15 | 12.4 |

No combination produces a "best platform" below 8, so every user gets at least a "Good fit" recommendation.

## Cross-question note frequency

Notes fire on the same logical combinations as before (background+simple Q&A, external+M365 chat, biz-user+orchestration/APIs/RAG). q1a+q4f is the new code-first orchestration note.

## Golden-path checks (P0)

| Scenario | Expected |
|---|---|
| Daily briefing / inbox triage on a schedule, M365 only | Cowork |
| “When a VIP emails me…”, M365 only | Cowork |
| Always-on across desktop + M365 | Scout |
| One-shot board pack, M365 | Cowork |
| Coordinate multiple CS agents / A2A for a department process | CS Strong |
| Custom app + private VNet + custom RAG + hosted code agent | Foundry |
| Pro-dev API-plugin declarative agent in Copilot | Not Foundry-only — Toolkit guidance |
