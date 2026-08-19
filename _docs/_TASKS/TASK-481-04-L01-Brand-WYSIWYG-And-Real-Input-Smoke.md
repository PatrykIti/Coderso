# TASK-481-04-L01: Brand-WYSIWYG Vitest + Real-Input Playwright Smoke

# FileName: TASK-481-04-L01-Brand-WYSIWYG-And-Real-Input-Smoke.md

**Parent Subtask:** TASK-481-04
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-481-01-L01, TASK-481-01-L02, TASK-481-02-L02, TASK-481-03-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`
**Changelog:** 1317 (pinned; create only at TASK-481 closure)

---

## Overview

**Goal:** Prove the four umbrella success criteria as one behavior, with a vitest
WYSIWYG assertion plus a real-input Playwright smoke (synthetic-event tests passed
while the live toolbar was broken — memory `page-editor-color-toolbar-live-findings` —
so a real mouse/keyboard pass is required for closure).

Success criteria proven:
1. A brand color applied to a block renders the SITE token value in the canvas
   content scope (matches the front for the same page).
2. Editor chrome (selection rings, block outlines, ghost "+" tiles, focus borders,
   badges) keeps the admin theme (no brand bleed).
3. Inline + block-level brand swatch previews agree with each other and the in-canvas
   render.
4. Neutrals continue to work as shipped in TASK-477-02 (no regression).

**Owning module(s) to create-or-extend:**
- `tests/vitest/ui/page-authoring-canvas.test.tsx` (end-to-end brand WYSIWYG case).
- Playwright real-input smoke driven via the `playwright-cli` skill against the local
  admin (`http://coderso-a.localhost:5173/admin/`) — scripted/manual, not a CI gate.

**Source-of-truth docs:**
- `_docs/DESIGN_TOKENS.md`, `_docs/PAGE_MODEL.md`, `_docs/THEMES_SPEC.md`.

**Out-of-scope:** New product behavior; docs (TASK-481-04-L02).

## Security Contract

Not a route/auth/data leaf — N/A (test/smoke only). No endpoint/auth/RBAC/CSRF/
rate-limit surface; no validation-owner change; no secrets/PII. The Playwright smoke
authenticates with existing local-dev admin creds from `.env` (per the local-CMS
memory) — no new credential path.

## Implementation Pseudocode

```tsx
// tests/vitest/ui/page-authoring-canvas.test.tsx — end-to-end brand WYSIWYG
it("renders a brand block color as the SITE value on the content scope, admin on chrome", () => {
  const site = mergeTokens(DEFAULT_TOKENS, { colors: { accent: "#f59e0b" } });
  // render editor/SectionCanvas with site tokens + a block colored var(--color-accent)
  const contentScope = container.querySelector("[data-page-editor-content]");
  expect(contentScope!.getAttribute("style")).toContain("--color-accent: #f59e0b"); // (1)
  const blockFrame = container.querySelector("[data-page-editor-block-id]");
  expect(blockFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)"); // (2)
  // (3) inline + block preview already asserted in 481-03-L02; cross-reference holds
  const frame = container.querySelector("[data-page-editor-canvas-frame]");
  expect(frame!.getAttribute("style")).toContain("--color-text:");        // (4) neutrals intact
  expect(frame!.getAttribute("style")).not.toContain("--color-accent:");  // brand NOT on frame
});

it("live-repaints brand when the settings cache bus fires", () => {
  // emit a settingsRedacted cache event with a new accent; content scope updates, no remount
});
```

Playwright real-input smoke (via `playwright-cli` skill; ensure core dev is up via
`coderso-dev-core-host`, admin reachable):
1. Open a page in the editor; select a text block; apply an inline brand color
   (e.g. Accent) with a REAL click; type/select a range first.
2. Assert the canvas text visibly renders the SITE accent (e.g. orange), matching the
   block-level "Text color" control preview.
3. Assert the selection ring / block outline / ghost "+" tiles stay the admin theme
   (not orange).
4. Assert the inline toolbar URL input and custom color picker are focusable/usable
   (no toolbar-wide preventDefault regression).
5. Capture screenshots (light + dark if applicable) as evidence.

Notes:
- jsdom cannot resolve CSS custom properties, so the vitest case asserts on
  `style`-strings; the Playwright smoke is the only place the actual rendered pixel
  colour is verified.
- **Error handling:** none — tests/smoke only.

## Testing Requirements

- Vitest lane: `tests/vitest/ui/page-authoring-canvas.test.tsx` (must pass in the
  project's standard vitest run).
- Playwright real-input smoke: scripted via `playwright-cli`; record pass + screenshots
  in the closure note (not a CI Bun/Vitest gate). Bun lane: none (no runtime/route/DB).
- No DB migration artifacts.
