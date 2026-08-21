import { createElement, type CSSProperties, type ReactNode } from "react";
import { Check, Heart, Shield, Sparkles, Star, Zap, type LucideIcon } from "lucide-react";

import {
  decodeHtmlEntities,
  parseHtmlAttributes,
  tokenizeHtml,
} from "../posts/editor/postRichTextHtmlUtils";
import {
  isPageTextMarkCapableBlockType,
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
  type PageBlockV2,
  type PageTextMark,
} from "./pageDocumentV2Types";
import { normalizeBlockTextMarks } from "./pageTextMarksV2";
import {
  SAFE_SVG_SOURCE_TO_REACT_PROP,
  type SafeReactSvgProp,
  type SafeSvgElement,
  type SafeSvgNode,
} from "./svgSafeTree";
import {
  sanitizeAuthoringCssColor,
  sanitizeAuthoringMediaUrl,
  sanitizeAuthoringRichTextHtml,
} from "./pageAuthoringSanitizers";
import {
  pageBlockElementDataAttributes,
  pageBlockTextDataAttributes,
  pageTextAlignClass,
  toPageBlockElementStyle,
  toPageBlockTypographyStyle,
} from "./pageBlockRenderStyles";
import {
  transformPageReplicaIdentityAttribute,
  type PageReplicaIdentityContext,
} from "./pageRendererReplicaIdentity";
import type { PageGalleryItemV2 } from "./pageGalleryV2";
import { GALLERY_CATEGORY_PATTERN, GALLERY_FILTER_CATEGORY_MAX } from "./pageDocumentV2Types";
import {
  readText,
  joinPageRenderClasses,
  type PageBlockRenderContext,
  type PageBlockStyleProperties,
} from "./pageRendererV2Contract";

export type SanitizedEmbedElementFrame = {
  tagName: string;
  rawAttrs: string;
  children: ReactNode[];
  key: number;
};

export const toSanitizedEmbedElementProps = (
  tagName: string,
  rawAttrs: string,
  key: number
): Record<string, string | number> => {
  if (tagName !== "a") return { key };
  const attrs = parseHtmlAttributes(rawAttrs);
  const href = attrs.get("href");
  const rel = attrs.get("rel");
  const target = attrs.get("target");
  return {
    key,
    ...(href ? { href } : {}),
    ...(rel ? { rel } : {}),
    ...(target ? { target } : {}),
  };
};

const SAFE_CUSTOM_SVG_MIN_ASPECT_RATIO = 1 / 8;
const SAFE_CUSTOM_SVG_MAX_ASPECT_RATIO = 8;
const SAFE_CUSTOM_SVG_MAX_BLOCK_SIZE_PX = 1024;

export const SAFE_CUSTOM_SVG_BOUNDARY_STYLE: Readonly<CSSProperties> = Object.freeze({
  display: "block",
  inlineSize: "100%",
  maxInlineSize: "100%",
  maxBlockSize: `${SAFE_CUSTOM_SVG_MAX_BLOCK_SIZE_PX}px`,
  overflow: "hidden",
  contain: "layout paint",
  pointerEvents: "none",
});

const SAFE_CUSTOM_SVG_REACT_PROPS: readonly SafeReactSvgProp[] = Object.freeze(
  Object.values(SAFE_SVG_SOURCE_TO_REACT_PROP)
);

const SAFE_CUSTOM_SVG_DRAW_TAGS: ReadonlySet<SafeSvgElement["tag"]> = new Set([
  "path",
  "line",
  "polyline",
]);

const SVG_NUMBER_SOURCE = "[+-]?(?:(?:\\d+(?:\\.\\d*)?)|(?:\\.\\d+))(?:[eE][+-]?\\d+)?";
const SVG_NUMBER_SEPARATOR_SOURCE = "(?:[ \\t\\r\\n]*,[ \\t\\r\\n]*|[ \\t\\r\\n]+)";
const SAFE_CUSTOM_SVG_VIEWBOX_RE = new RegExp(
  `^[ \\t\\r\\n]*(${SVG_NUMBER_SOURCE})${SVG_NUMBER_SEPARATOR_SOURCE}` +
    `(${SVG_NUMBER_SOURCE})${SVG_NUMBER_SEPARATOR_SOURCE}` +
    `(${SVG_NUMBER_SOURCE})${SVG_NUMBER_SEPARATOR_SOURCE}` +
    `(${SVG_NUMBER_SOURCE})[ \\t\\r\\n]*$`
);
const SAFE_CUSTOM_SVG_DIMENSION_RE = new RegExp(`^(${SVG_NUMBER_SOURCE})(?:px)?$`);

