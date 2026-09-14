---
type: context
topic: conventions
status: draft
updated: 2026-04-24
---

## Documentation Style

Write all `specs/` documents token-efficiently:
- One rule per line; no restating content already captured elsewhere — cross-reference with "see X" instead
- Tables over prose for reference material (naming, decisions, settings)
- No filler phrases (`Note that…`, `It is important to…`, `This applies to…`)
- Omit examples when the rule description is unambiguous; add one only when the bad pattern is easily confused with the good pattern

---

## Language & Runtime

| | Server | Client |
|-|--------|--------|
| Language | TypeScript 5.8.3 | TypeScript 5.9.2 |
| Framework | TsED 7.55.0 (Express) | Angular 20.2.1 |
| Target | ES2021, NodeNext (ESM) | ES2022, ESNext |
| Strict mode | `false` | `false` |
| Runtime | Node.js 20 | Browser |

Server compiler flags: `experimentalDecorators`, `emitDecoratorMetadata`, `verbatimModuleSyntax`, `sourceMap` — all `true`.

---

## Package Structure

```
server/    Node.js backend
client/    Angular frontend
shared/    TypeScript types only — no build step, imported via @shared/* alias
```

Cross-package rule: use `@shared/*` alias only. Never import between `server/` and `client/`.

---

## Linter & Formatter

| Tool | Version | Scope |
|------|---------|-------|
| ESLint | 8.34.0 | server |
| ESLint | 8.56.0 | client |
| Prettier | 3.8.1 | client only |

---

## Naming Conventions

### Files

| Construct | Pattern | Examples |
|-----------|---------|---------|
| Importer | `<type>.importer.ts` | `ckan.importer.ts` |
| Mapper | `<type>.mapper.ts` | `diplanung.csw.mapper.ts` |
| Settings | `<type>.settings.ts` | `csw.settings.ts` |
| Utility | `<name>.utils.ts` | `http-request.utils.ts` |
| Queries | `<store>.queries.ts` | `postgres.queries.ts` |
| Controller | `PascalCaseCtrl.ts` | `HarvesterCtrl.ts` |
| Service (server) | `PascalCase.ts` | `ConfigService.ts` |
| Service (client) | `PascalCase.service.ts` | `HarvesterService.service.ts` |
| Model / type | `kebab-case.ts` | `index.document.ts` |
| Factory | `<name>.factory.ts` | `catalog.factory.ts` |

### Code Symbols

| Construct | Convention | Example |
|-----------|-----------|---------|
| Classes | PascalCase | `CkanImporter` |
| Interfaces / types | PascalCase | `ImporterSettings` |
| Methods / functions | camelCase | `deleteRecordsForDatasource()` |
| Private methods | camelCase (no prefix) | `buildDeleteBySourceTransaction()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

---

## File Layout (server)

```
server/app/
  controllers/    HTTP endpoints (@Controller)
  services/       Business logic singletons (@Service)
  importer/       Base classes + one subfolder per importer type
  catalog/        Base class + one subfolder per catalog type
  profiles/       One subfolder per profile (ingrid, diplanung, lvr)
  persistence/    DatabaseFactory, ElasticsearchFactory, query files
  model/          Interfaces and types (no behaviour)
  utils/          Stateless helpers
  middlewares/    Express middleware
  sockets/        WebSocket services
```

---

## Import Style

- Relative imports within the same directory; `@shared/*` for cross-package.
- Always include `.js` extension (ESM/NodeNext requirement).
- Prefer named exports; default exports only when required by a framework.

```typescript
import { CkanMapper } from './ckan.mapper.js'
import type { Datasource } from '@shared/datasource.js'
import log4js from 'log4js'
```

---

## Error Handling

- `try/catch` everywhere; never swallow silently.
- Accumulate non-fatal errors in `Summary` as `TypedError { type: string, error: string }`.
- Log at ERROR before pushing to summary.
- `Importer.exec()` rolls back the database transaction on any unhandled error.
- No custom exception classes — use standard `Error`.

---

## Logging

Library: log4js 6.9.1 · one logger per file:
```typescript
const log = log4js.getLogger(import.meta.filename)
```

| Level | When |
|-------|------|
| `trace` | Internal state, rarely enabled |
| `debug` | Development diagnostics |
| `info` | Normal events (counts, completion) |
| `warn` | Degraded state, recoverable issues |
| `error` | Operation failed |
| `fatal` | Process-level failure |

Credentials must never appear in logs at any level.

---

## XML / External Format Conventions

- Library: `@xmldom/xmldom` DOM API — `createElementNS`, `appendChild`, `textContent`.
- Namespace URIs: always use constants from `server/app/importer/namespaces.ts`; never hardcode inline.
- Extract XML into dedicated private builder methods; never inline in orchestrating methods.

```typescript
// correct
const el = doc.createElementNS(namespaces.DCT, 'title')
el.textContent = this.getTitle()
parent.appendChild(el)

// wrong
const xml = `<dct:title>${this.getTitle()}</dct:title>`
```

---

## Diagrams

Use **Mermaid** for all diagrams (`flowchart`, `sequenceDiagram`, `classDiagram`, `erDiagram`). No ASCII art or indented code blocks for structure — see AP-003.

---

## Async Patterns

- `async/await` is the default.
- `Observable<ImportLogMessage>` (RxJS) streams harvest progress to WebSocket clients — do not flatten to a Promise.
- Bucket streaming: `for await (const bucket of this.database.streamBuckets(...))`.
- No callbacks; no `.then()` chains where async/await is possible.

---

## Testing

| | |
|-|-|
| Framework | Mocha 10 + chai + sinon |
| Test location | `server/test/**/*.spec.ts` |
| Run | `npm run test` (profile: `mcloud`) |
| Client | Karma/Jasmine |
| E2E | Cypress 13 (`client/cypress/e2e/**/*.spec.ts`) |

Stub collaborators with sinon. Do not mock the database for integration-level tests.

**Catalog tests** — stub both in `before()` before instantiating any `Catalog` subclass:
```typescript
sinon.stub(DatabaseFactory, 'getDatabaseUtils').returns({} as any);
sinon.stub(ProfileFactoryLoader, 'get').returns({} as any);
```

**HTTP calls** — stub `RequestDelegate.doRequest` (static). Never stub private methods like `postTransaction`; this is fragile.

**Log output** — `log4js.getLogger()` returns a new instance per call; sinon.spy wraps a different object than the module-level `const log`. Use an inline appender instead:
```typescript
const events: Array<{ level: string; message: string }> = [];
log4js.configure({
    appenders: {
        capture: {
            type: { configure: () => (event: any) => events.push({ level: event.level.levelStr, message: String(event.data[0]) }) },
        },
    },
    categories: { default: { appenders: ['capture'], level: 'all' } },
});
```
Clear `events` in `beforeEach` and assert on it after each call.

---

## Build Tooling

| Step | Tool |
|------|------|
| Production build | `tsc` → `build/` |
| Dev server | nodemon + SWC (`@swc-node/register`) |
| Asset copy | `copyfiles` (JSON, SQL, XML, RDF → `build/`) |
| Client | `ng build` / `ng build --configuration production` |
