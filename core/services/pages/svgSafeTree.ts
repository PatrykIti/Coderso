/**
 * A closed, dependency-free SVG tree built only from sanitizer output.
 *
 * The parser deliberately does not implement browser error recovery. Any token that
 * falls outside the sanitizer's emitted grammar rejects the complete document.
 */

import { sanitizeSvg } from "./svgSanitizer";
import {
  isSafeLocalSvgReference,
  isSafeSvgNamespace,
  isSafeSvgSourceAttr,
  isSafeSvgTag,
  type SafeSvgSourceAttr,
  type SafeSvgTag,
} from "./svgSanitizerPolicy";

export const SVG_SAFE_TREE_MAX_NODES = 2048;
export const SVG_SAFE_TREE_MAX_DEPTH = 64;
export const SVG_SAFE_TREE_MAX_TEXT_CHARS = 8192;

export type SafeReactSvgProp =
  | "d"
  | "x"
  | "y"
  | "x1"
  | "y1"
  | "x2"
  | "y2"
  | "cx"
  | "cy"
  | "r"
  | "rx"
  | "ry"
  | "points"
  | "width"
  | "height"
  | "pathLength"
  | "viewBox"
  | "preserveAspectRatio"
  | "transform"
  | "gradientUnits"
  | "gradientTransform"
  | "patternUnits"
  | "clipPathUnits"
  | "maskUnits"
  | "offset"
  | "spreadMethod"
  | "markerWidth"
  | "markerHeight"
  | "refX"
  | "refY"
  | "orient"
  | "result"
  | "in"
  | "in2"
  | "stdDeviation"
  | "dx"
  | "dy"
  | "values"
  | "mode"
  | "operator"
  | "type"
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "strokeLinecap"
  | "strokeLinejoin"
  | "strokeDasharray"
  | "strokeDashoffset"
  | "strokeMiterlimit"
  | "opacity"
  | "fillOpacity"
  | "strokeOpacity"
  | "fillRule"
  | "clipRule"
  | "stopColor"
  | "stopOpacity"
  | "color"
  | "id"
  | "role"
  | "aria-hidden"
  | "href"
  | "xlinkHref"
  | "xmlns"
  | "xmlnsXlink"
  | "textAnchor"
  | "fontSize"
  | "fontFamily"
  | "fontWeight"
  | "letterSpacing"
  | "clipPath"
  | "mask"
  | "filter";

export const SAFE_SVG_SOURCE_TO_REACT_PROP = Object.freeze({
  d: "d",
  x: "x",
  y: "y",
  x1: "x1",
  y1: "y1",
  x2: "x2",
  y2: "y2",
  cx: "cx",
  cy: "cy",
  r: "r",
  rx: "rx",
  ry: "ry",
  points: "points",
  width: "width",
  height: "height",
  pathLength: "pathLength",
  viewBox: "viewBox",
  preserveAspectRatio: "preserveAspectRatio",
  transform: "transform",
  gradientUnits: "gradientUnits",
  gradientTransform: "gradientTransform",
  patternUnits: "patternUnits",
  clipPathUnits: "clipPathUnits",
  maskUnits: "maskUnits",
  offset: "offset",
  spreadMethod: "spreadMethod",
  markerWidth: "markerWidth",
  markerHeight: "markerHeight",
  refX: "refX",
  refY: "refY",
  orient: "orient",
  result: "result",
  in: "in",
  in2: "in2",
  stdDeviation: "stdDeviation",
  dx: "dx",
  dy: "dy",
  values: "values",
  mode: "mode",
  operator: "operator",
  type: "type",
  fill: "fill",
  stroke: "stroke",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-miterlimit": "strokeMiterlimit",
  opacity: "opacity",
  "fill-opacity": "fillOpacity",
  "stroke-opacity": "strokeOpacity",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  color: "color",
  id: "id",
  role: "role",
  "aria-hidden": "aria-hidden",
  href: "href",
  "xlink:href": "xlinkHref",
  xmlns: "xmlns",
  "xmlns:xlink": "xmlnsXlink",
  "text-anchor": "textAnchor",
  "font-size": "fontSize",
  "font-family": "fontFamily",
  "font-weight": "fontWeight",
  "letter-spacing": "letterSpacing",
  "clip-path": "clipPath",
  mask: "mask",
  filter: "filter",
} satisfies Record<SafeSvgSourceAttr, SafeReactSvgProp>);

