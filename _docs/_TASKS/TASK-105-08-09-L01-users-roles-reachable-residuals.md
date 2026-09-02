# TASK-105-08-09-L01: Users and Roles Reachable Residuals
# FileName: TASK-105-08-09-L01-users-roles-reachable-residuals.md

**Parent Subtask:** TASK-105-08-09
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Small
**Dependencies:** Fresh TASK-105-08-09 contract audit
**Status:** ✅ Done (2026-09-02)

---

## Overview

Reconcile the prior 16-line handoff into **11 raw L12 reachable gaps** and five
source-proven unreachable raw records. This test-only leaf uses two new isolated suites to
prove visible permission-revocation/no-side-effect behavior, the real public Invite User
success flow, and the real matrix save-failure/refresh flow. It must not manufacture either
the unreachable UserEditor create branch or a denied-matrix refresh guard.

## Exact Single-Writer Scope

**Read-only production targets:**

- core/admin/ui/roles/PermissionsMatrixPage.tsx
- core/admin/ui/users/UsersRolesPage.tsx
- core/admin/ui/roles/RoleEditor.tsx (source evidence only; no coverage target)

**Exclusive new test writers:**

- tests/vitest/ui/permissions-matrix-page-revocation.test.tsx
- tests/vitest/ui/users-roles-create-and-revocation.test.tsx

Do not edit UsersRolesPage.tsx (1,026 lines), RoleEditor.tsx, PermissionsMatrixPage.tsx,
users-roles-users-invite.test.tsx (dirty, 807 lines), users-roles-permissions.test.tsx,
usersRolesFixtures.tsx, any task/changelog/board file, or coverage configuration.

Each new DOM suite starts with `// @vitest-environment happy-dom` and owns its root lifecycle.
In `users-roles-create-and-revocation.test.tsx`, define a test-local
`renderUsersRolesWithPermissions(initialPermissions)` helper using `createRoot`; its returned
`rerender(permissions)` calls `root.render(<UsersRolesPage permissions={permissions} />)` in
`React.act`, preserves the mounted dialog, and its cleanup unmounts/removes the container in
`afterEach`. This helper is self-contained in the new suite and must not import, extend, or
modify `usersRolesFixtures.tsx`. Use that rerender only after the same root has opened a real
`InviteUserDialog` for lines 394-396 or a real `ConfirmActionDialog` for lines 450-555, then
revoke write permission before the dialog submits/confirms. It must not manufacture a UserEditor
create entry point, fabricated create state, or a denied `PermissionsMatrixPage` mode.

## Source-Line and Behavior Map

