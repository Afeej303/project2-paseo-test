# Development documentation index

This folder is the shared development source of truth for the current project. It is designed to be copied into a workspace and maintained locally by the team; it does not require GitHub integration.

## Inputs and decisions

- `source/README.md` — how to preserve mind maps and converted planning files.
- `MINDMAP_TO_MARKDOWN_STANDARD.md` — conversion rules, output structure, and copy-paste AI prompt.
- `PROJECT_BRIEF.md` — confirmed product, stack, constraints, and scope.
- `TEAM_ROLES.md` — responsibilities and boundaries.
- `DECISIONS.md` — confirmed cross-cutting choices.

## Delivery and current state

- `features/FEATURE_INDEX.md` and individual feature specs — approved requirements and acceptance criteria.
- `TASK_BOARD.md` — task ownership, status, dependencies, and next work.
- `PROJECT_STATE.md` — concise progress, implemented/verified distinction, blockers, and remaining scope.
- `CODEBASE_MAP.md` — observed code structure and behavior, updated as architecture changes.
- `CHANGE_QUEUE.md` — incoming ideas and changes during active work.
- `TESTING_STANDARD.md` — test commands, coverage expectations, and verification evidence.
- `AGENT_PROFILES.md` — role descriptions to configure in Paseo or another agent manager.
- `PROJECT_SETUP.md` — repeatable initialization and operating guide.

## Conflict resolution

Preserve original source inputs. Apply confirmed decisions and approved feature specs. If a conflict remains, the orchestrator records it and asks the project owner/team to resolve it before changing the disputed behavior. Do not use an AI-generated summary to silently override the source plan or an approved decision.
