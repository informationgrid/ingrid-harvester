---
type: context
topic: anti-patterns
status: draft
updated: 2026-04-24
---

This document records patterns that are rejected, cause problems, or violate architectural invariants. Deviations require an explicit documented reason.

---

## AP-001: Leaving stub implementations in production code

**Pattern:** Committing methods that log a warning ("not yet implemented") and return without acting.

**Why it's wrong:** Silent no-ops are invisible failures — the caller gets no error, no count, no signal.

**Use instead:** Implement the method, or throw `NotImplementedError` explicitly.

---

<!-- Add new anti-patterns as they are discovered:
## AP-NNN: Short title
**Pattern:** What the bad approach looks like.
**Why it's wrong:** The concrete harm it causes.
**Use instead:** The correct alternative.
-->
