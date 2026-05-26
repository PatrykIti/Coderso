import { createElement, type CSSProperties, type ComponentType, type ReactNode } from "react";

import {
  decodeHtmlEntities,
  dangerousHtmlContentTagSet,
  escapeHtml,
  htmlToPlainText,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
  stripNullBytes,
  tokenizeHtml,
} from "../../services/posts/editor/postRichTextHtmlUtils";
import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type RichTextSectionVariantId = "single-column" | "two-column" | "article";
export type RichTextSectionFontScale = "none" | "sm" | "md" | "lg";
export type RichTextSectionLineHeight = "none" | "tight" | "normal" | "relaxed";
export type RichTextSectionSpacing = "none" | "sm" | "md" | "lg";
export type RichTextSectionMaxWidth = "md" | "lg" | "xl" | "full";
export type RichTextSectionOutputMode = "html" | "blocks-fallback" | "blocks";
export type RichTextSectionTitleHeadingLevel = 1 | 2 | 3;
export type RichTextSectionBlockHeadingLevel = 2 | 3 | 4;
export type RichTextSectionBlockKind = "text" | "image" | "attachment" | "embed";
export type RichTextSectionMediaWidth = "content" | "wide" | "full";
export type RichTextSectionMediaAlign = "left" | "center" | "right";
export type RichTextSectionEmbedProvider = "youtube" | "vimeo" | "external-link";
export type RichTextSectionEmbedAspectRatio = "16:9" | "4:3" | "1:1";

export type RichTextSectionTextBlock = {
  id?: string;
  kind?: "text";
  heading?: string;
  headingLevel?: RichTextSectionBlockHeadingLevel;
  content?: string;
  contentHtml?: string;
};

export type RichTextSectionImageBlock = {
  id?: string;
  kind: "image";
  mediaId?: string;
  src?: string;
  alt?: string;
  decorative?: boolean;
  caption?: string;
  href?: string;
  width?: RichTextSectionMediaWidth;
  align?: RichTextSectionMediaAlign;
};

export type RichTextSectionAttachmentBlock = {
  id?: string;
  kind: "attachment";
  mediaId?: string;
  src?: string;
  label?: string;
  description?: string;
  mimeType?: string;
  sizeLabel?: string;
};

export type RichTextSectionEmbedBlock = {
  id?: string;
  kind: "embed";
  provider?: RichTextSectionEmbedProvider;
  url?: string;
  title?: string;
  aspectRatio?: RichTextSectionEmbedAspectRatio;
  renderMode?: "link-card";
};

export type RichTextSectionBlock =
  | RichTextSectionTextBlock
  | RichTextSectionImageBlock
  | RichTextSectionAttachmentBlock
  | RichTextSectionEmbedBlock;

export type RichTextRenderedSource = "html" | "blocks";
export type RichTextRenderedSourceReason =
  | "html-only"
  | "blocks-only"
  | "fallback-html-present"
  | "fallback-html-empty";

export type RichTextRenderedSourceState = {
  mode: RichTextSectionOutputMode;
  renderedSource: RichTextRenderedSource;
  htmlIsActive: boolean;
  blocksAreActive: boolean;
  hasHtml: boolean;
  hasBlocks: boolean;
  reason: RichTextRenderedSourceReason;
};

export type RichTextSanitizerDiagnosticCode =
  | "tag_removed"
  | "attribute_removed"
  | "href_rewritten";

export type RichTextSanitizerDiagnostic = {
  code: RichTextSanitizerDiagnosticCode;
  tagName?: string;
  attributeName?: string;
};

export type RichTextSectionData = {
  titleBlock?: {
    eyebrow?: string;
    title?: string;
    headingLevel?: RichTextSectionTitleHeadingLevel;
  };
  body?: {
    html?: string;
    blocks?: RichTextSectionBlock[];
  };
  options?: {
    dropcap?: boolean;
    toc?: boolean;
    maxWidth?: RichTextSectionMaxWidth;
    outputMode?: RichTextSectionOutputMode;
  };
  style?: {
    fontScale?: RichTextSectionFontScale;
    lineHeight?: RichTextSectionLineHeight;
    textColor?: string;
    background?: string;
    spacing?: RichTextSectionSpacing;
  };
};

type TocItem = {
  id: string;
  label: string;
  level: 2 | 3 | 4;
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const fontScaleClassMap: Record<RichTextSectionFontScale, string> = {
  none: "",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

const lineHeightClassMap: Record<RichTextSectionLineHeight, string> = {
  none: "",
  tight: "leading-6",
  normal: "leading-7",
  relaxed: "leading-8",
};

const spacingClassMap: Record<RichTextSectionSpacing, string> = {
  none: "space-y-0",
  sm: "space-y-4",
  md: "space-y-6",
  lg: "space-y-8",
};

const maxWidthClassMap: Record<RichTextSectionMaxWidth, string> = {
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  full: "max-w-none",
};

const richTextBlockMin = 0;
export const richTextBlockMax = 20;
const richTextHtmlMaxLength = 24000;
const richTextHeadingMaxLength = 180;
const richTextTextMaxLength = 12000;
const richTextCaptionMaxLength = 240;
const richTextLabelMaxLength = 120;
const richTextDescriptionMaxLength = 180;
const richTextMimeTypeMaxLength = 80;
const richTextSizeLabelMaxLength = 40;
const richTextDiagnosticsMax = 8;

const allowedTagSet = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h2",
  "h3",
  "h4",
  "hr",
  "span",
]);

