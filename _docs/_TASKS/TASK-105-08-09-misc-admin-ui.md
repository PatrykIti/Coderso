# TASK-105-08-09: Misc Admin UI Clusters
# FileName: TASK-105-08-09-misc-admin-ui.md

**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Small follow-up
**Dependencies:** TASK-105-08-11 split handoff; fresh L01 contract audit
**Parent Task:** TASK-105-08
**Status:** ✅ Done (2026-09-02)
**Reopened:** 2026-08-29

---

## Overview

The prior L09 closure record is historical evidence, not a current terminal state. The raw
L12 extraction has 52 residual records for this cluster. Current source review yields
**11 reachable raw lines** and **41 unreachable raw lines** (the 29 inherited records, seven
earlier corrections, and five newly verified corrections). L01 additionally preserves real
public invitation and matrix failure/refresh behavior without misreporting it as coverage of
the dead records. The only reopened scope is the users/roles interaction contract below; the
prior 85-file inventory is not an active directory-wide ownership grant.

## Current Reconciliation Scope

| Source disposition | Source lines | L01 behavior |
|---|---|---|
| Public matrix failure/refresh behavior: PermissionsMatrixPage.tsx | 379-392, 411-420, 431-435 | Create real stale and 403 review failures; assert their actual visible outcomes, then make Refresh roles succeed and assert that it closes review. A save 403 does not set denied mode. |
| **UNREACHABLE raw L12:** PermissionsMatrixPage.tsx | 177 (guard at 175-178) | No UI test targets this guard. Only load/refresh 403 sets denied mode; a real Refresh roles call begins before that state change and closes review, while denied mode removes the controls needed for another refresh. |
| Public invitation replacement: UsersRolesPage.tsx | 402, 408-410 | Use visible Invite User, assert payload, refreshed selected invitee, notice, and dialog closure. This preserves the actual public behavior but is not reported as coverage of the dead UserEditor branch. |
| **UNREACHABLE raw L12:** UsersRolesPage.tsx | 369, 375, 376, 383 | No UI test targets this branch. Every public UserEditor opener passes an existing user; page-level creation is Invite User -> handleInviteUser. |
| UsersRolesPage.tsx | 394, 395, 396 | Open the real `InviteUserDialog` while writable, then revoke write permission on that mounted root before submit and assert access-denied feedback/no invite. |
| UsersRolesPage.tsx | 450, 451 | Open the real status `ConfirmActionDialog` while writable, then revoke permission on that mounted root before Confirm and assert no mutation request. |
| UsersRolesPage.tsx | 494, 495 | Repeat the already-open `ConfirmActionDialog` revocation path for an unprotected-user deletion. |
| UsersRolesPage.tsx | 524, 525 | Repeat the already-open `ConfirmActionDialog` revocation path for a role deletion. |
| UsersRolesPage.tsx | 554, 555 | Repeat the already-open `ConfirmActionDialog` revocation path for a high-risk role duplication. |

### Source-Proven Reclassification

The following five prior L01 records are **UNREACHABLE** through real UI flows and must not be
hit with a fabricated callback or external state rerender:

- PermissionsMatrixPage.tsx:177 (guard at 175-178): `serverAccessDenied` is set only by the
  load/refresh 403 catches at 201-205 and 248-252. The stale/403 save-failure block at 379-420
  only records failures and may set `roleRefreshRequired`; it does not set denied mode.
  `handleRefreshRoles` calls `refresh` and then closes review at 431-435. If that refresh gets
  a 403, denied rendering removes the review controls at 490-497 and 529-563, so no second
  public refresh can reach the guard.
- UsersRolesPage.tsx:369,375,376,383: all three public `openUserEditor` call sites supply an
  existing user (775, 890, 1016; `UserList.onEdit` requires and supplies `UserSummary` at
  UserList.tsx:49,179). The only header creation action is `openInviteDialog` at 809, wired to
  `handleInviteUser` at 957. The source-proven public alternative is
  `handleInviteUser` at 402,408-410.

