# Web

Static React client (Vite, React, TypeScript) for the burning activity calendar. It renders what the read-only data service returns and computes no numbers.

Requires Node 26 (see `.nvmrc`).

## Setup

    npm install
    cp .env.example .env    # set VITE_SERVICE_BASE_URL (the only build-time variable)

## Commands

- `npm run dev`: start the dev server
- `npm run build`: typecheck, then build to `dist/` (git-ignored)
- `npm run test`: run unit tests (vitest)
- `npm run typecheck`: TypeScript check
- `npm run gen:types`: generate `src/api/schema.d.ts` from `../contract/openapi.yaml`
- `npm run smoke:types`: generate types from `smoke/two-field.openapi.yaml` and check the result compiles

All dependency versions are pinned exactly. Playwright is installed as a package only; browsers are not downloaded.
