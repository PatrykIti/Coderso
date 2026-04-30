import type { ComponentType, CSSProperties } from "react";

import {
  buildListingRuntimeParamName,
  listingRuntimeTokens,
} from "../../services/search/filterContract";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { getListingRuntimeClientScript } from "./listingRuntimeScript";

export type SearchBoxVariantId = "default";

export type SearchBoxMode = "listing" | "global";

export type SearchBoxData = {
  mode?: SearchBoxMode;
  listingQueryId?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  autoApply?: boolean;
  endpoint?: string;
  sources?: {
    pages?: boolean;
    entries?: boolean;
    posts?: boolean;
  };
  style?: {
    frameBackground?: string;
    frameBorderColor?: string;
    actionBackground?: string;
  };
  resolved?: {
    query?: string;
    rejectedTokens?: string[];
    error?: string;
  };
};

const resolveText = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const resolveOptionalText = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const searchBoxDefaults: SearchBoxData = {
  mode: "listing",
  listingQueryId: "",
  title: "Search",
  description: "Search listing items in real time.",
  placeholder: "Type to search...",
  submitLabel: "Search",
  autoApply: true,
  endpoint: "/api/search",
  sources: {
    pages: true,
    entries: true,
    posts: false,
  },
  style: {
    frameBackground: "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    frameBorderColor: "var(--color-border)",
    actionBackground: "var(--color-primary)",
  },
};

export const searchBoxSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { enum: ["listing", "global"] },
    listingQueryId: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    placeholder: { type: "string" },
    submitLabel: { type: "string" },
    autoApply: { type: "boolean" },
    endpoint: { type: "string" },
    sources: {
      type: "object",
      additionalProperties: false,
      properties: {
        pages: { type: "boolean" },
        entries: { type: "boolean" },
        posts: { type: "boolean" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        frameBackground: { type: "string" },
        frameBorderColor: { type: "string" },
        actionBackground: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        rejectedTokens: {
          type: "array",
          items: { type: "string" },
        },
        error: { type: "string" },
      },
    },
  },
} as const;

const sourceOptions = [
  { key: "pages", label: "Pages" },
  { key: "entries", label: "Entries" },
  { key: "posts", label: "Posts" },
] as const;

export function normalizeSearchBoxData(data: SearchBoxData): SearchBoxData {
  const defaults = searchBoxDefaults;
  const mode = data.mode === "global" ? "global" : "listing";
  const hasStyleObject = data.style !== undefined;
  const style = hasStyleObject
    ? (compactObject({
        frameBackground: resolveClearableStyleValue(data.style?.frameBackground),
        frameBorderColor: resolveClearableStyleValue(data.style?.frameBorderColor),
        actionBackground: resolveClearableStyleValue(data.style?.actionBackground),
      }) ?? {})
    : undefined;

  return {
    mode,
    listingQueryId: resolveText(data.listingQueryId, defaults.listingQueryId ?? ""),
    title: resolveText(data.title, defaults.title ?? "Search"),
    description: resolveText(
      data.description,
      defaults.description ?? "Search listing items in real time."
    ),
    placeholder: resolveText(data.placeholder, defaults.placeholder ?? "Type to search..."),
    submitLabel: resolveText(data.submitLabel, defaults.submitLabel ?? "Search"),
    autoApply: typeof data.autoApply === "boolean" ? data.autoApply : defaults.autoApply !== false,
    endpoint: resolveText(data.endpoint, defaults.endpoint ?? "/api/search"),
    sources: {
      pages:
        typeof data.sources?.pages === "boolean"
          ? data.sources.pages
          : defaults.sources?.pages !== false,
      entries:
        typeof data.sources?.entries === "boolean"
          ? data.sources.entries
          : defaults.sources?.entries !== false,
      posts:
        typeof data.sources?.posts === "boolean"
          ? data.sources.posts
          : defaults.sources?.posts === true,
    },
    ...(hasStyleObject ? { style } : {}),
    resolved: {
      query: resolveOptionalText(data.resolved?.query),
      rejectedTokens: Array.isArray(data.resolved?.rejectedTokens)
        ? data.resolved.rejectedTokens
            .filter((token): token is string => typeof token === "string")
            .map((token) => token.trim())
            .filter(Boolean)
        : [],
      error: resolveOptionalText(data.resolved?.error),
    },
  };
}

