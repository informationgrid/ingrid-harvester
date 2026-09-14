---
feature: csw-delete-records-for-datasource
spec: ./spec.md
design: ./design.md
status: draft
---

## Tasks

- [ ] TASK-001: Add `buildDeleteBySourceTransaction()` private method
  - Refs: FR-001, FR-002
  - File: `server/app/catalog/csw/csw.catalog.ts`
  - Details: Private method `buildDeleteBySourceTransaction(sourceId: number): string` returning CSW-T Transaction XML with an `ogc:And` filter on `source:${sourceId}` and `catalog:${this.settings.id}`. Use `namespaces.CSW` / `namespaces.OGC`. Model on `buildFilteredDeleteTransaction()` (~line 300).
  - Acceptance: Returns a string with both literals inside `ogc:And`; namespace URIs are valid CSW 2.0.2 / OGC.

- [ ] TASK-002: Implement `deleteRecordsForDatasource()`
  - Refs: FR-001, FR-003, FR-004, FR-005, NFR-001, NFR-002
  - File: `server/app/catalog/csw/csw.catalog.ts` (~line 136)
  - Details: Replace stub with: `buildDeleteBySourceTransaction` → `buildTargetUrl` → `postTransaction` → `parseTransactionResponse` → log `totalDeleted` at INFO; catch errors and log at ERROR. Remove the `log.warn` stub line.
  - Acceptance: No "not yet implemented" warning; real CSW-T Delete request issued; result logged.

- [ ] TASK-003: Write unit tests
  - Refs: FR-003, FR-004, NFR-001
  - File: `server/test/catalog/csw/`
  - Details: Two sinon stubs on `postTransaction`: (1) success — `TransactionResponse` with `totalDeleted = 3`, assert resolves and INFO log contains count; (2) error — `ExceptionReport` or rejection, assert ERROR log called.
  - Acceptance: Both tests pass under `npm test`; no existing tests broken.
