# Decision log

Record confirmed choices that affect more than one task or feature. Keep proposals in the change queue until accepted. Do not treat a generated recommendation as a decision.

## Decision record template

### D-<YYYYMMDD>-<short-name>: <title>

- **Status:** Proposed | Accepted | Superseded
- **Decision owner/team:**
- **Date:** YYYY-MM-DD
- **Context:**
- **Decision:**
- **Alternatives considered:**
- **Consequences:**
- **Affected requirement/task IDs:**
- **Replaces/related records:**

---

### D-20261111-STACK: Technology Stack Selection

- **Status:** Accepted
- **Decision owner:** Orchestrator
- **Date:** 2026-11-11
- **Context:** Buildathon MVP requires rapid development with production-ready foundations
- **Decision:**
  - Backend: Node.js with Express.js
  - Database: MongoDB with Mongoose ODM
  - Authentication: JWT (jsonwebtoken) with bcrypt for password hashing
  - API: RESTful with JSON responses
  - Frontend: React.js with Vite (to be confirmed by frontend agent)
- **Alternatives considered:**
  - PostgreSQL with Sequelize/TypeORM (more complex setup)
  - Next.js (full-stack, less separation of concerns)
- **Consequences:**
  - Rapid prototyping capability
  - JSON-native data flow simplifies frontend integration
  - MongoDB schema flexibility for evolving requirements
  - JWT enables stateless authentication across services
- **Affected requirement/task IDs:** P0-AUTH-001, P0-AUTH-002, all backend tasks
- **Replaces/related records:** None (first decision)

### D-20261111-API: API Design Standards

- **Status:** Accepted
- **Decision owner:** Orchestrator
- **Date:** 2026-11-11
- **Context:** Need consistent API patterns for multiple agents working on different modules
- **Decision:**
  - RESTful conventions: GET (read), POST (create), PUT (update), DELETE (remove)
  - Response format: { success: boolean, message?: string, data?: any, errors?: any[] }
  - Authentication: Bearer token in Authorization header
  - Role-based access control via middleware
  - Input validation: express-validator for all endpoints
  - Error handling: Centralized middleware, standardized error responses
- **Alternatives considered:**
  - GraphQL (overkill for MVP)
  - RPC-style APIs (less intuitive for REST clients)
- **Consequences:**
  - Standardized error handling across all routes
  - Consistent response structure simplifies frontend integration
  - Clear authentication patterns for all agents
- **Affected requirement/task IDs:** All API endpoints
- **Replaces/related records:** D-20261111-STACK

### D-20261111-MONGO-LOCAL: Local MongoDB strategy

- **Status:** Accepted
- **Decision owner:** Orchestrator
- **Date:** 2026-11-11
- **Context:** Environment inspection showed Node v26.13.0/npm 11.20.0 available, but `mongod` is not on PATH, port 27017 is closed, Docker/Podman unavailable, and no passwordless sudo. The stack decision (D-20261111-STACK) requires MongoDB.
- **Decision:** Keep MongoDB as the database. For local development and tests, use `mongodb-memory-server` (downloads a user-space mongod binary; no admin rights). Tests: Jest with an in-memory Mongo instance. Production deployment would use a real MongoDB instance (deployment environment TBD).
- **Alternatives considered:**
  - Installing MongoDB via apt (blocked: no sudo)
  - Docker (blocked: not installed)
  - Switching to SQLite (would break D-20261111-STACK and Mongoose models)
- **Consequences:**
  - Smoke test and Jest tests can run on this machine without system changes
  - `npm install` downloads mongod binary (~large download, one-time)
  - In-memory server differs slightly from production Mongo (acceptable for MVP verification)
- **Affected requirement/task IDs:** P0-AUTH-001, P0-VERIFY-001, all testing
- **Replaces/related records:** D-20261111-STACK (environment amendment)

### D-20261111-MONOLITH: MVP architecture

- **Status:** Accepted
- **Decision owner:** Orchestrator
- **Date:** 2026-11-11
- **Context:** Planner review flagged that monolith vs microservices was only implied, never recorded; PROJECT_BRIEF open question unmarked.
- **Decision:** **Single monolithic backend** (one Express app, one MongoDB) for the MVP. No microservices, no message queues. Frontend is a separate Vite SPA.
- **Alternatives considered:** Microservices (rejected: operational overhead exceeds Buildathon timeline; planner concurred)
- **Consequences:** Simple deployment and debugging; scaling path documented later if needed
- **Affected requirement/task IDs:** All backend tasks
- **Replaces/related records:** Complements D-20261111-STACK