| Source disposition and lines | Test writer | Real interaction and assertion |
|---|---|---|
| Reachable public matrix failure: PermissionsMatrixPage.tsx:379-392,411-420,431-435 | permissions-matrix-page-revocation | Create two real review diffs. Make one update stale and one 403. Assert the stale error exposes **Refresh roles**, the 403 requests an auth permission refresh and remains a review failure rather than rendering denied mode, then make the role/catalog reload succeed, click the real Refresh roles action, and assert that it closes the review. |
| **UNREACHABLE raw L12: PermissionsMatrixPage.tsx:175-178 (record 177)** | None; V8 receipt records the reclassification | `matrixMode` becomes `"denied"` only after a load/refresh 403 sets `serverAccessDenied` (201-205, 248-252). `handleRefreshRoles` starts while editable, invokes `refresh`, then closes review (431-435); a resulting denied render removes the matrix/review controls (490-497, 529-563). No public interaction can invoke `refresh` again at 175-178. |
| Reachable public replacement: UsersRolesPage.tsx:402,408-410 | users-roles-create-and-revocation | Click the visible Invite User action, complete the real invite dialog, and submit. Assert exact invite payload, refreshed selected invitee, success notice, and dialog closure. This is the public invitation flow, not UserEditor creation. |
| **UNREACHABLE raw L12: UsersRolesPage.tsx:369,375,376,383** | None; V8 receipt records the reclassification | Every public `openUserEditor` call receives an existing user: selected-user callbacks at 775 and 1016, plus `UserList.onEdit` at 890 (whose contract requires `UserSummary` at UserList.tsx:49 and invokes it with `user` at UserList.tsx:179). The page header instead invokes `openInviteDialog` at 809, which wires `InviteUserDialog.onInvite` to `handleInviteUser` at 957. |
| UsersRolesPage.tsx:394,395,396 | users-roles-create-and-revocation | Mount the test-local root with writable permissions, open the real Invite User dialog, then rerender that same root with read-only permissions before submit while `InviteUserDialog` remains open. Assert access-denied feedback plus no invite request. |
| UsersRolesPage.tsx:450,451 | users-roles-create-and-revocation | Mount the test-local root writable, open the real status `ConfirmActionDialog`, then rerender it read-only before Confirm while the dialog remains open. Assert no status mutation plus visible denial. |
| UsersRolesPage.tsx:494,495 | users-roles-create-and-revocation | Use the same test-local-root, already-open `ConfirmActionDialog` permission revocation for an unprotected user deletion. |
| UsersRolesPage.tsx:524,525 | users-roles-create-and-revocation | Use the same test-local-root, already-open `ConfirmActionDialog` permission revocation for role deletion. |
| UsersRolesPage.tsx:554,555 | users-roles-create-and-revocation | Use the same test-local-root, already-open `ConfirmActionDialog` permission revocation for high-risk role duplication. |

The real `InviteUserDialog` for 394-396 and all real confirmation actions for 450-555 remain
genuinely mounted across their permitted permission rerender. Use a nonprotected fixture user
for deletion; the default protected user must not be used to manufacture a different guard.

## Reconciled Coverage Accounting

- **11 raw L12 must-hit lines remain:** UsersRolesPage.tsx:394-396, 450-451, 494-495,
  524-525, and 554-555. These all have a legal, visible permission-revocation interaction.
- **Five raw records are reclassified, not silently dropped:** PermissionsMatrixPage.tsx:177
  and UsersRolesPage.tsx:369,375,376,383. They are excluded from the must-hit V8 gate because
  no public UI route reaches them; the evidence is in the map above.
- **The user-facing behavior still has a real public path:** `Invite User` reaches
  `handleInviteUser` at UsersRolesPage.tsx:402,408-410. L01 preserves this behavior in its
  new suite, but must report it as a public replacement rather than claim coverage of the
  dead UserEditor branch.
- **The matrix has real public error behavior, but not the claimed guard:** save failures are
  observable at PermissionsMatrixPage.tsx:379-420 and Refresh roles is observable at 431-435.
  A load or post-create-refresh 403 can render the denied screen, but neither public path
  re-enters the guard at 175-178. The matrix suite proves the reachable failure/refresh
  outcome without an external prop rerender or a private callback.

## Explicit Non-Targets

Do not author tests for PermissionsMatrixPage.tsx:175-178 (raw record 177) or
UsersRolesPage.tsx:369,375,376,383. The first needs a second public `refresh` after the matrix
has already entered denied mode, when the UI has removed its controls; the second needs a
public UserEditor open without a user, which no call site supplies. The alternative public
invite path is `handleInviteUser` at 392-418 and is mapped above. Never invoke private
callbacks, pass a fabricated callback prop, or rerender `PermissionsMatrixPage` into denied
mode to obtain coverage.

Also do not author tests for RoleEditor.tsx:162,168,183, PermissionsMatrixPage.tsx:300,301,
or UsersRolesPage.tsx:422,423. Every high-risk permission/full-access mutation enters
RoleEditor.requestPermissionChange before draft update. Unconfirmed risky drafts only open
an apply confirmation; Save cannot observe one. The parent callbacks depend on that
impossible state and are source-proven unreachable.

## Implementation Pseudocode

~~~tsx
const view = renderUsersRolesWithPermissions(writablePermissions);
await openConfirmAction(view, "Delete user");
view.rerender(readOnlyPermissions);

