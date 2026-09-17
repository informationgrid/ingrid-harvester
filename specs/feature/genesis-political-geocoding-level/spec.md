---
feature: genesis-political-geocoding-level
status: stable
created: 2026-09-16
---

## Overview

The GENESIS harvester's `spatialUri` setting is a free-text URI, mapped both to `dct:spatial` and (incorrectly) to the index document's `political_geocoding_level_uri`, which is meant to hold a value from the DCAT-AP.DE `politicalGeocodingLevel` codelist (20006), not an arbitrary URI. This feature adds a new, separate dropdown setting `politicalGeocodingLevel` backed by the fixed 6-value codelist, and corrects `political_geocoding_level_uri` (index document) and the DCAT-AP.DE export to be derived from it instead of from `spatialUri`.

## Functional Requirements

- **FR-001**: `GenesisTypeConfig` gains an optional `politicalGeocodingLevel?: string` field holding a codelist key (e.g. `administrativeDistrict`).
- **FR-002**: The GENESIS datasource dialog shows a dropdown field "Ebene der geopolitischen Abdeckung" with the 6 static codelist-20006 options (international, european, federal, state, administrativeDistrict, municipality), placed after "Räumliche Abdeckung (URI)".
- **FR-003**: `GenesisMapper.getPoliticalGeocodingLevel()` returns the configured codelist key (settings passthrough), analogous to `getSpatialUri()`.
- **FR-004**: The ingrid GENESIS index document (`political_geocoding_level_uri`) is populated from the new `politicalGeocodingLevel` setting, mapped to the full DCAT-AP.DE URI (`http://dcat-ap.de/def/politicalGeocoding/Level/<key>`) — no longer from `spatialUri`.
- **FR-005**: The generated DCAT-AP.DE RDF document gains a `dcatde:politicalGeocodingLevelURI` element (when configured), in addition to the existing `dct:spatial` element derived from `spatialUri`.
- **FR-006**: `spatialUri` remains unchanged: still a free-text URI input, still mapped to `dct:spatial` in the RDF export. It is not renamed and no longer feeds `political_geocoding_level_uri`.
- **FR-007**: Context help (`harvester_genesis_settings.md`) documents the new field, its codelist values, and its mapping targets.

## Non-Functional Requirements

- **NFR-001**: The codelist-20006 values are hardcoded as a static options array in the frontend field definition (no new codelist XML file, no REST endpoint) — deliberate scope reduction for this iteration.

## Out of Scope

- Renaming or removing `spatialUri`.
- A general-purpose codelist REST endpoint or `codelist_20006.xml` file.
- Validating that a stored `politicalGeocodingLevel` key is one of the 6 known values.
