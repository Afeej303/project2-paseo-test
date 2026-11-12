# Task board

This is the shared development queue; it is intentionally independent of GitHub issues or project boards.

Status: `Proposed` → `Ready` → `In progress` → `Review` → `Verified` → `Done`. Use `Blocked` when work cannot proceed and state what is needed. Do not mark a task `Ready` without an approved requirement and clear completion criteria.

**Orchestration note (2026-11-12):** Acting orchestrator is agent `a6a680dd` (takeover authorized by project owner; the original `f2218d5e` session is dead). Ownership is by *role*; implementers are told not to commit — the orchestrator reviews changes before any commit. Prior board entries claiming "P0 complete" and a frontend agent `fcd68b46` were unverified/false and have been corrected.

## Confirmed fixes (verified by acting orchestrator 2026-11-12)

| Task ID | Requirement | Status | Evidence |
|---|---|---|---|
| P0-FIX-001 (envelope) | `error:` → `errors:` across handlers | **Done** | `grep -rn 'error: error.message' src` → 0 |
| P0-FIX-001 (state machine) | Terminal states block transition, role/ownership authz | **Done** | Code in `repairRequests.js`; tests added |
| P0-FIX-001 (mass assignment) | Profile updates filter fields | **Done** | Code in `factories.js`, `technicians.js`; tests added |
| P0-FIX-001 (admin bootstrap) | Env seeding + guarded `POST /register/admin/bootstrap` | **Done** | `src/server.js` `bootstrapAdmin`; `auth.js` route; tests |
| P0-DISP-001 (geo query) | Coordinates/radius filtering | **Done** | `technicians.js` `$near`; test added |
| P0-STORE-001 | Uploads dir, static serving, empty-upload guard | **Done** | `server.js` mkdir + `/uploads`; `faultReports.js` guard |
| P0-TEST-001 | Jest test suite | **Done** | `npx jest --ci --runInBand` → 40/40 PASS |
| P0-FIX-002 | Remaining backend hardening (null-derefs, fault-report status/assign authz, registration atomicity, notification id validation) | **Verified** | 28/28 at verification (suite now 40/40); lint 0 errors; 12 new tests |
| P0-FIX-003 | Reject assignment of a nonexistent technician id on `PUT /fault-reports/:id/assign` | **Verified** | 404 without mutation; `npx jest --ci --runInBand` → 29/29 |
| P0-FIX-004 | Admin technician-profile overposting, media ownership check before multer, empty `preferredVisitTime` cast | **Verified** | Pre-multer ownership + visit-time validation; admin whitelist locked by regression test; 33/33 |
| P0-VERIFY-001 (backend) | Independent backend verification | **Verified** | Verifier `7412e9d0`: 29/29 at the time (suite now 40/40), lint 0 errors, node --check PASS; false positives retracted |
| P0-FRONT-001 | Frontend routing + all P0 pages (factory/technician/admin/fault/notifications) | **Verified** | Delivered by `d10b48f0`; verifier `7412e9d0` PASS: build 120 modules, lint 0 errors/1 warning, routes/guards/contracts/scope clean |
| P0-FIX-005 | Propagate technician assignment to repair request; restrict accept/reject to assigned technician | **Verified** | Assign now sets `RepairRequest.technicianId`; 403 for non-assigned accept/reject; 35/35 |
| P0-FIX-006 | Create notifications on assign/accept/reject/status events; gate admin bootstrap route | **Verified** | Best-effort notify service; bootstrap requires `ALLOW_ADMIN_BOOTSTRAP=true`; 40/40 + 27/27 live smoke |

## P0 - MVP Implementation Tasks

