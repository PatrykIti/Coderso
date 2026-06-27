# TASK-479-27-L01: Users & Roles Restyle
# FileName: TASK-479-27-L01-Users-Roles-Restyle.md

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

Restyle the real Users & Roles screen to match the prototype: a member/invitation
**tab strip**, a **stat row** (total / active / pending), a soft `rounded-2xl`
**DataTable** with avatar, role badge, status, and 2FA columns, and the
prototype's **FilterBar**. Bind every visual to the REAL state already in
`UsersRolesPage.tsx`; preserve RBAC-gated actions, partial-read fallbacks, the
role split-pane editor, and the existing data-loading flow.

- **Goal:** A Notion-like, violet-accented Users screen — warm canvas, soft
  cards, avatar+email cell, role/status/2FA badges, and a member/invite tab —
  with zero changes to data, RBAC, or actions.
- **Owning module/service:** `core/admin/ui/users/UsersRolesPage.tsx` (+
  `UserList.tsx`, `UsersTable.tsx`, `UserFilters.tsx`,
  `UserDetailsDrawer.tsx`, `InviteUserDialog.tsx`), reusing
  `core/admin/ui/shared/PageHeader.tsx` and the TASK-479-06-L02 pattern library
  (`StatCard`, `DataTable`, `FilterBar`, `StatusBadge`) plus
  `core/admin/components/ui/{avatar,badge,button,tabs}.tsx`.
- **Source-of-truth docs:** `_docs/RBAC_SPEC.md`, `_docs/DESIGN_TOKENS.md`.
  **Ports from:** `_docs/_PROTOTYPE/src/pages/admin/UsersRolesPage.tsx`,
  `_docs/_PROTOTYPE/src/components/patterns/{DataTable,StatCard,FilterBar,StatusBadge}.tsx`,
  tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to `adminUsersClient` / `adminRolesClient`, the
  invite/disable/enable/delete/password-reset mutations, the
  `roleFilterUnavailableReason` / `roleDetailsUnavailableReason` partial-read
  behavior, the `SplitShell` role editor pane, or `ConfirmActionDialog` flows.
  No new endpoints. The prototype's `PEOPLE` mock and fabricated stat deltas are
  illustrative — derive stats from the real `users` array; never invent counts.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Reads stay on `listAdminUsers` /
`listAdminRoles` / `listPermissionCatalog` (`users:read` / `roles:read` with the
existing partial-read fallbacks); mutations stay on the existing
`adminUsersClient` / `adminRolesClient` calls (`users:write` / `roles:write`,
admin CSRF). The `canPermission(...)` gate, role-filter and role-details
unavailable reasons, and the "last admin" guard are untouched. No new fields
enter client cache, logs, or debug payloads.

---

## Implementation Pseudocode

Concrete shapes — port the prototype's visual structure but bind it to the REAL
state in `UsersRolesPage.tsx` (`users`, `roles`, `filteredUsers`, `query`,
`roleFilter`, `statusFilter`, `selectedUserId`, `isLoading`, `error`, `notice`,
`canPermission`, `adminUsers`, `roleUsageCounts`). **Keep all existing hooks,
effects, handlers, the `SplitShell` role editor, and the partial-read fallbacks
untouched**; only the returned JSX + child class names change.

### 1) Header + tab strip (`UsersRolesPage.tsx` — JSX only)

```tsx
// PORT layout from prototype pages/admin/UsersRolesPage.tsx:
//   PageHeader -> Tabs(members/invitations) -> StatCard row -> FilterBar -> DataTable.
// Real PageHeader already exists at @/ui/shared/PageHeader — keep its title
// ("Users & Roles") + the RBAC-gated "Invite User" action button.
<PageHeader
  title="Users & Roles"
  actions={canPermission("users:write")
    ? <Button onClick={openInvite} className="gap-1.5"><UserPlus className="size-4" /> Invite User</Button>
    : null}
/>

// Tabs use the REAL core Tabs API (core/admin/components/ui/tabs.tsx): the
// composed `Tabs`/`TabsList`/`TabsTrigger` shadcn shape, NOT the prototype's
// `items`/`variant="underline"` props. The underline look is the `line` variant
// on `TabsList` (the real component names it `line`, not `underline`). Drive REAL
// state — DO NOT add a new fetch. If a members/invitations split is desired,
// derive it render-time from the loaded users (status === "pending" === invited);
// otherwise keep the single members view and only restyle. Counts come from real
// arrays (UserStatus is "active" | "inactive" | "pending"):
const memberCount  = users.filter((u) => u.status !== "pending").length;
const inviteCount  = users.filter((u) => u.status === "pending").length;
<Tabs value={tab} onValueChange={setTab}>
  <TabsList variant="line">
    <TabsTrigger value="members">Members <Badge variant="soft">{memberCount}</Badge></TabsTrigger>
    <TabsTrigger value="invitations">Invitations <Badge variant="soft">{inviteCount}</Badge></TabsTrigger>
  </TabsList>
</Tabs>
// `tab` is a new useState (lazy init "members") — render-time filtering only,
// NO setState-in-effect (obey eslint react-hooks rules).
```

### 2) Stat row (derived from REAL data — never fabricated)

