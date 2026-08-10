# Agent Platform Advisor — Guidance & Scoring Backlog

Prioritized backlog from the mid-2026 deep analysis of copy, guidance, and scoring logic.
Use this for subsequent iterations toward a substantial update. Items are ordered within each priority band; dependencies are noted where they matter.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` deferred / won't do

**Source:** Deep analysis session (2026-08-10). Verified against Microsoft Learn (Agent Builder, declarative agent tool comparison, Cowork, Scout, Copilot Studio what’s new) as of mid-2026.

**Working rules for implementers:**

- Content lives in `apa.yaml`; routing/scoring behavior in `assets/apa.js`; user-facing flow chrome in `index.html`.
- After flow or scoring changes: update `docs/SCORING.md`, `docs/FLOWCHART.md`, and `docs/CHANGELOG.md` (`## Unreleased`).
- After visual changes: read `docs/DESIGN.md` first.
- Preserve share-link contract (add params; don’t repurpose existing ones).
- Prefer golden-path tests over broad matrix rewrites when validating routing/scoring.
- Do not hardcode platform marketing copy in JS/HTML — keep it in `apa.yaml`.

---

## P0 — Correctness (ship first)

These change *who wins* or fix actively misleading guidance. Do before polish.

### P0.1 — Rebuild Cowork ↔ Scout routing for schedules and event-driven work

**Problem:** Learn documents Cowork scheduled prompts *and* event-driven tasks (e.g. on email/Teams message). Routing still treats “continuous / keep working over time” as Scout-only, so daily briefings and M365-only triggers mis-route to Scout.

**Files:** `index.html` (cadence option copy), `assets/apa.js` (`resolveDelegateResult`, `isDelegateReady`, share-link handling), `tests/e2e/delegate-path.spec.js`, `docs/SCORING.md`, `docs/FLOWCHART.md`

**Work:**

- [x] Redesign cadence options so they no longer collapse three intents into one “always-on” choice. Proposed buckets:
  1. **One-shot deliverable** — finish a multi-step job and hand back the result
  2. **Recurring or event-triggered inside Microsoft 365** — schedules, inbox/Teams triggers, repeating briefings
  3. **Always-on personal Autopilot** — proactive monitoring and follow-through over time (may span environments)
- [x] Make **reach primary** when the work is recurring/triggered or always-on:
  - M365-only → **Cowork**
  - Desktop / browser / local files / shell → **Scout**
  - Unsure → **both** (complementary pair)
- [x] Keep Scout for proactive personal Autopilot + cross-environment + desktop app identity — not “anything that isn’t one-shot”
- [x] Update `resolveDelegateResult` and any comments that say `continuous → scout`
- [x] Rewrite cadence question title/options in `index.html` to match the new buckets (work-pattern language, not product names)
- [x] Extend Playwright coverage for:
  - recurring/event + m365 → Cowork
  - recurring/event + cross → Scout
  - always-on + m365 → decide explicitly (recommend Cowork if still M365-scoped; Scout if “proactive personal Autopilot” copy is chosen — document the rule)
  - one-shot + m365 → Cowork (regression)
  - one-shot + cross → Scout (regression)
- [x] Update `docs/SCORING.md` entry-point routing table and `docs/FLOWCHART.md` mermaid

**Acceptance:**

- [x] Daily briefing / inbox triage on a schedule, M365 only → Cowork
- [x] “When a VIP emails me…” M365 only → Cowork
- [x] Always-on across desktop + M365 → Scout
- [x] One-shot board pack → Cowork
- [x] Existing share links `dt=cowork|scout|both` still resolve
- [x] All delegate-path e2e tests pass

**Depends on:** nothing  
**Unblocks:** P0.4 (Scout/Cowork copy alignment), P1.7 (golden paths)

---

### P0.2 — Disambiguate Agent Builder vs declarative agents vs Agents Toolkit vs custom engine

**Problem:** Microsoft’s build taxonomy is four tools (Agent Builder, SharePoint agents, Copilot Studio, Microsoft 365 Agents Toolkit) plus custom-engine/Foundry paths. APA collapses this into Agent Builder / Copilot Studio / Foundry, so pro-dev + “actions in M365 chat” over-indexes toward Foundry.

