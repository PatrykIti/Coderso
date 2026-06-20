import { dangerousHtmlContentTagSet } from "../posts/editor/postRichTextHtmlUtils";
import { sanitizeAuthoringRichTextHtml } from "./pageAuthoringSanitizers";
import { pageBlockPropKeys, type PageBlockType, type PageBlockV2 } from "./pageDocumentV2";

/**
 * Inline-edit contract for the Page Editor V2 canvas (TASK-422-01).
 *
 * This module is the single owner of:
 * - which block props are inline-editable on the canvas (everything else stays
 *   panel-only and must fail closed to no `contentEditable` surface),
 * - how raw canvas text is sanitized before it re-enters the Page document,
 * - the empty-commit policy (required fields keep the previous value so an
 *   empty commit can never prune or hollow out a block).
 *
 * Prop path convention:
 * - Direct targets use the bare prop key as `propPath` (single segment, e.g.
 *   `"text"`, `"label"`, `"cite"`).
 * - Indexed string-array entries are declared once in the static map with a
 *   trailing `.*` wildcard segment (e.g. `"items.*"`). Concrete paths use a
 *   dot-separated base-10 index without sign or leading zeros: `"items.0"`,
 *   `"items.12"`. Build them with `inlineListItemPropPath` instead of string
 *   concatenation.
 * - `resolveInlineEditTarget` materializes wildcard entries into concrete
 *   targets (`propPath: "items.3"`) only when the indexed item exists and is a
 *   plain string. List link items (`{ label, href }` objects) stay panel-only.
 *
 * Bun-free by contract: no DOM, no `Bun.*`, no admin UI imports. Vitest owns
 * the tests (`tests/vitest/services/page-inline-edit-contract.test.ts`).
 */

export type InlineEditableTarget = {
  blockType: PageBlockType;
  /** See the prop path convention in the module doc comment. */
  propPath: string;
  /** Single-line targets collapse committed newlines into single spaces. */
  multiline: boolean;
  /** Required fields (`allowEmpty: false`) keep the previous value on empty commits. */
  allowEmpty: boolean;
  /** Rich targets preserve allowlisted markup through the shared rich-text sanitizer. */
  preserveMarkup?: boolean;
};

const INDEXED_WILDCARD_SUFFIX = ".*";

const isIndexedTargetFamily = (propPath: string): boolean =>
  propPath.endsWith(INDEXED_WILDCARD_SUFFIX);

const indexedFamilyRootKey = (propPath: string): string =>
  propPath.slice(0, -INDEXED_WILDCARD_SUFFIX.length);

const rootPropKey = (propPath: string): string => propPath.split(".")[0] ?? "";

const defineInlineEditableTargets = (
  targets: readonly InlineEditableTarget[]
): readonly InlineEditableTarget[] => {
  for (const target of targets) {
    const rootKey = rootPropKey(target.propPath);
    if (!rootKey || !pageBlockPropKeys[target.blockType].includes(rootKey)) {
      throw new Error(
        `Inline edit target "${target.blockType}.${target.propPath}" does not match a known block prop.`
      );
    }
  }
  return Object.freeze(targets.map((target) => Object.freeze({ ...target })));
};

/**
 * The frozen inline-editable map (TASK-422-01 contract). Anything not listed
 * here is panel-only. `text.text` is the only multiline target; the optional
 * `quote.cite` and `statistic.caption` fields are the only ones that may
 * commit empty. `text.format === "rich"` uses the same target with
 * `preserveMarkup: true` at resolution time so rich inline commits use the
 * shared rich-text sanitizer instead of the plain-text markup stripper.
 */
export const inlineEditableTargets: readonly InlineEditableTarget[] = defineInlineEditableTargets([
  { blockType: "heading", propPath: "text", multiline: false, allowEmpty: false },
  { blockType: "text", propPath: "text", multiline: true, allowEmpty: false },
  { blockType: "quote", propPath: "text", multiline: false, allowEmpty: false },
  { blockType: "quote", propPath: "cite", multiline: false, allowEmpty: true },
  { blockType: "statistic", propPath: "value", multiline: false, allowEmpty: false },
  { blockType: "statistic", propPath: "label", multiline: false, allowEmpty: false },
  { blockType: "statistic", propPath: "caption", multiline: false, allowEmpty: true },
  { blockType: "button", propPath: "label", multiline: false, allowEmpty: false },
  { blockType: "list", propPath: "items.*", multiline: false, allowEmpty: false },
]);

