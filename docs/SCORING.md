# Scoring System — Agent Platform Advisor

Reference document for how the APA scoring engine works. All data is driven from `apa.yaml`.

## Platforms

| ID | Label | Description |
|---|---|---|
| `agent_builder` | Agent Builder | No-code declarative agents inside Microsoft 365 Copilot |
| `m365_copilot` | Microsoft 365 Copilot | Built-in Copilot experiences (fast-track path only) |
| `copilot_studio` | Copilot Studio | Governed low-code enterprise agents with tools, workflows, triggers, computer use, evaluation, monitoring, and broad publishing |
| `foundry` | Microsoft Foundry | Managed production agent runtime for prompt agents, hosted code agents, custom retrieval, tools, identity, observability, and Azure-scale controls |

M365 Copilot is excluded from the scored assessment. It is only recommended via the prescreen fast-track path. In the full wizard, `m365_copilot` is always zeroed.

## Non-scored destinations: personal agents (Cowork & Scout)

Cowork and Scout are **not** build platforms — they are ready-made personal agents you delegate work to (and can extend with skills/plugins). They are **not** part of the scored wizard, are **not** in `meta.platforms`, and never enter the 0–15 sum. They are reached only via the prescreen path **"I'd like a ready-made agent to do work for me,"** which opens a two-question micro-decision:

| Question | Options |
|---|---|
| **Cadence** — how should the agent work? | On-demand (defined task now) · Continuous (always-on monitoring) · Not sure |
| **Reach** — where does it need to reach? | Microsoft 365 only · Also desktop/browser/local/CLI · Not sure |

**Routing rule** (`resolveDelegateResult` in `apa.js`):

| Condition | Result |
|---|---|
| Cadence = continuous | **Scout** |
| Reach = cross-environment | **Scout** |
| Cadence = on-demand **and** Reach = Microsoft 365 | **Cowork** |
| Otherwise (undecided signals) | **Both**, shown as a complementary pair |

## Questions and Scoring Matrix

Five questions, each scored 0–3 per platform. Max raw score: **15** (5 × 3).

### Q1 — Who is building this agent?

| Option | ID | Agent Builder | CS | Foundry |
|---|---|---|---|---|
| Business user / SME — no coding | q1a | **3** | 1 | 0 |
| Low-code maker / IT pro | q1b | 1 | **3** | 0 |
| Professional developer | q1c | 0 | 2 | **3** |
| Data scientist / ML engineer | q1d | 0 | 1 | **3** |

CS gets 2 for q1c because it supports pro developers via YAML authoring and the VS Code extension.

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

Foundry now scores higher for deployment flexibility because Foundry agents can publish stable endpoints, integrate with custom applications and services, and be published to Microsoft 365 Copilot or Teams. Copilot Studio remains tied or stronger when the target is low-code Microsoft 365 or Power Platform delivery.

### Q4 — What should this agent do?

Task complexity is the strongest discriminator between Agent Builder, Copilot Studio, and Foundry. Agent Builder now scores well for lightweight content/data-analysis capabilities enabled in declarative agents, but is still zeroed for action workflows.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Simple Q&A / lookups | q4a | **3** | **3** | 1 | — |
| Conversational (multi-turn) | q4b | 2 | **3** | 2 | — |
| Create/analyze content in Copilot | q4e | **3** | 2 | 2 | — |
| Multi-step tasks with actions | q4c | 0 | **3** | **3** | Zeros AB |
| Complex orchestration | q4d | 0 | 2 | **3** | Zeros AB, M365 |

Foundry gets 1 for q4a because it can do simple Q&A, but is usually overkill for simple knowledge scenarios. It gets 2 for q4e because code interpreter, file search, and hosted agents can support richer content/data-analysis workloads when the team needs developer control.

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
| q4d (complex orchestration) | AB, M365 | Requires Copilot Studio or Foundry orchestration |
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

### Step 4 — Rank and recommend

Platforms are sorted by score descending. The highest-scoring platform is the primary recommendation. The second-highest is shown as "Also consider" when it is viable.

### Step 5 — Tie handling

When the top two platforms score within **2 points**, they're presented as a complementary pair when that pair is listed in `valid_pairs`.

