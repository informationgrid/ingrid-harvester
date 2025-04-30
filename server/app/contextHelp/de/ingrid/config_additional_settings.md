---
title: Konfiguration zusätzlicher Einstellungen
---

# Zusätzliche Einstellungen

| Formular-Feld               | Beschreibung                                                      |
|-----------------------------|-------------------------------------------------------------------|
| Offset Cron-Jobs in Minuten | Dieses Feld ermöglicht die zeitversetzte Ausführung von Harvester-Prozessen, um gleichzeitige Abläufe bei parallelem Betrieb in mehreren Umgebungen (z. B. Produktion und Entwicklung) zu vermeiden. <br>Beispielwert: `0`                                        |
| Log-Level für fehlende Format-Mappings | Definieren Sie das Log-Level für fehlende Format_Mappings <br>Default: `WARNING` |
| Proxy URL                   | Proxy für die Netzwerk-Kommunikation                              |
| Unautorisierte Verbindungen über Proxy erlauben | Checkbox, die es ermöglicht alle Verbindungen über Proxy unabhängig vom SSL-Status zu erlauben <br>Default: `false` |
| Portal URL                  | URL vom Portal, das auf die vereinheitlichten Daten zu greift <br>Beispielwert: `https://dein-portal.anwendung.de` |