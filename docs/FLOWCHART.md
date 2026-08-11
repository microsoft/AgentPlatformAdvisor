```mermaid
flowchart TD
    START([Start]) --> PRESCREEN{"**Prescreen: Where would you like to begin?**"}

    PRESCREEN -->|Help me find the right place to get work done| DELEGATE{"**Entry-point wizard**\nWhere should you get this work done?\n(non-scored)"}
    PRESCREEN -->|Explore what's possible| EXPLORE["Explore grid\n(all platforms + Cowork + Scout\n+ adjacent build paths)"]
    PRESCREEN -->|Build a custom agent| Q1

    DELEGATE -->|"Involvement: stay hands-on / iterate"| INTERACTIVE{"**Interactive follow-up**\nWhat kind of task?"}
    DELEGATE -->|"Involvement: hand it off"| DELEGATE2{"**Delegate follow-up**\nCadence (asked first)"}
    INTERACTIVE -->|"General help"| CHAT["**Microsoft 365 Copilot**\nStart Here: Copilot Chat\nAsk, summarize, draft in the flow of work"]
    INTERACTIVE -->|"Specialized job (research, data, meetings, translation)"| M365AGENTS["**Microsoft 365 Copilot**\nStart Here: built-in agents\nResearcher · Analyst · Facilitator · Interpreter …"]
    DELEGATE2 -->|"Any cadence answered → reveal Reach"| REACH{"**Reach**\nWhere does it need to reach?\n(primary for recurring / always-on)"}
    REACH -->|"Reach: cross-environment\n(desktop / browser / local / shell)"| SCOUT["**Microsoft Scout**\nAlways-on personal Autopilot\nacross desktop, browser, M365\n(Frontier preview)"]
    REACH -->|"Reach: Microsoft 365\nAND cadence is oneshot, recurring, or alwayson"| COWORK["**Copilot Cowork**\nOne-shot, scheduled, or event-triggered\nMicrosoft 365 deliverables"]
    REACH -->|"Undecided cadence or reach"| BOTH["**Both** — complementary pair\nScout monitors · Cowork delivers"]

    Q1["**Q1: Who is building this agent?**"]
    Q1 -->|Business user / no code| Q1A["AB:3 · CS:1 · Foundry:0"]
    Q1 -->|Low-code maker / IT pro| Q1B["AB:1 · CS:3 · Foundry:0"]
    Q1 -->|"🔀 Professional developer"| Q1C["AB:0 · CS:2 · Foundry:3\n→ TIEBREAKER: AB tie → prefer CS\n→ Toolkit path for declarative plugins"]
    Q1 -->|"🔀 Data scientist / AI-ML"| Q1D["AB:0 · CS:1 · Foundry:3\n→ PERSONA PREF: CS always over AB\n→ TIEBREAKER: CS/Foundry tie → prefer CS\n  (Foundry still wins on q3f/q4f/runtime)"]

    Q1A & Q1B & Q1C & Q1D --> Q8

    Q8["**Q8: Who will use this agent?**"]
    Q8 -->|Me or small internal team| Q8A["AB:3 · CS:2 · Foundry:1"]
    Q8 -->|Department / broad internal audience| Q8C["AB:1 · CS:3 · Foundry:2"]
    Q8 -->|"⚠️ External users"| Q8B["AB:0 · CS:3 · Foundry:3\n→ HARD RULE: AB=0"]
    Q8 -->|Not decided yet| Q8D["AB:2 · CS:2 · Foundry:1"]

    Q8A & Q8C & Q8B & Q8D --> Q2

    Q2["**Q2: Where will users interact?**"]
    Q2 -->|Microsoft 365 Copilot chat| Q2A["AB:3 · CS:3 · Foundry:2"]
    Q2 -->|"⚠️ Custom app / website"| Q2B["AB:0 · CS:3 · Foundry:3\n→ HARD RULE: AB=0"]
    Q2 -->|"⚠️ Background / event-triggered"| Q2C["AB:0 · CS:3 · Foundry:3\n→ HARD RULE: AB=0"]
    Q2 -->|Multiple places / undecided| Q2D["AB:1 · CS:3 · Foundry:3"]

    Q2A & Q2B & Q2C & Q2D --> Q4

    Q4["**Q4: What should this agent do?**"]
    Q4 -->|Q&A, lookups, summaries| Q4A["AB:3 · CS:3 · Foundry:1"]
    Q4 -->|Multi-turn conversation| Q4B["AB:2 · CS:3 · Foundry:2"]
    Q4 -->|Create/analyze content in Copilot| Q4E["AB:3 · CS:2 · Foundry:2"]
    Q4 -->|"⚠️ Multi-step action workflows"| Q4C["AB:0 · CS:3 · Foundry:3\n→ HARD RULE: AB=0"]
    Q4 -->|"⚠️ Low-code multi-agent / long-running business orchestration"| Q4D["AB:0 · CS:3 · Foundry:2\n→ HARD RULE: AB=0\n(CS multi-agent GA)"]
    Q4 -->|"⚠️ Code-first multi-agent / custom runtime"| Q4F["AB:0 · CS:1 · Foundry:3\n→ HARD RULE: AB=0"]

    Q4A & Q4B & Q4E & Q4C & Q4D & Q4F --> Q3

    Q3["**Q3: What information does the agent need?**"]
    Q3 -->|Microsoft 365 content| Q3A["AB:3 · CS:2 · Foundry:1"]
    Q3 -->|Connector-backed business systems| Q3B["AB:2 · CS:3 · Foundry:2"]
    Q3 -->|"⚠️ Dataverse / custom connectors / APIs"| Q3C["AB:0 · CS:3 · Foundry:2\n→ HARD RULE: AB=0"]
    Q3 -->|M365 + connector-backed systems| Q3D["AB:2 · CS:3 · Foundry:2"]
    Q3 -->|Public websites / uploaded files| Q3E["AB:3 · CS:2 · Foundry:1"]
    Q3 -->|"⚠️ Custom RAG / private indexes"| Q3F["AB:0 · CS:1 · Foundry:3\n→ HARD RULE: AB=0"]

    Q3A & Q3B & Q3C & Q3D & Q3E & Q3F --> SCORE

    SCORE["**Apply Hard Rules + Sum Scores**\nPre-sum: zero out platforms per hard rules\nMax possible: 15 pts per platform"]

    SCORE --> PREF["**Persona Preferences**\nSoft overrides: force ranking order\nwithout changing scores\n(e.g. q1d → CS always over AB)"]

    PREF --> RESULT["**Recommendation Thresholds**\n12–15: Strong fit\n8–11: Good fit\n4–7: Partial fit\n0–3: Not recommended"]

    RESULT --> NOTES["**Post-processing**\nCross-question contradiction notes\nWinner-persona mismatch warnings\nTie handling → complementary pairs\nAdjacent-path footnotes (Toolkit, SharePoint, custom engine)"]

    style Q1C fill:#e8f0fe,stroke:#4a86e8
    style Q1D fill:#e8f0fe,stroke:#4a86e8
    style SCOUT fill:#ECEBFB,stroke:#5B5FC7
    style COWORK fill:#ECEBFB,stroke:#5B5FC7
    style CHAT fill:#ECEBFB,stroke:#5B5FC7
    style M365AGENTS fill:#ECEBFB,stroke:#5B5FC7
    style BOTH fill:#ECEBFB,stroke:#5B5FC7
    style DELEGATE fill:#ECEBFB,stroke:#5B5FC7
    style DELEGATE2 fill:#ECEBFB,stroke:#5B5FC7
    style INTERACTIVE fill:#ECEBFB,stroke:#5B5FC7
    style Q8B fill:#fff3cd,stroke:#ffc107
    style Q2B fill:#fff3cd,stroke:#ffc107
    style Q2C fill:#fff3cd,stroke:#ffc107
    style Q4C fill:#fff3cd,stroke:#ffc107
    style Q4D fill:#fff3cd,stroke:#ffc107
    style Q4F fill:#fff3cd,stroke:#ffc107
    style Q3C fill:#fff3cd,stroke:#ffc107
    style Q3F fill:#fff3cd,stroke:#ffc107
    style SCORE fill:#e8f4fd,stroke:#0078D4
    style PREF fill:#e8f0fe,stroke:#4a86e8
    style RESULT fill:#d4edda,stroke:#28a745
    style NOTES fill:#f8f0fb,stroke:#6f42c1
```

## Optional constraints (scored path only)

After Q3 (last scored question), users may multi-select enterprise constraints or skip. Soft boosts apply in `rankPlatforms` before results. Entry-point and legacy fast-track paths skip this step.
