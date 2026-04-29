import type { CSSProperties, ComponentType } from "react";

import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  htmlToPlainText,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
} from "../../services/posts/editor/postRichTextHtmlUtils";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type RichTextSectionVariantId = "single-column" | "two-column" | "article";
export type RichTextSectionFontScale = "sm" | "md" | "lg";
export type RichTextSectionLineHeight = "tight" | "normal" | "relaxed";
export type RichTextSectionSpacing = "sm" | "md" | "lg";
export type RichTextSectionMaxWidth = "md" | "lg" | "xl" | "full";
export type RichTextSectionOutputMode = "html" | "blocks-fallback" | "blocks";

export type RichTextSectionBlock = {
  id?: string;
  heading?: string;
  content?: string;
};

export type RichTextSectionData = {
  titleBlock?: {
    eyebrow?: string;
    title?: string;
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
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

const lineHeightClassMap: Record<RichTextSectionLineHeight, string> = {
  tight: "leading-6",
  normal: "leading-7",
  relaxed: "leading-8",
};

const spacingClassMap: Record<RichTextSectionSpacing, string> = {
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
              heading: { type: "string" },
              content: { type: "string" },
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
        fontScale: { enum: ["sm", "md", "lg"] },
        lineHeight: { enum: ["tight", "normal", "relaxed"] },
        textColor: { type: "string" },
        background: { type: "string" },
        spacing: { enum: ["sm", "md", "lg"] },
      },
    },
  },
};

