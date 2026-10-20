# README

The input data for the DCAT-AP tests has been obtained using the following requests.

## 3.0.0.json

Request: `GET https://open-data.stadtatlas.dessau-rosslau.de/api/feed/dcat-ap/3.0.0.json`

For size reasons, the resulting RDF file has been manually filtered to only include the following datasets:

* a537c7007dd44945bc378eb59e10314c
* a537c7007dd44945bc378eb59e10314c_0
* a537c7007dd44945bc378eb59e10314c_29

## original/

Expected `original_document` of the stored records: the JSON-LD catalog with only the record's `dcat:dataset` (`DcatapImporter.getOriginalDocument()`); compared as parsed JSON (TASK-044).

## csw/

Expected `dataset_csw` of the stored records (ISO 19139 built by `DcatapIsoMapper`); compared structurally (TASK-044).
