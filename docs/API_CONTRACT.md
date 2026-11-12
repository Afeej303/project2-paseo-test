# API contract (observed, not yet frozen)

**Status:** Draft for coordination. Derived from actual routes on 2026-11-12. The orchestrator freezes the response envelope below so backend hardening and frontend build work against the same contract.

## Response envelope (frozen for implementation)

All API responses (except `/health`) use:

```json
{ "success": true, "message": "...", "data": { } }
```

Errors:

```json
{ "success": false, "message": "...", "errors": [ ] }
```

- `errors` is optional (validation lists). `data` is optional.
- **Forbidden:** a top-level `error` field (33 handlers currently emit `error: error.message`; P0-FIX-001 removes them).
- `/health` is exempt: `{ status: "ok", timestamp }`.

## Auth

- `Authorization: Bearer <token>` on all non-public routes.
- JWT payload: `{ userId, email, role }`; role ∈ `factory|technician|admin`.
- `req.user`, `req.userId`, `req.userRole` set by middleware.

## Endpoints (observed)

Base: `/api`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | /auth/register/factory | public | body: email,password,companyName,contactPerson,contactPhone |
| POST | /auth/register/technician | public | body: email,password,firstName,lastName,phone |
| POST | /auth/register/admin | admin | no bootstrap yet (P0-AUTH-004) |
| POST | /auth/login | public | → data.token |
| GET | /auth/me | any | |
| POST | /auth/logout | any | stateless no-op |
| GET/PUT | /factories/profile | factory/admin | PUT mass-assignment to fix |
| POST/PUT/DELETE | /factories/machines(/:machineId) | factory/admin | |
| GET | /factories | factory/admin | |
| GET/PUT | /technicians/profile | tech/admin | |
| PUT | /technicians/availability, /specializations, /service-area | tech/admin | |
| GET | /technicians | public | filters: specialization, city, available, emergency; **geo query missing** |
| GET | /technicians/:id | public | |
| POST | /fault-reports | factory/admin | body: machineName, faultDescription, urgency?, symptoms?, machineInfo? |
| POST | /fault-reports/:id/media | factory/admin | multipart; **dir missing, unguarded** |
| GET | /fault-reports( /:id) | any (role-scoped) | |
| PUT | /fault-reports/:id/status, /:id/assign | any | |
| POST | /repair-requests | factory | body: faultReportId, urgency?, isEmergency? |
| GET | /repair-requests( /:id) | any (role-scoped) | technician filter uses wrong id |
| POST | /repair-requests/:id/accept, /reject | tech | |
| PUT | /repair-requests/:id/status | any | **state-machine bypass + no authz** |
| POST | /repair-requests/:id/quotation, /quotation/approve, /review | mixed | |
| GET | /notifications | any | polling |
| PUT | /notifications/:id/read | any | |
| GET | /admin/users, /admin/stats, /admin/repair-requests | admin | |
| PUT | /admin/users/:id/status, /admin/technicians/:id/verify | admin | |

## Error status conventions (to standardize)

- 400 validation → `errors: [...]`
- 401 unauthenticated / invalid token
- 403 wrong role / not owner
- 404 not found
- 500 unexpected → `{success:false, message:"Server error"}` (no `error` leak)