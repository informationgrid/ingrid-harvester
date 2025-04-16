---
id: harvester_type_settings
profile: ingrid
title: Harvester Basis Angaben
---

# Harvester Basis Angaben

Grundlegende Einstellungen zur Konfiguration eines Harvesters und zur Zuordnung der Datenquelle.

# Typ (Pflichtfeld)

Typ der angebundenen Datenquelle.  
Verfügbare Typen sind abhängig vom gewählten Profil und können dem Dropdown entnommen werden.

# Indexname (Pflichtfeld)

Name des Elasticsearch-Index, in dem die erfassten Datensätze gespeichert werden sollen.

**Beispiel:** `csw_data_server_de`

# Beschreibung (Pflichtfeld)

Freitext zur Beschreibung des Harvesters. z. B. Name oder Zweck der Datenquelle.

**Beispiel:** `data-server.de`

# Priorität

Definiert die Relevanz der Datensätze bei der Deduplizierung.  
Harvester mit höherer Priorität behalten bei Duplikaten ihre Datensätze, solche mit niedriger Priorität werden verworfen.  
Die Priorisierung ist profilabhängig und dient zur Steuerung der Datenqualität und Herkunft.

**Beispiel:** `5`
