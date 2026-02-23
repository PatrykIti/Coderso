import type {
  PostRuntimeMappedBlock,
  PostRuntimeMappedDocument,
  RuntimeWritingCanvasNode,
} from "./postBlockRuntimeMapper";
import { postRichTextToPlainText } from "../editor/postRichTextSerializer";
import { buildPostImageLayoutClasses } from "../postImageWrapLayout";

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

const alignClass: Record<PostRuntimeMappedBlock["layout"]["align"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const widthClass: Record<PostRuntimeMappedBlock["layout"]["width"], string> = {
  auto: "max-w-none",
  narrow: "mx-auto max-w-2xl",
  wide: "mx-auto max-w-4xl",
  full: "max-w-none",
};

const spacingTopClass: Record<PostRuntimeMappedBlock["layout"]["spacingTop"], string> = {
  none: "pt-0",
  sm: "pt-2",
  md: "pt-4",
  lg: "pt-8",
};

const spacingBottomClass: Record<PostRuntimeMappedBlock["layout"]["spacingBottom"], string> = {
  none: "pb-0",
  sm: "pb-2",
  md: "pb-4",
  lg: "pb-8",
};

const textScaleClass: Record<PostRuntimeMappedBlock["layout"]["textScale"], string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const calloutToneClass = {
  info: "border-sky-300/70 bg-sky-100/40 text-sky-900",
  success: "border-emerald-300/70 bg-emerald-100/40 text-emerald-900",
  warning: "border-amber-300/70 bg-amber-100/40 text-amber-900",
  danger: "border-rose-300/70 bg-rose-100/40 text-rose-900",
  neutral: "border-slate-300/70 bg-slate-100/40 text-slate-900",
} as const;

const buttonVariantClass = {
  primary: "bg-[var(--color-primary)] text-white hover:opacity-90",
  secondary: "bg-[var(--color-surface)] text-[var(--color-text)] ring-1 ring-[var(--color-border)]",
  ghost: "bg-transparent text-[var(--color-text)] ring-1 ring-[var(--color-border)]",
  link: "bg-transparent px-0 text-[var(--color-primary)] underline-offset-2 hover:underline",
} as const;

const buttonSizeClass = {
  sm: "min-h-8 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
} as const;

const embedAspectPaddingTop = {
  "16:9": "56.25%",
  "4:3": "75%",
  "1:1": "100%",
} as const;

type PostBlockRuntimeRendererProps = {
  document: PostRuntimeMappedDocument;
  className?: string;
};

const renderHeadingBlock = (block: PostRuntimeMappedBlock) => {
  const level = block.content.headingLevel ?? 2;
  const text = postRichTextToPlainText(block.content.html ?? "");

  if (level === 2) {
    return (
      <h2 className={cx("font-semibold leading-tight", textScaleClass[block.layout.textScale])}>
        {text}
      </h2>
    );
  }
  if (level === 3) {
    return (
      <h3 className={cx("font-semibold leading-tight", textScaleClass[block.layout.textScale])}>
        {text}
      </h3>
    );
  }
  if (level === 4) {
    return (
      <h4 className={cx("font-semibold leading-tight", textScaleClass[block.layout.textScale])}>
        {text}
      </h4>
    );
  }
  if (level === 5) {
    return (
      <h5 className={cx("font-semibold leading-tight", textScaleClass[block.layout.textScale])}>
        {text}
      </h5>
    );
  }
  return (
    <h6 className={cx("font-semibold leading-tight", textScaleClass[block.layout.textScale])}>
      {text}
    </h6>
  );
};

const renderWritingHeadingNode = (
  level: 1 | 2 | 3 | 4 | 5 | 6,
  html: string,
  className: string
) => {
  if (level === 1) {
    return <h1 className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (level === 2) {
    return <h2 className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (level === 3) {
    return <h3 className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (level === 4) {
    return <h4 className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (level === 5) {
    return <h5 className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <h6 className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

const renderWritingCanvasNode = (
  block: PostRuntimeMappedBlock,
  node: RuntimeWritingCanvasNode
) => {
  if (node.type === "paragraph") {
    return (
      <div
        key={node.id}
        className={cx("post-runtime-richtext leading-7", textScaleClass[block.layout.textScale])}
        dangerouslySetInnerHTML={{ __html: node.html }}
      />
    );
  }

  if (node.type === "heading") {
    return (
      <div key={node.id}>
        {renderWritingHeadingNode(
          node.level,
          node.html,
          cx("font-semibold leading-tight", textScaleClass[block.layout.textScale])
        )}
      </div>
    );
  }

  if (node.type === "quote") {
    return (
      <blockquote
        key={node.id}
        className={cx(
          "rounded-r-lg border-l-4 border-[var(--color-primary)]/60 pl-4 italic",
          textScaleClass[block.layout.textScale]
        )}
        dangerouslySetInnerHTML={{ __html: node.html }}
      />
    );
  }

  if (node.type === "list") {
    const ListTag = node.ordered ? "ol" : "ul";
    return (
      <ListTag
        key={node.id}
        className={cx(
          "space-y-2 pl-6",
          node.ordered ? "list-decimal" : "list-disc",
          textScaleClass[block.layout.textScale]
        )}
      >
        {node.items.map((item, index) => (
          <li key={`${node.id}-${index}`} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ListTag>
    );
  }

  if (!node.src) {
    return null;
  }

  const layoutClasses = buildPostImageLayoutClasses({
    wrap: node.wrap,
    widthPercent: node.widthPercent,
    marginPreset: node.marginPreset,
  });

  return (
    <figure key={node.id} className={cx("space-y-2", layoutClasses)}>
      <img
        src={node.src}
        alt={node.alt}
        loading="lazy"
        className="post-runtime-image h-auto w-full rounded-lg border object-cover"
      />
      {node.caption ? (
        <figcaption className="text-sm text-muted-foreground">{node.caption}</figcaption>
      ) : null}
    </figure>
  );
};

const renderBlockContent = (block: PostRuntimeMappedBlock) => {
  if (block.type === "writing-canvas") {
    const nodes = block.content.writingCanvas?.nodes ?? [];
    if (nodes.length === 0) return null;
    return (
      <div
        className={cx(
          "post-runtime-writing-canvas space-y-4",
          block.layout.highlight && "rounded-lg border border-amber-300/40 bg-amber-50/40 px-4 py-3"
        )}
      >
        {nodes.map((node) => renderWritingCanvasNode(block, node))}
      </div>
    );
  }

  if (block.type === "paragraph") {
    return (
      <div
        className={cx(
          "post-runtime-richtext leading-7",
          textScaleClass[block.layout.textScale],
          block.layout.highlight && "rounded-lg border border-amber-300/40 bg-amber-50/40 px-4 py-3"
        )}
        dangerouslySetInnerHTML={{ __html: block.content.html ?? "" }}
      />
    );
  }

  if (block.type === "heading") {
    return renderHeadingBlock(block);
  }

  if (block.type === "list") {
    const items = block.content.listItems ?? [];
    const ListTag = block.content.ordered ? "ol" : "ul";
    return (
      <ListTag
        className={cx(
          "space-y-2 pl-6",
          block.content.ordered ? "list-decimal" : "list-disc",
          textScaleClass[block.layout.textScale]
        )}
      >
        {items.map((item, index) => (
          <li key={`${block.id}-${index}`} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ListTag>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote
        className={cx(
          "rounded-r-lg border-l-4 border-[var(--color-primary)]/60 pl-4 italic",
          textScaleClass[block.layout.textScale],
          block.layout.highlight && "bg-[var(--color-surface)]/60 py-2 pr-3"
        )}
        dangerouslySetInnerHTML={{ __html: block.content.html ?? "" }}
      />
    );
  }

  if (block.type === "code") {
    return (
      <pre className="overflow-x-auto rounded-lg border bg-[var(--color-surface)] p-4 text-sm leading-6">
        <code data-language={block.content.language}>{block.content.code ?? ""}</code>
      </pre>
    );
  }

  if (block.type === "image") {
    const image = block.content.image;
    if (!image?.src) return null;
    const layoutClasses = buildPostImageLayoutClasses({
      wrap: image.wrap,
      widthPercent: image.widthPercent,
      marginPreset: image.marginPreset,
    });
    return (
      <figure className={cx("space-y-2", layoutClasses)}>
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          className="post-runtime-image h-auto w-full rounded-lg border object-cover"
        />
        {image.caption ? (
          <figcaption className="text-sm text-muted-foreground">{image.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === "separator") {
    const thickness = block.content.separatorThickness ?? 1;
    const borderStyle =
      block.content.separatorStyle === "dashed"
        ? "dashed"
        : block.content.separatorStyle === "dotted"
          ? "dotted"
          : "solid";
    return (
      <hr
        className="border-[var(--color-border)]"
        style={{ borderTopStyle: borderStyle, borderTopWidth: `${thickness}px` }}
      />
    );
  }

  if (block.type === "callout") {
    const tone = block.content.calloutTone ?? "info";
    return (
      <aside
        className={cx(
          "rounded-lg border px-4 py-3 leading-7",
          textScaleClass[block.layout.textScale],
          calloutToneClass[tone]
        )}
        dangerouslySetInnerHTML={{ __html: block.content.html ?? "" }}
      />
    );
  }

  if (block.type === "button") {
    const button = block.content.button;
    if (!button) return null;
    const classes = cx(
      "inline-flex items-center justify-center rounded-md font-medium transition",
      buttonVariantClass[button.variant],
      buttonSizeClass[button.size]
    );
    if (button.href === "#") {
      return <span className={classes}>{button.label}</span>;
    }
    return (
      <a
        href={button.href}
        className={classes}
        target={button.newTab ? "_blank" : undefined}
        rel={button.newTab ? "noopener noreferrer" : undefined}
      >
        {button.label}
      </a>
    );
  }

  if (block.type === "embed") {
    const embed = block.content.embed;
    if (!embed?.src) return null;
    return (
      <div className="overflow-hidden rounded-lg border bg-black/5">
        <div
          className="relative w-full"
          style={{ paddingTop: embedAspectPaddingTop[embed.aspect] }}
        >
          <iframe
            src={embed.src}
            loading={embed.lazy ? "lazy" : "eager"}
            title={`Embedded ${embed.provider} content`}
            className="absolute inset-0 h-full w-full border-0"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return null;
};

const renderBlock = (block: PostRuntimeMappedBlock) => {
  const blockContent = renderBlockContent(block);
  if (!blockContent) return null;
  return (
    <section
      key={block.id}
      id={block.layout.anchorId}
      className={cx(
        "post-runtime-block",
        alignClass[block.layout.align],
        widthClass[block.layout.width],
        spacingTopClass[block.layout.spacingTop],
        spacingBottomClass[block.layout.spacingBottom],
        block.layout.hideOnMobile && "max-md:hidden",
        block.layout.className
      )}
      data-post-block-type={block.type}
      data-post-block-id={block.id}
    >
      {blockContent}
    </section>
  );
};

export function PostBlockRuntimeRenderer({ document, className }: PostBlockRuntimeRendererProps) {
  if (!Array.isArray(document.blocks) || document.blocks.length === 0) {
    return null;
  }
  const runtimeWarnings = Array.isArray(document.warnings) ? document.warnings : [];
  return (
    <article
      className={cx("post-runtime-blocks mx-auto w-full max-w-4xl space-y-2", className)}
      data-post-runtime-warning-count={runtimeWarnings.length}
      data-post-runtime-warnings={
        runtimeWarnings.length > 0 ? runtimeWarnings.join(",") : undefined
      }
    >
      {document.blocks.map((block) => renderBlock(block))}
    </article>
  );
}
