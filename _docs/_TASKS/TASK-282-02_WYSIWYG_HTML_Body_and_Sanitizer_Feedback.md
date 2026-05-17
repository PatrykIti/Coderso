# TASK-282-02: Rich Text WYSIWYG HTML Body and Sanitizer Feedback

# FileName: TASK-282-02_WYSIWYG_HTML_Body_and_Sanitizer_Feedback.md

**Priority:** High
**Category:** Widgets + Content + Admin UI + Runtime Render + Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-282, TASK-282-01
**Status:** To Do

---

## Overview

Replace the raw HTML-first beginner authoring path with safe rich-text editing
for the Rich Text Section body, while keeping the existing sanitizer and raw
HTML diagnostics available for technical users.

This leaf covers KOD-14 plus sanitizer communication rows KOD-11 and KOD-12.
TASK-213-06-03 already established the desired direction, but the current live
editor still exposes `body.html` as a plain textarea in Visual and does not tell
editors when unsupported tags such as `<img>` or `<h1>` are stripped.

## Scope Boundary

In scope:

- Rich Text Section body WYSIWYG or structured rich editor for common headings,
  paragraphs, links, lists, emphasis, quotes, code, and horizontal rules.
- Adapt existing post rich-text editor helpers only if they stay Bun-free at
  import time and write back into `RichTextSectionData`, not post-editor
  document payloads.
- Sanitizer feedback for dropped or transformed tags/attributes in this widget.
- Raw HTML technical editor remaining in Advanced, with sanitized preview and
  warnings.

Out of scope:

- Adding a new global rich-text editor library without a separate architecture
  decision and docs update.
- Inline media support; TASK-282-05 owns images/media.
- Generic sanitizer policy for all content surfaces outside Rich Text Section.

## Sub-Tasks

- [ ] Add a Rich Text Section body authoring adapter that stores sanitized HTML
  in `body.html` and does not persist post-editor-only metadata.
- [ ] Support the current sanitizer allowlist: `p`, `br`, `strong`, `em`, `u`,
  `s`, `a`, `ul`, `ol`, `li`, `blockquote`, `code`, `pre`, `h2`, `h3`, `h4`,
  `hr`, and `span`.
- [ ] Add `sanitizeRichTextHtmlWithDiagnostics(rawHtml)` or equivalent by
  reusing the existing Bun-free tokenizer/sanitizer helpers from
  `core/services/posts/editor/postRichTextHtmlUtils.ts`. The current
  `sanitizeHtmlWithPolicy()` contract has no drop callbacks, so diagnostics
  must be derived from `tokenizeHtml()`, `parseHtmlAttributes()`, the Rich Text
  allowlist, `dangerousHtmlContentTagSet`, and the same attribute sanitizer used
  by runtime rendering, or the shared sanitizer helper must first be extended
  with typed diagnostics and tests.
- [ ] Surface friendly diagnostics for stripped `<img>`, stripped `<h1>`, unsafe
  hrefs, event handlers, scripts, iframes, and unsupported attributes.
- [ ] Keep Advanced raw HTML editing technical-only with sanitize-now behavior,
  diagnostics, and raw snapshot.
