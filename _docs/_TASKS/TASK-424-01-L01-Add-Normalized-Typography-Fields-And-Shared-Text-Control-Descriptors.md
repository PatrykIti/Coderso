# TASK-424-01-L01: Add Normalized Typography Fields And Shared Text Control Descriptors
# FileName: TASK-424-01-L01-Add-Normalized-Typography-Fields-And-Shared-Text-Control-Descriptors.md

**Parent Subtask:** TASK-424-01
**Priority:** High
**Category:** Pages / Admin UI / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-424-01
**Status:** ⏳ To Do

---

## Overview

Extend `pageDocumentV2` and `pageEditorControlRegistry` with schema-owned
typography fields and registry descriptors that can be consumed by both the
floating inspector and the inline-edit text path.

---

## Implementation Pseudocode

```ts
export type PageTypographyStyleV2 = {
  fontFamily?: TypographyToken;
  fontSize?: TypographyScaleToken;
  fontWeight?: TypographyWeightToken;
  lineHeight?: TypographyLineHeightToken;
  letterSpacing?: TypographyTrackingToken;
};

export const pageTypographyControls = defineControls([
  control("fontFamily", "style", "select"),
  control("fontSize", "style", "segmented"),
  control("fontWeight", "style", "segmented"),
]);
```

Expected data flow:

- Typography defaults and clamps live in the Pages owner.
- Registry descriptors reuse owner-owned option arrays/tokens.
- Shared text targets can opt into one typography-control cluster.

Error handling:

- Unknown typography values are rejected or normalized to defaults.
- UI cannot emit raw free-form style strings.

Regression-test shape:

- Vitest covers type ownership, default normalization, and registry-path
  validity.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only tokenized/schema-owned values may persist.

---

## Testing Requirements

- New Vitest coverage for `pageDocumentV2` and `pageEditorControlRegistry`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

