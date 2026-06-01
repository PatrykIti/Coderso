# TASK-352-01: Export Target and Include Options Contract
# FileName: TASK-352-01_Export_Target_and_Include_Options_Contract.md

**Priority:** High
**Category:** Import Export + API + Service + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-352
**Status:** To Do

---

## Overview

Make export cards truthful. The UI presents Content Types, Pages, and Media
cards with option checkboxes, but every Download returns the same full
configuration bundle.
Current `exportConfig()` does not include content type, page, or media payloads;
it exports settings, menus, theme profiles, admin themes, and redirects.

## Sub-Tasks

- Define an `ExportTarget` enum and per-target include option enums that match
  real service capabilities.
- Decide explicitly whether to implement real Content Types/Pages/Media
  exporters or replace/rename the visible cards to the current configuration
  bundle modules.
- Convert export card checkboxes to controlled state keyed by card ID.
- Send target/include options through the client to the server.
- Add strict export request validation.
- Filter the generated bundle according to target/include selections, or remove
  unsupported cards/options.
- Ensure export filename reflects target and selected format.

## Files To Change

| File | Required change |
|---|---|
| `core/services/tools/importExportTypes.ts` | Add export target/options types if not already present. |
| `core/services/tools/importExportService.ts` | Add `exportConfig(input)` for supported targets, and add real Content Types/Pages/Media exporters before exposing those cards. |
| `core/services/content/typeService.ts`, `core/services/pages/pageService.ts`, `core/services/media/*` | Touch only if Content Types/Pages/Media export targets are implemented. |
| `core/server/validation/importExportSchemas.ts` | Add strict export query/body schema with target/include enums. |
| `core/server/routes/importExportRoutes.ts` | Parse and validate export request. |
| `core/admin/services/importExportClient.ts` | Serialize target/include options. |
| `core/admin/ui/import-export/ExportCards.tsx` | Controlled checkbox state and per-card export payload. |
| `core/admin/ui/import-export/ImportExportPage.tsx` | Use target/include in `handleExport`. |
| `tests/unit/tools/importExport.test.ts` | Cover filtered export shapes. |
| `tests/integration/routes/importExport.test.ts` | Cover export validation and response shape. |
| `tests/vitest/ui/import-export.test.tsx` | Cover checkbox toggles and outgoing payload. |

## Implementation Pseudocode

```ts
type ExportTarget =
  | "full"
  | "settings"
  | "menus"
  | "themes"
  | "redirects"
  | "content-types"
  | "pages"
  | "media";
type ExportIncludeOption =
  | "field-definitions"
  | "validation-rules"
  | "page-hierarchy"
  | "seo-metadata"
  | "asset-references"
  | "alt-text";

export async function exportConfig(input: ExportRequest = { target: "full" }) {
  assertExportTargetSupported(input.target);
  const full = await buildCurrentConfigBundle();
  if (input.target === "full") return full;
  if (input.target === "content-types" || input.target === "pages" || input.target === "media") {
    return buildResourceExportBundle(input); // only after real exporters exist
  }
  return filterBundleForTarget(full, input);
}

function resolveVisibleExportCards(capabilities) {
  return capabilities.resourceExports
    ? ["content-types", "pages", "media"]
    : ["settings", "menus", "themes", "redirects"];
}

function handleDownload(cardId) {
  onExport({ target: cardId, include: selectedOptions[cardId] });
}
```

Data flow:

- Visible cards are derived from service-supported export capabilities.
- Card state -> `ImportExportPage.handleExport(request)` ->
  `importExportClient.exportConfig(request)` -> route validation -> service
  bundle filtering -> browser download.

Error handling:

- Prevent an export request with no selected include options unless the target
  defines a valid empty export.
- Unknown target/options must be rejected before service execution.
- If media binaries/ZIP are unsupported, do not advertise them as selectable
  options.
- If Content Types/Pages/Media exporters are not implemented, do not render
  those cards as downloadable targets.

Regression-test shape:

- Toggle off Pages SEO and assert export request excludes `seo-metadata`.
- Export Content Types only and assert Pages/Media sections are absent or empty
  per documented bundle contract.
- If the UI is reduced to current config modules, assert Content Types/Pages/Media
  cards are absent and supported module cards export matching sections.
- Unknown include option returns validation error.

## Security Contract

- Endpoint visibility: internal admin export route.
- Auth model: session cookie.
- RBAC: `settings:read`.
- CSRF: not required for GET; required if converted to POST.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: strict target/include enums and bounded arrays.
- Anti-abuse: no public write.
- Secret handling: export filtering must preserve existing secret redaction and
  never include plaintext provider/storage credentials.

## Testing Requirements

- `bun test tests/unit/tools/importExport.test.ts`
- `bun test tests/integration/routes/importExport.test.ts`
- `bun run test:vitest -- tests/vitest/admin/importExportClient.test.ts tests/vitest/ui/import-export.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Import / Export report with export option resolution.
- Update `_docs/CMS_API.md` for export target/include query or body shape.
- Update user docs if export targets become documented.

## Acceptance Criteria

- Export checkboxes are not visual-only.
- Download payload and bundle shape reflect selected target/options.
- Unsupported export options are not presented as available.
- The UI and service agree on whether Content Types/Pages/Media export exists.