- [ ] Preserve existing default HTML and legacy saved HTML.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/richTextSection.tsx` | Add sanitizer diagnostics helper and bounds for stored HTML length/diagnostic count if needed. Keep `sanitizeRichTextHtml()` as the runtime-safe render helper. Do not call nonexistent sanitizer callbacks. |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Replace Visual raw textarea as the primary body authoring UI with the chosen safe rich editor; move raw HTML to Advanced or a technical disclosure. |
| `core/admin/ui/posts/editor/richtext/*` | Reuse only Bun-free editor parts if integration is direct. Do not import server/runtime adapters. |
| `core/services/posts/editor/*` | Reuse serializer/sanitizer helpers only when they match Rich Text Section storage. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add sanitizer diagnostics, stripped-tag, unsafe href, and HTML render assertions. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add authoring flow assertions for rich body editing, diagnostics, raw HTML advanced editing, and save/reopen state. |
| touched post-richtext tests | Run/update only if existing helper behavior changes. |

## Implementation Pseudocode

Sanitizer diagnostics:

```ts
export type RichTextSanitizerDiagnosticCode =
  | "tag_removed"
  | "attribute_removed"
  | "href_rewritten";

export function sanitizeRichTextHtmlWithDiagnostics(rawHtml: string) {
  const diagnostics = collectRichTextSanitizerDiagnostics(rawHtml);
  const html = sanitizeHtmlWithPolicy(rawHtml, {
    allowedTags: allowedTagSet,
    selfClosingTags: selfClosingTagSet,
    dropContentTags: dangerousHtmlContentTagSet,
    sanitizeAttributes: sanitizeTagAttributes,
  });

  return { html, diagnostics: clampDiagnostics(diagnostics) };
}

function collectRichTextSanitizerDiagnostics(rawHtml: string) {
  const diagnostics: RichTextSanitizerDiagnostic[] = [];
  for (const token of tokenizeHtml(rawHtml)) {
    if (token.kind !== "tag" || token.closing) continue;
    if (dangerousHtmlContentTagSet.has(token.name) || !allowedTagSet.has(token.name)) {
      diagnostics.push({ code: "tag_removed", tagName: token.name });
      continue;
    }
    const rawAttributeNames = collectRawHtmlAttributeNames(token.rawAttrs);
    const sanitizedAttributes = parseHtmlAttributes(
      sanitizeTagAttributes(token.name, token.rawAttrs) ?? ""
    );
    for (const attributeName of rawAttributeNames) {
      if (!sanitizedAttributes.has(attributeName)) {
        diagnostics.push({ code: "attribute_removed", tagName: token.name, attributeName });
      }
    }
  }
  return clampDiagnostics(diagnostics);
}

function collectRawHtmlAttributeNames(rawAttrs: string) {
  return [...rawAttrs.matchAll(/([a-zA-Z0-9:-]+)(?:\s*=|\s|$)/g)].map((match) =>
    (match[1] ?? "").toLowerCase()
  );
}
```

Editor flow:

```tsx
function updateBodyHtmlFromEditor(nextHtml: string) {
  const result = sanitizeRichTextHtmlWithDiagnostics(nextHtml);
  updateBody(value, onChange, { html: result.html });
  setDiagnostics(result.diagnostics);
}
```

Advanced raw HTML:

```tsx
<Textarea value={rawHtmlDraft} onChange={setRawHtmlDraft} />
<Button onClick={() => updateBodyHtmlFromEditor(rawHtmlDraft)}>Sanitize and apply</Button>
```

## Error Handling

- Invalid or oversized HTML normalizes to a safe bounded string and reports a
  diagnostic instead of throwing in the editor.
- Unsupported tags are stripped or transformed according to the sanitizer owner,
  never rendered raw.
- Unsafe links continue to render as `href="#"` or a documented safe fallback.
- Diagnostics must be bounded so paste payloads cannot create unbounded UI.
- Empty rich-editor output is allowed and must follow TASK-282-01 source rules.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: `body.html` remains schema-owned; any new
  persisted body metadata requires explicit schema/default/normalizer coverage.
- Input bounds: raw HTML length, diagnostic count, link length, node count, and
  stored HTML length must be bounded before persistence.
- Anti-abuse: sanitizer must reject scripts, inline handlers, unsafe URLs,
  iframes, forms, embeds, and unsupported attributes.
- Secret handling: diagnostics must not include private media URLs, auth tokens,
  or large copied content snippets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- touched post rich-text Vitest lanes if the adapter/helper code changes
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or committing it
  independently
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with the final rich authoring and
  raw HTML technical mode.
- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` rows KOD-11,
  KOD-12, and KOD-14 after validation.
- Update `_docs/WIDGETS.md` only if shared widget wording changes.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Beginner body editing no longer requires typing raw HTML.
- Sanitizer removals are visible to the editor and remain bounded.
- Public runtime output still uses the sanitizer before render.
- Raw HTML remains available only as a technical Advanced workflow.
