---
id: harvester_csw_settings
profile: ingrid
title: CSW Einstellungen
---
# CSW Einstellungen

Konfigurationsbereich für grundlegende Parameter zur Anbindung einer CSW-Quelle (Catalogue Service for the Web).

Die folgenden Felder stehen zur Verfügung:

# HTTP Methode (Pflichtfeld)

Definiert die HTTP-Methode für Anfragen an den CSW-Dienst.

**Beispielwert:** `POST`

# GetRecords URL (Pflichtfeld)

URL der GetRecords-Schnittstelle des CSW-Dienstes zur Abfrage von Metadaten.

**Beispielwert:** `https://gdk.gdi-de.org/gdi-de/srv/ger/csw`

# Anzahl paralleler Abfragen (Pflichtfeld)

Legt fest, wie viele Abfragen gleichzeitig ausgeführt werden. Eine höhere Anzahl kann den Harvesting-Prozess beschleunigen.

**Beispielwert:** `6`

# Harvesting Modus (Pflichtfeld)

Bestimmt das Verfahren zur Datenerfassung:
- Standard: Führt eine vereinfachte Abfrage durch, ohne enthaltene Dienste (z. B. WFS, WMS) aufzulösen.
- Separat (langsam): Zusätzliche Auflösung enthaltenen Dienste. Zeitintensiver, erlaubt jedoch die Definition der maximalen Dienste pro Anfrage.

# Max. Dienste pro Anfrage

Nur im Modus *Separat* relevant. Gibt die maximale Anzahl an Diensten an, die in einer Abfrage verarbeitet werden.

**Beispielwert:** `30`

# WFS/WMS auflösen (Pflichtfeld)

Steuert, ob enthaltene WFS- oder WMS-Dienste aufgelöst werden.

**Beispielwert:** `ja (langsam)`

# Toleranz: Polygon vereinfachen	

Optional. Ermöglicht die Vereinfachung sehr detaillierter Geometrien, um die Datenmenge zu reduzieren. Ein höherer Wert führt zu stärkeren Vereinfachungen.

**Beispielwert:** `0,0001`

# Planstatus (Pflichtfeld)

Filteroption für Datensätze nach Planungsstatus. Relevanz insbesondere für Profile mit planungsbezogenen Anforderungen.

**Beispielwert:** `festgestellt`