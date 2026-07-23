# TASK-539-08-L01: Nine-Flow Page Parity Suite and Closure

# FileName: TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md

**Parent Subtask:** TASK-539-08
**Priority:** High
**Category:** Pages / Validation / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-539-01 through TASK-539-07
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create in this leaf only)

---

## File ownership

May edit only tests/docs/closure artifacts:

- `tests/integration/runtime/pages-runtime.test.ts`
- `tests/integration/runtime/site-shell-runtime.test.ts`
- `_docs/PAGE_MODEL.md`
- `_docs/SECURITY_SPEC.md`
- `docs/guide/screens/page-editor-preview-settings-and-history.md`
- TASK-539 descendant statuses, TASK-539 parent status, the TASK board/index,
  changelog 1251 and changelog index
- task-prefixed screenshots named `_docs/_workflows/_smoke/task-539-*`

Do not edit production source or another task family's files. Read task/changelog
indexes fresh immediately before closure and apply only TASK-539 rows/statistics.

## Implementation Pseudocode

### Aggregate Validation

```text
verify every source leaf and owned targeted suite is complete
check database reachability before DB-backed runtime suites
run targeted lanes -> lint/type/build/boundary -> runtime -> gates/security
on a named failure: rerun that file alone; fix verified in-scope drift; repeat gate
run fresh post-audit lenses and real-browser scenarios on the final working tree
only after clean evidence: update docs -> descendants -> parent -> indexes/changelog
on any unresolved required failure: leave statuses open and record the blocker
```

Run the exact targeted suites from leaves 01–07, then:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
set -a && source .env && set +a
bun test --timeout=15000 tests/integration/routes/pages.test.ts
bun test tests/integration/runtime/pages-runtime.test.ts
bun test tests/integration/runtime/site-shell-runtime.test.ts
bun run gates:coderso
bun run scan:security:strict
git diff --check
```

Check DB reachability before the Bun runtime files. Rerun any named failing file once
in isolation. Record genuine pre-existing failures separately; do not weaken tests or
add production fallbacks.

Add runtime integration assertions for a published Page plus configured footer using
distinct effect types, responsive CSS and canonical gallery/background data. Assert
rendered HTML/CSS contains the public contract and no unsafe raw value.

## Post-audit

Run approximately five fresh read-only lenses after all tests/docs are final:

1. finding/scope fidelity and TASK-535 remains closed;
2. model strictness, legacy-read compatibility and present-only byte identity;
3. CSS sanitizer/raw-style security and selector parity;
4. transform/runtime/main-footer correctness and reduced motion;
5. test integrity, docs/task/changelog graph and collision boundaries.

Every finding needs `file:line` evidence. Fix verified HIGH/MEDIUM findings, rerun the
affected gate, then rerun a fresh lens/reconcile; do not accept a missing result as a
pass.

## Real browser smoke

Restart the dev server and use a task-scoped `playwright-cli` session. Execute at
least these nine distinct real flows:

1. Insert gallery, add three media items with alt/caption/categories, save/reopen,
   publish, filter by keyboard/mouse; assert image bounds, hidden state and ARIA.
2. Desktop/tablet/mobile custom font, explicit transform reset and spans; assert
   computed font/transform/grid placement in editor and published front.
3. Open/close the Page inspector at 320/390/480px in light and dark admin themes;
   assert positive usable canvas width, reachable controls, and no horizontal trap.
4. Base layer plus partial device override/reset; combine reveal, decoration, hover,
   tilt and layer; assert every computed channel and full-width wrapper geometry.
   Also render a reveal-only section whose block has no block-owned effect and assert
   the descendant's computed transform changes through the shared host selector.
5. Magnetic as the only authored composition effect in separate main and footer
   fixtures: pointer move/leave changes then resets computed transform on fine pointer;
   reduced-motion/coarse pointer stays neutral; both roots receive composition styles.
6. Marquee segment adjacency/no wrap/no blank gap during animation plus glow
   click-through using `elementFromPoint`.
7. Full-bleed responsive gradient stack with final color; assert viewport-wide paint,
   no capped/double-tone box and invalid input absent.
8. Main and footer with different effects; assert both initialize exactly once after
   parser-order execution.
9. Divider gating and default/compact/single timeline; assert visible rule length and
   line endpoints at marker centers.

Cover admin light/dark where the editor appears, every relevant viewport, publish→front
parity, and zero console errors. Save screenshots for human review. Assertions must be
computed styles, bounding boxes, DOM/ARIA state or actual click targets—not mere control
or CSS-string presence. Save them under `_docs/_workflows/_smoke/` with the exact
`task-539-` filename prefix and record scenario IDs, theme/viewport, visible assertions,
console-error results, and screenshot paths in TASK-539 closeout evidence. TASK-545's
future manifest/evidence path is not a prerequisite for this earlier task.

## Documentation and closure

- Document canonical gallery shape/legacy adapter, layer merge, responsive typography
  and span target, background split, effect variables, runtime idempotence, reduced
  motion and present-only guarantees.
- Create `_docs/_CHANGELOG/1251-{YYYY-MM-DD}-task-539-page-v2-post-audit-remediation-ii.md`
  using the actual closure date and the live `{N}-{YYYY-MM-DD}-short-title.md`
  convention, then update its index.
- Mark every physical descendant Done before marking TASK-539 Done; update board rows
  and recompute statistics from physical task files.
- Record validation commands/results, smoke screenshots, post-audit summary and the
  exact commit scope for the owner. Do not commit as an agent.
