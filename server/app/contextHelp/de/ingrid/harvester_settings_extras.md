---
title: Weitere Einstellungen  
---

# Weitere Einstellungen

Konfigurationsbereich für weitere Anpassung der Datenverarbeitung.

# Zusätzlicher Mapping-Code

Optionales Feld zur Manipulation von Einträgen vor dem Speichern in Elasticsearch.  
Hier kann ein benutzerdefinierter Code hinterlegt werden, um Inhalte gezielt anzupassen.  
Grundkenntnisse im Bereich Elasticsearch Mapping sind erforderlich.

> **Beispielszenario:**  
> Der Wert `"Mitte"` soll räumlich eingeordnet werden. Da dieser Begriff zu unspezifisch ist, kann er beispielsweise zu `"Berlin Mitte"` umgewandelt werden, um die Aussagekraft zu erhöhen.

> **Beispielwert:**
> 
> ```doc.spatial_text = `Berlin ${doc.spatial_text}`;```
