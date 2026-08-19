# Scoring System — Agent Platform Advisor

Reference document for how the APA scoring engine works. All data is driven from `apa.yaml`.

## Platforms

| ID | Label | Description |
|---|---|---|
| `agent_builder` | Agent Builder | No-code declarative agents inside Microsoft 365 Copilot |
| `m365_copilot` | Microsoft 365 Copilot | Built-in Copilot experiences — Copilot Chat, Search, app-native assistance, and Microsoft-built agents (entry-point wizard only) |
| `copilot_studio` | Copilot Studio | Managed enterprise agents across the GitHub Copilot, standard, and Copilot chat harnesses, plus deterministic workflows |
| `foundry` | Microsoft Foundry | Managed production agent runtime for prompt agents, hosted code agents, custom retrieval, tools, identity, observability, and Azure-scale controls |

M365 Copilot is excluded from the scored assessment. It is only recommended via the entry-point wizard (or the legacy `?ft=1` / `?dt=copilot_chat` share links). In the full wizard, `m365_copilot` is always zeroed.

## Non-scored destinations: entry-point wizard (Microsoft 365 Copilot, Cowork & Scout)

Microsoft 365 Copilot, Cowork, and Scout are **not** build platforms — they are ready-made places to *get work done*, not platforms you build on. They are **not** part of the scored wizard and never enter the 0–15 sum. They are reached via the prescreen path **"Help me find the right place to get work done,"** which opens a short **entry-point wizard** ("Where should you get this work done?"). This wizard exists because Microsoft asks end users to choose between too many entry points (Microsoft 365 Copilot vs. Cowork vs. Scout); the wizard resolves that choice from work patterns instead of product names. There is no longer a separate "built-in Microsoft 365 Copilot experience" prescreen tile — that destination now lives inside this wizard.

**Copilot Chat is not a destination.** Copilot Chat and the built-in agents (Researcher, Analyst, Facilitator, Interpreter, …) are *surfaces of* Microsoft 365 Copilot, not products that compete with it. Staying hands-on therefore always resolves to the single `m365_copilot` card; the task-type answer only selects which surface the card tells you to **Start Here** with, via `recommendations.m365_copilot.start_here` in `apa.yaml` (`chat` or `agents`).

The first question forks the flow:

| Question | Options |
|---|---|
| **Involvement** — how do you want to work? | Stay hands-on and iterate turn-by-turn · Hand it off and let an agent run |

- **Hands-on / interactive** → a follow-up asks **what kind of task** it is:

  | Question | Options |
  |---|---|
  | **Task type** | General help (brainstorm, find info, catch up on email/meetings, draft & edit documents) · A specialized task (deep research, data analysis, meeting facilitation, translation) |

  Both answers resolve to **Microsoft 365 Copilot** (`m365_copilot`). General selects the **Copilot Chat** start surface; specialized selects the **built-in agents** start surface (Researcher, Analyst, Facilitator, Interpreter, …).

- **Hand it off / delegate** → two follow-up questions decide between Cowork and Scout. They are asked **progressively**: Cadence appears first, and Reach is revealed only once a cadence has been answered (so both questions never show at once).

  | Question | Options |
  |---|---|
  | **Cadence** (asked first) — how should the agent work? | On-demand (finish a multi-step job in one go — several artifacts or a process across systems) · Continuous (always-on, manage & coordinate my day) · Not sure |
  | **Reach** (revealed after Cadence) — where does it need to reach? | Microsoft 365 only · Also desktop/browser/local/CLI · Not sure |

**Routing rule** (`resolveDelegateResult(involvement, taskType, cadence, reach)` in `apa.js`):

| Condition | Result |
|---|---|
| Involvement = interactive | **Microsoft 365 Copilot** (`m365_copilot`) — `resolveDelegateStart` then picks the start surface: specialized → `agents`, general → `chat` |
| Cadence = continuous | **Scout** |
| Reach = cross-environment | **Scout** |
| Cadence = on-demand **and** Reach = Microsoft 365 | **Cowork** |
| Otherwise (undecided signals) | **Both** (Cowork + Scout), shown as a complementary pair |

**Readiness** (`isDelegateReady` in `apa.js`): interactive requires a task type; delegate requires both cadence and reach before the wizard can finish.

> `m365_copilot` still exists in `meta.platforms` for content, but is always zeroed in the scored wizard (`if (!fastTrack) zeroed['m365_copilot'] = true`) — it only surfaces as this wizard destination. The legacy `?ft=1` share link still resolves to the same card for backward compatibility, as does the legacy `?dt=copilot_chat` link (it maps to `dt=m365_copilot` with the `chat` start surface). New share links carry the surface as `&st=chat|agents`.