| Pair | Rationale |
|---|---|
| Copilot Studio + Foundry | Build in CS, extend with custom code in Foundry |
| M365 Copilot + Copilot Studio | M365 Copilot for end users, CS for customization |
| Agent Builder + M365 Copilot | AB for Microsoft 365-native agents, M365 for extensibility |

**Persona-based tiebreakers** — when two platforms score equally and a specific persona answer is selected, one platform is preferred:

| Trigger | Platforms | Prefer | Rationale |
|---|---|---|---|
| q1c (professional developer) | AB, CS | CS | CS supports code-first authoring via VS Code extension |
| q1d (data scientist / AI-ML) | CS, Foundry | CS | CS provides a faster path to production agents |

### Step 6 — Cross-question notes

Contextual warning banners when answer combinations are logically contradictory:

| Condition | Note |
|---|---|
| q2c + q4a | Background agent doing simple Q&A — contradictory |
| q8b + q2a | External users in Microsoft 365 Copilot chat — external users can't access your tenant |
| q1a + q4d | Business user wants complex orchestration — requires dev skills |
| q1a + q3c | Business user needs direct business system integration — requires technical expertise |
| q1a + q3f | Business user needs custom retrieval architecture — requires engineering expertise |

### Step 7 — Winner-persona mismatch

When Foundry wins but the builder is a business user (q1a), a banner advises partnering with a development team.

## Distribution Analysis

Across all 1,920 possible answer combinations:

| Platform | Wins | % |
|---|---:|---:|
| Copilot Studio | 1,590 | 82.8% |
| Foundry | 270 | 14.1% |
| Agent Builder | 60 | 3.1% |

**Exact top-score ties:** 283 combos (14.7%) — 253 are CS/Foundry, 30 are AB/CS. **Close-score cases within 2 points:** 1,120 combos (58.3%) — most are CS/Foundry, reflecting the intentional overlap between Copilot Studio's governed low-code runtime and Foundry's developer-controlled runtime.

### When Agent Builder wins

AB now wins beyond the old SharePoint/OneDrive-only path. Its sweet spot is: **business user or low-code maker, small team or undecided internal audience, Microsoft 365 Copilot surface, Q&A/conversation/content-analysis, and Microsoft 365, web/uploaded, or connector-backed knowledge**.

Agent Builder still loses whenever the user needs external publishing, custom app deployment, background execution, direct business system integration, custom retrieval architecture, or action workflows that update external systems.

### When Foundry wins

Foundry wins when answers include strong technical or production-runtime signals: pro dev or ML persona (q1c/q1d), custom app or multi-surface deployment (q2b/q2d), complex or long-running orchestration (q4d), custom retrieval architecture (q3f), external-facing scenarios, or a need for managed endpoints, hosted code agents, private networking, tracing, evaluation, and full Azure control. Copilot Studio still ties or beats Foundry for event-triggered workflows and business APIs unless the scenario clearly needs full-code control.

### Copilot Studio dominance

CS remains the default recommendation for most combinations because it bridges Agent Builder's no-code Microsoft 365-native scenarios and Foundry's full-code scenarios. It wins when the user needs broader internal or external deployment, actions, branching workflows, event triggers, enterprise governance, Dataverse/custom connectors, MCP tools, computer use, evaluation, monitoring, or a safer path when scope is undecided.

### Score ranges when winning

| Platform | Min | Max | Avg |
|---|---:|---:|---:|
| Agent Builder | 11 | 15 | 12.8 |
| Copilot Studio | 9 | 15 | 12.4 |
| Foundry | 10 | 15 | 12.7 |

No combination produces a "best platform" below 8, so every user gets at least a "Good fit" recommendation.

## Cross-question note frequency

| Note | Combos | % |
|---|---:|---:|
| Background + SimpleQA | 96 | 5.0% |
| External + M365 Copilot chat | 120 | 6.3% |
| BizUser + Orchestrate | 96 | 5.0% |
| BizUser + Business APIs | 80 | 4.2% |
| BizUser + Custom retrieval | 80 | 4.2% |
| Foundry + BizUser (persona mismatch) | 19 | 1.0% |

Notes are not mutually exclusive — a single combo can trigger multiple notes.
