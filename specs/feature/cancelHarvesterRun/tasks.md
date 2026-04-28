---
feature: cancelHarvesterRun
status: draft
created: 2026-04-27
---

- [x] **TASK-001** Add `HarvestRunCancelledError` and `harvesterRunCancelled` to `Importer`
  - Refs: FR-005, FR-006, NFR-001, NFR-004
  - File: `server/app/importer/importer.ts`
  - Details: `export class HarvestRunCancelledError extends Error {}`. Add `protected harvesterRunCancelled: boolean = false` and `public cancel(): void { this.harvesterRunCancelled = true; }` to `Importer`.
  - Acceptance: `instanceof HarvestRunCancelledError` works in catch blocks; `cancel()` sets the field.

- [x] **TASK-001b** Add `cancelled` field to `ImportLogMessage`, `msgCancelled()` to `Summary`, update `jobs.utils.ts`
  - Refs: FR-007, FR-011
  - Files: `server/app/model/import.result.ts`, `server/app/model/summary.ts`, `server/app/statistic/jobs.utils.ts`
  - Details: Add `cancelled?: boolean` to `ImportLogMessage`. Add `msgCancelled(): ImportLogMessage` to `Summary` returning `{ stage: this.stage, complete: true, summary: this, cancelled: true }`. In `jobs.utils.ts` `deriveStatus()`, replace `logMessage.message === 'Import cancelled'` with `logMessage.cancelled === true`.
  - Acceptance: `msgCancelled()` returns `cancelled: true`; `deriveStatus` returns `'cancelled'` for a message with `cancelled: true`, not for one with `message: 'Import cancelled'`.

- [x] **TASK-002** Stage-boundary checks + cancel cleanup in `Importer.exec()`
  - Refs: FR-005, FR-006, FR-007, FR-008, FR-010, NFR-001, NFR-004
  - File: `server/app/importer/importer.ts`
  - Details: Declare `let transactionCommitted = false` and `const processedCatalogs: Catalog[] = []` before try. Set `transactionCommitted = true` after `commitTransaction()`. Push to `processedCatalogs` after each `catalog.process()`. Add `if (this.harvesterRunCancelled) throw new HarvestRunCancelledError()` after `harvest()` and before each catalog iteration. In catch: `if (err instanceof HarvestRunCancelledError)` → Phase 1 (`!transactionCommitted`): `startStage('rollbackSourceImport')` then `rollbackTransaction()`; Phase 2: `startStage('rollbackSourceImport')` then `rollbackSourceImport(sourceURL, transactionTimestamp)`, then for each CSW entry in `processedCatalogs`: `startStage('rollbackTargetCatalog')` then `rollbackTargetCatalog(this.settings.id, transactionTimestamp)`. Emit `msgComplete()` for each rollback stage. Call `observer.next(this.summary.msgCancelled())` as final message. Do **not** call `postHarvestingHandling()` on cancel path.
  - Acceptance: Phase 1 cancel → rollback stage started, `rollbackTransaction` called, no `rollbackSourceImport`. Phase 2 → both rollback stages started and completed; `msgCancelled()` emitted last. Non-cancel error → existing path unchanged.

- [x] **TASK-002b** Stage-boundary checks + cancel cleanup in `CswImporter.exec()`
  - Refs: FR-005, FR-006, FR-007, FR-008, FR-010, NFR-001, NFR-004
  - File: `server/app/importer/csw/csw.importer.ts`
  - Details: Same scaffolding as TASK-002. Add checks after `harvest()`, after `harvestServices()` (if `harvestingMode == 'separate'`), after `coupleDatasetsServices()`, before each catalog. Same rollback stage tracking and `msgCancelled()` pattern. `DiplanungCswImporter` inherits `exec()` and requires no changes.
  - Acceptance: Same as TASK-002 applied to `CswImporter`; `DiplanungCswImporter` verified via inheritance.

- [x] **TASK-003** Implement `ImportSocketService.cancelImport(harvesterId, jobId)`
  - Refs: FR-003, FR-004, FR-007, FR-009
  - File: `server/app/sockets/import.socket.service.ts`
  - Details: `private activeJobs: Map<number, { importer: Importer<any>; jobId: string }>`. Register importer on start; deregister on all exit paths. `cancelImport` calls `importer.cancel()`; returns `true` if found, `false` otherwise. Emit `cancelled` status via Socket.IO after cleanup.
  - Acceptance: Registered before harvest starts; deregistered on success/error/cancel; returns `false` for unknown harvesters.

