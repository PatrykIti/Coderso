import type { CSSProperties } from "react";

import {
  buildContentListPageHref,
  buildContentListPagerWindow,
  contentListDefaults,
  defaultContentListEmptyDescription,
  defaultContentListListingEmptyDescription,
  normalizeContentListData,
  normalizeContentListRuntimeItems,
  resolveContentListTagLimit,
  resolveContentListVariant,
  resolveTrimmedOptionalString,
  type ContentListColumns,
  type ContentListData,
  type ContentListGap,
  type ContentListImageAspect,
  type ContentListLinkUnavailableReason,
  type ContentListRuntimeItem,
  type ContentListSourceMode,
  type ContentListVariantId,
} from "./contentListContract";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const gridColumnsClassMap: Record<ContentListColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
  "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  "5": "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
  "6": "grid-cols-1 md:grid-cols-3 lg:grid-cols-6",
};

const gapClassMap: Record<ContentListGap, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const imageAspectClassMap: Record<ContentListImageAspect, string> = {
  compact: "h-32",
  standard: "h-40",
  wide: "aspect-[16/9]",
  square: "aspect-square",
};

type ContentListDateParts = {
  dateTime: string;
  label: string;
};

type ContentListMetaParts = {
  date?: ContentListDateParts;
  authorName?: string;
  tags: string[];
};

const runtimeDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatRuntimeDateParts = (value: string | undefined): ContentListDateParts | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return {
    dateTime: date.toISOString(),
    label: runtimeDateFormatter.format(date),
  };
};

const resolveContentListEmptyDescription = (
  sourceMode: ContentListSourceMode,
  configuredDescription: string | undefined
) => {
  const trimmed = resolveTrimmedOptionalString(configuredDescription);
  if (trimmed && !(sourceMode === "listing" && trimmed === defaultContentListEmptyDescription)) {
    return trimmed;
  }
  if (sourceMode === "listing") return defaultContentListListingEmptyDescription;
  return trimmed ?? defaultContentListEmptyDescription;
};

const buildMetaParts = (
  item: ContentListRuntimeItem,
  includeTags: boolean
): ContentListMetaParts => {
  const authorName = resolveTrimmedOptionalString(item.authorName);
  const tags =
    includeTags && Array.isArray(item.tags)
      ? item.tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 2)
      : [];

  return {
    date: formatRuntimeDateParts(item.publishedAt),
    authorName,
    tags,
  };
};

const hasMetaParts = (parts: ContentListMetaParts) =>
  Boolean(parts.date || parts.authorName || parts.tags.length > 0);

const resolveContentListCtaAccessibleLabel = (
  item: ContentListRuntimeItem,
  visibleLabel: string
) => {
  const resolvedLabel = resolveTrimmedOptionalString(visibleLabel) ?? "Read more";
  const title = resolveTrimmedOptionalString(item.title);
  return title ? `${resolvedLabel}: ${title}` : resolvedLabel;
};