await user.click(screen.getByRole("button", { name: "Confirm" }));

expect(deleteAdminUser).not.toHaveBeenCalled();
expect(screen.getByRole("alert")).toHaveTextContent(permissionDeniedText);
~~~

Implement the local helper as a direct `createRoot` mount of
`<UsersRolesPage permissions={permissions} />`, not a wrapper around a shared fixture. Use the
existing public page/dialog/router/client seams. For the matrix test, combine a real stale
response with a real 403 save response, assert their true visible outcomes, then make the
public Refresh roles request succeed and assert review closure. Do not claim that a save 403
sets `matrixMode` to denied. The test may spy on `AdminAuthProvider.refreshPermissions`, but
must keep its supplied matrix permissions stable; it must never change props or an auth
snapshot to manufacture denied mode. For the user flow, use Invite User and assert both UI
effects and the exact client payload. Do not call private callbacks, invoke RoleEditor props
directly, or rely only on mock call counts when the UI exposes an error/notice.

## Testing Requirements

Run each owned suite independently:

~~~bash
for test_path in   tests/vitest/ui/permissions-matrix-page-revocation.test.tsx   tests/vitest/ui/users-roles-create-and-revocation.test.tsx
do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
~~~

Then generate one scoped V8 receipt. It must contain exactly the two owned test operands and
exactly the two owned production coverage includes; do not add `RoleEditor.tsx`, a shared
fixture, another suite, or a full-lane result. Vitest 4.1.10 accepts these current
`vitest.config.ts` options, and `--coverage.reporter=lcov` writes the required artifact:

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

Extract and record exact raw `DA:<line>,<hits>` rows from the produced `lcov.info`; do not
substitute a percentage summary or a line inferred from the source range. The current V8 mapping
for the matrix behavior ranges 379-392, 411-420, and 431-435 is the 16 executable rows listed
as `MATRIX_REACHABLE` below. This command writes the full receipt to
`coverage/task-105-08-09-l01/da-rows.json`, prints it for the parent handoff, and fails if a
required DA row is missing, if a reachable row is zero, or if an unreachable row is nonzero:

~~~bash
coverage_dir="coverage/task-105-08-09-l01"
coverage_lcov="$coverage_dir/lcov.info"
test -s "$coverage_lcov" || exit 1

node - "$coverage_lcov" "$coverage_dir/da-rows.json" <<'NODE'
const fs = require("node:fs");

const [lcovPath, receiptPath] = process.argv.slice(2);
const expected = [
  {
    classification: "MUST_HIT",
    source: "core/admin/ui/users/UsersRolesPage.tsx",
    lines: [394, 395, 396, 450, 451, 494, 495, 524, 525, 554, 555],
  },
  {
    classification: "PUBLIC_REPLACEMENT",
    source: "core/admin/ui/users/UsersRolesPage.tsx",
    lines: [402, 408, 409, 410],
  },
  {
    classification: "MATRIX_REACHABLE",
    source: "core/admin/ui/roles/PermissionsMatrixPage.tsx",
    lines: [380, 381, 388, 411, 412, 413, 415, 416, 418, 419, 420, 431, 432, 433, 434, 435],
  },
  {
    classification: "UNREACHABLE",
    source: "core/admin/ui/roles/PermissionsMatrixPage.tsx",
    lines: [177],
  },
  {
    classification: "UNREACHABLE",
    source: "core/admin/ui/users/UsersRolesPage.tsx",
    lines: [369, 375, 376, 383],
  },
];

const expectedBySourceLine = new Map();
for (const group of expected) {
  for (const line of group.lines) {
    expectedBySourceLine.set(`${group.source}:${line}`, group.classification);
  }
}

