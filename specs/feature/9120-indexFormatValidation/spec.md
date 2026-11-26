---
feature: index-format-validation
status: draft
created: 2026-09-28
---

## Overview

The `ingrid` profile mapper (`server/app/profiles/ingrid/mapper/ingrid.mapper.ts`) resolves which document shape (`DocumentKind`: `'ingrid'` | `'opendata'` | `'ingrid-deprecated'` | `'opendata-deprecated'`) to build by inspecting its target catalogs' `mappingFile` setting (`resolveMappingHint()`). No mapper subclass ever actually produces both live shapes — CSW/WFS mappers only ever populate ISO/InGrid fields, CKAN/DCAT-AP.de/Genesis mappers only ever populate DCAT/OpenData fields — so this catalog-driven lookup is solving a choice that doesn't exist for the two live kinds, while creating a real one: when one importer's `catalogIds` mixes an `'ingrid'`-mapped and an `'opendata'`-mapped catalog, `resolveMappingHint()` can't pick correctly, falls back with a warning, and the single resulting document is silently rejected by whichever catalog's JSON schema doesn't match it (dropped per-record in `IngridElasticsearchCatalog.importIntoCatalog()`, no run-level failure). The same coupling also prevents a desired capability: one Elasticsearch catalog cannot currently be fed by two differently-shaped datasources (e.g. a CSW harvester and a Genesis harvester both publishing into one combined index).

This feature decouples three things that are wrongly tied together through the catalog's `mappingFile`: which physical Elasticsearch mapping a catalog uses, which `DocumentKind` a mapper builds, and which JSON schema validates a document.

## Functional Requirements

- FR-001: A mapper's live `DocumentKind` (`'ingrid'`/`'opendata'`) is determined solely by the mapper's own subclass (`getDefaultDocumentKind()`), never by which catalog(s) it targets.
- FR-002: Deprecated `DocumentKind` resolution (`'ingrid-deprecated'`/`'opendata-deprecated'`) remains driven by the target catalogs' `mappingFile`, unchanged from today.
- FR-003: If an importer's target catalogs mix a deprecated mapping (matching the mapper's own family) with any non-deprecated or other-family-deprecated mapping, document generation fails loudly (aborts the harvest run via the existing `type: 'app'` error mechanism) instead of silently falling back.
- FR-004: Each built (live-kind) document is validated against its own JSON schema (`index-ingrid.json` / `index-opendata.json`) inside the mapper, immediately after building, independent of any catalog.
- FR-005: A document that fails schema validation is not persisted or indexed to any catalog; the harvest run for that importer aborts.
- FR-006: `ElasticsearchCatalogSettings.settings.mappingFile` becomes optional. An Elasticsearch catalog with no `mappingFile` set uses the unified live ES mapping and performs no catalog-level schema validation (the mapper already validated).
- FR-007: One Elasticsearch catalog can be fed by multiple datasources producing different live `DocumentKind`s (e.g. `'ingrid'` from a CSW datasource and `'opendata'` from a Genesis datasource) without either being rejected due to a catalog-level mapping/schema mismatch.
- FR-008: `default-mapping.json` becomes the single live ES mapping (union of the former `default-mapping.json` and `opendata-mapping.json` live fields); `opendata-mapping.json` is deleted rather than kept as a duplicate. Its 5 deprecated-shape-only fields (`uuid`, `collection`, `t01_object`, root-level `modified`, `sort_hash` — not declared in `index-opendata.json`, not on `IngridOpendataIndexDocument`, never written by `buildOpendataDocument()`) are not carried over.
- FR-009: Schema validation is exposed as a generic mechanism on the shared `DocumentFactory<T>` contract (`getSchemaName()`) and `ProfileFactory` (`validateIndexDocument()`), so any profile can opt in — not just `ingrid`. `diplanung` and `lvr` are wired to call it, but since neither has a JSON schema file yet, it is a verified no-op for both today.
- FR-010: New catalog type `directus` (UmweltNAVI Ingest API, "Directus Push-Schnittstelle", OpenAPI at `https://directus.dev.umweltnavi.info/ingest/v1/api-docs/`), implemented for the `ingrid` profile. Instead of writing documents in the new index format directly to an Elasticsearch catalog, they are pushed to this API, which post-processes them and stores them in Elasticsearch. Behaviour as the IGE Directus connection (`ingrid-editor` `DirectusClient.kt`, `DirectusIndexer.kt`): `incremental` import sessions only, `upsert`/`delete` operations in batches, then `commit`; the session state is then polled and its result reported in the `Summary`. The Directus catalog (`catalog_id`) used by the harvester must not be shared with the IGE (a `full` import of the IGE would remove the harvester's records and block its imports).
- FR-011: The catalog configuration dialog offers a "Verbindung testen" button for `directus` catalogs, which checks the connection with the values currently entered (URL reachable, API key and `catalog_id` accepted) and shows the result at the button.

## Non-Functional Requirements

- NFR-001: **Breaking change, accepted deliberately**: any Elastic catalog configured with `mappingFile: "opendata-mapping"` must have that value removed (or set to `"default-mapping"`) before upgrading, since `getIndexMappings()` (`profile.factory.ts`) has no fallback for a missing mapping file and would throw. This repo's own `server/config/ingrid/config-catalogs.json` is migrated as part of this change; external deployments must migrate their own `config-catalogs.json` the same way. All other existing `mappingFile` values (`'default-mapping'`, both deprecated variants, or unset) continue to resolve unchanged — no migration needed for those.
- NFR-002: No new custom exception classes (`conventions.md` → Error Handling: "No custom exception classes — use standard `Error`"); a fatal condition is signaled with a plain, un-decorated `throw new Error(...)`, matching the pattern already used elsewhere in `ingridMapper` (e.g. `createIndexDocument()`'s missing-builder check) — the calling importer's existing `catch` block logs it and accumulates it as a `type: 'app'` `Summary` error, same as any other `createIndexDocument()` failure.
- NFR-003: Existing deprecated-format integration tests (`*.integration.spec.ts`) pass unmodified — they exercise only the deprecated path today. *Note (TASK-015):* the 5 ingrid deprecated-format specs moved to `server/test/integration-deprecated/`; behavior is 1:1, the only edit is an explicit `withDeprecatedMapping()` wrapper (the deprecated `mappingFile` used to be injected implicitly by the shared runner), plus `expectedDocsBaseFixture` for Genesis whose deprecated expected output moved to `server/test/data-deprecated/`.

## Out of Scope

- Merging `IngridIndexDocument`/`IngridOpendataIndexDocument` into one type.
- Merging `buildIngridDocument()`/`buildOpendataDocument()`/the `getDocumentBuilders()` registry itself.
- Any change to the deprecated mappings, deprecated schemas (which don't exist yet), or deprecated builders.
- Cleanup of `default-mapping.deprecated.json` / `opendata-mapping.deprecated.json`.
