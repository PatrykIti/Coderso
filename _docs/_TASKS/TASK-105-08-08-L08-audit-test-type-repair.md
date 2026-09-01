# TASK-105-08-08-L08: Audit Test Type Repair
# FileName: TASK-105-08-08-L08-audit-test-type-repair.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** Test Integrity
**Estimated Effort:** Small
**Dependencies:** Current root TypeScript diagnostic map; fresh child-contract audit
**Status:** ⏳ To Do

---

## Overview

Repair the audit export mock in the existing residual Vitest suite so it models the current
discriminated AdminExportResult contract. This test-only leaf resolves the one owned root
TypeScript diagnostic without changing the audit client, export behavior, API security, or
L08 coverage accounting.

Read and preserve the current test cases before editing. The suite remains the sole writer;
no shared mock, source module, coverage artifact, board, changelog, or commit is in scope.

## Exact Single-Writer Scope

**Exclusive test writer:**

- tests/vitest/ui/audit-list-residual.test.tsx

**Read-only public type contracts:**

- core/admin/services/adminExportClient.ts
- core/admin/services/auditClient.ts
- core/admin/ui/audit/AuditList.tsx

No production source, route, test helper, coverage configuration, task/board file,
changelog, or commit is writable. A correct repair that needs any of those paths must stop
and receive a new exact-owner contract.

## Root TypeScript Diagnostic Map

| Sole writer | Current anchor | Required type-correct repair |
|---|---|---|
| audit-list-residual.test.tsx | 28 TS2322 | Type the export mock as the real audit export signature and return a complete AdminExportResult discriminated variant: downloaded has filename and mimeType; queued has jobId and optional statusUrl. |

## Implementation Pseudocode

~~~ts
type ExportAuditLogsMock = (request: AuditExportRequest) => Promise<AdminExportResult>;

const exportAuditLogs = vi.fn<ExportAuditLogsMock>(async () =>
  nextExportStatus === "downloaded"
    ? { status: "downloaded", filename: "audit-logs.csv", mimeType: "text/csv" }
    : { status: "queued", jobId: "audit-export-1", statusUrl: "/admin/api/audit/export/audit-export-1" }
);
~~~

Keep the existing UI behavior assertions: a downloaded export keeps its filename/mime result,
and a queued export follows the real queued path. Do not fake a queued result without jobId,
change the public audit client signature, remove a case, or turn a visible/error assertion
into a mock-call-only assertion. Do not introduce any, unsafe casts, ts-ignore, or
ts-expect-error.

## Security Contract

No endpoint visibility, session/RBAC rule, CSRF requirement, rate limit, export validation,
cache behavior, persistence, or public-write anti-abuse control may change. Use only
synthetic export metadata; never place credentials or sensitive audit data in a fixture.

## Testing Requirements and Gates

~~~bash
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
export TMPDIR=/tmp
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/audit-list-residual.test.tsx
./node_modules/.bin/eslint --max-warnings=0 tests/vitest/ui/audit-list-residual.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
~~~

Run root TypeScript only as an attribution gate. Record non-owned output as an external
baseline; fail this leaf only when its owned path remains in the diagnostic log.

~~~bash
tsc_log="$(mktemp /tmp/task-105-08-08-l08-tsc.XXXXXX.log)" || exit 1
if ./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false >"$tsc_log" 2>&1; then tsc_exit=0; else tsc_exit=$?; fi
cat "$tsc_log"
printf "root tsc exit: %s\n" "$tsc_exit"
if rg -n '^tests/vitest/ui/audit-list-residual\.test\.tsx\(' "$tsc_log"; then exit 1; fi
~~~

## 1000-Line Rule

~~~bash
line_count="$(wc -l < tests/vitest/ui/audit-list-residual.test.tsx)"
printf "%s %s\n" "$line_count" tests/vitest/ui/audit-list-residual.test.tsx
test "$line_count" -le 1000
~~~

## Closure Checklist

- [ ] Only audit-list-residual.test.tsx changed.
- [ ] The queued fixture includes jobId and the downloaded fixture includes filename/mimeType.
- [ ] The owned TypeScript anchor is absent from the attribution log.
- [ ] No source, coverage, or security contract was claimed or changed.
- [ ] The writer remains at or below 1,000 physical lines.
