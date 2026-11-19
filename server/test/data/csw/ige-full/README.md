# README

Synthetic CSW source with a single, fully populated ISO 19139 record written by the InGrid Editor. The catalog
snapshots of the other sources contain no `gmd:nameOfMeasure`, `gmd:EX_VerticalExtent`, `gmd:MD_Georectified` or
extent description; this source covers them.

## GetRecords_results.xml

The record is the InGrid Editor test resource
`ingrid-editor/server/src/test/resources/ingrid/import/iso_geodataset_full.xml` (branch `feature/i6680-indexFormat`),
unchanged except for indentation, wrapped in a CSW 2.0.2 `GetRecordsResponse` (1 record).

## GetRecords_hits.xml

Hand-written `GetRecordsResponse` with `numberOfRecordsMatched="1"`.

## GetCapabilities.xml

Copy of `../nokis/input/GetCapabilities.xml`; all requests are mocked, the operation URLs are not used.

## elasticsearch

The expected document was generated once from the importer output and reviewed field by field against the record
(see TASK-045 in `specs/feature/9120-indexFormatValidation/tasks.md`, including known deviations).
