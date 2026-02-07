import { pathToFileURL } from "node:url";

import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";

import { createTemplateCache } from "../themes/cache";
import { ensureThemesLoaded } from "../themes/registry";
import { resolveTemplate } from "../themes/resolver";
import type { ContentSchema } from "../services/content/validation";
import type { EntryDetail } from "../services/content/entryService";

export type PublicEntrySummary = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status?: string;
  data?: Record<string, unknown>;
  tags?: string[];
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  author?: { id: string; name: string | null; email: string } | null;
};

export type PublicEntryListItem = {
  id: string;
  title: string;
  href: string;
  entry: PublicEntrySummary;
};

export type ContentTypeSnapshot = {
  id: string;
  name: string;
  slug: string;
  schema?: ContentSchema;
};

export type ContentListTemplateProps = {
  variant: "list";
  title: string;
  contentType: ContentTypeSnapshot;
  items: PublicEntryListItem[];
  isPreview?: boolean;
};

export type ContentDetailTemplateProps = {
  variant: "detail";
  title: string;
  contentType: ContentTypeSnapshot;
  entry: EntryDetail;
  isPreview?: boolean;
};

export type ContentTemplateProps =
  | ContentListTemplateProps
  | ContentDetailTemplateProps;

export type PublicEntryListOptions = {
  title: string;
  contentType: ContentTypeSnapshot;
  items: PublicEntryListItem[];
  themeName?: string | null;
  cssHref?: string | null;
  inlineCss?: string | null;
  devModuleScripts?: string[] | null;
  isPreview?: boolean;
  metaDescription?: string | null;
};

export type PublicEntryDetailOptions = {
  title: string;
  contentType: ContentTypeSnapshot;
  entry: EntryDetail;
  themeName?: string | null;
  cssHref?: string | null;
  inlineCss?: string | null;
  devModuleScripts?: string[] | null;
  isPreview?: boolean;
  metaDescription?: string | null;
};

type TemplateComponent<Props> = (props: Props) => ReactNode;

type ContentTemplateVariant = "list" | "detail";

const normalizeThemeName = (value?: string | null) =>
  value && value.trim().length > 0 ? value.trim() : "default";

const resolveContentTemplatePath = async (options: {
  themeName?: string | null;
  typeSlug: string;
  variant: ContentTemplateVariant;
}) => {
  await ensureThemesLoaded();

  const themeName = normalizeThemeName(options.themeName);
  const cache = createTemplateCache();
  const candidates = [`${options.typeSlug}-${options.variant}`, options.variant];

  for (const key of candidates) {
    const resolved = resolveTemplate({
      themeName,
      type: "content",
      key,
      cache,
    });
    if (resolved) return resolved;
  }

  return resolveTemplate({ themeName, type: "content", cache });
};

const loadTemplateComponent = async <Props extends ContentTemplateProps>(
  templatePath: string
) => {
  try {
    const mod = await import(pathToFileURL(templatePath).href);
    if (typeof mod.default === "function") {
      return mod.default as TemplateComponent<Props>;
    }
  } catch (error) {
    console.warn(`Failed to load template ${templatePath}`, error);
  }
  return null;
};

const renderDocument = (
  title: string,
  body: ReactNode,
  cssHref?: string | null,
  inlineCss?: string | null,
  metaDescription?: string | null,
  devModuleScripts?: string[] | null
) => {
  const headTags: ReactNode[] = [
    <meta key="charset" charSet="utf-8" />,
    <meta
      key="viewport"
      name="viewport"
      content="width=device-width, initial-scale=1"
    />,
    <title key="title">{title}</title>,
  ];

  if (metaDescription) {
    headTags.push(
      <meta key="description" name="description" content={metaDescription} />
    );
  }

  if (inlineCss) {
    headTags.push(<style key="inline-css">{inlineCss}</style>);
  }

  if (cssHref) {
    headTags.push(<link key="css" rel="stylesheet" href={cssHref} />);
  }

  if (Array.isArray(devModuleScripts)) {
    for (const [index, src] of devModuleScripts.entries()) {
      if (!src) continue;
      headTags.push(
        <script key={`dev-module-${index}`} type="module" src={src}></script>
      );
    }
  }

  const head = renderToString(<>{headTags}</>);
  const bodyHtml = renderToString(body);

  return `<!doctype html><html lang="en"><head>${head}</head><body>${bodyHtml}</body></html>`;
};

const PreviewBanner = () => (
  <div className="sticky top-0 z-50 w-full bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-black">
    Preview mode
  </div>
);

const DefaultListTemplate = ({ title, items }: ContentListTemplateProps) => (
  <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-sm text-[var(--color-text)]/70">Latest entries</p>
    </header>
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <a
            className="text-lg font-medium text-[var(--color-primary)] hover:underline"
            href={item.href}
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  </main>
);

const DefaultDetailTemplate = ({ entry }: ContentDetailTemplateProps) => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold">{entry.title}</h1>
      <p className="text-sm text-[var(--color-text)]/70">Entry preview</p>
    </header>
    <pre className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]/80">
      {JSON.stringify(entry.data ?? {}, null, 2)}
    </pre>
  </main>
);

export async function renderPublicEntryListHtml(
  options: PublicEntryListOptions
) {
  const {
    title,
    contentType,
    items,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview,
    metaDescription,
    themeName,
  } = options;

  const templatePath = await resolveContentTemplatePath({
    themeName,
    typeSlug: contentType.slug,
    variant: "list",
  });
  const Template = templatePath
    ? await loadTemplateComponent<ContentListTemplateProps>(templatePath)
    : null;

  const templateProps: ContentListTemplateProps = {
    variant: "list",
    title,
    contentType,
    items,
    isPreview,
  };

  const body = (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isPreview ? <PreviewBanner /> : null}
      {Template ? (
        <Template {...templateProps} />
      ) : (
        <DefaultListTemplate {...templateProps} />
      )}
    </div>
  );

  return renderDocument(
    title,
    body,
    cssHref,
    inlineCss,
    metaDescription,
    devModuleScripts
  );
}

export async function renderPublicEntryDetailHtml(
  options: PublicEntryDetailOptions
) {
  const {
    title,
    contentType,
    entry,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview,
    metaDescription,
    themeName,
  } = options;

  const templatePath = await resolveContentTemplatePath({
    themeName,
    typeSlug: contentType.slug,
    variant: "detail",
  });
  const Template = templatePath
    ? await loadTemplateComponent<ContentDetailTemplateProps>(templatePath)
    : null;

  const templateProps: ContentDetailTemplateProps = {
    variant: "detail",
    title,
    contentType,
    entry,
    isPreview,
  };

  const body = (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isPreview ? <PreviewBanner /> : null}
      {Template ? (
        <Template {...templateProps} />
      ) : (
        <DefaultDetailTemplate {...templateProps} />
      )}
    </div>
  );

  return renderDocument(
    title,
    body,
    cssHref,
    inlineCss,
    metaDescription,
    devModuleScripts
  );
}
