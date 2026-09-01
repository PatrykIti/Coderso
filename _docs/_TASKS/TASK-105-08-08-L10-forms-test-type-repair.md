# TASK-105-08-08-L10: Forms Test Type Repair
# FileName: TASK-105-08-08-L10-forms-test-type-repair.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** Test Integrity
**Estimated Effort:** Small
**Dependencies:** Current root TypeScript diagnostic map; fresh child-contract audit
**Status:** ⏳ To Do

---

## Overview

Repair the existing forms residual Vitest fixture so it is a real FormRecord instead of a
broad object whose status widens to string. This test-only leaf resolves the one owned root
TypeScript diagnostic while retaining the FormTable visible publish-action behavior. It does
not change a form client, source component, API, coverage configuration, task board,
changelog, or commit.

## Exact Single-Writer Scope

**Exclusive test writer:**

- tests/vitest/ui/forms-residual-components.test.tsx

**Read-only public type contracts:**

- core/admin/services/formsClient.ts
- core/admin/ui/forms/FormTable.tsx

No production source, route, test helper outside this file, coverage configuration,
task/board file, changelog, or commit is writable. Stop and author a separate exact-owner
contract if a correct repair needs any read-only path.

## Root TypeScript Diagnostic Map

| Sole writer | Current anchor | Required type-correct repair |
|---|---|---|
| forms-residual-components.test.tsx | 336 TS2322 | Return FormRecord from the local fixture factory, use Partial<FormRecord> for full-field overrides, and keep the status literal in the exported published/draft/archived union. |

## Implementation Pseudocode

~~~tsx
const formRecord = (overrides: Partial<FormRecord> = {}): FormRecord => ({
  id: "form-1",
  name: "Contact",
  slug: "contact",
  status: "draft",
  description: "Lead form",
  successMessage: null,
  successRedirectUrl: null,
  submissionAccess: "public",
  settings: {
    layoutMode: "single",
    saveProgress: false,
    stepTitles: [],
    preset: "custom",
    automationRetry: { enabled: false, maxAttempts: 1, baseDelayMs: 300, maxDelayMs: 2000 },
  },
  createdAt: "2026-03-06T10:00:00.000Z",
  updatedAt: "2026-03-06T10:00:00.000Z",
  ...overrides,
});

render(<FormTable items={[formRecord({ updatedAt: "not-a-date" })]} onPublish={onPublish} />);
expect(onPublish).toHaveBeenCalledWith("form-1");
~~~

Keep the current public component interactions and assertions. Do not solve the error by
casting the fixture, widening FormRecord, removing FormTable props, or deleting/skipping the
test. Do not introduce any, as never, as unknown as, ts-ignore, or ts-expect-error.

## Security Contract

No endpoint visibility, session/RBAC policy, CSRF behavior, form validation, submission
access, rate limit, persistence, automation policy, or public-write anti-abuse control may
change. Use synthetic form values only; do not add credentials, live submission data, or a
mock that bypasses form authorization.

## Testing Requirements and Gates

~~~bash
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
export TMPDIR=/tmp
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-residual-components.test.tsx
./node_modules/.bin/eslint --max-warnings=0 tests/vitest/ui/forms-residual-components.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
~~~

Run root TypeScript only as an attribution gate. Preserve non-owned output as external
baseline evidence; fail this leaf only if its exact writer still appears in the log.

~~~bash
tsc_log="$(mktemp /tmp/task-105-08-08-l10-tsc.XXXXXX.log)" || exit 1
if ./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false >"$tsc_log" 2>&1; then tsc_exit=0; else tsc_exit=$?; fi
cat "$tsc_log"
printf "root tsc exit: %s\n" "$tsc_exit"
if rg -n '^tests/vitest/ui/forms-residual-components\.test\.tsx\(' "$tsc_log"; then exit 1; fi
~~~

## 1000-Line Rule

~~~bash
line_count="$(wc -l < tests/vitest/ui/forms-residual-components.test.tsx)"
printf "%s %s\n" "$line_count" tests/vitest/ui/forms-residual-components.test.tsx
test "$line_count" -le 1000
~~~

## Closure Checklist

- [ ] Only forms-residual-components.test.tsx changed.
- [ ] The local fixture returns FormRecord with a valid status literal.
- [ ] The owned TypeScript anchor is absent from the attribution log.
- [ ] FormTable still proves the visible publish action.
- [ ] No source, coverage, or security contract was claimed or changed.
- [ ] The writer remains at or below 1,000 physical lines.
