# README

The input data for the DCAT-AP.de tests has been obtained using the following requests.

## catalog.rdf

Request: `GET https://www.opendata-hro.de/catalog.rdf?page=1`

For size reasons, the resulting RDF file has been manually filtered to only include the following datasets:

* 5f7ddbd5-84e0-4eaf-8e24-4484e46527fb
* 98155429-d260-4d6c-b1d0-3dd0c94d6ee0
* b6804103-8124-459d-9e6a-542c425d7e29

The hydra elements have been adapted accordingly.

## original/

Expected `original_document` of the stored records (the `dcat:Dataset` with its dereferenced distributions, publishers and contact points), generated from the DCAT-AP.de importer before it was based on the DCAT-AP importer (TASK-039).
