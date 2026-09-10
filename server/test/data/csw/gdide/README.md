# README

The input data for the CSW tests has been obtained using the following CSW requests.

## GetRecordsCapabilities.xml

Request: `GET https://gdk.gdi-de.org/gdi-de/srv/eng/csw?request=GetCapabilities&service=CSW`

## GetRecordsHits.xml

Request: `POST https://gdk.gdi-de.org/gdi-de/srv/eng/csw?service=CSW&request=GetRecords`
```
<csw:GetRecords
        xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" 
        xmlns:ogc="http://www.opengis.net/ogc"
        xmlns:gmd="http://www.isotc211.org/2005/gmd"
        service="CSW" version="2.0.2" resultType="hits">
    <csw:Query typeNames="gmd:MD_Metadata">
        <csw:Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:Or>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>256a7a13-2bc7-462c-8353-4d09f6c3f8a8</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>f1950cd0-de59-413c-93fd-b669af06c863</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>142d56bb-108b-4e6a-96a6-8239b80af77e</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>def3f393-48c8-730a-328f-947231f493f4</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>cd7b8516-bbe3-4836-9ed8-b49b6d279932</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Or>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Query>
</csw:GetRecords>
```

## GetRecordsResults.xml

Request: `POST https://gdk.gdi-de.org/gdi-de/srv/eng/csw?service=CSW&request=GetRecords`
```
<csw:GetRecords
        xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" 
        xmlns:ogc="http://www.opengis.net/ogc"
        xmlns:gmd="http://www.isotc211.org/2005/gmd"
        service="CSW" version="2.0.2" resultType="results" outputSchema="http://www.isotc211.org/2005/gmd">
    <csw:Query typeNames="gmd:MD_Metadata">
        <csw:ElementSetName>full</csw:ElementSetName>
        <csw:Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:Or>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>256a7a13-2bc7-462c-8353-4d09f6c3f8a8</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>f1950cd0-de59-413c-93fd-b669af06c863</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>142d56bb-108b-4e6a-96a6-8239b80af77e</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>def3f393-48c8-730a-328f-947231f493f4</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>apiso:Identifier</ogc:PropertyName>
                        <ogc:Literal>cd7b8516-bbe3-4836-9ed8-b49b6d279932</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Or>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Query>
</csw:GetRecords>
```
