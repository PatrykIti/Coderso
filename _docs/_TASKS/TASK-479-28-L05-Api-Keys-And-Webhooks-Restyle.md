# TASK-479-28-L05: API Keys & Webhooks Restyle
# FileName: TASK-479-28-L05-Api-Keys-And-Webhooks-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Settings / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06, TASK-479-28-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-28

---

## Overview

Restyle the **API keys** page (`ApiKeysPage.tsx` + `ApiKeysTable.tsx`,
`ApiKeyDialog.tsx`, `ApiKeySecretDialog.tsx`) and the **Webhooks** page
(`WebhooksPage.tsx` + `WebhooksTable.tsx`, `WebhookDrawer.tsx`) to the prototype:
a "keep your keys secret" warning banner over a `rounded-2xl` keys table with
masked keys + scope badges, and webhook **endpoint cards** with event badges +
last-delivery status + a recent-deliveries table. Secrets stay **backend-only**;
the create/rotate/revoke + create/test/delete flows are preserved.

- **Goal:** Give API keys + Webhooks the prototype's soft look (icon-chip key
  rows, masked `code` chips with copy, scope `Badge`s, endpoint cards with
  `StatusBadge` + delivery health + a deliveries `DataTable`) while preserving
  `listApiKeys`/`createApiKey`/`rotateApiKey`/`revokeApiKey`, the one-time secret
  reveal (`ApiKeySecretDialog`), and `listWebhooks`/`createWebhook`/`updateWebhook`/
  `deleteWebhook`/`testWebhook`.
- **Owning module/service:** `core/admin/ui/settings/ApiKeysPage.tsx`
  (+ `ApiKeysTable.tsx`, `ApiKeyDialog.tsx`, `ApiKeySecretDialog.tsx`,
  `apiKeyScopes.ts`) and `core/admin/ui/settings/WebhooksPage.tsx`
  (+ `WebhooksTable.tsx`, `WebhookDrawer.tsx`), backed by `apiKeysClient`
  (`listApiKeys`, `createApiKey`, `rotateApiKey`, `revokeApiKey`,
  `type ApiKeyRecord`) and `webhooksClient` (`listWebhooks`, `createWebhook`,
  `updateWebhook`, `deleteWebhook`, `testWebhook`, `type WebhookRecord`).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md` (key plaintext shown once,
  never re-fetched; webhook signing secret backend-only), `_docs/DESIGN_TOKENS.md`;
  prototype sources `_docs/_PROTOTYPE/src/pages/settings/{ApiKeysPage,WebhooksPage}.tsx`,
  patterns `_docs/_PROTOTYPE/src/components/patterns/{DataTable,StatusBadge}.tsx`,
  primitives `_docs/_PROTOTYPE/src/components/ui/{card,badge,button,switch}.tsx`.
- **Out of scope:** No change to key/webhook schemas, scope model (`apiKeyScopes`),
  the signing/secret boundary, or the create/rotate/revoke/test/delete endpoints.
  The prototype's mock key rows, deliveries, and "2m ago" times are illustrative —
  render only the real lists. The prototype's plaintext `sk_live_…` strings are
  MOCK; real masked keys come from `ApiKeyRecord.prefix` and are never the full
  secret.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

**Secret handling is the core constraint here.** The full API-key plaintext is
shown EXACTLY ONCE via `ApiKeySecretDialog` immediately after create/rotate and is
never re-fetched or persisted to client state/cache/logs. The table shows only the
masked `prefix...` form (`describeApiKey`). The webhook signing secret stays
backend-only (write-only in `WebhookDrawer`, never read back). The restyle MUST NOT
add any code path that surfaces a stored secret. Keep the revoke/rotate
`ConfirmActionDialog`s.

---

## Implementation Pseudocode

Both targets: keep the ENTIRE state/handler block (clients, `items` list state, the
`useEffect` load that flips `isLoading` only at the async boundary, `useMemo`
derivations, the dialogs/drawers, `PendingApiKeyAction`, the confirm flows). Only
the returned JSX (warning banner, table/card chrome) changes.

```tsx
// ApiKeysPage.tsx — RENDER ONLY. Port the prototype ApiKeysPage.
<SettingsShell activeHref="/admin/settings" sidebar={<SettingsSidebar activeId="api-keys" />}
               breadcrumbs={["Settings","API Keys"]} showSearch={false}>
  <div className="mx-auto w-full max-w-5xl px-6 py-10 flex flex-col gap-4">
    <Card className="flex items-start gap-3 bg-warning-soft p-4 text-warning shadow-none">
      <ShieldAlert className="mt-0.5 size-5" />
      <div className="text-sm"><span className="font-medium">Keep your keys secret.</span> …</div>
    </Card>
    <div className="flex justify-end">
      <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
        <Plus className="size-4" /> Create key
      </Button>
    </div>
    <ApiKeysTable items={items} isLoading={isLoading}
      onRotate={(k) => setPending({ kind: "rotate", key: k })}
      onRevoke={(k) => setPending({ kind: "revoke", key: k })} /> {/* restyled rounded-2xl */}
  </div>
  {/* keep ApiKeyDialog (create -> on success opens ApiKeySecretDialog ONCE) +
      ApiKeySecretDialog (one-time reveal) + the rotate/revoke ConfirmActionDialog */}