### D-20261111-DESCOPE: P0 descope order if timeline tightens

- **Status:** Accepted
- **Decision owner:** Orchestrator
- **Date:** 2026-11-11
- **Context:** Planner flagged P0 breadth vs timeline as a top risk; no published cut order.
- **Decision:** If the timeline tightens, cut in this order (earliest cut first):
  1. Fault media upload (P0-FAULT-001 media part)
  2. Admin stats endpoint (keep user list + technician verification)
  3. Ratings/reviews (P1-REVIEW-001)
  4. Quotations/approval (P1-QUOTE-001)
  - **Core floor (never cut):** registration/login (all roles), fault report submission, technician discovery, repair request accept/reject, job status updates, admin visibility of users/requests.
- **Alternatives considered:** Arbitrary cutting (rejected: risks breaking the matching flow, the product's differentiator)
- **Consequences:** P0 shrinks gracefully; core dispatch loop stays intact
- **Affected requirement/task IDs:** P0-FAULT-001, P0-ADMIN-001, P1-REVIEW-001, P1-QUOTE-001
- **Replaces/related records:** —

### D-20261111-NOTIF: Basic notification scope (in-app + polling)

- **Status:** Accepted
- **Decision owner:** Orchestrator
- **Date:** 2026-11-11
- **Context:** Planner review flagged "basic notifications" (P0) as ambiguous — in-app vs email vs push vs WebSocket.
- **Decision:** P0 = **in-app notifications stored in MongoDB** (Notification model) + **client polling** of `GET /api/notifications`. No email, no push, no WebSocket in P0. Real-time delivery (WebSocket/SSE) is deferred to post-P0 and must enter via the change queue.
- **Alternatives considered:**
  - WebSocket real-time (higher risk, harder to verify in Buildathon timeline)
  - Email/SMS (third-party dependencies, credentials not available offline)
- **Consequences:**
  - Notification UX has polling latency (acceptable for MVP)
  - Notification model/routes already assigned in P0-NTFY-001
- **Affected requirement/task IDs:** P0-NTFY-001
- **Replaces/related records:** Clarifies scope of feature list §9 "Basic notifications"

### D-20261111-COORD: Agent Coordination Protocol

- **Status:** Accepted
- **Decision owner:** Orchestrator
- **Date:** 2026-11-11
- **Context:** Multiple agents need to coordinate on shared interfaces
- **Decision:**
  - Backend agent owns: src/models, src/middleware, src/routes, src/services
  - Frontend agent owns: src/pages, src/components, src/hooks, src/context
  - Shared: API contract conventions (documented), no direct file modification across boundaries
  - Coordination via: Orchestrator-mediated changes, shared docs updates
- **Alternatives considered:**
  - Direct agent communication (no coordination visibility)
  - Single agent ownership (bottleneck)
- **Consequences:**
  - Clear ownership boundaries prevent conflicts
  - Orchestrator mediates cross-boundary changes
  - Shared interface changes require decision records
- **Affected requirement/task IDs:** All tasks with dependencies
- **Replaces/related records:** AGENTS.md coordination rules

---

## Planner/Reviewer Output

### D-20261111-REVIEW-1: Planner Review Summary

- **Status:** Acknowledged by Orchestrator
- **Date:** 2026-11-11
- **Reviewer:** Planner/Reviewer Agent
- **Key Findings:**
  - Technology stack decisions resolved (Node.js/Express/MongoDB)
  - API conventions established (REST + standardized responses)
  - Auth system with JWT and RBAC implemented
  - Missing: File upload handling, real-time notifications, testing framework
- **Recommended Actions:**
  - Add testing framework setup to P0-AUTH-001
  - Create file upload handling for fault reports
  - Implement notification service after P0-DISP-001
- **Orchestrator Response:**
  - Added testing framework to package.json (Jest)
  - Will implement file upload when creating fault report routes
  - Notification system deferred to P0-NTFY-001
- **Related:** Planner/Reviewer agent activity log
