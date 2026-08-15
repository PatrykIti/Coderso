import { pathToFileURL } from "node:url";

import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";

import { createTemplateCache } from "../themes/cache";
import { ensureThemesLoaded } from "../themes/registry";
import { resolveTemplate } from "../themes/resolver";
import type { ContentSchema } from "../services/content/validation";
import {
  isPostContentTypeSlug,
  mapPostDocumentForRuntime,
  type PostRuntimeMappedDocument,
} from "../services/posts/runtime/postBlockRuntimeMapper";
import { PostBlockRuntimeRenderer } from "../services/posts/runtime/postBlockRuntimeRenderer";
import { ContentListPager } from "../widgets/core/contentList";
import { buildPublicDocumentShell } from "./publicDocumentShell";

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

export type PublicEntryDetailRecord = PublicEntrySummary & {
  taxonomy?: unknown;
  seo?: {
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    robots?: string | null;
  } | null;
};

export type PublicEntryListItem = {
  id: string;
  title: string;
  href: string;
  entry: PublicEntrySummary;
};

/**
 * Pagination meta of an auto entry-list route (TASK-459-03): the route render
 * consumes `?page=N` / `?sort=` through the shared listing pipeline and the
 * default template renders the shared numbered pager from these fields.
 * Additive — theme templates that ignore it keep rendering the page slice.
 */
export type PublicEntryListPagination = {
  page: number;
  totalPages: number;
  total: number;
  pageParamKey: string;
  search: string;
  previousPageHref?: string;
  nextPageHref?: string;
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
  pagination?: PublicEntryListPagination;
  isPreview?: boolean;
};

export type ContentDetailTemplateProps = {
  variant: "detail";
  title: string;
  contentType: ContentTypeSnapshot;
  entry: PublicEntryDetailRecord;
  postRuntimeDocument?: PostRuntimeMappedDocument | null;
  isPreview?: boolean;
};

export type ContentTemplateProps = ContentListTemplateProps | ContentDetailTemplateProps;

export type PublicEntryListOptions = {
  title: string;
  contentType: ContentTypeSnapshot;
  items: PublicEntryListItem[];
  pagination?: PublicEntryListPagination;
  themeName?: string | null;
  cssHref?: string | null;
  inlineCss?: string | null;
  devModuleScripts?: string[] | null;
  isPreview?: boolean;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  /**
   * Analytics tracking snippet body (TASK-483-03-L02): the inline IIFE built by
   * `buildTrackingScript`. Appended before `</body>` on LIVE list renders only;
   * skipped when `isPreview` is set. Absent/null → no script.
   */
  analyticsScriptHtml?: string | null;
  siteLocale?: unknown;
  /**
   * GA4 head snippet (TASK-491-01-L02): validated `gtag.js` head tag; rendered
   * on LIVE list renders only, skipped on previews. Absent/null → no tag.
   */
  analyticsHeadSnippet?: string | null;
};

export type PublicEntryDetailOptions = {
  title: string;
  contentType: ContentTypeSnapshot;
  entry: PublicEntryDetailRecord;
  themeName?: string | null;
  cssHref?: string | null;
  inlineCss?: string | null;
  devModuleScripts?: string[] | null;
  isPreview?: boolean;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  /**
   * Analytics tracking snippet body (TASK-483-03-L02): the inline IIFE built by
   * `buildTrackingScript`. Appended before `</body>` on LIVE detail renders only
   * (blog posts + default-template entry detail); skipped when `isPreview` is
   * set. Absent/null → no script.
   */
  analyticsScriptHtml?: string | null;
  siteLocale?: unknown;
  /**
   * GA4 head snippet (TASK-491-01-L02): validated `gtag.js` head tag; rendered
   * on LIVE detail renders only, skipped on previews. Absent/null → no tag.
   */
  analyticsHeadSnippet?: string | null;
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

const loadTemplateComponent = async <Props extends ContentTemplateProps>(templatePath: string) => {
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
  canonicalUrl?: string | null,
  robots?: string | null,
  devModuleScripts?: string[] | null,
  isPreview?: boolean,
  analyticsScriptHtml?: string | null,
  siteLocale?: unknown,
  analyticsHeadSnippet?: string | null
) => {
  const headTags: ReactNode[] = [
    <meta key="charset" charSet="utf-8" />,
    <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1" />,
    <title key="title">{title}</title>,
  ];

  if (metaDescription) {
    headTags.push(<meta key="description" name="description" content={metaDescription} />);
  }

  if (canonicalUrl) {
    headTags.push(<link key="canonical" rel="canonical" href={canonicalUrl} />);
  }

  if (robots) {
    headTags.push(<meta key="robots" name="robots" content={robots} />);
  }

  if (inlineCss) {
    headTags.push(<style key="inline-css">{inlineCss}</style>);
  }

  if (isPreview) {
    headTags.push(<style key="preview-hide">{`body{opacity:0}`}</style>);
    headTags.push(
      <script
        key="preview-show"
        dangerouslySetInnerHTML={{
          __html: 'window.addEventListener("load",()=>{document.body.style.opacity="1";});',
        }}
      />
    );
  }

  if (cssHref) {
    headTags.push(<link key="css-preload" rel="preload" as="style" href={cssHref} />);
    headTags.push(<link key="css" rel="stylesheet" href={cssHref} />);
  }

  if (Array.isArray(devModuleScripts)) {
    for (const [index, src] of devModuleScripts.entries()) {
      if (!src) continue;
      headTags.push(<script key={`dev-module-${index}`} type="module" src={src}></script>);
    }
  }

  // GA4 head tag (TASK-491-01-L02): LIVE renders only — never on previews.
  if (analyticsHeadSnippet && !isPreview) {
    headTags.push(<script key="ga4" dangerouslySetInnerHTML={{ __html: analyticsHeadSnippet }} />);
  }

  const head = renderToString(<>{headTags}</>);
  const bodyHtml = renderToString(body);
  // Analytics snippet (TASK-483-03-L02): LIVE renders only — never on previews.
  const analyticsHtml =
    analyticsScriptHtml && !isPreview ? `<script>${analyticsScriptHtml}</script>` : "";

  return buildPublicDocumentShell({
    language: siteLocale,
    headHtml: head,
    bodyHtml: `${bodyHtml}${analyticsHtml}`,
  });
};

const PreviewBanner = () => (
  <div className="sticky top-0 z-50 w-full bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-black">
    Preview mode
  </div>
);

const DefaultListTemplate = ({ title, items, pagination }: ContentListTemplateProps) => (
  <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-sm text-[var(--color-text)]/70">Latest entries</p>
    </header>
    {items.length > 0 ? (
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
    ) : (
      <p className="text-sm text-[var(--color-text)]/70" data-entry-list-empty="1">
        No published entries yet.
      </p>
    )}
    {pagination && pagination.totalPages > 1 ? (
      <ContentListPager
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        pageParamKey={pagination.pageParamKey}
        search={pagination.search}
        previousPageHref={pagination.previousPageHref}
        nextPageHref={pagination.nextPageHref}
      />
    ) : null}
  </main>
);

const DefaultDetailTemplate = ({
  entry,
  postRuntimeDocument,
  isPreview,
}: ContentDetailTemplateProps) => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold">{entry.title}</h1>
      {isPreview ? (
        <p className="text-sm text-[var(--color-text)]/70">
          {postRuntimeDocument ? "Post preview" : "Entry preview"}
        </p>
      ) : null}
    </header>
    {postRuntimeDocument ? (
      <PostBlockRuntimeRenderer document={postRuntimeDocument} />
    ) : (
      <pre className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]/80">
        {JSON.stringify(entry.data ?? {}, null, 2)}
      </pre>
    )}
  </main>
);

