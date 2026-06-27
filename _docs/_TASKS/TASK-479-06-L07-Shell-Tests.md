# TASK-479-06-L07: Shell & Primitive Tests
# FileName: TASK-479-06-L07-Shell-Tests.md

**Priority:** Medium
**Category:** Admin UI / Testing / Shell
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06-L01, L02, L03, L04, L05, L06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-06

---

## Overview

- **Goal:** Add Vitest coverage that locks in the migrated shell behavior:
  full shell render, **longest-prefix** nav active-state, de-SaaS sidebar
  invariants (site identity present; no workspace switcher / no Pro-trial),
  light/dark theme toggle, primitive variant markers (button `soft`, badge
  soft/success/warning/info, card `rounded-2xl`), the shared patterns, and the
  `CanvasEditor` show/hide toggle. Tests run in the Bun-free admin/UI Vitest lane
  per `_docs/TESTING_STRATEGY.md` — do **not** move runtime coverage here.
- **Owning module/service:** `tests/vitest/ui-integration/*` + `tests/vitest/admin/*`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`; the target components
  from L01–L06; existing `tests/vitest/admin` nav/adminPaths suites for style.
- **Out of scope:** Runtime (Bun) tests; visual pixel diffs (manual live check is
  in the subtask closure); editor behavior tests (the editors aren't rewired yet).

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests assert RBAC gating in the sidebar is
preserved but introduce no new endpoints.

## Implementation Pseudocode

New suites (jsdom + Testing Library, matching existing ui-integration setup).
Wrap shell renders in the providers the real shell needs
(`AdminBasePathContext`, `AdminAuthContext`) using existing test helpers.

### `tests/vitest/ui-integration/admin-shell/shell.test.tsx`

```ts
describe("AdminShell", () => {
  it("renders sidebar + topbar + main with centered content wrapper", () => {
    render(<AdminShell>{<div>page</div>}</AdminShell>, { wrapper: ShellProviders });
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(container.querySelector(".max-w-\\[1280px\\]")).toBeTruthy(); // centered column
    expect(screen.getByText("page")).toBeInTheDocument();
  });
  it("omits the centered wrapper when content owns overflow (editor route)", () => {
    render(<AdminShell contentClassName="overflow-hidden p-0">{...}</AdminShell>, { wrapper: ShellProviders });
    expect(container.querySelector(".max-w-\\[1280px\\]")).toBeNull();
  });
  it("keeps AssistantPanel mounted", () => { /* assert assistant host present */ });
});
```

### `tests/vitest/ui-integration/admin-shell/sidebar-active.test.tsx`

```ts
describe("SidebarNav active-state", () => {
  it("highlights the longest-prefix winner only", () => {
    // sections include /admin/advanced/custom-screens AND .../custom-screens/p1/entries
    render(<SidebarNav sections={...} activeHref="/admin/advanced/custom-screens/p1/entries" canAccess={() => true} />);
    expect(activeLinks()).toEqual(["/admin/advanced/custom-screens/p1/entries"]); // not the broader "Screens" item
  });
  it("filters items by permission (RBAC preserved)", () => {
    render(<SidebarNav sections={...} canAccess={(p) => p !== "audit:read"} />);
    expect(screen.queryByText("Audit Logs")).toBeNull();
  });
  it("is de-SaaS: shows site identity + version, no workspace switcher / no Pro-trial", () => {
    render(<SidebarNav sections={...} brand={<SiteIdentity name="Acme" domain="acme.com" url="https://acme.com" />} />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /visit site/i })).toHaveAttribute("target", "_blank");
    expect(screen.queryByText(/coderso pro|upgrade|trial|workspace/i)).toBeNull();
  });
  it("toggles the Advanced group", () => { /* click -> onGroupToggle + aria-expanded flip */ });
});
```

### `tests/vitest/ui-integration/admin-shell/theme-toggle.test.tsx`

```ts
it("toggles light/dark and persists", () => {
  render(<TopBar />, { wrapper: ShellProviders });
  fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  // re-mount reads persisted value
});
it("renders profile switcher AND light/dark toggle as distinct controls", () => { ... });
```

### `tests/vitest/ui-integration/primitives-variants/primitives.test.tsx`

```ts
it.each(["default","soft","secondary","outline","ghost","destructive","link"])("Button variant %s renders", (v) => {
  render(<Button variant={v as any}>x</Button>);
  expect(screen.getByRole("button")).toHaveAttribute("data-variant", v);
});
it.each(["soft","success","warning","info"])("Badge adds %s variant", (v) => {
  const { container } = render(<Badge variant={v as any}>x</Badge>);
  expect(container.firstChild).toHaveClass(v === "soft" ? "bg-primary-soft" : `bg-${v}-soft`);
});
it("Card is rounded-2xl with soft shadow and supports CardAction", () => { ... });
// Guard: every PRE-EXISTING variant/size still renders (no removed enum members).
```

### `tests/vitest/ui-integration/shared-patterns/patterns.test.tsx`

```ts
it("PageHeader renders breadcrumb AdminLinks with resolved hrefs + still renders title-only", () => { ... });
it("DataTable renders rows, selectable checkboxes, onRowClick (checkbox cell does not trigger it)", () => { ... });
it("StatusBadge maps known status -> variant and unknown -> outline", () => { ... });
it("Charts render for empty / single / normal series without throwing", () => { ... });
```

### `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx`

```ts
it("hides the panel and shows the reopen affordance, then restores it", () => {
  render(<CanvasEditor canvas={<div>c</div>} panel={<div>p</div>} panelTitle="Block" />);
  fireEvent.click(screen.getByRole("button", { name: /hide panel/i }));
  expect(screen.queryByText("p")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /show panel/i }));
  expect(screen.getByText("p")).toBeInTheDocument();
});
it("reflects aria-pressed and supports panelPosition='bottom'", () => { ... });
```

**Data flow:** tests render components with the minimal real providers and assert
DOM/class markers; no network, no Bun runtime. Use existing `tests/vitest`
setup/fixtures for `AdminBasePathContext` / `AdminAuthContext` / theme provider.

**Error handling:** tests cover fallback paths (missing site identity → neutral
brand; absent panel → toggle still works; unknown status → outline badge).

**Regression-test shape:** the suites above ARE the regression shape; they must
also be cross-checked against the existing `tests/vitest/admin` nav/adminPaths
suites to confirm no behavioral drift.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/admin-shell`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/primitives-variants`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/shared-patterns`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/canvas-editor`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin` (existing admin suites stay green)

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/TESTING_STRATEGY.md` — register the new ui-integration shell suites if
  it enumerates suites by name.
- `_docs/_CHANGELOG/` entry on closure linking TASK-479 + TASK-479-06-L07.
