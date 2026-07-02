# TASK-500-04: Static Block & Image Binding
# FileName: TASK-500-04-Static-Block-And-Image-Binding.md

**Parent Task:** TASK-500
**Priority:** Medium
**Category:** Admin UI / Custom Screens / Screen Builder / Schema-first model
**Estimated Effort:** Small
**Dependencies:** TASK-498 (data-oriented builder + look parity — SHIPPED). Independent of
500-01/02/03 (isolated schema + inspector + renderer fix; can land in parallel).
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Overview

Scope item 4 of TASK-500. Confirm/annotate that unbound **static** blocks render on the
front, and fix the **one** inconsistent kind: `image`.

On entry/preview `ScreenRuntimeRenderer` already renders the authored static content of
unbound `heading` / `text` / `divider` / `button` (verified — see anchors), so those are
legitimate and stay as-is. `image` is the lone exception: its `data` allow-list
(`customScreenSchemas.ts:405`, `["label","fit","ratio","field"]`) carries **no static
`src`**, so an unbound image (no `field` binding, no per-entry media override) can only
ever render a labeled placeholder. An author who just wants a fixed logo / illustration
cannot express it, even though every other static kind can carry authored content.

**Chosen resolution (recommended by the parent, justified below): schema-first static
`src`.** Add an OPTIONAL, scheme-validated `src` to the `image` kind — additive,
reject-unknown-preserving, non-destructive, NO `schemaVersion` bump — so `image` becomes
symmetric with the other static kinds. The renderer gains a static-`src` fallback; the
inspector gains a static "Image URL" control.

### Why static `src` over "requires a bound field" (rejected alternative)

The alternative — leave the schema alone and add a builder-only affordance that marks
`image` as *"requires a bound field"* — is REJECTED and documented here as the fallback:

- It makes `image` the only static kind that is *less* capable than its peers
  (`heading`/`text`/`button` all accept authored static content); it entrenches the
  inconsistency instead of removing it.
- It is a UI-only special case (a warning banner + disabled render) that adds surface
  without giving the author the fixed-image capability they actually want.
- Static `src` is cheap, symmetric, and schema-first: one allow-list key, one
  scheme-validating normalizer, one renderer fallback, one inspector row. It reuses the
  exact pattern `heading.text` / `button.href` already use (authored static default that
  a bound field overrides).

Backward-compat + hardening are preserved: `src` is optional (stored images without it
still normalize byte-stable), the normalizer rejects `javascript:` / `data:` / other
unsafe schemes to `""` (defense-in-depth so raw stored input never reaches `<img src>`),
and `normalizeScreenBlockData`'s per-kind reject-unknown stays intact (unknown keys still
throw `custom_screen_definition_invalid`).

---

## Scope / Security Contract

**UI/client-state + schema-first model; no route/RBAC/endpoint change.** This subtask
touches NO API route, endpoint visibility, auth, CSRF, or rate limit — so no Security
Contract *route* subsection applies. The image `src` value is client-authored and
persists through the EXISTING custom-screen definition PATCH under existing RBAC (same
guarantee as the TASK-500 epic). The one input-sanitization surface is
`normalizeScreenImageSrc` (below): it is the write-path gate that strips unsafe schemes so
a stored value can never introduce a `javascript:`/`data:` payload into an admin `<img>`
(defense-in-depth; not attacker-supplied cross-tenant). **NO `ScreenDocumentV1.schemaVersion`
bump** (stays `1`), definition stays v4, no DB migration.

---

## Verified current-state anchors (do not contradict without re-checking)

- **Image allow-list lacks `src`:** `customScreenSchemas.ts:400-409`
  `screenBlockDataAllowedKeys.image = ["label","fit","ratio","field"]`; the `case "image":`
  branch (`:448-450`) only coerces `fit`. Adding `"src"` + a normalizer is purely additive.
- **Renderer has no static-`src` path:** `ScreenRuntimeRenderer.tsx:719-753` (image branch):
  `src = readMediaPresentationValue(block.id) ?? resolveMediaSrc(bound)` — per-entry media
  override OR bound-field value ONLY. No `data.src` fallback ⇒ unbound image =
  placeholder. `readText` (`:155-158`) trims & falls back; `resolveMediaSrc` (`:196-203`)
  passes safe strings through; the placeholder/token block is `:739-752`.
- **Other static kinds already render authored content:** heading `:603-637`
  (`staticText = readText(block.data,"text",label)`, bound overrides static in both builder
  & entry), text `:640-…`, divider (label), button `:755-783` (`data.href`). These stay
  unchanged — this subtask only annotates them in tests.
- **Inspector image branch:** `ScreenBlockInspector.tsx:565-593` — `BoundFieldRow`
  (`propPath="src"`, `filterTypes:["media"]`, `bindMode:"read"`), a `Fit` `EnumRow`, and a
  `Ratio` `InspectorRow`/`Input`. `readString` is already imported and used for `ratio`.
