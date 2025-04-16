---
id: config_email
profile: ingrid
title: Konfiguration von E-Mail-Einstellungen
---

# E-Mail-Einstellungen

Wurden die E-Mail-Einstellungen aktiviert, so wird eine E-Mail versendet, wenn die Ergebnismenge unter der eingestellten Schwelle gegenüber dem letzten Import liegt oder gar keine Ergebnisse importiert wurden.

# Konfiguration

| Formular-Feld               | Beschreibung                                                      |
|-----------------------------|-------------------------------------------------------------------|
| E-Mail-Server               | Hinterlegen Sie einen E-Mail-Server                               |
| Port                        | Port von dem E-Mail-Server                                        |
| Secure Connection           | Erlaube ausschließlich sicher Verbindungen zum E-Mail-Server <br>Beispielwert: `true` |
| Ungültige TLS Zertifikate abweisen | Wenn diese Check-Box ausgewählt ist, werden ungültige TLS Zertifikate abgewiesen. Eine Verbindung zu E-Mail-Server ist dann nicht möglich. <br>Default: `true` |
| User                        | User vom E-Mail Account                                           |
| Passwort                    | Passwort vom E-Mail Account                                       |
| Absender                    | E-Mail vom Absender <br>Beispielwert: `absender@example.com`      |
| Empfänger                   | E-Mail vom Empfänger <br>Beispielwert: `empfaenger@example.com`   |
| Betreff-Tag                 | Betreff von der E-Mail <br>Beispielwert: `Harvester`              |


# Informationsgehalt einer E-Mail

- **Number of records**: Anzahl der Datensätze, die von der Schnittstelle geliefert werden.
- **Skipped records**: Anzahl Datensätze, die Aufgrund von Filtereinstellungen nicht übernommen wurden.
- **Record-Errors**: Anzahl Datensätze, bei deren Konvertierung ein Fehler aufgetreten ist (beispielsweise durch Format-Fehler, fehlende Details etc.), diese Datensätze werden nicht übernommen.
- **Warnings**: Anzahl Warnungen die beim konvertieren der Datensätze aufgetreten sind (insbesondere fehlende Lizenzen und unbekanntes Format der Resource), die betroffenen Datensätze werden übernommen.
- **App-Errors**: Allgemeine Fehler beim Abfragen des Datenanbieters die sich nicht auf einen einzelnen Datensatz beziehen (beispielsweise Probleme in der Kommunikation).
- **Elasticsearch-Errors**: Fehler bei der Kommunikation mit dem Elasticsearch-Server.

Sofern vorhanden werden zusätzlich die Daten aus dem vorherigen Lauf mit angegeben.
Wenn beim Import *App-Errors* oder *Elasticseach-Errors* auftreten, so wird der neue Index verworfen und ein gegebenenfalls vorhandener, alter Index bleibt erhalten.
Bei 0 Ergebnissen wird der neue Index verworfen und der alte Index beibehalten (bei CSW und CKAN).

# Beispiel Mail

**Beispiel Betreff:**

- *[mCloud] Importer "mCLOUD Excel Datei" mit weniger Ergebnissen!*
- *[mCloud] Importer "Open-Data-Portal des Rhein-Neckar-Verkehrs (RNV)" ohne Ergebnisse!*
    
**Beispiel Inhalt:**

```
    Current Run:
    ---------------------------------------------------------
    mCLOUD Excel Datei (EXCEL)
    ---------------------------------------------------------
    Number of records: 382
    Skipped records: 0
    Record-Errors: 0
    Warnings: 0
    App-Errors: 0
    Elasticsearch-Errors: 0

    Last Run (Thu Jun 04 2020 14:34:29 GMT+0200 (Central European Summer Time)):
    ---------------------------------------------------------
    mCLOUD Excel Datei (EXCEL)
    ---------------------------------------------------------
    Number of records: 536
    Skipped records: 0
    Record-Errors: 0
    Warnings: 0
    App-Errors: 0
    Elasticsearch-Errors: 0
```