**Files:** `apa.yaml` (recommendations, exploration copy, optional new guidance blocks), Explore rendering in `assets/apa.js`, start-page tiles in `index.html`, `docs/SCORING.md`, `README.md`

**Work:**

- [x] Reframe Agent Builder label/description as **no-code declarative agents inside Microsoft 365 Copilot** (not “all declarative agents”)
- [x] State the ceiling explicitly in AB `watch_out_for` / summary: Agent Builder has no Actions; Learn sends action scenarios to Copilot Studio
- [x] Add unscored guidance blocks (Explore tips and/or recommendation footnotes) for:
  - **SharePoint agents** — site/library-scoped Q&A; no-code; runs in SharePoint, Teams, M365 Copilot
  - **Microsoft 365 Agents Toolkit (declarative)** — pro-code API plugins, Adaptive Cards, CI/CD, still Copilot orchestrator
  - **Custom engine agents** — bring-your-own orchestrator/models → Foundry / Agents SDK path
- [x] On Foundry and CS cards, add “use X instead when…” lines that point at Toolkit declarative vs custom engine
- [x] On AB card, add migration line: outgrow Builder → Copilot Studio; need plugins/CI-CD in Copilot → Agents Toolkit
- [x] Keep AB hard zeros for actions/background/external/custom app/custom RAG — still correct for the *no-code Builder* path
- [x] Do **not** silently give AB credit for Toolkit-only capabilities

**Acceptance:**

- [x] A reader can tell Builder ≠ all declarative agents after one card read
- [x] Explore or results surface SharePoint agents and Agents Toolkit as adjacent paths
- [x] No scoring change required for this item (copy/structure only) unless paired with P0.3

**Depends on:** nothing  
**Unblocks:** P0.3, P1.5

---

### P0.3 — Rebalance Copilot Studio vs Foundry after multi-agent GA

**Problem:** q4d still scores CS:2 / Foundry:3 for “complex workflows / multi-agent,” and pro-dev (q1c) defaults toward Foundry. CS multi-agent orchestration is GA; Foundry should win on **runtime ownership** (custom engine, models, networking, scale), not the keyword “multi-agent.”

**Files:** `apa.yaml` (q4d scores, optional new question/options, persona prefs, tiebreakers, CS/Foundry copy), `docs/SCORING.md` (matrix + redistribute analysis), tests if score-sensitive

**Work:**

- [x] Re-anchor q4d:
  - Low-code multi-agent / child agents / A2A / long-running *business* orchestration → **CS strong (3)**
  - Code-first multi-agent, custom protocols, high-scale hosted agents → **Foundry strong (3)** — may need option split or companion signal
- [x] Soften automatic Foundry preference for q1c when the deployment target is M365 Copilot extensibility (pair with P0.2 Toolkit path)
- [x] Add or extend a **runtime / control** signal (new question *or* clearer options under task/data/persona), e.g.:
  - Stay on Microsoft 365 Copilot’s orchestrator and models (declarative / CS)
  - Need own code, models, private networking, or managed custom runtime (Foundry)
- [x] Review persona preference `q1d → CS over Foundry` on exact ties — keep for time-to-value, but ensure true ML/platform answers can still surface Foundry via q3f / runtime control
- [x] Re-run combination distribution; target fewer “CS wins everything undecided” cases without starving CS as the safe enterprise default
- [x] Update CS/Foundry `best_for` / `watch_out_for` so multi-agent GA and “when Foundry still wins” are consistent with scores
- [x] Document new distribution tables in `docs/SCORING.md`

**Acceptance:**

- [x] “Coordinate multiple CS agents / A2A for a department process” can recommend CS as Strong without requiring Foundry
- [x] “Custom app + private VNet + custom RAG + hosted code agent” still recommends Foundry
- [x] Pro-dev building an API-plugin declarative agent is not pushed to Foundry as the only answer (see P0.2)
- [x] Distribution re-documented; no winner below Good fit unless intentionally redesigned

**Depends on:** P0.2 (taxonomy language) strongly recommended first  
**Unblocks:** P1.6, P1.7

---

### P0.4 — Align start-page, entry-point, and platform one-liners with recommendation truth

**Problem:** Start tiles and some entry-point chrome undersell or misstate platforms relative to full cards (especially Cowork automation, CS actions/governance, M365 agents/Agent Store, Scout Frontier).