- **Canonical scheme allow-list to mirror:** `postBlockRuntimeMapper.ts:62-69` `isSafeHref`
  (`/`, `#`, `?`, `http://`, `https://`, `mailto:`, `tel:`). For an `<img src>` we allow the
  URL/path subset (`/`, `http://`, `https://`) and DROP everything else — image `src` is not
  a navigational href.

---

## Execution-ready changes

### 1 — `core/services/customScreens/customScreenSchemas.ts` (schema-first, write-path)

**(a) Allow `src` on the image kind** (additive; reject-unknown unaffected):

```ts
const screenBlockDataAllowedKeys: Record<string, readonly string[]> = {
  // …unchanged kinds…
  image: ["label", "fit", "ratio", "field", "src"], // + "src"
  // …
};
```

**(b) Add a module-local scheme-validating normalizer** (near `coerceScreenEnum`/
`clampScreenInt`, `:411-420`). Deterministic, non-throwing: an unsafe/invalid value
normalizes to `""` (a valid, present-but-empty static src the renderer treats as "no static
src") rather than throwing — mirrors `sanitizeHref`'s fail-soft, and keeps the reject-unknown
gate (unknown *keys*) as the only throw path:

```ts
// Static <img src> for the image kind: relative paths + http(s) only. Everything else
// (javascript:, data:, blob:, file:, vbscript:, bare tokens, non-strings) ⇒ "" (dropped).
// NOT a navigational href (button.href) — so no mailto:/tel:. Defense-in-depth: this is the
// write-path gate so a stored value can never reach <img src> with an unsafe scheme.
const safeImageSrcPrefixes = ["/", "http://", "https://"] as const;
const normalizeScreenImageSrc = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  return safeImageSrcPrefixes.some((prefix) => lower.startsWith(prefix)) ? trimmed : "";
};
```

**(c) Wire it into the image branch** of `normalizeScreenBlockData` (`:448-450`):

```ts
case "image":
  if ("fit" in data) data.fit = coerceScreenEnum(data.fit, ["cover", "contain"], "cover");
  if ("src" in data) data.src = normalizeScreenImageSrc(data.src); // "" when unsafe/blank
  break;
```

Data flow / invariants:
- Optional: images stored WITHOUT `src` are untouched (no `"src" in data` ⇒ no-op) ⇒
  stored-V4 byte-stability holds; `ratio` (free-string) is likewise untouched.
- A valid stored `src` (e.g. `"/media/logo.png"` or `"https://…"`) round-trips byte-stable
  (idempotent normalizer). An unsafe/blank value is coerced to `""` (never throws).
- `normalizeScreenDocumentV1ForRead`'s read-repair (`:648-681`) is untouched — it intersects
  a remapped block's data with `screenBlockDataAllowedKeys[type]`, so any read-repaired image
  now also permits `src` for free, consistently.

### 2 — `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` (render fallback)

Add a static-`src` fallback to the image branch (`:719-753`). Precedence mirrors the
"bound overrides static default" rule the other kinds use, with the per-entry media override
still on top (published per-entry data wins):

```ts
if (block.type === "image") {
  const binding = resolveBlockBinding(bindings, block.id, "src");
  const label = readText(block.data, "label", "Image");
  const fit = readText(block.data, "fit", "cover");
  const staticSrc = readText(block.data, "src"); // "" when absent (schema already scheme-checked)
  const bound = binding ? readBindingPathValue(values, binding.field) : undefined;
  // resolution order: per-entry media override → bound field value → authored static src
  const src =
    readMediaPresentationValue(block.id) ?? resolveMediaSrc(bound) ?? (staticSrc || null);

  // builder: mirror heading — a bound image shows the {{ label }} token; an unbound image
  // with an authored static src previews the real image; otherwise the icon placeholder.
  const showImage = src && (mode !== "builder" || (!binding && Boolean(staticSrc)));
  if (showImage) {
    return wrap(
      <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
        <img
          src={src as string}
          alt={label}
          className={cn("w-full rounded-lg", fit === "contain" ? "object-contain" : "object-cover")}
        />
      </div>
    );
  }
  return wrap(/* …existing placeholder/token block :739-752 unchanged… */);
}
```

- Entry/preview with NEITHER a binding NOR a static `src` ⇒ still the labeled placeholder
  (`:741-749`) — the "requires a source" affordance is retained for the empty case.
- Builder with a binding ⇒ still the `{{ label }}` token (`:742-743`). Builder with an
  authored static src (no binding) now previews the actual image, matching heading rendering
  its static text in builder.
- Defense-in-depth: `src` here is already scheme-validated by the schema normalizer; the
  renderer does not re-introduce raw input.

### 3 — `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` (static src control)

Add a static "Image URL" row inside the existing image branch (`:565-593`), between the
`BoundFieldRow` and the `Fit` `EnumRow`, reusing the already-imported `InspectorRow` /
`Input` / `readString`:

```tsx
{selectedBlock.type === "image" ? (
  <>
    <BoundFieldRow /* …unchanged: propPath="src", filterTypes={["media"]}, bindMode="read"… */ />
    <InspectorRow label="Image URL">
      <Input
        value={readString(selectedBlock.data.src)}
        onChange={(event) => patchData({ src: event.target.value })}
        placeholder="https://… or /media/… — used when no field is bound"
      />
    </InspectorRow>
    <EnumRow label="Fit" /* …unchanged… */ />
    <InspectorRow label="Ratio">{/* …unchanged… */}</InspectorRow>
  </>
) : null}
```

- The placeholder copy states the precedence ("used when no field is bound") so authors
  understand a bound field overrides the static src.
- `patchData({ src })` flows through the existing edit → `updateEditorView` → definition
  PATCH path; the value is scheme-normalized on save by step 1. No new host wiring.
- Error handling: none needed at the control (free text); the write normalizer is the gate.
  An unsafe value the author types is coerced to `""` on save (silently dropped) — acceptable
  for an admin-authored control; a follow-up could surface an inline "URL was cleared" hint.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` lanes)

All suites run in the **Vitest (Bun-free)** lane — the screen builder is UI + a pure
schema/ops module (no Bun runtime, no route handler). This subtask owns the static/image
slice of the epic matrix (consolidated in TASK-500-05 §1). Epic invariants that MUST stay
green and MUST NOT be weakened:

- **Schema — `tests/vitest/customScreens/screen-document-image-src.test.ts` (new):**
  - `normalizeScreenBlockData("image", …)` accepts and preserves a safe static `src`
    (`"/media/x.png"`, `"https://cdn/x.png"`) byte-stable / idempotent.
  - Drops unsafe/invalid `src` to `""`: `javascript:alert(1)`, `data:image/png;base64,…`,
    `blob:…`, `file:///…`, `vbscript:…`, a bare token, a non-string.
  - Unknown keys STILL throw `custom_screen_definition_invalid` (reject-unknown intact);
    the `fit` coercion still works alongside `src`.
  - An image WITHOUT `src` round-trips byte-stable through `normalizeScreenDocumentV1` /
    `…ForRead` (stored-V4 non-destructive; assert the whole document is unchanged).
- **Renderer — extend `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx`:**
  - Unbound image with a static `src` renders an `<img src>` on entry AND preview.
  - Image with NEITHER a `src` NOR a binding still shows the labeled placeholder.
  - Per-entry media override / bound field value take precedence over the static `src`
    (override > bound > static).
  - Builder: bound image shows the `{{ label }}` token; unbound image with a static `src`
    previews the `<img>`; empty image shows the icon placeholder.
  - **Static-kind regression annotation:** unbound `heading` / `text` / `divider` / `button`
    still render their authored content on entry/preview (locks in that only `image` changed).
- **Inspector — extend the custom-screen inspector suite** (e.g.
  `custom-screen-editor-binding-flow.test.tsx` or a focused
  `custom-screen-image-inspector.test.tsx`): typing in the "Image URL" row calls
  `patchData({ src })`; the row renders only for the `image` kind; a bound field + static src
  coexist in the inspector.

Full gate (whole subtask): `bun --cwd core lint`, `bun --cwd core lint:types`,
`bun --cwd core test:bun`, full Vitest, the repo gate alias, and a real-input Playwright
smoke (author a static image, confirm it renders on the entry front and side-by-side vs the
prototype `CustomScreenEditorPreview.tsx` image chip; light + dark, `:5173==200`).

---

## Acceptance criteria

1. `image` carries an OPTIONAL static `src`; `screenBlockDataAllowedKeys.image` includes
   `"src"`; `normalizeScreenImageSrc` drops `javascript:`/`data:`/other unsafe schemes to
   `""` and preserves `/`+`http(s)` values idempotently.
2. On entry/preview an unbound image with a static `src` renders it; an image with neither
   `src` nor a binding still shows the labeled placeholder; a bound field / per-entry media
   override overrides the static `src`.
3. Unbound `heading`/`text`/`divider`/`button` still render authored content (no regression).
4. The inspector exposes a static "Image URL" control (image kind only) that persists through
   the existing PATCH; a bound field overrides it (copy states this).
5. No `schemaVersion` bump, definition stays v4, stored-V4 images byte-stable, reject-unknown
   intact; no route/RBAC change; all gates green + Playwright smoke.

---

## Documentation Updates Required

- The image static-`src` allow-list + resolution order are documented in
  `_docs/CONTENT_TYPES_SPEC.md` (screens contract) and the `_docs/_CHANGELOG/` entry as part
  of **TASK-500-05** (do NOT edit `_docs/_TASKS/README.md` here — the parent author owns the
  board rows / Statistics).
