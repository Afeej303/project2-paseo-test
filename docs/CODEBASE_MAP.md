# Codebase map

**Last inspected:** 2026-11-12  
**Revision:** Unversioned workspace (no git repo)  
**Updated by:** Orchestrator (session takeover); verified by direct command runs

Observed state as of 2026-11-12. Dependencies are installed (`node_modules` present). Server module loads, all source passes `node --check`, in-memory Mongo connects, Jest auth tests pass. Runtime/API gaps are listed under Known gaps with evidence.

| Path/module | What it currently does | Key interfaces/data | Status/evidence |
|---|---|---|---|
| `package.json` | Backend manifest; Express/Mongoose/JWT/bcrypt/multer/express-validator; devDeps jest, supertest, mongodb-memory-server, nodemon, eslint | `main: src/server.js` | Installed; `node_modules` present |
| `.env` | PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV | — | Placeholder local secrets; gitignored |
| `.gitignore` | node_modules, .env, uploads/, dist/, frontend/node_modules, coverage, *.log | — | Present |
| `src/server.js` | Express app; CORS, JSON, mounts 7 route groups (`/api/auth|factories|technicians|fault-reports|repair-requests|admin|notifications`), `/health`, 404 + error handlers; `module.exports = app`; starts only if `require.main === module` | Mount points `/api/*`, `/health` | Module loads OK; `/health` 200 verified |
| `src/models/User.js` | Role enum, pre-save bcrypt hash, `comparePassword`, `generateAuthToken`, strips password in toJSON | JWT payload {userId,email,role} | Verified via Jest (2/2) |
| `src/models/Factory.js` | Company/contact, address, 2dsphere `location`, machines[], emergencyContact | GeoJSON Point [lng,lat] | Written |
| `src/models/Technician.js` | Specializations enum, brands, certifications, 2dsphere `serviceArea` (radius km, cities), availability enum, ratings, verificationDocuments | Availability subdoc, ratings {average,count} | 2dsphere index present; no near query uses it |
| `src/models/FaultReport.js` | machineInfo, faultDescription, symptoms, urgency, hasStoppedProduction, media[], status | Ref Factory, User | Written |
| `src/models/Notification.js` | In-app notification model | Ref userId | Written |
| `src/models/RepairRequest.js` | Repair lifecycle, quotation, diagnosis, workPerformed, completion, factoryApproval, review | Status enum | Written |
| `src/middleware/auth.js` | Bearer JWT verify, loads user, attaches req.user/userId/userRole, rejects inactive; `module.exports = auth` (default) | `Authorization: Bearer <token>` | Consumed correctly by all routes (no `authenticate` import remains) |
| `src/middleware/roles.js` | `authorize(...roles)` + isFactory/isTechnician/isAdmin/isFactoryOrTechnician/isFactoryOrAdmin/isTechnicianOrAdmin | — | Written; role gates work (403s verified) |
| `src/routes/auth.js` | POST `/register/factory`, `/register/technician`, `/register/admin` (admin-only), `/login`, GET `/me`, POST `/logout` | Envelope {success,message?,data?,errors?} | Registration/login 201/200 verified; admin bootstrap unreachable (403) |
| `src/routes/factories.js` | GET/PUT `/profile`, machine CRUD (`/machines`, `/:machineId`), GET `/` | Role-gated isFactoryOrAdmin | `PUT /profile` mass-assignment confirmed (userId overwritten) |
| `src/routes/technicians.js` | GET/PUT `/profile`, PUT `/availability`, `/specializations`, `/service-area`, public GET `/` (filters: specialization, city, available, emergency), GET `/:id` | Discovery endpoint | Returns [] for nearby filter → geo query missing |
| `src/routes/faultReports.js` | POST `/` (create; validates machineName, faultDescription, urgency, symptoms), POST `/:id/media` (multer 10MB), GET `/`, GET `/:id`, PUT `/:id/status`, PUT `/:id/assign` | Upload dir `uploads/fault-reports/` | Validation present; media dir not created; `req.files.map` unguarded |
| `src/routes/repairRequests.js` | POST `/`, GET `/` (role filter), GET `/:id`, POST `/:id/accept`, `/:id/reject`, PUT `/:id/status` (transition map), POST `/:id/quotation`, PUT `/:id/quotation/approve`, POST `/:id/review` | State transition map | Bypass confirmed: `pending`→`completed` allowed; no role/ownership check |
| `src/routes/admin.js` | Admin-gated (auth+isAdmin): users, verification, stats | Envelope | Written; gated correctly |
| `src/routes/notifications.js` | Auth-gated GET `/` and PUT `/:id/read` | Envelope | Written |
| `tests/auth.test.js` | Jest + mongodb-memory-server unit tests (User hash, JWT) | — | PASS 2/2 |
| `scripts/dev-server.js` | Boots app against MongoMemoryServer on :3000 | — | Present; not yet run standalone |
| `frontend/` | Vite + React 19 scaffold: `App.jsx` (2 routes), `pages/Login.jsx`, `context/AuthContext.jsx`, `services/api.js` (axios, baseURL :3000/api, bearer interceptor) | axios client | Scaffold only; no dashboards, no shared design system, no fault form |

## Runtime and data flow

Intended/verified in part: Client → Express REST API (`/api/*`) → JWT auth/role middleware → Mongoose models → MongoDB. Media uploads intended for local disk `uploads/fault-reports/` (not yet created/served). Notification delivery = in-app Mongo + client polling (D-20261111-NOTIF).

## Known gaps

- **Systemic API-envelope violation:** 33 handlers return `error: error.message` (singular), outside the frozen envelope `{success,message?,data?,errors?}`. `src/server.js:51` also emits `error`.
- **Repair state machine bypass:** `validTransitions` has no entry for `pending`, `completed`, or `cancelled` → those states allow any transition; terminal states are escapable.
- **No role/ownership check** on `PUT /api/repair-requests/:id/status` (only `auth`) → any authenticated user can change any request's status.
- **Mass assignment:** `PUT /api/factories/profile` and `PUT /api/technicians/profile` pass `req.body` into the update (userId/isVerified/location settable).
- **No first-admin bootstrap:** `/register/admin` requires an existing admin; empty DB can never create one.
- **No geo/near query:** 2dsphere indexes exist but `GET /api/technicians` filters only by specialization/city/availability/emergency; location+specialization discovery (P0-DISP-001) not implemented.
- **Uploads:** `uploads/fault-reports/` not created (multer ENOENT), `/uploads` not served statically, `req.files.map` unguarded.
- **Registration not atomic:** User saved before Factory/Technician profile; profile-save failure leaves an orphan User.
- **Null-deref risks:** repair review/technician lookups assume the profile exists.
- **Field mismatch:** review increments `completedJobs` but discovery sorts by `totalJobs`.
- **Owner-id mismatch:** technician list filters `technicianId = req.userId` (User id) though field refs Technician → technicians may see zero requests; same pattern in faultReports assign.
- **No jest config block** (defaults work; `tests/` auto-discovered).
- **Frontend absent** beyond login/auth; no design system, dashboards, or fault-report form.
- **No git repo** (recommend `git init`).