const selfClosingTagSet = new Set(["br", "hr"]);

export const richTextSectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    titleBlock: {
      type: "object",
      additionalProperties: false,
      properties: {
        eyebrow: { type: "string" },
        title: { type: "string" },
        headingLevel: { enum: [1, 2, 3] },
      },
    },
    body: {
      type: "object",
      additionalProperties: false,
      properties: {
        html: { type: "string" },
        blocks: {
          type: "array",
          minItems: richTextBlockMin,
          maxItems: richTextBlockMax,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              kind: { enum: ["text", "image", "attachment", "embed"] },
              heading: { type: "string" },
              headingLevel: { enum: [2, 3, 4] },
              content: { type: "string" },
              contentHtml: { type: "string" },
              mediaId: { type: "string" },
              src: { type: "string" },
              alt: { type: "string" },
              decorative: { type: "boolean" },
              caption: { type: "string" },
              href: { type: "string" },
              width: { enum: ["content", "wide", "full"] },
              align: { enum: ["left", "center", "right"] },
              label: { type: "string" },
              description: { type: "string" },
              mimeType: { type: "string" },
              sizeLabel: { type: "string" },
              provider: { enum: ["youtube", "vimeo", "external-link"] },
              url: { type: "string" },
              title: { type: "string" },
              aspectRatio: { enum: ["16:9", "4:3", "1:1"] },
              renderMode: { enum: ["link-card"] },
            },
          },
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        dropcap: { type: "boolean" },
        toc: { type: "boolean" },
        maxWidth: { enum: ["md", "lg", "xl", "full"] },
        outputMode: { enum: ["html", "blocks-fallback", "blocks"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        fontScale: { enum: ["none", "sm", "md", "lg"] },
        lineHeight: { enum: ["none", "tight", "normal", "relaxed"] },
        textColor: { type: "string" },
        background: { type: "string" },
        spacing: { enum: ["none", "sm", "md", "lg"] },
      },
    },
  },
};

export const richTextSectionDefaults: RichTextSectionData = {
  titleBlock: {
    eyebrow: "Editorial",
    title: "Long-form content section",
    headingLevel: 2,
  },
  body: {
    html:
      "<h2>Clear structure for readable content</h2>" +
      "<p>Use this section for longer explanations, product narratives, or in-depth guides.</p>" +
      "<p>Keep paragraphs concise and add subheadings for scanning.</p>" +
      "<h3>What works best</h3>" +
      "<ul><li>Meaningful headings</li><li>Actionable details</li><li>Simple formatting</li></ul>",
    blocks: [
      {
        id: "block-1",
        kind: "text",
        heading: "Clear structure for readable content",
        headingLevel: 2,
        contentHtml:
          "<p>Use this section for longer explanations, product narratives, or in-depth guides.</p>",
      },
      {
        id: "block-2",
        kind: "text",
        heading: "What works best",
        headingLevel: 3,
        contentHtml:
          "<ul><li>Meaningful headings</li><li>Actionable details</li><li>Simple formatting</li></ul>",
      },
    ],
  },
  options: {
    dropcap: false,
    toc: false,
    maxWidth: "lg",
    outputMode: "blocks-fallback",
  },
  style: {
    fontScale: "md",
    lineHeight: "normal",
    textColor: "var(--color-text)",
    background: "transparent",
    spacing: "md",
  },
};

const richTextSectionWizardVisualDuplicateAllowances = [
  {
    path: "variant",
    reason: "Wizard seeds the starter reading layout until one-time setup hides replayed fields.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "titleBlock.eyebrow",
    reason: "Wizard seeds title copy; Visual remains the daily editorial owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "titleBlock.title",
    reason: "Wizard seeds title copy; Visual remains the daily editorial owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "titleBlock.headingLevel",
    reason: "Wizard seeds title structure; Visual remains the daily editorial owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "body.blocks",
    reason: "Wizard seeds starter blocks; Visual remains the daily rich-content owner.",
    expiresWithTask: "TASK-336-16",
  },
] satisfies NonNullable<WidgetEditorContract["sections"][number]["allowedDuplicateWritablePaths"]>;

export const richTextSectionEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "rich-text-section.wizard.starter-copy",
      title: "Starter copy",
      role: "setup",
      writablePaths: [
        "variant",
        "titleBlock.eyebrow",
        "titleBlock.title",
        "titleBlock.headingLevel",
        "body.blocks",
      ],
      allowedDuplicateWritablePaths: richTextSectionWizardVisualDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "rich-text-section.visual.editorial-content",
      title: "Editorial content",
      role: "content",
      writablePaths: [
        "variant",
        "titleBlock.eyebrow",
        "titleBlock.title",
        "titleBlock.headingLevel",
        "body.blocks",
        "body.html",
        "options.outputMode",
        "options.dropcap",
        "options.toc",
        "options.maxWidth",
      ],
      allowedDuplicateWritablePaths: richTextSectionWizardVisualDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "rich-text-section.visual.presentation",
      title: "Presentation",
      role: "visual",
      writablePaths: [
        "style.fontScale",
        "style.lineHeight",
        "style.textColor",
        "style.background",
        "style.spacing",
      ],
    },
    {
      mode: "advanced",
      id: "rich-text-section.advanced.source-summary",
      title: "Source summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["options.outputMode", "body.html", "body.blocks", "runtime.sanitizer"],
    },
    {
      mode: "advanced",
      id: "rich-text-section.advanced.saved-content-summary",
      title: "Saved content summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["runtime.normalizedData"],
    },
  ],
};

