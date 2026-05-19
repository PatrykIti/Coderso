# TASK-280-03: Product Gallery Admin Preview Runtime Status and Loading

# FileName: TASK-280-03_Product_Gallery_Admin_Preview_Runtime_Status_and_Loading.md

**Priority:** High
**Category:** Widgets + Commerce + Admin UI + Runtime Preview
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-280-01, TASK-280-02, TASK-280
**Status:** Done (2026-05-19)

---

## Overview

Repair Product Gallery admin preview parity so editors can see resolved products
and runtime status without publishing and checking the public frontend.

This leaf covers `NEW-01`, `UX-06`, and `BF-09` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

## Scope Boundary

In scope:

- Product Gallery-specific admin preview hydration using existing commerce
  runtime owners;
- readable resolver status, last resolved timestamp, total count, and error
  state in the editor;
- bounded refresh behavior for Product Gallery preview data;
- loading/skeleton state for admin preview and any client-side refresh boundary;
- tests proving admin preview no longer stays permanently empty when products
  are available.

Out of scope:

- generic preview architecture work beyond extending the already-landed
  preview-state seam to Product Gallery;
- public write endpoints or checkout/cart mutations;
- provider credentials in browser code;
- replacing `publicSite.tsx` runtime hydration for published pages.

## Source Findings

- Admin canvas always showed empty state and
  `data-product-gallery-count="0"` while frontend rendered a published product.
- Advanced mode exposes raw `resolvedAt` and error flag but gives no practical
  resolver status or refresh affordance.
- The report calls the missing admin preview resolver critical because editors
  cannot validate real gallery cards before publishing.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Show Product Gallery resolver status, last resolved timestamp, count, refresh affordance, and loading/error copy. |
| `core/widgets/core/productGallery.tsx` | Add any needed normalized preview status fields only if they belong in persisted widget data; prefer transient admin preview state when possible. |
| `core/services/commerce/commerceWidgetRuntime.ts` | Reuse Product Gallery runtime hydration for preview mode; keep provider fetch backend-owned. |
| `core/admin/ui/pages/PageEditor.tsx` | Use the existing page preview/save boundary if Product Gallery preview hydration must refresh page-builder canvas data. |
| `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx` | Keep widget-template preview behavior aligned if Product Gallery templates need the same runtime-preview hydration path. |
| `core/admin/services/productGalleryPreviewClient.ts` | Add a Product Gallery preview client that posts widget data to the repo-native widget preview route. |
| `core/server/routes/productGalleryPreviewRoutes.ts` | Add the internal Product Gallery preview route that validates widget data and delegates to backend-owned runtime hydration. |
| `core/server/routes/widgetRoutes.ts` | Register the Product Gallery preview route alongside the existing widget preview endpoints. |
| `tests/vitest/widgets/productGallery.test.tsx` | Cover runtime warning/loading/status markers if render output changes. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover resolver status, refresh loading, error, and count copy in the editor. |
| `tests/vitest/ui/product-gallery-admin-preview.test.tsx` | Cover async preview hydration, stale-response handling, and canvas patching through `WidgetPreviewState`. |
| `tests/vitest/ui/page-editor.test.tsx` | Update only if preview-state gating changes need a focused shell assertion beyond the dedicated Product Gallery admin-preview suite. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update only if widget-template preview gating needs a focused shell assertion beyond the dedicated Product Gallery admin-preview suite. |
| `tests/vitest/admin/productGalleryPreviewClient.test.ts` | Cover Product Gallery preview request shape and payload forwarding. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Cover preview hydration behavior and error mapping. |
| `tests/integration/routes/productGalleryPreview.test.ts` | Cover preview-route validation, permissioning, and backend hydration mapping. |
| `tests/integration/routes/widgets.test.ts` | Cover widget-route registration for the new Product Gallery preview endpoint. |
| `_docs/_WIDGETS/PRODUCT_GALLERY.md` | Document admin preview behavior and resolver status. |
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | Update admin preview findings with textual proof. |

## Implementation Pseudocode

Preview service shape:

```ts
type ProductGalleryPreviewState =
  | { status: "idle"; resolved?: ProductGalleryData["resolved"] }
  | { status: "loading"; resolved?: ProductGalleryData["resolved"] }
  | { status: "ready"; resolved: ProductGalleryData["resolved"] }
  | { status: "error"; error: string; resolved?: ProductGalleryData["resolved"] };

async function previewProductGallery(data: ProductGalleryData) {
  return apiRequest<ProductGalleryPreviewResponse>(
    "/widgets/product-gallery/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    }
  ); // apiRequest prefixes this to /admin/api/widgets/product-gallery/preview
}
```

Editor flow:

- The editor initializes from persisted `resolved` data when present.
- Refresh triggers the Product Gallery widget preview route, which delegates to
  `hydrateProductGalleryRuntimeData(data, { preview: true })` on the server.
- Loading state never overwrites dirty editor data.
- Successful preview data is displayed in canvas/editor state but is not
  persisted unless the existing page save flow intentionally saves normalized
  widget data.
- Errors map to stable codes such as `commerce_runtime_error` or
  `commerce_query_invalid`.
- Page-builder canvas rendering continues through `BlockList` and
  `WidgetRenderer`; Product Gallery preview data is supplied as normalized
  block data rather than by bypassing the widget registry.
- If Product Gallery preview data is threaded through `PageEditor`, `BlockList`,
  or `WidgetTemplateEditorPage`, add the matching admin canvas/template UI test
  instead of relying only on the Product Gallery editor unit.
- Keep preview data inside `WidgetPreviewState.dataPatch` so `BlockList` and the
  existing widget preview patching contract stay generic.

Error handling:

- Network or resolver failures show a non-destructive warning and keep the last
  good preview payload.
- Stale refresh responses must not overwrite newer editor changes.
- Empty product result is distinct from resolver failure.
- Preview mode may show draft products when requested by the source status
  filter; public runtime remains published-only by default.

Regression-test shape:

```ts
test("ProductGallery editor surfaces resolved preview status", async () => {
  mockPreviewResolver({ items: [resolvedProduct], total: 1 });
  const view = mount(<ProductGalleryAdvancedEditor value={productGalleryDefaults} />);
  clickByText(view.container, "Refresh products");
  await waitForText(view.container, "Resolved items: 1");
  expect(view.container.textContent).toContain("Last resolved");
});
```

## Security Contract

This leaf uses a Product Gallery-specific preview route so preview behavior can
stay server-owned and match runtime hydration.

- Endpoint visibility: internal admin only, under `/admin/api/widgets/*`.
- Auth model: authenticated admin session.
- RBAC: `widgets:read`, matching the shared widget-editor capability used by
  both page and widget-template builders.
- CSRF: POST preview route uses existing admin CSRF enforcement.
- Rate-limit bucket: existing admin preview/read bucket.
- Reject-unknown validation: request body must validate Product Gallery data
  through `productGallerySchema` / `normalizeProductGalleryData`.
- Anti-abuse: no provider secrets or arbitrary query operators in browser
  payloads; preview routes only accept the bounded Product Gallery widget
  contract and delegate to server-owned query allowlists.
- Secret handling: no private provider keys, database credentials, or privileged
  commerce config in response bodies, logs, diagnostics, or browser cache.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-admin-preview.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor.test.tsx` only if
  preview-state gating changes need a focused shell assertion beyond the
  dedicated Product Gallery admin-preview suite.
- `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx`
  only if widget-template preview gating needs a focused shell assertion beyond
  the dedicated Product Gallery admin-preview suite.
- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/productGalleryPreviewClient.test.ts`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/integration/routes/productGalleryPreview.test.ts`
- `bun test tests/integration/routes/widgets.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/_TASKS/TASK-280-03_Product_Gallery_Admin_Preview_Runtime_Status_and_Loading.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Admin preview can render resolved Product Gallery cards when commerce products
  are available.
- Editors can distinguish loading, empty, ready, stale, and error states.
- Refresh does not overwrite unsaved widget edits or leak provider secrets.
- Public runtime hydration continues to use the existing server path.
- Focused tests prove preview parity and error handling.
