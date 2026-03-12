---
title: InGrid Einstellungen  
---

# InGrid Einstellungen

Konfigurationsbereich für profilspezifische Parameter, die das Abfrageverhalten des Harvesters steuern.

Die folgenden Felder stehen zur Verfügung:

| Formular-Feld   | Beschreibung                                                                                                                                                                        |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| iPlugId         | Dieses Feld ist readonly und wird während der Installation mit der Umgebungsvariable `iPlugId` gesetzt. <br>Beispielwert: `ingrid-harvester`                                        |
| Partner         | Name/Identifikator des Partners <br>Beispielwert: `bund`                                                                                                                            |
| Provider        | Name des Anbieters                                                                                                                                                                  |
| Datasource Name | Die Bezeichnung unter der die Indizes im iBus angezeigt werden sollen. Dies wird als Präfix verwendet, um die Quellen besser unterscheiden zu können. <br>Beispielwert: `Harvester` |
| Datatype        | Kommaseparierte Auflistung der unterstützten Datentypen <br>Beispielwert: `default,dsc_csw,csw,metadata,IDF_1.0`                                                                    |
