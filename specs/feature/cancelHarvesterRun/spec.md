---
feature: cancelHarvesterRun
status: draft
created: 2026-04-27
---

## Overview

Users must be able to cancel an in-progress datasource harvest from the frontend's active job/progress view. On cancellation the backend stops the harvest pipeline and removes all records written during the run from PostgreSQL and from any CSW catalog targets that were already written to, leaving the system in its pre-harvest state.

## Functional Requirements

- **FR-001**: The active job/progress view in the frontend shows a "Cancel" button while a harvest is running.
- **FR-002**: Clicking "Cancel" sends a cancel request to the backend, identified by harvesterId and jobId. The button is disabled immediately after clicking to prevent double-cancellation.
- **FR-003**: The backend exposes `POST /api/import/:id/cancel` (auth: admin, editor) that signals the running harvest for that harvesterId to stop.
- **FR-004**: The backend returns 404 if no harvest is currently running for the given harvesterId, 200 on success.
- **FR-005**: If cancelled during Phase 1 (PostgreSQL write, DB transaction still open): the open database transaction is rolled back; no records from this run persist in PostgreSQL.
- **FR-006**: If cancelled during Phase 2 (catalog publishing, DB already committed): all records written to PostgreSQL in this run are deleted (identified by `sourceURL` + `transactionTimestamp`); records already published to CSW catalog targets in this run are deleted via CSW-T Delete transactions filtered by `transaction:${transactionTimestamp}` AND `source:${sourceId}` AND `catalog:${catalogId}`.
- **FR-007**: The job status is set to `cancelled` after the rollback/cleanup completes.
- **FR-008**: Cancellation outcome is logged at INFO level, including how many DB records were removed and (for CSW) how many CSW records were deleted per catalog.
- **FR-009**: The frontend reflects the `cancelled` job status once received via WebSocket.

- **FR-010**: While rollback is in progress the frontend shows a `cancelling` status. The backend emits rollback stages (`rollbackSourceImport`, `rollbackTargetCatalog`) as named stages in the WebSocket stream so the frontend can display them.
- **FR-011**: `ImportLogMessage` carries a `cancelled: boolean` field. `jobs.utils.ts` derives `'cancelled'` status from this field (not from a message string).

## Non-Functional Requirements

- **NFR-001**: Cancellation takes effect at the next stage boundary; within a running stage (e.g. a batch of HTTP fetches) the stage runs to completion before cancel is processed.
- **NFR-002**: The cancel endpoint requires at minimum `editor` role (consistent with `POST /api/import/:id`).
- **NFR-003**: Only running jobs can be cancelled; scheduled/queued jobs not yet started are out of scope.
- **NFR-004**: Catalog errors in non-cancelled harvests must not trigger the cancellation cleanup path — the two error paths are strictly separate.
- **NFR-005**: The cancel button click must not toggle the accordion that contains it (`event.stopPropagation()`).

## Out of Scope

- Rollback for Elasticsearch and Piveau catalog targets.
- Cancelling jobs before they start (use the `disable` flag on the datasource for that).
- Undo of stale-record deletions already completed in `postImport` before cancel was triggered.
