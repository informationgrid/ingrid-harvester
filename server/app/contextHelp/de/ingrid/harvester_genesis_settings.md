---
title: GENESIS Einstellungen
---

# GENESIS Einstellungen

Konfigurationsbereich für den GENESIS-Harvester. GENESIS Online ist die Datenbank der Statistischen Ämter des Bundes und der Länder. Der Harvester ruft Statistiken und zugehörige Tabellen über die GENESIS REST-API ab und erzeugt daraus DCAT-AP.DE konforme Datensätze.

# Statistikauswahl

Auswahlmuster für die abzurufenden Statistiken. Jedes Muster wird als `selection`-Parameter an den Endpunkt `/catalogue/statistics` übergeben. Wildcards sind möglich.

**Beispiel:** `11*` ruft alle Statistiken ab, deren Code mit `11` beginnt.

# Anzahl paralleler Abfragen

Legt fest, wie viele API-Anfragen gleichzeitig gestellt werden dürfen. Höhere Werte beschleunigen den Prozess, können aber zur Überlastung der API führen.

**Beispiel:** `5`

# Verzögerung zwischen Anfragen (ms)

Wartezeit in Millisekunden zwischen aufeinanderfolgenden API-Anfragen. Dient zur Einhaltung von Rate-Limits der GENESIS-API.

**Beispiel:** `500`

# API-Token

Alternativer Zugangsmechanismus. Wenn ein Token angegeben ist, wird es als Passwort mit dem festen Benutzernamen `Gast` verwendet. Benutzername und Passwort werden in diesem Fall ignoriert.

# Benutzername / Passwort

Zugangsdaten für die GENESIS-API. Werden ignoriert, wenn ein API-Token gesetzt ist. Ohne Angabe werden die Standardwerte `Gast`/`Gast` verwendet.

# Statistik-URL-Vorlage (Einstiegsseite)

URL-Vorlage für die Einstiegsseite einer Statistik im GENESIS-Webportal. Der Platzhalter `{code}` wird durch den Statistikcode ersetzt. Die erzeugte URL wird als `dcat:landingPage` im Datensatz eingetragen.

**Beispiel:** `https://genesis.sachsen-anhalt.de/genesis/online?operation=statistic&code={code}`

# Tabellen-URL-Vorlage (Distribution)

URL-Vorlage für den Zugriff auf eine einzelne Tabelle. Der Platzhalter `{code}` wird durch den Tabellencode ersetzt. Jede Tabelle einer Statistik wird als `dcat:Distribution` im Datensatz angelegt.

**Beispiel:** `https://genesis.sachsen-anhalt.de/genesis/online?operation=table&code={code}`

# Herausgeber Name / E-Mail

Name und E-Mail-Adresse der herausgebenden Organisation. Wird als `dct:publisher` und `dcat:contactPoint` in das DCAT-AP.DE-Dokument eingetragen.

**Beispiel Name:** `Statistisches Landesamt XXX`  
**Beispiel E-Mail:** `mailto:info@destatis.de`

# Thema (URI)

URI eines EU-Datenthemas aus dem kontrollierten Vokabular der Europäischen Union. Wird als `dcat:theme` eingetragen.

**Beispiel:** `http://publications.europa.eu/resource/authority/data-theme/GOVE`

# Lizenz-URL

URI der Lizenz, unter der die Daten veröffentlicht werden. Wird als `dct:license` bei jeder Distribution eingetragen.

**Beispiel:** `http://dcat-ap.de/def/licenses/dl-by-de/2.0`

# Beitragende-ID

URI des Datenbereitstellers im DCAT-AP.DE-Beitragendenregister. Wird als `dcatde:contributorID` eingetragen.

**Beispiel:** `http://dcat-ap.de/def/contributors/genesisLsa`

# Räumliche Abdeckung (URI)

URI zur Beschreibung des geografischen Geltungsbereichs der Daten. Wird als `dct:spatial` eingetragen.

**Beispiel:** `https://www.geonames.org/2842565` (Sachsen-Anhalt)
