# TASK-237-04: Rich Text Sanitizer and Entity Hardening
# FileName: TASK-237-04_Rich_Text_Sanitizer_and_Entity_Hardening.md

**Priority:** High
**Category:** Security + Rich Text + Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-237
**Status:** In Progress (2026-04-29)

---

## Overview

Fix the CodeQL rich-text sanitizer and entity alerts:

- `js/double-escaping`: alerts 13, 14, 15.
- `js/incomplete-multi-character-sanitization`: alerts 2-12.
- `js/bad-tag-filter`: alert 16.

The current code has several local helpers that perform chained entity
decoding, tag stripping, forbidden-element stripping, event-handler stripping,
or test HTML comment filtering with regexes. The implementation must centralize
the shared rich-text helpers and keep the existing product behavior stable.

## File Inventory

| File | Lines | Alert(s) | Current Issue | Required Change |
|------|-------|----------|---------------|-----------------|
| `core/services/posts/editor/postRichTextSerializer.ts` | 4-21 | 14 | Local `escapeHtml`, chained `decodeHtmlEntities`, and broad `stripHtmlTags`. | Move entity encode/decode/plain-text extraction into shared tested helpers. |
| `core/services/posts/runtime/postRichTextReactRenderer.tsx` | 36-49 | 15 | Runtime renderer has its own chained `decodeHtmlEntities`. | Reuse shared single-pass entity decoder. |
| `core/admin/ui/posts/editor/blocks/blockTransforms.ts` | 26-33, 47-51 | 13, 2 | Local chained decoder and broad tag stripping before list/plain-text conversion. | Reuse shared plain-text extraction so block transforms do not sanitize through broad tag regexes. |
| `core/services/posts/editor/postRichTextSanitizer.ts` | 161-170, 200, 203-215 | 4, 5, 6, 7 | Forbidden elements, comments, and event handlers are removed through broad multi-character regex passes. | Sanitize by tokenizing allowed tags/attributes; unknown/event attributes must be ignored by the allowlist, not stripped after the fact. |
| `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` | 525-530 | 3 | Clear-formatting strips inline tags through chained regexes. | Unwrap inline formatting with DOM/tree traversal in the browser-facing adapter or a shared tested helper. |
| `core/widgets/core/richTextSection.tsx` | 250-258, 312-324 | 8, 9, 10, 11 | Widget sanitizer duplicates escape/tag/comment/forbidden-element regex handling. | Reuse or extract a shared sanitizer/tokenizer contract, preserving widget-specific allowed tags and attributes. |
| `tests/vitest/widgets/renderer.test.tsx` | 376 | 12, 16 | Test normalizes React server HTML through `html.replace(/<!--.*?-->/g, "")`. | Avoid broad HTML filtering in tests; assert through text content, exact React marker handling, or a narrow deterministic helper. |

## Sub-Tasks

- [ ] Introduce a shared Bun-free rich-text utility module owned by the posts
  rich-text contract, for example
  `core/services/posts/editor/postRichTextHtmlUtils.ts`.
- [ ] Implement single-pass `escapeHtml` and `decodeHtmlEntities` helpers with
  tests for `&amp;lt;`, numeric entities, invalid numeric code points, and
  idempotent serializer behavior.
- [ ] Replace local duplicate entity helpers in serializer, runtime renderer,
  and block transforms.
- [ ] Replace broad plain-text tag stripping with a helper that extracts text
  from the already-sanitized token stream or performs a bounded token scan.
- [ ] Refactor `sanitizePostRichTextHtml` so allowed tags/attributes are built
  by the existing allowlists and forbidden/event attributes are never emitted.
  Do not depend on a post-processing regex that removes `on*=` attributes.
- [ ] Refactor `sanitizeRichTextHtml` in `richTextSection.tsx` to use the same
  lower-level sanitizer/tokenizer primitives while preserving widget-specific
  allowed tags and link behavior.
- [ ] Refactor `stripInlineFormatting` in `PostRichTextAdapter.tsx` so it
  unwraps inline formatting tags after sanitization instead of regex-deleting
  tag strings.
