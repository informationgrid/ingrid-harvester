---
feature: genesis-political-geocoding-level
spec: ./spec.md
design: ./design.md
status: stable
---

## Tasks

- [x] TASK-001: Add `politicalGeocodingLevel` to `GenesisTypeConfig`
  - Refs: FR-001
  - File: `server/app/importer/genesis/genesis.settings.ts`
  - Details: Optional `politicalGeocodingLevel?: string` field, placed after `spatialUri?: string`, with a comment describing it as the DCAT-AP.DE `politicalGeocodingLevel` codelist (20006) key, UI-configurable. `spatialUri` untouched.
  - Acceptance: Field compiles; `spatialUri` line unchanged.

- [x] TASK-002: Add `getPoliticalGeocodingLevel()` to `GenesisMapper`
  - Refs: FR-003
  - File: `server/app/importer/genesis/genesis.mapper.ts`
  - Details: Passthrough getter after `getSpatialUri()`, same pattern (`return this.settings.typeConfig.politicalGeocodingLevel;`).
  - Acceptance: Unit test in TASK-006 passes.

- [x] TASK-003: Derive `political_geocoding_level_uri` and `dcatde:politicalGeocodingLevelURI` from the new field
  - Refs: FR-004, FR-005, FR-006
  - File: `server/app/profiles/ingrid/mapper/ingrid.genesis.mapper.ts`
  - Details: Add `POLITICAL_GEOCODING_LEVEL_BASE` constant and private `getPoliticalGeocodingLevelUri()` (key → full URI). Change `createIndexDocument()`'s `political_geocoding_level_uri` to use it instead of `this.baseMapper.getSpatialUri()`. In `_buildDcatapdeDocument()`, append a new `dcatde:politicalGeocodingLevelURI` element (when present) directly after the existing `dct:spatial` block for `spatialUri` — that block stays unmodified.
  - Acceptance: Integration test (TASK-007) shows both `dct:spatial` (geonames) and `dcatde:politicalGeocodingLevelURI` (codelist) in the RDF, and the correct URI in `political_geocoding_level_uri`.

- [x] TASK-004: Add frontend dropdown field
  - Refs: FR-002
  - File: `client/src/app/datasources/dialog-edit/fields/types/genesis.type.ts`
  - Details: New `type: "select"` field `politicalGeocodingLevel`, label "Ebene der geopolitischen Abdeckung", static `props.options` with the 6 codelist-20006 entries (international/european/federal/state/administrativeDistrict/municipality with German labels), inserted directly after the `spatialUri` field block, before `spatialWkt`. `spatialUri` field (key, type, label "Räumliche Abdeckung (URI)") unchanged.
  - Acceptance: Field renders as a dropdown in the GENESIS datasource dialog with 6 options.

- [x] TASK-005: Document the new field in context help
  - Refs: FR-007
  - File: `server/app/contextHelp/de/ingrid/harvester_genesis_settings.md`
  - Details: New `# Ebene der geopolitischen Abdeckung` section after `# Räumliche Abdeckung (URI)`, describing the codelist, its 6 values, and that it maps to `dcatde:politicalGeocodingLevelURI` / `political_geocoding_level_uri`.
  - Acceptance: Section renders in the context-help popup for the new field.

- [x] TASK-006: Unit test for `getPoliticalGeocodingLevel()`
  - Refs: FR-003
  - File: `server/test/importer/genesis/genesis.mapper.spec.ts`
  - Details: New `describe('getPoliticalGeocodingLevel', ...)` analogous to existing `getCopyright`/`getLanguage` passthrough tests.
  - Acceptance: Test passes under `npm run test`.

- [x] TASK-007: Update GENESIS integration fixtures
  - Refs: FR-004, FR-005
  - File: `server/test/data/genesis/genesis-st/config.json`, `server/test/data/genesis/genesis-st/elasticsearch/*.json`
  - Details: Add `typeConfig.politicalGeocodingLevel: "administrativeDistrict"` to the config fixture. Run `npm run test`, capture the actual mismatch for the 3 expected elasticsearch docs, and update `political_geocoding_level_uri` (new DCAT-AP.DE URI) and the embedded `rdf` string (add `dcatde:politicalGeocodingLevelURI`, keep existing `dct:spatial`) to match real mapper output — do not hand-craft the RDF string.
  - Acceptance: `GENESIS Integration Tests` (`genesis.integration.spec.ts`) pass.

- [x] TASK-008: Remove `spatialUri` from `GenesisTypeConfig`
  - Refs: FR-008
  - File: `server/app/importer/genesis/genesis.settings.ts`
  - Details: Delete the `spatialUri?: string;` field and its comment.
  - Acceptance: Field no longer exists on `GenesisTypeConfig`.

- [x] TASK-009: Remove `getSpatialUri()` from `GenesisMapper`
  - Refs: FR-008
  - File: `server/app/importer/genesis/genesis.mapper.ts`
  - Details: Delete the `getSpatialUri()` method.
  - Acceptance: No remaining references to `getSpatialUri` in `server/app`.

- [x] TASK-010: Remove the `dct:spatial` (spatialUri) block from the DCAT-AP.DE export
  - Refs: FR-008
  - File: `server/app/profiles/ingrid/mapper/ingrid.genesis.mapper.ts`
  - Details: Delete the `const spatialUri = this.baseMapper.getSpatialUri(); if (spatialUri) {...}` block in `_buildDcatapdeDocument()`. The `dcatde:politicalGeocodingLevelURI` block (TASK-003) is unaffected.
  - Acceptance: Integration test (TASK-012) shows no `dct:spatial rdf:resource=...` element in the RDF output.

- [x] TASK-011: Remove the orphaned frontend field and its context-help section
  - Refs: FR-008
  - File: `client/src/app/datasources/dialog-edit/fields/types/genesis.type.ts`, `server/app/contextHelp/de/ingrid/harvester_genesis_settings.md`
  - Details: Delete the `spatialUri` input field block (label "Räumliche Abdeckung (URI)") and the corresponding `# Räumliche Abdeckung (URI)` context-help section.
  - Acceptance: No field or help section references `spatialUri`.

- [x] TASK-012: Update GENESIS integration fixtures for the removal
  - Refs: FR-008
  - File: `server/test/data/genesis/genesis-st/config.json`, `server/test/data/genesis/genesis-st/elasticsearch/*.json`
  - Details: Remove `typeConfig.spatialUri` from the config fixture. Remove the `<dct:spatial rdf:resource="https://www.geonames.org/2842565"/>` element from the embedded `rdf` string in the 3 expected elasticsearch docs (verify against real mapper output, don't hand-craft).
  - Acceptance: `GENESIS Integration Tests` (`genesis.integration.spec.ts`) pass; `server/config/ingrid/config.json` (live runtime state, out of scope) left untouched.
