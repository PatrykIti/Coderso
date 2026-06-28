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
  invariants (site identity + "Coderso 1.0" present; no workspace switcher / no
  Pro-trial), the light/dark toggle **plus a real dark-recolor gate** that asserts
  the chrome `--admin-*` tokens (button + sidebar + topbar) actually flip in dark
  (not merely that the `.dark` class is present), the top-bar user menu + command
  search trigger, primitive variant markers (button `soft`, badge
  soft/success/warning/info, card `rounded-2xl`), the shared patterns, and the
  `CanvasEditor` show/hide toggle. Tests run in the Bun-free admin/UI Vitest lane
  per `_docs/TESTING_STRATEGY.md` — do **not** move runtime coverage here. This
  dark-recolor gate is sequenced **after** the L01/L03/L04 chrome migration.
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

New suites use the **repo's real test idiom** — this repo has **NO**
`@testing-library/react`, `@testing-library/jest-dom`, or `user-event`. Two
patterns only:

- **Static markers** → `renderAdminUi(node, { path })` from
  `tests/utils/adminRouterRender.tsx` (it returns an **HTML string** via
  `renderToString`, wrapped in `AdminRouterProvider`). Assert with
  `expect(html).toContain(...)`. This is a **single SSR snapshot** — do NOT assert
  interactive, inactive-tab, or lazy/grid content through it.
- **Interactions** (toggles, clicks) → `// @vitest-environment happy-dom` +
  `createRoot` + `React.act`, querying via `document.body.querySelectorAll(...)`
  and `.textContent`, clicking via `(el as HTMLButtonElement).click()` inside
  `React.act` (see `tests/vitest/ui/integration-drawer-secrets.test.tsx` for the
  `mount`/`flushEffects`/`clickButton` helpers).

Full-shell renders that hit auth bootstrap stub `globalThis.fetch` (the `/auth/me`
shape) exactly like `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`.
Wrap renders in the real providers the shell needs (`AdminRouterProvider` via
`renderAdminUi`; add `AdminBasePathContext` / `AdminAuthContext` for the shell).

### `tests/vitest/ui-integration/admin-shell/shell.test.tsx`

```ts
// SSR string snapshot via renderAdminUi; stub globalThis.fetch (/auth/me) first.
test("renders sidebar + topbar + main with centered content wrapper", () => {
  const html = renderAdminUi(<AdminShell><div>page</div></AdminShell>, { path: "/admin" });
  expect(html).toContain("max-w-[1280px]"); // centered column present
  expect(html).toContain("page");
});
test("omits the centered wrapper when content owns overflow (editor route)", () => {
  const html = renderAdminUi(<AdminShell contentClassName="overflow-hidden p-0"><div>page</div></AdminShell>);
  expect(html).not.toContain("max-w-[1280px]");
});
test("keeps AssistantPanel mounted", () => {
  const html = renderAdminUi(<AdminShell><div>page</div></AdminShell>);
  expect(html).toContain(/* AssistantPanel host marker, e.g. data-testid / aria-label */);
});
// Mobile-drawer open/close is interactive -> separate happy-dom + createRoot/act test.
```

### `tests/vitest/ui-integration/admin-shell/sidebar-active.test.tsx`

```ts
// SidebarNav is a pure component -> SSR-string assertions for active-state/RBAC/de-SaaS.
test("highlights the longest-prefix winner only", () => {
  // sections include /admin/advanced/custom-screens AND .../custom-screens/p1/entries
  const html = renderAdminUi(
    <SidebarNav sections={sections} activeHref="/admin/advanced/custom-screens/p1/entries" canAccess={() => true} />);
  // the deepest href carries the active pill class; the broader "Screens" item does not.
  // Assert the active marker is anchored to the entries href (e.g. via a data-active attr the
  // component emits, scoped to the entries link), NOT to the parent item.
  expect(html).toMatch(/custom-screens\/p1\/entries[^]*?--admin-sidebar-active-bg/);
});
test("filters items by permission (RBAC preserved)", () => {
  const html = renderAdminUi(<SidebarNav sections={sections} canAccess={(p) => p !== "audit:read"} />);
  expect(html).not.toContain("Audit Logs");
});
test("is de-SaaS: shows site identity + version, no workspace switcher / no Pro-trial", () => {
  const html = renderAdminUi(
    <SidebarNav sections={sections} brand={<SiteIdentity siteName="Acme" siteDomain="acme.com" siteUrl="https://acme.com" />} />);
  expect(html).toContain("Acme");
  expect(html).toContain("Coderso 1.0");
  expect(html).toMatch(/href="https:\/\/acme\.com"[^>]*target="_blank"/); // Visit site is a raw external anchor, not AdminLink
  expect(html.toLowerCase()).not.toMatch(/coderso pro|upgrade|trial|workspace/);
});
// Advanced-group toggle is interactive -> happy-dom + createRoot/act: click the group button,
// assert onGroupToggle(groupId, next) fired and aria-expanded flipped.
```

