# TASK-465: Page Route Validation Memory Hardening
# FileName: TASK-465_Page_Route_Validation_Memory_Hardening.md

**Priority:** High
**Category:** Pages / Page Templates / API / Performance
**Estimated Effort:** Small
**Dependencies:** TASK-417, TASK-420
**Status:** ✅ Done
**Started:** 2026-06-14
**Completed:** 2026-06-14

---

## Overview

Fix a production memory spike on small Render instances when creating an empty
Page Template or Page. The route-level AJV schemas embedded the full recursive
Page v2 section/block JSON schema; compiling that schema for an empty
`POST /page-templates` request locally peaked at about 810 MB RSS.

The write contract remains strict: route schemas validate the API envelope and
reject legacy root `blocks[]`, while the Page domain normalizers keep owning
the full recursive Page v2 validation, unknown-field rejection, depth/slot
clamps, and persistence shape before any DB write.

---

## Sub-Tasks

- [x] Replace recursive route schema embedding with lightweight Page v2
      envelope schemas for Pages and Page Templates.
- [x] Keep service/domain normalizer tests proving deep invalid documents still
      reject before persistence.
- [x] Measure the empty Page Template validation RSS before and after the fix.

---

## Implementation Pseudocode

```ts
const pageDocumentRouteSchema = {
  type: "object",
  required: ["schemaVersion", "sections"],
  additionalProperties: true,
  properties: {
    schemaVersion: { const: 2 },
    sections: { type: "array" },
    blocks: false,
  },
};

function handleWrite(ctx) {
  validate(routeEnvelopeSchema, ctx.body);
  const normalized = normalizePageDocumentV2ForWrite(ctx.body.data);
  return service.persist(normalized);
}
```

Data flow:

- Routes reject malformed top-level API payloads, missing Page v2 envelopes, and
  legacy root `blocks[]` without compiling the recursive block union in AJV.
- `pageService` and `pageTemplateLibraryService` continue to call
  `normalizePageDocumentV2ForWrite` / `normalizePageTemplateDocumentForWrite`
  before persistence.
- Deep unknown fields, invalid tokens, excessive slot children, excessive
  depth, and legacy/mixed contracts still fail closed through domain errors
  mapped at the route boundary.

Error handling:

- Page route domain errors remain machine-readable
  `page_document_invalid` / `page_document_unknown_field`.
- Page Template route domain errors remain mapped through
  `mapPageTemplateError`.

Regression-test shape:

- Bun route/schema suites assert route payload shape and domain-owned deep
  rejection.
- Vitest Page Template schema suite asserts the route schema no longer embeds
  `pageBlockDepth` recursion and owner normalization still rejects deep unknown
  fields.
- RSS smoke confirms the empty Page Template route validation no longer spikes
  above small-instance limits.

---

## Security Contract

- **Endpoint visibility:** unchanged internal admin endpoints.
- **Auth model:** unchanged admin session.
- **RBAC:** unchanged `content:*` permissions.
- **CSRF:** unchanged for admin writes.
- **Rate-limit bucket:** unchanged admin read/write buckets.
- **Validation:** top-level route schemas stay strict for API envelopes; full
  Page v2 document validation remains strict in the domain owner before
  persistence.
- **Anti-abuse controls:** no public writes, no new browser-stored secrets, no
  legacy widget-block persistence, and no best-effort rendering of invalid Page
  Template documents.

---

## Testing Requirements

- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/pages/validation.test.ts tests/unit/pages/pageTemplateLibraryService.test.ts tests/integration/routes/pageTemplates.test.ts tests/integration/routes/pages.test.ts`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun run test:vitest -- tests/vitest/pages/page-template-library-schema.test.ts`
- RSS smoke for empty `pageTemplateCreateSchema` validation.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/`

---

## Completion Notes

Completed 2026-06-14. Local RSS smoke for validating an empty Page Template
create payload dropped from about 810 MB to about 76 MB; the analogous empty
Page create validation stayed around 68 MB. Targeted Bun/Vitest suites passed.
