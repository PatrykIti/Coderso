import type { CSSProperties, ReactNode } from "react";

import {
  resolvePageDocumentForBreakpoint,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
} from "../services/pages/pageDocumentV2";

export type PageTemplatePropsV2 = {
  title: string;
  templateKey: string;
  document: PageDocumentV2;
  isPreview?: boolean;
  previewDevice?: PageBreakpoint;
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const readText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const readNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const toHrefTarget = (value: unknown) => (value === "blank" ? "_blank" : undefined);

type PageSectionStyleProperties = CSSProperties & {
  "--coderso-section-accent"?: string;
};

const toSectionStyle = (section: PageSectionV2): PageSectionStyleProperties => ({
  "--coderso-section-accent": section.style.accent,
  backgroundColor: section.style.backgroundType === "color" ? section.style.background : undefined,
  backgroundImage:
    section.style.backgroundType === "image" && section.style.backgroundImage
      ? `url(${section.style.backgroundImage})`
      : undefined,
  borderRadius: `${section.style.radius}px`,
  boxShadow:
    section.style.shadow === "none"
      ? undefined
      : section.style.shadow === "sm"
        ? "0 6px 20px rgba(15, 23, 42, 0.08)"
        : section.style.shadow === "md"
          ? "0 14px 40px rgba(15, 23, 42, 0.12)"
          : "0 22px 60px rgba(15, 23, 42, 0.16)",
  padding: `${section.spacing.paddingTop}px ${section.spacing.paddingRight}px ${section.spacing.paddingBottom}px ${section.spacing.paddingLeft}px`,
  maxWidth: `${section.layout.maxWidth}px`,
  margin: "0 auto",
  gap: `${section.spacing.gap}px`,
});

const sectionGridClass = (columns: number) => {
  if (columns <= 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-1 md:grid-cols-2";
  if (columns === 3) return "grid-cols-1 md:grid-cols-3";
  return "grid-cols-1 md:grid-cols-4";
};

const alignmentClass = (align: PageSectionV2["layout"]["align"]) => {
  if (align === "center") return "items-center";
  if (align === "end") return "items-end";
  if (align === "stretch") return "items-stretch";
  return "items-start";
};

const justifyClass = (justify: PageSectionV2["layout"]["justify"]) => {
  if (justify === "center") return "justify-center";
  if (justify === "end") return "justify-end";
  if (justify === "between") return "justify-between";
  return "justify-start";
};

const textAlignClass = (value: unknown) => {
  if (value === "center") return "text-center";
  if (value === "right") return "text-right";
  return "text-left";
};

const renderHeading = (block: PageBlockV2) => {
  const text = readText(block.props.text, "Heading");
  const level = readText(block.props.level, "h2");
  const className = joinClasses(
    "font-semibold leading-tight text-slate-950",
    level === "h1" ? "text-5xl" : level === "h2" ? "text-4xl" : "text-2xl",
    textAlignClass(block.props.align)
  );

  if (level === "h1") return <h1 className={className}>{text}</h1>;
  if (level === "h3") return <h3 className={className}>{text}</h3>;
  if (level === "h4") return <h4 className={className}>{text}</h4>;
  if (level === "h5") return <h5 className={className}>{text}</h5>;
  if (level === "h6") return <h6 className={className}>{text}</h6>;
  return <h2 className={className}>{text}</h2>;
};

const renderImage = (block: PageBlockV2) => {
  const src = readText(block.props.src);
  const alt = readText(block.props.alt);
  const caption = readText(block.props.caption);
  if (!src) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        Image
      </div>
    );
  }
  return (
    <figure className="space-y-2">
      <img className="w-full rounded object-cover" src={src} alt={alt} loading="lazy" />
      {caption ? <figcaption className="text-sm text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
};

const renderList = (block: PageBlockV2) => {
  const items = Array.isArray(block.props.items) ? block.props.items : [];
  const children = items.map((item, index) => {
    const label = isListLinkItem(item) ? item.label : readText(item);
    const href = isListLinkItem(item) ? item.href : "";
    return (
      <li key={`${block.id}-${index}`}>
        {href ? (
          <a className="font-medium text-slate-800 underline-offset-4 hover:underline" href={href}>
            {label}
          </a>
        ) : (
          label
        )}
      </li>
    );
  });
  return readBoolean(block.props.ordered, false) ? (
    <ol className="list-decimal space-y-2 pl-6 text-slate-700">{children}</ol>
  ) : (
    <ul className="list-disc space-y-2 pl-6 text-slate-700">{children}</ul>
  );
};

const isListLinkItem = (value: unknown): value is { label: string; href: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { label?: unknown }).label === "string" &&
  typeof (value as { href?: unknown }).href === "string";

const renderBlock = (block: PageBlockV2): ReactNode => {
  if (!block.visibility.visible) return null;
  const style = block.style?.width === "full" ? "w-full" : undefined;

  switch (block.type) {
    case "heading":
      return <div className={style}>{renderHeading(block)}</div>;
    case "text":
      return (
        <p
          className={joinClasses(
            "text-base leading-7 text-slate-700",
            textAlignClass(block.props.align),
            style
          )}
        >
          {readText(block.props.text)}
        </p>
      );
    case "button": {
      const href = readText(block.props.href, "#");
      return (
        <a
          className={joinClasses(
            "inline-flex w-fit items-center justify-center rounded bg-[var(--coderso-section-accent,#0d9488)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90",
            style
          )}
          href={href}
          target={toHrefTarget(block.props.target)}
          rel={block.props.target === "blank" ? "noreferrer" : undefined}
        >
          {readText(block.props.label, "Learn more")}
        </a>
      );
    }
    case "image":
      return renderImage(block);
    case "video": {
      const src = readText(block.props.src);
      return src ? (
        <video
          className="w-full rounded"
          src={src}
          controls
          muted={readBoolean(block.props.muted, true)}
        />
      ) : (
        <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Video
        </div>
      );
    }
    case "list":
      return renderList(block);
    case "card":
      return (
        <article className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">
            {readText(block.props.title, "Card title")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{readText(block.props.text)}</p>
        </article>
      );
    case "divider":
      return (
        <hr
          className="border-slate-200"
          style={{ borderWidth: `${readNumber(block.props.thickness, 1)}px` }}
        />
      );
    case "spacer":
      return <div aria-hidden="true" style={{ height: `${readNumber(block.props.size, 32)}px` }} />;
    case "statistic":
      return (
        <div className="rounded border border-slate-200 p-5">
          <div className="text-3xl font-semibold text-slate-950">
            {readText(block.props.value, "0")}
          </div>
          <div className="mt-1 text-sm font-medium text-slate-700">
            {readText(block.props.label, "Metric")}
          </div>
          <div className="mt-1 text-sm text-slate-500">{readText(block.props.caption)}</div>
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-[var(--coderso-section-accent,#0d9488)] pl-5 text-lg leading-8 text-slate-700">
          <p>{readText(block.props.text)}</p>
          {readText(block.props.cite) ? (
            <cite className="mt-3 block text-sm text-slate-500">{readText(block.props.cite)}</cite>
          ) : null}
        </blockquote>
      );
    case "gallery":
    case "collection":
    case "form":
    case "embed":
    case "icon":
      return (
        <div className="rounded border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          {block.type.charAt(0).toUpperCase() + block.type.slice(1)}
        </div>
      );
    default:
      return null;
  }
};

const PageSection = ({ section }: { section: PageSectionV2 }) => {
  if (!section.visibility.visible) return null;
  return (
    <section
      id={section.visibility.anchor ?? undefined}
      className="w-full px-4 py-6"
      data-page-section={section.type}
      data-section-id={section.id}
    >
      <div
        className={joinClasses(
          "grid w-full",
          sectionGridClass(section.layout.columns),
          alignmentClass(section.layout.align),
          justifyClass(section.layout.justify)
        )}
        style={toSectionStyle(section)}
      >
        {section.blocks.length > 0 ? (
          section.blocks.map((block) => (
            <div key={block.id} data-page-block={block.type} data-block-id={block.id}>
              {renderBlock(block)}
            </div>
          ))
        ) : (
          <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Empty section
          </div>
        )}
      </div>
    </section>
  );
};

export function DefaultRuntimePageShellV2({
  document,
  previewDevice = "desktop",
}: PageTemplatePropsV2) {
  const resolved = resolvePageDocumentForBreakpoint(document, previewDevice);

  if (resolved.sections.length === 0) {
    return (
      <main
        className="mx-auto w-full max-w-4xl px-6 py-16 text-center text-slate-500"
        data-page-v2="true"
      >
        This page has no content yet.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-950" data-page-v2="true">
      {resolved.sections.map((section) => (
        <PageSection key={section.id} section={section} />
      ))}
    </main>
  );
}
