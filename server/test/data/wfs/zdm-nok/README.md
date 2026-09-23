# README

The input data for the WFS tests has been obtained using the following WFS requests.

## GetCapabilities.xml

Request: `GET https://www.kuestendaten.de/DE/dynamisch/nok_ogc/bs?request=GetCapabilities&VERSION=2.0.0&SERVICE=WFS`

## DescribeFeatureType.xml

Replace `{TYPENAMES}` with the desired type name, e.g., "ms:BiotoptypenLevensauFlaechen":

Request: `GET https://www.kuestendaten.de/DE/dynamisch/nok_ogc/bs?request=DescribeFeatureType&VERSION=2.0.0&SERVICE=WFS&typenames={TYPENAMES}` 

## GetFeature_hits.xml

Replace `{TYPENAMES}` with the desired type name, e.g., "ms:BiotoptypenLevensauFlaechen":

Request: `GET https://www.kuestendaten.de/DE/dynamisch/nok_ogc/bs?request=GetFeature&VERSION=2.0.0&SERVICE=WFS&resultType=hits&typenames={TYPENAMES}`

## GetFeature_results.xml

Replace `{TYPENAMES}` with the desired type name, e.g., "ms:BiotoptypenLevensauFlaechen":

Request: `GET https://www.kuestendaten.de/DE/dynamisch/nok_ogc/bs?request=GetFeature&VERSION=2.0.0&SERVICE=WFS&resultType=results&typenames={TYPENAMES}`
