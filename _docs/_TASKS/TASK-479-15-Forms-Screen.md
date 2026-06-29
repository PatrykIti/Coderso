# TASK-479-15: Forms Screen Migration
# FileName: TASK-479-15-Forms-Screen.md

**Priority:** Medium
**Category:** Admin UI / Forms / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done
**Parent Task:** TASK-479

---

## Overview

Port the finished visual-redesign prototype for the **Forms** surfaces into the
real admin under `core/admin/ui/forms/**`. This covers four screens: the form
**list**, the form **builder**, the form **submissions** viewer, and the form
**action logs** (automation runs) viewer. The work is a **visual restyle only**
— every screen keeps its real data, form schema, validation contract, cache
wiring, dirty-state protection, RBAC gating, and canonical routing. We swap the
presentation layer (chrome, cards, tables, stat bands, rails, inspectors) to the
prototype's **soft & friendly, Notion-like** design language: warm neutral
canvas, white `rounded-2xl` cards, soft shadows, generous spacing, a **violet**
accent, and a light default with a dark toggle.

- **Goal:** Make the Forms screens match the approved prototype look while
  preserving all form schema/validation logic, the public-submit anti-abuse
  contract, cache/dirty-state contracts, RBAC gating, and canonical routing.
- **Owning module/service:** `core/admin/ui/forms/**`
  (`FormListPage.tsx`, `FormBuilderPage.tsx`, `FormSubmissionsPage.tsx`,
  `FormActionLogsPage.tsx`, plus their presentational children `FormTable.tsx`,
  `FormFilters.tsx`, `FormBulkActionsBar.tsx`, `FormCreateDrawer.tsx`,
  `FieldLibrary.tsx`, `FieldListPanel.tsx`, `FieldSettingsPanel.tsx`,
  `FormCanvas.tsx`, `FormActionsPanel.tsx`, `FormSettingsPanel.tsx`,
  `FormRuntimePreviewDialog.tsx`, `FormRowActions.tsx`) backed by
  `core/admin/services/formsClient.ts`, the form domain helpers in
  `core/services/forms/*` (`formSettings.ts`, `formPresets.ts`,
  `formActionsContract.ts`, `formRuntimeResolver.ts`), and the
  `core/admin/ui/forms/hooks/useForms.ts` cache hook.
