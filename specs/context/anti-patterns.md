---
type: context
topic: anti-patterns
status: draft
updated: 2026-10-12
---

## AP-001: Leaving stub implementations in production code

**Pattern:** Committing methods that log a warning ("not yet implemented") and return without acting.

**Why it's wrong:** Silent no-ops are invisible failures — the caller gets no error, no count, no signal.

**Use instead:** Implement the method, or throw `NotImplementedError` explicitly.

---

## AP-002: Spying on log4js loggers with sinon

**Pattern:** `sinon.spy(log4js.getLogger('CategoryName'), 'info')` — intercepting log calls by spying on the return value of `getLogger`.

**Why it's wrong:** `log4js.getLogger()` returns a new `Logger` instance on every call. The spy wraps a different object than the `const log` captured at module load time, so no log calls are intercepted and `spy.called` is always `false`.

**Use instead:** Configure a log4js inline appender that collects events into an array (see Testing section of `conventions.md`).

---

## AP-003: Using code blocks or indented text to represent diagrams

**Pattern:** Indented tree listings inside a plain fenced code block (no language tag) to show class hierarchies, execution flows, or relationships.

**Why it's wrong:** "Do not use ASCII art" covers this; the code-block wrapper does not make it acceptable.

**Use instead:** Mermaid — `classDiagram` for hierarchies, `flowchart` for sequences, `erDiagram` for data models.

---

## AP-004: Unguarded `model.x` in Formly string expressions inside keyed field groups

**Pattern:** `expressions: { hide: "!model.hasPassword" }` on a field whose parent is a keyed group (e.g. `key: "settings"`).

**Why it's wrong:** With `resetOnHide`, Formly deletes the group's value while the group is hidden, so `model` is `undefined` when the expression first runs. The resulting `TypeError` is rethrown by Formly and leaves its expression check locked — no further expressions in the form are evaluated (fields don't show/hide anymore). This only shows up for new (empty) models, not when editing existing data.

**Use instead:** Optional chaining: `"!model?.hasPassword"`.

<!-- Add new anti-patterns as they are discovered:
## AP-NNN: Short title
**Pattern:** What the bad approach looks like.
**Why it's wrong:** The concrete harm it causes.
**Use instead:** The correct alternative.
-->
