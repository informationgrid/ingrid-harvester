# CLAUDE.md

This project uses spec-driven development. Read `specs/context/workflow.md` for the full process before doing any work.

## Critical rules (always apply)

- **Read context first.** Before any feature work, read all files in `specs/context/`.
- **Update specs alongside code.** After every code change, tick the task in `tasks.md`, and update `spec.md` / `design.md` if the implementation deviated from what is written.
- **Keep context current.** If a code change introduces a new convention, anti-pattern, domain rule, or architectural boundary, update the relevant file in `specs/context/` in the same session.
- **No task, no code.** Do not implement anything not covered by a task in `tasks.md`. Add the task first if scope expands.
- **Minimal changes.** Do not refactor, add abstractions, or clean up code beyond what the task explicitly requires.