- [ ] Replace the renderer test comment-normalization regex with a narrow
  assertion path that does not look like production HTML sanitization.

## Implementation Pseudocode

Shared entity/plain-text helper shape:

```ts
const htmlEntityMap: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
};

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return char;
    }
  });

export const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#x[0-9a-f]+|#[0-9]+|nbsp|amp|lt|gt|quot|#39);/gi, (match, entity) => {
    const normalized = String(entity).toLowerCase();

    if (normalized.startsWith("#x")) return safeCodePoint(normalized.slice(2), 16, match);
    if (normalized.startsWith("#")) return safeCodePoint(normalized.slice(1), 10, match);

    return htmlEntityMap[normalized] ?? match;
  });

const safeCodePoint = (raw: string, radix: 10 | 16, fallback: string) => {
  const value = Number.parseInt(raw, radix);
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
};
```

Token sanitizer shape:

```ts
type SanitizerPolicy = {
  allowedTags: ReadonlySet<string>;
  selfClosingTags: ReadonlySet<string>;
  buildAttributes: (tag: string, rawAttrs: string) => string | null;
  dropElementContentTags: ReadonlySet<string>;
};

export const sanitizeHtmlWithPolicy = (rawHtml: string, policy: SanitizerPolicy) => {
  const input = rawHtml.split("\0").join("");
  const output: string[] = [];
  const dropStack: string[] = [];

  for (const token of tokenizeHtml(input)) {
    if (token.kind === "comment") continue;

    if (token.kind === "text") {
      if (dropStack.length === 0) output.push(token.value);
      continue;
    }

    const tag = token.name.toLowerCase();

    if (policy.dropElementContentTags.has(tag)) {
      if (!token.closing && !token.selfClosing) dropStack.push(tag);
      if (token.closing && dropStack.at(-1) === tag) dropStack.pop();
      continue;
    }

    if (dropStack.length > 0) continue;
    if (!policy.allowedTags.has(tag)) continue;
    if (token.closing) {
      output.push(`</${tag}>`);
      continue;
    }

    const attrs = policy.buildAttributes(tag, token.rawAttrs);
    if (attrs === null) continue;
    output.push(`<${tag}${attrs}${policy.selfClosingTags.has(tag) ? "" : ""}>`);
  }

  return output.join("").trim();
};
```

Attribute allowlist shape:

```ts
const parseAttributes = (rawAttrs: string) => {
  const attrs = new Map<string, string>();

  for (const attr of tokenizeAttributes(rawAttrs)) {
    const key = attr.name.toLowerCase();
    if (key.startsWith("on")) continue;
    attrs.set(key, decodeHtmlEntities(attr.value));
  }

  return attrs;
};

const sanitizePostTagAttributes = (tagName: string, rawAttrs: string) => {
  const attributes = parseAttributes(rawAttrs);
  const chunks: string[] = [];

  if (tagName === "a") {
    chunks.push(`href="${escapeHtml(sanitizeAnchorHref(attributes.get("href")))}"`);
    // preserve current title/target/rel behavior
  }

  if (tagName === "img") {
    const src = sanitizeImageSrc(attributes.get("src"));
    if (!src) return null;
    chunks.push(`src="${escapeHtml(src)}"`);
    // preserve current media-id, alt, title, wrap, width, margin, loading
  }

  return chunks.length ? ` ${chunks.join(" ")}` : "";
};
```

Plain-text extraction shape:

```ts
export const sanitizedHtmlToPlainText = (html: string) => {
  const text: string[] = [];

  for (const token of tokenizeHtml(html)) {
    if (token.kind === "text") text.push(decodeHtmlEntities(token.value));
    if (token.kind === "tag" && token.name === "br") text.push("\n");
    if (token.kind === "tag" && token.closing && blockTagSet.has(token.name)) {
      text.push("\n");
    }
  }

  return text.join("").replace(/\s+/g, " ").trim();
};
```

Clear-formatting shape:

```ts
const inlineFormattingSelector = "strong, em, u, s, mark, code, span, a";

const unwrapElement = (element: Element) => {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

const stripInlineFormatting = (html: string) => {
  const container = document.createElement("div");
  container.innerHTML = sanitizePostRichTextHtml(html);

  for (const element of Array.from(container.querySelectorAll(inlineFormattingSelector))) {
    unwrapElement(element);
  }

  return sanitizePostRichTextHtml(container.innerHTML);
};
```

Renderer test shape:

```ts
const html = renderToString(<WidgetRenderer block={block} />);

// Prefer an assertion that does not mutate HTML.
expect(html).toContain("Slots:");
expect(html).toContain("1");

// If React server markers make the string awkward, use a helper whose name and
// implementation are explicitly test-only and limited to known React markers,
// not an arbitrary HTML tag/comment sanitizer.
```

Regression-test shape:

```ts
test("decodeHtmlEntities decodes each entity once", () => {
  expect(decodeHtmlEntities("&amp;lt;script&amp;gt;")).toBe("&lt;script&gt;");
});

test("post rich text sanitizer drops forbidden elements and event attributes", () => {
  const html = sanitizePostRichTextHtml(
    `<p onclick=evil()>Safe</p><script><p>bad</p></script><a href="javascript:alert(1)">x</a>`
  );

  expect(html).toContain("<p>Safe</p>");
  expect(html).not.toContain("onclick");
  expect(html).not.toContain("script");
  expect(html).toContain('<a href="#">x</a>');
});
```

## Security Contract

- Visibility: admin rich-text editor, public post runtime renderer, public
  widget renderer, and test helpers.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation:
  - only allowed tags and allowed attributes may survive sanitization,
  - unsafe URLs must still map to `#` or be dropped according to the existing
    tag contract,
  - unknown/event attributes must never be emitted.
- Anti-abuse:
  - no chained decode path may turn `&amp;lt;script&amp;gt;` into live markup,
  - no broad regex should be the only protection against forbidden elements,
  - public runtime rendering must continue using sanitized HTML before React
    node construction,
  - test-only HTML normalization must not mask unsafe markup patterns.
- Secret handling: sanitized output must not expose backend-only values or
  browser-only debug payloads.

## Testing Requirements

```bash
bun run test:vitest -- tests/vitest/posts/post-richtext-serializer.test.ts
bun run test:vitest -- tests/vitest/posts/post-richtext-react-renderer.test.tsx
bun run test:vitest -- tests/vitest/posts/post-block-transforms.test.ts
bun run test:vitest -- tests/vitest/ui-dom/post-richtext-clear-formatting.test.tsx
bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx
bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx
bun run test:vitest -- tests/vitest/ui/post-richtext-adapter-wave.test.tsx
bun run test:vitest -- tests/vitest/ui/post-editor-canvas-wave.test.tsx
bun --cwd core lint
bun --cwd core lint:types
git diff --check
```

Add focused tests for the exact payloads that CodeQL flagged:

- encoded script payloads that must remain text,
- nested `script/style/svg/math/form` payloads,
- event attributes with single quotes, double quotes, and unquoted values,
- safe anchors/images that must still preserve allowed attributes,
- clear-formatting behavior with nested inline tags and links,
- rich-text widget body sanitization.

## Documentation Updates Required

- `_docs/_TASKS/TASK-237_GitHub_CodeQL_Security_Findings_Remediation.md`
- `_docs/SECURITY_SPEC.md` if sanitizer policy or scanner exception policy
  changes.
- Changelog entry on TASK-237 closure.

## Acceptance Criteria

1. CodeQL alerts 2-16 are addressed.
2. Serializer, runtime renderer, block transforms, widget sanitizer, and editor
   adapter share consistent entity/plain-text behavior.
3. Allowed current rich-text markup remains compatible.
4. Unsafe tags, event attributes, and unsafe URLs remain blocked.
5. The renderer test no longer uses a broad HTML comment/tag filtering regex.

## Progress Notes

- 2026-04-29: Added shared rich-text HTML utilities, replaced duplicated
  entity helpers and broad sanitizer/tag-filter regexes in the CodeQL alert
  owners, and updated focused Vitest coverage. Awaiting GitHub CodeQL PR
  verification before closure.
