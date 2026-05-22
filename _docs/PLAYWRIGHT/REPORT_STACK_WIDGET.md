# REPORT: Stack Widget — UX/UI Audit

**Widget:** `stack`
**Original audit date:** 2026-05-16
**Closure refresh:** 2026-05-22
**Status:** Closed for TASK-286; shared residuals remain routed through TASK-256
**Files:** `core/widgets/core/stack.tsx`, `core/admin/ui/widgets/editors/StackEditors.tsx`

---

## 1. Widget overview

Stack remains a bounded flexbox layout primitive for one-dimensional flow. It
ships three presets (`vertical`, `horizontal`, `responsive`), one fixed
repeatable slot (`content`), and three editor modes (Wizard, Visual,
Advanced).

### Final option matrix

| Option | Values | Default | Responsive? |
|---|---|---|---|
| `variant` | `vertical`, `horizontal`, `responsive` | `vertical` | preset only |
| `direction.desktop` | `row`, `column` | `column` | ✅ |
| `direction.tablet` | `row`, `column` | `column` | ✅ |
| `direction.mobile` | `row`, `column` | `column` | ✅ |
| `gap.desktop` | `none`, `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12` | `6` | ✅ |
| `gap.tablet` | `none`, `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12` | `6` | ✅ |
| `gap.mobile` | `none`, `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12` | `4` | ✅ |
| `align` | `start`, `center`, `end`, `stretch`, `baseline` | `stretch` | ✅ |
| `justify` | `start`, `center`, `end`, `between`, `around`, `evenly` | `start` | ✅ |
| `wrap` | `true`, `false` | `false` | ✅ |

---

## 2. Final finding matrix

| Finding | Final owner / status | Evidence |
|---|---|---|
| `BUG-01` variant selection does not synchronize `data.direction.*` | `TASK-256-05-02` owned, fixed on 2026-05-17 | Shared atomic variant/data patch landed in `TASK-256-05-02`; Stack now applies variant changes through `buildVariantSyncedStackData()` in `core/admin/ui/widgets/editors/StackEditors.tsx`; regression coverage: `tests/vitest/ui/stack-editor-wave.test.tsx`, `tests/vitest/widgets/stack.test.tsx`. |
| `BUG-02` duplicate `None` / `Gap 0` semantics | `TASK-256` owned, still open | `stackGapTokens` still allow both `none` and `0`, and runtime maps both to zero-gap classes in `core/widgets/core/stack.tsx`. TASK-286 did not re-claim this shared token policy. |
| `ISSUE-01` Wizard mobile direction drift after variant changes | `TASK-256-05-02` owned, fixed on 2026-05-17 | Variant changes now patch direction data atomically; Wizard regression coverage lives in `tests/vitest/ui/stack-editor-wave.test.tsx`. |
| `ISSUE-02` Advanced editor lacks variant control | `TASK-256` owned, still open | Advanced still intentionally omits variant switching in `core/admin/ui/widgets/editors/StackEditors.tsx`; TASK-286 kept ownership with the shared contract family. |
| `ISSUE-03` `align` is not responsive | Fixed by `TASK-286-02` | `core/widgets/core/stack.tsx` now accepts scalar-or-breakpoint `align`, renders breakpoint markers/classes, and `StackEditors.tsx` exposes per-breakpoint controls in Visual and Advanced. |
| `ISSUE-04` `wrap` is not responsive | Fixed by `TASK-286-02` | `core/widgets/core/stack.tsx` now accepts scalar-or-breakpoint `wrap`, renders breakpoint markers/classes, and `StackEditors.tsx` exposes per-breakpoint wrap toggles. |
| `ISSUE-05` Wizard exposes too little layout control | Fixed by `TASK-286-03` | Wizard now exposes all-breakpoint `gap`, `align`, and `justify` controls with explicit copy in `core/admin/ui/widgets/editors/StackEditors.tsx`; regression coverage: `tests/vitest/ui/stack-editor-wave.test.tsx`. |
| `ISSUE-06` missing `justify-around` / `justify-evenly` | Fixed by `TASK-286-01` | `core/widgets/core/stack.tsx` now allowlists `around` and `evenly`; editor options and SSR coverage were added in `tests/vitest/widgets/stack.test.tsx` and `tests/vitest/ui/stack-editor-wave.test.tsx`. |
| `ISSUE-07` missing `align-items: baseline` | Fixed by `TASK-286-01` | `core/widgets/core/stack.tsx` now allowlists `baseline`; editor/runtime coverage added in Stack Vitests. |
| `ISSUE-08` gap labels lack scale context | Fixed by `TASK-286-03` | Gap option labels now communicate scale context in `core/admin/ui/widgets/editors/StackEditors.tsx` while keeping the existing serialized token set. |
| `ISSUE-09` empty Stack placeholder lacks author guidance | Fixed by `TASK-286-04` | Admin-safe `content` slot guidance now appears in Stack editor surfaces; public runtime intentionally stays neutral (`Empty stack.`) per placeholder safety policy. |
| `ISSUE-10` variant cards lack visual miniatures | Fixed by `TASK-286-04` | Visual cards now render decorative miniatures for `vertical`, `horizontal`, and `responsive`; regression coverage: `tests/vitest/widgets/stack.test.tsx`, `tests/vitest/ui/stack-editor-wave.test.tsx`. |

---

## 3. Shipped TASK-286 contract

### Runtime and schema

- Stack now supports responsive `align`, `justify`, and `wrap` values while
  preserving legacy scalar payload compatibility.
- Runtime output exposes deterministic breakpoint markers for responsive axis
  and wrap state, while legacy single markers mirror the mobile values.
- New Stack-owned flexbox tokens are available: `baseline`, `around`, and
  `evenly`.

### Editor UX

- Wizard now communicates when controls write all breakpoints and can set common
  `gap`, `align`, and `justify` values without forcing authors into Visual.
- Visual and Advanced now expose per-breakpoint alignment, distribution, and
  wrap controls.
- Visual variant cards now include miniatures, and editor-side slot guidance is
  explicit without leaking admin-only CTA behavior into public runtime.

### Documentation boundary

- Variants are documented as presets rather than immutable behavior locks.
- Shared duplicate-zero semantics and Advanced variant ownership remain routed to
  TASK-256 instead of being silently re-implemented here.

---

## 4. Remaining shared follow-ups

- `BUG-02` (`none` vs `0` zero-gap semantics) remains a shared TASK-256 token
  policy item.
- `ISSUE-02` (Advanced variant ownership) remains a shared TASK-256 editor-mode
  ownership item.

No other Stack-specific Playwright drift remains unrouted after TASK-286.
