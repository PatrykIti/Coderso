# TASK-479-28-L06: Email, Storage & Integrations Restyle
# FileName: TASK-479-28-L06-Email-Storage-Integrations-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Settings / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06, TASK-479-28-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-28

---

## Overview

Restyle the **Email** page (`EmailSettingsPage.tsx` + `SmtpCard.tsx`,
`EmailLogsDrawer.tsx`), the **Storage** page (`StorageSettingsPage.tsx` +
`StorageProviderCard.tsx`), and the **Integrations** page (`IntegrationsPage.tsx` +
`IntegrationCard.tsx`, `IntegrationDrawer.tsx`, `IntegrationRequestDialog.tsx`) to
the prototype: `SettingsSection` groups for Email (Sender / SMTP / Test), a
selectable **provider card grid** + credentials + CDN + usage for Storage, and a
two-column **integration card grid** for Integrations. All credentials stay
**backend-only**; the test/save/connect flows are preserved.

- **Goal:** Give Email/Storage/Integrations the prototype's soft look (grouped
  SettingsSections, selectable provider cards with a check badge + `bg-primary-soft`
  icon chip, integration cards with tone-tinted chips + Connected badge + Manage/
  Connect) while preserving `getEmailSettings`/`updateEmailSettings`/`sendTestEmail`/
  `listEmailLogs` (incl. the real provider selector `smtp`/`resend`),
  `getStorageSettings`/`updateStorageSettings`, and `listIntegrations`/
  `updateIntegration`/`requestIntegration`.
- **Owning module/service:** `core/admin/ui/settings/EmailSettingsPage.tsx`
  (+ `SmtpCard.tsx`, `EmailLogsDrawer.tsx`), `StorageSettingsPage.tsx`
  (+ `StorageProviderCard.tsx`), `IntegrationsPage.tsx` (+ `IntegrationCard.tsx`,
  `IntegrationDrawer.tsx`, `IntegrationRequestDialog.tsx`), backed by `emailClient`
  (`getEmailSettings`, `updateEmailSettings`, `sendTestEmail`, `listEmailLogs`,
  `type EmailSettingsResponse`/`EmailDeliveryLog`/`EmailProviderId` =
  `smtp|resend`), `settingsClient` (`getStorageSettings`, `updateStorageSettings`,
  `type StorageDriver` = `local|s3|azure` — there is no `storageSettingsClient`;
  `StorageProviderId` is re-exported by `StorageProviderCard.tsx`), and
  `integrationsClient` (`listIntegrations`, `updateIntegration`,
  `requestIntegration`, `type IntegrationRecord`).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md` (SMTP password, storage
  secret/access keys, integration credentials all backend-only),
  `_docs/DESIGN_TOKENS.md`; prototype sources
  `_docs/_PROTOTYPE/src/pages/settings/{EmailSettingsPage,StorageSettingsPage,IntegrationsPage}.tsx`,
  patterns `_docs/_PROTOTYPE/src/components/patterns/SettingsSection.tsx`,
  primitives `_docs/_PROTOTYPE/src/components/ui/{card,input,select,switch,badge,button,progress}.tsx`.
- **Out of scope:** No change to email/storage/integration schemas, the provider
  model, the SMTP/test/connect endpoints, or the credentials boundary. The
  prototype's mock SMTP values, "6.2 GB of 50 GB" usage meter, fixed integration
  list, and tone colors are illustrative — bind to the REAL settings + the real
  `listIntegrations` result; render a usage meter only from a real value.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

**Credential handling:** SMTP password, storage secret/access keys, and
integration credentials are write-only/masked and **backend-only** — the pages
already never read a stored credential back. The restyle MUST keep that: no
fetched secret into client state, cache, logs, or debug payloads; an empty
credential field means "unchanged". Keep the integration secret handling already
covered by `integration-drawer-secrets` behavior.

---

## Implementation Pseudocode

All three targets: keep the ENTIRE data/handler block (clients, snapshot/`isDirty` +
`useRegisterSettingsDirty` where present, `useMemo`/`useEffect` loads that flip
loading only at the async boundary, the drawers/dialogs, `sendTestEmail`, the
provider selection, the connect/request flows). Only the returned JSX changes.

```tsx
// EmailSettingsPage.tsx — RENDER ONLY. Port the prototype Email sections.
<div className="divide-y divide-border">
  <SettingsSection title="Provider" description="Choose how outbound email is sent.">
    {/* KEEP the real provider selector — EmailProviderId = smtp | resend, bound to
        the existing provider state (setProvider). Render the two existing
        ProviderOption choices: "Manual SMTP" and "Resend". Do NOT omit this. */}
  </SettingsSection>
  <SettingsSection title="Sender" description="How outgoing messages are signed.">
    {/* from-name / from-email Inputs — same bindings */}
  </SettingsSection>
  {provider === "smtp" ? (
    <SettingsSection title="SMTP" description="Connect your delivery server.">
      <SmtpCard … /> {/* keep host/port/user + PASSWORD (write-only) + secure/encryption bindings */}
    </SettingsSection>
  ) : (
    <SettingsSection title="Resend" description="Use the encrypted Resend API key.">
      {/* the Resend key is an Integrations secret — keep the existing AdminLink to
          /admin/settings/integrations ("Configure Resend") + the configured/status
          Badge from settings.resend; NO key input on this page */}
    </SettingsSection>
  )}
  <SettingsSection title="Test" description="Verify your configuration end to end.">
    <Button variant="outline" onClick={handleSendTest}><Send className="size-4" /> Send test email</Button>
    {/* last-test result Badge from real state; "View logs" -> EmailLogsDrawer(listEmailLogs) */}
  </SettingsSection>
