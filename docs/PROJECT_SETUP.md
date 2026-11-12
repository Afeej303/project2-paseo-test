# Project setup and orchestration guide

Use this process each time the template is copied into a project workspace.

## 1. Preserve planning inputs

Copy the original mind map and converted Markdown into `docs/source/`. Keep filenames and provenance. If stable mind-map node IDs do not exist, the orchestrator assigns IDs in a separate index without altering the source. Label AI-generated interpretations `Proposed` until the team confirms them.

## 2. Capture confirmed project context

Ask the project owner for the product type, users, goals, non-goals, team/member roles, priority scheme, constraints, tech stack, supported platforms, data/privacy rules, and decision authority. Populate `PROJECT_BRIEF.md`, `TEAM_ROLES.md`, and `DECISIONS.md`. Use `TBD` where unanswered; never infer confirmation from silence.

## 3. Derive and review feature specs

Create one feature spec per coherent feature or workflow using `features/FEATURE_SPEC_TEMPLATE.md`. Preserve traceability from mind-map node IDs to requirement IDs and member ownership. Include user flow, explicit in/out scope, acceptance criteria, dependencies, risks, failure states, and verification expectations. The team approves specs before they become implementation tasks.

## 4. Establish implementation and testing facts

Inspect the actual workspace and record confirmed framework, commands, directories, runtime assumptions, and browser/device targets in `TESTING_STANDARD.md` and `CODEBASE_MAP.md`. Do not copy assumptions from another project's setup.

## 5. Create a ready task queue

Each task on `TASK_BOARD.md` must link to an approved requirement, have one accountable owner, state completion criteria, and identify dependencies. Mark work `Ready` only when its scope is clear and dependencies are resolved. Mark shared-file conflicts explicitly.

## 6. Run work through the orchestrator

Before launching an agent, the orchestrator checks the board, reads the relevant docs, confirms ownership, and supplies the task ID plus acceptance criteria. The orchestrator is the canonical documentation writer. Contributors can return proposed doc edits, but the orchestrator reconciles and records them after review.

For every handoff, require changed paths, implementation behavior, commands run and outcomes, criteria met/not met, and remaining issues. Update the board, state snapshot, and code map only from those reports plus inspection of actual code and test evidence.

## 7. Handle live suggestions

Treat new user messages as steering for the active project unless the user clearly starts a separate task. Log each material suggestion in `CHANGE_QUEUE.md` with source, affected requirement/task, classification, decision status, and next action. If it fits approved scope, steer the owner and update the task/spec. If it changes acceptance criteria, shared contracts, architecture, priority, or another member's ownership, pause affected work at a safe point and obtain the required team decision. Keep unrelated work moving.

## 8. Close and hand off

The orchestrator verifies the report against code and checks, updates `PROJECT_STATE.md`, closes or reopens board items, and lists the next ready tasks. A feature is not `Verified` merely because code exists; its applicable acceptance criteria need evidence.