- [x] **TASK-004** Add `POST /api/import/:id/cancel` endpoint
  - Refs: FR-003, FR-004, NFR-002
  - File: `server/app/controllers/ApiCtrl.ts` (follow `@Post('/import/:id')` pattern)
  - Details: Auth: admin | editor. `id` from path, `jobId` from body. Call `ImportSocketService.cancelImport`. Return `200 { cancelled: true }` or `404 { error: 'no running harvest for id' }`.
  - Acceptance: Running job → 200. No job → 404. Viewer/unauthenticated → 401/403.

- [x] **TASK-005** Add `rollbackSourceImport` to `DatabaseUtils` and `PostgresUtils`
  - Refs: FR-006
  - Files: `server/app/persistence/database.utils.ts`, `server/app/persistence/postgres.utils.ts`
  - Details: Abstract method in `DatabaseUtils`: `abstract rollbackSourceImport(source: string, transactionTimestamp: Date): Promise<number>`. Implement in `PostgresUtils`: `DELETE FROM record WHERE source = $1 AND last_modified = $2`. Add SQL to queries object following pattern of `deleteNonFetchedDatasets`.
  - Acceptance: Deletes only records matching both fields; returns correct count.

- [x] **TASK-006** Implement `CswCatalog.rollbackTargetCatalog`
  - Refs: FR-006, FR-008
  - File: `server/app/catalog/csw/csw.catalog.ts`
  - Details: Private `buildRollbackTargetCatalogTransaction(datasourceId, transactionTimestamp)` returning CSW-T Delete XML from design.md (`source:${datasourceId}`, `catalog:${this.settings.id}`). Public `async rollbackTargetCatalog(datasourceId, transactionTimestamp)`: `buildTargetUrl → postTransaction → parseTransactionResponse`; log `totalDeleted` at INFO; catch and log at ERROR without rethrowing. Model on `deleteRecordsForDatasource()`.
  - Acceptance: Correct XML; `totalDeleted` at INFO; errors logged at ERROR, not rethrown.

- [x] **TASK-007** Add cancel button to frontend active job/progress view
  - Refs: FR-001, FR-002, FR-009, FR-010, NFR-005
  - File: `client/src/app/datasources/datasource-entry/datasource-entry.component.ts` and `.html`
  - Details: Button handler: `cancelImport($event: Event) { $event.stopPropagation(); /* POST cancel */ }` — prevents accordion toggle (NFR-005). State machine: `idle → running → cancelling → cancelled`. In `cancelling` state: button label "Cancelling…", disabled; accordion stays unchanged. WebSocket messages with rollback stages (`rollbackSourceImport`, `rollbackTargetCatalog`) are shown in progress view. When `message.cancelled === true` arrives: transition to `cancelled` state. Add `cancelled?: boolean` to the client-side `ImportLogMessage` type if defined separately.
  - Acceptance: Cancel click does not toggle accordion; button shows "Cancelling…" between click and WebSocket event; status updates to `cancelled` on `cancelled: true` message; rollback stages visible in progress view.

- [x] **TASK-008** Unit tests for `CswCatalog.rollbackTargetCatalog`
  - Refs: FR-006
  - File: `server/test/catalog/csw/csw.catalog.spec.ts`
  - Details: Stub `RequestDelegate.doRequest` (see conventions.md). (1) Success: valid TransactionResponse → assert `totalDeleted` at INFO. (2) Error: reject/ExceptionReport → assert ERROR logged, no rethrow. Follow csw-delete-records-for-datasource test pattern.
  - Acceptance: Both pass under `npm test`; no regressions.

- [x] **TASK-009** Unit tests for Phase 1/2 cancellation paths in `Importer`
  - Refs: FR-005, FR-006, NFR-004
  - File: `server/test/importer/importer.spec.ts`
  - Details: (1) Phase 1 cancel: `rollbackTransaction` called; `rollbackSourceImport` not called; `msgCancelled()` emitted. (2) Phase 2 cancel: `rollbackSourceImport(sourceURL, transactionTimestamp)` called; `rollbackTargetCatalog` called for processed CSW catalogs only; rollback stages in `stageSummaries`. (3) Non-cancel catalog error: no cancel cleanup called; existing error path runs.
  - Acceptance: All three pass; cancel vs. error paths verifiably distinct.
