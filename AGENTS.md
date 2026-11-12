# Shared project contributor instructions

These rules apply to every human and AI contributor in this workspace.

## Before acting

Read this file, `docs/README.md`, `docs/PROJECT_BRIEF.md`, the assigned approved feature spec, `docs/TASK_BOARD.md`, and the relevant sections of `docs/PROJECT_STATE.md`, `docs/CODEBASE_MAP.md`, `docs/DECISIONS.md`, and `docs/TESTING_STANDARD.md`.

## Source-of-truth rules

- The original planning artifacts under `docs/source/` preserve the team's input; do not overwrite them.
- `docs/PROJECT_BRIEF.md` and accepted entries in `docs/DECISIONS.md` record confirmed project choices.
- An approved feature spec is authoritative for that feature's behavior and acceptance criteria.
- `docs/TASK_BOARD.md` identifies current ownership and work state.
- `docs/PROJECT_STATE.md` and `docs/CODEBASE_MAP.md` describe observed implementation state; keep them evidence-based.
- `Proposed` and `TBD` content is not an approved requirement. Do not silently promote it.
- If sources conflict, record the conflict and ask the orchestrator to resolve it before implementing the disputed behavior. Continue independent work where possible.

## Work cycle

1. Confirm the task is approved, assigned, and not already owned by another contributor.
2. Plan the smallest change that satisfies the task's acceptance criteria. Identify shared files and dependencies.
3. Implement only the assigned scope. Coordinate before changing shared interfaces, architecture, or another member's owned files.
4. Run the relevant checks documented in `docs/TESTING_STANDARD.md`. Report exact commands and results; never claim an unrun check passed.
5. Report changed files, behavior, test evidence, and unresolved issues to the orchestrator. Draft documentation updates when useful; the orchestrator integrates them into canonical docs.

## Live change requests

Route new suggestions to the orchestrator. Do not change approved scope based on an ambiguous suggestion. The orchestrator records the request in `docs/CHANGE_QUEUE.md`, classifies its impact, updates affected specs/tasks after approval, and steers or pauses active work at a safe point.

## General quality

- Do not invent product behavior, team decisions, framework choices, commands, or test outcomes.
- Keep edits focused; avoid unrelated refactoring and dependency changes.
- Respect project privacy, accessibility, security, offline, and platform constraints documented in the brief and approved specs.
