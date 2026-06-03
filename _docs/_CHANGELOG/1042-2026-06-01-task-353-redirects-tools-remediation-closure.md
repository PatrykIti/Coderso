# 1042 - TASK-353 Redirects tools remediation closure

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-353, TASK-353-01, TASK-353-02, TASK-353-03, TASK-353-04

## Key Changes

### Redirects

- Added public runtime redirect execution for enabled admin rows with support
  for 301, 302, 307, and 308 responses before page/content lookup.
- Added internal-only redirect source/destination normalization, loop
  prevention, bounded redirect-chain resolution, and fail-closed runtime loop
  handling.
- Reused the Redirects domain validation for Import / Export redirect bundles,
  so imported redirects cannot bypass the internal-destination policy.
- Added `mapRedirectError` route mappings for not-found, duplicate, invalid,
  unsafe destination, and loop failures.
- Added Redirect drawer `SheetTitle`/`SheetDescription` wiring and aligned the
  destination copy with the internal-path policy.
- Replaced placeholder table pagination with local page/limit/total state,
  cause-specific empty states, an inline create CTA, keyboard-visible row
  actions, and confirmed delete.
- Added Redirects list admin cache hydration and cache-bus patching on
  create/update/delete, so returning to the route reuses cached rows while
  still updating public-routing-affecting changes promptly.
- Added table selection and bulk enable/disable/delete actions, removed the
  duplicate empty-state create CTA when the header create action is already
  visible, and shortened the header action label to `Create`.

## Validation

- `bun test tests/unit/redirects/redirectService.test.ts`
- `bun test tests/unit/tools/importExport.test.ts`
- `bun test tests/integration/routes/redirects.test.ts`
- `bun test tests/integration/runtime/redirects-runtime.test.ts`
- `bun run test:vitest -- tests/vitest/admin/redirectsClient.test.ts tests/vitest/ui/redirects.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused Playwright CLI proof for `/admin/redirects`: empty create CTA,
  accessible create drawer fields, UI create, public 301 `Location`, confirmed
  UI delete, and zero browser console errors/warnings after Vite optimize cache
  refresh. Temporary proof user/session and redirect rows were removed.
- Final live Tools smoke confirmed `redirects:list` cache hydration, header
  `Create` action, no duplicate empty-state CTA in populated mode, and visible
  bulk action controls after selecting rows.