const sources = [...new Set(expected.map((group) => group.source))];
const observed = new Map();
let source = null;
for (const raw of fs.readFileSync(lcovPath, "utf8").split(/\r?\n/)) {
  if (raw.startsWith("SF:")) {
    const lcovSource = raw.slice(3);
    source = sources.find((candidate) => lcovSource.endsWith(candidate)) ?? null;
    continue;
  }
  if (!source || !raw.startsWith("DA:")) continue;
  const [lineText, hitsText] = raw.slice(3).split(",", 2);
  const line = Number(lineText);
  const classification = expectedBySourceLine.get(`${source}:${line}`);
  if (classification) {
    observed.set(`${source}:${line}`, { classification, source, line, hits: Number(hitsText), da: raw });
  }
}

const rows = expected.flatMap((group) =>
  group.lines.map((line) =>
    observed.get(`${group.source}:${line}`) ?? {
      classification: group.classification,
      source: group.source,
      line,
      hits: null,
      da: null,
    }
  )
);
const failures = [
  ...rows.filter((row) => row.da === null).map((row) => `missing ${row.classification} DA:${row.line}`),
  ...rows
    .filter((row) => row.da !== null && row.classification !== "UNREACHABLE" && row.hits <= 0)
    .map((row) => `unhit ${row.classification} ${row.da}`),
  ...rows
    .filter((row) => row.da !== null && row.classification === "UNREACHABLE" && row.hits !== 0)
    .map((row) => `reachable contradiction ${row.da}`),
];
const receipt = { lcovPath, rows, failures };
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (failures.length > 0) process.exit(1);
NODE
~~~

The receipt therefore records all 11 raw must-hit lines, the four public Invite User replacement
rows 402,408-410, the matrix's 16 executable failure/refresh rows, and all five explicit
source-proven unreachable classifications. The full source behavior ranges remain the evidence
for 379-392, 411-420, and 431-435; V8 does not emit DA rows for the non-executable physical
lines in those ranges. Follow the V8 receipt with:

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
~~~

## 1000-Line Rule

Both writers are new and must remain below 800 lines by plan, then below 1,000 physical
lines by the gate. No production source is edited; if an implementation needs a shared
fixture change, stop and obtain a new ownership contract.

Run this individual-file gate after implementation; do not use `wc`'s combined total as a
substitute for the per-file rule:

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

Non-API test work. Existing internal-admin session auth, server RBAC/CSRF enforcement,
strict payload validation, and rate limits remain authoritative. The rerender cases prove
the UI refrains from sending a mutation after a write permission is revoked; they do not
treat client-side UI as authorization or create a public write/nonce/captcha bypass.

## Sub-Tasks

None.

## Documentation Updates Required

Return exact test paths, V8 rows, targeted/static receipts, and line counts to the parent.
The closure writer alone updates L12/status/board/changelog.

## Acceptance Criteria

1. All 11 remaining raw L12 must-hit lines are reached through real admin interactions; the
   five reclassified raw records are evidenced as unreachable rather than faked.
2. The actual Invite User flow and the actual matrix stale/403 failure-plus-refresh flow retain
   visible behavior coverage without claiming they hit the reclassified source lines.
3. Each permission-revocation confirmation proves both visible denial and no mutation side
   effect.
4. No test targets the five newly reclassified paths or the seven previously source-proven
   unreachable RoleEditor-dependent lines.

## Closure (2026-09-02)

Closed on tree evidence (commit 56c9cd92 "test(task-105): close 08-09 misc admin UI, audit/forms repairs and preview focus fix"): delivered suites tests/vitest/ui/permissions-matrix-page-revocation.test.tsx (285 lines) and users-roles-create-and-revocation.test.tsx (525 lines), both at or under 1,000 lines.
Focused V8 re-verified 2026-09-02 on this tree: all 36 classified rows behave as mapped — 11 MUST_HIT rows hit, 4 PUBLIC_REPLACEMENT rows hit, 16 MATRIX_REACHABLE rows hit, and 5 UNREACHABLE rows at zero — with no coverage exclusion or ignore directive used.
Residual disposition: the 08-09 cluster holds 9 files / 41 attributed uncovered lines in TASK-105-08-12; the five UNREACHABLE rows remain dispositioned, not covered.
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
