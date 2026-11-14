# Evidence

`scoring/` holds the scoring outputs, copied unchanged, with their hashes in `scoring/MANIFEST.json`. Never edit them.

`claims.yaml` holds the fixed sentences about how C1 scored. Every number in them points at a field in a scoring file; `test_claims.py` checks each one.

`build.py` writes `web/src/evidence/evidence.json`, everything the evidence view shows, in the shape of `contract/evidence.schema.json`. Each number is read from a field in a scoring file and carries its file and JSON pointer; nothing is typed in or recomputed.

```bash
uv run python evidence/build.py            # write evidence.json
uv run python evidence/build.py --check    # fail if it is stale or any figure differs from its source
uv run python evidence/wording.py          # fail on the wording banned in wording.py, in README.md or web/dist
```

Story 2.10's NOAA-20 comparison is read once its file, named `noaa20_check_*.json`, is in `scoring/` and listed in the manifest; its `label` must say "reported only" and "not a validation against Aqua". Until then the evidence view says the comparison has not been run.

Run the build after any change to `claims.yaml`, and the wording check after `npm run build` in `web/`.
