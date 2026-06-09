# TASK-417-02-L02: Normalization Responsive Cascade And Legacy Reset
# FileName: TASK-417-02-L02-Normalization-Responsive-Cascade-And-Legacy-Reset.md

**Parent Subtask:** TASK-417-02
**Priority:** High
**Category:** Pages / Domain
**Estimated Effort:** Large
**Dependencies:** TASK-417-02-L01
**Status:** ⏳ To Do

---

## Overview

Implement strict v2 write normalization, stored-read legacy reset, responsive
cascade resolution, and publication sanitization. Fresh admin writes must reject
non-v2 payloads; only clearly legacy/versionless persisted Page data may reset
to an empty v2 document.

---

## Security Contract

- **Endpoint visibility:** no route registration in this leaf.
- **Auth model:** not applicable at this layer.
- **RBAC:** not applicable at this layer.
- **CSRF:** not applicable at this layer.
- **Rate-limit bucket:** not applicable at this layer.
- **Validation:** reject unknown fields and clamp limits in the Pages v2 owner.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [ ] Add `normalizePageDocumentV2`.
- [ ] Add `normalizePageDocumentV2ForWrite` that throws on non-v2, v1, or
  malformed payloads.
- [ ] Add `normalizeStoredPageDocumentV2ForRead` that resets only clearly
  legacy/versionless stored rows.
- [ ] Add `resolvePageDocumentForBreakpoint`.
- [ ] Add `clearResponsiveOverride`.
- [ ] Add `toPublishedPageDocumentV2` to remove editor-only metadata.
- [ ] Add out-of-band legacy/versionless reset diagnostics.

---

## Implementation Pseudocode

```ts
export function normalizePageDocumentV2(input: unknown): PageDocumentV2 {
  if (!isRecord(input) || input.schemaVersion !== 2) throw pageDocumentInvalid("schema_version");
  rejectUnknownKeys(input, ["schemaVersion", "seo", "settings", "sections"]);
  return {
    schemaVersion: 2,
    seo: normalizeSeo(input.seo),
    settings: normalizePageSettingsV2(input.settings),
    sections: normalizeSections(input.sections),
  };
}

export function normalizePageDocumentV2ForWrite(input: unknown): PageDocumentV2 {
  return normalizePageDocumentV2(input);
}

export function normalizeStoredPageDocumentV2ForRead(input: unknown): {
  document: PageDocumentV2;
  diagnostics: PageDocumentReadDiagnostics;
} {
  if (isLegacyOrVersionlessPageDocument(input)) {
    return {
      document: createDefaultPageDocumentV2(),
      diagnostics: { legacyReset: true },
    };
  }
  return { document: normalizePageDocumentV2(input), diagnostics: {} };
}

export function resolvePageSectionForBreakpoint(
  section: PageSectionV2,
  breakpoint: PageBreakpoint
): PageSectionV2 {
  if (breakpoint === "desktop") return section;
  const override = section.responsive?.[breakpoint] ?? {};
  return deepMergeSection(section, override);
}

export function clearResponsiveOverride(
  section: PageSectionV2,
  breakpoint: Exclude<PageBreakpoint, "desktop">,
  path: string[]
): PageSectionV2 {
  return removeDeepKey(section, ["responsive", breakpoint, ...path]);
}
```

Expected data flow:

- Fresh admin writes call `normalizePageDocumentV2ForWrite` and reject legacy
  `blocks[]`.
- Stored row reads call `normalizeStoredPageDocumentV2ForRead` and may return
  out-of-band diagnostics.
- Runtime calls the stored-read adapter before render.
- Editor uses `resolvePageSectionForBreakpoint` for canvas preview and writes
  overrides only under `responsive.tablet` or `responsive.mobile`.

Error handling:

- Versionless/v1 stored Pages return empty v2 data with an out-of-band
  diagnostic code.
- Fresh versionless/v1 Page writes throw `page_document_invalid`.
- Invalid v2 data throws `page_document_invalid`.
- Responsive override fields outside the allowed section/block paths throw
  `page_document_unknown_field`.
- Diagnostics are never persisted, published, serialized in Page documents, or
  rendered into public HTML.

Regression-test shape:

- Vitest tests for strict write rejection, stored-read legacy reset,
  out-of-band diagnostics, deep merge, block-level override merge/delete,
  editor metadata stripping, unknown-field rejection, clamped array limits, and
  stable output.

---

## Testing Requirements

- Targeted Vitest suite for normalization and cascade helpers.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