/** Concrete index segment: base-10, no sign, no leading zeros. */
const indexedItemSegmentPattern = /^(?:0|[1-9]\d*)$/;

/**
 * Builds the canonical concrete prop path for an inline-editable list item.
 * Throws on programmer error so callers never hand-build drifting paths.
 */
export function inlineListItemPropPath(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(
      `Inline list item index must be a non-negative integer, received ${String(index)}.`
    );
  }
  return `items.${index}`;
}

/**
 * Resolves the inline-edit target for a block prop path, or `null` when the
 * target is not inline-editable. The UI must fail closed on `null` (render no
 * `contentEditable`). Fail-closed cases include unknown block/prop combos,
 * non-string stored values (schema drift, list link objects), missing list
 * indexes, and malformed index segments.
 */
export function resolveInlineEditTarget(
  block: PageBlockV2,
  propPath: string
): InlineEditableTarget | null {
  for (const target of inlineEditableTargets) {
    if (target.blockType !== block.type) continue;

    if (target.propPath === propPath) {
      if (block.type === "text" && propPath === "text" && block.props.format === "rich") {
        return typeof block.props[propPath] === "string"
          ? Object.freeze({ ...target, preserveMarkup: true })
          : null;
      }
      return typeof block.props[propPath] === "string" ? target : null;
    }

    if (!isIndexedTargetFamily(target.propPath)) continue;
    const rootKey = indexedFamilyRootKey(target.propPath);
    if (!propPath.startsWith(`${rootKey}.`)) continue;
    const indexSegment = propPath.slice(rootKey.length + 1);
    if (!indexedItemSegmentPattern.test(indexSegment)) continue;
    const entries = block.props[rootKey];
    if (!Array.isArray(entries)) return null;
    const item = entries[Number(indexSegment)];
    if (typeof item !== "string") return null;
    return Object.freeze({ ...target, propPath });
  }
  return null;
}

const htmlCommentStart = "<!--";
const htmlCommentEnd = "-->";

const stripHtmlComments = (value: string): string => {
  let result = "";
  let cursor = 0;
  for (;;) {
    const start = value.indexOf(htmlCommentStart, cursor);
    if (start === -1) return result + value.slice(cursor);
    result += value.slice(cursor, start);
    const end = value.indexOf(htmlCommentEnd, start + htmlCommentStart.length);
    if (end === -1) return result;
    cursor = end + htmlCommentEnd.length;
  }
};

const angleBracketPattern = /[<>]/g;

type InlineHtmlTagToken = {
  name: string;
  closing: boolean;
  selfClosing: boolean;
  endIndex: number;
};

const isAsciiLetter = (char: string | undefined): boolean => {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
};

const isTagNameCharacter = (char: string | undefined): boolean => {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57) ||
    char === "-"
  );
};

const readInlineHtmlTag = (value: string, start: number): InlineHtmlTagToken | null => {
  if (value[start] !== "<") return null;

  let cursor = start + 1;
  const closing = value[cursor] === "/";
  if (closing) cursor += 1;
  if (!isAsciiLetter(value[cursor])) return null;

  const nameStart = cursor;
  while (isTagNameCharacter(value[cursor])) cursor += 1;

  const endIndex = value.indexOf(">", cursor);
  if (endIndex === -1) return null;

  return {
    name: value.slice(nameStart, cursor).toLowerCase(),
    closing,
    selfClosing: !closing && value.slice(cursor, endIndex).trimEnd().endsWith("/"),
    endIndex,
  };
};

/** Drops dangerous elements together with their content (shared policy set). */
const stripDangerousElementContent = (value: string): string => {
  let result = "";
  let cursor = 0;
  const dropStack: string[] = [];

  while (cursor < value.length) {
    const tag = readInlineHtmlTag(value, cursor);
    if (!tag) {
      if (dropStack.length === 0) result += value[cursor] ?? "";
      cursor += 1;
      continue;
    }

    if (dangerousHtmlContentTagSet.has(tag.name)) {
      if (tag.closing) {
        const dropIndex = dropStack.lastIndexOf(tag.name);
        if (dropIndex !== -1) dropStack.splice(dropIndex);
      } else if (!tag.selfClosing) {
        dropStack.push(tag.name);
      }
      cursor = tag.endIndex + 1;
      continue;
    }

    if (dropStack.length === 0) {
      result += value.slice(cursor, tag.endIndex + 1);
    }
    cursor = tag.endIndex + 1;
  }

  return result;
};

