# TASK-539-07-L01: Bind Each Page Root and Footer Exactly Once

# FileName: TASK-539-07-L01-Bind-Each-Page-Root-And-Footer-Exactly-Once.md

**Parent Subtask:** TASK-539-07
**Priority:** High
**Category:** Pages / Browser Runtime / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-539-04-L01, TASK-539-05-L01
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Sole-writer scope

This leaf is the only writer of:

- `core/services/pages/pageEffectsRuntime.ts`;
- `tests/vitest/pages/pageEffectsRuntime.test.ts`;
- `tests/vitest/content/sectionScrollEffect.test.tsx`;
- `tests/vitest/content/cursorSpotlight.test.tsx`;
- `tests/vitest/content/task-534-interactivity-runtime.test.tsx`.

Do not edit `pageRendererV2.tsx`, renderer suites, any site-shell source,
or `page-runtime-shell-branch.test.tsx`. TASK-539-05 owns the stale renderer
runtime-init comment and emission. L02 alone owns the new parser-order suite.

## Implementation Pseudocode

### Controller and compatibility flag

Keep `PAGE_EFFECTS_RUNTIME_ID`,
`PAGE_EFFECTS_RUNTIME_INIT_FLAG === "__codersoPageMotionEffectsInit"`,
`PAGE_EFFECTS_REDUCED_MOTION_QUERY`, and the public static-source export stable.
Replace the old flag guard with:

```js
var state = window.__codersoPageEffectsV2;
if (!state || typeof state.init !== "function") {
  state = window.__codersoPageEffectsV2 = createController();
}
state.init(document);
window.__codersoPageMotionEffectsInit = true;
```

The generated source may write the old flag for compatibility observation but must
never read it or return because it is already true. Every emitted main/footer copy
calls `init(document)`.

`createController()` owns one `WeakSet` for each binder:

```text
reveal, parallax, spotlight, switcher, gallery, tilt, magnetic
```

It may also own booleans/functions for document/window listeners and a reusable
observer, but no `Element[]`, `NodeList`, `Set<Element>`, map keyed by elements, or
other global strong element collection.

Import `PAGE_MARQUEE_REPLICA_SELECTOR` and
`PAGE_BLOCK_TRANSFORM_VARIABLES` from their pure
`pageCompositionEffects.tsx` owner. Serialize those fixed values while constructing
the static source so the emitted IIFE remains dependency-free; do not duplicate a
selector or custom-property spelling in this module.

### Init order and binding

```text
init(root)
  -> bind switcher roots under root
  -> bind gallery-filter roots under root
  -> compute prefers-reduced-motion
  -> if reduced: return from init only
  -> bind/arm reveal roots and reveal elements
  -> bind parallax elements and ensure global scroll/resize once
  -> bind spotlight roots
  -> bind tilt elements
  -> bind magnetic elements
```

`root` accepts the current `Document` or an element subtree. Query fixed selectors
within that supplied root and include the root itself when it matches. A repeated scan
skips only an element already in that binder's `WeakSet`; it never skips undiscovered
footer nodes.

Before setup, every one of the seven binders rejects a candidate when the candidate
itself matches `PAGE_MARQUEE_REPLICA_SELECTOR` or its closest ancestor matches it.
This check happens before listener/observer/state attachment and before a WeakSet mark,
so a recursively safe inert marquee replica can retain visual hooks without becoming
interactive. The primary segment remains eligible. TASK-539-05 guarantees that
`video`, `form`, `collection`, `filters`, `embed`, and nested authored-marquee
subtrees emit no replica; do not modify the form/listing runtimes or pretend this
seven-binder exclusion covers them.

Real renderer integration and defensive binder fixtures are distinct. A replica-safe
marquee can contain real switcher/gallery nodes and tilt/magnetic block hosts. Reveal
and parallax belong to section wrappers, while spotlight binds only the exact
`[data-page-spotlight]` Page root; `[data-page-spotlight-overlay]` is merely its
painted consumer. Those three cannot be generated inside a real marquee segment. Test their
replica-self/ancestor rejection with minimal fixed DOM owned by the runtime suite;
never add fake production hooks merely to manufacture one impossible renderer tree.

Each binder catches failures per element and `init` catches failures per binder so one
missing API or malformed node cannot block later binders. Add an element to its
`WeakSet` only after its observer/listeners/state are ready. If a binder can partially
attach before failing, remove its partial listeners before leaving it unmarked so a
retry cannot duplicate them.

Document/window-wide scroll/resize or observer infrastructure is installed once and
must discover current matching nodes without retaining a strong element array.
Detached elements therefore remain collectible. No whole-document
`MutationObserver` is added; parser-order script execution supplies the rescan.

### Functional versus motion behavior

Switcher and gallery filtering remain functional under reduced motion, including
click, keyboard, roving tabindex, `aria-selected`/`aria-pressed`, panel `hidden`, and
filter-item hidden state. Their binders therefore precede the reduced-motion branch.

Reveal, parallax, spotlight, tilt, and magnetic are motion and run only after the
branch. Reduced motion never arms reveal-hidden content. Fine-pointer gating remains
local to spotlight/tilt/magnetic, so a coarse pointer does not block unrelated
binders.

### Transform ownership

Tilt writes only the imported `tiltX`/`tiltY` properties in degrees; leave resets only
those properties to `0deg`. Magnetic writes only the imported
`magneticX`/`magneticY` properties in pixels; leave resets only those properties to
`0px`. Exact bytes are owned by `PAGE_BLOCK_TRANSFORM_VARIABLES`. Never set, remove,
or clear `style.transform`, and never write another effect's variable.
Glare retains only its own glare variables. Parallax keeps its separate
`[data-parallax-inner]` channel and must not overwrite a block transform host.
Spotlight preserves its existing contract: fine-pointer movement sets only
`--spotlight-x` and `--spotlight-y` on the matched `[data-page-spotlight]` root.
Queries and writes stay inside the supplied main/footer root, and the overlay only
consumes the inherited values. This task adds no pointer-leave/reset behavior for
spotlight.

### Error behavior

The static IIFE remains fail-soft. Do not expose caught error text or log raw DOM/data.
No matching elements, missing APIs, main-only, and footer-only documents complete
without an exception or console error.

## Existing-test repair

Before the source gate, update the four focused suites to prove:

- exact controller name/shape, old-flag literal stability, and no old-flag read/early
  return;
- every static script calls `init(document)` and remains free of interpolation/code
  sinks;
- existing reveal/parallax/spotlight behavior and gates still work after resetting
  both controller and observation flag between tests;
- switcher/gallery continue under reduced motion;
- tilt/magnetic use only exact custom properties and reset only owned values;
- spotlight uses the exact root hook and `--spotlight-x`/`--spotlight-y`, with
  main/footer root-local updates and no overlay-node binding;
- every binder ignores replica-self and replica-descendant candidates in a safe
  two-segment marquee while the corresponding primary candidate still binds; an
  unsafe subtree has one segment and no replica candidate;
- one missing API/binder failure does not abort later focused behavior.

Replace stale one-shot expectations; do not weaken security, ARIA, geometry, or
event-count assertions. L02 owns all additive main/footer parser-order combinations.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/pageEffectsRuntime.test.ts tests/vitest/content/sectionScrollEffect.test.tsx tests/vitest/content/cursorSpotlight.test.tsx tests/vitest/content/task-534-interactivity-runtime.test.tsx
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Rerun any named failing file once in isolation before classification.
