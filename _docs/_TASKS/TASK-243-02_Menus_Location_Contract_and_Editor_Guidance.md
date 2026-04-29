# TASK-243-02: Menus Location Contract and Editor Guidance
# FileName: TASK-243-02_Menus_Location_Contract_and_Editor_Guidance.md

**Priority:** High
**Category:** CMS/Menus + Admin UI + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-243
**Status:** To Do

---

## Overview

Clarify what `Location` does in the Menus editor and verify the existing
runtime contract remains correct.

Today `Location` is a nullable free-text slot key, for example `primary` or
`footer`. Themes and navigation widgets can ask for a menu by location. A menu
only renders through runtime navigation when it is published and has usable
items; otherwise the navigation resolver falls back to manual/default links.

The field works technically, but the editor needs clearer guidance because the
name reads like a geographic/location field to non-technical users.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/admin/ui/menus/MenuEditorPage.tsx`
  - clarify the label/help text around `Location`;
  - surface whether the current menu is assigned/unassigned and draft/published;
  - avoid changing the persisted payload shape.
- `core/server/validation/menuSchemas.ts`
  - only touch if validation currently fails the documented nullable string
    contract.
- `core/services/menus/menuService.ts`
  - only touch if location normalization or update behavior is proven wrong.
- `core/services/navigation/navigationRuntimeResolver.ts`
  - only touch if published-menu lookup by location is proven wrong.
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - cover user-facing guidance.
- `tests/integration/routes/menus.test.ts`
  - cover create/update nullable and non-null location if missing.
- `tests/unit/menus/menuService.test.ts`
  - cover `getMenuWithItemsByLocation` if current coverage is incomplete.
- `tests/unit/navigation/navigationRuntimeResolver.test.ts`
  - keep/prove published-only runtime location fallback.
- `_docs/DATA_MODEL.md`
  - correct the stale `primary|footer` wording if it still implies an enum.
- `docs/screens/menus.md`
  - update editor instructions after header action changes.

## Current Contract

- API docs list:
  - `POST /menus`
  - `PATCH /menus/:id`
  - `GET /menus/:id`
- Menu summary includes `location: string | null`.
- The current `POST /menus` route schema requires the `location` property, but
  accepts `string | null`. The admin create dialog may let users leave Location
  empty, and the client serializes that as explicit `location: null`.
- `menus.location` is unique when set.
- `getMenuWithItemsByLocation(location)` trims/normalizes the supplied slot and
  fetches the matching menu.
- `resolveNavigationRuntimeData()` ignores draft menus and empty menus and
  falls back to manual/default links.

## Security Contract

- Visibility: internal admin Menus editor and public runtime navigation read.
- Auth model:
  - editor writes use existing authenticated admin session;
  - runtime reads are public rendering reads through existing site/widget flow.
- RBAC: existing `menus:read` / `menus:write`.
- CSRF: unchanged for admin `PATCH /menus/:id`.
- Rate-limit bucket: unchanged admin write bucket.
- Reject-unknown validation:
  - `location` remains an explicit known field;
  - unknown route payload fields remain rejected.
- Anti-abuse:
  - no public write path;
  - Location guidance must not invite arbitrary script/CSS/class-name input;
  - runtime must keep draft menus hidden from public navigation.

## Implementation Pseudocode

Keep the data model unchanged and improve the UI language:

```tsx
<label className="text-xs font-semibold uppercase text-muted-foreground">
  Theme location
</label>
<Input
  value={menuLocation}
  onChange={(event) => setMenuLocation(event.target.value)}
  placeholder="primary"
  aria-describedby="menu-location-help"
/>
<p id="menu-location-help" className="text-xs text-muted-foreground">
  Slot key used by the theme or Navigation widget, for example primary or
  footer. Leave empty for menus that are not mounted in a theme slot yet.
</p>
<p className="text-xs text-muted-foreground">
  Runtime navigation uses this menu only after it is published.
</p>
```

If adding a small helper keeps copy/test expectations stable:

```ts
export function describeMenuLocationState(input: {
  location: string;
  status: MenuSummary["status"];
}) {
  const location = input.location.trim();
  if (!location) return "Not assigned to a theme slot.";
  if (input.status !== "published") {
    return `Assigned to ${location}, but hidden from runtime until published.`;
  }
  return `Assigned to the ${location} theme slot.`;
}
```

Route/service verification shape:

```ts
test("menus route accepts nullable location and rejects unknown fields", async () => {
  // Preserve current route compatibility: create payloads include explicit
  // location even when the UI field is empty.
  await postMenu({ name: "Footer", location: null });
  await patchMenu(menuId, { location: "footer" });
  await expectPatchMenu(menuId, { location: "footer", unsafe: true }).rejects.toMatchObject({
    code: "validation_error",
  });
});
```

Runtime verification shape:

```ts
test("navigation uses published menu location fallback only", async () => {
  const resolved = await resolveNavigationRuntimeData(
    { linksSource: "menu", items: fallbackItems },
    { menuLocationFallback: "primary" },
    { getMenuWithItemsByLocation: async () => publishedMenu }
  );

  expect(resolved.linksSource).toBe("menu");
});
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/menu-editor-shell-wave.test.tsx`
- If route/service/runtime behavior is touched:
  - `set -a && source .env && set +a && bun test tests/integration/routes/menus.test.ts tests/unit/menus/menuService.test.ts tests/unit/navigation/navigationRuntimeResolver.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/DATA_MODEL.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` only if payload behavior changes
- `docs/screens/menus.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

1. The editor explains Location as a theme/runtime slot key, not a physical
   location.
2. Users can leave Location empty without confusing error copy.
3. Users understand that published status controls whether runtime navigation
   can use the menu.
4. Existing nullable string API payloads remain compatible.
5. Docs no longer imply Location is limited to a hard-coded enum unless code
   actually enforces one.
6. If the implementer decides to make `location` optional on `POST /menus`, the
   route schema, API docs, client tests, and integration tests are updated in
   the same leaf.
