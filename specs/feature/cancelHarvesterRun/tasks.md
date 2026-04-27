---
feature: cancelHarvesterRun
status: draft
created: 2026-04-27
---

# Tasks: Cancel Harvester Run

- [ ] **TASK-001** Add `CancellationToken` interface and `CancelledError` class
  - Refs: FR-005, FR-006, NFR-001, NFR-004
  - File: `server/app/importer/importer.ts` (or new `server/app/model/cancellation.ts`)
  - Details: `export interface CancellationToken { cancelled: boolean }`. `export class CancelledError extends Error {}`. These are used to distinguish a user-initiated cancel from a regular harvest error in run-loop catch blocks.
  - Acceptance: Both types exported and importable; `instanceof CancelledError` check works in catch blocks.

- [ ] **TASK-002** Thread `CancellationToken` through `Importer.run()` and check at bucket boundaries
  - Refs: FR-005, NFR-001
  - File: `server/app/importer/importer.ts`
  - Details: Add optional `token?: CancellationToken` param to `run()`. At the top of each `for await (const bucket of ...)` iteration, check `if (token?.cancelled) throw new CancelledError()`. Catch `CancelledError` in a separate catch block (before the general error catch).
  - Acceptance: Passing a pre-cancelled token stops the harvest at the first bucket boundary without committing; regular errors still reach the existing error catch block unaffected.

- [ ] **TASK-003** Implement `ImportSocketService.cancelImport(harvesterId, jobId)`
  - Refs: FR-003, FR-004, FR-007, FR-009
  - File: `server/app/sockets/import.socket.service.ts`
  - Details: Add `private activeJobs: Map<number, { token: CancellationToken; jobId: string }> = new Map()`. Register token on harvest start; deregister on finish (success, error, or cancel). `cancelImport(harvesterId, jobId)` sets `token.cancelled = true` and returns `true` if the job is found, `false` otherwise. After the cancelled run finishes cleanup, emit `cancelled` status via Socket.IO (FR-009).
  - Acceptance: Token is registered before the harvest loop starts and deregistered on all exit paths; `cancelImport` returns false for unknown or finished harvesters.

- [ ] **TASK-004** Add `POST /api/import/:id/cancel` endpoint
  - Refs: FR-003, FR-004, NFR-002
  - File: `server/app/controllers/ApiCtrl.ts` (follow pattern of existing `POST /import/:id`)
  - Details: Auth guard: admin | editor. Read `id` from path, `jobId` from request body. Call `ImportSocketService.cancelImport(id, jobId)`. Return `200 { cancelled: true }` if found, `404 { error: 'no running harvest for id' }` otherwise.
  - Acceptance: Authenticated POST with running job → 200 and token flipped. No running job → 404. Viewer/unauthenticated → 401/403.

- [ ] **TASK-005** Add `deleteHarvestedDatasets(source, last_modified)` to PostgresUtils
  - Refs: FR-006
  - File: `server/app/persistence/postgres.utils.ts`
  - Details: New method executing `DELETE FROM record WHERE source = $1 AND last_modified = $2`. Return the count of deleted rows. Add the SQL string to the queries object following the pattern of `deleteNonFetchedRecords`.
  - Acceptance: Deletes only records matching both `source` AND `last_modified`; returns correct count; records with different source or different timestamp are unaffected.

- [ ] **TASK-006** Implement `CswCatalog.deleteHarvestRun(transactionTimestamp)`
  - Refs: FR-006, FR-008
  - File: `server/app/catalog/csw/csw.catalog.ts`
  - Details: Add private `buildDeleteByTransactionTransaction(transactionTimestamp: Date): string` returning the CSW-T Delete XML from design.md (three-way `PropertyIsLike` filter). Add public `async deleteHarvestRun(transactionTimestamp: Date): Promise<void>` calling `buildTargetUrl → postTransaction → parseTransactionResponse`; log `totalDeleted` at INFO; catch errors and log at ERROR without rethrowing. Model on existing `deleteRecordsForDatasource()` (~line 136).
  - Acceptance: Correct XML with all three filter clauses; `totalDeleted` logged at INFO on success; HTTP/ExceptionReport errors caught and logged at ERROR; no rethrow.

- [ ] **TASK-007** Wire cancel cleanup into `Importer.run()` catch block
  - Refs: FR-005, FR-006, FR-007, FR-008, NFR-004
  - File: `server/app/importer/importer.ts`
  - Details: In the `CancelledError` catch block: (a) if the DB transaction is still open (Phase 1), call `database.rollbackTransaction()`; (b) if the DB was already committed (Phase 2), call `database.deleteHarvestedDatasets(sourceURL, transactionTimestamp)` and then, for each catalog in the already-processed list that is a CSW catalog, call `catalog.deleteHarvestRun(transactionTimestamp)`. Log a summary at INFO (FR-008). Set job status to `cancelled` (FR-007). Regular catalog errors must reach the existing error catch, not this block (NFR-004).
  - Acceptance: Phase 1 cancel → rollback called, no delete methods called. Phase 2 cancel → `deleteHarvestedDatasets` called with correct args, `deleteHarvestRun` called only for already-processed CSW catalogs. Non-cancel catalog error → existing behavior unchanged.

- [ ] **TASK-008** Add cancel button to frontend active job/progress view
  - Refs: FR-001, FR-002, FR-009
  - File: Angular component for the active harvest progress view (identify from `client/src/`)
  - Details: Show a "Cancel" button while job status is running. On click: disable the button immediately, then `POST /api/import/:id/cancel` with `{ jobId }`. When the WebSocket emits `cancelled` status, update the job status display accordingly.
  - Acceptance: Button visible during an active run; disabled after click; hidden when status is idle/finished/cancelled/error; status label updates to `cancelled` when WebSocket event arrives.

- [ ] **TASK-009** Write unit tests for `CswCatalog.deleteHarvestRun`
  - Refs: FR-006
  - File: `server/test/catalog/csw/`
  - Details: Two sinon stubs on `postTransaction`: (1) success path — stub returns a valid TransactionResponse; assert `totalDeleted` logged at INFO. (2) error path — stub rejects or returns ExceptionReport; assert ERROR logged and method does not rethrow. Follow the pattern from the csw-delete-records-for-datasource feature tests.
  - Acceptance: Both tests pass under `npm test`; no existing tests broken.

- [ ] **TASK-010** Write unit tests for Phase 1 and Phase 2 cancellation paths in Importer
  - Refs: FR-005, FR-006, NFR-004
  - File: `server/test/importer/`
  - Details: Three scenarios: (1) Phase 1 cancel — assert `rollbackTransaction` called, `commitTransaction` not called, `deleteHarvestedDatasets` not called. (2) Phase 2 cancel — assert `deleteHarvestedDatasets` called with correct `(sourceURL, transactionTimestamp)`, `deleteHarvestRun` called for each already-processed CSW catalog only. (3) Phase 2 catalog error (non-cancel) — assert none of the cancel cleanup methods (`deleteHarvestedDatasets`, `deleteHarvestRun`) are called; existing error handling path runs.
  - Acceptance: All three scenarios pass; cancel vs. error paths are verifiably distinct.
