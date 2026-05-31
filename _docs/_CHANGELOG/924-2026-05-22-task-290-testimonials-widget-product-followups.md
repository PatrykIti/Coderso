# 924. TASK-290 testimonials widget product followups

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-290, TASK-290-01, TASK-290-02, TASK-290-03, TASK-290-04, TASK-290-05, TASK-290-06, TASK-290-07, TASK-290-08

## Key Changes

### Testimonials product closure

- The Testimonials widget now closes every TASK-290-owned Playwright finding with a single aligned schema across runtime and admin editors: richer Wizard onboarding, explicit spotlight selection, safe avatar/background media picking, bounded section/card styling, CTA output, rich quote support, and owned large-set pagination/import-export behavior.
- Runtime output now preserves truthful static slider semantics through SSR dot navigation, explicit zero-rating display modes, spotlight reordering by `layout.spotlightItemId`, sanitized `quoteHtml`, fail-closed avatar/background/CTA URLs, and a local `load-more` disclosure without adding client-side carousel code.
- The closure pass also synchronized the Testimonials report matrix, widget documentation, task-board rows, and changelog state so the finished family no longer reads like a partial follow-up plan.

### Regression coverage and hardening

- Focused Testimonials coverage now locks the 24-item cap, safe local JSON/CSV import-export, spotlight fallback behavior, slider navigation markers, rating-zero semantics, CTA sanitization, and the new Wizard/Visual/Advanced authoring flows.
- The dedicated import/export owner module keeps row parsing strict, rejects unknown fields, preserves deterministic ids through normalization, accepts rich-quote rows when either `quote` or usable `quoteHtml` is present, emits formula-safe CSV output, rejects one-row imports, and no longer fabricates a second testimonial during one-row export.
- Wizard and Visual editors now keep invalid manual avatar URLs in local draft state instead of persisting unsafe values into the widget payload, while still accepting normalized safe relative or public URLs and media-picker selections.
- The later follow-up drift pass also keeps Visual media-picker draft state truthful after avatar/background asset selection or manual URL edits, so the editor no longer shows stale local media state after the persisted payload changes.
- Final board closure moved TASK-290 plus all physical leaves to Done, replaced the stale To Do rows, and recorded the final validation matrix for `feature/corrections`.
- Focused runtime/editor coverage now also proves `quoteHtml` import fallback rows, JSON object import, CSV unknown-field rejection, 24-row truncation, rating-display branch behavior, runtime style output, and Visual variant-count sync instead of only the earlier happy paths.
- A final follow-up audit also normalized the physical TASK-290 leaf files so their checked execution lists and completion notes match the shipped implementation state.
- The same final pass also routed the remaining shared mode-ownership, contextual avatar-alt, and changelog numbering/index integrity residuals to `TASK-334`, `TASK-335`, and `TASK-333` instead of misclassifying them as Testimonials-local fixes, while the widget docs/report now describe that shared duplication truthfully.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/testimonials.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/renderer.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts`
- `bun run gates:coderso`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` are not installed locally; the command still runs `bun audit` before exiting non-zero)
- `bun run precommit`
- `git diff --check`