const createBlockId = (index: number) => `block-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const clampOptionalText = (value: string | undefined, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, maxLength);
};

const clampOptionalHtml = (value: string | undefined, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const bounded = value.slice(0, maxLength);
  return bounded.trim().length > 0 ? bounded : undefined;
};

const clampStoredHtml = (value: string | undefined, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  return value.slice(0, maxLength);
};

const clampOptionalId = (value: string | undefined) => clampOptionalText(value, 160);

const resolveRichTextFontScale = (value: string | undefined): RichTextSectionFontScale => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveRichTextLineHeight = (value: string | undefined): RichTextSectionLineHeight => {
  if (value === "none" || value === "tight" || value === "relaxed") return value;
  return "normal";
};

const resolveRichTextSpacing = (value: string | undefined): RichTextSectionSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveRichTextMaxWidth = (value: string | undefined): RichTextSectionMaxWidth => {
  if (value === "md" || value === "xl" || value === "full") return value;
  return "lg";
};

const resolveRichTextOutputMode = (value: string | undefined): RichTextSectionOutputMode => {
  if (value === "html" || value === "blocks") return value;
  return "blocks-fallback";
};

const resolveRichTextTitleHeadingLevel = (
  value: number | undefined
): RichTextSectionTitleHeadingLevel => {
  if (value === 1 || value === 3) return value;
  return 2;
};

const resolveRichTextBlockHeadingLevel = (
  value: number | undefined
): RichTextSectionBlockHeadingLevel => {
  if (value === 2 || value === 4) return value;
  return 3;
};

const resolveRichTextMediaWidth = (value: string | undefined): RichTextSectionMediaWidth => {
  if (value === "wide" || value === "full") return value;
  return "content";
};

const resolveRichTextMediaAlign = (value: string | undefined): RichTextSectionMediaAlign => {
  if (value === "left" || value === "right") return value;
  return "center";
};

const resolveRichTextEmbedAspectRatio = (
  value: string | undefined
): RichTextSectionEmbedAspectRatio => {
  if (value === "4:3" || value === "1:1") return value;
  return "16:9";
};

export const resolveRichTextSectionVariant = (variant: string): RichTextSectionVariantId => {
  if (variant === "two-column" || variant === "article") return variant;
  return "single-column";
};

const headingTextBlockTags = new Set(["h2", "h3", "h4", "span", "strong", "em"]);

const extractHeadingText = (value: string) => htmlToPlainText(value, headingTextBlockTags);

const slugifyHeading = (value: string, fallbackIndex: number) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : `heading-${fallbackIndex + 1}`;
};

const sanitizeAnchorHref = (value: string | undefined) => {
  if (typeof value !== "string") return "#";
  const trimmed = value.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return "#";
};

const parseAttributes = (rawAttrs: string) => parseHtmlAttributes(rawAttrs);

const sanitizeTagAttributes = (tagName: string, rawAttrs: string) => {
  if (tagName !== "a") return "";

  const attributes = parseAttributes(rawAttrs);
  const href = sanitizeAnchorHref(attributes.get("href"));
  const title = attributes.get("title");
  const target = attributes.get("target") === "_blank" ? "_blank" : undefined;

  let attrs = ` href="${escapeHtml(href)}"`;
  if (typeof title === "string" && title.trim().length > 0) {
    attrs += ` title="${escapeHtml(title.trim())}"`;
  }

  if (target === "_blank") {
    attrs += ' target="_blank" rel="noopener noreferrer"';
  }

  return attrs;
};

const collectRawAttributeNames = (rawAttrs: string) => {
  const names = new Set<string>();
  const regex = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;

  for (const match of rawAttrs.matchAll(regex)) {
    const name = (match[1] ?? "").toLowerCase();
    if (name) names.add(name);
  }

  return [...names];
};

const dedupeRichTextDiagnostics = (diagnostics: RichTextSanitizerDiagnostic[]) => {
  const unique: RichTextSanitizerDiagnostic[] = [];
  const seen = new Set<string>();

  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}:${diagnostic.tagName ?? ""}:${diagnostic.attributeName ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(diagnostic);
    if (unique.length >= richTextDiagnosticsMax) break;
  }

  return unique;
};

export function sanitizeRichTextHtmlWithDiagnostics(rawHtml: string | undefined): {
  html: string;
  diagnostics: RichTextSanitizerDiagnostic[];
} {
  if (typeof rawHtml !== "string" || rawHtml.trim().length === 0) {
    return { html: "", diagnostics: [] };
  }

  const diagnostics: RichTextSanitizerDiagnostic[] = [];

  for (const token of tokenizeHtml(stripNullBytes(rawHtml.slice(0, richTextHtmlMaxLength)))) {
    if (token.kind !== "tag" || token.closing) continue;

    if (dangerousHtmlContentTagSet.has(token.name) || !allowedTagSet.has(token.name)) {
      diagnostics.push({ code: "tag_removed", tagName: token.name });
      continue;
    }

    const rawAttributeNames = collectRawAttributeNames(token.rawAttrs);
    if (rawAttributeNames.length === 0) continue;

    const originalAttributes = parseHtmlAttributes(token.rawAttrs);
    const sanitizedAttributes = parseHtmlAttributes(
      sanitizeTagAttributes(token.name, token.rawAttrs)
    );

    for (const attributeName of rawAttributeNames) {
      if (attributeName.startsWith("on")) {
        diagnostics.push({
          code: "attribute_removed",
          tagName: token.name,
          attributeName,
        });
        continue;
      }

      if (attributeName === "href") {
        const originalHref = originalAttributes.get("href");
        const sanitizedHref = sanitizedAttributes.get("href");
        if (originalHref && sanitizedHref && originalHref !== sanitizedHref) {
          diagnostics.push({ code: "href_rewritten", tagName: token.name, attributeName });
          continue;
        }
      }

      if (!sanitizedAttributes.has(attributeName)) {
        diagnostics.push({
          code: "attribute_removed",
          tagName: token.name,
          attributeName,
        });
      }
    }
  }

  return {
    html: sanitizeHtmlWithPolicy(rawHtml.slice(0, richTextHtmlMaxLength), {
      allowedTags: allowedTagSet,
      selfClosingTags: selfClosingTagSet,
      dropContentTags: dangerousHtmlContentTagSet,
      sanitizeAttributes: sanitizeTagAttributes,
    }),
    diagnostics: dedupeRichTextDiagnostics(diagnostics),
  };
}

export function sanitizeRichTextHtml(rawHtml: string | undefined): string {
  return sanitizeRichTextHtmlWithDiagnostics(rawHtml).html;
}

type RichTextPreviewNode =
  | string
  | {
      tag: string;
      attrs: Record<string, string>;
      children: RichTextPreviewNode[];
    };

const richTextPreviewAttributeNames = new Set(["href", "title", "target", "rel"]);

const appendRichTextPreviewNode = (
  stack: Array<{ tag: string; attrs?: Record<string, string>; children: RichTextPreviewNode[] }>,
  node: RichTextPreviewNode
) => {
  stack[stack.length - 1]?.children.push(node);
};

const parseRichTextPreviewAttributes = (rawAttrs: string) => {
  const attrs: Record<string, string> = {};
  const parsed = parseHtmlAttributes(rawAttrs);

  for (const name of richTextPreviewAttributeNames) {
    const value = parsed.get(name);
    if (!value) continue;
    attrs[name] = decodeHtmlEntities(value);
  }

  return attrs;
};

const parseSanitizedRichTextPreviewHtml = (html: string) => {
  const root = { tag: "root", children: [] as RichTextPreviewNode[] };
  const stack: Array<{
    tag: string;
    attrs?: Record<string, string>;
    children: RichTextPreviewNode[];
  }> = [root];

  for (const token of tokenizeHtml(html)) {
    if (token.kind === "text") {
      if (token.value) appendRichTextPreviewNode(stack, decodeHtmlEntities(token.value));
      continue;
    }

    if (token.kind !== "tag" || !allowedTagSet.has(token.name)) continue;

    if (token.closing) {
      for (let stackIndex = stack.length - 1; stackIndex > 0; stackIndex -= 1) {
        const current = stack[stackIndex];
        if (current?.tag !== token.name) continue;
        stack.splice(stackIndex);
        appendRichTextPreviewNode(stack, {
          tag: current.tag,
          attrs: current.attrs ?? {},
          children: current.children,
        });
        break;
      }
      continue;
    }

    const attrs = parseRichTextPreviewAttributes(token.rawAttrs);
    if (selfClosingTagSet.has(token.name) || token.selfClosing) {
      appendRichTextPreviewNode(stack, { tag: token.name, attrs, children: [] });
      continue;
    }

    stack.push({ tag: token.name, attrs, children: [] });
  }

  for (let stackIndex = stack.length - 1; stackIndex > 0; stackIndex -= 1) {
    const current = stack[stackIndex];
    if (!current) continue;
    stack.splice(stackIndex);
    appendRichTextPreviewNode(stack, {
      tag: current.tag,
      attrs: current.attrs ?? {},
      children: current.children,
    });
  }

  return root.children;
};

const renderRichTextPreviewNode = (node: RichTextPreviewNode, key: string): ReactNode => {
  if (typeof node === "string") return node;
  return createElement(
    node.tag,
    { key, ...node.attrs },
    ...node.children.map((child, index) => renderRichTextPreviewNode(child, `${key}-${index}`))
  );
};

export function renderRichTextSectionHtmlPreview(value: string | undefined): ReactNode[] {
  const sanitized = sanitizeRichTextHtml(value);
  return parseSanitizedRichTextPreviewHtml(sanitized).map((node, index) =>
    renderRichTextPreviewNode(node, `rich-text-preview-${index}`)
  );
}

const normalizeRichTextPublicMediaSrc = (value: unknown) => {
  const href = normalizeWidgetSafeHref(value, { allowRelative: true, allowHttp: true });
  if (!href || href.startsWith("#")) return undefined;
  return href;
};

const normalizeRichTextMediaHref = (value: unknown) =>
  normalizeWidgetSafeHref(value, { allowRelative: true, allowHttp: true });

const normalizeAllowedRichTextEmbedUrl = (
  value: unknown
): { provider: RichTextSectionEmbedProvider; url: string } | null => {
  const href = normalizeWidgetSafeHref(value, { allowHttp: true });
  if (!href) return null;

  try {
    const parsed = new URL(href);
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    ) {
      return { provider: "youtube", url: href };
    }
    if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
      return { provider: "vimeo", url: href };
    }
    return { provider: "external-link", url: href };
  } catch {
    return null;
  }
};

export const normalizeRichTextBlockCount = (value: number) => {
  if (!Number.isFinite(value)) return richTextSectionDefaults.body?.blocks?.length ?? 0;
  return Math.min(richTextBlockMax, Math.max(richTextBlockMin, Math.floor(value)));
};

function normalizeRichTextTextBlock(
  base: RichTextSectionBlock,
  id: string
): RichTextSectionTextBlock {
  return {
    id,
    kind: "text",
    heading: clampOptionalText(
      "heading" in base ? base.heading : undefined,
      richTextHeadingMaxLength
    ),
    headingLevel: resolveRichTextBlockHeadingLevel(
      "headingLevel" in base ? base.headingLevel : undefined
    ),
    content: clampOptionalHtml("content" in base ? base.content : undefined, richTextTextMaxLength),
    contentHtml: clampOptionalHtml(
      "contentHtml" in base ? base.contentHtml : undefined,
      richTextHtmlMaxLength
    ),
  };
}

function normalizeRichTextImageBlock(
  base: RichTextSectionBlock,
  id: string
): RichTextSectionImageBlock {
  return {
    id,
    kind: "image",
    mediaId: clampOptionalId("mediaId" in base ? base.mediaId : undefined),
    src: normalizeRichTextPublicMediaSrc("src" in base ? base.src : undefined),
    alt: clampOptionalText("alt" in base ? base.alt : undefined, richTextLabelMaxLength),
    decorative: "decorative" in base ? Boolean(base.decorative) : false,
    caption: clampOptionalText(
      "caption" in base ? base.caption : undefined,
      richTextCaptionMaxLength
    ),
    href: normalizeRichTextMediaHref("href" in base ? base.href : undefined),
    width: resolveRichTextMediaWidth("width" in base ? base.width : undefined),
    align: resolveRichTextMediaAlign("align" in base ? base.align : undefined),
  };
}

function normalizeRichTextAttachmentBlock(
  base: RichTextSectionBlock,
  id: string
): RichTextSectionAttachmentBlock {
  return {
    id,
    kind: "attachment",
    mediaId: clampOptionalId("mediaId" in base ? base.mediaId : undefined),
    src: normalizeRichTextPublicMediaSrc("src" in base ? base.src : undefined),
    label: clampOptionalText("label" in base ? base.label : undefined, richTextLabelMaxLength),
    description: clampOptionalText(
      "description" in base ? base.description : undefined,
      richTextDescriptionMaxLength
    ),
    mimeType: clampOptionalText(
      "mimeType" in base ? base.mimeType : undefined,
      richTextMimeTypeMaxLength
    ),
    sizeLabel: clampOptionalText(
      "sizeLabel" in base ? base.sizeLabel : undefined,
      richTextSizeLabelMaxLength
    ),
  };
}

function normalizeRichTextEmbedBlock(
  base: RichTextSectionBlock,
  id: string
): RichTextSectionEmbedBlock {
  const normalizedUrl = normalizeAllowedRichTextEmbedUrl("url" in base ? base.url : undefined);

  return {
    id,
    kind: "embed",
    provider:
      normalizedUrl?.provider ??
      ("provider" in base ? base.provider : undefined) ??
      "external-link",
    url: normalizedUrl?.url,
    title: clampOptionalText("title" in base ? base.title : undefined, richTextLabelMaxLength),
    aspectRatio: resolveRichTextEmbedAspectRatio(
      "aspectRatio" in base ? base.aspectRatio : undefined
    ),
    renderMode: "link-card",
  };
}

export function normalizeRichTextBlocks(
  blocks: RichTextSectionBlock[] | undefined,
  desiredCount?: number
): RichTextSectionBlock[] {
  const source = Array.isArray(blocks) ? blocks : [];
  const targetCount =
    typeof desiredCount === "number"
      ? normalizeRichTextBlockCount(desiredCount)
      : normalizeRichTextBlockCount(source.length);

  const normalized: RichTextSectionBlock[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};
    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createBlockId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`block-${candidate}`)) {
        candidate += 1;
      }
      id = `block-${candidate}`;
    }
    usedIds.add(id);

    const kind =
      base.kind === "image" || base.kind === "attachment" || base.kind === "embed"
        ? base.kind
        : "text";

    normalized.push(
      kind === "image"
        ? normalizeRichTextImageBlock(base, id)
        : kind === "attachment"
          ? normalizeRichTextAttachmentBlock(base, id)
          : kind === "embed"
            ? normalizeRichTextEmbedBlock(base, id)
            : normalizeRichTextTextBlock(base, id)
    );
  }

  return normalized;
}

const resolveRichTextImageClassName = (block: RichTextSectionImageBlock) => {
  const widthClass =
    block.width === "full"
      ? "w-full"
      : block.width === "wide"
        ? "max-w-4xl w-full"
        : "max-w-2xl w-full";
  const alignClass =
    block.align === "left" ? "mr-auto ml-0" : block.align === "right" ? "ml-auto mr-0" : "mx-auto";
  return joinClasses(
    "overflow-hidden rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-bg)]/60",
    widthClass,
    alignClass
  );
};

const renderRichTextImageBlockAsHtml = (block: RichTextSectionImageBlock) => {
  const src = normalizeRichTextPublicMediaSrc(block.src);
  if (!src) return "";

  const imageHtml = `<img src="${escapeHtml(src)}" alt="${escapeHtml(block.decorative ? "" : (block.alt ?? ""))}" loading="lazy" class="h-auto w-full object-cover" />`;
  const linkAttrs = resolveWidgetLinkAttrs(block.href, {
    allowRelative: true,
    allowHttp: true,
    openExternalInNewTab: true,
  });
  const wrappedImage = linkAttrs
    ? `<a href="${escapeHtml(linkAttrs.href)}"${linkAttrs.target ? ` target="${linkAttrs.target}"` : ""}${linkAttrs.rel ? ` rel="${escapeHtml(linkAttrs.rel)}"` : ""}>${imageHtml}</a>`
    : imageHtml;
  const caption = block.caption?.trim();

  return [
    `<figure class="${resolveRichTextImageClassName(block)}">`,
    wrappedImage,
    caption
      ? `<figcaption class="border-t border-[var(--color-border)]/60 px-4 py-3 text-sm text-[var(--color-text)]/75">${escapeHtml(caption)}</figcaption>`
      : "",
    "</figure>",
  ].join("");
};

const renderRichTextAttachmentBlockAsHtml = (block: RichTextSectionAttachmentBlock) => {
  const src = normalizeRichTextPublicMediaSrc(block.src);
  if (!src) return "";

  const linkAttrs = resolveWidgetLinkAttrs(src, {
    allowRelative: true,
    allowHttp: true,
    openExternalInNewTab: true,
  });
  if (!linkAttrs) return "";

  const label = block.label?.trim() || "Download attachment";
  const metaParts = [block.mimeType?.trim(), block.sizeLabel?.trim()].filter(Boolean);

  return [
    '<div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-4">',
    `<a href="${escapeHtml(linkAttrs.href)}"${linkAttrs.target ? ` target="${linkAttrs.target}"` : ""}${linkAttrs.rel ? ` rel="${escapeHtml(linkAttrs.rel)}"` : ""} class="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-text)] underline-offset-4 hover:underline">`,
    escapeHtml(label),
    "</a>",
    block.description?.trim()
      ? `<p class="mt-2 text-sm text-[var(--color-text)]/75">${escapeHtml(block.description.trim())}</p>`
      : "",
    metaParts.length > 0
      ? `<p class="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--color-text)]/55">${escapeHtml(metaParts.join(" • "))}</p>`
      : "",
    "</div>",
  ].join("");
};

const renderRichTextEmbedBlockAsHtml = (block: RichTextSectionEmbedBlock) => {
  const normalizedUrl = normalizeAllowedRichTextEmbedUrl(block.url);
  if (!normalizedUrl) return "";

  const linkAttrs = resolveWidgetLinkAttrs(normalizedUrl.url, {
    allowHttp: true,
    openExternalInNewTab: true,
  });
  if (!linkAttrs) return "";

  const providerLabel =
    normalizedUrl.provider === "youtube"
      ? "YouTube"
      : normalizedUrl.provider === "vimeo"
        ? "Vimeo"
        : "External link";
  const title = block.title?.trim() || providerLabel;

  return [
    '<div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-4">',
    `<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)]/55">${escapeHtml(providerLabel)}</p>`,
    `<a href="${escapeHtml(linkAttrs.href)}"${linkAttrs.target ? ` target="${linkAttrs.target}"` : ""}${linkAttrs.rel ? ` rel="${escapeHtml(linkAttrs.rel)}"` : ""} class="mt-2 inline-flex items-center gap-2 text-base font-semibold text-[var(--color-text)] underline-offset-4 hover:underline">${escapeHtml(title)}</a>`,
    `<p class="mt-2 text-sm text-[var(--color-text)]/75">${escapeHtml(normalizedUrl.url)}</p>`,
    "</div>",
  ].join("");
};

