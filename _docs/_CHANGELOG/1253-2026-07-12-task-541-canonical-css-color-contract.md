# 1253 - TASK-541 Canonical CSS Color Contract

Date: 2026-07-12
Version: Unreleased
Tasks: TASK-541, TASK-541-01, TASK-541-01-L01, TASK-541-01-L02,
TASK-541-02, TASK-541-02-L01, TASK-541-02-L02, TASK-541-02-L03,
TASK-541-03, TASK-541-03-L01

## Key Changes

### One canonical color policy

- Added one Bun-free parser/normalizer for bounded CSS color values with explicit
  `authoring` and `inherited-render` profiles. It owns original-input length and
  ASCII-space rules, semantic RGB/HSL/alpha bounds, stable function/keyword
  casing, canonical decimal output, and literal RGB/alpha metadata.
- Structural schema patterns remain prefilters; every enrolled write/render
  consumer reuses semantic parsing. A shared immutable corpus and parity suite
  exercise original inputs, canonical idempotence, exact limits,
  control/non-ASCII whitespace, rejection, and the separately bounded CTA
  gradient grammar.

### Admin, Menu, Form, and retained compatibility

- Shared Page/admin color controls, Menu writes, Form theme writes/previews, and
  the finite retained read/render seams now consume the canonical owner instead
  of local color-language mirrors. Invalid values fail closed without raw,
  optimistic-preview, or persistence drift.
- Menu stays on `authoring`; Form keeps its existing TASK-516 end-to-end
  `inherited-render` exception. Page keeps its exact seven-token legacy backend
  filter until TASK-539 imports the shared parser. TASK-541 adds no defaults:
  sparse owner fields remain present-only, while documented retained empty or
  explicit fallback values stay byte-compatible.
- Production `formRuntimeScript.ts` is byte-identical to HEAD; its test is a
  regression gate, not a runtime/widget feature. The no-theme Form Embed test now
  pins the real pre-task HEAD length and SHA-256. Static source/AST inventories
  cache immutable reads to eliminate their confirmed under-load timeout without
  weakening assertions or increasing a timeout.

### Runtime Preview accessibility and workflow integrity

- A corrected visual audit rejected a Design-canvas screenshot as Runtime
  Preview evidence. Opening the real dialog then exposed an existing description
  advisory, so its unchanged visible copy now uses `DialogDescription` and is
  bound through `aria-describedby` without a visual/layout change.
- The implementation workflow now requires the actual dialog role/name/resolved
  description, persisted and computed dialog/public parity, zero console errors,
  warnings and page errors, exact created/deleted fixture identities, restored
  Menu/theme/front state, separate admin/front health, PNG signature plus unique
  path/inode/SHA-256 evidence, a pre-closure visual audit, root TypeScript, exact
  validation counts, and the exact allowed external strict-scan identity.

### Product and security boundary

- Admin Dashboard remains the only configurable widget surface. No endpoint,
  database migration, dependency, schema version, generic widget, preset,
  template, module-pack entry, scanner exception, or non-Dashboard widget editor
  was added.
- Existing route auth/RBAC/CSRF/rate-limit contracts are unchanged. Menu/Form
  continue to reject unknown input through their owning schemas, and rejected
  raw values are not emitted or added to error payloads.

## Validation and smoke

- Core lint/type lint and root TypeScript passed. Final stabilized validation
  passed 55 Vitest files / 1,428 tests and 40 DB-backed Menu/Form route tests /
  392 expectations. Admin build processed 2,637 modules; the 776-file browser
  boundary and bundle budgets (34.94/192.42/218.79 KiB gzip) passed; all five
  Coderso release gates passed.
- Five fresh final audit lenses reported 0 High/Medium/Low findings after the
  verified workflow, accessibility, legacy-doc, byte-baseline, and test-runtime
  drift was corrected. The strict security scan remained non-green solely for
  the exact unchanged TASK-545-owned finding in
  `_docs/_workflows/task-522-author.mjs`; Bun audit, Trivy, and Gitleaks were
  clean, TASK-541 had no finding, and no scanner configuration changed.
- The canonical seven-flow smoke used `coderso-dev-core-host` and separate full
  `playwright-cli -s=wf541smoke ...` commands. The final replacement Flow 7 used
  the documented task-scoped `wf541flow7final` session on current post-repair
  source and proved save/reopen, canonical `currentColor` + `rgb(12, 34, 56)`,
  the actual described Runtime Preview, the supported Page Form block, publish,
  and front computed-color parity with zero console errors, console warnings, or
  page errors. Across the audit/remediation history, 21 distinct valid PNGs were
  retained; every task fixture/route, preference/front/site-shell state, browser
  session, port, and helper process was verified cleaned or restored.