</SettingsShell>
```

```tsx
// ApiKeysTable.tsx — restyle rows: size-9 rounded-xl bg-primary-soft KeyRound chip +
// name, a masked code chip (row.prefix + "...") with a Copy button, scope Badges from
// apiKeyScopes, created/lastUsed muted text, and a destructive Revoke. Keep all callbacks.
// The masked value is the REAL prefix — never the full secret.
```

```tsx
// WebhooksPage.tsx — RENDER ONLY. Port the prototype WebhooksPage endpoint cards.
<div className="flex flex-col gap-3">
  {items.map((wh) => (
    <Card key={wh.id} className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Webhook className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="truncate font-mono text-sm font-medium">{wh.url}</code>
            <StatusBadge status={wh.enabled ? "active" : "inactive"} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">{wh.events.map((e) => <Badge key={e} variant="outline">{e}</Badge>)}</div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            {/* last-delivery health from the REAL record (formatRelative + ok/fail) */}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(wh)}><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => confirmDelete(wh)}><Trash2 /></Button>
          <Switch checked={wh.enabled} onCheckedChange={(v) => updateWebhook(wh.id, { enabled: v })} className="ml-1" />
        </div>
      </div>
    </Card>
  ))}
</div>
{/* "Add endpoint" Button opens WebhookDrawer (create). Test endpoint -> testWebhook.
    Recent deliveries: render the prototype's DataTable ONLY from real delivery data the
    record/endpoint exposes; if the list has no per-endpoint delivery log, OMIT the table
    rather than fabricate the mock DELIVERIES rows. */}
```

**Data flow:** both pages — `useEffect` loads `listApiKeys`/`listWebhooks` into
`items`, flips `isLoading` at the async boundary; mutations
(create/rotate/revoke/update/delete/test) refresh the list. Create-key success
hands the one-time plaintext to `ApiKeySecretDialog` and never stores it. No
mount-force refetch loop beyond the existing single load.

**Error handling:** unchanged — keep `toApiKeyErrorMessage`/`isApiClientError`
mapping, the rotate/revoke + delete `ConfirmActionDialog`s, and the per-action
error surfaces.

**Regression-test shape (see L07):** render `<ApiKeysPage />` with mocked
`apiKeysClient`; assert the warning banner, a masked `prefix...` chip per key (never
a full secret in the DOM), scope badges, that Create opens `ApiKeyDialog`, and that
a successful create surfaces the one-time secret via `ApiKeySecretDialog` exactly
once. Render `<WebhooksPage />` with mocked `webhooksClient`; assert an endpoint
card per webhook with event badges + `StatusBadge`, that the enable `Switch` calls
`updateWebhook`, Add opens `WebhookDrawer`, and delete is confirmed.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/api-keys.test.tsx tests/vitest/ui/webhooks.test.tsx tests/vitest/ui-integration/webhooks.test.tsx`

Keep behavioral assertions (create/rotate/revoke, one-time secret, create/test/
delete webhook, enable toggle, secret masking); update literal chrome assertions
where the table→card chrome intentionally changes. State in the summary if any
suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-28-L05`.
- `_docs/SECURITY_SPEC.md` — only if a documented key/secret UX affordance moves
  (no boundary change expected; record the masked-table + one-time-reveal
  presentation if the spec enumerates these screens).