const stripElementTags = (value: string): string => {
  let result = "";
  let cursor = 0;

  while (cursor < value.length) {
    const tag = readInlineHtmlTag(value, cursor);
    if (tag) {
      cursor = tag.endIndex + 1;
      continue;
    }
    result += value[cursor] ?? "";
    cursor += 1;
  }

  return result;
};

const stripInlineMarkup = (value: string): string => {
  let current = value;
  // Every pass only deletes characters, so this loop terminates: it runs
  // until a fixpoint to keep obfuscated nestings (e.g. `<<b>script>`) from
  // reassembling into markup after a single pass.
  for (;;) {
    const withoutComments = stripHtmlComments(current);
    const withoutDangerousContent = stripDangerousElementContent(withoutComments);
    const withoutTags = stripElementTags(withoutDangerousContent);
    const withoutReassembledDangerousContent = stripDangerousElementContent(withoutTags);
    const next = withoutReassembledDangerousContent.replace(angleBracketPattern, "");
    if (next === current) return next;
    current = next;
  }
};

const TAB_CODE_POINT = 0x09;
const LINE_FEED_CODE_POINT = 0x0a;

/** C0/C1 controls plus DEL are stripped; tab and line feed survive. */
const isStrippedControlCharacter = (codePoint: number): boolean =>
  (codePoint <= 0x1f && codePoint !== TAB_CODE_POINT && codePoint !== LINE_FEED_CODE_POINT) ||
  (codePoint >= 0x7f && codePoint <= 0x9f);

const removeControlCharacters = (value: string): string => {
  let result = "";
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (!isStrippedControlCharacter(codePoint)) result += char;
  }
  return result;
};

/**
 * Sanitizes raw canvas text to the plain-text block contract: line endings
 * are normalized to `\n`, markup is stripped to text-only content, NBSP is
 * normalized to a regular space, control characters are removed (tabs and
 * internal whitespace are preserved), single-line targets collapse newlines
 * into single spaces, and the result is trimmed. Never emits HTML.
 */
export function sanitizeInlineText(target: InlineEditableTarget, raw: string): string {
  const normalizedLineEndings = raw.replace(/\r\n?/g, "\n").replace(/[\u2028\u2029]/g, "\n");
  const withoutMarkup = stripInlineMarkup(normalizedLineEndings);
  const cleaned = removeControlCharacters(withoutMarkup.replace(/\u00A0/g, " "));
  const text = target.multiline ? cleaned : cleaned.replace(/\s*\n+\s*/g, " ");
  return text.trim();
}

/**
 * Sanitizes raw rich canvas HTML through the Page authoring rich-text contract:
 * line endings and control characters are normalized first, then the shared
 * allowlist keeps safe inline markup and drops dangerous elements/content.
 * This path never calls `stripInlineMarkup`.
 */
export function sanitizeInlineRichText(_target: InlineEditableTarget, raw: string): string {
  const normalizedLineEndings = raw.replace(/\r\n?/g, "\n").replace(/[\u2028\u2029]/g, "\n");
  const cleaned = removeControlCharacters(normalizedLineEndings);
  return sanitizeAuthoringRichTextHtml(cleaned).trim();
}

/**
 * Applies the empty-commit policy on top of sanitization: required targets
 * (`allowEmpty: false`) keep the previous stored value when the sanitized
 * commit is empty, so an empty inline commit can never blank a required prop
 * or trigger block pruning. Optional targets may commit the empty string.
 */
export function commitInlineText(
  target: InlineEditableTarget,
  previous: string,
  raw: string
): string {
  const next = target.preserveMarkup
    ? sanitizeInlineRichText(target, raw)
    : sanitizeInlineText(target, raw);
  if (next.length === 0 && !target.allowEmpty) return previous;
  return next;
}
