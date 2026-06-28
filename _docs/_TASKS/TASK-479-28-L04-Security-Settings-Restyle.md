# TASK-479-28-L04: Security Settings (+ IP Allowlist, Sessions, Login Alerts) Restyle
# FileName: TASK-479-28-L04-Security-Settings-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Settings / Security / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06, TASK-479-28-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-28

---

## Overview

Restyle the **Security** settings cluster to the prototype: the main Security page
(`SettingsSection`s for Authentication / Login protection + quick-link cards to the
sub-pages), the **IP allowlist** page (enable card + warning banner + add form +
table), the **Sessions** page (device session cards + revoke), and the **Login
alerts** page (alert toggles + channels + recent-alerts list). All real security
actions, validation, and RBAC stay intact.

- **Goal:** Give the security screens the prototype's soft/violet look —
  `SettingsSection` groups, `bg-primary-soft` icon chips, quick-link cards with
  `ChevronRight`, a `bg-warning-soft` lockout banner, and rounded session/alert
  cards — while preserving `getSecuritySettings`/`updateSecuritySettings`, the
  IP-allowlist CRUD (`useIpAllowlist`), the sessions CRUD
  (`listSessions`/`revokeSession`/`revokeAllSessions`), the login-alerts form,
  validation, dirty-state, and RBAC gating.
- **Owning module/service:** `core/admin/ui/settings/SecuritySettingsPage.tsx`,
  `IpAllowlistPage.tsx` (+ `IpAllowlistTable.tsx`, `IpAllowlistDrawer.tsx`,
  `useIpAllowlist.ts`), `SessionsPage.tsx` (+ `SessionsTable.tsx`),
  `LoginAlertsPage.tsx` (+ `LoginAlertsCard.tsx`), backed by `settingsClient`
  (`getSecuritySettings`, `updateSecuritySettings`,
  `type SecuritySettingsResponse`), `sessionsClient` (`listSessions`,
  `revokeSession`, `revokeAllSessions`, `type SessionRecord`), and
  `securitySettingsUtils`.
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/DESIGN_TOKENS.md`;
  prototype sources `_docs/_PROTOTYPE/src/pages/settings/{SecuritySettingsPage,
  IpAllowlistPage,SessionsPage,LoginAlertsPage}.tsx`, patterns
  `_docs/_PROTOTYPE/src/components/patterns/{SettingsSection,DataTable,StatusBadge}.tsx`,
  primitives `_docs/_PROTOTYPE/src/components/ui/{card,switch,select,input,badge,button}.tsx`.
- **Out of scope:** No change to the security settings schema/validation
  (`securitySettingsSchema`), the session-revocation endpoints, the IP-allowlist
  CRUD/validation, the 2FA/rate-limit/lockout policy model, or RBAC. The
  prototype's example IP rows, sessions, and recent alerts are MOCK — render only
  the real lists; preserve the real "current device cannot be revoked" + lockout
  warnings. The `SessionsPage`/`LoginAlertsPage` "not wired yet" tab notices
  (TASK-359-07-owned) stay as-is.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

Security actions are destructive (revoke session/all, remove IP rule, change
auth/lockout policy). The restyle MUST keep every confirm dialog, the
"enabling the allowlist may lock you out" warning, the "this device cannot be
revoked" guard, and the existing RBAC/permission gating. No secret is rendered on
these screens; keep it that way.

---

## Implementation Pseudocode

All four targets: keep the ENTIRE data/handler block (clients, snapshot/`isDirty` +
`useRegisterSettingsDirty`, validation, confirm dialogs, the cache hydrate, and the
`useIpAllowlist`/sessions effects that flip loading only at the async boundary).
Only the returned JSX changes.

```tsx
// SecuritySettingsPage.tsx — RENDER ONLY. Port the prototype's section + quick-link cards.
<SettingsShell activeHref="/admin/settings" sidebar={<SettingsSidebar activeId="security" />}
               breadcrumbs={["Settings", "Security"]} showSearch={false}>
  <div className="mx-auto w-full max-w-4xl px-6 py-10 pb-28">
    {/* keep Alerts */}
    <div className="divide-y divide-border">
      <SettingsSection title="Authentication" description="How users prove who they are.">
        {/* require-2FA Switch row + password-policy / session-timeout Selects — same bindings */}
      </SettingsSection>
      <SettingsSection title="Login protection" description="Defend against brute-force and abuse.">
        {/* rate-limit / failed-attempt-lockout Selects + block-Tor Switch — same bindings */}
      </SettingsSection>
      <SettingsSection title="More" description="Detailed security controls and logs.">
        <div className="flex flex-col gap-3">
          {QUICK_LINKS.map((link) => (
            <AdminLink key={link.href} href={link.href} prefetch
              onClick={(e) => { if (shouldGuard(e) && !requestNavigation(link.href)) e.preventDefault(); }}>
              <Card className="flex items-center gap-4 p-4 hover:bg-accent">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <link.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{link.title}</div>
                  <div className="truncate text-sm text-muted-foreground">{link.desc}</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Card>
            </AdminLink>
          ))}
        </div>
      </SettingsSection>
    </div>
  </div>
  {/* keep the sticky save bar bound to handleSave/isDirty */}