- **Source-of-truth docs:** `_docs/FORMS_SPEC.md` (forms schema + automation +
  public-submit contract), `_docs/DESIGN_TOKENS.md`, `_docs/TESTING_STRATEGY.md`,
  and the prototype under
  `_docs/_PROTOTYPE/src/pages/advanced/{FormsPage,FormBuilderPreview,FormSubmissionsPage}.tsx`
  plus shared primitives in `_docs/_PROTOTYPE/src/components/{ui,patterns,shell}`
  and tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No change to the form field/schema model, the public-submit
  endpoint, the automation/action runner, the form runtime widget, the
  `cacheKeys`/TTL, or any payload schema. No new server endpoints (the
  prototype's "Export" button is a presentation affordance only — see L03). No
  workspace switcher, plans, or trial chrome — this is a self-hosted WordPress
  competitor; the shell shows site identity only (owned by TASK-479-06).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

Forms involve **public write**: the public submit endpoint and the form runtime
carry nonce / signature / honeypot / optional-CAPTCHA anti-abuse and the
`submissionAccess` (public|internal) gate. Leaves MUST NOT touch, relax, or
relocate any of that. They MUST NOT change `FormSettings` validation
(`normalizeFormSettings`), field validation, the automation action runner, or
the retry path. They MUST keep all reads going through the existing
`useForms` / `getCachedFormDetail` / `getFormDetailCached` /
`listFormActionsCached` / `getCachedFormActions` paths and all writes
(`createForm`, `updateForm`, `deleteForm`, `updateFormFields`,
`updateFormActions`, `retryFormActionRun`) exactly as-is. The admin screens
already gate behind the Forms module's existing permission wiring
(`AdminShell` / `EditorShell` + module gating) — do not change it.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-15-L01 | Form List Restyle | ✅ Done |
| TASK-479-15-L02 | Form Builder Restyle | ✅ Done |
| TASK-479-15-L03 | Form Submissions & Action Logs Restyle | ✅ Done |
| TASK-479-15-L04 | Forms Tests | ✅ Done |

---

## Migration constraints (apply to every leaf)

- **Preserve real data/logic.** Keep every `formsClient` call, the
  `useForms` cache hook, `filterForms`, `useListPagination`, selection +
  `runBulkAction` (`Promise.allSettled` + `summarizeBulkAction`), the field
  schema mapping, preset helpers (`clonePresetFields`, `getFormPresetDefinition`,
  `listFormPresets`), `normalizeFormSettings`/`getDefaultFormSettings`, and the
  automation/retry flow unchanged. The restyle touches JSX/className only.
- **Public-write safety.** Do not change the runtime/anti-abuse contract surfaced
  by `FormSettingsPanel` / `FormRuntimePreviewDialog` (nonce, honeypot, CAPTCHA
  policy, `submissionAccess`). Restyle the panel chrome only; keep every control
  wired to the same setting.
- **Canonical routing.** Never hand-build `<a href>`. Route admin nav/links and
  prefetch through the shared helpers — `AdminLink`
  (`core/admin/ui/shared/AdminLink.tsx`), the `adminPaths` helpers
  (`resolveAdminBasePath`, `resolveAdminRoutePath`, `resolveAdminHref` in
  `core/admin/utils/adminPaths.ts`), `useAdminRouter().navigate`, and
  `prefetchAdminRoute`. When porting a prototype `<Link to="…">`, replace it with
  `AdminLink` resolved through the path helpers — keep the **existing** target
  routes (`/advanced/forms`, `/advanced/forms/:id`,
  `/advanced/forms/:id/submissions`, `/advanced/forms/:id/action-runs`).
  `FormTable` already uses `AdminLink` with `prefetch`; keep it.
- **Cache contract.** Preserve cache hydrate + background revalidation
  (`useForms` `refresh({ force, background })`), `subscribeCacheEvents`
  invalidation in the builder/action-logs pages, `cacheKeys`/TTL, and the
  intentional **no submissions cache key** decision in `FormSubmissionsPage`. NO
  mount-force refetch loops beyond what already exists; NO dirty-state overwrites
  (the builder's unsaved-changes guard must stay intact).
- **react-hooks (ESLint 9).** No synchronous `setState` inside effects; use lazy
  initializers / render-time derivation / reducers. The existing effects already
  flip `isLoading` only at the async boundary — keep that shape; do not add
  effects the restyle does not require.
- **Schema-first.** Any payload shape stays owned by the existing
  client/schema modules; the restyle adds no new payloads.
- **Design tokens.** Consume the new violet/soft tokens from
  `core/admin/styles/globals.css` (landed by TASK-479-05) via existing semantic
  classes (`bg-card`, `text-muted-foreground`, `border`, `bg-primary`,
  `bg-primary-soft`, `rounded-2xl`, etc.) and the restyled shell from
  TASK-479-06 — do not hardcode hex values.

---

## Testing Requirements

Lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Run:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/form-builder.test.tsx tests/vitest/ui/form-canvas.test.tsx tests/vitest/ui/form-canvas-wave.test.tsx tests/vitest/ui/form-actions-panel.test.tsx tests/vitest/ui/form-submissions-page.test.tsx tests/vitest/ui/form-action-logs-page.test.tsx tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx`

New per-screen restyle suites land under `tests/vitest/ui-integration/`
(see TASK-479-15-L04). Existing forms suites under `tests/vitest/ui/` and
`tests/vitest/forms/` MUST stay green; update their literal class/markup
assertions where the restyle intentionally changes them, but do NOT delete
behavioral assertions. Do NOT move runtime tests into Vitest for coverage.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board buckets + statistics on every status
  change for this subtask and its leaves.
- Add a `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` and the closing
  leaf id(s).
- If any restyle alters a documented Forms UX affordance, reconcile
  `_docs/FORMS_SPEC.md`. No API/cache/anti-abuse contract change is expected, so
  no contract-doc edits beyond UX notes.