const parseFiniteSvgNumber = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseSafeCustomSvgViewBoxRatio = (value: string | undefined): number | null => {
  if (typeof value !== "string") return null;
  const match = SAFE_CUSTOM_SVG_VIEWBOX_RE.exec(value);
  if (!match) return null;
  const x = parseFiniteSvgNumber(match[1]!);
  const y = parseFiniteSvgNumber(match[2]!);
  const width = parseFiniteSvgNumber(match[3]!);
  const height = parseFiniteSvgNumber(match[4]!);
  if (x === null || y === null || width === null || height === null) return null;
  return width > 0 && height > 0 ? width / height : null;
};

const parseSafeCustomSvgDimension = (value: string | undefined): number | null => {
  if (typeof value !== "string") return null;
  const match = SAFE_CUSTOM_SVG_DIMENSION_RE.exec(value);
  if (!match) return null;
  const parsed = parseFiniteSvgNumber(match[1]!);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const resolveTrustedSvgViewportStyle = (
  rootProps: SafeSvgElement["props"]
): Readonly<CSSProperties> => {
  const viewBoxRatio = parseSafeCustomSvgViewBoxRatio(rootProps.viewBox);
  const width = parseSafeCustomSvgDimension(rootProps.width);
  const height = parseSafeCustomSvgDimension(rootProps.height);
  const rawRatio = viewBoxRatio ?? (width !== null && height !== null ? width / height : 1);
  const aspectRatio = Math.max(
    SAFE_CUSTOM_SVG_MIN_ASPECT_RATIO,
    Math.min(SAFE_CUSTOM_SVG_MAX_ASPECT_RATIO, rawRatio)
  );
  return {
    display: "block",
    inlineSize: "100%",
    maxInlineSize: "100%",
    blockSize: "auto",
    maxBlockSize: `${SAFE_CUSTOM_SVG_MAX_BLOCK_SIZE_PX}px`,
    aspectRatio: String(aspectRatio),
    overflow: "hidden",
    pointerEvents: "none",
  };
};

type SafeCustomSvgRenderProps = Record<string, string | CSSProperties>;

const copySafeCustomSvgProps = (
  source: SafeSvgElement["props"],
  key: string
): SafeCustomSvgRenderProps => {
  const props: SafeCustomSvgRenderProps = { key };
  for (const safeName of SAFE_CUSTOM_SVG_REACT_PROPS) {
    const value = source[safeName];
    if (typeof value === "string") props[safeName] = value;
  }
  return props;
};

export const renderSafeSvgNode = (
  node: SafeSvgNode,
  key: string,
  drawIn: boolean,
  isRoot = false,
  // TASK-539-05-L01 — approved marquee replica context. When present, every
  // Safe-SVG identity-bearing attribute (`id`, local `href`/`xlinkHref` hash,
  // and `url(#...)` in fill/stroke/clip-path/mask/filter) is rewritten through
  // the ONE identity transformer: a target rewrites ONLY when its exact value
  // is backed by a locally emitted `id` (`domIds`); unresolved/external values
  // stay byte-for-byte. The primary passes no context and is unchanged.
  replicaContext?: PageReplicaIdentityContext
): ReactNode => {
  if (node.kind === "text") return node.value;

  const props = copySafeCustomSvgProps(node.props, key);

  if (replicaContext) {
    // Finite attribute set: only names the safe-SVG prop map can actually
    // emit are consulted (id/href/xlinkHref/fill/stroke/clipPath/mask/filter).
    for (const attribute of [
      "id",
      "href",
      "xlinkHref",
      "fill",
      "stroke",
      "clipPath",
      "mask",
      "filter",
    ] as const) {
      const value = props[attribute];
      if (typeof value === "string") {
        props[attribute] = transformPageReplicaIdentityAttribute(replicaContext, attribute, value);
      }
    }
  }

  if (isRoot) {
    const viewportStyle = resolveTrustedSvgViewportStyle(node.props);
    delete props.x;
    delete props.y;
    delete props.width;
    delete props.height;
    delete props.transform;
    props.width = "100%";
    props.style = viewportStyle;
  }
  if (drawIn && SAFE_CUSTOM_SVG_DRAW_TAGS.has(node.tag) && node.props.pathLength === undefined) {
    props.pathLength = "1";
  }

  const children = node.children.map((child, index) =>
    renderSafeSvgNode(child, `${key}.${index}`, drawIn, false, replicaContext)
  );
  return createElement(node.tag, props, ...children);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const toHrefTarget = (value: unknown) => (value === "blank" ? "_blank" : undefined);

export const readButtonVariant = (value: unknown) =>
  value === "secondary" || value === "ghost" || value === "link" ? value : "primary";

export const readButtonSize = (value: unknown) => (value === "sm" || value === "lg" ? value : "md");

export const pageButtonSizeClass = (size: string, variant: string) => {
  if (variant === "link") {
    if (size === "sm") return "text-sm";
    if (size === "lg") return "text-lg";
    return "text-base";
  }
  if (size === "sm") return "px-3 py-2 text-sm";
  if (size === "lg") return "px-6 py-4 text-base";
  return "px-5 py-3 text-sm";
};

export const pageButtonVariantClass = (variant: string) => {
  if (variant === "secondary") {
    return "border bg-transparent shadow-sm transition hover:opacity-90";
  }
  if (variant === "ghost") {
    return "bg-transparent shadow-none transition hover:opacity-80";
  }
  if (variant === "link") {
    return "bg-transparent underline underline-offset-4 shadow-none transition hover:opacity-80";
  }
  return "shadow-sm transition hover:opacity-90";
};

const pageBadgeIconMap: Record<(typeof pageBadgeIcons)[number], LucideIcon> = {
  check: Check,
  heart: Heart,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
};

const readBadgeOption = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T
): T => (typeof value === "string" && options.includes(value as T) ? (value as T) : fallback);

const readBadgeIcon = (value: unknown): (typeof pageBadgeIcons)[number] | null =>
  typeof value === "string" && pageBadgeIcons.includes(value as (typeof pageBadgeIcons)[number])
    ? (value as (typeof pageBadgeIcons)[number])
    : null;

const pageBadgeShapeClass = (shape: string) => {
  if (shape === "square") return "rounded-none";
  if (shape === "rounded") return "rounded-md";
  return "rounded-full";
};

const pageBadgeSizeClass = (size: string) => {
  if (size === "2xs") return "gap-1 px-1.5 py-0.5";
  if (size === "xs") return "gap-1 px-2 py-0.5";
  if (size === "md") return "gap-1.5 px-3 py-1";
  return "gap-1.5 px-2.5 py-0.5";
};

const pageBadgeVariantClass = (variant: string) => {
  if (variant === "outline") return "border bg-transparent";
  if (variant === "solid") return "border border-transparent";
  return "border border-transparent";
};

const pageBadgeVariantStyle = (
  variant: string,
  background: unknown,
  textColor: unknown
): PageBlockStyleProperties => {
  const safeBackground = sanitizeAuthoringCssColor(background);
  const safeTextColor = sanitizeAuthoringCssColor(textColor);
  const accent = "var(--coderso-section-accent,#0d9488)";
  if (variant === "solid") {
    return {
      backgroundColor: safeBackground ?? accent,
      borderColor: safeBackground ?? accent,
      color: safeTextColor ?? "#ffffff",
    };
  }
  if (variant === "outline") {
    return {
      backgroundColor: safeBackground ?? "transparent",
      borderColor: safeBackground ?? accent,
      color: safeTextColor ?? accent,
    };
  }
  return {
    backgroundColor: safeBackground ?? "rgba(13, 148, 136, 0.12)",
    borderColor: safeBackground ?? "rgba(13, 148, 136, 0.12)",
    color: safeTextColor ?? accent,
  };
};

const pageImageFitClass = (value: unknown) =>
  value === "contain" ? "object-contain" : "object-cover";

export const pageDividerToneBorderColor = (value: unknown) => {
  if (value === "muted") return "#cbd5e1";
  if (value === "accent") return "var(--coderso-section-accent,#0d9488)";
  return "#e2e8f0";
};

export const renderBlockText = (
  block: PageBlockV2,
  propPath: string,
  text: string,
  context: PageBlockRenderContext,
  children?: ReactNode
): ReactNode =>
  context.renderInlineText
    ? context.renderInlineText({ block, propPath, text, children })
    : (children ?? text);

const textMarkRenderRank: Record<PageTextMark["type"], number> = {
  color: 0,
  highlight: 1,
  bold: 2,
  italic: 3,
  link: 4,
};

/**
 * Deterministic, token-driven styling for an inline `link` mark so a linked run
 * is visually obvious (underline + link color) on BOTH the front and the canvas.
 * Renderer-applied only — the style is not stored in the mark, so it needs no
 * schema/sanitizer change. The `--coderso-link` token follows the renderer's
 * `--coderso-*` namespace and carries a hard fallback so the affordance is
 * visible even where the var is undefined.
 */
const PAGE_TEXT_LINK_MARK_CLASS =
  "underline underline-offset-2 text-[var(--coderso-link,#2563eb)] hover:opacity-80";

const renderMarkedTextSegment = (
  text: string,
  marks: readonly PageTextMark[],
  key: string,
  isCanvas: boolean
): ReactNode => {
  const style: CSSProperties = {};
  const link = marks.find(
    (mark): mark is Extract<PageTextMark, { type: "link" }> => mark.type === "link"
  );
  const hasBold = marks.some((mark) => mark.type === "bold");
  const hasItalic = marks.some((mark) => mark.type === "italic");
  for (const mark of marks) {
    if (mark.type === "color") style.color = mark.color;
    if (mark.type === "highlight") style.backgroundColor = mark.color;
  }

  let node: ReactNode = text;
  const styleTypes = marks
    .filter((mark) => mark.type === "color" || mark.type === "highlight")
    .map((mark) => mark.type)
    .join(" ");
  if (Object.keys(style).length > 0) {
    node = (
      <span key={`${key}-style`} data-page-text-mark={styleTypes} style={style}>
        {node}
      </span>
    );
  }
  if (hasBold) {
    node = <strong key={`${key}-bold`}>{node}</strong>;
  }
  if (hasItalic) {
    node = <em key={`${key}-italic`}>{node}</em>;
  }
  if (link) {
    // In the editor canvas a linked run is painted as a NON-navigating span so a
    // click selects the fragment / sets the caret instead of opening the URL (and
    // never fires the beforeunload navigation), letting the author click-to-edit a
    // link (TASK-478-02). It keeps the same link affordance (underline + link
    // color + `data-page-text-mark="link"`) so linked runs stay visually obvious
    // and distinctly outlined. The front + preview (runtime mode) still render a
    // real, navigable `<a href>` with the security `rel`.
    node = isCanvas ? (
      <span
        key={`${key}-link`}
        className={PAGE_TEXT_LINK_MARK_CLASS}
        data-page-text-mark="link"
        data-page-editor-link-noop="true"
      >
        {node}
      </span>
    ) : (
      <a
        key={`${key}-link`}
        href={link.href}
        className={PAGE_TEXT_LINK_MARK_CLASS}
        data-page-text-mark="link"
        rel="nofollow noreferrer"
      >
        {node}
      </a>
    );
  }
  return node;
};

export const renderBlockTextMarks = (
  block: PageBlockV2,
  propPath: string,
  text: string,
  context: PageBlockRenderContext
): ReactNode => {
  if (propPath !== "text" || !isPageTextMarkCapableBlockType(block.type)) {
    return renderBlockText(block, propPath, text, context);
  }
  const marks = normalizeBlockTextMarks(text, block.props.marks);
  if (marks.length === 0) return renderBlockText(block, propPath, text, context);

  const isCanvas = context.layoutMode === "canvas-device";
  const boundaries = Array.from(
    new Set([0, text.length, ...marks.flatMap((mark) => [mark.from, mark.to])])
  ).sort((left, right) => left - right);
  const children: ReactNode[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const from = boundaries[index]!;
    const to = boundaries[index + 1]!;
    if (to <= from) continue;
    const segment = text.slice(from, to);
    const activeMarks = marks
      .filter((mark) => mark.from <= from && mark.to >= to)
      .sort((left, right) => textMarkRenderRank[left.type] - textMarkRenderRank[right.type]);
    children.push(
      activeMarks.length > 0
        ? renderMarkedTextSegment(segment, activeMarks, `mark-${index}-${from}-${to}`, isCanvas)
        : segment
    );
  }
  return renderBlockText(block, propPath, text, context, children);
};

const pageRichTextAllowedTags: ReadonlySet<string> = new Set([
  "a",
  "br",
  "code",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "strong",
  "ul",
]);

const pageRichTextSelfClosingTags: ReadonlySet<string> = new Set(["br"]);

const richTextStyledElementTags: ReadonlySet<string> = new Set(["li", "ol", "p", "ul"]);

const toSanitizedRichTextElementProps = (
  tagName: string,
  rawAttrs: string,
  key: number,
  style: PageBlockStyleProperties
): Record<string, string | number | CSSProperties> => {
  const attrs = toSanitizedEmbedElementProps(tagName, rawAttrs, key);
  if (!richTextStyledElementTags.has(tagName)) return attrs;
  return {
    ...attrs,
    ...pageBlockTextDataAttributes,
    style,
  };
};

const renderRichTextRootText = (
  text: string,
  key: number,
  style: PageBlockStyleProperties
): ReactNode => (
  <span key={key} style={style} {...pageBlockTextDataAttributes}>
    {text}
  </span>
);

const createSanitizedRichTextElement = (
  frame: SanitizedEmbedElementFrame,
  style: PageBlockStyleProperties
) =>
  createElement(
    frame.tagName,
    toSanitizedRichTextElementProps(frame.tagName, frame.rawAttrs, frame.key, style),
    ...frame.children
  );

const renderSanitizedRichTextHtml = (
  sanitizedHtml: string,
  style: PageBlockStyleProperties
): ReactNode[] => {
  const roots: ReactNode[] = [];
  const stack: SanitizedEmbedElementFrame[] = [];
  let nextKey = 0;

  const appendNode = (node: ReactNode) => {
    const parent = stack.at(-1);
    if (parent) {
      parent.children.push(node);
      return;
    }
    roots.push(node);
  };

  for (const token of tokenizeHtml(sanitizedHtml)) {
    if (token.kind === "text") {
      const text = decodeHtmlEntities(token.value);
      if (stack.length > 0) {
        appendNode(text);
      } else if (text.length > 0) {
        appendNode(renderRichTextRootText(text, nextKey++, style));
      }
      continue;
    }
    if (token.kind === "comment" || !pageRichTextAllowedTags.has(token.name)) continue;

    if (token.closing) {
      const current = stack.at(-1);
      if (current?.tagName === token.name) {
        stack.pop();
        appendNode(createSanitizedRichTextElement(current, style));
      }
      continue;
    }

    if (token.selfClosing || pageRichTextSelfClosingTags.has(token.name)) {
      appendNode(
        createElement(
          token.name,
          toSanitizedRichTextElementProps(token.name, token.rawAttrs, nextKey++, style)
        )
      );
      continue;
    }

    stack.push({ tagName: token.name, rawAttrs: token.rawAttrs, children: [], key: nextKey++ });
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (current) appendNode(createSanitizedRichTextElement(current, style));
  }

  return roots;
};

export const renderTextBlock = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const className = joinPageRenderClasses(
    block.props.format === "rich"
      ? "prose max-w-none text-base leading-7 text-[var(--coderso-block-text,#334155)]"
      : "text-base leading-7 text-[var(--coderso-block-text,#334155)]",
    pageTextAlignClass(block.props.align)
  );
  const style = toPageBlockTypographyStyle(block);
  if (block.props.format === "rich") {
    const sanitizedHtml = sanitizeAuthoringRichTextHtml(block.props.text);
    const richChildren = renderSanitizedRichTextHtml(sanitizedHtml, style);
    // ── TASK-532 text-block textColor (Bundle B) — rich-path fix ──
    // The plain `<p>` path honors `style.textColor` via the inherited
    // `--coderso-block-text` var. The rich path renders a bare wrapper `<div>`
    // whose sanitized children carry the typography style WITHOUT color, so an
    // authored textColor never reaches the rich body. Present-only fix: when a
    // safe textColor is authored, set it on the wrapper AND force every child to
    // inherit it via `[&_*]:text-[color:inherit]`. `richTextColor` comes ONLY
    // from the existing `sanitizeAuthoringCssColor` whitelist (never a raw
    // author string).
    //
    // WHY THIS PAINTS TODAY (empirically verified 2026-07-09, LIVE Chromium,
    // acceptance #5): the `prose` class on the wrapper is a hook for the Tailwind
    // typography plugin, but that plugin is NOT installed here (no
    // `@plugin "@tailwindcss/typography"` in either entrypoint — both are plain
    // `@import "tailwindcss"`; and post-content.css defines no `.prose` descendant
    // COLOR rule). So no competing descendant-color rule exists: the child <p>
    // inherits the wrapper's inline `color` and computes to the authored value.
    // Proven in-browser: getComputedStyle(child <p>).color === rgb(34,211,238) for
    // textColor "#22d3ee", in BOTH light and dark. The `[&_*]:text-[color:inherit]`
    // utility is a belt-and-suspenders inherit hint on top of that.
    // CAVEAT (not a false safety net): this utility compiles to `.<class> * {
    // color: inherit }` — specificity (0,1,0), same as a hypothetical
    // `.prose :where(p){color}`. If the typography plugin were ever added, its
    // descendant color rule could TIE and win on source order, so this utility
    // is NOT a guaranteed override — adding that plugin would require re-checking
    // the cascade (or bumping specificity), not relying on this line alone.
    // NOTE: only a runtime computed-color check (acceptance #5, LIVE Playwright)
    // proves the painted color; the render test asserts the emitted markup only.
    const richTextColor = sanitizeAuthoringCssColor(block.style?.textColor);
    return (
      <div
        className={joinPageRenderClasses(
          className,
          richTextColor ? "[&_*]:text-[color:inherit]" : undefined
        )}
        style={richTextColor ? { color: richTextColor } : undefined}
        // Present-only: only tag the rich wrapper as a text node when an
        // authored textColor is threaded onto it. Without textColor the wrapper
        // stays byte-identical to post-530 (no attribute leak).
        {...(richTextColor ? pageBlockTextDataAttributes : {})}
      >
        {context.renderInlineText
          ? context.renderInlineText({
              block,
              propPath: "text",
              text: readText(block.props.text),
              children: richChildren,
              display: "block",
            })
          : richChildren}
      </div>
    );
  }
  return (
    <p className={className} style={style} {...pageBlockTextDataAttributes}>
      {renderBlockTextMarks(block, "text", readText(block.props.text), context)}
    </p>
  );
};

