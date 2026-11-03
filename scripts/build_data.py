#!/usr/bin/env python3
"""Build data/questions.json from the public files of the
ai-engineer-interview-questions site repo (README.md + tools/question_pages_*.py).
Usage: python3 scripts/build_data.py /path/to/ai-engineer-interview-questions
"""
import json, re, sys, importlib.util, pathlib

src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "../qbank")
readme = (src / "README.md").read_text(encoding="utf-8")

def load_pages(p):
    spec = importlib.util.spec_from_file_location(p.stem, p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m.PAGES

pages = load_pages(src / "tools/question_pages_data.py") + load_pages(src / "tools/question_pages_batch2.py")
by_num = {}
for pg in pages:
    for n in pg.get("src", [])[:1]:   # primary source question only
        by_num.setdefault(n, pg)

TOPIC_IDS = {
 "LLM Fundamentals": "llm-fundamentals",
 "Prompting and Structured Output": "prompting",
 "RAG and Retrieval": "rag",
 "Agents, Tool Use and MCP": "agents",
 "Fine-Tuning and Model Adaptation": "fine-tuning",
 "Evaluation": "evaluation",
 "AI System Design": "system-design",
 "Production, Cost and Safety": "production",
 "Coding": "coding",
}

body = readme.split("## LLM Fundamentals", 1)[1]
body = "## LLM Fundamentals" + body.split("## Sources and further reading", 1)[0]
questions, topic = [], None
for block in re.split(r"(?m)^(?=## |### )", body):
    if block.startswith("## "):
        topic = block[3:].splitlines()[0].strip(); continue
    if not block.startswith("### "): continue
    head, _, rest = block.partition("\n")
    m = re.match(r"### (\d+)\. (.+?) `(Entry|Mid|Senior)`\s*$", head)
    if not m: raise SystemExit(f"unparsed heading: {head}")
    num, q, level = int(m[1]), m[2].strip(), m[3]
    rest = re.split(r"\n\s*---\s*\n", rest.strip())[0]  # drop README promo blocks between sections
    rest = rest.strip().rstrip("-").strip()
    follow = None
    fm = re.search(r"(?m)^> \*\*Likely follow-up:\*\*\s*(.+)$", rest)
    if fm:
        follow = fm[1].strip(); rest = (rest[:fm.start()] + rest[fm.end():]).strip()
    item = {"id": f"aie-{num:03d}", "number": num, "topic": TOPIC_IDS[topic], "topic_name": topic,
            "level": level, "question": q, "answer": rest}
    if follow: item["follow_up"] = follow
    pg = by_num.get(num)
    if pg:
        item["slug"] = pg["slug"]
        item["deep_dive"] = {"what_it_tests": pg.get("testing"), "framework": pg.get("steps", []),
                             "follow_ups": [{"q": a, "a": b} for a, b in pg.get("followups", [])],
                             "common_mistakes": pg.get("mistakes", [])}
    questions.append(item)

assert len(questions) == 100, len(questions)
out = {"source": "https://johnnnmai.github.io/ai-engineer-interview-questions/",
       "publisher": "Valenx Press", "updated": "2026-11-01",
       "topics": [{"id": v, "name": k} for k, v in TOPIC_IDS.items()],
       "questions": questions}
pathlib.Path("data").mkdir(exist_ok=True)
pathlib.Path("data/questions.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(questions), "questions,", sum(1 for q in questions if "deep_dive" in q), "with deep dives")
