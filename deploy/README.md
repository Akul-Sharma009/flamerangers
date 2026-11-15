# Deploy folder

`tools/build_deploy.py` builds the folder that is uploaded to Vercel: the service code
(`burncal/`), the contract files the service reads, `index.py` (the entry point, from
`deploy/index.py`), `requirements.txt`, `.python-version`, `.vercelignore`, and one store
version. `points.parquet` ships as `points/part-NNN.parquet` (same rows, same order) because
Vercel Hobby refuses source files of 100 MB or more.

    uv run python tools/build_deploy.py <store root> <out dir>

`<out dir>` must not exist. Only the current store version is copied, so the previous
version is answered with 410 by the service. Use `--part-mb` to change the part size cap
(default 55).

Vercel project settings:

- `CORS_ORIGINS` is a Vercel project environment variable. Set it to the web app's origin.
- `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` is needed for bundles over 250 MB.

The store, the built folder and secrets are never committed. Hotspot data stays out of git.
