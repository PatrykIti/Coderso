# TASK-101-08: Internal Docs KB Schema, Ingest, and DB Retrieval
# FileName: TASK-101-08_Internal_Docs_KB_Schema_Ingest_and_DB_Retrieval.md

**Priority:** High  
**Category:** Core/Assistant + Core/DB + Docs  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-02, TASK-101-03  
**Status:** To Do

---

## Overview

Rozszerzamy Doc Navigator o trwale, bazodanowe zaplecze wiedzy:
- dokumentacja zrodlowa ladowana z `_docs/_internal`,
- ingest markdown -> DB (docs + chunki + run logs),
- retriever pracujacy na DB (FTS/BM25-like),
- fallback do file index tylko gdy DB jest puste lub niedostepne.

Cel:
- kontrolowana, user-friendly dokumentacja "pod asystenta",
- stabilne i szybsze query przy rosnacej liczbie dokumentow,
- pelny audit procesu ingest.

---

## Knowledge Source Contract (`_docs/_internal`)

1. Jedyny wspierany root ingest to `_docs/_internal`.
2. Kazdy dokument ma prosty frontmatter:
   - `title`
   - `audience` (`editor`, `admin`, `developer`)
   - `productArea` (`widgets`, `pages`, `themes`, itd.)
   - `language` (`pl`, `en`)
   - `keywords` (lista)
3. Kazdy dokument musi miec sekcje:
   - `What Is It`
   - `When To Use`
   - `Step By Step`
   - `Examples`
   - `Common Mistakes`
4. Tresc ma byc "krok po kroku", bez skrotow myslowych i bez zargonu.
5. Dokumenty niespelniajace kontraktu sa oznaczane jako validation errors w ingest run.

---

## Target Data Model

### Table: `assistant_docs`
- `id` (pk)
- `sourcePath` (unique, np. `_docs/_internal/widgets/hero.md`)
- `slug`
- `title`
- `audience`
- `productArea`
- `language`
- `keywordsJson` (json text)
- `checksum`
- `sourceUpdatedAt`
- `createdAt`, `updatedAt`

### Table: `assistant_doc_chunks`
- `id` (pk)
- `docId` (fk -> `assistant_docs.id`)
- `chunkIndex`
- `headingPath`
- `heading`
- `lineStart`, `lineEnd`
- `content`
- `normalizedText`
- `tokenCount`
- indexy pod search/ranking

### Table: `assistant_doc_ingest_runs`
- `id` (pk)
- `triggeredByUserId` (nullable)
- `sourceRoot`
- `startedAt`, `finishedAt`
- `status` (`success` | `failed` | `partial`)
- `filesScanned`, `docsUpserted`, `chunksUpserted`, `errorsCount`
- `errorsJson`

---

## Pseudo-Implementation

```ts
// core/services/assistant/docsIngestService.ts
export const ingestInternalDocsToDb = async (input: {
  sourceRoot?: string; // default "_docs/_internal"
  triggeredByUserId?: string | null;
}) => {
  const run = await createIngestRun({ status: "running" });
  const files = await scanMarkdownFiles(input.sourceRoot ?? "_docs/_internal");

  for (const file of files) {
    const parsed = parseMarkdownWithFrontmatter(file.content);
    validateInternalDocContract(parsed);
    const docRow = await upsertAssistantDoc(parsed.meta, file.path, checksum(file.content));
    const chunks = chunkByHeadings(parsed.body);
    await replaceChunksForDoc(docRow.id, chunks);
  }

  await finalizeIngestRun(run.id, { status: "success" });
};
```

```ts
// core/services/assistant/docsDbRetriever.ts
export const searchAssistantDocsDb = async (query: string, topK = 5) => {
  const normalized = normalizeDocsText(query);
  const rows = await queryChunksByFtsOrTokenScore(normalized, topK);
  return rows.map(toDocsSearchHit);
};
```

```ts
// core/services/assistant/assistantService.ts
// retrieval order: DB first, then filesystem fallback
const hits = await searchAssistantDocsDb(message, 5);
if (hits.length === 0) {
  const fsIndex = await ensureDocsIndex();
  return searchDocsIndex(fsIndex, message, { topK: 5 });
}
return hits;
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/migrations/0033_assistant_docs_kb.sql` | new | tables + indexes for docs KB |
| `core/db/migrations/meta/0033_snapshot.json` | new | schema snapshot |
| `core/db/migrations/meta/_journal.json` | update | register migration |
| `core/db/schema.ts` | update | drizzle models for assistant docs tables |
| `core/services/assistant/docsIngestService.ts` | new | scanner/parser/validator/upsert pipeline |
| `core/services/assistant/docsDbRetriever.ts` | new | DB ranking + snippets |
| `core/services/assistant/assistantService.ts` | update | DB-first retrieval + fallback |
| `core/server/routes/assistantRoutes.ts` | update | reindex endpoint triggers DB ingest |
| `core/services/settings/settingsService.ts` | update | `assistant.docs.sourceRoot`, `assistant.docs.backend` |
| `tests/unit/assistant/docsIngestService.test.ts` | new | contract validation + upsert behavior |
| `tests/unit/assistant/docsDbRetriever.test.ts` | new | ranking and snippet relevance |
| `tests/integration/routes/assistant-reindex-db.test.ts` | new | endpoint -> ingest run -> status |

---

## Functional Requirements

1. Ingest czyta tylko `_docs/_internal` (configurable override tylko dla testow/dev).
2. Reindex zapisuje run log z licznikami i bledami.
3. DB retriever zwraca min. 3 zrodla (jesli dostepne), zgodnie z dotychczasowym kontraktem odpowiedzi.
4. Brak spelnionego kontraktu dokumentu = wpis do run errors, bez crasha calego run.
5. Asystent zawsze ma fallback do filesystem index, jesli DB backend jest niedostepny.

---

## Testing Requirements

- Unit:
  - markdown+frontmatter parser and contract validator
  - chunk replacement idempotency
  - DB retriever ranking exact match > distant match
  - fallback FS path when DB empty
- Integration:
  - `POST /assistant/reindex` creates ingest run and upserts chunks
  - failed doc validation appears in run error payload
- Quality gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted assistant tests + migration smoke tests

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (DB KB ingest and retrieval flow)
- `_docs/CMS_API.md` (reindex/status payload extensions for ingest runs)
- `_docs/SETTINGS.md` (assistant docs backend/source root keys)
- `_docs/_internal/README.md` (authoring standard)
- `_docs/_internal/INTERNAL_DOC_TEMPLATE.md` (copy-ready template)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-internal-docs-db-kb.md`
