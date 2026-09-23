---
feature: csw-delete-records-for-datasource
status: stable
created: 2026-04-20
---

## Overview

`CswCatalog.deleteRecordsForDatasource(sourceId)` is a stub that logs a warning instead of acting. This feature implements the method so that deleting a datasource removes all associated CSW catalog records — and only those records — from the target catalog.

## Requirements

### Functional Requirements

**FR-001** — Issue a CSW-T Transaction Delete request to the configured catalog endpoint when `deleteRecordsForDatasource(sourceId)` is called.

**FR-002** — Filter records using an OGC `And` expression: `subject LIKE %source:${sourceId}%` AND `subject LIKE %catalog:${catalogId}%`, scoping deletion to this datasource within this catalog instance only.

**FR-003** — On a valid `TransactionResponse`, extract `totalDeleted` and log at INFO.

**FR-004** — On an `ExceptionReport` or HTTP failure, log the error at ERROR.

**FR-005** — Reuse `postTransaction()` and `parseTransactionResponse()` for the HTTP call and response parsing.

### Non-Functional Requirements

**NFR-001** — Follow the same structure as `deleteStaleRecords()` in `csw.catalog.ts`.

**NFR-002** — No side effects beyond logging (no mutations to in-memory state or summary counters).

### Out of Scope

- `deleteRecordsForDatasource` in Piveau or Elasticsearch adapters
- Removing records from PostgreSQL
- Frontend/UI changes
- Changes to the traceability keyword schema in `addTraceability()`