## Questions and Scoring Matrix

Five questions, each scored 0–3 per platform. Max raw score: **15** (5 × 3). A conditional, non-scored runtime distinction appears only when Copilot Studio and Foundry are the top two platforms within 2 points.

### Q1 — Who is building this agent?

| Option | ID | Agent Builder | CS | Foundry |
|---|---|---|---|---|
| Business user / SME — no coding | q1a | **3** | 2 | 0 |
| Low-code maker / IT pro | q1b | 1 | **3** | 0 |
| Professional developer | q1c | 0 | 2 | **3** |
| Data scientist / ML engineer | q1d | 0 | 2 | **3** |

Copilot Studio gets 2 for business users because the GitHub Copilot harness uses natural-language-first authoring, while Agent Builder remains the simpler no-code option. CS also supports developer authoring workflows through YAML and the VS Code extension, but that does not make it a developer-owned code runtime.

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

Task complexity separates Agent Builder from the enterprise platforms, but no longer cleanly separates Copilot Studio from Foundry. The GitHub Copilot harness gives Copilot Studio adaptive multi-step reasoning, failure recovery, native Office/PDF file work, skills, memory, and multi-tool orchestration. Runtime ownership is therefore resolved through a conditional final distinction when CS and Foundry remain close.

| Option | ID | Agent Builder | CS | Foundry | Hard Rule |
|---|---|---|---|---|---|
| Simple Q&A / lookups | q4a | **3** | **3** | 1 | — |
| Conversational (multi-turn) | q4b | 2 | **3** | 2 | — |
| Create/analyze content in Copilot | q4e | **3** | **3** | 2 | — |
| Multi-step tasks with actions | q4c | 0 | **3** | **3** | Zeros AB |
| Complex orchestration | q4d | 0 | **3** | **3** | Zeros AB, M365 |

Foundry gets 1 for q4a because it can do simple Q&A, but is usually overkill for simple knowledge scenarios. Both enterprise platforms can now handle complex orchestration; Foundry becomes the stronger choice when the conditional runtime distinction requires engineering ownership.

### Conditional runtime distinction — Who should operate the agent runtime?

This is not part of the score and does not appear for every user. After the five scored questions, APA asks it only when Copilot Studio and Foundry are the top two viable platforms and their scores are within 2 points.

| Option | ID | Effect |
|---|---|---|
| Microsoft should manage the runtime, sandbox, tools, and Power Platform governance | q9a | Prefer Copilot Studio over Foundry without changing either score |
| Engineering should own the code runtime and infrastructure | q9d | Zero Agent Builder and Copilot Studio; recommend Foundry |

The previous `q9b` and `q9c` URL values remain accepted and normalize to `q9a`, preserving links created during the earlier six-question schema.

When Copilot Studio wins, the **Start with this harness** callout is derived from the existing task and deployment answers rather than from the runtime distinction:

| Scenario signal | Copilot Studio starting point |
|---|---|
| Complex orchestration or native content/file creation | GitHub Copilot harness |
| Event-triggered or multi-step action workflow | Copilot Studio workflow |
| Microsoft 365 Copilot chat + simple Q&A | Copilot chat harness |
| Other conversational scenarios | Standard harness |

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
| q9d (developer-owned runtime) | AB, CS | Requires an engineering-owned code runtime, framework, endpoint, network, identity, memory, or retrieval architecture |

Additionally, M365 Copilot is always zeroed in the full assessment (hard-coded in JS).

### Step 2 — Sum raw scores

For each platform not zeroed: sum the scores from all answered questions. Range: 0–15.

### Step 2.5 — Ranking preferences (soft overrides)

Ranking preferences force one platform above another without changing scores. A rationale message is displayed as a key factor on the recommendation card.

| Trigger | Prefer | Over | Rationale |
|---|---|---|---|
| q1d (data scientist / AI-ML) | Copilot Studio | Agent Builder | CS supports curated model selection, evaluations, Foundry IQ integration, managed reasoning, portable skills, and flexible orchestration that AB lacks |
| q9a (Microsoft-managed runtime) | Copilot Studio | Foundry | CS provides the requested managed harness, sandbox, tools, and Power Platform governance |

### Step 3 — Threshold labels

| Score | Label |
|---|---|
| 12–15 | Strong fit |
| 8–11 | Good fit |
| 4–7 | Partial fit |
| 0–3 | Not recommended |

### Step 4 — Rank and recommend

Platforms are sorted by score descending. The highest-scoring platform is the primary recommendation. The second-highest is shown as "Also consider" when it is viable.

