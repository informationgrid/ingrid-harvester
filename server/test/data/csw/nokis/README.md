# README

The input data for the CSW tests has been obtained using the following CSW requests.

## GetRecordsCapabilities.xml

Request: `GET https://nokis.niedersachsen.de/NOKIS/servants/de/disy/preludio2/service/cat/csw/v_2_0_2/GetCapabilitiesServant$GET`

## GetRecords_hits.xml

Request: `POST https://nokis.niedersachsen.de/NOKIS//servants/de/disy/preludio2/service/cat/csw/v_2_0_2/GetRecords$Post$XML?SERVICE=CSW&REQUEST=GetRecords&VERSION=2.0.2`
```
<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords
        xmlns:csw="http://www.opengis.net/cat/csw/2.0.2"
        xmlns:gmd="http://www.isotc211.org/2005/gmd"
        xmlns:ogc="http://www.opengis.net/ogc"
        service="CSW" version="2.0.2" resultType="hits">
    <csw:Query typeNames="gmd:MD_Metadata">
        <csw:ElementSetName typeNames="">full</csw:ElementSetName>
        <csw:Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:Or>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>metadata-NPWHV13747</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>metadata-NPWHV36642</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>metadata-NPWHV56690</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Or>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Query>
</csw:GetRecords>
```

## GetRecords_results.xml

Request: `POST https://nokis.niedersachsen.de/NOKIS//servants/de/disy/preludio2/service/cat/csw/v_2_0_2/GetRecords$Post$XML?SERVICE=CSW&REQUEST=GetRecords&VERSION=2.0.2`
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
                        <ogc:Literal>metadata-NPWHV13747</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>metadata-NPWHV36642</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>Identifier</ogc:PropertyName>
                        <ogc:Literal>metadata-NPWHV56690</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Or>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Query>
</csw:GetRecords>
```
