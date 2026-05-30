# TASK-343-09: Stack Audit Remediation Family

# FileName: TASK-343-09_Stack_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Stack + Runtime + Tailwind Contract + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close the confirmed Stack runtime regression where dynamically composed
breakpoint utility classes are missing from the public build and sometimes from
admin preview.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_STACK_WIDGET.md:189-246`
- `core/widgets/core/stack.tsx`

## Sub-Tasks

- [x] Replace dynamic breakpoint class composition with literal class maps or
  an equally deterministic build-time-safe contract.
- [x] Remove the remaining admin-vs-public class drift caused by missing public
  utilities.
- [x] Add renderer regression coverage for gap, direction, align, justify, and
  wrap across breakpoints.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/stack.tsx` | Replace dynamic class composition with deterministic literal maps. |
| `tests/vitest/widgets/stack.test.tsx` | Cover generated class output for each responsive dimension. |
| `_docs/PLAYWRIGHT/28-05-2026/REPORT_STACK_WIDGET.md` | Update final task routing and closure evidence. |

## Implementation Pseudocode

```ts
const gapClassMap = {
  mobile: { "4": "gap-4", "6": "gap-6", "8": "gap-8", "10": "gap-10", "12": "gap-12" },
  tablet: { "4": "md:gap-4", "6": "md:gap-6", "8": "md:gap-8", "10": "md:gap-10", "12": "md:gap-12" },
  desktop: { "4": "lg:gap-4", "6": "lg:gap-6", "8": "lg:gap-8", "10": "lg:gap-10", "12": "lg:gap-12" },
} as const;

const directionClassMap = { /* mobile/tablet/desktop literal maps */ } as const;
const alignClassMap = { /* mobile/tablet/desktop literal maps */ } as const;
const justifyClassMap = { /* mobile/tablet/desktop literal maps */ } as const;
const wrapClassMap = { /* mobile/tablet/desktop literal maps */ } as const;
```

The fix must remove `prefixClassMap`-style runtime prefix composition for every
responsive dimension, not only gap.

## Regression Test Shape

- Public-class output contains every responsive literal that the editor can
  choose.
- Coverage proves every Visual option is represented by source literals or an
  explicit Tailwind safelist entry.
- Default tablet/desktop gap no longer collapses to the mobile gap.
- Admin and public render agree for the same data.

## Security Contract

No API routes are added. This is a deterministic CSS-class generation fix only.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_STACK_WIDGET.md`.
- Update `_docs/_WIDGETS/STACK.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Tablet/desktop Stack controls render the same on admin and public.
- No Stack responsive utility depends on runtime-composed Tailwind literals.

## Completion Notes (2026-05-30)

- Stack responsive direction, gap, align, justify, and wrap maps now use
  explicit mobile/tablet/desktop class literals instead of runtime prefix
  composition.
- Renderer coverage now iterates every Stack direction, gap, align, justify,
  and wrap token and asserts the mobile, `md:`, and `lg:` classes emitted for
  each token.
- Default output now includes `gap-4`, `md:gap-6`, and `lg:gap-6`, preventing
  tablet/desktop spacing from collapsing to the mobile gap because of missing
  public CSS utilities.

## Validation Executed (2026-05-30)

- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-09
  drift review: no blockers)
