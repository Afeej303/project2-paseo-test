# Testing and verification standard

**Status:** Active (first pass — commands below to be confirmed by running them; unrun commands are marked).

## Project commands and targets

- Install/setup: `npm install` (backend, root). Frontend: `cd frontend && npm install` (once scaffolded).
- Lint/format: `npm run lint` (ESLint configured in package.json — config file not yet created).
- Type check: Not applicable (plain JavaScript, no TypeScript).
- Unit/component tests: `npm test` (Jest). Tests live in `tests/`. Uses `mongodb-memory-server` (decision D-20261111-MONGO-LOCAL).
- Integration/build: Backend smoke test: start with in-memory MongoDB (see decision D-20261111-MONGO-LOCAL) then `curl http://localhost:3000/health` expecting `{"status":"ok",...}`. Frontend: `cd frontend && npm run build`.
- Run locally: Backend `npm run dev` (nodemon) on :3000; frontend dev server once scaffolded.
- Supported browsers/devices: TBD (Buildathon: modern desktop browsers minimum; mobile-responsive expected).
- Environment assumptions: Node.js >= 18 (installed: v26.13.0). **No system MongoDB, no Docker, no sudo on this machine** — local DB via `mongodb-memory-server` only. Never claim a check passed that was not actually run.

Do not report a command as passing unless it was actually run. If a command is unavailable, record that rather than inventing a replacement.

## Verification levels

Use the levels relevant to each change and state what was skipped:

1. Static checks: lint, formatting, type checks.
2. Unit/component checks: changed logic and user-visible states.
3. Integration checks: shared state, services, and feature boundaries.
4. Manual user flow: success, validation, loading, empty, error, and recovery behavior.
5. Platform checks: responsive behavior, accessibility, permissions, offline behavior, install/update lifecycle, or native/device APIs as applicable.

## Test design and safety

- Derive checks from approved acceptance criteria.
- Cover negative/failure paths as well as the happy path.
- Use synthetic data and non-production credentials (`.env` local secrets only; never commit real credentials).
- Report exact command, result, and relevant environment.

## Handoff evidence template

```text
Task/requirement IDs:
Commands actually run and results:
Manual scenarios and environment:
Acceptance criteria verified:
Not verified / reason:
Open failures or follow-up:
```
