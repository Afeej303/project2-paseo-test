# Codebase map

**Last inspected:** 2026-11-12  
**Revision:** git `master` @ `9b5fab2` (4 commits)  
**Updated by:** Acting orchestrator (agent `a6a680dd`); claims checked against code and command runs

Observed state as of 2026-11-12. Dependencies are installed (root and `frontend/`). Server module loads, all source passes `node --check`, in-memory Mongo connects, Jest passes 40/40, backend ESLint reports 0 errors, and the frontend production build succeeds. A 27/27 live API smoke run covered the full register→verify→fault+upload→discover→assign→accept→completed→notifications→admin flow. Remaining gaps are listed under Known gaps with evidence.

| Path/module | What it currently does | Key interfaces/data | Status/evidence |
|---|---|---|---|
| `package.json` | Backend manifest; Express/Mongoose/JWT/bcrypt/multer/express-validator; devDeps jest, supertest, mongodb-memory-server, nodemon, eslint | `main: src/server.js` | Installed; `npm run lint` 0 errors |
| `.eslintrc.json` | ESLint config | — | Present; lint runs |
| `.env` | PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV (bootstrap vars optional) | — | Local secrets; gitignored |
| `.gitignore` | node_modules, .env, uploads/, dist/, frontend/node_modules, coverage, *.log | — | Present |
| `src/server.js` | Express app; creates `uploads/fault-reports/`, CORS/JSON, mounts 7 route groups, `/health`, `/uploads` static, 404 + error handlers (envelope), optional env admin bootstrap, starts only if `require.main === module` | `/api/*`, `/health`, `/uploads/*` | `node --check` PASS; `/health` 200 verified |
| `src/models/User.js` | Role enum, pre-save bcrypt hash, `comparePassword`, `generateAuthToken`, strips password in toJSON | JWT payload {userId,email,role} | Jest PASS |
| `src/models/Factory.js` | Company/contact, address, 2dsphere `location`, machines[], emergencyContact | GeoJSON Point [lng,lat] | Used by geo discovery |
| `src/models/Technician.js` | Specializations enum, brands, certifications, 2dsphere `serviceArea`, availability enum, ratings, verificationDocuments | Availability subdoc, ratings | Used by `$near` query |
| `src/models/FaultReport.js` | machineInfo, faultDescription, symptoms, urgency, hasStoppedProduction, media[], status, assignedTechnicianId | Refs Factory, User, Technician | Written |
| `src/models/Notification.js` | In-app notification model | Ref userId | Written |
| `src/models/RepairRequest.js` | Repair lifecycle, quotation, diagnosis, workPerformed, completion, factoryApproval, review | Status enum | Written |
| `src/middleware/auth.js` | Bearer JWT verify, loads user, attaches req.user/userId/userRole, rejects inactive | `Authorization: Bearer <token>` | Consumed by routes |
| `src/middleware/roles.js` | `authorize(...roles)` + isFactory/isTechnician/isAdmin/... helpers | — | Role gates verified (403s) |
| `src/routes/auth.js` | POST `/register/factory|technician|admin|admin/bootstrap` (bootstrap env-gated under P0-FIX-006), `/login`, GET `/me`, POST `/logout` | Envelope `{success,message?,data?,errors?}` | Registration/login/bootstrap tests PASS |
| `src/routes/factories.js` | GET/PUT `/profile`, machine CRUD, GET `/` | isFactoryOrAdmin; profile update filters sensitive fields | Mass-assignment test PASS |
| `src/routes/technicians.js` | GET/PUT `/profile` (admin + self whitelist firstName/lastName/phone), PUT `/availability`, `/specializations`, `/service-area`, public GET `/` (specialization/city/available/emergency + `$near` geo), GET `/:id` | Geo query `coordinates=lng,lat&radius=km` | Geo + admin-whitelist tests PASS |
| `src/routes/faultReports.js` | POST `/` (visit-time validation), POST `/:id/media` (ownership middleware BEFORE multer, empty-upload guard), GET `/`, GET `/:id`, PUT `/:id/status` (owning factory/admin), PUT `/:id/assign` (owning factory/admin; propagates to repair request under P0-FIX-005) | Upload dir `uploads/fault-reports/` | Media guard + pre-multer authz + assign existence + visit-time tests PASS |
| `src/routes/repairRequests.js` | POST `/`, GET `/` (role filter via Technician profile), GET `/:id`, accept/reject (403 for a different assigned technician), PUT `/:id/status` (transition map + terminal states + ownership), quotation, review | State transition map | Null guards + ownership + assignment tests PASS |
| `src/routes/admin.js` | Admin-gated (auth+isAdmin): users, verification, stats | Envelope | Gated correctly |
| `src/routes/notifications.js` | Auth-gated GET `/`, PUT `/:id/read` (isMongoId); creation via `src/services/notifications.js` `notify()` from assign/accept/reject/status | Envelope | Invalid id → 400 verified; live smoke created/read notifications |
| `src/services/notifications.js` | Best-effort `notify(userId,{type,message,relatedId})`; never throws into the primary request | — | Live smoke: technician 1, factory 7 notifications |
| `tests/auth.test.js` | Jest + mongodb-memory-server unit tests (User hash, JWT) | — | PASS 2/2 |
| `tests/integration.test.js` | supertest integration tests: mass assignment, admin bootstrap (env gate), geo, envelope, state machine, technician ownership, null guards, fault-report authz, rollback, assign validation, pre-multer media authz, visit-time validation, assignment propagation, notification dispatch | — | PASS (suite total 40) |
| `scripts/dev-server.js` | Boots app against MongoMemoryServer on :3000 | — | Present; not run standalone |
| `frontend/src/App.jsx` | Role-aware router: public `/login`, `/register/factory`, `/register/technician`; protected `/notifications` and `/dashboard/{factory,technician,admin}`; role guards; wildcard NotFound | `ProtectedRoute`, `PublicOnlyRoute` | Build PASS (120 modules); acceptance pending |
| `frontend/src/pages/` | `Login`, `FactoryRegister`, `TechnicianRegister`, `NotFound`, `NotificationsPage`, `factory/{FactoryDashboard,FactoryProfile,FactoryMachines,FaultReportForm,TechnicianDiscovery}`, `technician/{TechnicianDashboard,TechnicianProfile}`, `admin/AdminDashboard` | axios via `services/api.js` | Delivered (P0-FRONT-001) |
| `frontend/src/components/` | `AppLayout`, `ProtectedRoute`, `PublicOnlyRoute`, `AsyncState`, `PageHeader`, `StatusBadge`, `NotificationBell` + `ui/` (Button, Input, Select, Card, Table, Modal, Alert, Spinner, NavBar) | — | Delivered; `QuotationForm` is unused (P1) |
| `frontend/src/context/AuthContext.jsx` | Auth provider, token persistence, `/auth/me` restore; context object in `authContext.js`; `hooks/useAuth` | — | Delivered |
| `frontend/src/services/api.js` | axios client (baseURL `VITE_API_URL` or `:3000/api`, bearer interceptor, error helper); `navigation.js` role homes | — | Delivered |

## Runtime and data flow

Client (Vite SPA) → Express REST API (`/api/*`) → JWT auth/role middleware → Mongoose models → MongoDB. Media uploads are stored on local disk under `uploads/fault-reports/` and served at `/uploads`. Notification delivery = in-app Mongo + client polling (D-20261111-NOTIF).

## Known gaps

- **Best-effort notifications:** a failed `Notification.create` is logged and dropped; no dedupe or rate limiting.
- **Field mismatch:** review increments `completedJobs` but discovery sorts by `totalJobs`.
- **Packaging gaps:** no root `README.md`, no `.env.example`; `VITE_API_URL` and `ALLOW_ADMIN_BOOTSTRAP` are undocumented; `app.use(cors())` allows all origins.
- **P1 not started:** multi-technician dispatch, ranking, quotations, reviews, service reports.
- **Deployment target TBD**; production MongoDB not provisioned.
