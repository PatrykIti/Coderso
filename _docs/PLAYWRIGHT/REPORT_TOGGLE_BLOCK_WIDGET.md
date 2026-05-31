# REPORT: Toggle Block Widget — UX/UI Audit

**Widget:** `toggle-block`
**Original audit date:** 2026-05-16
**Status:** Refreshed on 2026-05-25 after TASK-336-19 mode-contract cleanup
**Owner files:** `core/widgets/core/toggleBlock.tsx`, `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`

---

## 1. Current widget snapshot

Toggle Block remains a bounded two-pane widget with fixed `primary` /
`secondary` slots. The shipped contract now includes:
- distinct `switch` and `cards` surfaces
- bounded motion options (`none`, `fade`, `slide`)
- configurable accessible copy (`ariaLabel`, `selectedSuffix`)
- swatch-only color controls for wrapper / active trigger colors in Visual
- independent pane style tokens for `primary` and `secondary` in Visual
- read-only Advanced diagnostics for runtime, style, and support summaries
- explicit editor guidance that Toggle Block intentionally stops at two panes

Shared TASK-256 repairs are already present on the current base and remain out
of TASK-292 implementation ownership.

## 2. Final finding matrix

| Source finding | Final status | Evidence |
|---|---|---|
| Duplicate HTML IDs, cross-instance `aria-controls` / `aria-labelledby`, and scoped runtime roots | Routed to TASK-256 shared scope and already landed on the current base | `toggleBlock.tsx` now uses `scopedId(...)`, scoped `data-coderso-*` markers, and per-root event binding instead of page-global IDs/selectors. |
| Global `window.__nextlessToggleBlockBound` runtime flag | Routed to TASK-256 shared scope and already landed on the current base | Runtime now uses per-root `data-codersoToggleBound` state instead of a `window.*` singleton. |
| Helper text could not be cleared | Routed to TASK-256 shared scope and already landed on the current base | `normalizeToggleBlockData()` preserves an intentional empty helper string and the editor clear action keeps it empty. |
| Missing Clear controls for `borderColor` and `accentColor` | Shared control gap closed on the current base; TASK-292 now consumes the shared color control consistently | Toggle Block uses `SharedColorControl` for surface, border, accent, and accent-contrast fields. |
| Hardcoded `--nextless-toggle-accent-contrast` | Fixed by TASK-292 | Persisted `style.accentContrastColor`, editor control, and contrast advisory now own the active trigger text/readability path. |
| `cards` variant differed only slightly from `switch` | Fixed by TASK-292 | `cards` now renders preview-backed selector cards, pane subtitles, stronger pane framing, and a different trigger layout instead of only radius/padding drift. |
| No per-pane styling | Fixed by TASK-292 | `style.panes.primary` and `style.panes.secondary` now normalize and render independent `surface`, `padding`, `radius`, and `borderEmphasis` tokens. |
| No motion / transition control | Fixed by TASK-292 | `options.motion` now supports `none`, `fade`, and `slide` through bounded class maps with reduced-motion fallbacks. |
| Hardcoded radiogroup label | Fixed by TASK-292 | `labels.ariaLabel` and `labels.selectedSuffix` now drive radiogroup labeling and live-status copy. |
| Missing variant previews | Fixed by TASK-292 | Wizard/Visual variant cards now include preview miniatures via `data-widget-control="toggle-block.variant-preview.*"`. |
| Wizard felt too shallow | Fixed by TASK-292 | Wizard now follows a guided `Variant -> Labels -> Starting pane` setup path. |
| All three editor modes duplicated the same Variant block | Fixed by TASK-292 and tightened by TASK-336-19 | Advanced no longer owns Variant controls or any writable controls. Accessibility and pane-card styling now live in Visual, while Advanced is read-only diagnostics. |
| No reset-to-defaults action | Superseded by TASK-336-19 | Advanced no longer performs immediate reset mutation. Reset/default repair belongs in a confirmed support flow outside the normal read-only Advanced diagnostics surface. |
| Editor preview did not clearly communicate the active/default pane | Fixed by TASK-292 | Wizard/Visual now render a default-state preview notice that spells out which pane opens first. |
| Empty pane placeholder did not explain how to add content | Fixed by TASK-292 | Editor-preview placeholders now use human-facing pane labels and page-builder guidance while public runtime stays clean. |
| No color picker / token-list affordance | Fixed by TASK-292 and tightened by TASK-336-19 | The widget now uses swatch-only Visual color controls. Saved legacy/custom color values remain replace-or-clear compatible without asking nontechnical users to type CSS/token strings. |
| No support for 3+ states | Intentional product boundary | Toggle Block remains explicitly limited to two panes; 3+ views are routed to Tabs or future product scope, not hidden inside this widget family. |

## 3. Product decisions captured by TASK-292

### Fixed two-pane boundary

Toggle Block is now explicitly documented as a two-pane widget. The report no
longer treats 3+ states as an unowned gap.

### Shared vs local ownership

TASK-292 does not claim the landed TASK-256 shared contract repairs for helper
clear behavior, scoped IDs, runtime binding, or public placeholder gating.
Those rows are documented as shared-scope dependencies that are already present
on the current base.

`TASK-329` now owns the later shared runtime transport layer: Toggle Block
consumes the page-scoped script collector so multiple public instances share one
static runtime payload while editor preview stays script-free.

### Public/runtime safety

No API routes were added. New styling and motion controls stay bounded to enum
or token-backed values and do not introduce raw class names, scripts, or public
admin-only controls.

## 4. Validation refresh

Validated on 2026-05-23 with:
- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/site/publicRenderer.test.tsx` — PASS
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx` — PASS
- `bun test tests/unit/widgets/validator.test.ts` — PASS
- `bun run lint` — PASS
- `bun --cwd core lint` — PASS
- `bun --cwd core lint:types` — PASS
- `bun run gates:coderso` — PASS
- `git diff --check` — PASS
- `bun run scan:security:strict` — PASS after provisioning the required local scanner CLIs in the TASK-292 worktree; Semgrep, `bun audit`, Trivy vuln/config/secret, and Gitleaks history/worktree all completed cleanly.
- `bun run precommit` — PASS after the final closure state is staged.

Validation evidence is synchronized with the task board and changelog in the
TASK-292 closure pass.

### TASK-336-19 validation refresh

Validated on 2026-05-25 with:
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/editorContract.test.ts` — PASS
- `bun scripts/playwright-widget-contract-smoke.ts --session t33619-toggle --widget toggle-block --admin http://localhost:5173/admin --front http://localhost:3000 --output-json _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-toggle-block-advanced-readonly-2026-05-25.json --output-md _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-toggle-block-advanced-readonly-2026-05-25.md --strict` — PASS (`adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, `metadataGaps=0`)

TASK-336-19 also removes seeded root color token defaults from fresh Toggle
Block payloads. Runtime still applies theme fallbacks when those values are
omitted, so fresh widgets inherit the theme instead of appearing as saved custom
CSS token values in Visual. Advanced also no longer renders the raw JSON payload
preview; support sees read-only runtime, style, and contract summary rows
instead.