| Task ID | Requirement/spec | Task and completion criteria | Owner | Status | Dependencies | Updated |
|---|---|---|---|---|---|---|
| P0-AUTH-001 | PROJECT_BRIEF | Initialize project structure and dependencies | Backend | Verified | None | 2026-11-12 |
| P0-AUTH-002 | PROJECT_BRIEF | Implement authentication system (JWT, role-based) | Backend | Verified | P0-AUTH-001 | 2026-11-12 |
| P0-AUTH-003 | PROJECT_BRIEF | Registration/login endpoints + routed UI for all roles | Backend + Frontend | Verified | P0-AUTH-002 | 2026-11-12 |
| P0-FACT-001 | PROJECT_BRIEF | Factory profile management: backend + profile/location UI | Backend + Frontend | Verified | P0-AUTH-001 | 2026-11-12 |
| P0-TECH-001 | PROJECT_BRIEF | Technician registration/profile: backend + profile UI | Backend + Frontend | Verified | P0-AUTH-001 | 2026-11-12 |
| P0-TECH-002 | PROJECT_BRIEF | Specialization and service area configuration | Backend + Frontend | Verified | P0-TECH-001 | 2026-11-12 |
| P0-TECH-003 | PROJECT_BRIEF | Availability status management | Backend + Frontend | Verified | P0-TECH-001 | 2026-11-12 |
| P0-FAULT-001 | PROJECT_BRIEF | Fault reporting with image upload | Backend + Frontend | Verified | P0-FACT-001 | 2026-11-12 |
| P0-DISP-001 | PROJECT_BRIEF | Location-based technician discovery | Backend + Frontend | Verified | P0-TECH-001 | 2026-11-12 |
| P0-DISP-002 | PROJECT_BRIEF | Repair request workflow (submit/accept/reject) | Backend + Frontend | Verified | P0-DISP-001 | 2026-11-12 |
| P0-DISP-003 | PROJECT_BRIEF | Job status update system | Backend + Frontend | Verified | P0-DISP-002 | 2026-11-12 |
| P0-NTFY-001 | PROJECT_BRIEF | Notifications: read API + UI + event creation | Backend + Frontend | Verified | P0-DISP-002 | 2026-11-12 |
| P0-ADMIN-001 | PROJECT_BRIEF | Admin endpoints + dashboard UI | Backend + Frontend | Verified | P0-AUTH-001 | 2026-11-12 |
| P0-VERIFY-001 | TESTING_STANDARD | Runtime verify backend + frontend against acceptance criteria | Verifier | Verified | P0-AUTH-002 | 2026-11-12 |
| P0-UI-001 | PROJECT_BRIEF | Shared UI components + page-level usage | Frontend | Verified | P0-AUTH-001 | 2026-11-12 |
| P0-STORE-001 | P0-FAULT-001 | File storage hardening (uploads dir, static serve, media guard) | Backend | Done | P0-FAULT-001 | 2026-11-12 |
| P0-FIX-002 | P0-FIX-001 follow-on | Null-derefs, fault-report status/assign authz, registration atomicity, notification id validation + tests | Backend | Verified | P0-FIX-001 | 2026-11-12 |
| P0-FIX-003 | P0-FIX-002 follow-on | Reject nonexistent technician id on fault-report assign (404, envelope) + test | Backend | Verified | P0-FIX-002 | 2026-11-12 |
| P0-FIX-004 | P0-FIX-001 follow-on | Admin technician-profile whitelist, pre-multer ownership check, empty visit-time handling + tests | Backend | Verified | P0-FIX-002 | 2026-11-12 |
| P0-FIX-005 | P0-DISP-002 follow-on | Assign must set RepairRequest.technicianId; accept/reject restricted to assigned technician + tests | Backend | Verified | P0-FIX-004 | 2026-11-12 |
| P0-FIX-006 | P0-NTFY-001 follow-on | Notification creation on assign/accept/reject/status; admin bootstrap env gate + tests | Backend | Verified | P0-FIX-005 | 2026-11-12 |
| P0-FRONT-001 | P0-AUTH-003/FACT/TECH/FAULT/NTFY/ADMIN/UI | Role-aware routing + all P0 pages (factory, technician, admin, fault+upload, discovery, notifications) | Frontend | Verified | P0-AUTH-003 | 2026-11-12 |

## P1 - Differentiator Tasks (To be scheduled after P0)

| Task ID | Requirement/spec | Task and completion criteria | Owner | Status | Dependencies | Updated |
|---|---|---|---|---|---|---|
| P1-MATCH-001 | PROJECT_BRIEF | Implement multi-technician dispatch | Agent | Proposed | P0-DISP-001 | 2026-11-11 |
| P1-MATCH-002 | PROJECT_BRIEF | Build technician ranking and matching algorithm | Agent | Proposed | P0-DISP-001 | 2026-11-11 |
| P1-QUOTE-001 | PROJECT_BRIEF | Implement quotations and approval system | Agent | Proposed | P0-DISP-002 | 2026-11-11 |
| P1-REVIEW-001 | PROJECT_BRIEF | Build ratings and reviews system | Agent | Proposed | P0-DISP-003 | 2026-11-11 |
| P1-REPORT-001 | PROJECT_BRIEF | Repair history + digital service report | Agent | Proposed | P0-DISP-003 | 2026-11-11 |

## Handoff notes

- Acting orchestrator `a6a680dd` (project-owner authorized). Original orchestrator `f2218d5e` is dead; the earlier `fcd68b46` reference was invalid.
- **P0-FRONT-001** → Frontend agent `d10b48f0` — **Verified** by verifier `7412e9d0` (PASS; build 120 modules, lint 0 errors).
- **P0-FIX-005** → Backend agent `00c4498b` — **Verified** by acting orchestrator (35/35 tests, lint 0 errors).
- **P0-FIX-006** → Backend agent `00c4498b` — **Verified** by acting orchestrator (40/40 tests, lint 0 errors, live smoke).
- **P0-FIX-002** → Backend agent `00c4498b` — **Verified** by acting orchestrator (28/28 tests, lint 0 errors).
- **P0-FIX-003** → Backend agent `00c4498b` — **Verified** by acting orchestrator (29/29 tests, lint 0 errors).
- **P0-FIX-004** → Backend agent `00c4498b` — **Verified** by acting orchestrator (33/33 tests, lint 0 errors).
- **P0-VERIFY-001** → verifier `7412e9d0` — backend + frontend acceptance PASS.
- Implementers must not edit `docs/`, `src/` (frontend) or `frontend/` (backend), and must not commit; the orchestrator reviews changes before any commit.
- **P0 is feature-complete and verified.** Remaining before ship: packaging (README/.env.example), commit approval, and deployment configuration (Mongo URI, `VITE_API_URL`, CORS origin).

**Verification evidence (2026-11-12, acting orchestrator):**
- `npx jest --ci --runInBand` → PASS (40/40 tests after P0-FIX-006)
- `npm run lint` → 0 errors (8 warnings)
- `cd frontend && npm run build` → PASS (120 modules)
- `cd frontend && npm run lint` → 0 errors (1 warning)
- `node --check` on changed source/tests → PASS
- Live API smoke (`scripts/dev-server.js`, in-memory Mongo) → 27/27 checks across the full P0 flow