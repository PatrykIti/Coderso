# TASK-226-01-01: Package, Runtime Defaults, and Integration Headers
# FileName: TASK-226-01-01_Package_Runtime_Defaults_and_Integration_Headers.md

**Priority:** High
**Category:** Branding + Runtime Defaults + Integration Security
**Estimated Effort:** Medium
**Dependencies:** TASK-226-01
**Status:** To Do

---

## Overview

Rename the product identity in package metadata, runtime defaults, default email
copy, form automation sender fallback, webhook delivery headers, and storage keys
that are product-visible or externally documented.

This leaf must distinguish product branding from compatibility identifiers.
Existing persisted keys such as `nextless.adminThemeTokens` or webhook consumers
using `X-Nextless-*` cannot be deleted without a read/emit compatibility plan.

## Sub-Tasks

- [ ] Rename package metadata where the package id is product-facing.
- [ ] Change the default `site.name` from `Nextless` to `Coderso`.
- [ ] Rename fallback email sender, SMTP test subject, and SMTP test body.
- [ ] Rename form automation fallback sender.
- [ ] Add Coderso webhook delivery headers and preserve legacy `X-Nextless-*`
  headers during the compatibility window.
- [ ] Add localStorage key migration for admin theme/nav/sidebar keys.
- [ ] Update tests and docs for every default changed here.

## Files to Change

| File | Current line(s) | Required change |
|------|-----------------|-----------------|
| `package.json` | 2 | Rename `"name": "nextless"` if the repo package id is part of the product contract. |
| `core/package.json` | 2 | Rename `"@nextless/core"` to the chosen Coderso workspace scope or document a technical-only exception. |
| `core/services/settings/settingsService.ts` | 50 | Default `"site.name"` becomes `"Coderso"`. |
| `core/services/email/emailSettingsService.ts` | 394, 406, 411 | Replace sender fallback and SMTP test copy. |
| `core/services/forms/formAutomationRunnerCore.ts` | 235 | Replace fallback sender product name. |
| `core/services/webhooks/deliveryService.ts` | 52-60 | Emit `X-Coderso-*` headers and keep legacy `X-Nextless-*` aliases with tests. |
| `core/admin/ui/layouts/AdminShell.tsx` | 45 | Migrate `nextless.admin.navGroupState` to Coderso/Advanced key with legacy read. |
| `core/admin/ui/shared/SidebarNav.tsx` | 11 | Migrate sidebar scroll storage key with legacy read. |
| `core/admin/app/AdminApp.tsx` | 404, 697, 825, 835, 851 | Migrate theme token storage/style ids without losing existing user themes. |

## Security Contract

- Visibility: internal admin settings, email/webhook integration metadata, and
  browser-local admin preferences.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - webhook HMAC behavior must remain unchanged,
  - legacy webhook headers must not create duplicate signature ambiguity,
  - browser storage migration must not expose secrets or privileged values.

## Pseudocode

```ts
const WEBHOOK_BRAND_HEADERS = {
  event: ["X-Coderso-Event", "X-Nextless-Event"],
  delivery: ["X-Coderso-Delivery", "X-Nextless-Delivery"],
  attempt: ["X-Coderso-Attempt", "X-Nextless-Attempt"],
  signature: ["X-Coderso-Signature", "X-Nextless-Signature"],
  timestamp: ["X-Coderso-Timestamp", "X-Nextless-Timestamp"],
};

for (const header of WEBHOOK_BRAND_HEADERS.signature) {
  headers.set(header, signature.signature);
}
```

```ts
const readMigratedStorage = (nextKey: string, legacyKey: string) => {
  const current = window.localStorage.getItem(nextKey);
  if (current) return current;
  const legacy = window.localStorage.getItem(legacyKey);
  if (legacy) window.localStorage.setItem(nextKey, legacy);
  return legacy;
};
```

## Testing Requirements

- `bun test tests/unit/settings/settingsService.test.ts`
- `bun test tests/unit/email/emailSettingsService.test.ts`
- `bun test tests/unit/webhooks/deliveryService.test.ts`
- `bun run test:vitest -- tests/vitest/admin/settingsClient.test.ts tests/vitest/admin/adminApp.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ADMIN_NAVIGATION.md` if storage key docs change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. New installs default to Coderso brand values.
2. Existing admin preferences survive the storage-key migration.
3. Webhook deliveries include Coderso headers and legacy Nextless aliases.
4. Tests prove both new defaults and compatibility behavior.
