---
id: harvester_csw_filter
profile: ingrid  
title: Filter und Regeln  
---

# Filter und Regeln

Konfigurationsbereich für filterbasierte Einschränkungen und Regeln beim Zugriff auf CSW-Daten.  

Die folgenden Felder stehen zur Verfügung:

# Ausgeschlossene IDs

Liste von IDs, die explizit ausgeschlossen werden sollen.

**Beispiel:** `e2ed7da0-007a-11e0-be74-0000779eba3a`

# Nicht ausgeschlossene IDs

Liste von IDs, die trotz genereller Ausschlüsse berücksichtigt werden sollen.

**Beispiel:** `e2ed7da0-007a-11e0-be74-0000779eba3a`

# Muss Daten-Download enthalten

Wenn aktiviert, werden nur Datensätze indexiert, die einen direkten Daten-Download enthalten.

# Datenformat ausschließen

Ermöglicht das Ausschließen bestimmter Datenformate, sofern die Option *Muss Daten-Download enthalten* aktiv ist.

**Beispiel:** `rss, doc`

# Record Filter

Ermöglicht die gezielte Filterung von CSW-Datensätzen im Rahmen einer GetRecords-Abfrage.  
Durch Kombination mehrerer Bedingungen können nur relevante Datensätze abgefragt werden.

**Beispiel:**

```xml
<ogc:Filter>
    <ogc:And>
        <ogc:Or>
            <ogc:PropertyIsEqualTo>
                <ogc:PropertyName>Subject</ogc:PropertyName>
                <ogc:Literal>Bauleitplanung</ogc:Literal>
            </ogc:PropertyIsEqualTo>
            <ogc:PropertyIsEqualTo>
                <ogc:PropertyName>Subject</ogc:PropertyName>
                <ogc:Literal>Bauleitpläne</ogc:Literal>
            </ogc:PropertyIsEqualTo>
            <ogc:PropertyIsEqualTo>
                <ogc:PropertyName>Subject</ogc:PropertyName>
                <ogc:Literal>Bebauungsplan</ogc:Literal>
            </ogc:PropertyIsEqualTo>
        </ogc:Or>
        <ogc:PropertyIsLike escapeChar="\" singleChar="?" wildCard="*">
            <ogc:PropertyName>AnyText</ogc:PropertyName>
            <ogc:Literal>*Hamburg*</ogc:Literal>
        </ogc:PropertyIsLike>
    </ogc:And>
</ogc:Filter>
```

# Either keywords

Erlaubt eine nachgelagerte Filterung der Metadaten anhand definierter Schlagwörter nach der GetRecords-Abfrage.

**Beispiel:** `keyword-A, keyword-B`