const renderRichTextTextBlockAsHtml = (block: RichTextSectionTextBlock) => {
  const heading = block.heading?.trim();
  const headingLevel = resolveRichTextBlockHeadingLevel(block.headingLevel);
  const contentHtml = sanitizeRichTextHtml(block.contentHtml);
  const legacyContent = block.content?.trim();
  const body =
    contentHtml.length > 0
      ? contentHtml
      : legacyContent
        ? `<p>${escapeHtml(legacyContent).replace(/\n/g, "<br />")}</p>`
        : "";

  return [heading ? `<h${headingLevel}>${escapeHtml(heading)}</h${headingLevel}>` : "", body].join(
    ""
  );
};

const renderBlocksAsHtml = (blocks: RichTextSectionBlock[] | undefined) => {
  const normalizedBlocks = normalizeRichTextBlocks(blocks);
  return normalizedBlocks
    .map((block) => {
      if (block.kind === "image") return renderRichTextImageBlockAsHtml(block);
      if (block.kind === "attachment") return renderRichTextAttachmentBlockAsHtml(block);
      if (block.kind === "embed") return renderRichTextEmbedBlockAsHtml(block);
      return renderRichTextTextBlockAsHtml(block);
    })
    .join("");
};

const injectHeadingAnchors = (html: string, rootInstanceId: string) => {
  const items: TocItem[] = [];
  const usedIds = new Set<string>();
  let headingIndex = 0;

  const htmlWithAnchors = html.replace(
    /<h([2-4])>([\s\S]*?)<\/h\1>/gi,
    (_, rawLevel: string, rawContent: string) => {
      const level = Number(rawLevel) as 2 | 3 | 4;
      const label = extractHeadingText(rawContent);
      if (label.length === 0) {
        headingIndex += 1;
        return `<h${level}>${rawContent}</h${level}>`;
      }

      const slug = slugifyHeading(label, headingIndex);
      let id = scopedId(rootInstanceId, `heading-${slug}`);
      while (usedIds.has(id)) {
        headingIndex += 1;
        id = scopedId(rootInstanceId, `heading-${slug}-${headingIndex + 1}`);
      }
      usedIds.add(id);
      headingIndex += 1;
      items.push({ id, label, level });
      return `<h${level} id="${id}">${rawContent}</h${level}>`;
    }
  );

  return { htmlWithAnchors, tocItems: items };
};

