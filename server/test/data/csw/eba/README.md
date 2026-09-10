# README

The input data for the CSW tests has been obtained using the following CSW requests.

## GetRecordsCapabilities.xml

Request: `GET https://geoinformation.eisenbahn-bundesamt.de/geonetwork/srv/ger/csw?request=GetCapabilities&service=CSW`

## GetRecordsHits.xml

Request: `GET https://geoinformation.eisenbahn-bundesamt.de/geonetwork/srv/ger/csw?service=CSW&request=GetRecords&version=2.0.2&typeNames=gmd:MD_Metadata&outputSchema=http://www.isotc211.org/2005/gmd&resultType=hits&constraint=<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>apiso:Identifier</ogc:PropertyName><ogc:Literal>fee82268-9d8c-4134-8123-9f9a8f728306</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>apiso:Identifier</ogc:PropertyName><ogc:Literal>6af062cb-a660-4278-9143-6b8a4c945545</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>apiso:Identifier</ogc:PropertyName><ogc:Literal>3110b7f0-5a6e-468d-8230-895d021c3785</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter>&CONSTRAINTLANGUAGE=FILTER&CONSTRAINT_LANGUAGE_VERSION=1.1.0`

## GetRecordsResults.xml

Request: `GET https://geoinformation.eisenbahn-bundesamt.de/geonetwork/srv/ger/csw?service=CSW&request=GetRecords&version=2.0.2&typeNames=gmd:MD_Metadata&outputSchema=http://www.isotc211.org/2005/gmd&resultType=results&constraint=<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:Or><ogc:PropertyIsEqualTo><ogc:PropertyName>apiso:Identifier</ogc:PropertyName><ogc:Literal>fee82268-9d8c-4134-8123-9f9a8f728306</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>apiso:Identifier</ogc:PropertyName><ogc:Literal>6af062cb-a660-4278-9143-6b8a4c945545</ogc:Literal></ogc:PropertyIsEqualTo><ogc:PropertyIsEqualTo><ogc:PropertyName>apiso:Identifier</ogc:PropertyName><ogc:Literal>3110b7f0-5a6e-468d-8230-895d021c3785</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Or></ogc:Filter>&CONSTRAINTLANGUAGE=FILTER&CONSTRAINT_LANGUAGE_VERSION=1.1.0`
