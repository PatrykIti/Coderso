# 868. TASK-275 navigation widget followups

- Date: 2026-05-19
- Version: Unreleased
- Tasks: TASK-275, TASK-275-01, TASK-275-02, TASK-275-03, TASK-275-04, TASK-275-05, TASK-275-05-01, TASK-275-05-02, TASK-275-05-03, TASK-275-05-04, TASK-275-06

## Key Changes

### CMS Widgets
- landed the Navigation widget follow-up family with safe linked logos, hash-link editor parity, real `minimal` vs `drawer` mobile behavior, bounded CTA placement, and runtime collapse/active-link handling
- added touch and keyboard submenu disclosure controls, plain-text icon/badge/description metadata rendering, safe manual link target handling, and client-side active-link detection without widening shared sanitizer ownership
- expanded Navigation-owned visual and brand controls with hover/active colors, underline, letter spacing, shadow, blur, dropdown direction, motion, logo size, CTA radius, and CTA separator tokens

### Admin UI
- upgraded Navigation editors with labelled logo-link fields, link metadata and target controls, top-level and child reordering, limit feedback, Wizard overflow messaging, menu-source read-only previews, and clearer mobile/runtime guidance
- kept extra actions on the existing `Right Actions` slot instead of inventing a second persisted CTA contract

### QA And Docs
- refreshed the Navigation widget source-of-truth doc, final Playwright report classification, task board state, and changelog evidence for the closed TASK-275 family
- kept shared builder live-preview and Section sticky containment findings routed to `TASK-313` and `TASK-314` instead of masking them with widget-local patches

## Validation

- `bun run lint` - passed, including `bun --cwd core lint`, `bun --cwd core lint:types`, repo ESLint, and repo `tsc --noEmit`
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/ui/navigation-editor-wave.test.tsx` - passed
- `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts tests/unit/widgets/validator.test.ts` - passed
- `bun run gates:coderso` - passed across `functional`, `ux`, `performance`, `security`, and `reliability`
- `bun run precommit` - passed
- `bun run test:bun` - sampled and failed outside Navigation ownership in broad shared lanes such as `commerce`, `forms`, `kits`, `content` owner-seam invalidation, and detail-page runtime tests; the run was stopped after repeated unrelated failures once the user accepted scope-local closeout
- `bun run test:vitest` - failed outside Navigation ownership in `tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run scan:security:strict` - started in strict mode, then stopped after the user accepted scope-local closeout instead of waiting on broad shared-lane noise
