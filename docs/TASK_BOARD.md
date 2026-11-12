# Task board

This is the shared development queue; it is intentionally independent of GitHub issues or project boards.

Status: `Proposed` → `Ready` → `In progress` → `Review` → `Verified` → `Done`. Use `Blocked` when work cannot proceed and state what is needed. Do not mark a task `Ready` without an approved requirement and clear completion criteria.

**Orchestration note (2026-11-12):** Ownership by *role*, not Paseo session id. Sessions expire; the orchestrator creates a fresh agent per handoff from the matching profile in `docs/AGENT_PROFILES.md`.

## Confirmed fixes (verified by orchestrator 2026-11-12)

| Task ID | Requirement | Status | Evidence |
|---|---|---|---|
| P0-FIX-001 (envelope) | 33x `error:` → `errors:` | **Done** (0 violations) | `grep -r 'error: error.message' src/ \| wc -l` → 0 |
| P0-FIX-001 (state machine) | Terminal states block transition, authz added | **Done** | Code in `repairRequests.js:278-312` |
| P0-FIX-001 (mass assignment) | Profile updates filter fields | **Done** | Code in `factories.js:86-89`, `technicians.js:70-75` |
| P0-FIX-001 (admin bootstrap) | POST `/register/admin/bootstrap` | **Done** | Code in `auth.js:198-240` |
| P0-DISP-001 (geo query) | Coordinates/radius filtering | **Done** | Code in `technicians.js:274-320` |
| P0-AUTH-004 | First-admin bootstrap route | **Done** | See P0-FIX-001 bootstrap |
| P0-TEST-001 | Jest test suite | **Done** | 12/12 tests pass |

## P0 - MVP Implementation Tasks

| Task ID | Requirement/spec | Task and completion criteria | Owner | Status | Dependencies | Updated |
|---|---|---|---|---|---|---|
| P0-AUTH-001 | PROJECT_BRIEF | Initialize project structure and dependencies | Backend | Verified | None | 2026-11-12 |
| P0-AUTH-002 | PROJECT_BRIEF | Implement authentication system (JWT, role-based) | Backend | Verified | P0-AUTH-001 | 2026-11-12 |
| P0-AUTH-003 | PROJECT_BRIEF | Registration/login endpoints + UI for all roles | Backend + Frontend | In progress | P0-AUTH-002 | 2026-11-12 |
| P0-FACT-001 | PROJECT_BRIEF | Factory profile management (backend done; frontend forms) | Backend + Frontend | In progress | P0-AUTH-001 | 2026-11-12 |
| P0-TECH-001 | PROJECT_BRIEF | Technician registration and profile (backend done; frontend forms) | Backend + Frontend | In progress | P0-AUTH-001 | 2026-11-12 |
| P0-TECH-002 | PROJECT_BRIEF | Specialization and service area configuration | Backend | Review | P0-TECH-001 | 2026-11-11 |
| P0-TECH-003 | PROJECT_BRIEF | Availability status management | Backend | Review | P0-TECH-001 | 2026-11-11 |
| P0-FAULT-001 | PROJECT_BRIEF | Fault reporting system with image upload | Backend + Frontend | In progress | P0-FACT-001 | 2026-11-12 |
| P0-DISP-001 | PROJECT_BRIEF | Location-based technician discovery | Backend | Verified | P0-TECH-001 | 2026-11-12 |
| P0-DISP-002 | PROJECT_BRIEF | Repair request workflow (submit/accept/reject) | Backend | Review | P0-DISP-001 | 2026-11-12 |
| P0-DISP-003 | PROJECT_BRIEF | Job status update system | Backend | Verified | P0-DISP-002 | 2026-11-12 |
| P0-NTFY-001 | PROJECT_BRIEF | Basic notification system (model + routes) | Backend + Frontend | In progress | P0-DISP-002 | 2026-11-11 |
| P0-ADMIN-001 | PROJECT_BRIEF | Admin endpoints + dashboard UI | Backend + Frontend | In progress | P0-AUTH-001 | 2026-11-12 |
| P0-VERIFY-001 | TESTING_STANDARD | Runtime verify backend | Verifier | In progress | P0-AUTH-002 | 2026-11-12 |
| P0-UI-001 | PROJECT_BRIEF | Shared UI design system/components | Frontend | Ready | P0-AUTH-001 | 2026-11-12 |
| P0-STORE-001 | P0-FAULT-001 | File storage hardening (uploads dir, static serve, media guard) | Backend | In progress | P0-FAULT-001 | 2026-11-12 |

## P1 - Differentiator Tasks (To be scheduled after P0)

| Task ID | Requirement/spec | Task and completion criteria | Owner | Status | Dependencies | Updated |
|---|---|---|---|---|---|---|
| P1-MATCH-001 | PROJECT_BRIEF | Implement multi-technician dispatch | Agent | Proposed | P0-DISP-001 | 2026-11-11 |
| P1-MATCH-002 | PROJECT_BRIEF | Build technician ranking and matching algorithm | Agent | Proposed | P0-DISP-001 | 2026-11-11 |
| P1-QUOTE-001 | PROJECT_BRIEF | Implement quotations and approval system | Agent | Proposed | P0-DISP-002 | 2026-11-11 |
| P1-REVIEW-001 | PROJECT_BRIEF | Build ratings and reviews system | Agent | Proposed | P0-DISP-003 | 2026-11-11 |
| P1-REPORT-001 | PROJECT_BRIEF | Repair history + digital service report | Agent | Proposed | P0-DISP-003 | 2026-11-11 |

## Handoff notes

- P0-FIX-001 (backend hardening) **completed** — verified by orchestrator.
- P0-STORE-001 assigned to worker `00c4498b` for uploads hardening.
- P0-UI-001 / P0-AUTH-003 pending frontend agent.
- No git repo (commit planned after full P0 completion).

**Verification evidence (2026-11-12):**
- `npm test` → PASS (12/12 tests)
- `node --check` all src files → PASS
- Runtime probe verified: admin bootstrap, geo queries, mass-assignment protection, envelope compliance.