The raw L12 cluster disposition is therefore **29/23 raw -> 41 UNREACHABLE / 11
REACHABLE-GAP** after this verified correction. The visible public alternatives above remain
L01 behavior coverage, but they must not be counted as coverage of the five reclassified raw
records.

The following seven raw L12 REACHABLE-GAP records are **UNREACHABLE** through real UI flows
and must not be hit with fake callback props:

- RoleEditor.tsx:162,168,183: every risky permission/full-access mutation passes
  requestPermissionChange (RoleEditor.tsx:106-150). An unconfirmed risky draft opens an
  apply confirmation and does not mutate the draft; confirming records its signature at
  173-181. handleSave cannot observe a real unconfirmed risky draft.
- PermissionsMatrixPage.tsx:300,301 and UsersRolesPage.tsx:422,423: these parent callbacks
  depend on that impossible RoleEditor save-confirmation branch. Normal Save continues to use
  the existing permission guards.

## Child Order and Single-Writer Boundaries

1. TASK-105-08-09-L01-users-roles-reachable-residuals.md — sole writer of two new,
   isolated suites: permissions-matrix-page-revocation.test.tsx and
   users-roles-create-and-revocation.test.tsx.

All source files are read-only. UsersRolesPage.tsx is already 1,026 physical lines, so any
production edit would require a separate split-first task. L01 must not extend the currently
dirty users-roles-users-invite.test.tsx (807 lines) or users-roles-permissions.test.tsx; it
uses the two new suites to prevent a writer collision.

## Implementation Pseudocode

~~~tsx
render(<UsersRolesPage permissions={writablePermissions} />);
openDestructiveConfirmation();
rerender(<UsersRolesPage permissions={readOnlyPermissions} />);
await user.click(screen.getByRole("button", { name: "Confirm" }));
expect(mutationClient).not.toHaveBeenCalled();
expect(screen.getByRole("alert")).toHaveTextContent(accessDeniedMessage);
~~~

The tests drive controls that remain mounted across a real permission re-render. They assert
visible denial and absence of a side effect; they never call private handlers, supply an
impossible RoleEditor draft, rerender PermissionsMatrixPage to manufacture denied mode, or
weaken confirmation semantics. The `UsersRolesPage` test-local rerender is permitted only
after the same mounted root has an already-open `InviteUserDialog` for lines 394-396 or an
already-open `ConfirmActionDialog` for lines 450-555; it preserves that real dialog state and
never manufactures a UserEditor/create state. The matrix test may spy on
`AdminAuthProvider.refreshPermissions` but keeps supplied matrix permissions stable; it never
changes props or an auth snapshot to manufacture denied mode.

## Testing Requirements

L01 runs the two exact new suites independently, then runs the following single scoped V8
receipt. It has exactly the two L01-owned test operands and exactly the two read-only production
coverage targets; it must not use a full-lane result or add another include. The current
`vitest.config.ts` provider is V8, and the command explicitly writes this leaf's `lcov.info` to
`coverage/task-105-08-09-l01` instead of the configured `coverage/vitest` directory:

~~~bash
coverage_dir="coverage/task-105-08-09-l01"
export TMPDIR=/tmp
if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage \
  --coverage.provider=v8 \
  --coverage.clean \
  --coverage.reporter=lcov \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/roles/PermissionsMatrixPage.tsx \
  --coverage.include=core/admin/ui/users/UsersRolesPage.tsx \
  tests/vitest/ui/permissions-matrix-page-revocation.test.tsx \
  tests/vitest/ui/users-roles-create-and-revocation.test.tsx
~~~

The L01 `lcov.info` extractor records the exact raw `DA:<line>,<hits>` rows in
`coverage/task-105-08-09-l01/da-rows.json` and fails unless every must-hit, public replacement,
and matrix-reachable row has a positive count. It records the five source-proven unreachable
rows as `UNREACHABLE` with a zero count; a positive count is a contract failure, not coverage
credit. The source behavior ranges remain 379-392, 411-420, and 431-435, while current V8 emits
the exact matrix rows 380,381,388,411,412,413,415,416,418,419,420,431-435. The full extractor
and its 11 must-hit, four public-replacement, and five unreachable row lists are in L01. Then
run:

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
~~~