**Files:** `index.html` (welcome tiles, prescreen, delegate section), `apa.yaml` (`exploration_*`, short descriptions), possibly `assets/apa.js` if Explore pulls different fields

**Work:**

- [x] Rewrite start-page platform one-liners:

  | Platform | Must convey |
  |---|---|
  | Microsoft 365 Copilot | Chat + Search + app-native help + built-in agents / Agent Store — not “chat only” |
  | Cowork | Delegate multi-step M365 work; schedules & event-driven; approvals — not only “describe an outcome” |
  | Scout | Always-on personal Autopilot; desktop/browser/local + M365; Frontier preview |
  | Agent Builder | No-code declarative; M365 knowledge helpers; not actions/workflows |
  | Copilot Studio | Governed low-code agents: actions, triggers, connectors, eval, multi-channel |
  | Microsoft Foundry | Pro-code managed runtime; custom engine/models/retrieval at Azure scale |

- [x] Align Explore `exploration_best_for` / `exploration_summary` with the same truths
- [x] Entry-point intro: mention Cowork can schedule/trigger inside M365; Scout is cross-environment Autopilot (after P0.1)
- [x] Differentiate deep research: interactive → Researcher (M365 agents surface); hand off a research deliverable → Cowork
- [x] Add a light “start in Chat, escalate to Cowork/agents” tip on M365 cards
- [x] Scout cards: Frontier enrollment / Intune / licensing gates remain prominent
- [x] CS vs Scout desktop: CS computer use / Windows 365 for Agents MCP = enterprise agent automation; Scout = personal desktop Autopilot

**Acceptance:**

- [x] No start tile contradicts its recommendation card
- [x] Cowork tile mentions recurring or triggered work (post P0.1 language)
- [x] Scout tile signals preview/gated access
- [x] Design tokens unchanged unless copy length forces layout check

**Depends on:** P0.1 for cadence wording; P0.2 for Builder/Toolkit wording  
**Unblocks:** P2 trust/polish items

---

### P0.5 — Docs and changelog sync for the correctness wave

**Work:**

- [x] `docs/SCORING.md` — entry-point table, hard rules, matrix, distribution, platform blurbs
- [x] `docs/FLOWCHART.md` — full mermaid for new cadence/reach and any new scored question
- [x] `docs/CHANGELOG.md` under `## Unreleased` — user-visible behavior changes, not just copy
- [x] `README.md` + `.github/copilot-instructions.md` — paths, destinations, test counts
- [x] Fix stale comment in `assets/apa.js` (“score 0-5” vs Not recommended 0–3) while touching results logic

**Acceptance:**

- [x] A new contributor can implement P1 from docs alone without rereading the analysis
- [x] Flowchart matches `resolveDelegateResult` and scored pipeline exactly

**Depends on:** P0.1–P0.4  
**Unblocks:** external review / shipping the substantial update

---

## P1 — Decision quality (next iteration)

Improve discrimination and coverage without necessarily adding whole products as scored winners.

### P1.1 — First-class SharePoint agents guidance

- [x] Add SharePoint agents to Explore (“Use” or lightweight “Build”) and/or AB/M365 adjacency tips
- [x] Copy: site/library grounding; SharePoint + Teams + Copilot surfaces; owner/admin prerequisites
- [x] When audience is small internal + data is “one SharePoint site,” tip SharePoint agents before full CS
- [x] Link to official Get started with SharePoint agents docs
- [x] Tests: Explore renders the tip/card; optional shared-link unaffected

**Depends on:** P0.2

---

### P1.2 — Agents Toolkit declarative path in results

- [x] When winner is Foundry or CS but answers look like “pro-dev + M365 chat + API actions,” show a **Toolkit declarative** callout
- [x] When winner is AB but builder is pro-dev, suggest Toolkit for source control / plugins instead of only “use CS”
- [x] Document that Toolkit is unscored guidance unless a future iteration adds a fourth build dimension
- [x] Resources URL → Microsoft 365 Agents Toolkit Learn overview

**Depends on:** P0.2, P0.3

---

### P1.3 — Orchestrator / control question (scored or gate)

