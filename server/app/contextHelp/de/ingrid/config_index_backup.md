---
id: config_index_backup
profile: ingrid
title: Konfiguration von Index-Backup
---

# Index-Backup

| Formular-Feld               | Beschreibung                                                      |
|-----------------------------|-------------------------------------------------------------------|
| Index-Backup aktivieren     | Toggle-Switch, um regelmäßige Index-Backups durchzuführen <br>Beispielwert: `true` |
| Cron Expression             | Cron Expression, um zeitliche Durchführung von Backups zu planen <br>Beispielwert: `10 04 * * *` |
| Index (RegExp)              | Regulärer Ausdruck zur Selektion der zu sichernden Indizes <br>Beispielwert: `harvester_statistic|url_check_history|index_check_history` |
| Verzeichnis                 | Das Verzeichnis, unter dem die Backups abgespeichert werden sollen |
