---
id: config_harvesting_differences
profile: ingrid
title: Konfiguration von Harvesting Differenzen
---

# Harvesting Differenzen

Wenn bereits bestehende Datensätze im laufenden Harvesting nicht vorhanden sind, dann kann eine Differenz (in Prozent) definiert werden, um eine Benachrichtigung per E-Mail zu verschicken bzw. das Harvesting abzubrechen. Aktivieren/deaktivieren Sie dafür die entsprechende Option und definieren Sie einen Prozentwert wann die Aktion ausgeführt werden soll.

| Formular-Feld               | Beschreibung                                                      |
|-----------------------------|-------------------------------------------------------------------|
| E-Mail Benachrichtigung aktivieren |  Toggle-Switch, um E-Mail zu senden, wenn erwartet Datensätze fehlen <br>Beispielwert: `true` |
| E-Mail senden ab einer Differenz von | Beispielwert: `10` %                                     |
| Harvesting Abbruch aktivieren | Toggle-Switch, um Harvesting abzubrechen, wenn erwartet Datensätze fehlen <br>Beispielwert: `true` |
| Harvesting abbrechen ab einer Differenz von | Beispielwert: `10` %                              |