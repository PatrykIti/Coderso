import type { ContentListTemplateProps } from "../site/renderPublicEntry";
import { ContentListPager } from "../widgets/core/contentList";

export default function ContentListTemplate({
  title,
  items,
  pagination,
}: ContentListTemplateProps) {
  return (
    <main
      data-template="content-list"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12"
    >
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
}