function ContentListItemCard({
  item,
  index,
  variant,
  fields,
  style,
  linkUnavailableReason,
}: {
  item: ContentListRuntimeItem;
  index: number;
  variant: ContentListVariantId;
  fields: NonNullable<ContentListData["fields"]>;
  style: NonNullable<ContentListData["style"]>;
  linkUnavailableReason?: ContentListLinkUnavailableReason;
}) {
  const cardStyle = style.cardStyle ?? "outlined";
  const wrapperClassName =
    variant === "compact"
      ? "rounded-lg border p-3"
      : variant === "list"
        ? "rounded-lg border p-4"
        : "rounded-xl border p-4";
  const cardClassName =
    cardStyle === "elevated"
      ? joinClasses(wrapperClassName, "shadow-sm")
      : cardStyle === "minimal"
        ? joinClasses(wrapperClassName, "border-transparent bg-transparent")
        : wrapperClassName;
  const cardStyleVars: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.backgroundColor),
      borderColor: resolveClearableStyleValue(style.borderColor),
      color: resolveClearableStyleValue(style.textColor),
    }) ?? {};
  const tagMode = style.tagMode ?? "meta-line";
  const tagLimit = resolveContentListTagLimit(style.tagLimit);
  const tags = tagMode === "hidden" ? [] : (item.tags ?? []).slice(0, tagLimit);
  const metaParts = buildMetaParts(item, tagMode === "meta-line");
  const metaTail = [...(metaParts.authorName ? [metaParts.authorName] : []), ...metaParts.tags];
  const title = item.title ?? "Untitled";
  const href = item.href && item.href.trim().length > 0 ? item.href : undefined;
  const excerpt = (item.excerpt ?? "").trim();
  const imageAspectClassName = imageAspectClassMap[style.imageAspect ?? "standard"];
  const showImage = Boolean(fields.showImage) && Boolean(item.imageSrc);
  const showExcerpt = fields.showExcerpt && excerpt.length > 0;
  const showMeta = fields.showMeta && hasMetaParts(metaParts);
  const showTagBadges = tagMode === "badges" && tags.length > 0;
  const showCta = Boolean(fields.showCta);
  const showCtaLink = showCta && Boolean(href);
  const hasHref = Boolean(href);
  const showLinkUnavailable = !hasHref && linkUnavailableReason === "missing-route";
  const showCtaFallback = showCta && !hasHref;
  const ctaLabel = style.ctaLabel ?? "Read more";
  const ctaAccessibleLabel = resolveContentListCtaAccessibleLabel(item, ctaLabel);

  return (
    <article
      className={cardClassName}
      style={cardStyleVars}
      data-content-list-item={String(index + 1)}
      data-content-list-status={item.status ?? "unknown"}
    >
      {showImage ? (
        <div className="mb-3 overflow-hidden rounded-md border border-[var(--color-border)]/70">
          <img
            src={item.imageSrc}
            alt={item.imageAlt ?? title}
            className={joinClasses("w-full object-cover", imageAspectClassName)}
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className={variant === "compact" ? "text-base font-semibold" : "text-lg font-semibold"}>
          {href ? (
            <a href={href} className="hover:underline">
              {title}
            </a>
          ) : (
            title
          )}
        </h3>
        {showTagBadges ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--color-border)]/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] opacity-80"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {showMeta ? (
          <p className="text-xs opacity-75">
            {metaParts.date ? (
              <time dateTime={metaParts.date.dateTime}>{metaParts.date.label}</time>
            ) : null}
            {metaTail.map((segment, index) => (
              <span key={`${segment}-${index}`}>
                {metaParts.date || index > 0 ? <span aria-hidden="true"> • </span> : null}
                <span>{segment}</span>
              </span>
            ))}
          </p>
        ) : null}
        {showExcerpt ? (
          <p className={variant === "compact" ? "text-sm opacity-90" : "text-sm opacity-90"}>
            {excerpt}
          </p>
        ) : null}
        {showCtaLink ? (
          <div>
            <a
              href={href}
              className="text-sm font-medium underline-offset-4 hover:underline"
              aria-label={ctaAccessibleLabel}
            >
              {ctaLabel}
            </a>
          </div>
        ) : null}
        {showCtaFallback ? (
          <div>
            <span
              className="text-sm font-medium opacity-70"
              aria-disabled="true"
              aria-label={ctaAccessibleLabel}
              data-content-list-cta-disabled={linkUnavailableReason ?? "missing-href"}
            >
              {ctaLabel}
            </span>
          </div>
        ) : null}
        {showLinkUnavailable ? (
          <p className="text-xs opacity-70" data-content-list-link-unavailable="1">
            Links unavailable until a detail route is configured.
          </p>
        ) : null}
      </div>
    </article>
  );
}

export type ContentListPagerProps = {
  page: number;
  totalPages: number;
  total: number;
  /** Page param key + serialized search the numbered links are built from. */
  pageParamKey?: string;
  search?: string;
  /** Resolver-provided prev/next hrefs (preferred when present). */
  previousPageHref?: string;
  nextPageHref?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
};

/**
 * Shared numbered pager (TASK-459-03): totals line ("N results"), windowed
 * page numbers, prev/next — all server-rendered hrefs (no-JS safe). Anchors
 * carry `data-listing-page-link="1"` so the listing runtime client script can
 * fetch-swap listing-bound blocks instead of a full navigation. Reused by the
 * content-list widget and the auto entry-list route template.
 */
