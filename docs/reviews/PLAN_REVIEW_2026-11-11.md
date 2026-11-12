# Plan review — Industrial Repair Technician Platform

**Status:** Draft (not a canonical decision record; orchestrator integrates)
**Author:** Planner / Reviewer agent (`123622a`)
**Date:** 2026-11-11 (rev 2 — re-based on updated docs + actual backend code)
**Scope:** Re-verification of orchestrator answers, remaining task gaps, and contract
violations in the three blocking interfaces.
**Note:** No code was implemented or changed by this review.

---

## 0. Orchestrator answers vs. recorded docs

| # | Orchestrator answer | Recorded? | Verdict |
|---|---|---|---|
| 1 | Stack: Node/Express + MongoDB/Mongoose + JWT/bcrypt; React+Vite; REST envelope | `D-20261111-STACK`, `D-20261111-API`, `D-20261111-MONGO-LOCAL` | ✅ Match. PostGIS correctly rejected (no Docker/sudo). |
| 2 | Monolith | **Not recorded** | ⚠️ Implied only. Not in `DECISIONS.md`; `PROJECT_BRIEF.md` open question still unchecked. Needs a line. |
| 3 | Ownership solved (`TEAM_ROLES.md`) | ✅ | ✅ Match, but `PROJECT_STATE.md` disagrees (see conflicts). |
| 4 | API conventions frozen (`D-20261111-API`) | ✅ | ⚠️ Doc frozen, **implementation violates it** (33 sites). |
| 5 | Notifications = in-app Mongo model + polling; no email/push; WebSocket deferred | **Not recorded** | ⚠️ `PROJECT_STATE.md` still says "decide before P0-NTFY-001"; `CODEBASE_MAP.md` says TBD. Needs a decision record. |
| 6 | Descope order (a) media upload (b) admin stats (c) reviews (d) quotations | **Not recorded** | ⚠️ Absent from `DECISIONS.md`/`CHANGE_QUEUE.md`/`TASK_BOARD.md`. |
| 7 | Tests: Jest unit + backend smoke; `mongodb-memory-server`; no e2e | ✅ `TESTING_STANDARD.md` | ⚠️ `mongodb-memory-server` **not in `package.json`**; no `tests/` dir; no jest config. |

## 1. Document conflicts (stale canonical docs)

1. **`PROJECT_BRIEF.md`** — Technical decisions still read "To be determined"
   (Framework, Data storage/APIs, Testing tools); Open questions still list stack,
   backend architecture, database, and real-time as unresolved. Contradicts
   `DECISIONS.md`. Brief must be updated to point at the accepted decisions.
2. **`PROJECT_STATE.md:23`** — attributes backend work to owner `f2218d5e`
   (the orchestrator), but `TEAM_ROLES.md` assigns backend to `3fbc182f`.
3. **`PROJECT_STATE.md:47`** — "Notification delivery mechanism (polling vs WebSocket)
   — decide before P0-NTFY-001" is stale (orchestrator has decided polling).
4. **`CODEBASE_MAP.md:37`** — "No admin routes yet … no notifications model/routes" is
   stale; `src/routes/admin.js` and `src/routes/notifications.js` now exist.
5. **`CODEBASE_MAP.md:26`** — frontend "not started"; a Vite scaffold now exists.
6. **`package.json`** — missing `mongodb-memory-server` devDependency that
   `TESTING_STANDARD.md` and `D-20261111-MONGO-LOCAL` depend on.
