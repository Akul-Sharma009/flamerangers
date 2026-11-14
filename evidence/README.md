# Evidence

`scoring/` holds the scoring outputs, copied unchanged, with their hashes in `scoring/MANIFEST.json`. Never edit them.

`claims.yaml` holds the fixed sentences about how C1 scored. Every number in them points at a field in a scoring file; `test_claims.py` checks each one. The build that writes `evidence.json` arrives with Story 5.2. The shape of `evidence.json` is in `contract/evidence.schema.json`.