- [x] Design one question or option set: Copilot-managed orchestrator vs own engine/models/runtime
- [x] Wire scores: declarative/CS favored for managed; Foundry for own runtime
- [x] Hard-rule interactions: none that zero CS solely for “I write code”
- [x] Update matrix max score if a 6th question is added (today max 15 = 5×3) — prefer replacing weak signal over blindly extending
- [x] Full docs + distribution refresh

**Depends on:** P0.3  
**Note:** Prefer replacing or refining an existing discriminator before adding Q6.

---

### P1.4 — Licensing, cost, and access watch-outs on every winner

- [x] M365 Copilot: seat / metering implications for chat, agents, Agent Store
- [x] Agent Builder: included with M365 Copilot capabilities subset; sharing limits
- [x] Copilot Studio: Copilot Credits drivers (already partial) — generative answers, actions, computer use, voice, graph grounding
- [x] Foundry: Azure consumption, hosted agent compute, networking
- [x] Cowork: Copilot Credits (exists) — keep accurate
- [x] Scout: Frontier preview gates (exists) — keep accurate; don’t imply GA
- [x] Optional single “constraints” multi-select later (P2) — this item is copy-only on cards

**Depends on:** nothing (can parallelize with P0 after copy freeze points)

---

### P1.5 — CS modern surface area honesty (preview vs GA)

- [x] Multi-agent orchestration: GA (copy already notes — verify scores per P0.3)
- [x] Windows 365 for Agents MCP / computer use: mark GA vs preview accurately per Learn
- [x] New agent experience (GitHub Copilot harness), skills, memory, Microsoft IQ: describe without overselling classic-topic parity
- [x] Foundry IQ connect from CS: keep **preview** labels where true
- [x] Agent Optimizer (Foundry): keep **preview**
- [x] Foundry Local wording: verify “Foundry Local on Azure Local” vs broader local/edge runtime — correct `best_for` bullet if over-narrow or over-broad

**Depends on:** P0.3 for score alignment; else copy-only

---

### P1.6 — Stronger “why not the runner-up” on close CS/Foundry scores

- [x] Lean on existing `computeWhyNot` / pair banner; improve rationale strings in `apa.yaml` `valid_pairs` and generated why-not sentences
- [x] CS+Foundry pair rationale: when to split (CS for channels/connectors/makers; Foundry for custom retrieval/hosted code/private net)
- [x] Remove or stop advertising dead scored-path pairs that include always-zeroed `m365_copilot` (`valid_pairs` cleanup)
- [x] Ensure ±2 threshold still feels intentional after P0.3 rebalance

**Depends on:** P0.3

---

### P1.7 — Golden-path scenario suite (calibration harness)

Add automated or documented fixtures for expected primaries:

| ID | Scenario | Expected primary |
|---|---|---|
| G01 | Biz user, small team, M365 chat, Q&A on SharePoint/M365 content | Agent Builder |
| G02 | Biz user, one site library only | SharePoint agent tip / M365 — not CS as only answer |
| G03 | Maker, Dataverse + approvals + Teams | Copilot Studio |
| G04 | Pro dev, API plugin in Copilot chat, CI/CD | Toolkit declarative guidance (not Foundry-only) |
| G05 | Pro dev, custom app + private VNet + custom RAG | Foundry |
| G06 | End user, draft/summarize interactively | M365 Copilot · Start Here: Chat |
| G07 | End user, deep research interactively | M365 Copilot · Start Here: agents (Researcher) |
| G08 | End user, board pack + email handoff | Cowork |
| G09 | End user, daily M365 briefing on a schedule | Cowork |
| G10 | End user, watch calendar + local files + browser | Scout |
| G11 | Enterprise agent clicks legacy desktop UI | Copilot Studio computer use — not Scout |
| G12 | External customers on a website | CS or Foundry; AB/M365 zeroed |

**Work:**

- [x] Encode as Playwright tests and/or a small node script that loads `apa.yaml` + scoring functions
- [x] Fail CI if any golden path regresses
- [x] Keep table in `docs/SCORING.md` as living calibration

**Depends on:** P0.1, P0.2, P0.3

---

### P1.8 — Winner–persona and access mismatch notes

