# TASK-417-04-L04: Non Page Widget Boundary Guards
# FileName: TASK-417-04-L04-Non-Page-Widget-Boundary-Guards.md

**Parent Subtask:** TASK-417-04
**Priority:** High
**Category:** Widgets / Runtime Boundaries
**Estimated Effort:** Medium
**Dependencies:** TASK-417-04-L01, TASK-417-04-L02
**Status:** ⏳ To Do

---

## Overview

Protect non-Page surfaces that still legitimately use `WidgetBlock[]`: detail
pages, custom screens, widget templates, and widget template previews. The Pages
v2 rewrite must not silently mutate shared widget contracts.

---

## Security Contract

- **Endpoint visibility:** internal admin detail-page routes
  `/admin/api/detail-pages*`, internal admin custom-screen routes
  `/admin/api/custom-screens*`, internal admin widget-template routes
  `/admin/api/widget-templates*`, and public read/preview consumers that render
  published detail pages or widget-template previews by token.
- **Auth model:** admin session for internal admin reads/writes and preview
  token issuance; anonymous access only for published public reads or valid
  preview-token consumption.
- **RBAC:** existing content/widget permissions for admin route families:
  read permission for admin reads/preview creation, write permission for
  create/update/delete/restore, and publish permission where the family exposes
  lifecycle actions.
- **CSRF:** all internal admin write routes in these families remain behind
  shared admin CSRF protections.
- **Rate-limit bucket:** existing admin bucket for internal admin operations;
  existing public/preview bucket for public reads and preview-token consumption.
- **Validation:** non-Page widget payload schemas remain widget-owned and do not
  accept Pages v2 sections unless a separate future task changes them.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [ ] Split shared runtime helpers if needed so Page templates use v2 and
  detail/widget surfaces keep widget props.
- [ ] Name and guard `core/site/renderPublicPage.tsx` shared helpers and the
  `renderWidgetTemplatePreviewHtml` caller in `core/server/publicSite.tsx`.
- [ ] Add regression tests for detail pages, custom screens, widget templates,
  and template preview.
- [ ] Verify widget module pack and widget registry behavior are unchanged.

---

## Implementation Pseudocode

```ts
export async function renderPublicPageRuntimeHtmlV2(options: PageV2Options) {
  return renderDocumentWithPageShell(<DefaultRuntimePageShellV2 {...options} />);
}

export async function renderWidgetDocumentRuntimeHtml(options: WidgetDocumentOptions) {
  return renderDocumentWithWidgetShell(<DefaultWidgetRuntimeShell blocks={options.blocks} />);
}
```

Expected data flow:

- Pages call the v2 renderer.
- Detail pages, widget templates, and custom-screen previews keep widget
  renderer paths.
- Shared document shell/SEO/CSS helpers are reused where safe.
- `renderPublicPageRuntimeHtmlV2` must not replace the widget-template preview
  renderer unless that path is explicitly adapted and covered.

Error handling:

- A widget surface should not fail because a Page v2 section type is unknown.
- A Page v2 renderer should not accept widget-only block payloads.

Regression-test shape:

- Existing detail-page runtime tests remain green.
- Existing widget-template preview tests remain green.
- Add focused tests proving Page v2 changes do not alter widget-template
  `blocksCount` and detail-page block rendering.

---

## Testing Requirements

- Targeted Bun/Vitest non-Page widget boundary tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/WIDGETS.md` only if widget-surface docs need boundary wording.
