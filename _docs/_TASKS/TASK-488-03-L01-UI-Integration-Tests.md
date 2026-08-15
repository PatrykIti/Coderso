# TASK-488-03-L01: UI-integration round-trip tests
# FileName: TASK-488-03-L01-UI-Integration-Tests.md

**Parent Subtask:** TASK-488-03
**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-488-01, TASK-488-02
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

> **Single-writer (audit M3):** this leaf OWNS the creation of
> `tests/vitest/ui/commerce-page.test.tsx` extensions,
> `tests/vitest/ui/commerce-variant-editor.test.tsx`, and
> `tests/vitest/ui/commerce-collections-manager.test.tsx`. Implementation
> leaves (488-01-L02, 488-02-L01/L02) DESCRIBE assertion shapes only and must
> NOT create those files.

- **Goal:** Add the cross-cutting Vitest UI-integration coverage that proves the
  full author round-trip: (a) editing variants in the product editor produces a
  schema-valid `CommerceProductInput.variants` payload via the existing save
  path, and (b) the collections manager creates/edits/deletes through the
  existing client functions and is reachable from the navigation entry points.
  This consolidates the per-leaf tests into one suite-green gate.
- **Owning module(s) to create-or-extend:** `tests/vitest/ui-integration/`
  (`commerce-variant-editor.test.tsx`, `commerce-collections-manager.test.tsx`),
  and extend `tests/vitest/ui/commerce-page.test.tsx`.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/CMS_SPEC.md`.
- **Out-of-scope:** Production code (owned by TASK-488-01/02); Bun-lane tests
  (none apply — no route/runtime/DB/plugin/perf/security surface added).

### Verified test infrastructure

- Existing commerce render tests use `renderAdminUi(<Component/>, { path })`
  from `tests/utils/adminRouterRender.tsx` (SSR string assertions) and the
  `cacheKeys.commerceProductsList` / `cacheKeys.commerceCollectionsList`
  localStorage-seed pattern (`tests/vitest/ui/commerce-page.test.tsx`).
- Interaction-style tests in `tests/vitest/ui-integration/` opt into a real DOM
  via a `// @vitest-environment happy-dom` file docblock (the global Vitest env
  is `node`) and mount with `createRoot` from `react-dom/client` wrapped in
  `React.act` (with `IS_REACT_ACT_ENVIRONMENT = true`). They drive clicks/typing
  by dispatching native DOM events — `el.dispatchEvent(new MouseEvent("click",
  { bubbles: true }))` and a controlled-input value-setter + `new Event("input"
  /"change")` — then assert via `container.querySelector`. This repo has **no**
  `@testing-library/react`; follow that `createRoot`/`React.act`/`dispatchEvent`
  idiom (see `custom-screen-record-interactions.test.tsx`,
  `integrations.test.tsx`) for the add-variant / dialog-save flows.
- `commerceClient` write functions can be mocked at module level (Vitest
  `vi.mock`) to assert the outgoing payload without network I/O.

## Security Contract

- No endpoint or permission model changes. Tests assert the existing RBAC/CSRF
  contracts hold (writes go through the `commerce:write` + CSRF client wrappers)
  but introduce no routes, auth, or data surfaces of their own.

## Implementation Pseudocode

```tsx
// commerce-variant-editor.test.tsx
// @vitest-environment happy-dom   ← file docblock; the global Vitest env is "node"
//
// Shared harness (mirrors custom-screen-record-interactions.test.tsx / integrations.test.tsx):
//   (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
//   const create = vi.fn();                          // module-scoped; referenced by hoisted vi.mock
//   vi.mock("@/services/commerceClient", () => ({ ...actual, createCommerceProduct: create }));
//   const mount = (path) => { const c = document.createElement("div"); document.body.appendChild(c);
//     const root = createRoot(c); React.act(() => root.render(
//       <AdminRouterProvider initialPath={path}><CommerceEditorPage /></AdminRouterProvider>));
//     return { container: c, cleanup: () => { React.act(() => root.unmount()); c.remove(); } }; };
//   const flush = async () => { await React.act(async () => { for (let i=0;i<6;i++) await Promise.resolve(); }); };
//   const findButton = (host, label) => Array.from(host.querySelectorAll("button"))
//     .find((b) => b.textContent?.includes(label));
//   const setValue = async (input, value) => { await React.act(async () => {        // controlled <Input>
//     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
//     input.dispatchEvent(new Event("input", { bubbles: true }));
//     input.dispatchEvent(new Event("change", { bubbles: true })); await Promise.resolve(); }); };

test("adding and editing a variant yields a serialized payload on save", async () => {
  create.mockResolvedValue(savedProductFixture);
  const view = mount("/admin/advanced/commerce/new");
  try {
    await flush();
    React.act(() => findButton(view.container, "Add variant")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    await setValue(view.container.querySelector('input[placeholder="Variant title"]'), "Large");
    await React.act(async () => {
      findButton(view.container, "Save changes")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(create).toHaveBeenCalled();
    const payload = create.mock.calls[0][0];
    expect(payload.variants).toEqual([expect.objectContaining({ title: "Large", isDefault: false })]);
  } finally { view.cleanup(); }
});

test("blank-title variant is dropped by serializeDraftVariants on save", async () => { /* add variant, leave title empty, Save → payload.variants: [] */ });
test("toggling default on a second variant clears the first", async () => { /* add two, click 2nd Default checkbox → setDefaultVariantAt clears the 1st */ });

// commerce-collections-manager.test.tsx — same happy-dom / createRoot / React.act harness
test("create collection calls createCommerceCollection with trimmed input", async () => { /* open dialog, setValue name, click Save */ });
test("delete confirm calls deleteCommerceCollection", async () => { /* click delete, confirm */ });
test("slug-conflict (409) surfaces the mapped error message", async () => {
  create.mockRejectedValue(apiClientError("commerce_collection_slug_exists", "...already exists", 409));
  /* submit, flush → expect view.container.textContent to contain the mapped message */
});

// commerce-page.test.tsx (extend) — static SSR markup via renderAdminUi (no DOM/effects/clicks)
test("product editor renders the Variants card and Add variant control", () => {
  const html = renderAdminUi(<CommerceEditorPage/>, { path: "/admin/advanced/commerce/new" });
  expect(html).toContain("Variants");
  expect(html).toContain("Add variant");
});
test("commerce list header exposes Manage collections", () => { /* assert text in SSR html */ });
```

**Data flow:** mount the component under `AdminRouterProvider` with `createRoot`
inside `React.act` (interaction tests) or render static markup via `renderAdminUi`
(SSR string assertions) → drive interactions by dispatching native DOM events
(`new MouseEvent("click")`, controlled-input value-setter + `new Event("input")`)
inside `React.act` → assert either the mocked client call payloads or the rendered
DOM via `container.querySelector`. No real network/DB.

**Error handling:** assert the editor/manager `error` Alert renders the mapped
message on a rejected client call (`isApiClientError`).

**Regression-test shape:** see the leaf-level test shapes in TASK-488-01-L01/L02
and TASK-488-02-L01/L02; this leaf ensures they exist, run in one suite, and the
round-trip payload assertions are present.

## Testing Requirements

- **Lane:** Vitest only (`tests/vitest/*`, `tests/vitest/ui-integration/*`).
- The full Vitest suite plus `bun run lint` and `bun --cwd core lint:types` must be
  green; record results in the closeout summary and note any skipped test.
- No DB changes → no migration artifacts.