export const renderHeading = (block: PageBlockV2, context: PageBlockRenderContext) => {
  const text = renderBlockTextMarks(block, "text", readText(block.props.text, "Heading"), context);
  const level = readText(block.props.level, "h2");
  // Typography contract: explicit tokens paint inline on the heading element
  // itself so they beat the baked level classes (text-5xl, font-semibold).
  const textNodeProps = {
    className: joinPageRenderClasses(
      "font-semibold leading-tight text-[var(--coderso-block-text,#020617)]",
      level === "h1" ? "text-5xl" : level === "h2" ? "text-4xl" : "text-2xl",
      pageTextAlignClass(block.props.align)
    ),
    style: toPageBlockTypographyStyle(block),
    ...pageBlockTextDataAttributes,
  };

  if (level === "h1") return <h1 {...textNodeProps}>{text}</h1>;
  if (level === "h3") return <h3 {...textNodeProps}>{text}</h3>;
  if (level === "h4") return <h4 {...textNodeProps}>{text}</h4>;
  if (level === "h5") return <h5 {...textNodeProps}>{text}</h5>;
  if (level === "h6") return <h6 {...textNodeProps}>{text}</h6>;
  return <h2 {...textNodeProps}>{text}</h2>;
};

export const renderBadgeBlock = (block: PageBlockV2) => {
  const text = readText(block.props.text, "Badge");
  const variant = readBadgeOption(block.props.variant, pageBadgeVariants, "soft");
  const size = readBadgeOption(block.props.size, pageBadgeSizes, "sm");
  const shape = readBadgeOption(block.props.shape, pageBadgeShapes, "pill");
  const weight = readBadgeOption(block.props.weight, pageBadgeWeights, "semibold");
  const iconPosition = readBadgeOption(block.props.iconPosition, pageBadgeIconPositions, "start");
  const iconName = readBadgeIcon(block.props.icon);
  const Icon = iconName ? pageBadgeIconMap[iconName] : null;
  const style: PageBlockStyleProperties = {
    ...pageBadgeVariantStyle(variant, block.props.background, block.props.textColor),
    fontSize: pageTypographyFontSizeCssValues[size],
    fontWeight: pageTypographyFontWeightCssValues[weight],
  };
  const icon = Icon ? <Icon className="h-[1em] w-[1em] shrink-0" aria-hidden="true" /> : null;

  return (
    <span
      className={joinPageRenderClasses(
        "inline-flex max-w-full items-center whitespace-nowrap leading-none",
        pageBadgeVariantClass(variant),
        pageBadgeShapeClass(shape),
        pageBadgeSizeClass(size)
      )}
      data-page-badge="true"
      data-page-badge-variant={variant}
      data-page-badge-size={size}
      data-page-badge-shape={shape}
      style={style}
    >
      {icon && iconPosition === "start" ? icon : null}
      <span className="min-w-0 truncate">{text}</span>
      {icon && iconPosition === "end" ? icon : null}
    </span>
  );
};

