# README

The input data for the GENESIS tests has been obtained using the following requests.
Note: the body is of type "Form URL Encoded".

## catalogue/statistics.json

Request: `POST https://genesis.sachsen-anhalt.de/webservice/rest/2020/catalogue/statistics`
```
selection=*&area=all&searchcriterion=Code&sortcriterion=Code&language=de&pagelength=2500&start=1
```

For size reasons, the resulting JSON file has been manually filtered to only include the following datasets:

* 11111
* 11911
* 12511

## catalogue/tables

Replace `{DATASET_ID}` with the desired id, e.g., "12511":

Request: `POST https://genesis.sachsen-anhalt.de/webservice/rest/2020/catalogue/tables`
```
selection={DATASET_ID}*&area=all&searchcriterion=Code&sortcriterion=Code&language=de&pagelength=2500&start=1
```

## metadata/statistic

Replace `{DATASET_ID}` with the desired id, e.g., "12511":

Request: `POST https://genesis.sachsen-anhalt.de/webservice/rest/2020/metadata/statistic`
```
name={DATASET_ID}&language=de
```

## metadata/table

Replace `{TABLE_ID}` with the desired id, e.g., "12511-0001":

Request: `POST https://genesis.sachsen-anhalt.de/webservice/rest/2020/metadata/table`
```
name={TABLE_ID}&language=de
```