export function ContentListPager({
  page,
  totalPages,
  total,
  pageParamKey,
  search,
  previousPageHref,
  nextPageHref,
  viewAllHref,
  viewAllLabel,
}: ContentListPagerProps) {
  const safeTotalPages = Math.max(1, Math.floor(totalPages));
  const currentPage = Math.min(Math.max(1, Math.floor(page)), safeTotalPages);
  const hrefFor = (target: number) =>
    pageParamKey ? buildContentListPageHref(search ?? "", pageParamKey, target) : undefined;
  const resolvedPreviousHref =
    previousPageHref ?? (currentPage > 1 ? hrefFor(currentPage - 1) : undefined);
  const resolvedNextHref =
    nextPageHref ?? (currentPage < safeTotalPages ? hrefFor(currentPage + 1) : undefined);
  if (!resolvedPreviousHref && !resolvedNextHref) return null;
  const windowItems = buildContentListPagerWindow(currentPage, safeTotalPages);
  const linkClassName = "font-medium underline-offset-4 hover:underline";

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"
      aria-label="Content list pagination"
      data-content-list-pagination="paged"
    >
      <span className="text-[var(--color-text)]/75" data-content-list-total={String(total)}>
        {total === 1 ? "1 result" : `${total} results`}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {resolvedPreviousHref ? (
          <a href={resolvedPreviousHref} className={linkClassName} data-listing-page-link="1">
            Previous
          </a>
        ) : (
          <span className="font-medium opacity-60">Previous</span>
        )}
        {windowItems.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} aria-hidden="true" className="opacity-60">
              …
            </span>
          ) : item === currentPage ? (
            <span
              key={item}
              aria-current="page"
              className="rounded border border-[var(--color-border)] px-2 py-0.5 font-semibold"
              data-content-list-page={String(item)}
            >
              {item}
            </span>
          ) : (
            (() => {
              const href = hrefFor(item);
              return href ? (
                <a
                  key={item}
                  href={href}
                  className={joinClasses(linkClassName, "px-1")}
                  aria-label={`Page ${item}`}
                  data-listing-page-link="1"
                  data-content-list-page={String(item)}
                >
                  {item}
                </a>
              ) : (
                <span key={item} className="px-1 opacity-60" data-content-list-page={String(item)}>
                  {item}
                </span>
              );
            })()
          )
        )}
        {resolvedNextHref ? (
          <a href={resolvedNextHref} className={linkClassName} data-listing-page-link="1">
            Next
          </a>
        ) : (
          <span className="font-medium opacity-60">Next</span>
        )}
      </span>
      {viewAllHref ? (
        <a href={viewAllHref} className={linkClassName} data-content-list-view-all="1">
          {viewAllLabel ?? "View all"}
        </a>
      ) : null}
    </nav>
  );
}

function ContentListPaginationActions({
  pagination,
  resolved,
  state,
}: {
  pagination: NonNullable<ContentListData["pagination"]>;
  resolved: NonNullable<ContentListData["resolved"]>;
  state: "missing-source" | "ready" | "empty";
}) {
  const normalizePaginationHref = (value: string | undefined) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("?")) return trimmed;
    return normalizeWidgetSafeHref(trimmed, {
      allowRelative: true,
      allowHttp: true,
    });
  };

  const mode = pagination.mode ?? "none";
  const previousPageHref = normalizePaginationHref(resolved.runtime?.previousPageHref);
  const nextPageHref = normalizePaginationHref(resolved.runtime?.nextPageHref);
  const explicitViewAllHref = normalizeWidgetSafeHref(pagination.viewAllHref, {
    allowRelative: true,
    allowHttp: true,
  });
  const viewAllHref =
    explicitViewAllHref ??
    normalizeWidgetSafeHref(resolved.listPath, {
      allowRelative: true,
      allowHttp: true,
    });
  const currentPage = resolved.runtime?.page ?? 1;
  const totalPages = resolved.runtime?.totalPages ?? 1;

  if (mode === "paged" && state === "ready" && (previousPageHref || nextPageHref)) {
    return (
      <ContentListPager
        page={currentPage}
        totalPages={totalPages}
        total={resolved.total ?? 0}
        pageParamKey={resolved.runtime?.pageParamKey}
        search={resolved.runtime?.search}
        previousPageHref={previousPageHref}
        nextPageHref={nextPageHref}
        viewAllHref={explicitViewAllHref}
        viewAllLabel={pagination.viewAllLabel}
      />
    );
  }

  if (mode === "load-more" && state === "ready" && nextPageHref) {
    return (
      <div className="mt-6">
        <a href={nextPageHref} className="text-sm font-medium underline-offset-4 hover:underline">
          {pagination.loadMoreLabel ?? "Load more"}
        </a>
      </div>
    );
  }

  if (mode === "view-all" && viewAllHref) {
    return (
      <div className="mt-6">
        <a href={viewAllHref} className="text-sm font-medium underline-offset-4 hover:underline">
          {pagination.viewAllLabel ?? "View all"}
        </a>
      </div>
    );
  }

  if (mode === "view-all") {
    return (
      <div className="mt-6 text-sm" data-content-list-view-all-unavailable="1">
        <span className="font-medium opacity-70" aria-disabled="true">
          {pagination.viewAllLabel ?? "View all"}
        </span>
        <p className="mt-1 text-xs text-[var(--color-text)]/65">
          View all is unavailable until a destination or list route is configured.
        </p>
      </div>
    );
  }

  return null;
}

