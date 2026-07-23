# TASK-539-07-L02: Prove Main and Footer Idempotence

# FileName: TASK-539-07-L02-Prove-Main-And-Footer-Idempotence.md

**Parent Subtask:** TASK-539-07
**Priority:** High
**Category:** Pages / Vitest / Runtime Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-07-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Sole-writer scope

Create only:

- `tests/vitest/pages/task-539-page-effects-runtime-rescan.test.tsx`

All production, renderer/site-shell, and L01 test files are read-only. The new suite
must be independently runnable and no more than 1,000 physical lines.

## Implementation Pseudocode

Execute the real static source in one happy-dom window at explicit parser boundaries.
Use real `PageDocumentRender` markup where renderer hooks are under test and minimal
fixed DOM only to isolate binder mechanics. Never inject a missing renderer hook merely
to make the runtime pass.

Cover:

1. Main markup + script first, append footer markup + script second; then reverse the
   parser order. In both orders every present reveal/parallax/spotlight/switcher/
   gallery/tilt/magnetic element responds. Spotlight uses
   `[data-page-spotlight]` as its sole binder candidate and writes root-local
   `--spotlight-x`/`--spotlight-y`; an overlay-only node never binds, and main
   movement never writes footer variables or vice versa.
2. Pre-set `window.__codersoPageMotionEffectsInit = true`; prove a fresh controller
   still installs and scans. Assert the flag is written for observation but never read
   as idempotence authority.
3. Run the source repeatedly and call `window.__codersoPageEffectsV2.init(document)`
   and `init(subtree)` repeatedly. Listener/observer spies and observable state must
   prove one user action causes exactly one transition/callback.
4. Assert binder-specific `WeakSet` ownership, global listener cardinality one, and no
   strong element array/Set/Map retained by the controller. Append a new footer node
   after the first scan and prove the next scan binds it.
5. Force one binder and one element setup failure. Later binders/elements still bind;
   retry binds the failed element once and does not duplicate partial listeners.
6. Under reduced motion, switcher/gallery keyboard and ARIA/hidden behavior still
   works while reveal is never armed and parallax/spotlight/tilt/magnetic remain
   neutral.
7. Fine-pointer tilt and magnetic change only
   `--cx-tilt-x/y` and `--cx-magnetic-x/y`; leave restores exact neutral values.
   Combined real renderer markup retains the fixed composition transform and no
   runtime path writes the whole `transform`.
8. Render a real replica-safe seamless marquee containing the four hook families
   production can place in a block subtree: switcher, gallery, tilt, and magnetic.
   Prove their primary candidates bind/respond, replica candidates are excluded
   before setup, one action has primary cardinality one, and repeated scans never
   bind a replica. For reveal, parallax, and spotlight, use explicit minimal fixed-DOM
   candidates under replica-self and replica-ancestor markers to prove the same
   pre-bind rejection; separately prove their real section/root ownership in the
   main/footer fixtures. Consume TASK-539-05's unsafe-subtree fixture and prove its
   form/listing/nested-marquee case has one segment and no replica candidate; do not
   widen this suite into or mock a second form/listing runtime.
9. Main-only, footer-only, no-match, missing-API, and main-without-spotlight then
   footer-with-spotlight fixtures finish with zero console errors.

Use event/observer cardinality and DOM/custom-property outcomes, not source substrings
alone. Keep the static-source security assertions from L01 read-only.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/task-539-page-effects-runtime-rescan.test.tsx
bun run test:vitest -- tests/vitest/pages/pageEffectsRuntime.test.ts tests/vitest/content/sectionScrollEffect.test.tsx tests/vitest/content/cursorSpotlight.test.tsx tests/vitest/content/task-534-interactivity-runtime.test.tsx
bun --cwd core lint:types
bun --cwd core lint
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Rerun a named failing file once in isolation before classification.