7. **Unrecorded decisions:** monolith architecture (#2), notification scope (#5),
   descope order (#6) exist only in chat, not in canonical docs.

## 2. Foundation tasks — which genuinely remain as new rows

Checked the six suggestions against the current board/code:

| Suggestion | Status | New row? |
|---|---|---|
| P0-FOUND-001 (stack/scaffolding) | Absorbed into `DECISIONS.md` + `package.json` | ❌ No |
| P0-DATA-001 (schema/models) | Absorbed — 5 models exist | ❌ No |
| P0-API-001 (API conventions) | Absorbed into `DECISIONS.md` | ❌ No |
| P0-TEST-001 (test harness) | Only the *standard* exists; no deps/config/tests | ✅ **Yes** |
| P0-UI-001 (design system / shared UI) | Not owned by any task; brief requires it | ✅ **Yes** |
| P0-STORE-001 (file storage) | multer code exists but no dir/static serving/gitignore | ✅ **Yes** (or fold into P0-FAULT-001) |

**Proposed rows only:**
- `P0-UI-001` — Shared UI design system/components (owner: frontend `b143ef79`).
  Completion: shared layout, form, button, and API-error components used by ≥2 features;
  WCAG 2.1 basics.
- `P0-TEST-001` — Test harness: add `mongodb-memory-server` devDep, jest config,
  `tests/` dir, first unit tests (auth/model) + `/health` smoke test (owner: backend `3fbc182f`).
- `P0-STORE-001` — File storage hardening: create `uploads/fault-reports/`, serve
  `/uploads` statically, ignore uploads in `.gitignore` (owner: backend `3fbc182f`).

## 3. Interface violations (blocking interfaces)

### 3a. Authentication flow — **1 critical, several gaps**

- **CRITICAL (boot blocker):** `src/routes/admin.js:6` and
  `src/routes/notifications.js:4` do
  `const { authenticate } = require('../middleware/auth')`, but
  `src/middleware/auth.js:67` exports a default function (`module.exports = auth`) —
  there is **no named `authenticate` export**. `authenticate` is `undefined`, so
  `router.use(authenticate, …)` throws `TypeError: Router.use() requires a middleware
  function` at require-time. `src/server.js:37-38` requires both routes, so the server
  **fails to start**. (Runtime reproduction was blocked only because `node_modules` is
  absent; this is certain from the export shape.) Fix: `const auth = require(...)` and
  use `auth`, or add `module.exports.authenticate = auth`.
- **No first-admin bootstrap path.** `/register/admin` is admin-only, and login needs an
  existing user — with an empty DB no admin can ever be created. P0 gap.
- **Registration not atomic.** `User` is saved before the `Factory`/`Technician`
  profile; a profile-save failure leaves an orphan `User` (no transaction/rollback).
- Auth flow otherwise consistent: `Authorization: Bearer <token>`, JWT payload
  `{userId, email, role}`, `req.user/userId/userRole`, role helpers. ✅

### 3b. API response shape — **systemic contract violation**

- **33 handlers return `error: error.message`** (singular), which is **not** part of the
  frozen envelope `{ success, message?, data?, errors? }`. Files: `factories.js` (6),
  `auth.js` (5), `faultReports.js` (6), `repairRequests.js` (9), `technicians.js` (7).
  `src/server.js:51` also emits `error`. Should be `errors: [...]` or omitted.
- Validation errors correctly use `errors: errors.array()` ✅.
- `/health` returns `{ status, timestamp }` outside the envelope — acceptable, but
  document the exemption.

### 3c. Repair lifecycle (`RepairRequest`) — **state-machine + authz gaps**

- **Transition map bypassable.** `PUT /:id/status` only rejects when
  `validTransitions[current]` exists. `pending` has no entry → from `pending` **any**
  status can be set (e.g. jump straight to `completed`). `completed`/`cancelled` also
  have no entries → you can transition **out of** terminal states. The "state machine
  enforced server-side" claim does not hold.
- **No role/ownership check** on `PUT /:id/status` (only `auth`): any authenticated
  user, and any factory, can change any request's status.
- **Reject reason is dropped.** `POST /:id/reject` validates `reason` but never stores
  it (no field on the model).
- **Null-deref risks:** `repairRequests.js:362` (`(await Technician.findOne(...))._id`)
  and `:488` (`Technician.findById(...)` then `.ratings`) throw 500 when the profile is
  missing instead of returning 404/403.
- **Field mismatch:** review increments `completedJobs` (`:492`) but discovery sorts by
  `totalJobs` (`technicians.js:301`) → ranking signal never updates.
- **Owner-id mismatch:** `GET /api/repair-requests` filters technicians by
  `technicianId = req.userId` (a **User** id) though the field refs `Technician` — a
  technician likely sees zero of their requests. Same pattern in
  `faultReports.js:193` (`assignedTechnicianId = req.userId`).
- Scope note: quotation (`P1-QUOTE-001`) and review (`P1-REVIEW-001`) endpoints are
  implemented although they are P1 — acceptable but beyond P0.

### 3d. Other P0 gaps found while inspecting

- **Location-based discovery missing (P0-DISP-001).** `GET /api/technicians` filters by
  `specialization`, `city`, `available`, `emergency` only — **no geo/near query**,
  despite 2dsphere indexes on `Technician.serviceArea.location` and `Factory.location`.
  The brief requires "Location- and specialization-based technician discovery".
- **Mass assignment.** `PUT /api/factories/profile` and
  `PUT /api/technicians/profile` pass `req.body` straight into the update → a user can
  set `userId`, `isVerified`, `location`, etc. No field whitelist.
- **`GET /api/factories`** is commented "Admin only" but gated with `isFactoryOrAdmin`
  (`factories.js:281`) → factories can list all factories.
- **Media route:** `faultReports.js:151` does `req.files.map` with no guard → 500 if no
  files; destination dir `uploads/fault-reports/` is never created (multer ENOENT) and
  `/uploads` is not served statically (see P0-STORE-001).
- **Nothing is runnable yet:** `node_modules` is absent, no `tests/`, no jest config —
  so `P0-AUTH-001` marked "Review" has no install/runtime evidence.

## 4. Risk summary

| Risk | Severity | Note |
|---|---|---|
| Server cannot boot (`authenticate` import) | Critical | Blocks all backend verification |
| API envelope violated in 33 handlers | High | Frontend will mis-parse errors |
| Repair state machine bypassable + no authz | High | Core workflow integrity |
| No location-based discovery | High | P0-DISP-001 acceptance gap |
| Missing test harness / deps | High | `TESTING_STANDARD` unsatisfiable |
| No first-admin bootstrap | Medium | Admin flow unreachable on empty DB |
| Mass assignment on profile updates | Medium | Security |
| Stale canonical docs | Medium | Agents act on wrong info |

## 5. Recommended next steps

1. Fix the `authenticate` import (server boot blocker) before any verification.
2. Standardize error output to the frozen envelope; decide the `error` vs `errors` rule.
3. Tighten the repair state machine (terminal-state guard + default-deny) and add
   role/ownership checks.
4. Record the unrecorded decisions (monolith, notification scope, descope order).
5. Add the three proposed rows (P0-UI-001, P0-TEST-001, P0-STORE-001).
6. Refresh the stale docs (brief, project state, codebase map).
7. Implement or explicitly descope location-based discovery for P0-DISP-001.
