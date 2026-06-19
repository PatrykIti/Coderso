# TASK-469: Pages Editor Rich-Text Inline Canvas Edit Fidelity
# FileName: TASK-469_Pages_Editor_Rich_Text_Inline_Canvas_Edit_Fidelity.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Inline Edit
**Estimated Effort:** Medium
**Dependencies:** TASK-422 (inline-edit contract + canvas `contentEditable` infrastructure, Done), TASK-438 (text-block remediation that made `format:"rich"` panel-only, Done). Shares `core/services/pages/pageRendererV2.tsx` with sibling TASK-470 (image.fit / video.title render wiring) — coordinate to land both in one touch of the renderer and avoid render-path drift.
**Status:** ⏳ To Do

---

## Overview

Carried-forward residual from the audit follow-up closure
(`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 item 1; originally surfaced as
the §3.4 row, a residuum from TASK-422). Severity **MEDIUM (UX)**.

A `text` block with `props.format === "rich"` stores allowlisted inline HTML
(`<strong>`, `<em>`, `<a>`, lists, …). The floating-panel "Primary text" content
field preserves that markup, but **inline canvas edit is lossy**:

- The inline-edit contract `resolveInlineEditTarget` returns `null` for
  `text` + `propPath === "text"` + `format === "rich"`
  (`core/services/pages/pageInlineEditContract.ts` lines 114–116), so today the
  canvas `contentEditable` surface never activates for rich blocks — they are
  panel-only by design (TASK-438 made this an intentional fail-closed gate so
  inline edit could not collapse stored HTML to plain text).
- The general inline commit path runs `sanitizeInlineText` →
  `stripInlineMarkup` (lines 249–263, 289–295), a one-way fixpoint loop that
  **strips ALL markup to plain text**. If a rich block were naively routed
  through it, `<p>Hello <strong>world</strong></p>` would commit as
  `Hello world`.

The net defect the audit logged: the panel and canvas diverge for the same
block, and any future/accidental inline edit of a rich block flattens its
formatting.

**Goal.** Make inline canvas edit of `format:"rich"` text blocks round-trip
formatting consistently with the panel field — bold/italic/links/lists survive
an inline edit — by routing the rich commit through the **same sanitized
rich-text contract the front renderer already trusts**
(`sanitizeAuthoringRichTextHtml` → `renderSanitizedRichTextHtml`), instead of
`stripInlineMarkup`. Plain-text targets keep their existing `stripInlineMarkup`
path unchanged.

**Owning modules.**
- `core/services/pages/pageInlineEditContract.ts` — Bun-free contract: target
  resolution, sanitizer, empty-commit policy. Primary change surface.
- `core/services/pages/pageAuthoringSanitizers.ts` — owns the canonical shared
  rich-text sanitizer `sanitizeAuthoringRichTextHtml` (lines 103–111) and the
  `pageRichTextAllowedTags` / `pageRichTextSelfClosingTags` allowlist (lines
  80–93). Reused, not re-derived.
- `core/services/pages/pageRendererV2.tsx` — `renderTextBlock` (lines 726–741)
  sanitizes via `sanitizeAuthoringRichTextHtml` (line 727) and renders through
  `renderSanitizedRichTextHtml`, passing both a plain-text fallback (`text`) and
  the rendered rich tree (`children`) to `context.renderInlineText`.
- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` —
  `InlineEditableCanvasText` (lines 71–156): the null-guard at lines 92–93 and
  the `onBlur` commit at lines 133–142 that reads raw `contentEditable` content
  and calls `onCommit`.

**Source of truth.** `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 item 1
(ownership, line ~238) and §3.4 (line ~92–96, original finding).

**Out of scope.**
- `image.fit` / `video.title` render wiring — that is **TASK-470** (same §9.4
  closure class, shares `pageRendererV2.tsx`).
- Adding new formatting affordances (toolbar, slash commands, new tags) beyond
  what the panel rich-text field and `pageRichTextAllowedTags` already support.
  This task is parity + fidelity, not feature expansion.
- Changing the panel "Primary text" editor stack or its sanitizer.
- Making any other block prop newly inline-editable.

---

## Security Contract

**No endpoint, route, or permission-model changes.** HTML sanitization / XSS is
nonetheless the core risk because this task newly admits markup into the inline
commit path, so the sanitizer invariants are load-bearing:

1. **Single allowlist, no second source of truth.** The rich inline commit MUST
   reuse `sanitizeAuthoringRichTextHtml` (`pageAuthoringSanitizers.ts` 103–111)
   — the exact sanitizer the renderer (`pageRendererV2.tsx:727`) and panel
   already enforce. Do **not** invent a parallel tag allowlist. Allowed tags
   stay `pageRichTextAllowedTags` (`a, br, code, em, i, li, ol, p, strong, ul`),
   self-closing stays `pageRichTextSelfClosingTags` (`br`).
2. **Dangerous tags + content always dropped.** `dangerousHtmlContentTagSet`
   (`postRichTextHtmlUtils.ts:19–31`: `script, style, iframe, object, embed,
   form, button, textarea, select, svg, math`) and their content are removed by
   the shared policy. `onclick`/event attributes, and `javascript:` / unsafe
   `href` URLs are stripped by `sanitizePageRichTextAttributes` (only `<a>`
   keeps a validated `href` re-emitted with `rel="nofollow noreferrer"`).
3. **Fail closed on drift.** Non-string `block.props.text`, unknown
   block/prop combinations, and schema drift must still resolve to `null` /
   keep previous value. The new rich path must not widen any non-rich target.
4. **No raw-HTML injection path.** The commit output is the sanitizer's output,
   never the raw `contentEditable` string. The renderer keeps using
   `renderSanitizedRichTextHtml` (tokenized React tree) — **no new
   `dangerouslySetInnerHTML`** is introduced; canvas-edit parity is achieved by
   re-sanitizing on commit, not by trusting innerHTML.
5. **Control-character hygiene preserved.** `removeControlCharacters`
   (C0/C1 + DEL, tab/LF preserved) continues to apply to the rich path.
6. **Empty-commit policy preserved.** Required targets (`allowEmpty: false`, and
   `text.text` is required) keep the previous value when the sanitized result is
   empty, so an empty inline commit can never hollow or prune a rich block.
7. **No new data reaches client cache or logs.** The committed value is the same
   shape (a string in `block.props.text`) the document already persists; no
   diagnostics, raw HTML, or PII is newly emitted.

Invariant to assert in tests: the inline-committed rich string is byte-equal to
`sanitizeAuthoringRichTextHtml(rawCanvasHtml)` for safe input, and contains no
member of `dangerousHtmlContentTagSet` for hostile input.

---

## Sub-Tasks

- [ ] Reproduce the lossy round-trip: confirm a `format:"rich"` block is panel-only on the canvas today (no `contentEditable`), and that routing it through `sanitizeInlineText` would flatten markup. Capture the failing assertion against `tests/vitest/services/page-inline-edit-contract.test.ts:94–99`.
- [ ] Extend the inline-edit contract in `pageInlineEditContract.ts` so a `text` block with `format === "rich"` resolves to a target that is flagged rich-aware (`preserveMarkup`) instead of returning `null` at lines 114–116. Keep every other fail-closed branch (non-string value, unknown prop, list link objects) intact.
- [ ] Add `sanitizeInlineRichText` that delegates to the shared `sanitizeAuthoringRichTextHtml` (import from `pageAuthoringSanitizers.ts`) for tag preservation, while still normalizing line endings and stripping control characters. Do **not** call `stripInlineMarkup` on the rich path. Verify this import does not break the Bun-free / no-DOM / no-admin-UI boundary of the contract module (the sanitizer chain `pageAuthoringSanitizers` → `postRichTextHtmlUtils` is pure string work — confirm during impl).
- [ ] Branch `commitInlineText` so it dispatches to `sanitizeInlineRichText` when `target.preserveMarkup` is set, else keeps the existing `sanitizeInlineText` path. The empty-commit policy (`next.length === 0 && !allowEmpty → previous`) wraps both branches unchanged.
- [ ] Wire `InlineEditableCanvasText` (`PageAuthoringCanvas.tsx`) so rich targets activate a `contentEditable` surface seeded from the rendered rich tree (`children`), and the `onBlur` path (lines 133–142) reads the edited HTML and commits via the rich dispatcher. Plain-text targets are unchanged.
- [ ] Confirm panel ↔ canvas parity: a block edited inline then opened in the panel "Primary text" field shows identical markup, and vice versa (both ultimately persist through the same allowlist).
- [ ] Add Vitest regression coverage (see Implementation Pseudocode → Regression-test shape) and update/replace the existing panel-only assertion at `page-inline-edit-contract.test.ts:94–99`.
- [ ] Run the validation baseline and reconcile docs (README row, changelog, audit §9.4 item 1).

---

## Implementation Pseudocode

All contract changes stay in `core/services/pages/pageInlineEditContract.ts`
(Bun-free; only adds a pure-string sanitizer import). `stripInlineMarkup` and
`sanitizeInlineText` remain the path for every non-rich target.

```ts
// --- pageInlineEditContract.ts ---

// New: reuse the canonical renderer/panel sanitizer instead of a second allowlist.
import { sanitizeAuthoringRichTextHtml } from "./pageAuthoringSanitizers";

// 1) Target type gains an optional, defaulted-false rich flag.
export type InlineEditableTarget = {
  blockType: PageBlockType;
  propPath: string;
  multiline: boolean;
  allowEmpty: boolean;
  /** Rich targets sanitize-and-preserve allowlisted HTML instead of stripping to text. */
  preserveMarkup?: boolean;
};

// 2) resolveInlineEditTarget: stop returning null for format === "rich".
//    Materialize a frozen rich-aware target instead.
if (target.propPath === propPath) {
  if (block.type === "text" && propPath === "text" && block.props.format === "rich") {
    // Was: return null;  (panel-only fail-closed gate)
    return typeof block.props[propPath] === "string"
      ? Object.freeze({ ...target, preserveMarkup: true })
      : null; // non-string stored value still fails closed
  }
  return typeof block.props[propPath] === "string" ? target : null;
}

// 3) New rich sanitizer: delegate tag preservation to the shared sanitizer,
//    keep line-ending + control-char hygiene. NEVER calls stripInlineMarkup.
export function sanitizeInlineRichText(
  target: InlineEditableTarget,
  raw: string
): string {
  const normalizedLineEndings = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n");
  const cleaned = removeControlCharacters(normalizedLineEndings);
  // Shared allowlist policy: keeps pageRichTextAllowedTags, drops
  // dangerousHtmlContentTagSet + their content, validates <a href>,
  // returns "" for non-string input (fail closed).
  return sanitizeAuthoringRichTextHtml(cleaned).trim();
}

// 4) commitInlineText: dispatch on preserveMarkup; empty-commit policy unchanged.
export function commitInlineText(
  target: InlineEditableTarget,
  previous: string,
  raw: string
): string {
  const next = target.preserveMarkup
    ? sanitizeInlineRichText(target, raw)
    : sanitizeInlineText(target, raw); // plain-text path, still strips markup
  if (next.length === 0 && !target.allowEmpty) return previous;
  return next;
}
```

```tsx
// --- PageAuthoringCanvas.tsx : InlineEditableCanvasText (lines ~71-156) ---
const target = resolveInlineEditTarget(block, propPath);
if (!target) return <>{children ?? text}</>; // unchanged fail-closed render

// Rich targets edit the rendered tree; the surface is seeded from `children`
// (the sanitized rich JSX), NOT from the plain-text fallback.
// onBlur (lines ~133-142): read the edited HTML from the contentEditable element
// (innerHTML for rich, readInlineEditableElementText for plain), then:
const committed = commitInlineText(target, previousStored, rawFromCanvas);
onCommit(committed);
```

**Data flow (rich).** canvas `contentEditable` innerHTML → `onBlur` →
`commitInlineText(target{preserveMarkup}, previous, rawHtml)` →
`sanitizeInlineRichText` → `sanitizeAuthoringRichTextHtml`
(allowlist + dangerous-tag drop + `<a href>` validation) → trimmed safe HTML →
`block.props.text` → renderer re-runs `sanitizeAuthoringRichTextHtml` →
`renderSanitizedRichTextHtml` (tokenized React tree, no `dangerouslySetInnerHTML`).

**Error handling.** Non-string stored value → `null` (fail closed, no surface).
Hostile input → dangerous tags/content and unsafe attrs stripped by the shared
policy; output guaranteed to contain only `pageRichTextAllowedTags`. Empty
sanitized result on a required target → `previous` retained (no hollowing).
Sanitizer returns `""` for any non-string, so the empty-commit guard catches it.

**Regression-test shape** — `tests/vitest/services/page-inline-edit-contract.test.ts`
(Vitest lane; Bun-free). Replace the panel-only assertion at lines 94–99 and add:

```ts
// resolveInlineEditTarget: rich block now resolves (was null)
const rich = /* text block, props.text = "<strong>Bold</strong> text", format: "rich" */;
const target = resolveInlineEditTarget(rich, "text");
expect(target).not.toBeNull();
expect(target?.preserveMarkup).toBe(true);

// non-string rich text still fails closed
expect(resolveInlineEditTarget(/* rich block, props.text = 42 */, "text")).toBeNull();

// sanitizeInlineRichText preserves allowlisted markup
const safe = sanitizeInlineRichText(target!, "<strong>Bold</strong> and <em>italic</em>");
expect(safe).toContain("<strong>");
expect(safe).toContain("<em>");

// ...and drops dangerous tags + content
const hostile = sanitizeInlineRichText(target!, "<strong>ok</strong><script>alert(1)</script>");
expect(hostile).not.toContain("script");
expect(hostile).toContain("<strong>");

// commitInlineText dispatches rich vs plain
expect(commitInlineText(target!, "<strong>old</strong>", "<em>new</em>")).toContain("<em>");
// empty rich commit keeps previous (required field, no hollowing)
expect(commitInlineText(target!, "<strong>old</strong>", "   ")).toBe("<strong>old</strong>");
// plain-text targets STILL strip markup (no regression)
const headingTarget = resolveInlineEditTarget(/* heading block */, "text")!;
expect(commitInlineText(headingTarget, "old", "<b>x</b>")).toBe("x");
```

Reuse the sanitizer-fidelity shape already proven in
`tests/vitest/pages/page-authoring-sanitizers.test.ts:65–77` (keeps `<strong>`,
`<a href>`; rejects `onclick`, `<script>`, `javascript:`).

---

## Testing Requirements

Validation baseline (all must pass):

- `bun run test:vitest` — includes the extended
  `tests/vitest/services/page-inline-edit-contract.test.ts` (rich resolve,
  rich sanitize round-trip, dangerous-tag drop, dispatch, empty-commit policy,
  plain-text no-regression) and the existing
  `tests/vitest/pages/page-authoring-sanitizers.test.ts`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Manual/parity check: inline-edit a `format:"rich"` block on the canvas, add a
`<strong>` span and a link, blur to commit; confirm the stored prop and the
panel "Primary text" field both still show the markup and the renderer paints it.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — move the TASK-469 row (line ~135) from To Do to
  Done on completion and update the To Do/Done statistics counts (lines ~81–83).
- `_docs/_CHANGELOG/` — add a dated entry describing the rich inline-edit
  fidelity fix (shared-sanitizer reuse, no second allowlist, parity with panel).
- `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` — reconcile §9.4 item 1 (and the
  §3.4 row) status to resolved, referencing this task.
- If landed together with TASK-470, note the single shared touch of
  `pageRendererV2.tsx` in both changelog entries.

---

## Closure Checklist

- [ ] `resolveInlineEditTarget` returns a `preserveMarkup` target for
  `format:"rich"` text blocks; all other fail-closed branches unchanged.
- [ ] Rich inline commit routes through `sanitizeAuthoringRichTextHtml` (shared
  allowlist), never `stripInlineMarkup`; plain-text targets still strip markup.
- [ ] No second allowlist introduced; no new `dangerouslySetInnerHTML`; no
  endpoint/permission changes.
- [ ] Empty-commit policy and control-char hygiene preserved on the rich path.
- [ ] Inline ↔ panel parity verified (same markup persisted both ways).
- [ ] Bun-free boundary of `pageInlineEditContract.ts` preserved (pure-string
  sanitizer import only).
- [ ] Vitest lane updated (panel-only assertion replaced; round-trip + hostile +
  dispatch + no-regression cases added); baseline green
  (`bun run test:vitest`, `bun --cwd core lint`, `bun --cwd core lint:types`).
- [ ] README row + statistics, changelog entry, and audit §9.4 item 1 status all
  reconciled.
