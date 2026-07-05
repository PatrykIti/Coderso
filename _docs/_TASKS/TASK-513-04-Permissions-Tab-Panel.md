# TASK-513-04: Permissions Tab Panel + Per-Role Config Helper

# FileName: TASK-513-04-Permissions-Tab-Panel.md

**Parent Task:** TASK-513
**Priority:** Medium
**Category:** Content (Engine) / Admin UI / Config Surface
**Estimated Effort:** Medium
**Dependencies:** TASK-513-01 (`ContentTypeConfig.permissions` shape + client types)
**Status:** ⏳ To Do

---

## Scope (single-writer)

**513-04 is the SOLE WRITER of (both NEW files):**
- `core/admin/ui/content-types/ContentTypePermissionsPanel.tsx` — the Permissions tab UI
- `core/admin/ui/content-types/contentTypePermissions.ts` — pure resolve/normalize helper

Delivers the prototype's 4th tab (`Permissions`) as a **per-content-type role→capability matrix**
persisted in `config.permissions` (513-01). It is created BEFORE 513-03 so the editor can import
it. 513-04 does NOT edit `ContentTypeEditor.tsx` (513-03 renders the panel + owns the tab wiring).

> **Prototype-fidelity note (read first):** In the prototype the `Permissions` tab is an **inert
> label only** — `ContentTypeEditorPreview.tsx` renders `<Tabs variant="underline" items=[fields,
> relations, settings, permissions] />` with **no active-tab state, no `onChange`, and no per-tab
> conditional render**; the page always shows the Fields `SectionCard` + Type-settings `Card` grid
> regardless of the selected tab. So there is **nothing to visually match** for this tab, and **no
> live-visual verification applies** to this file (the prototype source proves the tab is a
> placeholder). This panel is therefore a **designed-from-scratch surface sanctioned by parent
> gap #3**, and its visual/interaction language is derived from two existing in-repo idioms rather
> than from a prototype mock: (a) the Type-settings card/switch idiom (for token/spacing
> consistency inside the editor) and (b) the canonical roles↔permission matrix in
> `core/admin/ui/roles/PermissionsMatrix.tsx` (for the grid/toggle-cell interaction language).

**Land order (strict):** 513-01 → 513-02 → 513-04 (this) → 513-03 → 513-05 → 513-06.

---

## Security Contract