</div>
```

```tsx
// StorageSettingsPage.tsx — RENDER ONLY. Port the selectable provider card grid.
<div className="divide-y divide-border">
  <SettingsSection title="Provider" description="Choose where uploads are stored.">
    <div className="grid gap-3 sm:grid-cols-3">
      {PROVIDERS.map((p) => {           // PROVIDERS = real StorageProviderId set: local | s3 | azure
        const selected = form.provider === p.id;
        return (
          <Card key={p.id} onClick={() => setProvider(p.id)}
            className={cn("relative cursor-pointer p-4 hover:shadow-card", selected ? "ring-2 ring-primary" : "")}>
            {selected ? <span className="absolute right-3 top-3 …bg-primary text-primary-foreground"><Check className="size-3" /></span> : null}
            <span className={cn("flex size-10 items-center justify-center rounded-xl",
                                selected ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground")}>
              <p.icon className="size-5" /></span>
            <div className="mt-3 text-sm font-medium">{p.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{p.desc}</div>
          </Card>
        );
      })}
    </div>
  </SettingsSection>
  <SettingsSection title="Credentials" description="Access details for your storage bucket.">
    {/* bucket/region + access key + SECRET key (write-only password) — same bindings */}
  </SettingsSection>
  <SettingsSection title="CDN" description="Serve media through a content delivery network.">
    {/* cdn base URL Input + serve-via-CDN Switch — same bindings */}
  </SettingsSection>
  {/* Usage: render Progress ONLY from a real usage value; otherwise omit the mock meter */}
</div>
```

```tsx
// IntegrationsPage.tsx — RENDER ONLY. Port the integration card grid.
<SettingsSection title="Available integrations" description="Connect the tools your team already uses.">
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {filtered.map((item) => (        // filtered = real listIntegrations() filtered by the search box
      <IntegrationCard key={item.id} record={item}
        onManage={() => openDrawer(item)} onToggle={(v) => updateIntegration(item.id, { enabled: v })}
        onConnect={() => openDrawer(item)} /> /* restyled: tone chip + Connected Badge + Manage/Connect */
    ))}
  </div>
</SettingsSection>
{/* keep the IntegrationsSearch box, IntegrationDrawer (credentials write-only),
    and IntegrationRequestDialog (request a new integration). Use the REAL iconMap
    accents, not the prototype's mock tone strings, where they map. */}
```

**Data flow:** Email — settings hydrate via `getEmailSettings`, snapshot/`isDirty`
→ `updateEmailSettings`; `sendTestEmail` + `listEmailLogs` (drawer) on demand.
Storage — `getStorageSettings` hydrate → provider selection + credentials →
storage save. Integrations — `listIntegrations` load → search filter (`useMemo`) →
`updateIntegration`/`requestIntegration`. Loads flip loading only at the async
boundary; no mount-force refetch loop; no dirty overwrite.

**Error handling:** unchanged — keep `isApiClientError` mapping, the Email
`ConfirmActionDialog`, the test-email result + error surfaces, storage Alerts, and
the integration request/connect error handling.

**Regression-test shape (see L07):** render `<EmailSettingsPage />` with mocked
`emailClient`; assert the Provider selector (`smtp`/`resend`) + Sender/SMTP/Test
sections, that the SMTP password field is write-only/masked and the `resend` branch
delegates the key to Integrations (no key input), Send test calls `sendTestEmail`,
and logs open `EmailLogsDrawer`. Render
`<StorageSettingsPage />`; assert the 3 provider cards (local/s3/azure), selecting
one updates the form, and the secret key field is masked. Render
`<IntegrationsPage />` with mocked `listIntegrations`; assert a card per real
integration, the search filters, Manage opens the drawer, and the toggle calls
`updateIntegration` — with no credential leaked into the DOM.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/email-settings.test.tsx tests/vitest/ui-integration/emailSettings.test.tsx tests/vitest/ui/storage-settings.test.tsx tests/vitest/ui/integrations.test.tsx tests/vitest/ui-integration/integrations.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx`

`integration-drawer-secrets.test.tsx` MUST stay green (credential boundary). Keep
behavioral assertions (save/dirty, send-test, provider select, connect/toggle,
credential masking); update literal chrome assertions where the SettingsSection /
card grid intentionally changes. State in the summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-28-L06`.
- `_docs/SECURITY_SPEC.md` — only if a documented credential UX affordance moves
  (no boundary change expected; record the provider-card + masked-credential
  presentation if the spec enumerates these screens).