### `tests/vitest/ui-integration/admin-shell/topbar.test.tsx` (theme toggle + dark recolor + user menu + search)

```ts
// @vitest-environment happy-dom — interactive; mount via createRoot + React.act.
test("toggles light/dark and persists", async () => {
  const { container } = mount(<TopBar />);                       // wrap in shell providers as needed
  await clickButton("Toggle theme");                             // find via querySelectorAll + textContent/aria-label
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  // re-mount reads the persisted theme value
});

// D1 DARK GATE — assert chrome actually RECOLORS in dark, not merely that the .dark class is present.
// Inject the same per-profile token <style> 05 emits (BOTH :root{--admin-*} and :root.dark{--admin-*}),
// render the chrome (button + sidebar + topbar), toggle .dark, and assert the resolved --admin-* value flips:
test("dark mode recolors button + sidebar + topbar chrome", () => {
  document.head.appendChild(makeTokenStyle({                     // :root and :root.dark blocks
    light: { "--admin-topbar-bg": "#ffffff", "--admin-sidebar-bg": "#f7f7fb", "--admin-button-primary-bg": "#7c3aed" },
    dark:  { "--admin-topbar-bg": "#0b0b10", "--admin-sidebar-bg": "#111118", "--admin-button-primary-bg": "#8b5cf6" },
  }));
  const { container } = mount(<><TopBar /><SidebarNav sections={sections} /><Button>x</Button></>);
  const read = (sel: string, v: string) => getComputedStyle(container.querySelector(sel)!).getPropertyValue(v).trim();
  document.documentElement.classList.remove("dark");
  expect(read("header", "--admin-topbar-bg")).toBe("#ffffff");
  document.documentElement.classList.add("dark");
  expect(read("header", "--admin-topbar-bg")).toBe("#0b0b10");   // injected :root.dark wins source order
  // repeat for --admin-sidebar-bg (nav) and --admin-button-primary-bg (button)
});

test("renders the profile switcher AND the light/dark toggle as two distinct controls", () => {
  const html = renderAdminUi(<TopBar />);
  // AdminThemeSwitcher (profile) and AdminColorModeToggle (light/dark) both present, separate controls.
});

// §6: cover the user menu + search trigger (previously omitted).
test("user menu renders the Settings AdminLink with a resolved href; search trigger shows the kbd hint", () => {
  const html = renderAdminUi(<TopBar user={undefined} />, { path: "/admin" });
  expect(html).toContain("/admin/settings");   // Settings AdminLink -> real /settings route
  // Profile is a non-navigating item (no /profile route exists in AdminApp) -> assert NO bogus href.
  expect(html).not.toContain("/admin/profile");
  expect(html).toMatch(/Search or jump to/);   // CommandSearchTrigger + ⌘K kbd hint
});
test("a host-provided search node renders instead of the trigger", () => {
  const html = renderAdminUi(<TopBar search={<div data-testid="real-search" />} />);
  expect(html).toContain("real-search");
  expect(html).not.toMatch(/Search or jump to/);
});
// Sign out -> existing logout action: interactive happy-dom test asserts the logout handler is called.
```

### `tests/vitest/ui-integration/primitives-variants/primitives.test.tsx`