### Step 5 — Conditional runtime distinction

If Copilot Studio and Foundry are the top two viable platforms within 2 points and no runtime answer is already present in the URL, ask who should operate the runtime. The answer applies the q9a ranking preference or q9d hard rule.

### Step 6 — Tie handling

When the top two platforms score within **2 points**, they're presented as a complementary pair when that pair is listed in `valid_pairs`.

| Pair | Rationale |
|---|---|
| Copilot Studio + Foundry | CS for a Microsoft-managed harness, sandbox, tools, and Power Platform governance; Foundry for an engineering-owned runtime and infrastructure |
| M365 Copilot + Copilot Studio | M365 Copilot for end users, CS for customization |
| Agent Builder + M365 Copilot | AB for Microsoft 365-native agents, M365 for extensibility |

**Persona-based tiebreakers** — when two platforms score equally and a specific persona answer is selected, one platform is preferred:

| Trigger | Platforms | Prefer | Rationale |
|---|---|---|---|
| q1c (professional developer) | AB, CS | CS | CS supports managed enterprise orchestration, evaluation, governance, and developer authoring workflows |
| q1d (data scientist / AI-ML) | CS, Foundry | CS | CS provides a faster path to production agents |

### Step 7 — Cross-question notes

Contextual warning banners when answer combinations are logically contradictory:

| Condition | Note |
|---|---|
| q2c + q4a | Background agent doing simple Q&A — contradictory |
| q8b + q2a | External users in Microsoft 365 Copilot chat — external users can't access your tenant |
| q1a + q4d | Natural-language authoring lowers the build barrier, but production governance, permissions, evaluation, monitoring, and cost controls still need IT involvement |
| q1a + q3c | Business user needs direct business system integration — requires technical expertise |
| q1a + q3f | Business user needs custom retrieval architecture — requires engineering expertise |

### Step 8 — Winner-persona mismatch

When Foundry wins but the builder is a business user (q1a), a banner advises partnering with a development team.

## Distribution Analysis

Across all 1,920 possible scored-answer combinations, before the conditional runtime choice:

| Platform | Wins | % |
|---|---:|---:|
| Copilot Studio | 1,758 | 91.6% |
| Foundry | 122 | 6.4% |
| Agent Builder | 40 | 2.1% |

**Exact top-score ties:** 126 combos (6.6%) — 98 are CS/Foundry and 28 are AB/CS. **Close-score cases within 2 points:** 963 combos (50.2%) — 847 are CS/Foundry and 116 are AB/CS. The conditional runtime distinction appears for those 847 CS/Foundry cases (44.1% of scored scenarios), resolving the most meaningful ambiguity without lengthening every assessment.

### When Agent Builder wins

AB's sweet spot is: **business user or low-code maker, small team or undecided internal audience, Microsoft 365 Copilot surface, lightweight Q&A/content work, and Microsoft 365/web/uploaded knowledge**.

Agent Builder still loses whenever the user needs external publishing, custom app deployment, background execution, direct business system integration, custom retrieval architecture, or action workflows that update external systems.

### When Foundry wins

Foundry wins directly when several technical signals reinforce the need for developer control. In close cases, selecting engineering ownership in the conditional distinction makes Foundry the required platform. Complex orchestration alone no longer makes Foundry the default because the GitHub Copilot harness now covers managed adaptive execution.

### Copilot Studio dominance

CS remains the default recommendation for most combinations because it spans four managed execution patterns: GitHub Copilot harness agents for adaptive work, standard harness agents for predictable conversations, Copilot chat harness agents for Microsoft 365 knowledge extensions, and workflows for deterministic automation. It wins when Microsoft should manage execution while the solution still needs enterprise governance, tools, actions, evaluation, monitoring, and broad deployment.

### Score ranges when winning

| Platform | Min | Max | Avg |
|---|---:|---:|---:|
| Agent Builder | 12 | 15 | 13.3 |
| Copilot Studio | 11 | 15 | 13.2 |
| Foundry | 12 | 15 | 13.2 |

The conditional runtime choice changes ranking or eligibility without changing the displayed raw scores.

## Cross-question note frequency

| Note | Combos | % |
|---|---:|---:|
| Background + SimpleQA | 96 | 5.0% |
| External + M365 Copilot chat | 120 | 6.3% |
| BizUser + Orchestrate | 96 | 5.0% |
| BizUser + Business APIs | 80 | 4.2% |
| BizUser + Custom retrieval | 80 | 4.2% |

Notes are not mutually exclusive — a single combo can trigger multiple notes.
