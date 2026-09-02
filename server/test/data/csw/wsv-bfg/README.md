# README

The input data for the CSW tests has been obtained using the following CSW requests.

## GetRecordsCapabilities.xml

Request: `GET https://geoportal.bafg.de/csw/api?SERVICE=CSW&REQUEST=GetCapabilities&VERSION=2.0.2`

## GetRecords_hits.xml

Request: `POST https://geoportal.bafg.de/csw/api`
```
<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords 
        xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" 
        xmlns:gmd="http://www.isotc211.org/2005/gmd" 
        xmlns:ogc="http://www.opengis.net/ogc" 
        service="CSW" version="2.0.2" resultType="hits" outputSchema="http://www.isotc211.org/2005/gmd">
    <csw:Query typeNames="gmd:MD_Metadata">
        <csw:ElementSetName typeNames="">summary</csw:ElementSetName>
        <csw:Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:Or>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>68c986b1-a98a-4af8-a504-30f542119bbf</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>0498827d-801e-49c9-a75e-0729fd964512</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Or>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Query>
</csw:GetRecords>
```

## GetRecords_results.xml

Request: `POST https://geoportal.bafg.de/csw/api`
```
<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords 
        xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" 
        xmlns:gmd="http://www.isotc211.org/2005/gmd" 
        xmlns:ogc="http://www.opengis.net/ogc" 
        service="CSW" version="2.0.2" resultType="results" outputSchema="http://www.isotc211.org/2005/gmd">
    <csw:Query typeNames="gmd:MD_Metadata">
        <csw:ElementSetName typeNames="">full</csw:ElementSetName>
        <csw:Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:Or>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>68c986b1-a98a-4af8-a504-30f542119bbf</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>0498827d-801e-49c9-a75e-0729fd964512</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Or>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Query>
</csw:GetRecords>
```