export const renderImage = (block: PageBlockV2) => {
  const src = sanitizeAuthoringMediaUrl(block.props.src) ?? "";
  const alt = readText(block.props.alt);
  const caption = readText(block.props.caption);
  // Style-target contract: radius/border/shadow must clip the picture itself,
  // not the frame around it, so the visual style surface lands on the img
  // (or its empty-state placeholder), never on the block frame.
  const elementStyle = toPageBlockElementStyle(block);
  if (!src) {
    return (
      <div
        className="flex min-h-48 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"
        style={elementStyle}
        {...pageBlockElementDataAttributes}
      >
        Image
      </div>
    );
  }
  return (
    <figure className="space-y-2">
      <img
        className={joinPageRenderClasses("w-full rounded", pageImageFitClass(block.props.fit))}
        style={elementStyle}
        {...pageBlockElementDataAttributes}
        src={src}
        alt={alt}
        loading="lazy"
      />
      {caption ? <figcaption className="text-sm text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
};

// ── TASK-534 ── a gallery category is a SINGLE token, NO space (534-01-L01): the
// runtime filter treats `data-category` as a space-separated SET, so a space must
// not live inside one category token. TASK-539-05-L01 — the OWNER grammar
// (`GALLERY_CATEGORY_PATTERN`) and filter cap (`GALLERY_FILTER_CATEGORY_MAX`) are
// consumed here; the local regex mirror and magic `12` are gone.

const toGalleryItem = (value: unknown): PageGalleryItemV2 | null => {
  if (typeof value === "string") {
    const src = sanitizeAuthoringMediaUrl(value) ?? "";
    return src ? { src, alt: "", caption: "" } : null;
  }
  if (!isRecord(value)) return null;
  // TASK-539-05-L01 — read ONLY the canonical owner keys (`src`/`alt`/`caption`/
  // `category`); the write normalizer already committed the owner item shape, so
  // the renderer no longer interprets alias keys (url/image/assetUrl/title/...).
  // Defence in depth: re-sanitize nonempty URLs and category tokens with the
  // OWNER sanitizer/constants; invalid material omits only that unsafe output
  // (caption-only placeholders remain).
  const src = sanitizeAuthoringMediaUrl(value.src) ?? "";
  const alt = readText(value.alt);
  const caption = readText(value.caption);
  if (!src && !caption) return null;
  const category =
    typeof value.category === "string"
      ? value.category
          .split(/\s+/)
          .filter((token) => GALLERY_CATEGORY_PATTERN.test(token))
          .slice(0, GALLERY_FILTER_CATEGORY_MAX)
          .join(" ")
      : undefined;
  return { src, alt, caption, ...(category ? { category } : {}) };
};

const pageGalleryGridClass = (layout: unknown) => {
  if (layout === "carousel") return "flex gap-4 overflow-x-auto";
  if (layout === "masonry") return "columns-1 gap-4 md:columns-3";
  return "grid gap-4 md:grid-cols-3";
};

const pageGalleryItemClass = (layout: unknown) =>
  layout === "carousel" ? "min-w-64 flex-1" : "break-inside-avoid";

export const renderGallery = (block: PageBlockV2) => {
  const layout =
    block.props.layout === "carousel" || block.props.layout === "masonry"
      ? block.props.layout
      : "grid";
  const items = (Array.isArray(block.props.items) ? block.props.items : [])
    .map(toGalleryItem)
    .filter((item): item is PageGalleryItemV2 => Boolean(item));

  if (items.length === 0) {
    return (
      <div
        className="rounded border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500"
        data-page-gallery-empty="true"
      >
        Empty gallery
      </div>
    );
  }

  // ── TASK-534 ── present-only filter. Re-validate at the render boundary (never
  // trust stored): `filterable` boolean; categories re-sanitized per single token
  // (NO space) so a value that bypassed the write path can never break out of the
  // `data-category`/`data-filter` attribute. Unset ⇒ byte-identical to pre-534.
  const filterable = block.props.filterable === true;
  const categories = filterable
    ? [
        ...new Set(
          (Array.isArray(block.props.filterCategories) ? block.props.filterCategories : []).filter(
            (c): c is string => typeof c === "string" && GALLERY_CATEGORY_PATTERN.test(c)
          )
        ),
      ].slice(0, GALLERY_FILTER_CATEGORY_MAX)
    : [];

  const grid = (
    <div
      className={pageGalleryGridClass(layout)}
      data-page-gallery="true"
      data-page-gallery-layout={layout}
    >
      {items.map((item, index) => {
        // Re-sanitize the item category at render (defence in depth). An item may
        // hold MULTIPLE space-joined single-token categories → validate PER token.
        const rawCat = typeof item.category === "string" ? item.category : "";
        const catTokens = rawCat
          .split(/\s+/)
          .filter((token) => GALLERY_CATEGORY_PATTERN.test(token));
        const cat = catTokens.length ? catTokens.join(" ") : undefined;
        return (
          <figure
            key={`${block.id}-gallery-${index}`}
            className={joinPageRenderClasses(
              "overflow-hidden rounded border border-slate-200 bg-[var(--coderso-block-surface,#ffffff)]",
              pageGalleryItemClass(layout)
            )}
            data-page-gallery-item="true"
            {...(filterable ? { "data-filter-item": "true" } : {})}
            {...(filterable && cat ? { "data-category": cat } : {})}
          >
            {item.src ? (
              <img
                className="aspect-[4/3] w-full object-cover"
                src={item.src}
                alt={item.alt}
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500">
                {item.caption}
              </div>
            )}
            {item.caption ? (
              <figcaption className="px-4 py-3 text-sm text-[var(--coderso-block-text,#475569)]">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );

  // Present-only: no filter bar unless authored AND at least one valid category.
  if (!filterable || categories.length === 0) return grid;

  // TASK-534 accessibility (534 audit remediation): a filter chip group is a set of
  // toggle buttons, NOT a single-select tablist over one panel. It is rendered as a
  // role="toolbar" of `aria-pressed` toggle buttons (the semantically honest pattern)
  // rather than an incomplete role="tab"/tablist (which promises aria-controls +
  // tabpanel + roving-tab semantics we do not — and should not — fulfil here). The
  // toolbar carries roving tabindex (active chip = 0, rest = -1) matched by the
  // runtime's ArrowLeft/Right/Home/End handler (534-01-L03).
  return (
    <div data-gallery="true">
      <div
        role="toolbar"
        aria-label="Filter gallery"
        aria-orientation="horizontal"
        data-gallery-filter="true"
        className="cx-gallery-filter"
      >
        <button
          type="button"
          data-filter="all"
          aria-pressed="true"
          tabIndex={0}
          className="cx-filter-chip"
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            data-filter={category}
            aria-pressed="false"
            tabIndex={-1}
            className="cx-filter-chip"
          >
            {category}
          </button>
        ))}
      </div>
      {grid}
    </div>
  );
};
