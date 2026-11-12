# Task board

This is the shared development queue; it is intentionally independent of GitHub issues or project boards.

Status: `Proposed` → `Ready` → `In progress` → `Review` → `Verified` → `Done`. Use `Blocked` when work cannot proceed and state what is needed. Do not mark a task `Ready` without an approved requirement and clear completion criteria.

**Orchestration note (2026-11-12):** Ownership below is by *role*, not by Paseo session id, because sessions expire/error (the previous per-agent ids `3fbc182f`/`b143ef79`/`47fc7b7` are stale). The orchestrator session creates a fresh agent per handoff from the matching profile in `docs/AGENT_PROFILES.md`.

## P0 - MVP Implementation Tasks

| Task ID | Requirement/spec | Task and completion criteria | Owner | Status | Dependencies | Updated |
|---|---|---|---|---|---|---|
| P0-AUTH-001 | PROJECT_BRIEF | Initialize project structure and dependencies | Backend | Verified | None | 2026-11-12 |
| P0-AUTH-002 | PROJECT_BRIEF | Implement authentication system (JWT, role-based) | Backend | Verified | P0-AUTH-001 | 2026-11-12 |
| P0-AUTH-003 | PROJECT_BRIEF | Registration/login endpoints + UI for all roles | Backend + Frontend | In progress | P0-AUTH-002 | 2026-11-12 |
| P0-AUTH-004 | PROJECT_BRIEF | **First-admin bootstrap** so an empty DB can create the first admin (e.g. env `INITIAL_ADMIN_EMAIL/PASSWORD` seeded on boot, or a guarded setup route) | Backend | Ready | P0-AUTH-002 | 2026-11-12 |
| P0-FACT-001 | PROJECT_BRIEF | Factory profile management (backend done; frontend forms) | Backend + Frontend | In progress | P0-AUTH-001 | 2026-11-12 |
| P0-TECH-001 | PROJECT_BRIEF | Technician registration and profile (backend done; frontend forms) | Backend + Frontend | In progress | P0-AUTH-001 | 2026-11-12 |
| P0-TECH-002 | PROJECT_BRIEF | Specialization and service area configuration | Backend | Review | P0-TECH-001 | 2026-11-11 |
| P0-TECH-003 | PROJECT_BRIEF | Availability status management (PUT /api/technicians/availability) | Backend | Review | P0-TECH-001 | 2026-11-11 |
| P0-FAULT-001 | PROJECT_BRIEF | Fault reporting system with image upload | Backend + Frontend | In progress | P0-FACT-001 | 2026-11-12 |
| P0-DISP-001 | PROJECT_BRIEF | Location-based technician discovery (geo/near query + specialization) — **acceptance gap: no geo query yet** | Backend | In progress | P0-TECH-001 | 2026-11-12 |
| P0-DISP-002 | PROJECT_BRIEF | Repair request workflow (submit/accept/reject) | Backend | Review | P0-DISP-001 | 2026-11-11 |
| P0-DISP-003 | PROJECT_BRIEF | Job status update system (state machine in repairRequests.js) — **acceptance gap: bypass + no authz** | Backend | In progress | P0-DISP-002 | 2026-11-12 |
| P0-NTFY-001 | PROJECT_BRIEF | Basic notification system (model + routes) | Backend | In progress | P0-DISP-002 | 2026-11-11 |
| P0-ADMIN-001 | PROJECT_BRIEF | Admin endpoints (users, verification, stats) + dashboard UI | Backend + Frontend | In progress | P0-AUTH-001 | 2026-11-11 |
| P0-VERIFY-001 | TESTING_STANDARD | Runtime verify backend (boot, /health, Jest, security, consistency) | Verifier | In progress | P0-AUTH-002 | 2026-11-12 |
| P0-UI-001 | PROJECT_BRIEF | Shared UI design system/components (Button, Input, Card, Modal, Alert, Spinner, nav) consistent across all pages | Frontend | In progress | P0-AUTH-001 | 2026-11-11 |
| P0-TEST-001 | TESTING_STANDARD | Test harness: mongodb-memory-server devDep ✓, tests/ dir ✓, Jest config, first auth/model tests ✓ (2/2 pass), /health smoke ✓ | Backend | In progress | P0-AUTH-002 | 2026-11-12 |
| P0-STORE-001 | P0-FAULT-001 | File storage: create uploads/fault-reports/, serve /uploads statically, guard empty uploads, ensure `.gitignore` covers uploads ✓ | Backend | Ready | P0-FAULT-001 | 2026-11-12 |
| P0-FIX-001 | Planner review REV2 + runtime probe | Critical/high fixes: API envelope (33x `error:`), state-machine bypass + terminal states, role/ownership checks on status, mass assignment, geo query, media guard, null-derefs | Backend | In progress | P0-DISP-002 | 2026-11-12 |

## P1 - Differentiator Tasks (To be scheduled after P0)

| Task ID | Requirement/spec | Task and completion criteria | Owner | Status | Dependencies | Updated |
|---|---|---|---|---|---|---|
| P1-MATCH-001 | PROJECT_BRIEF | Implement multi-technician dispatch | Agent | Proposed | P0-DISP-001 | 2026-11-11 |
| P1-MATCH-002 | PROJECT_BRIEF | Build technician ranking and matching algorithm | Agent | Proposed | P0-DISP-001 | 2026-11-11 |
| P1-QUOTE-001 | PROJECT_BRIEF | Implement quotations and approval system | Agent | Proposed | P0-DISP-002 | 2026-11-11 |
| P1-REVIEW-001 | PROJECT_BRIEF | Build ratings and reviews system | Agent | Proposed | P0-DISP-003 | 2026-11-11 |
| P1-REPORT-001 | PROJECT_BRIEF | Repair history + digital service report | Agent | Proposed | P0-DISP-003 | 2026-11-11 |

## Handoff notes

- Coordinate all shared interface changes through the orchestrator
- Each contributor owns their assigned tasks but must not modify files owned by others
- Report blockers immediately to the orchestrator
- Use the testing standard defined in docs/TESTING_STANDARD.md before marking tasks as done

**Verification evidence (2026-11-12, orchestrator direct run):**
- `node --check` all `src/**/*.js` → PASS
- `require('./src/server.js')` → PASS (boot blocker `authenticate` already fixed)
- `mongodb-memory-server` connect → PASS
- `npx jest --ci` → PASS 2/2 (User hashing, JWT payload)
- `GET /health` via supertest → 200 `{status:"ok"}`
- `POST /api/auth/register/factory` / `technician` → 201; `POST /api/auth/login` → 200 + token
- **Confirmed defects:** `PUT /api/factories/profile` allows `userId`/`isVerified` overwrite (mass assignment); `POST /api/auth/register/admin` as factory → 403 (no bootstrap); `GET /api/technicians` with radius/coordinates|lat/lng returns `[]` (no geo query); 33 handlers emit `error:` (envelope violation); `PUT /repair-requests/:id/status` pending→completed allowed with no role check.