#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
DATA = json.loads((ROOT / "data/normalized/key.json").read_text(encoding="utf-8"))

if len(sys.argv) != 2:
    raise SystemExit("Usage: python scripts/query_key.py <taxon-name-fragment>")

query = sys.argv[1].casefold()
matches = [taxon for taxon in DATA["taxa"] if query in taxon["name"].casefold()]
if not matches:
    raise SystemExit(f"No taxon matching {sys.argv[1]!r}")

states = {item["id"]: item for item in DATA["states"]}
features = {item["id"]: item for item in DATA["features"]}
for taxon in matches:
    print(f"{taxon['name']}\n  source entity ID: {taxon['id']}\n  source UUID: {taxon['uid']}")
    sheets = [x for x in DATA["fact_sheets"] if x["source"] == "entity" and x["source_id"] == taxon["id"]]
    media = [x for x in DATA["media"] if x["source"] == "entity" and x["source_id"] == taxon["id"]]
    print(f"  fact sheet: {sheets[0]['source_path'] if sheets else 'none'}")
    print(f"  linked media records (full + JSON thumbnails): {len(media)}")
    for score in DATA["scores"]:
        if score["entity_id"] == taxon["id"] and score["raw_code"] != 0:
            feature = features[score["feature_id"]]
            state = states[score["state_id"]]
            print(f"  [{score['score_type']}; raw={score['raw_code']}] {feature['name']} :: {state['name']} (state {state['id']})")
    print()