export type SafeSvgText = Readonly<{ kind: "text"; value: string }>;

export type SafeSvgElement = Readonly<{
  kind: "element";
  tag: SafeSvgTag;
  props: Readonly<Partial<Record<SafeReactSvgProp, string>>>;
  children: readonly SafeSvgNode[];
}>;

export type SafeSvgNode = SafeSvgElement | SafeSvgText;

type MutableSafeSvgElement = {
  kind: "element";
  tag: SafeSvgTag;
  props: Partial<Record<SafeReactSvgProp, string>>;
  children: MutableSafeSvgNode[];
};

type MutableSafeSvgNode = MutableSafeSvgElement | SafeSvgText;

type ParsedStartTag = {
  tag: SafeSvgTag;
  props: Partial<Record<SafeReactSvgProp, string>>;
  selfClosing: boolean;
  nextCursor: number;
};

type ParsedEndTag = {
  tag: SafeSvgTag;
  nextCursor: number;
};

const XML_WHITESPACE = new Set([" ", "\t", "\r", "\n"]);
const ATTRIBUTE_NAME_START_RE = /[a-zA-Z_:]/;
const ATTRIBUTE_NAME_PART_RE = /[-\w:.]/;
const TAG_NAME_PART_RE = /[\w:-]/;

function isXmlWhitespace(value: string): boolean {
  return XML_WHITESPACE.has(value);
}

function isJavaScriptWhitespace(value: string): boolean {
  return /\s/u.test(value);
}

function isDisallowedXmlCodePoint(codePoint: number): boolean {
  const isXmlCharacter =
    codePoint === 0x09 ||
    codePoint === 0x0a ||
    codePoint === 0x0d ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff);

  return !isXmlCharacter || (codePoint >= 0x7f && codePoint <= 0x9f);
}

function hasDisallowedXmlCodePoint(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || isDisallowedXmlCodePoint(codePoint)) return true;
  }
  return false;
}

function parseNumericEntity(body: string): string | null {
  let base = 10;
  let digits = body.slice(1);
  if (digits.startsWith("x")) {
    base = 16;
    digits = digits.slice(1);
  }
  if (!digits || !(base === 16 ? /^[0-9a-fA-F]+$/ : /^\d+$/).test(digits)) return null;

  let codePoint = 0;
  for (const digit of digits) {
    codePoint = codePoint * base + Number.parseInt(digit, base);
    if (codePoint > 0x10ffff) return null;
  }
  if (isDisallowedXmlCodePoint(codePoint)) return null;
  return String.fromCodePoint(codePoint);
}

function decodeClosedXmlEntities(value: string): string | null {
  let decoded = "";
  let cursor = 0;

  while (cursor < value.length) {
    const ampersand = value.indexOf("&", cursor);
    if (ampersand === -1) {
      decoded += value.slice(cursor);
      break;
    }
    decoded += value.slice(cursor, ampersand);
    const semicolon = value.indexOf(";", ampersand + 1);
    if (semicolon === -1) return null;
    const body = value.slice(ampersand + 1, semicolon);
    let replacement: string | null;
    switch (body) {
      case "amp":
        replacement = "&";
        break;
      case "lt":
        replacement = "<";
        break;
      case "gt":
        replacement = ">";
        break;
      case "quot":
        replacement = '"';
        break;
      case "apos":
        replacement = "'";
        break;
      default:
        replacement = body.startsWith("#") ? parseNumericEntity(body) : null;
    }
    if (replacement === null) return null;
    decoded += replacement;
    cursor = semicolon + 1;
  }

  return hasDisallowedXmlCodePoint(decoded) ? null : decoded;
}