```tsx
// Derive counts with useMemo from the real `users` array. NO fake "+4" deltas
// unless a real trend source exists; omit `delta`/`spark` when there is none.
const userStats = useMemo(() => ({
  total: users.length,
  active: users.filter((u) => u.status === "active").length,
  pending: inviteCount,
}), [users, inviteCount]);
<div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
  <StatCard label="Total users"     value={String(userStats.total)}   icon={<Users />} />
  <StatCard label="Active"          value={String(userStats.active)}  icon={<UserCheck />} />
  <StatCard label="Pending invites" value={String(userStats.pending)} icon={<MailPlus />} />
</div>
// StatCard is the TASK-479-06-L02 shared pattern. Pass no spark/delta when absent.
```

### 3) DataTable columns (avatar / role / status / 2FA)

```tsx
// Restyle the list the page ACTUALLY renders — `UserList.tsx` (UsersRolesPage
// imports `UserList`, not the unmounted/legacy `UsersTable.tsx`) — or render via
// the shared DataTable, using the REAL UserSummary fields. Real UserSummary is
// { id, name, email, roleIds: string[], status: "active"|"inactive"|"pending",
//   lastActive, mfaEnabled? } — there is NO `roleName` / `twoFactorEnabled`.
// Build a role-name lookup from the loaded `roles` (exactly as UserList.tsx does):
const roleMap = new Map(roles.map((r) => [r.id, r.name]));
const columns: Column<UserSummary>[] = [
  { key: "user", header: "User", render: (u) => (
      <span className="flex items-center gap-3">
        <Avatar size="sm">                               {/* components/ui/avatar: size is "default"|"sm"|"lg" — no `name`/`md` prop */}
          <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{u.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
        </span>
      </span>) },
  // Role badge respects partial-read: when roles:read is denied, render the
  // existing "role hidden" affordance (roleDetailsUnavailableReason) — do NOT
  // expose role names the user can't read. Names derive from u.roleIds via roleMap.
  { key: "role", header: "Role", render: (u) =>
      canPermission("roles:read")
        ? <Badge variant="soft">{u.roleIds.map((id) => roleMap.get(id) ?? id).join(", ") || "—"}</Badge>
        : <span className="text-xs text-muted-foreground" title={roleDetailsUnavailableReason}>Hidden</span> },
  { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
  { key: "twoFactor", header: "2FA", render: (u) =>
      u.mfaEnabled
        ? <Badge variant="success" className="gap-1"><ShieldCheck className="size-3" /> Enabled</Badge>
        : <Badge variant="secondary">Off</Badge> },
  { key: "actions", header: "", align: "right", render: (u) =>
      canPermission("users:write")
        ? <RowActions user={u} onEdit={...} onDisable={...} onDelete={...} />   // existing handlers
        : null },
];
// Row click keeps the existing UserDetailsDrawer open behavior (selectedUserId).
// NOTE: `mfaEnabled` exists on UserSummary but `mapUserSummary` currently hard-codes
// it to `false`, so the "Enabled" badge will not appear until that mapper is wired to
// a real source — bind to the real field, do not fabricate an "Enabled" state. Role
// names come from `u.roleIds` resolved against the loaded `roles` — never invent a
// `roleName` field; do not add a new fetch.
```

### 4) FilterBar + drawer chrome

```tsx
// UserFilters.tsx -> restyle to the prototype FilterBar look (search input with
// leading icon, role/status Selects in rounded-xl bordered pills, violet active
// state). KEEP the controlled props (query/roleFilter/statusFilter + onChange)
// and the roleFilterUnavailableReason gating exactly as today.
// UserDetailsDrawer.tsx + InviteUserDialog.tsx -> soft rounded-2xl panels, violet
// primary actions; every onSave/onInvite/onReset/onDelete prop + async-result UI
// stays identical — only spacing, radii, shadow, accent change.
```

**Data flow:** unchanged. The page loads via its existing
`listAdminUsers`/`listAdminRoles`/`listPermissionCatalog` flow → `users`/`roles`
→ `filteredUsers` (query+roleFilter+statusFilter) → DataTable; `tab`, stat
counts, and member/invite splits are pure render-time derivations of `users`
(no new fetch, no setState-in-effect). The `SplitShell` role editor pane is
preserved as-is.

**Error handling:** unchanged — keep the existing `Alert` blocks for `error` /
`notice`, the "Loading users and roles" state, the partial-read banners, and the
"last admin" guard. The restyle must not swallow or relocate any error surface.

**React-hooks / cache rules to honor (call out in PR):** `tab` is lazy-init
`useState`; stat counts and member/invite splits are `useMemo` derivations (no
sync setState in effects); no mount-force refetch added; no dirty-state overwrite
of in-flight edits; nav/actions stay on `AdminLink`/existing handlers — do not
hand-build any href.

**Regression-test shape (delivered in L05):** table renders one row per loaded
user with avatar+email, role/status/2FA badges; tab counts match real arrays;
stat row reflects derived counts (no fabricated deltas); partial-read mode hides
role names; invite button is gated by `users:write`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/users-roles.test.tsx tests/vitest/ui/users-table.test.tsx tests/vitest/ui-integration/users.test.tsx tests/vitest/authUi/usersUi.test.tsx`
- The new restyle suite from L05 (`tests/vitest/ui-integration/admin-screens-restyle.test.tsx`).
- Manual: light + dark toggle on `/admin/users`; confirm tabs, stat row, table
  rows, filtering, the details drawer, invite dialog, and partial-read modes all
  behave as before.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-27-L01`.
- `_docs/RBAC_SPEC.md` — only if a user-visible label changes (e.g. tab labels);
  document no behavior change.