export function ContentListBlock({
  data,
  variant,
  blockId,
  linkUnavailableReason,
}: {
  data: ContentListData;
  variant: string;
  blockId?: string;
  linkUnavailableReason?: ContentListLinkUnavailableReason;
}) {
  const normalized = normalizeContentListData(data);
  const resolvedVariant = resolveContentListVariant(variant);
  const source = normalized.source ?? contentListDefaults.source!;
  const pagination = normalized.pagination ?? contentListDefaults.pagination!;
  const fields = normalized.fields ?? contentListDefaults.fields!;
  const style = normalized.style ?? contentListDefaults.style!;
  const resolvedItems = normalizeContentListRuntimeItems(normalized.resolved?.items);
  // Dangling-route guard (TASK-459-03): when the resolver suppressed card
  // links because no enabled content route exists, surface the explicit
  // "missing-route" state even when the caller passed no override prop.
  const effectiveLinkUnavailableReason =
    linkUnavailableReason ??
    (normalized.resolved?.cardLinkMode === "missing-route" ? "missing-route" : undefined);
  const sourceMode = source.mode ?? "legacy";
  const hasSource =
    sourceMode === "listing"
      ? (source.listingQueryId ?? "").trim().length > 0
      : (source.contentTypeId ?? "").trim().length > 0;
  const hasItems = resolvedItems.length > 0;
  const state = !hasSource ? "missing-source" : hasItems ? "ready" : "empty";
  const errorText = normalized.resolved?.error;
  const sectionTitle = resolveTrimmedOptionalString(normalized.title);
  const sectionDescription = resolveTrimmedOptionalString(normalized.description);
  const headingIdBase = (blockId ?? "content-list").trim() || "content-list";
  const sectionTitleId = `${headingIdBase}-title`;
  const sectionDescriptionId = `${headingIdBase}-description`;
  const emptyDescription = resolveContentListEmptyDescription(
    sourceMode,
    normalized.emptyState?.description
  );

  const wrapperClassName =
    resolvedVariant === "list"
      ? joinClasses("flex flex-col", gapClassMap[style.gap ?? "md"])
      : joinClasses(
          "grid",
          resolvedVariant === "compact" ? "grid-cols-1" : gridColumnsClassMap[style.columns ?? "3"],
          gapClassMap[style.gap ?? "md"]
        );

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      aria-labelledby={sectionTitle ? sectionTitleId : undefined}
      aria-describedby={sectionDescription ? sectionDescriptionId : undefined}
      aria-label={sectionTitle ? undefined : "Content list"}
      data-content-list-variant={resolvedVariant}
      data-content-list-source-mode={sourceMode}
      data-content-list-source={
        sourceMode === "listing" ? (source.listingQueryId ?? "") : (source.contentTypeId ?? "")
      }
      data-content-list-items={String(resolvedItems.length)}
      data-content-list-status-scope={source.statusScope ?? "published"}
      data-content-list-state={state}
      data-listing-widget="content-list"
      data-listing-block-id={blockId ?? ""}
      data-listing-query-id={sourceMode === "listing" ? (source.listingQueryId ?? "") : ""}
    >
      {errorText ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorText}
        </div>
      ) : null}
      {sectionTitle ? (
        <h2 id={sectionTitleId} className="text-2xl font-semibold text-[var(--color-text)]">
          {sectionTitle}
        </h2>
      ) : null}
      {sectionDescription ? (
        <p
          id={sectionDescriptionId}
          className={joinClasses(
            "text-sm text-[var(--color-text)]/75",
            sectionTitle ? "mt-2" : undefined,
            "mb-6"
          )}
        >
          {sectionDescription}
        </p>
      ) : null}
      {!hasSource ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-8 text-sm text-[var(--color-text)]/80">
          {sourceMode === "listing"
            ? "Choose a listing query in widget settings to render items here."
            : "Choose a content type in widget settings to render entries here."}
        </div>
      ) : hasItems ? (
        <>
          <div className={wrapperClassName}>
            {resolvedItems.map((item, index) => (
              <ContentListItemCard
                key={item.id ?? `${item.slug ?? "item"}-${index + 1}`}
                item={item}
                index={index}
                variant={resolvedVariant}
                fields={fields}
                style={style}
                linkUnavailableReason={effectiveLinkUnavailableReason}
              />
            ))}
          </div>
          <ContentListPaginationActions
            pagination={pagination}
            resolved={normalized.resolved ?? { items: [] }}
            state={state}
          />
        </>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-10 text-center">
          <p className="text-base font-semibold text-[var(--color-text)]">
            {normalized.emptyState?.title ?? "No items found"}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text)]/75">{emptyDescription}</p>
        </div>
      )}
    </section>
  );
}
