---
title: Ausführung planen
---

# Ausführung

Die Ausführung der Harvester kann manuell gestartet werden oder zeitlich gesteuert automatisch erfolgen.
Wählen Sie zunächst einen bestehenden Harvester aus in dem Sie auf den Titel des Harvesters klicken.

- Die Schaltfläche `IMPORT STARTEN` führt den Harvester direkt aus.
- Über die Schaltfläche `PLANEN` öffnet sich ein Dialog, in dem die regelmäßige automatische Ausführung des Harvesters aktiviert und geplant werden kann.

Die Intervallsteuerung erfolgt dabei entsprechend der Cron-Notation: https://de.wikipedia.org/wiki/Cron#Beispiele

```
*/5 * * * * => Alle 5 Minuten
45 8 * * * => Täglich um 8:45 Uhr
```

**Alle importieren:** In der linken oberen Ecke, finden Sie die Schaltfläche `ALLE IMPORTIEREN`, mit der alle aktiven Harvester manuell gestartet werden.