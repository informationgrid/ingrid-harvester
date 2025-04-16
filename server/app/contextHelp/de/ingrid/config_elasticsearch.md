---
id: config_elasticsearch
profile: ingrid
title: Konfiguration von Elasticsearch
---

# Elasticsearch

| Formular-Feld               | Beschreibung                                                      |
|-----------------------------|-------------------------------------------------------------------|
| Version                     | Version der installierten Elasticsearch Instanz  <br>Beispielwert: `8` |
| Host-URL                    | Unter der URL ist Elasticsearch erreichbar <br>Beispielwert: `https://your-elasticsearch:9200`|
| Ungültige TLS Zertifikate abweisen | Wenn diese Check-Box ausgewählt ist, werden ungültige TLS Zertifikate abgewiesen. Eine Verbindung zu Elasticsearch ist dann nicht möglich. <br>Default: `true` |
| Benutzername                | Benutzername für Elasticsearch-Login                              |
| Passwort                    | Passwort für Elasticsearch-Login                                  |
| Alias-Name                  | Alias für die Elasticsearch-Indizes  <br>Beispielwert: `index-alias` |
| Index-Präfix                | Readonly, siehe Umgebungsvariable `ELASTIC_PREFIX`                |
| Index-Name                  | Readonly, siehe Umgebungsvariable `ELASTIC_INDEX`                 |
| Shards                      | Readonly, siehe Umgebungsvariable `ELASTIC_NUM_SHARDS`            |
| Replicas                    | Readonly, siehe Umgebungsvariable `ELASTIC_NUM_REPLICAS`          |

**Info:** 
Um die Verbindung zu Elasticsearch zu prüfen, klicken Sie auf den Button `VERBINDUNG TESTEN`. 