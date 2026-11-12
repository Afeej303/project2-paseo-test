# Team roles and ownership

**Status:** Active (AI agent roles confirmed by orchestrator; human team may revise).

**2026-11-12 note:** Ownership is tracked by *role*, not by Paseo session id. Sessions expire and error (the previous `3fbc182f`/`b143ef79`/`47fc7b7`/`f2218d5e` sessions were killed and are stale). The orchestrator creates a fresh agent per handoff from the matching profile in `docs/AGENT_PROFILES.md`. New agent ids are recorded in handoff notes per task, not as permanent role identities.

| Member/role | Owned feature IDs | Files/components primarily owned | Shared interfaces to coordinate | Reviewer |
|---|---|---|---|---|
| Project Orchestrator (this session) | Cross-project planning and docs | `docs/` canonical records | All cross-cutting decisions | Project owner |
| Feature Builder - Backend | P0-AUTH, P0-FACT (API), P0-TECH (API), P0-FAULT (API), P0-DISP, P0-NTFY, P0-ADMIN (API) | `package.json`, `src/**` (models, routes, middleware), `tests/`, `.gitignore` | API contract (response envelope, auth header), mounting new routes in `src/server.js` | Verifier |
| Feature Builder - Frontend | P0-AUTH (UI), P0-FACT (UI), P0-TECH (UI), P0-FAULT (UI), P0-ADMIN (UI) | `frontend/**` only | Calls API per documented contract; must not edit `src/` or root `package.json` | Verifier |
| Verifier / Finisher | Verification of all tasks (P0-VERIFY-*) | None (read + run checks; fixes only within assigned scope) | Reports evidence to orchestrator | Orchestrator |
| Planner / Reviewer | On-demand planning/reviews | None (read-only recommendations) | Recommendations via orchestrator | Orchestrator |

## Ownership rules

- Each task has one accountable owner. Other agents may review or pair but coordinate before editing the same files.
- Backend owns `src/` and root `package.json`; frontend owns `frontend/`; orchestrator owns `docs/`. No cross-boundary edits without orchestrator approval (decision D-20261111-COORD).
- Shared interface changes require a decision record or explicit team confirmation before dependent features implement against them.
- Agents must state "I am the orchestrator" only for the orchestrator session; workers take assignments from orchestrator prompts.