import { dangerousHtmlContentTagSet } from "../posts/editor/postRichTextHtmlUtils";
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
 * commit empty. While `text.format === "rich"` has no real rich rendering
 * (TASK-438), rich text blocks still commit plain text through this contract.
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

const htmlCommentPattern = /<!--[\s\S]*?-->/g;

/** Drops dangerous elements together with their content (shared policy set). */
const dangerousContentPattern = new RegExp(
  `<(${[...dangerousHtmlContentTagSet].join("|")})\\b[^>]*>[\\s\\S]*?</\\1\\s*>`,
  "gi"
);

/**
 * Matches element-shaped tags only: `<` (or `</`) immediately followed by a
 * tag name. Plain-text angle brackets such as `5 < 10` or `a < b > c` never
 * match, so legitimate prose is preserved. We intentionally do not run a full
 * HTML tokenizer here: the commit path feeds DOM `textContent` (text-only
 * handling), so this is layered defense, not the primary parser.
 */
const elementTagPattern = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*)?\/?>/g;

const stripInlineMarkup = (value: string): string => {
  let current = value;
  // Every pass only deletes characters, so this loop terminates: it runs
  // until a fixpoint to keep obfuscated nestings (e.g. `<<b>script>`) from
  // reassembling into markup after a single pass.
  for (;;) {
    const next = current
      .replace(htmlCommentPattern, "")
      .replace(dangerousContentPattern, "")
      .replace(elementTagPattern, "");
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
  const next = sanitizeInlineText(target, raw);
  if (next.length === 0 && !target.allowEmpty) return previous;
  return next;
}
