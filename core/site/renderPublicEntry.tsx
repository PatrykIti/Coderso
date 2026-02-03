import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";

export type PublicEntryListItem = {
  id: string;
  title: string;
  href: string;
};

export type PublicEntryListOptions = {
  title: string;
  items: PublicEntryListItem[];
  cssHref?: string | null;
  inlineCss?: string | null;
  isPreview?: boolean;
  metaDescription?: string | null;
};

export type PublicEntryDetailOptions = {
  title: string;
  entryTitle: string;
  entryData: Record<string, unknown>;
  cssHref?: string | null;
  inlineCss?: string | null;
  isPreview?: boolean;
  metaDescription?: string | null;
};

const renderDocument = (
  title: string,
  body: ReactNode,
  cssHref?: string | null,
  inlineCss?: string | null,
  metaDescription?: string | null
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

  const head = renderToString(<>{headTags}</>);
  const bodyHtml = renderToString(body);

  return `<!doctype html><html lang="en"><head>${head}</head><body>${bodyHtml}</body></html>`;
};

const PreviewBanner = () => (
  <div className="sticky top-0 z-50 w-full bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-black">
    Preview mode
  </div>
);

export function renderPublicEntryListHtml(options: PublicEntryListOptions) {
  const { title, items, cssHref, inlineCss, isPreview, metaDescription } = options;

  const body = (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isPreview ? <PreviewBanner /> : null}
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-[var(--color-text)]/70">
            Latest entries
          </p>
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
    </div>
  );

  return renderDocument(title, body, cssHref, inlineCss, metaDescription);
}

export function renderPublicEntryDetailHtml(options: PublicEntryDetailOptions) {
  const {
    title,
    entryTitle,
    entryData,
    cssHref,
    inlineCss,
    isPreview,
    metaDescription,
  } = options;

  const body = (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isPreview ? <PreviewBanner /> : null}
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">{entryTitle}</h1>
          <p className="text-sm text-[var(--color-text)]/70">
            Entry preview
          </p>
        </header>
        <pre className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]/80">
          {JSON.stringify(entryData, null, 2)}
        </pre>
      </main>
    </div>
  );

  return renderDocument(title, body, cssHref, inlineCss, metaDescription);
}