export function normalizeRichTextSectionData(data: RichTextSectionData): RichTextSectionData {
  const titleDefaults = richTextSectionDefaults.titleBlock ?? {
    eyebrow: "",
    title: "",
    headingLevel: 2,
  };
  const optionsDefaults = richTextSectionDefaults.options ?? {
    dropcap: false,
    toc: false,
    maxWidth: "lg",
    outputMode: "blocks-fallback",
  };
  const styleDefaults = richTextSectionDefaults.style ?? {
    fontScale: "md",
    lineHeight: "normal",
    textColor: "var(--color-text)",
    background: "transparent",
    spacing: "md",
  };
  const hasStyleObject = data.style !== undefined;

  return {
    ...data,
    titleBlock: {
      eyebrow: resolveString(data.titleBlock?.eyebrow, titleDefaults.eyebrow ?? ""),
      title: resolveString(data.titleBlock?.title, titleDefaults.title ?? ""),
      headingLevel: resolveRichTextTitleHeadingLevel(data.titleBlock?.headingLevel),
    },
    body: {
      html: resolveString(
        clampStoredHtml(data.body?.html, richTextHtmlMaxLength),
        richTextSectionDefaults.body?.html ??
          "<p>Use this section for longer editorial content.</p>"
      ),
      blocks: normalizeRichTextBlocks(data.body?.blocks),
    },
    options: {
      dropcap:
        typeof data.options?.dropcap === "boolean"
          ? data.options.dropcap
          : Boolean(optionsDefaults.dropcap),
      toc: typeof data.options?.toc === "boolean" ? data.options.toc : Boolean(optionsDefaults.toc),
      maxWidth: resolveRichTextMaxWidth(data.options?.maxWidth),
      outputMode: resolveRichTextOutputMode(data.options?.outputMode),
    },
    style: {
      fontScale: resolveRichTextFontScale(data.style?.fontScale),
      lineHeight: resolveRichTextLineHeight(data.style?.lineHeight),
      textColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.textColor)
        : styleDefaults.textColor,
      background: hasStyleObject
        ? resolveClearableStyleValue(data.style?.background)
        : styleDefaults.background,
      spacing: resolveRichTextSpacing(data.style?.spacing),
    },
  };
}

