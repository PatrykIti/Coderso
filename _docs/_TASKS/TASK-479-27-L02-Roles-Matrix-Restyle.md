# TASK-479-27-L02: Roles Matrix Restyle
# FileName: TASK-479-27-L02-Roles-Matrix-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Admin Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-27
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Permissions Matrix screen to match the prototype: a permission×role
grid inside a soft `SectionCard`, a sticky permission column, grouped permission
sections, **member-count** badges in each role header, a check/dash legend, and
violet accents. Bind every cell to the REAL permission model already in
`PermissionsMatrixPage.tsx`; preserve `roles:read` (read-only) vs `roles:write`
(editable) modes, the permission diff/save flow, and the role-create dialog.

- **Goal:** A calm, readable permission×role matrix with member counts and a
  legend — without changing the permission catalog, the role-permission diff/save
  semantics, or the read-only/editable gating.
- **Owning module/service:** `core/admin/ui/roles/PermissionsMatrixPage.tsx` (+
  `PermissionsMatrix.tsx`), reusing the TASK-479-06-L02 pattern library
  (`SectionCard`) and `core/admin/components/ui/{table,badge,button,input}.tsx`.
- **Source-of-truth docs:** `_docs/RBAC_SPEC.md`, `_docs/DESIGN_TOKENS.md`.
  **Ports from:** `_docs/_PROTOTYPE/src/pages/admin/PermissionsMatrixPage.tsx`,
  `_docs/_PROTOTYPE/src/components/patterns/SectionCard.tsx`,
  `_docs/_PROTOTYPE/src/components/ui/table.tsx`,
  tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to `adminRolesClient` (`listAdminRoles`,
  `listPermissionCatalog`, `createAdminRole`, `updateAdminRole`), the permission
  catalog (`permissionCatalog.ts`), the diff helpers (`rolePermissionDiff.ts`,
  `normalizeRolePermissionSet`, `summarizeRolePermissionDiffs`), the risk model
  (`rolePermissionRisk.ts`), or the `MatrixMode` (`denied`/`readonly`/`editable`)
  gating. No new endpoints. The prototype is a STATIC check/dash grid — the real
  screen is EDITABLE when `roles:write`; preserve the interactive cells + Save.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Reads stay on `listAdminRoles` /
`listPermissionCatalog` (`roles:read`); writes stay on `createAdminRole` /
`updateAdminRole` (`roles:write`, admin CSRF). The `MatrixMode` gate keeps the
matrix read-only without `roles:write`, the Owner/`*` full-access role stays
unrestrictable, and the high-risk-permission confirm (`ConfirmActionDialog`) is
preserved. No new fields enter client cache, logs, or debug payloads.

---

## Implementation Pseudocode

Concrete shapes — port the prototype's grid look but bind it to the REAL data in
`PermissionsMatrixPage.tsx` (`roles`, `permissionGroups` from
`listPermissionCatalog`, the `RolePermissionsMap` draft state, `matrixMode`,
diff/save handlers). **Keep all existing hooks, the editable cell toggles, the
diff computation, and the Save flow untouched**; only chrome + cell visuals change.

### 1) Page shell + role-create action (`PermissionsMatrixPage.tsx` — JSX)

```tsx
// PORT layout from prototype pages/admin/PermissionsMatrixPage.tsx:
//   PageHeader -> SectionCard(title "Permissions", legend in `action`) -> Table.
// Keep the REAL header title and the RBAC-gated "New role" button (opens the
// existing create Dialog). Keep the Save bar that appears when diffs exist.
<PageHeader title="Roles matrix"
  actions={canWriteRoles ? <Button onClick={openCreateRole} className="gap-1.5"><Plus className="size-4" /> New role</Button> : null} />

<SectionCard
  title="Permissions"
  description="Owner has full access and cannot be restricted."
  padded={false} bodyClassName="p-0"
  action={
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Allowed</span>
      <span className="flex items-center gap-1.5"><Minus className="size-3.5 text-muted-foreground/40" /> No access</span>
    </div>
  }>
  <PermissionsMatrix ... />   {/* restyled child, see (2) */}
</SectionCard>
```