- [x] CS winner + pure business user + complex APIs → partner with IT/makers note
- [x] Foundry winner + low-code maker (q1b) → skills/partner note (symmetric to q1a+Foundry)
- [x] Scout recommendation → Frontier access prerequisite note if not already on-card
- [x] Optional: AB winner + department-wide audience (q8c) → governance/CS graduation note

**Depends on:** P0.1 for Scout; P0.3 for CS/Foundry

---

### P1.9 — Entry-point middle path and research disambiguation

- [x] Copy tip: many people start hands-on in Copilot Chat, then hand off to Cowork
- [x] Specialized task option text: “interactive deep research / analysis / facilitation” vs Cowork’s “produce a research package for me”
- [x] Consider optional third involvement choice only if binary testing shows confusion — default to copy tips first

**Depends on:** P0.1, P0.4

---

## P2 — Coverage, trust, and maintainability

### P2.1 — Optional governance / compliance constraint step

- [ ] Optional multi-select or single question: regulated data, private networking, tenant-wide inventory, ALM/CI required, air-gapped
- [ ] Soft boosts: Foundry for private net/air-gap; CS for tenant inventory/ALM/makers; never sole hard-zero without evidence
- [ ] Docs + tests

**Depends on:** P1.3 helpful but not required

---

### P2.2 — User-visible “last verified” and version

- [ ] Show `meta.version` and a “Guidance verified against Microsoft Learn: YYYY-MM” on results footer or welcome
- [ ] Bump `meta.version` on substantial guidance releases (e.g. 1.1 → 1.2)
- [ ] Link Changelog from that control (footer already has docs links — ensure discoverable)

**Depends on:** nothing

---

### P2.3 — Dead code / schema cleanup

- [ ] Remove or clearly mark `valid_pairs` involving `m365_copilot` on scored path
- [ ] Align JS comment on secondary-card hide threshold with 0–3 Not recommended
- [ ] Review `persona_preferences` q1d CS-over-AB (low bite rate) — keep, broaden, or drop
- [ ] Confirm `fastTrack` / legacy `ft=1` / `dt=copilot_chat` still documented and tested

**Depends on:** P1.6 nice-to-have together

---

### P2.4 — Cross-question notes expansion

- [ ] q1b + q3f (maker + custom RAG) → engineering partnership note
- [ ] q1c + q4a only (pro-dev + simple Q&A in M365) → consider AB/Toolkit declarative over Foundry
- [ ] continuous-style entry answers that still pick Scout while reach=m365 — only if P0.1 leaves that path
- [ ] Keep notes rare; avoid banner fatigue

**Depends on:** P0.1, P0.3

---

### P2.5 — Stakeholder export / durable result

From `.github/improvements.md` and productization notes:

- [ ] Print-friendly or PDF/markdown export of recommendation + key factors + score comparison
- [ ] Ensure share URL remains canonical machine-readable form
- [ ] Optional email-self is out of scope without backend — prefer client-side download

**Depends on:** nothing (UX track)

---

### P2.6 — Feedback loop

- [ ] Lightweight “Was this helpful?” on results (Clarity custom tags or GitHub issue deep link with prefilled scenario)
- [ ] Do not block main CTA; design per `docs/DESIGN.md`

**Depends on:** nothing (UX track)

---

### P2.7 — Landing / stewardship perception (productization)

- [ ] Welcome experience sets use-vs-build context before first question (copy only if possible)
- [ ] Public changelog already exists — ensure footer “Changelog” is obvious
- [ ] Consider aka.ms or vanity URL only if ownership is available (process, not code)

**Depends on:** nothing

---

## P3 — Later / only if needed

- [ ] **P3.1** Fourth scored build platform or dimension for Agents Toolkit — only if P1.2 callouts prove insufficient
- [ ] **P3.2** Sixth scored question for cost sensitivity — only if P1.4 watch-outs prove insufficient
- [ ] **P3.3** Localize copy — out of scope until EN guidance stabilizes post-P0
- [ ] **P3.4** Admin/IT persona path (“I govern agents others build”) — separate wizard branch
- [ ] **P3.5** Revisit AB action hard-zero if Microsoft ships Actions inside Agent Builder UI (re-verify Learn; today Actions → CS)
- [ ] **P3.6** Full 1,920-combo snapshot job in CI — expensive; golden paths (P1.7) preferred

