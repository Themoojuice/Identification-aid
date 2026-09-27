#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser(description="List taxa compatible with one Lucid state.")
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
parser.add_argument("--state", required=True, type=int, help="Lucid state ID")
parser.add_argument("--strict", action="store_true", help="Exclude uncertain and misinterpretation scores")
args = parser.parse_args()

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "data/normalized/key.json").read_text(encoding="utf-8"))
state = next((x for x in data["states"] if x["id"] == args.state), None)
if state is None:
    raise SystemExit(f"Unknown state ID {args.state}")
feature = next(x for x in data["features"] if x["id"] == state["feature"])
taxa = {x["id"]: x for x in data["taxa"]}
accepted = {1, 2} if args.strict else {1, 2, 3, 4, 5}
scores = [x for x in data["scores"] if x["state_id"] == args.state and x["raw_code"] in accepted]
print(f"{feature['name']} :: {state['name']} (state {state['id']})")
print(f"Compatible taxa ({len(scores)}):")
for score in scores:
    print(f"  {taxa[score['entity_id']]['name']} [{score['score_type']}]")