**Admin-UI + pure helper only — no route/DB edit here.** The panel edits `config.permissions`
which is persisted by 513-01's already-hardened `PATCH /content-types/:id` normalizer
(reject-unknown role/cap keys, capped counts). The matrix is a **declarative stored config**; it
does NOT by itself change route authorization (enforcement = parent Open Question #1, a follow-up).
The panel MUST NOT invent capability keys outside the allowlist `read|create|update|delete|publish`
(the server would reject unknowns as `content_type_config_invalid`) — the helper's `CAPABILITIES`
const is the single source of truth shared with the render.

---

## What this subtask ships

### 1. `contentTypePermissions.ts` (pure)

**Single-source the matrix type from 513-01 (do NOT re-declare the cap shape).** 513-01 owns the
per-role capability shape (`ContentTypePermissionCapabilities`) and `config.permissions:
Record<string, ContentTypePermissionCapabilities>`. 513-04's panel prop and helper types MUST alias
that owned shape so `<ContentTypePermissionsPanel permissions={config.permissions} …>` (513-03 §6)
type-checks without structural coincidence and cannot silently drift:
```ts
import type { ContentTypeConfig, ContentTypePermissionCapabilities } from "@/services/contentTypesClient";

export const CAPABILITIES = ["read","create","update","delete","publish"] as const;
export type Capability = typeof CAPABILITIES[number];
// Alias 513-01's owned shape (NOT a fresh Partial<Record<…>>): keeps the panel prop == config.permissions value.
export type RoleCapabilities = ContentTypePermissionCapabilities;
export type PermissionsMatrix = NonNullable<ContentTypeConfig["permissions"]>;

// Roles come from the roles list (see data source below). Normalize keeps only true caps,
// drops empty role rows — mirrors the server normalizer (513-01 §2 CAP_KEYS loop) so the UI
// never sends droppable data. Pure, Bun/db-free; iterate roles, keep caps whose value===true.
export function normalizePermissionsMatrix(input: PermissionsMatrix): PermissionsMatrix {
  const out: PermissionsMatrix = {};
  for (const role of Object.keys(input ?? {})) {
    const caps = input[role];
    if (!caps || typeof caps !== "object") continue;      // skip malformed role rows
    const kept: RoleCapabilities = {};
    for (const cap of CAPABILITIES) {                      // fixed allowlist, no unknown caps
      if (caps[cap] === true) kept[cap] = true;            // keep only true caps (drop false/undefined)
    }
    if (Object.keys(kept).length > 0) out[role] = kept;    // drop empty role rows
  }
  return out;
}
// Resolve effective caps for a role given the matrix (missing role ⇒ {} = inherit/none).
// Returns a NEW object so callers never mutate stored config; empty for unknown/undefined.
export function resolveRoleCapabilities(matrix: PermissionsMatrix | undefined, role: string): RoleCapabilities {
  return { ...(matrix?.[role] ?? {}) };
}
// Toggle helper: pure, returns a NEXT matrix (shallow-cloned) with role[cap] set/cleared.
// Setting next=false deletes the cap; if the role row becomes empty its key is removed too,
// so the emitted matrix is already normalize-clean (identical to normalizePermissionsMatrix output).
export function toggleCapability(
  matrix: PermissionsMatrix | undefined,
  role: string,
  cap: Capability,
  next: boolean,
): PermissionsMatrix {
  const out: PermissionsMatrix = { ...(matrix ?? {}) };
  const caps: RoleCapabilities = { ...(out[role] ?? {}) };
  if (next) caps[cap] = true; else delete caps[cap];       // set true / clear the cap
  if (Object.keys(caps).length > 0) out[role] = caps;      // keep role with ≥1 true cap
  else delete out[role];                                    // clearing last cap removes the row
  return out;
}
```
`CAPABILITIES` is the single 5-entry allowlist shared with the render (Security Contract); no helper
ever writes a cap key outside it, so the emitted matrix always passes the server normalizer.

### 2. `ContentTypePermissionsPanel.tsx`
Props: `{ permissions: PermissionsMatrix | undefined; onChange: (next: PermissionsMatrix) => void;
disabled?: boolean }`.
- **Match the established matrix idiom.** A canonical role↔permission matrix already exists at
  `core/admin/ui/roles/PermissionsMatrix.tsx` (+ `PermissionsMatrixPage.tsx`,
  `rolePermissionDiff.ts`). Reconcile this panel's visual/interaction conventions with it: it uses
  the `@/components/ui/table` primitives (`Table*`), `Checkbox` toggle cells, and a
  `RolePermissionsMap = Record<string, string[]>` shape, with **roles as COLUMNS and permission
  rows** (note: the existing matrix orients roles across columns). 513-04's grid is the transpose —
  **rows = roles**, **columns = capabilities** (Read / Create / Update / Delete / Publish) — which
  is warranted here because the capability set is a fixed 5-column allowlist while roles are the
  variable-length axis (one row per role reads better and scales with workspace roles). State this
  transpose choice explicitly in the closure. Reuse the same primitives (`Table*` + `Checkbox`, or
  `Switch` if the closure justifies it) and the Type-settings `Card`/`SectionCard`/`Badge` tokens so
  the panel matches BOTH the roles-matrix interaction language and the editor's visual idiom — do
  NOT invent a divergent grid. Each cell is bound via `toggleCapability`.
- **Roles data source:** load the roles list via `listAdminRoles()` (returns `AdminRole[]`) and the
  `AdminRole` type from `@/services/adminRolesClient` (`core/admin/services/adminRolesClient.ts` —
  verified the ONLY roles client; there is NO `rolesClient`/`roleClient` module). Each role's
  matrix key is the role `id` (or `name` — pick one and state it in the closure; `id` is the stable
  key). If a cached list hook exists for admin roles, prefer it; otherwise fetch once with
  loading/error state. **Do NOT reference `getUserPermissions`** (`core/services/auth/roleService.ts`)
  as a fallback — it is a server-only async function that `import { db } from "../../db/client"` +
  drizzle (the exact admin-bundle boundary break 513-01 flags for `typeService`), and it returns a
  single USER's flattened permission strings, not a role set. **There is NO client-side roles
  fallback in the repo** — do NOT reference `core/admin/ui/roles/permissionCatalog.ts`
  (`fallbackPermissionGroups` is `PermissionGroup[]` = permission-group/permission definitions and
  `flattenPermissionGroups` returns permission IDs like `content:read`; seeding role rows from it
  would put permission ids where role keys belong). Preferred behavior on `listAdminRoles()` error:
  render the **error/empty state** (below) rather than a synthetic role list. If a fallback role set
  is genuinely required, declare a **small static client-side role-name/id constant local to this
  file** — never derive it from the permission catalog and never a server service. **Flag which
  client/key (and whether a fallback fired) is used in the closure.**
- Header row explains "Configure which roles can act on entries of this content type. Unset =
  inherit the global role permission." (declarative note aligned with Open Question #1).
- A "Reset to defaults" affordance clears the matrix (→ `{}`), matching the owner's
  reset-to-default idiom used elsewhere (e.g. menu controls).
- Empty/loading/error states for the roles fetch.

**Render skeleton (execution-ready):**
```tsx
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";           // matrix idiom (roles/PermissionsMatrix.tsx)
import { Card } from "@/components/ui/card";                   // Type-settings visual token
import { Button } from "@/components/ui/button";
import { listAdminRoles, type AdminRole } from "@/services/adminRolesClient";
import { CAPABILITIES, type Capability, toggleCapability, resolveRoleCapabilities,
  type PermissionsMatrix } from "./contentTypePermissions";

const CAP_LABELS: Record<Capability, string> = {
  read: "Read", create: "Create", update: "Update", delete: "Delete", publish: "Publish",
};

export function ContentTypePermissionsPanel({ permissions, onChange, disabled }: {
  permissions: PermissionsMatrix | undefined;
  onChange: (next: PermissionsMatrix) => void;
  disabled?: boolean;
}) {
  const [roles, setRoles] = useState<AdminRole[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    listAdminRoles()
      .then((r) => { if (live) { setRoles(r); setError(null); } })
      .catch(() => { if (live) { setRoles([]); setError("roles_load_failed"); } });
    return () => { live = false; };
  }, []);

  if (roles === null) return <LoadingState />;                 // fetch pending
  if (error) return <ErrorState onRetry={/* re-run effect */} />; // do NOT synthesize roles
  if (roles.length === 0) return <EmptyState message="No roles yet." />;

  return (
    <Card>
      <p className="text-sm text-muted-foreground">
        Configure which roles can act on entries of this content type. Unset = inherit the global
        role permission.
      </p>
      <div className="flex justify-end">
        <Button variant="ghost" disabled={disabled} onClick={() => onChange({})}>
          Reset to defaults
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            {CAPABILITIES.map((cap) => <TableHead key={cap}>{CAP_LABELS[cap]}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => {                                // key = role.id (stable; state in closure)
            const caps = resolveRoleCapabilities(permissions, role.id);
            return (
              <TableRow key={role.id}>
                <TableCell>{role.name}</TableCell>
                {CAPABILITIES.map((cap) => (
                  <TableCell key={cap}>
                    <Checkbox
                      checked={caps[cap] === true}
                      disabled={disabled}
                      onCheckedChange={(next) =>
                        onChange(toggleCapability(permissions, role.id, cap, next === true))}
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
```
Notes: matrix key is `role.id` (stable — restate in closure); every emit goes through
`toggleCapability`/`{}` so `onChange` always receives normalize-clean data; the render NEVER
iterates a cap set other than `CAPABILITIES` (Security Contract allowlist). `LoadingState`/
`ErrorState`/`EmptyState` are small inline blocks reusing existing muted-text/skeleton tokens.

---

## Testing requirements (lanes + shared-DB safety)

**Vitest pure lane** (no DB/Bun import — mirrors 513-01's pure lane):
- `normalizePermissionsMatrix`: `{editor:{read:true,create:false}}` ⇒ `{editor:{read:true}}` (drops
  false caps); `{viewer:{}}` and `{viewer:{delete:false}}` ⇒ `{}` (drops empty rows); malformed
  `{editor:null}` row is skipped; output contains no cap key outside `CAPABILITIES`.
- `toggleCapability`: `toggle({}, "editor", "read", true)` ⇒ `{editor:{read:true}}`; toggling the
  same cap `false` ⇒ `{}` (clearing last cap removes the role); set/clear round-trip returns to the
  original; input matrix is NOT mutated (returns a new object); role with a remaining cap survives.
- `resolveRoleCapabilities`: missing role ⇒ `{}`; `undefined` matrix ⇒ `{}`; present role ⇒ a copy
  (mutating the result does not mutate the source matrix).

**Vitest admin/UI lane** (`tests/vitest/ui/**`), roles client mocked to return two stub roles:
- renders one `TableRow` per role × 5 capability `Checkbox` cells (roles as rows, caps as columns);
- toggling a cell calls `onChange` exactly once with the expected matrix (e.g. checking Editor→Read
  emits `{ <editorId>: { read: true } }`);
- unchecking the role's last cap emits `{}` (row removed);
- "Reset to defaults" emits `{}`;
- `disabled` prop disables every `Checkbox` and the Reset button;
- roles-fetch rejection renders the error state (NOT a synthetic role list).

**Gates**: `bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit`, `lint`.

---

## UI/UX-fidelity & max-config-flexibility notes

Fills in the prototype's `Permissions` tab, which ships as an **inert label with no panel content**
(see the Prototype-fidelity note under Scope) — so this is a designed-from-scratch surface (parent
gap #3), not a reproduction of a prototype mock, and **no live-visual verification applies**.
Flexibility: any role in the workspace gets a full 5-capability matrix; unset cells inherit; server
accepts arbitrary role keys (capped). To avoid a divergent permissions language, the panel's
grid/toggle-cell interaction mirrors the canonical `core/admin/ui/roles/PermissionsMatrix.tsx`
idiom (transposed to role-rows × capability-columns) and its tokens reuse the Type-settings
card / switch idiom for a clean, native-feeling integration (no new visual language, no raw JSON).