export async function renderPublicEntryListHtml(options: PublicEntryListOptions) {
  const {
    title,
    contentType,
    items,
    pagination,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview,
    metaDescription,
    canonicalUrl,
    robots,
    themeName,
    analyticsScriptHtml,
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
    pagination,
    isPreview,
  };

  const body = (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isPreview ? <PreviewBanner /> : null}
      {Template ? <Template {...templateProps} /> : <DefaultListTemplate {...templateProps} />}
    </div>
  );

  return renderDocument(
    title,
    body,
    cssHref,
    inlineCss,
    metaDescription,
    canonicalUrl,
    robots,
    devModuleScripts,
    isPreview,
    analyticsScriptHtml,
    options.siteLocale,
    options.analyticsHeadSnippet
  );
}

export type PublicPasswordPromptOptions = {
  title: string;
  cssHref?: string | null;
  inlineCss?: string | null;
  devModuleScripts?: string[] | null;
  themeName?: string | null;
  /** POST target for the unlock form (always `/entries/:id/unlock`). */
  actionUrl: string;
  /** Same-origin detail path carried to the unlock endpoint as the return target. */
  returnPath: string;
  siteLocale?: unknown;
};

/**
 * TASK-517-02-L03: small server-rendered password-prompt page. Plain
 * `<form method="POST">` (no JS required, CSP-safe), built with the same
 * `renderDocument` shell the detail renderer uses. The locked entry body is
 * NEVER included — only neutral copy + the form.
 */
export function renderPublicPasswordPromptHtml(options: PublicPasswordPromptOptions) {
  const { title, cssHref, inlineCss, devModuleScripts, actionUrl, returnPath, siteLocale } =
    options;

  const body = (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-[var(--color-text)]/70">
          This content is password protected. Enter the password to view it.
        </p>
        <form method="POST" action={actionUrl} autoComplete="off" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              name="password"
              required
              maxLength={256}
              autoFocus
              autoComplete="off"
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
            />
          </label>
          <input type="hidden" name="returnPath" value={returnPath} />
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]"
          >
            Unlock
          </button>
        </form>
      </main>
    </div>
  );

  return renderDocument(
    title,
    body,
    cssHref,
    inlineCss,
    undefined,
    undefined,
    undefined,
    devModuleScripts,
    false,
    undefined,
    siteLocale
  );
}

export async function renderPublicEntryDetailHtml(options: PublicEntryDetailOptions) {
  const {
    title,
    contentType,
    entry,
    cssHref,
    inlineCss,
    devModuleScripts,
    isPreview,
    metaDescription,
    canonicalUrl,
    robots,
    themeName,
    analyticsScriptHtml,
  } = options;

  const templatePath = await resolveContentTemplatePath({
    themeName,
    typeSlug: contentType.slug,
    variant: "detail",
  });
  const Template = templatePath
    ? await loadTemplateComponent<ContentDetailTemplateProps>(templatePath)
    : null;

  const postRuntimeDocument = isPostContentTypeSlug(contentType.slug)
    ? await mapPostDocumentForRuntime(entry.data)
    : null;

  const templateProps: ContentDetailTemplateProps = {
    variant: "detail",
    title,
    contentType,
    entry,
    postRuntimeDocument,
    isPreview,
  };

  const body = (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isPreview ? <PreviewBanner /> : null}
      {Template ? <Template {...templateProps} /> : <DefaultDetailTemplate {...templateProps} />}
    </div>
  );

  return renderDocument(
    title,
    body,
    cssHref,
    inlineCss,
    metaDescription,
    canonicalUrl,
    robots,
    devModuleScripts,
    isPreview,
    analyticsScriptHtml,
    options.siteLocale,
    options.analyticsHeadSnippet
  );
}