```ts
// Static SSR markers via renderAdminUi -> expect(html).toContain(...). vitest test.each is fine (not RTL).
test.each(["default","soft","secondary","outline","ghost","destructive","link"] as const)("Button variant %s renders", (v) => {
  const html = renderAdminUi(<Button variant={v}>x</Button>); // `as const` => v is the variant union, no `as any`
  expect(html).toContain(`data-variant="${v}"`);
});
test.each(["soft","success","warning","info"] as const)("Badge adds %s variant", (v) => {
  const html = renderAdminUi(<Badge variant={v}>x</Badge>);
  expect(html).toContain(v === "soft" ? "bg-primary-soft" : `bg-${v}-soft`);
});
test("Card is rounded-2xl with soft shadow and supports CardAction", () => {
  const html = renderAdminUi(<Card><CardAction>a</CardAction>x</Card>);
  expect(html).toContain("rounded-2xl");
  expect(html).toContain('data-slot="card-action"');
});
// Guard: every PRE-EXISTING Button variant/size still emits its data-variant/data-size (no removed enum members).
```

### `tests/vitest/ui-integration/shared-patterns/patterns.test.tsx`

```ts
// Static markers via renderAdminUi; onRowClick is interactive -> happy-dom + createRoot/act.
test("PageHeader renders breadcrumb AdminLinks with resolved hrefs + still renders title-only", () => {
  const html = renderAdminUi(<PageHeader title="Pages" breadcrumbs={[{ label: "Home", href: "/" }]} />);
  expect(html).toContain("Pages");
  const titleOnly = renderAdminUi(<PageHeader title="Solo" />);
  expect(titleOnly).toContain("Solo");
});
test("DataTable renders header + N rows; selectable adds checkboxes", () => {
  const html = renderAdminUi(<DataTable columns={cols} rows={rows} selectable />);
  // header + one row per item; checkbox cells present.
});
// onRowClick fires once and the checkbox cell does NOT trigger it -> interactive happy-dom test.
test("StatusBadge maps known status (incl. archived, spam) -> variant; unknown -> outline", () => {
  expect(renderAdminUi(<StatusBadge status="archived" />)).toContain("bg-secondary");
  expect(renderAdminUi(<StatusBadge status="spam" />)).toContain("bg-destructive");
  expect(renderAdminUi(<StatusBadge status="nope" />)).toContain("border-border"); // outline fallback
});
test("Charts render for empty / single / normal series without throwing", () => {
  expect(() => renderAdminUi(<AreaChart data={[]} />)).not.toThrow();
  expect(() => renderAdminUi(<AreaChart data={[1]} />)).not.toThrow();
});
```

### `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx`

```ts
// @vitest-environment happy-dom — show/hide is stateful; mount via createRoot + React.act.
test("hides the panel and shows the reopen affordance, then restores it", async () => {
  const { container } = mount(<CanvasEditor canvas={<div>c</div>} panel={<div>p</div>} panelTitle="Block" />);
  const hasText = (t: string) => Array.from(container.querySelectorAll("*")).some((n) => n.textContent === t);
  expect(hasText("p")).toBe(true);
  await clickButton("Hide panel");          // querySelectorAll("button") + textContent/aria-label match
  expect(hasText("p")).toBe(false);
  await clickButton("Show panel");
  expect(hasText("p")).toBe(true);
});
test("reflects aria-pressed and supports panelPosition='bottom'", () => {
  // SSR markers: aria-pressed on the toggle; bottom variant emits the centered-bottom positioning classes.
  const html = renderAdminUi(<CanvasEditor canvas={<div>c</div>} panel={<div>p</div>} panelPosition="bottom" />);
  expect(html).toContain("aria-pressed");
});
```

**Data flow:** tests render components with the minimal real providers and assert
HTML-string / DOM-class markers; no network, no Bun runtime. Use `renderAdminUi`
from `tests/utils/adminRouterRender.tsx` (SSR string) and, for interactions, the
`createRoot` + `React.act` `mount`/`clickButton` idiom from
`tests/vitest/ui/integration-drawer-secrets.test.tsx`; wrap with the real
`AdminBasePathContext` / `AdminAuthContext` / theme provider as the shell requires,
and stub `globalThis.fetch` for any auth-bootstrap path.

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