function hasOnlyLocalUrlReferences(value: string): boolean {
  const urlStartRe = /url\s*\(/gi;

  while (urlStartRe.exec(value) !== null) {
    let cursor = urlStartRe.lastIndex;
    while (cursor < value.length && isJavaScriptWhitespace(value[cursor]!)) cursor += 1;

    let target = "";
    const quote = value[cursor];
    if (quote === '"' || quote === "'") {
      const closingQuote = value.indexOf(quote, cursor + 1);
      if (closingQuote === -1) return false;
      target = value.slice(cursor + 1, closingQuote);
      cursor = closingQuote + 1;
      while (cursor < value.length && isJavaScriptWhitespace(value[cursor]!)) cursor += 1;
      if (value[cursor] !== ")") return false;
    } else {
      const closingParenthesis = value.indexOf(")", cursor);
      if (closingParenthesis === -1) return false;
      target = value.slice(cursor, closingParenthesis).trim();
      if (target.includes('"') || target.includes("'")) return false;
      cursor = closingParenthesis;
    }

    if (!isSafeLocalSvgReference(target)) return false;
    urlStartRe.lastIndex = cursor + 1;
  }

  return true;
}

function validateDecodedAttribute(
  sourceName: SafeSvgSourceAttr,
  decodedValue: string
): string | null {
  if (sourceName === "href" || sourceName === "xlink:href") {
    if (!isSafeLocalSvgReference(decodedValue)) return null;
  }
  if (decodedValue.includes("\\") || decodedValue.includes("/*") || decodedValue.includes("*/")) {
    return null;
  }
  if (!hasOnlyLocalUrlReferences(decodedValue)) return null;

  if (sourceName === "xmlns") {
    const namespace = decodedValue.trim();
    if (!isSafeSvgNamespace(namespace)) return null;
    return decodedValue;
  }
  if (sourceName === "xmlns:xlink") {
    const namespace = decodedValue.trim();
    if (!isSafeSvgNamespace(namespace)) return null;
    return decodedValue;
  }

  return decodedValue;
}

function findTagEnd(source: string, start: number): number {
  let quote: '"' | "'" | null = null;
  for (let cursor = start + 1; cursor < source.length; cursor += 1) {
    const character = source[cursor]!;
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "<") return -1;
    if (character === ">") return cursor;
  }
  return -1;
}

function parseTagName(value: string, cursor: number): { name: string; cursor: number } | null {
  const first = value[cursor];
  if (first === undefined || !/[a-zA-Z]/.test(first)) return null;
  let nextCursor = cursor + 1;
  while (nextCursor < value.length && TAG_NAME_PART_RE.test(value[nextCursor]!)) nextCursor += 1;
  return { name: value.slice(cursor, nextCursor), cursor: nextCursor };
}

function parseAttributeName(
  value: string,
  cursor: number
): { name: string; cursor: number } | null {
  const first = value[cursor];
  if (first === undefined || !ATTRIBUTE_NAME_START_RE.test(first)) return null;
  let nextCursor = cursor + 1;
  while (nextCursor < value.length && ATTRIBUTE_NAME_PART_RE.test(value[nextCursor]!)) {
    nextCursor += 1;
  }
  return { name: value.slice(cursor, nextCursor), cursor: nextCursor };
}

function parseAttributes(body: string): Partial<Record<SafeReactSvgProp, string>> | null {
  const props: Partial<Record<SafeReactSvgProp, string>> = {};
  const seen = new Set<SafeSvgSourceAttr>();
  let cursor = 0;

  while (cursor < body.length) {
    const separatorStart = cursor;
    while (cursor < body.length && isXmlWhitespace(body[cursor]!)) cursor += 1;
    if (cursor === body.length) return null;
    if (cursor === separatorStart) return null;

    const parsedName = parseAttributeName(body, cursor);
    if (!parsedName || !isSafeSvgSourceAttr(parsedName.name) || seen.has(parsedName.name)) {
      return null;
    }
    const sourceName = parsedName.name;
    cursor = parsedName.cursor;
    while (cursor < body.length && isJavaScriptWhitespace(body[cursor]!)) cursor += 1;
    if (body[cursor] !== "=") return null;
    cursor += 1;
    while (cursor < body.length && isJavaScriptWhitespace(body[cursor]!)) cursor += 1;
    if (cursor === body.length) return null;

    let rawValue: string;
    const quote = body[cursor];
    if (quote === '"' || quote === "'") {
      const closingQuote = body.indexOf(quote, cursor + 1);
      if (closingQuote === -1) return null;
      rawValue = body.slice(cursor + 1, closingQuote);
      cursor = closingQuote + 1;
    } else {
      const valueStart = cursor;
      while (
        cursor < body.length &&
        !/\s/.test(body[cursor]!) &&
        body[cursor] !== '"' &&
        body[cursor] !== "'" &&
        body[cursor] !== ">"
      ) {
        cursor += 1;
      }
      if (cursor === valueStart) return null;
      rawValue = body.slice(valueStart, cursor);
    }
    if (rawValue.includes("<")) return null;

    const decodedValue = decodeClosedXmlEntities(rawValue);
    if (decodedValue === null) return null;
    const safeValue = validateDecodedAttribute(sourceName, decodedValue);
    if (safeValue === null) return null;

    seen.add(sourceName);
    props[SAFE_SVG_SOURCE_TO_REACT_PROP[sourceName]] = safeValue;
  }

  return props;
}

