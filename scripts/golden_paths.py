#!/usr/bin/env python3
"""Golden-path calibration for Agent Platform Advisor scoring.

Mirrors assets/apa.js rankPlatforms / getZeroedPlatforms (scored path only).
Entry-point cases (G06–G11) are covered in Playwright.
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
APA_PATH = ROOT / "apa.yaml"


def load_apa():
    with APA_PATH.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_zeroed(apa, answers):
    zeroed = {}
    hard = apa.get("scoring", {}).get("hard_rules") or {}
    for opt in answers.values():
        rule = hard.get(opt)
        if rule:
            for p in rule.get("zero") or []:
                zeroed[p] = True
    # Scored path always zeros m365_copilot
    zeroed["m365_copilot"] = True
    return zeroed


def sum_scores(apa, answers, zeroed, constraints=None):
    totals = {p["id"]: 0 for p in apa["meta"]["platforms"]}
    qmap = {q["id"]: q for q in apa["questions"]}
    for qid, oid in answers.items():
        q = qmap.get(qid)
        if not q:
            continue
        opt = next((o for o in q["options"] if o["id"] == oid), None)
        if not opt:
            continue
        for pid in totals:
            base = (opt.get("scores") or {}).get(pid, 0) or 0
            totals[pid] += 0 if zeroed.get(pid) else base
    # Soft boosts from optional governance constraints
    cap = apa.get("scoring", {}).get("constraint_boost_cap", 2)
    boosts = {pid: 0 for pid in totals}
    opts = {
        o["id"]: o
        for o in (apa.get("optional_constraints") or {}).get("options") or []
    }
    for cid in constraints or []:
        opt = opts.get(cid)
        if not opt:
            continue
        for pid, amt in (opt.get("boosts") or {}).items():
            if zeroed.get(pid):
                continue
            boosts[pid] = boosts.get(pid, 0) + amt
    for pid in totals:
        totals[pid] += min(boosts.get(pid, 0), cap)
    return totals


def rank(apa, answers, constraints=None):
    zeroed = get_zeroed(apa, answers)
    final = sum_scores(apa, answers, zeroed, constraints)
    tiebreakers = (
        apa.get("scoring", {}).get("tie_handling", {}).get("tiebreakers") or []
    )
    platforms = [
        {"id": p["id"], "score": int(round(final[p["id"]]))}
        for p in apa["meta"]["platforms"]
    ]

    from functools import cmp_to_key

    def cmp(a, b):
        if b["score"] != a["score"]:
            return b["score"] - a["score"]
        for rule in tiebreakers:
            plats = rule.get("platforms") or []
            if a["id"] in plats and b["id"] in plats:
                when = rule.get("when") or {}
                if all(answers.get(k) == v for k, v in when.items()):
                    prefer = rule.get("prefer")
                    if a["id"] == prefer:
                        return -1
                    if b["id"] == prefer:
                        return 1
        return 0

    platforms.sort(key=cmp_to_key(cmp))

    # Persona preferences soft override
    prefs = apa.get("scoring", {}).get("persona_preferences") or []
    for pref in prefs:
        when = pref.get("when") or {}
        if not all(answers.get(k) == v for k, v in when.items()):
            continue
        prefer = pref.get("prefer")
        over = pref.get("over")
        ids = [p["id"] for p in platforms]
        if prefer not in ids or over not in ids:
            continue
        prefer_idx = ids.index(prefer)
        over_idx = ids.index(over)
        if prefer_idx > over_idx:
            item = platforms.pop(prefer_idx)
            platforms.insert(over_idx, item)

    return platforms, zeroed


def callouts_match(apa, answers, winner):
    matched = []
    for c in apa.get("result_callouts") or []:
        if c.get("winner") and c["winner"] != winner:
            continue
        if c.get("winner_in") and winner not in c["winner_in"]:
            continue
        when = c.get("when") or {}
        ok = True
        for k, expected in when.items():
            actual = answers.get(k)
            if isinstance(expected, list):
                if actual not in expected:
                    ok = False
                    break
            elif actual != expected:
                ok = False
                break
        if ok:
            matched.append(c["id"])
    return matched


# Scored golden paths (G01–G05, G11–G12). Entry-point G06–G10 are Playwright-only.
GOLDEN = [
    {
        "id": "G01",
        "name": "Biz user, small team, M365 chat, Q&A on M365 content",
        "answers": {"q1": "q1a", "q8": "q8a", "q2": "q2a", "q4": "q4a", "q3": "q3a"},
        "expect_winner": "agent_builder",
        "expect_callouts": ["sharepoint_site_tip"],
    },
    {
        "id": "G02",
        "name": "Biz user, one site library only → AB + SharePoint tip",
        "answers": {"q1": "q1a", "q8": "q8a", "q2": "q2a", "q4": "q4a", "q3": "q3a"},
        "expect_winner": "agent_builder",
        "expect_callouts": ["sharepoint_site_tip"],
    },
    {
        "id": "G03",
        "name": "Maker, Dataverse + approvals + Teams-style multi-channel",
        "answers": {"q1": "q1b", "q8": "q8c", "q2": "q2d", "q4": "q4c", "q3": "q3c"},
        "expect_winner": "copilot_studio",
    },
    {
        "id": "G04",
        "name": "Pro dev, API/actions in Copilot chat → Toolkit callout (not Foundry-only)",
        "answers": {"q1": "q1c", "q8": "q8a", "q2": "q2a", "q4": "q4c", "q3": "q3b"},
        "expect_winner_in": ["copilot_studio", "foundry"],
        "expect_callouts": ["toolkit_m365_extensibility"],
        "reject_winner": None,  # Foundry alone without toolkit guidance is the failure mode
    },
    {
        "id": "G05",
        "name": "Pro dev, custom app + custom RAG → Foundry",
        "answers": {"q1": "q1c", "q8": "q8a", "q2": "q2b", "q4": "q4f", "q3": "q3f"},
        "expect_winner": "foundry",
    },
    {
        "id": "G11",
        "name": "Enterprise computer-use style workflow → Copilot Studio",
        "answers": {"q1": "q1b", "q8": "q8c", "q2": "q2c", "q4": "q4c", "q3": "q3c"},
        "expect_winner": "copilot_studio",
    },
    {
        "id": "G12",
        "name": "External customers on a website → CS or Foundry; AB zeroed",
        "answers": {"q1": "q1c", "q8": "q8b", "q2": "q2b", "q4": "q4b", "q3": "q3e"},
        "expect_winner_in": ["copilot_studio", "foundry"],
        "expect_zeroed": ["agent_builder", "m365_copilot"],
    },
]


def main():
    apa = load_apa()
    failed = 0
    for case in GOLDEN:
        ranked, zeroed = rank(apa, case["answers"])
        winner = ranked[0]["id"]
        callouts = callouts_match(apa, case["answers"], winner)
        ok = True
        msgs = []

        if "expect_winner" in case and winner != case["expect_winner"]:
            ok = False
            msgs.append(f"winner={winner} expected={case['expect_winner']}")
        if "expect_winner_in" in case and winner not in case["expect_winner_in"]:
            ok = False
            msgs.append(f"winner={winner} expected_in={case['expect_winner_in']}")
        if case.get("expect_callouts"):
            missing = [c for c in case["expect_callouts"] if c not in callouts]
            if missing:
                ok = False
                msgs.append(f"missing_callouts={missing} got={callouts}")
        if case.get("expect_zeroed"):
            for p in case["expect_zeroed"]:
                if not zeroed.get(p):
                    ok = False
                    msgs.append(f"expected zeroed {p}")

        status = "PASS" if ok else "FAIL"
        scores = ", ".join(f"{r['id']}={r['score']}" for r in ranked if r["id"] != "m365_copilot")
        print(f"[{status}] {case['id']} {case['name']}")
        print(f"       winner={winner} scores=[{scores}] callouts={callouts}")
        if msgs:
            print(f"       {'; '.join(msgs)}")
            failed += 1

    if failed:
        print(f"\n{failed} golden path(s) failed", file=sys.stderr)
        return 1
    print(f"\nAll {len(GOLDEN)} scored golden paths passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
