# Live change queue

Use this queue for meaningful suggestions, corrections, and new decisions raised while work is active. The orchestrator owns triage and updates approved docs/tasks after the required approval.

Classifications: `Clarification`, `In-scope change`, `New scope`, `Priority change`, `Shared contract/architecture`, `Bug`, `Deferred idea`.

Statuses: `Proposed`, `Needs decision`, `Accepted`, `Rejected`, `Deferred`, `Applied`.

| Change ID     | Date/source | Request | Classification | Affected requirement/task | Decision/status | Active-work action | Resolution |
| ------------- | ----------- | ------- | -------------- | ------------------------- | --------------- | ------------------ | ---------- |
| None recorded | —           | —       | —              | —                         | —               | —                  | —          |

## Handoff updates (orchestrator 2026-11-12)

- **P0-FIX-001** (backend): activated — owns critical/high fixes. Critical gap confirmed: repair state-machine bypass + no authz on `PUT /api/repair-requests/:id/status`; high: 33x `error:` envelope violations; medium: mass assignment, missing geo query, uploads dir/static/guard, null-derefs, owner-id mismatch, review/ranking counter mismatch, first-admin bootstrap.
- **P0-AUTH-004** (backend): created — first-admin bootstrap path.
- **P0-STORE-001** (backend): created — uploads dir + static + guard.
- **P0-UI-001 / P0-TEST-001**: re-verified/updated status from fresh run.
- **API_CONTRACT.md**: created as draft — envelope `{success,message?,data?,errors?}` + `/health` exemption. Orchestrator freezes it; backend hardening implements it; frontend builds against it.

## Triage rules

- A direct instruction from the project owner is recorded as a decision when authority is clear; an optional suggestion remains proposed.
- Compatible in-scope changes can be steered to the current owner and reflected in the task/spec.
- Changes to accepted criteria, shared interfaces, architecture, priority, or ownership require the relevant decision before affected implementation continues.
- Pause only affected work at a safe point; leave unrelated tasks moving.
- Once applied or deferred, update the linked spec, decision record, and task/state as needed, then record the resolution here.