## 1000-Line Rule

Both L01 suites are new and must remain at most 800 lines by plan, then at most 1,000 lines
by the hard gate. Do not touch the 1,026-line source module or the dirty 807-line invite suite.
Run this per-file gate after implementation; the total is deliberately not used because the
limits apply to each writer independently:

~~~bash
for test_path in \
  tests/vitest/ui/permissions-matrix-page-revocation.test.tsx \
  tests/vitest/ui/users-roles-create-and-revocation.test.tsx
do
  line_count="$(wc -l < "$test_path")"
  printf '%s %s\n' "$line_count" "$test_path"
  if (( line_count > 1000 )); then
    echo "1000-line hard gate failed: $test_path has $line_count lines" >&2
    exit 1
  fi
  if (( line_count > 800 )); then
    echo "800-line L01 plan gate failed: split $test_path before closure" >&2
    exit 1
  fi
done
~~~

## Security Contract

Test-only, non-API work. Existing internal-admin session authentication, server RBAC/CSRF
enforcement, strict payload validation, and rate limits are unchanged. Permission-revocation
tests prove the UI does not issue a mutation after write authority disappears; client UI is
not treated as authorization and no public write/nonce/captcha behavior is introduced.

## Historical Receipt

The 2026-08-26 post-audit record remains historical. It cannot close this parent because it
predates the corrected source-backed 11-line raw-L12 handoff.

## Sub-Tasks

- [ ] TASK-105-08-09-L01-users-roles-reachable-residuals.md

## Documentation Updates Required

Only the designated closure writer records L01 validation and the L12 disposition. Do not
update board statistics, changelog, task-board rows, staging, or commits from this leaf.

## Acceptance Criteria

1. The 11 remaining raw L12 lines have real UI interaction tests with visible or
   no-side-effect assertions, and all five newly reclassified lines have source evidence.
2. The actual public Invite User and matrix failure/refresh paths retain behavior coverage
   without pretending to cover the reclassified lines.
3. The five newly reclassified plus seven earlier reclassified lines remain source-proven
   unreachable.
4. L12 receives fresh artifact evidence before this parent can be terminal.

## Orchestrator Attribution Note — 2026-09-01 (TASK-105 campaign closure)

Bounded ownership assignment by the orchestrator (no leaf contract named these two
files; confirmed by a full sweep of the `TASK-105-08-*` contracts):

- `core/admin/ui/preview/RuntimePreviewDialog.tsx` — invoker focus is restored when
  the runtime preview dialog closes (focus-survival fix chain motivated by the L07
  smoke diagnosis).
- `tests/vitest/ui/runtime-preview-dialog-gaps.test.tsx` — behavioral regression pin
  for the fix.

Evidence: the r44 acceptance run's `post-classic-edit-preview-focus-visible`
scenario (focus-visible DOM state asserted through the supported editor→preview
transition) and the dedicated suite above. These files ride TASK-105-08-09's
closure commit (K7 in the delivery commit plan, handoff section 15).

## Closure (2026-09-02)

All physical children are terminal: TASK-105-08-09-L01 flipped Done (2026-09-02) on landing commit 56c9cd92, with permissions-matrix-page-revocation.test.tsx (285 lines) and users-roles-create-and-revocation.test.tsx (525 lines) committed and all 36 classified V8 rows behaving as mapped (11 MUST_HIT hit, 4 PUBLIC_REPLACEMENT hit, 16 MATRIX_REACHABLE hit, 5 UNREACHABLE zero).
Residual disposition: the 08-09 cluster attribution in TASK-105-08-12 is 9 files / 41 lines; the five UNREACHABLE rows stay dispositioned, not claimed covered.
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
