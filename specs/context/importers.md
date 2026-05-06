---
type: context
topic: importers
status: draft
updated: 2026-04-28
---

## Importer Hierarchy

```mermaid
classDiagram
    class Importer {
        <<abstract>>
        +exec(observer)
        +run(isIncremental)
        +cancel()
        #harvesterRunCancelled bool
        #harvest()* int
        #getDefaultSettings()* S
    }
    class CswImporter {
        +exec(observer)
        +harvest() int
        +harvestServices()
        +coupleDatasetsServices()
    }
    class WfsImporter { +harvest() int }
    class CkanImporter { +harvest() int }
    class DcatapdeImporter { +harvest() int }
    class DcatappluImporter { +harvest() int }
    class GenesisImporter { +harvest() int }
    class JsonImporter { +harvest() int }
    class KldImporter { +harvest() int }
    class OaiImporter { +harvest() int }
    class SparqlImporter { +harvest() int }
    class DiplanungCswImporter { #updateRecords() }
    class DiplanungWfsImporter
    class FisWfsImporter
    class LvrClickRheinImporter { #preHarvestingHandling() }

    Importer <|-- CswImporter : server/app/importer/csw/
    Importer <|-- WfsImporter : server/app/importer/wfs/
    Importer <|-- CkanImporter : server/app/importer/ckan/
    Importer <|-- DcatapdeImporter : server/app/importer/dcatapde/
    Importer <|-- DcatappluImporter : server/app/importer/dcatapplu/
    Importer <|-- GenesisImporter : server/app/importer/genesis/
    Importer <|-- JsonImporter : server/app/importer/json/
    Importer <|-- KldImporter : server/app/importer/kld/
    Importer <|-- OaiImporter : server/app/importer/oai/
    Importer <|-- SparqlImporter : server/app/importer/sparql/
    CswImporter <|-- DiplanungCswImporter : server/app/profiles/diplanung/
    WfsImporter <|-- DiplanungWfsImporter : server/app/profiles/diplanung/
    WfsImporter <|-- FisWfsImporter : server/app/profiles/diplanung/
    JsonImporter <|-- LvrClickRheinImporter : server/app/profiles/lvr/
```

---

## Critical exec() Invariant

- `CswImporter` is the **only** Level-2 importer that **replaces** `exec()` without calling `super.exec()`; adds `harvestServices()` and `coupleDatasetsServices()` before the catalog loop.
- All other Level-2 importers that override `exec()` call `super.exec(observer)`.
- `GenesisImporter` only overrides `harvest()`, not `exec()`.
- Level-3 importers do **not** override `exec()`; they override hooks (`updateRecords`, `postHarvestingHandling`, `getMapper`) or constructor logic.

### CswImporter exec() stages

```mermaid
flowchart TD
    T[beginTransaction] --> INC[incremental filter setup]
    INC --> H[harvest\nparallel HTTP fetches]
    H --> HS[harvestServices\nif harvestingMode == separate]
    HS --> C[coupleDatasetsServices\nparallel DB writes]
    C --> D[deleteNonFetchedDatasets]
    D --> CT[commitTransaction]
    CT --> CAT[for each catalogId\ncatalog.process]
    CAT --> P[postHarvestingHandling]
```

### Base Importer exec() stages

```mermaid
flowchart TD
    T[beginTransaction] --> H[harvest]
    H --> V[coverage validation]
    V --> D[deleteNonFetchedDatasets]
    D --> CT[commitTransaction]
    CT --> CAT[for each catalogId\ncatalog.process]
    CAT --> P[postHarvestingHandling]
```

---

## Where to Put Cross-Cutting Behavior

| Scope | Where to change |
|-------|----------------|
| All importers | `Importer.exec()` base class — covers all Level-2 and Level-3 importers except `CswImporter` |
| All CSW-type importers (including profile variants) | `CswImporter.exec()` — covers `CswImporter` and `DiplanungCswImporter` (which inherits exec()) |
| Profile-specific behavior | Level-3 importer — override a hook (`updateRecords`, `postHarvestingHandling`) |
| **Never** | Modify every Level-2 importer file individually for a cross-cutting concern |

---

## Mapper Hierarchy

```mermaid
classDiagram
    class Mapper {
        <<abstract>>
        +getHarvestedData()* string
        +getHarvestingDate()* Date
        +getMetadataSource()* MetadataSource
    }
    class ToElasticMapper { <<interface>> +createIndexDocument()* }
    class ToDcatapdeMapper { <<interface>> +createDcatapdeDocument()* }

    class CswMapper
    class CkanMapper
    class WfsMapper
    class DcatapdeMapper
    class DcatappluMapper
    class GenesisMapper
    class JsonMapper
    class KldMapper
    class OaiMapper
    class SparqlMapper

    class DiplanungCswMapper { <<DocumentFactory>> }
    class DiplanungDcatappluMapper { <<DocumentFactory>> }
    class DiplanungWfsMapper { <<DocumentFactory>> }
    class ingridCswMapper { <<DocumentFactory>> }
    class ingridWfsMapper { <<DocumentFactory>> }
    class LvrOaiLidoMapper { <<DocumentFactory>> }
    class LvrKldMapper { <<DocumentFactory>> }

    Mapper <|-- CswMapper : server/app/importer/csw/
    Mapper <|-- CkanMapper : server/app/importer/ckan/
    Mapper <|-- WfsMapper : server/app/importer/wfs/
    Mapper <|-- DcatapdeMapper : server/app/importer/dcatapde/
    Mapper <|-- DcatappluMapper : server/app/importer/dcatapplu/
    Mapper <|-- GenesisMapper : server/app/importer/genesis/
    Mapper <|-- JsonMapper : server/app/importer/json/
    Mapper <|-- KldMapper : server/app/importer/kld/
    Mapper <|-- OaiMapper : server/app/importer/oai/
    Mapper <|-- SparqlMapper : server/app/importer/sparql/

    CswMapper --o DiplanungCswMapper : wraps
    DcatappluMapper --o DiplanungDcatappluMapper : wraps
    WfsMapper --o DiplanungWfsMapper : wraps
    CswMapper --o ingridCswMapper : wraps
    WfsMapper --o ingridWfsMapper : wraps
    OaiMapper --o LvrOaiLidoMapper : wraps
    KldMapper --o LvrKldMapper : wraps
```

Level-3 mappers implement `DocumentFactory<TargetDoc>` and **wrap** a Level-2 mapper instance rather than extending it. They are instantiated by the profile factory's `getDocumentFactory(mapper)`.
