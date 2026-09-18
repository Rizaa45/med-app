#!/usr/bin/env python3
"""Convert data JSON to a local JS file (works under file:// — no fetch needed).
   Generates js/data-local.js: window.__SLM_DATA__ = { modules, summaries, banks }."""
import json, os

APP = __import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
OUT = os.path.join(APP, "js", "data-local.js")

with open(os.path.join(APP, "data", "modules.json"), encoding="utf-8") as f:
    modules = json.load(f)

with open(os.path.join(APP, "data", "summaries.json"), encoding="utf-8") as f:
    summaries = json.load(f)

banks = {}
for i in range(1, 10):
    p = os.path.join(APP, "data", "question-banks", f"module{i}_questions.json")
    with open(p, encoding="utf-8") as f:
        banks[str(i)] = json.load(f)

data = {"modules": modules, "summaries": summaries, "banks": banks}

js = (
    "/* SLM System v8 — lokale Daten (aus data/*.json generiert).\n"
    "   Wird als <script> geladen: funktioniert auch unter file:// ohne Server. */\n"
    "window.__SLM_DATA__ = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(js)

print(f"Wrote {OUT} ({os.path.getsize(OUT)//1024} KB)")
print(f"  modules: {len(modules)}, summaries keys: {len(summaries)}")
for k, v in sorted(banks.items(), key=lambda x: int(x[0])):
    print(f"  bank M{k}: {len(v)} questions")
