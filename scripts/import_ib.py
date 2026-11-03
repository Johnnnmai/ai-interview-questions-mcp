#!/usr/bin/env python3
"""Build data/ib-questions.json (100 Investment Banking questions).

Usage: python3 scripts/import_ib.py <source questions.json>
The source is the combined bank built from the public IB question site
(https://johnnnmai.github.io/investment-banking-interview-questions/).
IB results in this server link only to the free IB Top 30 guide, so no
per-question URLs are kept.
"""
import json, sys

src = sys.argv[1] if len(sys.argv) > 1 else "../../interview-mcp/data/questions.json"
LEVEL = {"Easy": "Entry", "Medium": "Mid", "Hard": "Senior"}
TOPICS = {
    "accounting": ("ib-accounting", "IB: Accounting"),
    "valuation": ("ib-valuation", "IB: Valuation"),
    "manda": ("ib-ma", "IB: M&A"),
    "lbo": ("ib-lbo", "IB: LBO"),
    "industry-restructuring-and-current-events": ("ib-industry", "IB: Industry, Restructuring and Current Events"),
}

raw = json.load(open(src, encoding="utf-8"))
ib = sorted((q for q in raw["questions"] if q.get("track") == "investment-banking"), key=lambda q: q["n"])
assert [q["n"] for q in ib] == list(range(1, 101)), "expected IB questions 1..100"

topics, out = [], []
for q in ib:
    tid, tname = TOPICS[q["topic_id"]]
    if not any(t["id"] == tid for t in topics):
        topics.append({"id": tid, "name": tname})
    rec = {
        "id": f"ib-{q['n']:03d}",
        "number": q["n"],
        "track": "investment-banking",
        "topic": tid,
        "topic_name": tname,
        "level": LEVEL[q["level"]],
        "question": q["q"],
        "answer": q["answer"],
    }
    if q.get("subtopic"):
        rec["subtopic"] = q["subtopic"]
    if q.get("follow_up"):
        rec["follow_up"] = q["follow_up"]
    out.append(rec)

text = json.dumps({"publisher": "Valenx Press", "updated": "2026-11-02", "topics": topics, "questions": out}, ensure_ascii=False, indent=1)
assert "\u2014" not in text, "em dash found"
open("data/ib-questions.json", "w", encoding="utf-8").write(text + "\n")
print(f"wrote {len(out)} IB questions, {len(topics)} topics")