export function SearchBoxBlock({
  data,
  blockId,
}: {
  data: SearchBoxData;
  variant: string;
  blockId?: string;
}) {
  const normalized = normalizeSearchBoxData(data);
  const mode = normalized.mode === "global" ? "global" : "listing";
  const title = resolveText(normalized.title, "Search");
  const description = resolveOptionalText(normalized.description);
  const placeholder = resolveText(normalized.placeholder, "Type to search...");
  const submitLabel = resolveText(normalized.submitLabel, "Search");
  const queryValue = resolveOptionalText(normalized.resolved?.query) ?? "";
  const autoApply = normalized.autoApply !== false;
  const frameStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.frameBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.frameBorderColor),
  });
  const actionStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.actionBackground),
  });
  const legacyFrameClass =
    normalized.style === undefined ? "border-[var(--color-border)] bg-[var(--color-bg)]/80" : "";
  const legacyActionClass = normalized.style === undefined ? "bg-[var(--color-primary)]" : "";

  if (mode === "listing") {
    const listingQueryId = resolveOptionalText(normalized.listingQueryId);
    if (!listingQueryId) {
      return (
        <section
          className="mx-auto w-full max-w-4xl rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6"
          data-listing-widget="search-box"
          data-listing-block-id={blockId ?? ""}
          data-listing-query-id=""
        >
          <p className="text-sm text-[var(--color-text)]/75">
            Select a listing query in widget settings to enable scoped listing search.
          </p>
        </section>
      );
    }

    return (
      <section
        className="mx-auto w-full max-w-4xl px-4 py-5"
        data-listing-widget="search-box"
        data-listing-block-id={blockId ?? ""}
        data-listing-query-id={listingQueryId}
      >
        <div className={`rounded-xl border p-4 ${legacyFrameClass}`} style={frameStyle}>
          <form
            method="get"
            action=""
            className="grid gap-3"
            data-listing-runtime-form
            data-listing-query-id={listingQueryId}
            data-listing-auto-apply={autoApply ? "1" : "0"}
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]/75">
                {title}
              </p>
              {description ? (
                <p className="text-sm text-[var(--color-text)]/70">{description}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="h-9 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                name={buildListingRuntimeParamName(listingQueryId, listingRuntimeTokens.search)}
                data-listing-token={listingRuntimeTokens.search}
                defaultValue={queryValue}
                placeholder={placeholder}
              />
              <button
                type="submit"
                className={`inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold text-[var(--color-bg)] ${legacyActionClass}`}
                style={actionStyle}
              >
                {submitLabel}
              </button>
            </div>

            {autoApply ? (
              <p className="text-xs text-[var(--color-text)]/60">
                Search updates automatically as you type.
              </p>
            ) : null}

            {normalized.resolved?.error ? (
              <p className="text-xs text-destructive">{normalized.resolved.error}</p>
            ) : null}

            {!normalized.resolved?.error &&
            Array.isArray(normalized.resolved?.rejectedTokens) &&
            normalized.resolved.rejectedTokens.length > 0 ? (
              <p className="text-xs text-[var(--color-text)]/60">
                Ignored invalid runtime query tokens.
              </p>
            ) : null}
          </form>
        </div>
        <script dangerouslySetInnerHTML={{ __html: getListingRuntimeClientScript() }} />
      </section>
    );
  }

  const boxId = blockId ?? "global-search";
  const enabledSources = {
    pages: normalized.sources?.pages !== false,
    entries: normalized.sources?.entries !== false,
    posts: normalized.sources?.posts === true,
  };

  return (
    <section
      className="mx-auto w-full max-w-5xl px-4 py-6"
      data-listing-widget="search-box"
      data-listing-block-id={blockId ?? ""}
      data-listing-query-id=""
    >
      <div className={`space-y-4 rounded-xl border p-4 ${legacyFrameClass}`} style={frameStyle}>
        <form
          method="get"
          action={resolveText(normalized.endpoint, "/api/search")}
          className="grid gap-3"
          data-global-search-form
          data-search-box-id={boxId}
          data-search-endpoint={resolveText(normalized.endpoint, "/api/search")}
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]/75">
              {title}
            </p>
            {description ? (
              <p className="text-sm text-[var(--color-text)]/70">{description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
              name="q"
              defaultValue={queryValue}
              placeholder={placeholder}
            />
            <button
              type="submit"
              className={`inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold text-[var(--color-bg)] ${legacyActionClass}`}
              style={actionStyle}
            >
              {submitLabel}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {sourceOptions.map((source) => (
              <label key={source.key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="sources"
                  value={source.key}
                  defaultChecked={Boolean(enabledSources[source.key])}
                />
                <span>{source.label}</span>
              </label>
            ))}
          </div>

          {normalized.resolved?.error ? (
            <p className="text-xs text-destructive">{normalized.resolved.error}</p>
          ) : null}
        </form>

        <div
          className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-3"
          data-global-search-results={boxId}
        >
          <p className="text-sm text-[var(--color-text)]/70">
            Type at least two characters to search across selected sources.
          </p>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: getListingRuntimeClientScript() }} />
    </section>
  );
}

export function createSearchBoxWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<SearchBoxData>>;
  visual: ComponentType<WidgetEditorProps<SearchBoxData>>;
  advanced: ComponentType<WidgetEditorProps<SearchBoxData>>;
}): WidgetDefinition<SearchBoxData> {
  return {
    type: "search-box",
    title: "Search Box",
    description: "Scoped listing search or global public search widget.",
    category: "content",
    variants: [
      {
        id: "default",
        label: "Default",
        description: "Search input with optional source scoping.",
      },
    ],
    schema: searchBoxSchema,
    defaults: searchBoxDefaults,
    editor: editors,
    render: SearchBoxBlock,
  };
}