export const richTextSectionDefaults: RichTextSectionData = {
  titleBlock: {
    eyebrow: "Editorial",
    title: "Long-form content section",
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
        heading: "Clear structure for readable content",
        content:
          "Use this section for longer explanations, product narratives, or in-depth guides.",
      },
      {
        id: "block-2",
        heading: "What works best",
        content: "Meaningful headings\nActionable details\nSimple formatting",
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

const createBlockId = (index: number) => `block-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveRichTextFontScale = (
  value: string | undefined
): RichTextSectionFontScale => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveRichTextLineHeight = (
  value: string | undefined
): RichTextSectionLineHeight => {
  if (value === "tight" || value === "relaxed") return value;
  return "normal";
};

const resolveRichTextSpacing = (
  value: string | undefined
): RichTextSectionSpacing => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveRichTextMaxWidth = (
  value: string | undefined
): RichTextSectionMaxWidth => {
  if (value === "md" || value === "xl" || value === "full") return value;
  return "lg";
};

const resolveRichTextOutputMode = (
  value: string | undefined
): RichTextSectionOutputMode => {
  if (value === "html" || value === "blocks") return value;
  return "blocks-fallback";
};

export const resolveRichTextSectionVariant = (
  variant: string
): RichTextSectionVariantId => {
  if (variant === "two-column" || variant === "article") return variant;
  return "single-column";
};

const headingTextBlockTags = new Set(["h2", "h3", "h4", "span", "strong", "em"]);

const extractHeadingText = (value: string) =>
  htmlToPlainText(value, headingTextBlockTags);

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

const parseAttributes = (rawAttrs: string) => {
  return parseHtmlAttributes(rawAttrs);
};

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

export function sanitizeRichTextHtml(rawHtml: string | undefined): string {
  if (typeof rawHtml !== "string" || rawHtml.trim().length === 0) return "";

  return sanitizeHtmlWithPolicy(rawHtml, {
    allowedTags: allowedTagSet,
    selfClosingTags: selfClosingTagSet,
    dropContentTags: dangerousHtmlContentTagSet,
    sanitizeAttributes: sanitizeTagAttributes,
  });
}

export const normalizeRichTextBlockCount = (value: number) => {
  if (!Number.isFinite(value)) return richTextSectionDefaults.body?.blocks?.length ?? 0;
  return Math.min(richTextBlockMax, Math.max(richTextBlockMin, Math.floor(value)));
};

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

    normalized.push({
      id,
      heading: resolveOptionalString(base.heading),
      content: resolveOptionalString(base.content),
    });
  }

  return normalized;
}

const renderBlocksAsHtml = (blocks: RichTextSectionBlock[] | undefined) => {
  const normalizedBlocks = normalizeRichTextBlocks(blocks);
  return normalizedBlocks
    .map((block) => {
      const heading =
        typeof block.heading === "string" && block.heading.trim().length > 0
          ? `<h3>${escapeHtml(block.heading.trim())}</h3>`
          : "";

      const content =
        typeof block.content === "string" && block.content.trim().length > 0
          ? `<p>${escapeHtml(block.content.trim()).replace(/\n/g, "<br />")}</p>`
          : "";

      return `${heading}${content}`;
    })
    .join("");
};

const injectHeadingAnchors = (html: string) => {
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

      let id = slugifyHeading(label, headingIndex);
      while (usedIds.has(id)) {
        headingIndex += 1;
        id = `${slugifyHeading(label, headingIndex)}-${headingIndex + 1}`;
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

  return {
    ...data,
    titleBlock: {
      eyebrow: resolveString(data.titleBlock?.eyebrow, titleDefaults.eyebrow ?? ""),
      title: resolveString(data.titleBlock?.title, titleDefaults.title ?? ""),
    },
    body: {
      html: resolveString(
        data.body?.html,
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
      toc:
        typeof data.options?.toc === "boolean"
          ? data.options.toc
          : Boolean(optionsDefaults.toc),
      maxWidth: resolveRichTextMaxWidth(data.options?.maxWidth),
      outputMode: resolveRichTextOutputMode(data.options?.outputMode),
    },
    style: {
      fontScale: resolveRichTextFontScale(data.style?.fontScale),
      lineHeight: resolveRichTextLineHeight(data.style?.lineHeight),
      textColor: resolveString(
        data.style?.textColor,
        styleDefaults.textColor ?? "var(--color-text)"
      ),
      background: resolveString(
        data.style?.background,
        styleDefaults.background ?? "transparent"
      ),
      spacing: resolveRichTextSpacing(data.style?.spacing),
    },
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
              className="text-[var(--color-text)]/80 transition hover:text-[var(--color-text)]"
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
}: {
  data: RichTextSectionData;
  variant: string;
}) {
  const resolvedVariant = resolveRichTextSectionVariant(variant);
  const normalized = normalizeRichTextSectionData(data);
  const style = normalized.style ?? richTextSectionDefaults.style!;
  const options = normalized.options ?? richTextSectionDefaults.options!;

  const blocksHtml = renderBlocksAsHtml(normalized.body?.blocks);
  const rawHtml =
    options.outputMode === "html"
      ? normalized.body?.html ?? ""
      : options.outputMode === "blocks"
        ? blocksHtml
        : (normalized.body?.html ?? "").trim().length > 0
          ? normalized.body?.html ?? ""
          : blocksHtml;

  const sanitizedHtml = sanitizeRichTextHtml(rawHtml);
  const { htmlWithAnchors, tocItems } = injectHeadingAnchors(sanitizedHtml);

  const bodyClassName = joinClasses(
    fontScaleClassMap[style.fontScale ?? "md"],
    lineHeightClassMap[style.lineHeight ?? "normal"],
    spacingClassMap[style.spacing ?? "md"],
    options.dropcap
      ? "[&>p:first-of-type:first-letter]:mr-2 [&>p:first-of-type:first-letter]:float-left [&>p:first-of-type:first-letter]:text-4xl [&>p:first-of-type:first-letter]:font-semibold [&>p:first-of-type:first-letter]:leading-none"
      : undefined
  );

  const bodyStyle: CSSProperties = {
    color: style.textColor ?? "var(--color-text)",
  };

  const sectionStyle: CSSProperties = {
    backgroundColor: style.background ?? "transparent",
  };

  const showTitleBlock =
    (normalized.titleBlock?.eyebrow ?? "").trim().length > 0 ||
    (normalized.titleBlock?.title ?? "").trim().length > 0;

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
      data-rich-text-variant={resolvedVariant}
      data-rich-text-font-scale={style.fontScale ?? "md"}
      data-rich-text-line-height={style.lineHeight ?? "normal"}
      data-rich-text-spacing={style.spacing ?? "md"}
      data-rich-text-dropcap={String(Boolean(options.dropcap))}
      data-rich-text-toc={String(Boolean(options.toc))}
      data-rich-text-max-width={options.maxWidth ?? "lg"}
      data-rich-text-output-mode={options.outputMode ?? "blocks-fallback"}
      data-rich-text-toc-count={String(tocItems.length)}
    >
      <div className={joinClasses("mx-auto w-full", maxWidthClassMap[options.maxWidth ?? "lg"])}>
        {showTitleBlock ? (
          <header className="mb-6 space-y-2">
            {(normalized.titleBlock?.eyebrow ?? "").trim().length > 0 ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/65">
                {normalized.titleBlock?.eyebrow}
              </p>
            ) : null}
            {(normalized.titleBlock?.title ?? "").trim().length > 0 ? (
              <h3 className="text-3xl font-semibold text-[var(--color-text)]">
                {normalized.titleBlock?.title}
              </h3>
            ) : null}
          </header>
        ) : null}

        {resolvedVariant === "two-column" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              {Boolean(options.toc) ? <RichTextToc items={tocItems} /> : null}
            </div>
            <div className="lg:col-span-2">{content}</div>
          </div>
        ) : resolvedVariant === "article" ? (
          <article className="mx-auto w-full max-w-3xl space-y-6">
            {Boolean(options.toc) ? <RichTextToc items={tocItems} /> : null}
            {content}
          </article>
        ) : (
          <div className="space-y-6">
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
    description: "Long-form copy block with safe HTML rendering and typography controls.",
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
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: RichTextSectionBlock,
  };
}
