# README

The input data for the CSW tests has been obtained using the following CSW requests.

## GetRecordsCapabilities.xml

Request: `GET https://mis.bkg.bund.de/csw?SERVICE=CSW&REQUEST=GetCapabilities&VERSION=2.0.2`

## GetRecords_hits.xml

Request: `POST https://mis.bkg.bund.de/csw`
```
<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords 
        xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" 
        xmlns:gmd="http://www.isotc211.org/2005/gmd" 
        xmlns:ogc="http://www.opengis.net/ogc" 
        service="CSW" version="2.0.2" resultType="hits">
    <csw:Query typeNames="gmd:MD_Metadata">
        <csw:ElementSetName typeNames="">summary</csw:ElementSetName>
        <csw:Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:Or>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>12E82980-FB99-4A8E-8C96-BB3AE11DB63E</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>BD6C2EFB-09DA-40FC-AA42-001FD85342BF</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Or>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Query>
</csw:GetRecords>
```

## GetRecords_results.xml

Request: `POST https://mis.bkg.bund.de/csw`
```
<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords 
        xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" 
        xmlns:gmd="http://www.isotc211.org/2005/gmd" 
        xmlns:ogc="http://www.opengis.net/ogc" 
        service="CSW" version="2.0.2" resultType="results">
    <csw:Query typeNames="gmd:MD_Metadata">
        <csw:ElementSetName typeNames="">full</csw:ElementSetName>
        <csw:Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:Or>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>12E82980-FB99-4A8E-8C96-BB3AE11DB63E</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>BD6C2EFB-09DA-40FC-AA42-001FD85342BF</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Or>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Query>
</csw:GetRecords>
```