---

## Suggested iteration plan

### Iteration A — Routing truth (P0.1 + P0.4 Cowork/Scout + P0.5 partial)

Focus: entry-point only. Lowest risk to scored matrix. Highest user-facing accuracy win.

### Iteration B — Build taxonomy (P0.2 + P0.4 build tiles + P1.1 + P1.2)

Focus: copy and Explore adjacency. Little or no score matrix change.

### Iteration C — CS ↔ Foundry rebalance (P0.3 + P1.3 + P1.5 + P1.6 + P1.7 + P0.5 full)

Focus: scored wizard. Requires distribution analysis and golden-path CI.

### Iteration D — Trust & productization (P1.4, P1.8, P1.9, P2.*)

Focus: watch-outs, mismatch notes, verified-on date, export/feedback.

---

## Tracking checklist (roll-up)

### P0

- [ ] P0.1 Cowork/Scout routing rebuild
- [ ] P0.2 Builder / declarative / Toolkit / custom engine disambiguation
- [ ] P0.3 CS vs Foundry rebalance
- [ ] P0.4 Start-page and chrome copy alignment
- [ ] P0.5 Docs/changelog/comment sync

### P1

- [ ] P1.1 SharePoint agents guidance
- [ ] P1.2 Agents Toolkit declarative callouts
- [ ] P1.3 Orchestrator/control signal
- [ ] P1.4 Licensing/cost watch-outs everywhere
- [ ] P1.5 CS/Foundry preview-vs-GA honesty
- [ ] P1.6 Close-score why-not + dead pairs
- [ ] P1.7 Golden-path suite
- [ ] P1.8 Persona/access mismatch notes
- [ ] P1.9 Entry-point middle path + research disambiguation

### P2

- [ ] P2.1 Governance/compliance optional step
- [ ] P2.2 Last-verified + version visible
- [ ] P2.3 Schema/dead-code cleanup
- [ ] P2.4 Cross-question notes expansion
- [ ] P2.5 Stakeholder export
- [ ] P2.6 Feedback loop
- [ ] P2.7 Landing/stewardship perception

### P3

- [ ] P3.1 Toolkit as scored dimension (if needed)
- [ ] P3.2 Cost question (if needed)
- [ ] P3.3 Localization
- [ ] P3.4 Admin/IT persona path
- [ ] P3.5 Re-verify AB Actions if product changes
- [ ] P3.6 Full combo CI snapshot (if needed)

---

## Out of scope (explicit non-goals for this backlog)

- Redesigning the visual system (see `docs/DESIGN.md` separately)
- Backend, auth, or multi-tenant analytics beyond Clarity tags
- Replacing YAML-driven content with a CMS
- Scoring Microsoft 365 Copilot inside the custom-agent wizard (entry-point-only remains correct)
- Treating Copilot Chat as a separate destination again

---

## Reference — current engine facts (do not regress)

| Fact | Location |
|---|---|
| Scored platforms effectively AB / CS / Foundry; M365 zeroed unless legacy fast track | `getZeroedPlatforms` in `assets/apa.js` |
| Hard rules pre-sum from `apa.scoring.hard_rules` | `apa.yaml` + `getZeroedPlatforms` |
| Entry-point destinations: `m365_copilot`, `cowork`, `scout`, `both` | `resolveDelegateResult` |
| Start surface: `st=chat\|agents` | `resolveDelegateStart` |
| Share params: `q*`, `dt`, `st`, `r`, `d`, `mode`, legacy `ft=1`, `dt=copilot_chat` | copilot-instructions + SCORING.md |
| Thresholds: Strong 12–15, Good 8–11, Partial 4–7, Not recommended 0–3 | `apa.yaml` |
| Question IDs non-sequential (`q1,q8,q2,q4,q3`) — preserve identity | `apa.yaml` |

---

## Definition of done for the “substantial update”

- [ ] P0.1–P0.5 complete
- [ ] P1.7 golden paths green in CI
- [ ] `docs/SCORING.md` distribution regenerated and checked in
- [ ] `docs/FLOWCHART.md` matches code
- [ ] Changelog describes behavior changes, not only bullet edits
- [ ] Manual pass of G01–G12 against production Learn links still valid
- [ ] No share-link regressions in e2e suite
