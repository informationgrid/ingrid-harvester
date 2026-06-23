<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:gmd="http://www.isotc211.org/2005/gmd"
    xmlns:gco="http://www.isotc211.org/2005/gco">

    <!-- Identity: copy everything by default -->
    <xsl:template match="@*|node()">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>

    <!-- Suppress individual traceability keywords -->
    <xsl:template match="gmd:keyword[gco:CharacterString[
        starts-with(., 'source:')          or
        starts-with(., 'transaction:')     or
        starts-with(., 'catalog:')         or
        starts-with(., 'organisation:')    or
        starts-with(., 'sub_organisation:')
    ]]"/>

    <!-- Suppress the whole descriptiveKeywords block if only traceability keywords remain -->
    <xsl:template match="gmd:descriptiveKeywords[not(
        gmd:MD_Keywords/gmd:keyword[not(gco:CharacterString[
            starts-with(., 'source:')          or
            starts-with(., 'transaction:')     or
            starts-with(., 'catalog:')         or
            starts-with(., 'organisation:')    or
            starts-with(., 'sub_organisation:')
        ])]
    )]"/>

</xsl:stylesheet>
