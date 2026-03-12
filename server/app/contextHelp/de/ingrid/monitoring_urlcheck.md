---
title: Url Prüfung
---

Die **Url Prüfung** ermittelt den Status, der in den Metadaten enthaltenen URLs (Download Links).

Für alle Distribution-URLs wird eine HEAD-Abfrage gemacht. Bei einer korrekten Antwort wird der HTTP-Statuscode der Antwort gespeichert, falls ein Fehler auftritt die entsprechende Fehlermeldung.

Im Diagramm werden die Ergebnisse gruppiert nach Statuscode-Bereich (2xx, 4xx oder 5xx) bzw. nach fehlerhafte Anfrage. Bei Klick auf einen Datensatz im Diagramm öffnet sich ein Pop-Up in der die Ergebnisse für diesen Durchlauf nach genauem Statuscode oder Fehler aufgeschlüsselt werden und jeweils die betroffenen URLs aufgelistet werden. Die URL-Einträge sind mit einer Suche nach mCLOUD Datensätzen mit dieser Distribution-URL verknüpft.

Hinweise zu Ergebnissen Status 405 - Method Not Allowed: Hier handelt es sich üblicherweise um Systeme die keine HEAD-Abfrage unterstützen. Ein normaler regulärer Aufruf der URL ist oftmals trotzdem möglich.

- **Index:** url_check_history (s. Indizes)
- **Cron:** Unter Konfiguration > Checks > Url Check kann ein Cron Expression hinterlegt werden.