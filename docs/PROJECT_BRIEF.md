# Project brief

**Status:** Active development  
**Last updated:** 2026-11-12  
**Project type:** Buildathon - Industrial Repair Technician Platform

## Product and users

- **Product type:** Digital platform connecting factories with verified industrial repair technicians
- **Product name:** Industrial Repair Technician Platform
- **Intended users:**
  - Factory owners / Maintenance managers
  - Industrial repair technicians
  - Platform administrators
- **User problem / goal:** Factory owners wait days for qualified technicians during machine breakdowns. The platform enables quick matching, dispatch, and tracking of repair services.
- **Success criteria:**
  - Time from fault submission to technician acceptance
  - Time from request to technician arrival
  - Percentage of requests successfully matched
  - Technician response and acceptance rates

## Scope

- **In scope (P0 - MVP):**
  - Factory registration and login
  - Technician registration and profile management
  - Technician specialization and service area configuration
  - Fault reporting with image upload
  - Factory location capture
  - Location- and specialization-based technician discovery
  - Technician availability status management
  - Repair request and accept/reject workflow
  - Job status updates
  - Basic notifications
  - Admin view of users and repair requests

- **In scope (P1 - Differentiators):**
  - Multi-technician dispatch
  - Technician ranking and matching
  - Emergency-priority handling
  - Estimated travel time calculation
  - Quotations and approval system
  - Ratings and reviews
  - Repair history and digital service reports
  - AI-assisted fault categorization

- **Out of scope (P2):**
  - Integrated payments
  - Live technician tracking
  - Remote video troubleshooting
  - Spare parts marketplace
  - Predictive maintenance
  - Machine/IoT monitoring integrations
  - Advanced analytics

## Technical decisions (confirmed)

- **Framework and build tool:** Node.js with Express.js (D-20261111-STACK)
- **Runtime/platforms:** Web application (desktop and mobile)
- **Data storage and APIs:** MongoDB with Mongoose ODM (D-20261111-STACK)
- **Authentication/authorization:** Role-based (Factory, Technician, Admin) with JWT (D-20261111-STACK)
- **Deployment assumptions:** Cloud deployment with API backend (monolithic; D-20261111-MONOLITH)
- **Testing tools and commands:** Jest + supertest + mongodb-memory-server (TESTING_STANDARD.md)

## Constraints and standards

- **Privacy/security:** User authentication, role-based access, data protection
- **Accessibility:** WCAG 2.1 compliance required
- **Offline/performance:** Responsive design, optimized asset loading
- **Licensing/dependencies:** Open source preferred where possible
- **Design system or UI ownership:** Consistent design system across interfaces

## Team process

- **Project owner / decision authority:** Orchestrator (AI Agent Manager)
- **Team roles:** see `TEAM_ROLES.md`.
- **Source plan:** see `docs/source/README.md` and the original feature list artifact
- **Custom instructions:** All agents must coordinate through the orchestrator; no direct changes to shared interfaces without coordination

## Open questions

- [x] Framework and technology stack selection → **Decided: Node/Express/MongoDB/JWT (D-20261111-STACK)**
- [x] Backend architecture (monolith vs. microservices) → **Decided: Single monolith (D-20261111-MONOLITH)**
- [x] Database selection → **Decided: MongoDB with Mongoose (D-20261111-STACK)**
- [x] Real-time communication mechanism (WebSockets, polling) → **Decided: P0 = in-app Mongo notifications + client polling; WebSocket deferred (D-20261111-NOTIF)**