function parseStartTag(source: string, start: number): ParsedStartTag | null {
  const end = findTagEnd(source, start);
  if (end === -1) return null;
  let body = source.slice(start + 1, end);
  if (!body || body.startsWith("/")) return null;

  const selfClosing = body.endsWith("/");
  if (selfClosing) body = body.slice(0, -1);
  const parsedTag = parseTagName(body, 0);
  if (!parsedTag || !isSafeSvgTag(parsedTag.name)) return null;
  const attributeBody = body.slice(parsedTag.cursor);
  const props = parseAttributes(attributeBody);
  if (props === null) return null;

  return { tag: parsedTag.name, props, selfClosing, nextCursor: end + 1 };
}

function parseEndTag(source: string, start: number): ParsedEndTag | null {
  const end = findTagEnd(source, start);
  if (end === -1) return null;
  const body = source.slice(start + 2, end);
  const parsedTag = parseTagName(body, 0);
  if (!parsedTag || parsedTag.cursor !== body.length || !isSafeSvgTag(parsedTag.name)) return null;
  return { tag: parsedTag.name, nextCursor: end + 1 };
}

function freezeText(value: string): SafeSvgText {
  return Object.freeze({ kind: "text" as const, value });
}

function freezeElement(element: MutableSafeSvgElement): SafeSvgElement {
  Object.freeze(element.props);
  Object.freeze(element.children);
  return Object.freeze(element) as SafeSvgElement;
}

function countUnicodeScalars(value: string): number {
  let count = 0;
  for (const _character of value) count += 1;
  return count;
}

function parseSanitizedSvg(source: string): SafeSvgElement | null {
  const stack: MutableSafeSvgElement[] = [];
  let root: MutableSafeSvgElement | SafeSvgElement | null = null;
  let cursor = 0;
  let nodeCount = 0;
  let textCharCount = 0;

  while (cursor < source.length) {
    if (source[cursor] !== "<") {
      const nextTag = source.indexOf("<", cursor);
      const textEnd = nextTag === -1 ? source.length : nextTag;
      if (stack.length === 0) return null;
      const rawText = source.slice(cursor, textEnd);
      if (rawText.includes("]]>") || hasDisallowedXmlCodePoint(rawText)) return null;
      const decodedText = decodeClosedXmlEntities(rawText);
      if (decodedText === null) return null;
      textCharCount += countUnicodeScalars(decodedText);
      if (textCharCount > SVG_SAFE_TREE_MAX_TEXT_CHARS) return null;
      stack[stack.length - 1]!.children.push(freezeText(decodedText));
      cursor = textEnd;
      continue;
    }

    if (source.startsWith("</", cursor)) {
      const parsedEnd = parseEndTag(source, cursor);
      const current = stack[stack.length - 1];
      if (!parsedEnd || !current || current.tag !== parsedEnd.tag) return null;
      stack.pop();
      freezeElement(current);
      cursor = parsedEnd.nextCursor;
      continue;
    }

    const parsedStart = parseStartTag(source, cursor);
    if (!parsedStart) return null;
    nodeCount += 1;
    if (nodeCount > SVG_SAFE_TREE_MAX_NODES) return null;
    if (stack.length + 1 > SVG_SAFE_TREE_MAX_DEPTH) return null;

    const element: MutableSafeSvgElement = {
      kind: "element",
      tag: parsedStart.tag,
      props: parsedStart.props,
      children: [],
    };

    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(element);
    } else {
      if (root !== null || element.tag !== "svg") return null;
      root = element;
    }

    if (parsedStart.selfClosing) {
      freezeElement(element);
    } else {
      stack.push(element);
    }
    cursor = parsedStart.nextCursor;
  }

  if (root === null || stack.length !== 0 || !Object.isFrozen(root)) return null;
  return root as SafeSvgElement;
}

/**
 * Sanitize and parse one SVG into a deeply frozen, closed plain-data tree.
 * Returns null for every sanitizer or parser mismatch and never performs recovery.
 */
export function buildSafeSvgTree(raw: string): SafeSvgElement | null {
  try {
    const sanitized = sanitizeSvg(raw);
    return sanitized ? parseSanitizedSvg(sanitized) : null;
  } catch {
    return null;
  }
}
