# TASK-226-01: Product Brand Rename Inventory
# FileName: TASK-226-01_Product_Brand_Rename_Inventory.md

**Priority:** High
**Category:** Branding + Runtime Defaults + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-226
**Status:** To Do

---

## Overview

Replace product-facing `Nextless` branding with `Coderso` before moving the
advanced module IA. This subtask owns the product name, package/default copy,
runtime defaults, email/webhook naming, admin/auth copy, widget starter copy,
and test fixtures that assert these defaults.

Do not use a blind global replacement. Some lowercase `nextless.*` keys and
`data-nextless-*` attributes are persistence/runtime compatibility contracts and
need explicit migration handling or a documented temporary allowlist.

This subtask starts only after the prepared inventory in
`TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md` has been verified against
the current checkout. Every `Nextless`/`nextless` occurrence owned by product
rename work must be present in that inventory, including docs, changelogs, task
files, prototypes, fixture copy, package metadata, public DOM selectors,
localStorage keys, and legacy integration names.

## Sub-Tasks

- [ ] TASK-226-01-01: Package, Runtime Defaults, and Integration Headers
- [ ] TASK-226-01-02: Admin UI, Widgets, Docs, and Fixture Copy

## Files to Change

The list below is not the full occurrence inventory. It is the implementation
seed for product rename work. The authoritative file/line list is
`TASK-226-00-01_Rebrand_Occurrence_Coverage_Table.md`.

- `package.json`
- `core/package.json`
- `README.md`
- `docs/README.md`
- `docs/getting-started/admin-orientation.md`
- `core/admin/index.html`
- `core/services/settings/settingsService.ts`
- `core/services/email/emailSettingsService.ts`
- `core/services/forms/formAutomationRunnerCore.ts`
- `core/services/webhooks/deliveryService.ts`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/shared/SidebarNav.tsx`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/auth/*`
- `core/admin/ui/setup/*`
- `core/admin/ui/settings/BrandingCard.tsx`
- `core/admin/ui/settings/GeneralSettingsPage.tsx`
- `core/admin/ui/pages/*`
- `core/widgets/core/hero.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/footer.tsx`
- `core/services/assistant/assistantService.ts`
- `core/services/assistant/operationPolicy/providerGuidance.ts`
- Matching tests listed in `TASK-226`.
- Every additional product-rename row assigned by the TASK-226-00 inventory.

## Security Contract

- Visibility: product defaults, internal admin UI, email/webhook integration
  metadata, and docs.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: no new write endpoint in this subtask.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged unless webhook header parsing needs an
  explicit compatibility schema.
- Anti-abuse:
  - do not remove legacy webhook headers before downstream consumers have a
    compatibility path,
  - do not drop existing localStorage/preferences without reading legacy keys,
  - do not place secrets or privileged settings in renamed browser storage keys.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- `bun run test:vitest -- tests/vitest/admin/settingsClient.test.ts tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/navigation.test.tsx`
- `bun test tests/unit/settings/settingsService.test.ts tests/unit/email/emailSettingsService.test.ts tests/unit/webhooks/deliveryService.test.ts tests/unit/tools/importExport.test.ts tests/unit/integrations/integrationsService.test.ts`
- Residual scan:
  - re-run the full TASK-226-00 scan, not a reduced source-only scan,
  - update the inventory with remaining product-owned rows,
  - any surviving product-owned `Nextless`/`nextless` match must be moved to
    the TASK-226-03-02 residual allowlist with owner, reason, and removal
    condition.

## Documentation Updates Required

- `README.md`
- `docs/README.md`
- `docs/getting-started/admin-orientation.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Product-facing defaults and UI copy say Coderso.
2. Compatibility-sensitive lowercase keys have explicit migration or allowlist
   notes.
3. Webhook header changes preserve signature/security behavior.
4. Tests assert the new defaults and legacy compatibility where applicable.
5. TASK-226-00 shows no unassigned product-rename matches after this subtask.