### 2) Matrix table (`PermissionsMatrix.tsx`) — sticky col + member counts

```tsx
// Restyle the existing Table render. Role header cells gain a member-count Badge
// derived from REAL data. PREFER a real count source — the matrix page (or the
// Users page) already exposes role usage; reuse the same derivation (e.g.
// roleUsageCounts keyed by role.id). If no count is loaded here, OMIT the badge
// rather than fabricate one.
<TableHead key={role.id} className="text-center">
  <div className="flex flex-col items-center gap-1">
    <span className="text-foreground">{role.name}</span>
    {memberCount != null
      ? <Badge variant="outline" className="font-normal normal-case">{memberCount} {memberCount === 1 ? "member" : "members"}</Badge>
      : null}
  </div>
</TableHead>

// Permission column stays sticky (sticky left-0 z-10 bg-card). Group header rows
// port the prototype's bg-muted/40 uppercase section labels, driven by the REAL
// permissionGroups structure (group -> rows).
// CELLS: when matrixMode === "editable", keep the interactive Checkbox/toggle and
// its onChange that mutates the RolePermissionsMap draft (drives the diff). When
// "readonly"/"denied", render the static Check/Minus glyph (prototype look). Do
// NOT replace editable cells with static glyphs.
{cell.editable
  ? <Checkbox checked={cell.allowed} onCheckedChange={(v) => toggle(role.id, perm.key, v)} aria-label={`${role.name} ${perm.key}`} />
  : cell.allowed
    ? <Check className="mx-auto size-4 text-primary" />
    : <Minus className="mx-auto size-4 text-muted-foreground/40" />}
```

### 3) Save bar + diff summary (preserve)

```tsx
// Keep the existing dirty/diff summary + Save button (summarizeRolePermissionDiffs
// / buildRolePermissionDiffs). Restyle the bar to a soft rounded-2xl footer with a
// violet primary Save; preserve the high-risk-change ConfirmActionDialog before
// committing updateAdminRole. No change to the normalize/diff/save sequence.
```

**Data flow:** unchanged. `listAdminRoles` + `listPermissionCatalog` →
`permissionGroups` + `RolePermissionsMap` draft → editable cells mutate the draft
→ `buildRolePermissionDiffs` → Save calls `updateAdminRole`/`createAdminRole`;
member-count badges and group headers are render-time derivations (no new fetch,
no setState-in-effect).

**Error handling:** unchanged — keep the existing `Alert` blocks, the denied/
readonly empty states, the high-risk confirm, and any save-failure messaging. The
restyle must not swallow or relocate any error surface.

**React-hooks / cache rules to honor (call out in PR):** member-count derivation
is `useMemo` (no sync setState in effects); the draft/diff state machine is
untouched; no mount-force refetch added; no dirty-state overwrite of in-flight
edits.

**Regression-test shape (delivered in L05):** matrix renders one column per role
with a sticky permission column and grouped sections; editable cells toggle the
draft + surface a diff/Save in `roles:write` mode; read-only mode renders static
glyphs and no Save; member-count badge reflects real counts (or is absent when
none loaded); legend present.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/permissions-matrix.test.tsx tests/vitest/ui/permissions-matrix-leaf.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx tests/vitest/ui-integration/roles.test.tsx tests/vitest/authUi/rolesUi.test.tsx`
- The new restyle suite from L05 (`tests/vitest/ui-integration/admin-screens-restyle.test.tsx`).
- Manual: light + dark toggle on `/admin/roles`; confirm read-only vs editable
  modes, cell toggles, diff/Save, role-create dialog, and high-risk confirm all
  behave as before.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-27-L02`.
- `_docs/RBAC_SPEC.md` — only if a user-visible label changes (e.g. legend copy);
  document no behavior change.
