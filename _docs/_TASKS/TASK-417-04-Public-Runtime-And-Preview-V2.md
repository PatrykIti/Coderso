# TASK-417-04: Public Runtime And Preview V2
# FileName: TASK-417-04-Public-Runtime-And-Preview-V2.md

**Parent Task:** TASK-417
**Priority:** High
**Category:** Pages / Runtime / Preview
**Estimated Effort:** Large
**Dependencies:** TASK-417-02, TASK-417-03
**Status:** ✅ Done

---

## Overview

Add a Pages v2 section and atomic-block public renderer, while preserving the
existing widget renderer for non-Page surfaces. Published public pages render
`publishedData`; preview renders `currentData`; both paths resolve responsive
cascade consistently.

---

## Security Contract

- **Endpoint visibility:** public page rendering remains public read-only;
  `/preview` remains public read-only with a valid token.
- **Auth model:** no auth for published public pages; preview token required for
  preview.
- **RBAC:** not applicable at render time.
- **CSRF:** not applicable to public read-only render paths.
- **Rate-limit bucket:** existing public/preview bucket behavior.
- **Validation:** runtime normalizes source data through the v2 owner and resets
  legacy Page data to an empty v2 document rather than invoking the v1 renderer.
- **Anti-abuse controls:** no public write endpoint; preview TTL, hashed token
  storage, and sanitized probe metadata remain intact.

---

## Sub-Tasks

- [x] TASK-417-04-L01: Pages v2 renderer and template props.
- [x] TASK-417-04-L02: Public site, preview, and cache parity.
- [x] TASK-417-04-L03: Admin preview token issuer and SSRF guards.
- [x] TASK-417-04-L04: Non-Page widget boundary guards.

---

## Testing Requirements

- Bun public runtime tests for v2 sections, atomic blocks, responsive output,
  preview/current data, published data, cacheability, homepage and 404.
- Non-Page regression tests for detail pages, custom screens, and widget
  templates that still use `WidgetBlock[]`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md`
