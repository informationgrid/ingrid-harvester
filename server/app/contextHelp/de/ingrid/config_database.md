---
title: Konfiguration der Datenbank
---

# Datenbank

Eine Datenbank ist für den Harvester unabdingbar.

Prüfen Sie die Verbindung mit dem Button **VERBINDUNG TESTEN**.

**Info:**
Sie können entweder den `Verbindungsstring` angeben oder die Felder `URL`, `Port` und `Datenbank-Name` ausfüllen. Der Verbindungsstring hat höhere Priorität.

| Formular-Feld               | Beschreibung                                                      |
|-----------------------------|-------------------------------------------------------------------|
| Verbindungsstring           | Über dem Verbindungsstring ist die Datenbank zu erreichen <br>Beispielwert: `localhost:5432/database-name` |
| URL                         | Unter der URL ist die Datenbank erreichbar  <br>Beispielwert: `localhost` |
| Port                        | Unter dem Port ist die Datenbank erreichbar  <br>Beispielwert: `5432` |
| Datenbank-Name              | Der Name der Datenbank  <br>Beispielwert: `database-name`         |
| Benutzername                | Benutzername für den Login zur Datenbank                          |
| Passwort                    | Passwort zur Datenbank                                            |
| Identifier des Standard-Katalogs | Dieses Feld ist readonly und wird während der Installation mit der Umgebungsvariable `DEFAULT_CATALOG` gesetzt. <br>Beispielwert: `harvester` |