export function resolveRichTextRenderedSource(
  data: RichTextSectionData
): RichTextRenderedSourceState {
  const normalized = normalizeRichTextSectionData(data);
  const mode = normalized.options?.outputMode ?? "blocks-fallback";
  const hasHtml = (normalized.body?.html ?? "").trim().length > 0;
  const hasBlocks = normalizeRichTextBlocks(normalized.body?.blocks).length > 0;

  if (mode === "html") {
    return {
      mode,
      renderedSource: "html",
      htmlIsActive: true,
      blocksAreActive: false,
      hasHtml,
      hasBlocks,
      reason: "html-only",
    };
  }

  if (mode === "blocks") {
    return {
      mode,
      renderedSource: "blocks",
      htmlIsActive: false,
      blocksAreActive: true,
      hasHtml,
      hasBlocks,
      reason: "blocks-only",
    };
  }

  return {
    mode,
    renderedSource: hasHtml ? "html" : "blocks",
    htmlIsActive: hasHtml,
    blocksAreActive: !hasHtml,
    hasHtml,
    hasBlocks,
    reason: hasHtml ? "fallback-html-present" : "fallback-html-empty",
  };
}

export function resolveRichTextRenderedHtml(data: RichTextSectionData): string {
  const normalized = normalizeRichTextSectionData(data);
  const source = resolveRichTextRenderedSource(normalized);
  if (source.renderedSource === "html") {
    return sanitizeRichTextHtml(normalized.body?.html ?? "");
  }
  return renderBlocksAsHtml(normalized.body?.blocks);
}