</SettingsShell>
// QUICK_LINKS hrefs = the REAL /admin/settings/security/{ip-allowlist,sessions,login-alerts}
// resolved via AdminLink — never a hand-built <a href>.
```

```tsx
// IpAllowlistPage.tsx — keep useIpAllowlist() (entries/isLoading/error/addEntry/removeEntry),
// the IpAllowlistDrawer + IpAllowlistDrawerPanel preview, and IpAllowlistTable.
// Port the prototype: enable Card + bg-warning-soft warning banner + add form + table.
<SettingsShell activeHref="/admin/settings" sidebar={<SettingsSidebar activeId="ip-allowlist" />}
               preview={<IpAllowlistDrawerPanel readOnly />} breadcrumbs={["Settings","Security","IP Allowlist"]}>
  <div className="mx-auto w-full max-w-4xl px-6 py-10 flex flex-col gap-5">
    <Card className="flex items-center justify-between gap-4 p-5">{/* enable allowlist Switch — real binding */}</Card>
    <div className="flex items-start gap-3 rounded-2xl bg-warning-soft px-4 py-3.5 text-warning">
      <AlertTriangle className="mt-0.5 size-4" /> {/* keep the lockout warning copy */}
    </div>
    {/* add form -> keep IpAllowlistDrawer onSubmit={addEntry} (do NOT change validation) */}
    <IpAllowlistTable entries={entries} isLoading={isLoading} onRemove={removeEntry} /> {/* restyled to rounded-2xl */}
  </div>
</SettingsShell>
```

```tsx
// SessionsPage.tsx — keep listSessions/revokeSession/revokeAllSessions, resolveDeviceMeta,
// the "current device" guard, the ConfirmActionDialog, and the not-wired tab notices.
// Port the prototype: device session Cards with icon chip + "This device" Badge + Revoke.
<div className="flex flex-col gap-3">
  {sessions.map((s) => (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3.5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <s.icon className="size-5" /></span>
        <div>… {s.current ? <Badge variant="success">This device</Badge> : null} … {s.location} · {s.ip}</div>
      </div>
      {s.current ? null : <Button variant="ghost" size="sm" className="text-destructive"
                                   onClick={() => confirmRevoke(s.id)}>Revoke</Button>}
    </Card>
  ))}
</div>
// "Sign out all other sessions" Button -> revokeAllSessions behind its confirm dialog.
// SessionsTable may be re-expressed as cards OR keep the table restyled — keep all callbacks.
```

```tsx
// LoginAlertsPage.tsx — keep getSecuritySettings/updateSecuritySettings, the form state,
// LoginAlertsCard bindings, the Tabs + not-wired notices, and useRegisterSettingsDirty.
// Port: Alerts (toggle rows) + Channels (email/webhook + URL field) + Recent-alerts list.
// Render Recent alerts ONLY from real data if present; the prototype's RECENT array is MOCK —
// omit the section (or show an empty state) rather than fabricate alert rows.
```

**Data flow:** SecuritySettings + LoginAlerts — `getSecuritySettings` hydrate →
snapshot/`isDirty` → `updateSecuritySettings` on save. IP allowlist —
`useIpAllowlist()` (entries/add/remove). Sessions — `listSessions` hydrate, revoke
mutations refresh the list. No mount-force refetch loops; no dirty overwrite.

**Error handling:** unchanged — keep the `isApiClientError` mapping, every
`ConfirmActionDialog`, the allowlist `error` surfaced on the drawer, the lockout
warning banner, and the "current device cannot be revoked" guard.

**Routing:** the Security quick-link cards + any sub-page links use `AdminLink` +
`prefetch` resolved through `adminPaths`, wrapped in the dirty-navigation guard —
never a hand-built `<a href>`. Keep the existing `/admin/settings/security/...`
targets.

**Regression-test shape (see L07):** render `<SecuritySettingsPage />`; assert the
Authentication/Login-protection sections + three quick-link cards whose resolved
`/admin/settings/security/...` hrefs are present in the markup (AdminLink-rendered;
do NOT assert "no raw anchor" — `AdminLink` renders an `<a>`, so it is
unsatisfiable). Render
`<IpAllowlistPage />` with mocked `useIpAllowlist`; assert the warning banner, the
add form wired to `addEntry`, and a row per entry with Remove → `removeEntry`.
Render `<SessionsPage />` with mocked `listSessions`; assert the current session has
NO revoke control and a non-current one revokes via the confirm dialog. Render
`<LoginAlertsPage />`; assert toggles bind and Save calls `updateSecuritySettings`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/security-settings.test.tsx tests/vitest/ui-integration/security-settings.test.tsx tests/vitest/ui/security-sessions.test.tsx tests/vitest/ui/ip-allowlist.test.tsx tests/vitest/validation/securitySettingsSchema.test.ts`

`securitySettingsSchema.test.ts` MUST stay untouched (no schema change). Update
literal chrome assertions where the section/card grouping changes; keep all
behavioral assertions (save/dirty, revoke guard, allowlist add/remove, lockout
warning). State in the summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-28-L04`.
- `_docs/SECURITY_SPEC.md` — only if a documented security-UX affordance moves
  (no policy/endpoint change expected; record the quick-link card grouping if the
  spec enumerates the security screens).