export function resolveRichTextDropcapStatus(data: RichTextSectionData) {
  const normalized = normalizeRichTextSectionData(data);
  const source = resolveRichTextRenderedSource(normalized);
  const html = resolveRichTextRenderedHtml(normalized);
  return {
    enabled: Boolean(normalized.options?.dropcap),
    applies: /<p(?:\s|>)/i.test(html),
    source: source.renderedSource,
    reason: source.reason,
  };
}

function RichTextToc({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
      aria-label="Table of contents"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/70">
        On this page
      </p>
      <ol className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className={item.level > 2 ? "pl-3" : ""}>
            <a
              href={`#${item.id}`}
              className="text-[var(--color-text)]/80 transition hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function RichTextSectionBlock({
  data,
  variant,
  blockId,
}: {
  data: RichTextSectionData;
  variant: string;
  blockId?: string;
}) {
  const resolvedVariant = resolveRichTextSectionVariant(variant);
  const normalized = normalizeRichTextSectionData(data);
  const style = normalized.style ?? richTextSectionDefaults.style!;
  const options = normalized.options ?? richTextSectionDefaults.options!;
  const source = resolveRichTextRenderedSource(normalized);
  const renderedHtml = resolveRichTextRenderedHtml(normalized);
  const rootInstanceId = createWidgetInstanceId(
    "rich-text-section",
    blockId,
    (normalized.titleBlock?.title ?? "").trim() || resolvedVariant
  );
  const { htmlWithAnchors, tocItems } = injectHeadingAnchors(renderedHtml, rootInstanceId);

  const bodyClassName = joinClasses(
    fontScaleClassMap[style.fontScale ?? "md"],
    lineHeightClassMap[style.lineHeight ?? "normal"],
    spacingClassMap[style.spacing ?? "md"],
    options.dropcap
      ? "[&>p:first-of-type:first-letter]:mr-2 [&>p:first-of-type:first-letter]:float-left [&>p:first-of-type:first-letter]:text-4xl [&>p:first-of-type:first-letter]:font-semibold [&>p:first-of-type:first-letter]:leading-none"
      : undefined
  );

  const bodyStyle: CSSProperties = {
    color: resolveClearableStyleValue(style.textColor) ?? "var(--color-text)",
  };

  const sectionStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.background),
    }) ?? {};

  const titleText = (normalized.titleBlock?.title ?? "").trim();
  const showTitleBlock =
    (normalized.titleBlock?.eyebrow ?? "").trim().length > 0 || titleText.length > 0;
  const titleId = titleText.length > 0 ? scopedId(rootInstanceId, "title") : undefined;
  const HeadingTag = `h${resolveRichTextTitleHeadingLevel(normalized.titleBlock?.headingLevel)}` as
    | "h1"
    | "h2"
    | "h3";

  const content = (
    <div
      className={bodyClassName}
      style={bodyStyle}
      dangerouslySetInnerHTML={{ __html: htmlWithAnchors }}
    />
  );

  return (
    <section
      className="w-full px-4 py-10"
      style={sectionStyle}
      aria-labelledby={titleId}
      aria-label={titleId ? undefined : "Rich text content"}
      data-rich-text-variant={resolvedVariant}
      data-rich-text-font-scale={style.fontScale ?? "md"}
      data-rich-text-line-height={style.lineHeight ?? "normal"}
      data-rich-text-spacing={style.spacing ?? "md"}
      data-rich-text-dropcap={String(Boolean(options.dropcap))}
      data-rich-text-toc={String(Boolean(options.toc))}
      data-rich-text-max-width={options.maxWidth ?? "lg"}
      data-rich-text-output-mode={options.outputMode ?? "blocks-fallback"}
      data-rich-text-rendered-source={source.renderedSource}
      data-rich-text-title-level={String(
        resolveRichTextTitleHeadingLevel(normalized.titleBlock?.headingLevel)
      )}
      data-rich-text-toc-count={String(tocItems.length)}
    >
      <div className="mx-auto w-full">
        {showTitleBlock ? (
          <header
            className={joinClasses("mb-6 space-y-2", maxWidthClassMap[options.maxWidth ?? "lg"])}
          >
            {(normalized.titleBlock?.eyebrow ?? "").trim().length > 0 ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/65">
                {normalized.titleBlock?.eyebrow}
              </p>
            ) : null}
            {titleText.length > 0 ? (
              <HeadingTag id={titleId} className="text-3xl font-semibold text-[var(--color-text)]">
                {titleText}
              </HeadingTag>
            ) : null}
          </header>
        ) : null}

        {resolvedVariant === "two-column" ? (
          <div
            className={joinClasses(
              "mx-auto grid w-full grid-cols-1 gap-6 lg:grid-cols-3",
              maxWidthClassMap[options.maxWidth ?? "lg"]
            )}
          >
            <div className="space-y-4 lg:col-span-1">
              {Boolean(options.toc) ? <RichTextToc items={tocItems} /> : null}
            </div>
            <div className="lg:col-span-2">{content}</div>
          </div>
        ) : resolvedVariant === "article" ? (
          <article
            className={joinClasses(
              "mx-auto w-full space-y-6",
              maxWidthClassMap[options.maxWidth ?? "lg"]
            )}
          >
            {Boolean(options.toc) ? <RichTextToc items={tocItems} /> : null}
            {content}
          </article>
        ) : (
          <div
            className={joinClasses(
              "mx-auto w-full space-y-6",
              maxWidthClassMap[options.maxWidth ?? "lg"]
            )}
          >
            {Boolean(options.toc) ? <RichTextToc items={tocItems} /> : null}
            {content}
          </div>
        )}
      </div>
    </section>
  );
}

export function createRichTextSectionWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<RichTextSectionData>>;
  visual: ComponentType<WidgetEditorProps<RichTextSectionData>>;
  advanced: ComponentType<WidgetEditorProps<RichTextSectionData>>;
}): WidgetDefinition<RichTextSectionData> {
  return {
    type: "rich-text-section",
    title: "Rich Text Section",
    description:
      "Long-form copy block with safe HTML rendering, rich fallback blocks, and editorial layout controls.",
    category: "content",
    variants: [
      {
        id: "single-column",
        label: "Single Column",
        description: "Default long-form body in one readable column.",
      },
      {
        id: "two-column",
        label: "Two Column",
        description: "Split layout with optional table of contents.",
      },
      {
        id: "article",
        label: "Article",
        description: "Editorial presentation focused on narrative reading.",
      },
    ],
    schema: richTextSectionSchema,
    defaults: richTextSectionDefaults,
    editor: editors,
    editorContract: richTextSectionEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: RichTextSectionBlock,
  };
}
