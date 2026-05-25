import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError, isSessionExpiredApiError } from "@/services/apiClient";
import { listMediaCached, type MediaRecord } from "@/services/mediaClient";
import { listPostsCached, type PostSummary } from "@/services/postsClient";
import { getSiteSettings, type SiteContentRoute } from "@/services/siteSettingsClient";

import {
  normalizePostsFeedData,
  postsFeedDefaults,
  type PostsFeedData,
  type PostsFeedMotion,
  type PostsFeedSourceMode,
} from "../../../../widgets/core/postsFeed";
import type {
  WidgetEditorContext,
  WidgetEditorProps,
  WidgetPreviewState,
} from "../../../../widgets/types";
import { resolvePostsFeedResolvedData } from "../../../../services/content/postsFeedRuntime";
import { LinkDestinationField } from "./LinkDestinationField";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const sourceModeOptions: Array<{ id: PostsFeedSourceMode; label: string; hint: string }> = [
  {
    id: "latest",
    label: "Latest posts",
    hint: "Newest published posts (or all statuses in preview).",
  },
  {
    id: "featured",
    label: "Featured posts",
    hint: "Posts tagged as featured or with featured flag.",
  },
  {
    id: "category",
    label: "Category/tag filter",
    hint: "Match posts by tag/category keyword.",
  },
  {
    id: "manual",
    label: "Manual selection",
    hint: "Pick exact posts to display in chosen order.",
  },
];

const sortOptions = [
  { id: "published-desc", label: "Newest published first" },
  { id: "published-asc", label: "Oldest published first" },
  { id: "updated-desc", label: "Recently updated first" },
  { id: "updated-asc", label: "Oldest update first" },
  { id: "title-asc", label: "Title A-Z" },
  { id: "title-desc", label: "Title Z-A" },
] as const;

const variantOptions = [
  { id: "cards", label: "Cards" },
  { id: "list", label: "List" },
  { id: "compact", label: "Compact" },
] as const;

const columnsOptions = [
  { id: "1", label: "1 column" },
  { id: "2", label: "2 columns" },
  { id: "3", label: "3 columns" },
] as const;

const gapOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
] as const;

const cardStyleOptions = [
  { id: "outlined", label: "Outlined" },
  { id: "elevated", label: "Elevated" },
  { id: "minimal", label: "Minimal" },
] as const;

const imageAspectOptions = [
  { id: "compact", label: "Compact" },
  { id: "standard", label: "Standard" },
  { id: "wide", label: "Wide" },
  { id: "square", label: "Square" },
] as const;

const paginationModeOptions = [
  { id: "none", label: "No pagination" },
  { id: "view-all", label: "View all link" },
  { id: "load-more", label: "Load more link" },
  { id: "paged", label: "Paged navigation" },
] as const;

const motionOptions: Array<{ id: PostsFeedMotion; label: string; hint: string }> = [
  { id: "none", label: "No motion", hint: "Static output with no entry animation." },
  { id: "fade", label: "Fade in", hint: "Subtle fade on initial render." },
  { id: "slide-up", label: "Slide up", hint: "Small upward reveal on initial render." },
] as const;

const NO_AUTHOR_VALUE = "__posts-feed-no-author__";

function EditorSection({
  id,
  title,
  mode,
  role,
  description,
  children,
}: {
  id?: string;
  title: string;
  mode: "wizard" | "visual" | "advanced";
  role:
    | "setup"
    | "source"
    | "content"
    | "visual"
    | "layout"
    | "technical"
    | "diagnostics"
    | "summary";
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection
      id={resolvedId}
      title={title}
      mode={mode}
      role={role}
      description={description}
    >
      {children}
    </WidgetEditorSection>
  );
}

function updateValue(
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  updater: (current: PostsFeedData) => PostsFeedData
) {
  const current = normalizePostsFeedData(value);
  const next = updater(current);
  onChange(normalizePostsFeedData(next));
}

function updateStyle(
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  patch: Partial<NonNullable<PostsFeedData["style"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateSource(
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  patch: Partial<NonNullable<PostsFeedData["source"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    source: {
      ...current.source,
      ...patch,
    },
  }));
}

function updateFields(
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  patch: Partial<NonNullable<PostsFeedData["fields"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    fields: {
      ...current.fields,
      ...patch,
    },
  }));
}

function updatePagination(
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  patch: Partial<NonNullable<PostsFeedData["pagination"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    pagination: {
      ...current.pagination,
      ...patch,
    },
  }));
}

function clearStyle(
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  key: keyof NonNullable<PostsFeedData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function ColorField({
  id,
  path,
  label,
  value,
  onChange,
  onClear,
  pickerFallback,
}: {
  id: string;
  path: string;
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear: () => void;
  pickerFallback: string;
}) {
  return (
    <WidgetControlRow id={id} label={label} path={path} hideLabel>
      {() => (
        <SharedColorControl
          label={label}
          value={value}
          onChange={onChange}
          onClear={onClear}
          pickerFallback={pickerFallback}
          showValueInput={false}
        />
      )}
    </WidgetControlRow>
  );
}

function resolvePostsCatalogError(error: unknown) {
  if (isSessionExpiredApiError(error)) {
    return {
      message: "Your admin session expired. Sign in again to refresh Posts Feed data.",
      needsAuth: true,
    };
  }
  if (isApiClientError(error)) {
    if (error.status === 401 || error.status === 403) {
      return {
        message: "Post catalog is unavailable until you sign in again.",
        needsAuth: true,
      };
    }
    return {
      message: error.message,
      needsAuth: false,
    };
  }
  return {
    message: "Failed to load posts.",
    needsAuth: false,
  };
}

function formatResolvedTimestamp(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function resolveInvalidDateNotice(
  rawValue: unknown,
  normalizedValue: string | undefined,
  label: string
) {
  if (typeof rawValue !== "string") return null;
  const trimmed = rawValue.trim();
  if (trimmed.length === 0 || normalizedValue?.trim()) return null;
  return `${label} was invalid and has been cleared from the active filter.`;
}

function buildPostsFeedPreviewKey(normalized: PostsFeedData) {
  return JSON.stringify({
    source: normalized.source ?? {},
    fields: normalized.fields ?? {},
    title: normalized.title ?? "",
    description: normalized.description ?? "",
    pagination: normalized.pagination ?? {},
    style: {
      imageAspect: normalized.style?.imageAspect ?? "standard",
    },
  });
}

function usePostOptions() {
  const [items, setItems] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    listPostsCached({ force: true })
      .then((next) => {
        if (!active) return;
        setItems(next);
      })
      .catch((err) => {
        if (!active) return;
        const resolved = resolvePostsCatalogError(err);
        setError(resolved.message);
        setNeedsAuth(resolved.needsAuth);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return {
    items,
    loading,
    error,
    needsAuth,
    retry: () => {
      setLoading(true);
      setError(null);
      setNeedsAuth(false);
      setReloadKey((current) => current + 1);
    },
  };
}

function buildAuthorOptions(posts: PostSummary[]) {
  const byId = new Map<
    string,
    {
      id: string;
      label: string;
      searchText: string;
    }
  >();

  for (const post of posts) {
    const authorId = post.author?.id?.trim();
    if (!authorId || byId.has(authorId)) continue;
    const label = post.author?.name?.trim() || post.author?.email?.trim() || authorId;
    byId.set(authorId, {
      id: authorId,
      label,
      searchText: `${label} ${post.author?.email ?? ""}`.trim().toLowerCase(),
    });
  }

  return Array.from(byId.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function resolvePreviewResourceWarning(kind: "routes" | "media", error: unknown) {
  if (isSessionExpiredApiError(error)) {
    return kind === "routes"
      ? "Your admin session expired. Sign in again to refresh Posts Feed preview links."
      : "Your admin session expired. Sign in again to refresh Posts Feed preview images.";
  }
  if (isApiClientError(error)) {
    if (error.status === 401 || error.status === 403) {
      return kind === "routes"
        ? "Preview links are unavailable until you sign in again."
        : "Preview images are unavailable until you sign in again.";
    }
    return kind === "routes"
      ? `Preview links could not be loaded: ${error.message}`
      : `Preview images could not be loaded: ${error.message}`;
  }
  return kind === "routes"
    ? "Preview links could not be loaded."
    : "Preview images could not be loaded.";
}

function usePostsFeedPreviewResources(active: boolean) {
  const [contentRoutes, setContentRoutes] = useState<SiteContentRoute[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(active);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!active || loaded) return;

    let activeRequest = true;

    Promise.allSettled([getSiteSettings(), listMediaCached({ force: false })])
      .then(([settingsResult, mediaResult]) => {
        if (!activeRequest) return;

        const warnings: string[] = [];

        if (settingsResult.status === "fulfilled") {
          setContentRoutes(settingsResult.value.contentRoutes ?? []);
        } else {
          setContentRoutes([]);
          warnings.push(resolvePreviewResourceWarning("routes", settingsResult.reason));
        }

        if (mediaResult.status === "fulfilled") {
          setMediaItems(mediaResult.value);
        } else {
          setMediaItems([]);
          warnings.push(resolvePreviewResourceWarning("media", mediaResult.reason));
        }

        setLoaded(true);
        setWarning(warnings.length > 0 ? warnings.join(" ") : null);
      })
      .finally(() => {
        if (!activeRequest) return;
        setLoading(false);
      });

    return () => {
      activeRequest = false;
    };
  }, [active, loaded]);

  return {
    contentRoutes,
    mediaItems,
    loading: active ? loading : false,
    warning,
  };
}

function usePostsFeedAdminPreview({
  value,
  posts,
  loading,
  error,
  contentRoutes,
  mediaItems,
  resourcesLoading,
  resourcesWarning,
  active,
  setPreviewState,
  blockId,
}: {
  value: PostsFeedData;
  posts: PostSummary[];
  loading: boolean;
  error: string | null;
  contentRoutes: SiteContentRoute[];
  mediaItems: MediaRecord[];
  resourcesLoading: boolean;
  resourcesWarning: string | null;
  active: boolean;
  setPreviewState?: (state: WidgetPreviewState | null) => void;
  blockId?: string;
}) {
  const previewInput = useMemo(() => normalizePostsFeedData(value), [value]);
  const previewKey = buildPostsFeedPreviewKey(previewInput);
  const lastPreviewStateKeyRef = useRef("");

  useEffect(() => {
    if (!active || !setPreviewState) return;

    let activeRequest = true;
    const emitPreviewState = (state: WidgetPreviewState) => {
      const stateKey = JSON.stringify(state);
      if (lastPreviewStateKeyRef.current === stateKey) return;
      lastPreviewStateKeyRef.current = stateKey;
      setPreviewState(state);
    };

    if (loading) {
      emitPreviewState({ status: "loading" });
      return () => {
        activeRequest = false;
      };
    }
    if (resourcesLoading) {
      emitPreviewState({ status: "loading" });
      return () => {
        activeRequest = false;
      };
    }

    if (error) {
      emitPreviewState({
        status: "error",
        message: error,
      });
      return () => {
        activeRequest = false;
      };
    }
    emitPreviewState({ status: "loading" });

    const mediaById = new Map(mediaItems.map((item) => [item.id, item]));
    resolvePostsFeedResolvedData(
      previewInput,
      {
        preview: true,
        contentRoutes,
        blockId,
      },
      posts,
      {
        getMediaById: async (id) => mediaById.get(id) ?? null,
      }
    )
      .then((resolved) => {
        if (!activeRequest) return;
        emitPreviewState({
          status: "ready",
          ...(resourcesWarning ? { message: resourcesWarning } : {}),
          dataPatch: {
            resolved,
          },
        });
      })
      .catch(() => {
        if (!activeRequest) return;
        emitPreviewState({
          status: "error",
          message: "Preview sync is unavailable right now.",
        });
      });

    return () => {
      activeRequest = false;
    };
  }, [
    active,
    blockId,
    contentRoutes,
    error,
    loading,
    mediaItems,
    posts,
    previewInput,
    previewKey,
    resourcesLoading,
    resourcesWarning,
    setPreviewState,
  ]);
}

function resolvePreviewResolvedData(
  normalized: PostsFeedData,
  previewState: WidgetPreviewState | null | undefined
) {
  const previewResolved =
    previewState && typeof previewState === "object" ? previewState.dataPatch?.resolved : null;
  if (previewResolved && typeof previewResolved === "object") {
    return previewResolved as NonNullable<PostsFeedData["resolved"]>;
  }
  return normalized.resolved ?? postsFeedDefaults.resolved ?? {};
}

function moveArrayItem(items: string[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (!moved) return items;
  next.splice(to, 0, moved);
  return next;
}

function ManualPostPicker({
  posts,
  selectedIds,
  loading,
  error,
  needsAuth,
  onRetry,
  onSelectedIdsChange,
}: {
  posts: PostSummary[];
  selectedIds: string[];
  loading: boolean;
  error: string | null;
  needsAuth: boolean;
  onRetry: () => void;
  onSelectedIdsChange: (nextIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const postsById = useMemo(() => new Map(posts.map((item) => [item.id, item])), [posts]);
  const searchText = query.trim().toLowerCase();
  const filteredPosts =
    searchText.length > 0
      ? posts.filter((post) => {
          const haystack = `${post.title} ${post.slug} ${(post.tags ?? []).join(" ")}`
            .trim()
            .toLowerCase();
          return haystack.includes(searchText);
        })
      : posts;

  const selectedRows = selectedIds.map((id) => ({
    id,
    post: postsById.get(id) ?? null,
  }));

  return (
    <div className="space-y-3">
      <WidgetControlRow
        id="posts-feed.wizard.manual-search"
        label="Search posts"
        ownership="action"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts"
            aria-label="Search posts for manual selection"
          />
        )}
      </WidgetControlRow>

      <div className="space-y-2" aria-live="polite">
        {loading ? <p className="text-xs text-muted-foreground">Loading posts...</p> : null}
        {error ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
            {needsAuth ? (
              <span className="text-muted-foreground">
                Sign in again, then retry the catalog request.
              </span>
            ) : null}
          </div>
        ) : null}
        {!loading && !error && posts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No posts available.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Selected order</p>
        {selectedRows.length > 0 ? (
          <div className="space-y-2">
            {selectedRows.map((entry, index) => {
              const title = entry.post?.title?.trim() || `Unavailable post (${entry.id})`;
              const slug = entry.post?.slug?.trim();
              return (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-background/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {slug ? `/${slug}` : entry.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === 0}
                      data-widget-control={`posts-feed.wizard.manual-post.${entry.id}.move-up`}
                      data-widget-control-path="source.manualPostIds"
                      data-widget-control-ownership="writable"
                      aria-label={`Move ${title} earlier`}
                      onClick={() =>
                        onSelectedIdsChange(moveArrayItem(selectedIds, index, index - 1))
                      }
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === selectedRows.length - 1}
                      data-widget-control={`posts-feed.wizard.manual-post.${entry.id}.move-down`}
                      data-widget-control-path="source.manualPostIds"
                      data-widget-control-ownership="writable"
                      aria-label={`Move ${title} later`}
                      onClick={() =>
                        onSelectedIdsChange(moveArrayItem(selectedIds, index, index + 1))
                      }
                    >
                      Down
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Choose posts below to build a manual order.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Available posts</p>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border/70 bg-background/60 p-2">
          {filteredPosts.map((post) => {
            const checked = selectedIds.includes(post.id);
            return (
              <label
                key={post.id}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 px-2 py-2 text-sm"
                data-widget-control={`posts-feed.wizard.manual-post.${post.id}.selected`}
                data-widget-control-path="source.manualPostIds"
                data-widget-control-ownership="writable"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const nextIds = checked
                      ? selectedIds.filter((id) => id !== post.id)
                      : [...selectedIds, post.id];
                    onSelectedIdsChange(nextIds);
                  }}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{post.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">/{post.slug}</span>
                </span>
              </label>
            );
          })}
          {!loading && !error && filteredPosts.length === 0 && posts.length > 0 ? (
            <p className="text-xs text-muted-foreground">No posts match that search.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AuthorFilterSelect({
  value,
  onChange,
  posts,
  loading,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  posts: PostSummary[];
  loading: boolean;
  error: string | null;
}) {
  const [search, setSearch] = useState("");
  const options = buildAuthorOptions(posts);
  const searchText = search.trim().toLowerCase();
  const filteredOptions =
    searchText.length > 0
      ? options.filter((entry) => entry.searchText.includes(searchText))
      : options;
  const selectValue = value.trim().length > 0 ? value : NO_AUTHOR_VALUE;

  return (
    <div className="space-y-2">
      <WidgetControlRow
        id="posts-feed.wizard.author-search"
        label="Search authors"
        ownership="action"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search authors"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="posts-feed.wizard.author-filter"
        label="Author filter"
        path="source.authorId"
      >
        {(fieldProps) => (
          <Select
            value={selectValue}
            onValueChange={(next) => onChange(next === NO_AUTHOR_VALUE ? "" : next)}
          >
            <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
              <SelectValue placeholder="Select author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_AUTHOR_VALUE}>No author filter</SelectItem>
              {filteredOptions.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      {loading ? <p className="text-xs text-muted-foreground">Loading authors...</p> : null}
      {error ? (
        <p className="text-xs text-destructive">Author filter is unavailable: {error}</p>
      ) : null}
    </div>
  );
}

function RuntimeStatusCard({
  value,
  context,
}: {
  value: PostsFeedData;
  context?: WidgetEditorContext;
}) {
  const normalized = normalizePostsFeedData(value);
  const resolved = resolvePreviewResolvedData(normalized, context?.previewState);
  const previewStatus = context?.previewState?.status ?? "idle";
  const previewMessage = context?.previewState?.message?.trim();
  const syncedAt = formatResolvedTimestamp(resolved.resolvedAt);
  const total = typeof resolved.total === "number" ? resolved.total : 0;
  const sourceMode = resolved.sourceMode ?? normalized.source?.mode ?? "latest";

  let toneClassName = "text-xs text-muted-foreground";
  let message = "Preview uses the saved runtime snapshot until the builder hydrates it.";
  if (previewStatus === "loading") {
    message = "Preview sync is loading the current post catalog.";
  } else if (previewStatus === "error") {
    toneClassName = "text-xs text-destructive";
    message = context?.previewState?.message ?? "Preview sync is unavailable.";
  } else if (previewStatus === "ready") {
    message = `Preview sync resolved ${total} item${total === 1 ? "" : "s"} from ${sourceMode}.`;
    if (previewMessage) {
      message = `${message} ${previewMessage}`;
    }
  } else if (resolved.error?.trim()) {
    toneClassName = "text-xs text-destructive";
    message = resolved.error.trim();
  }

  return (
    <EditorSection
      id="posts-feed.advanced.runtime-status"
      title="Runtime status"
      mode="advanced"
      role="diagnostics"
      description="Preview and runtime sync stay read-only in the editor."
    >
      <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
        <p className={toneClassName} aria-live="polite">
          {message}
        </p>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>Source mode: {sourceMode}</p>
          <p>Resolved items: {total}</p>
          <p>Last synced: {syncedAt ?? "Not synced yet"}</p>
        </div>
      </div>
    </EditorSection>
  );
}

function SourceSetup({
  value,
  onChange,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
}) {
  const normalized = normalizePostsFeedData(value);
  const mode = normalized.source?.mode ?? "latest";
  const { items: posts, loading, error, needsAuth, retry } = usePostOptions();
  const selectedManualIds = normalized.source?.manualPostIds ?? [];
  const showSortControl = mode !== "manual";
  const showCategoryFilter = mode === "category";
  const showAuthorAndDateFilters = mode !== "manual";
  const showFeaturedFirst = mode === "latest" || mode === "category";
  const invalidDateFromNotice = resolveInvalidDateNotice(
    value.source?.dateRange?.from,
    normalized.source?.dateRange?.from,
    "Date from"
  );
  const invalidDateToNotice = resolveInvalidDateNotice(
    value.source?.dateRange?.to,
    normalized.source?.dateRange?.to,
    "Date to"
  );

  return (
    <EditorSection
      id="posts-feed.wizard.source-setup"
      title="Source setup"
      mode="wizard"
      role="source"
      description="Choose how posts are selected for this widget."
    >
      <ReadonlyWidgetSummaryRow
        id="posts-feed.wizard.fixed-content-type"
        label="Content type"
        value="Posts"
        help="Posts Feed always queries the posts catalog; source mode controls which posts are selected."
      />

      <WidgetControlRow id="posts-feed.wizard.source-mode" label="Source mode" path="source.mode">
        {(fieldProps) => (
          <Select
            value={mode}
            onValueChange={(next) =>
              updateSource(value, onChange, {
                mode: sourceModeOptions.some((item) => item.id === next)
                  ? (next as PostsFeedSourceMode)
                  : "latest",
              })
            }
          >
            <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
              <SelectValue placeholder="Select source mode" />
            </SelectTrigger>
            <SelectContent>
              {sourceModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <p className="text-xs text-muted-foreground">
        {sourceModeOptions.find((item) => item.id === mode)?.hint}
      </p>

      {showCategoryFilter ? (
        <WidgetControlRow
          id="posts-feed.wizard.category-filter"
          label="Category/tag filter"
          path="source.category"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={normalized.source?.category ?? ""}
              onChange={(event) => updateSource(value, onChange, { category: event.target.value })}
              placeholder="e.g. news"
            />
          )}
        </WidgetControlRow>
      ) : null}

      {mode === "manual" ? (
        <ManualPostPicker
          posts={posts}
          selectedIds={selectedManualIds}
          loading={loading}
          error={error}
          needsAuth={needsAuth}
          onRetry={retry}
          onSelectedIdsChange={(nextIds) =>
            updateSource(value, onChange, { manualPostIds: nextIds })
          }
        />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <WidgetControlRow
          id="posts-feed.wizard.source-limit"
          label="Initial item count"
          path="source.limit"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              min={1}
              max={24}
              value={String(normalized.source?.limit ?? postsFeedDefaults.source?.limit ?? 6)}
              onChange={(event) =>
                updateSource(value, onChange, {
                  limit: Number.isFinite(Number(event.target.value))
                    ? Number(event.target.value)
                    : (postsFeedDefaults.source?.limit ?? 6),
                })
              }
            />
          )}
        </WidgetControlRow>
        {showSortControl ? (
          <WidgetControlRow id="posts-feed.wizard.source-sort" label="Sort" path="source.sort">
            {(fieldProps) => (
              <Select
                value={normalized.source?.sort ?? "published-desc"}
                onValueChange={(next) =>
                  updateSource(value, onChange, {
                    sort: sortOptions.some((item) => item.id === next)
                      ? (next as (typeof sortOptions)[number]["id"])
                      : "published-desc",
                  })
                }
              >
                <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
                  <SelectValue placeholder="Select sort" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        ) : (
          <ReadonlyWidgetSummaryRow
            id="posts-feed.wizard.manual-sort-summary"
            label="Sort"
            path="source.sort"
            value="Order is determined by your selection."
          />
        )}
      </div>

      {showAuthorAndDateFilters ? (
        <>
          <AuthorFilterSelect
            value={normalized.source?.authorId ?? ""}
            onChange={(next) => updateSource(value, onChange, { authorId: next })}
            posts={posts}
            loading={loading}
            error={error}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <WidgetControlRow
              id="posts-feed.wizard.date-from"
              label="Date from"
              path="source.dateRange.from"
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="date"
                  value={normalized.source?.dateRange?.from ?? ""}
                  onChange={(event) =>
                    updateSource(value, onChange, {
                      dateRange: {
                        ...(normalized.source?.dateRange ?? {}),
                        from: event.target.value,
                      },
                    })
                  }
                />
              )}
            </WidgetControlRow>
            <WidgetControlRow
              id="posts-feed.wizard.date-to"
              label="Date to"
              path="source.dateRange.to"
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="date"
                  value={normalized.source?.dateRange?.to ?? ""}
                  onChange={(event) =>
                    updateSource(value, onChange, {
                      dateRange: {
                        ...(normalized.source?.dateRange ?? {}),
                        to: event.target.value,
                      },
                    })
                  }
                />
              )}
            </WidgetControlRow>
          </div>
          {invalidDateFromNotice || invalidDateToNotice ? (
            <div className="space-y-1">
              {invalidDateFromNotice ? (
                <p className="text-xs text-amber-700">{invalidDateFromNotice}</p>
              ) : null}
              {invalidDateToNotice ? (
                <p className="text-xs text-amber-700">{invalidDateToNotice}</p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {showFeaturedFirst ? (
        <WidgetControlRow
          id="posts-feed.wizard.featured-first"
          label="Featured posts first"
          path="source.featuredFirst"
        >
          {(fieldProps) => (
            <Switch
              checked={Boolean(normalized.source?.featuredFirst)}
              onCheckedChange={(next) => updateSource(value, onChange, { featuredFirst: next })}
              aria-labelledby={fieldProps["aria-labelledby"]}
            />
          )}
        </WidgetControlRow>
      ) : null}
    </EditorSection>
  );
}

function PostsFeedPreviewBridge({
  value,
  context,
}: {
  value: PostsFeedData;
  context?: WidgetEditorContext;
}) {
  const active = typeof context?.setPreviewState === "function";
  const { items: posts, loading, error } = usePostOptions();
  const {
    contentRoutes,
    mediaItems,
    loading: previewResourcesLoading,
    warning: previewResourcesWarning,
  } = usePostsFeedPreviewResources(active);

  usePostsFeedAdminPreview({
    value,
    posts,
    loading,
    error,
    contentRoutes,
    mediaItems,
    resourcesLoading: previewResourcesLoading,
    resourcesWarning: previewResourcesWarning,
    active,
    setPreviewState: context?.setPreviewState,
    blockId: context?.blockId,
  });

  return null;
}

function DisplayOptions({
  value,
  onChange,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
}) {
  const normalized = normalizePostsFeedData(value);
  const fields = normalized.fields ?? postsFeedDefaults.fields!;

  const renderToggle = (
    label: string,
    checked: boolean,
    key: keyof NonNullable<PostsFeedData["fields"]>
  ) => (
    <WidgetControlRow id={`posts-feed.visual.fields.${key}`} label={label} path={`fields.${key}`}>
      {(fieldProps) => (
        <Switch
          checked={checked}
          onCheckedChange={(next) => updateFields(value, onChange, { [key]: next })}
          aria-labelledby={fieldProps["aria-labelledby"]}
        />
      )}
    </WidgetControlRow>
  );

  return (
    <EditorSection
      id="posts-feed.visual.display"
      title="Display"
      mode="visual"
      role="content"
      description="Toggle visible post metadata and actions."
    >
      {renderToggle("Show image", Boolean(fields.showImage), "showImage")}
      {renderToggle("Show excerpt", Boolean(fields.showExcerpt), "showExcerpt")}
      {renderToggle("Show author", Boolean(fields.showAuthor), "showAuthor")}
      {renderToggle("Show publish date", Boolean(fields.showDate), "showDate")}
      {renderToggle("Show CTA link", Boolean(fields.showCta), "showCta")}
    </EditorSection>
  );
}

function SectionChromeOptions({
  value,
  onChange,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
}) {
  const normalized = normalizePostsFeedData(value);

  return (
    <EditorSection
      id="posts-feed.visual.section-header"
      title="Section header"
      mode="visual"
      role="content"
      description="Optional heading and description above the posts feed."
    >
      <WidgetControlRow id="posts-feed.visual.title" label="Title" path="title">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.title ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Latest articles"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow id="posts-feed.visual.description" label="Description" path="description">
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            value={normalized.description ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={3}
            placeholder="Optional section description."
          />
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

function LayoutOptions({
  value,
  variant,
  onChange,
  onVariantChange,
}: {
  value: PostsFeedData;
  variant: string;
  onChange: (next: PostsFeedData) => void;
  onVariantChange?: (next: string) => void;
}) {
  const normalized = normalizePostsFeedData(value);
  const resolvedVariant = variantOptions.some((item) => item.id === variant) ? variant : "cards";
  const supportsColumns = resolvedVariant === "cards";

  return (
    <EditorSection
      id="posts-feed.visual.layout-style"
      title="Layout and style"
      mode="visual"
      role="visual"
      description="Card density and basic style tokens."
    >
      <WidgetControlRow id="posts-feed.visual.variant" label="Variant" path="variant">
        {() => (
          <div className="grid gap-2 sm:grid-cols-3">
            {variantOptions.map((option) => {
              const active = option.id === resolvedVariant;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`rounded-lg border px-3 py-3 text-left ${
                    active ? "border-primary bg-primary/5" : "border-border/70 bg-background/60"
                  }`}
                  aria-pressed={active}
                  onClick={() => onVariantChange?.(option.id)}
                >
                  <div className="mb-3 flex h-10 items-end gap-1">
                    {option.id === "cards" ? (
                      <>
                        <span className="h-5 flex-1 rounded bg-muted-foreground/20" />
                        <span className="h-8 flex-1 rounded bg-muted-foreground/30" />
                        <span className="h-6 flex-1 rounded bg-muted-foreground/20" />
                      </>
                    ) : option.id === "list" ? (
                      <span className="h-6 w-full rounded bg-muted-foreground/20" />
                    ) : (
                      <>
                        <span className="h-3 flex-1 rounded bg-muted-foreground/20" />
                        <span className="h-3 flex-1 rounded bg-muted-foreground/20" />
                        <span className="h-3 flex-1 rounded bg-muted-foreground/20" />
                      </>
                    )}
                  </div>
                  <p className="text-sm font-medium">{option.label}</p>
                </button>
              );
            })}
          </div>
        )}
      </WidgetControlRow>

      <div className="grid gap-2 sm:grid-cols-2">
        {supportsColumns ? (
          <WidgetControlRow id="posts-feed.visual.columns" label="Columns" path="style.columns">
            {(fieldProps) => (
              <Select
                value={normalized.style?.columns ?? "3"}
                onValueChange={(next) =>
                  updateStyle(value, onChange, {
                    columns: columnsOptions.some((item) => item.id === next)
                      ? (next as (typeof columnsOptions)[number]["id"])
                      : "3",
                  })
                }
              >
                <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
                  <SelectValue placeholder="Select columns" />
                </SelectTrigger>
                <SelectContent>
                  {columnsOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        ) : (
          <ReadonlyWidgetSummaryRow
            id="posts-feed.visual.columns-summary"
            label="Columns"
            path="style.columns"
            value="Columns only affect the cards variant."
          />
        )}

        <WidgetControlRow id="posts-feed.visual.gap" label="Gap" path="style.gap">
          {(fieldProps) => (
            <Select
              value={normalized.style?.gap ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  gap: gapOptions.some((item) => item.id === next)
                    ? (next as (typeof gapOptions)[number]["id"])
                    : "md",
                })
              }
            >
              <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
                <SelectValue placeholder="Select gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <WidgetControlRow
          id="posts-feed.visual.card-style"
          label="Card style"
          path="style.cardStyle"
        >
          {(fieldProps) => (
            <Select
              value={normalized.style?.cardStyle ?? "outlined"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  cardStyle: cardStyleOptions.some((item) => item.id === next)
                    ? (next as (typeof cardStyleOptions)[number]["id"])
                    : "outlined",
                })
              }
            >
              <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
                <SelectValue placeholder="Select card style" />
              </SelectTrigger>
              <SelectContent>
                {cardStyleOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        <WidgetControlRow
          id="posts-feed.visual.image-aspect"
          label="Image aspect"
          path="style.imageAspect"
        >
          {(fieldProps) => (
            <Select
              value={normalized.style?.imageAspect ?? "standard"}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  imageAspect: imageAspectOptions.some((item) => item.id === next)
                    ? (next as NonNullable<PostsFeedData["style"]>["imageAspect"])
                    : "standard",
                })
              }
            >
              <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
                <SelectValue placeholder="Select image aspect" />
              </SelectTrigger>
              <SelectContent>
                {imageAspectOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </div>

      <WidgetControlRow id="posts-feed.visual.cta-label" label="CTA label" path="style.ctaLabel">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.style?.ctaLabel ?? ""}
            onChange={(event) => updateStyle(value, onChange, { ctaLabel: event.target.value })}
            placeholder="Read more"
          />
        )}
      </WidgetControlRow>

      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField
          id="posts-feed.visual.background-color"
          path="style.backgroundColor"
          label="Card background"
          value={normalized.style?.backgroundColor}
          onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
          onClear={() => clearStyle(value, onChange, "backgroundColor")}
          pickerFallback="#ffffff"
        />
        <ColorField
          id="posts-feed.visual.border-color"
          path="style.borderColor"
          label="Card border"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          onClear={() => clearStyle(value, onChange, "borderColor")}
          pickerFallback="#e2e8f0"
        />
        <ColorField
          id="posts-feed.visual.text-color"
          path="style.textColor"
          label="Text color"
          value={normalized.style?.textColor}
          onChange={(next) => updateStyle(value, onChange, { textColor: next })}
          onClear={() => clearStyle(value, onChange, "textColor")}
          pickerFallback="#0f172a"
        />
      </div>

      <WidgetControlRow id="posts-feed.visual.motion" label="Entry motion" path="style.motion">
        {(fieldProps) => (
          <Select
            value={normalized.style?.motion ?? "none"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                motion: motionOptions.some((item) => item.id === next)
                  ? (next as PostsFeedMotion)
                  : "none",
              })
            }
          >
            <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
              <SelectValue placeholder="Select motion" />
            </SelectTrigger>
            <SelectContent>
              {motionOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <p className="text-xs text-muted-foreground">
        {motionOptions.find((option) => option.id === (normalized.style?.motion ?? "none"))?.hint}
      </p>
    </EditorSection>
  );
}

function PaginationOptions({
  value,
  onChange,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
}) {
  const normalized = normalizePostsFeedData(value);
  const paginationMode = normalized.pagination?.mode ?? "none";
  const paginationActive = paginationMode !== "none";

  return (
    <EditorSection
      id="posts-feed.visual.pagination"
      title="Pagination presentation"
      mode="visual"
      role="visual"
      description="Configure visitor navigation labels and page sizing."
    >
      <WidgetControlRow
        id="posts-feed.visual.pagination-mode"
        label="Pagination mode"
        path="pagination.mode"
      >
        {(fieldProps) => (
          <Select
            value={paginationMode}
            onValueChange={(next) =>
              updatePagination(value, onChange, {
                mode: paginationModeOptions.some((item) => item.id === next)
                  ? (next as NonNullable<PostsFeedData["pagination"]>["mode"])
                  : "none",
              })
            }
          >
            <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
              <SelectValue placeholder="Select pagination mode" />
            </SelectTrigger>
            <SelectContent>
              {paginationModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>

      {paginationActive ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <WidgetControlRow
            id="posts-feed.visual.pagination-page-size"
            label={paginationMode === "view-all" ? "Initial items" : "Page size"}
            path="pagination.pageSize"
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                min={1}
                max={24}
                value={String(
                  normalized.pagination?.pageSize ?? postsFeedDefaults.pagination?.pageSize ?? 6
                )}
                onChange={(event) =>
                  updatePagination(value, onChange, {
                    pageSize: Number.isFinite(Number(event.target.value))
                      ? Number(event.target.value)
                      : (postsFeedDefaults.pagination?.pageSize ?? 6),
                  })
                }
              />
            )}
          </WidgetControlRow>
          {paginationMode === "load-more" ? (
            <WidgetControlRow
              id="posts-feed.visual.load-more-label"
              label="Load more label"
              path="pagination.loadMoreLabel"
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={normalized.pagination?.loadMoreLabel ?? ""}
                  onChange={(event) =>
                    updatePagination(value, onChange, { loadMoreLabel: event.target.value })
                  }
                  placeholder="Load more"
                />
              )}
            </WidgetControlRow>
          ) : null}
          {paginationMode === "view-all" ? (
            <>
              <WidgetControlRow
                id="posts-feed.visual.view-all-label"
                label="View all label"
                path="pagination.viewAllLabel"
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={normalized.pagination?.viewAllLabel ?? ""}
                    onChange={(event) =>
                      updatePagination(value, onChange, { viewAllLabel: event.target.value })
                    }
                    placeholder="View all posts"
                  />
                )}
              </WidgetControlRow>
              <WidgetControlRow
                id="posts-feed.visual.view-all-destination"
                label="View all destination"
                path="pagination.viewAllHref"
                hideLabel
              >
                {() => (
                  <LinkDestinationField
                    fieldId="posts-feed.visual.view-all-destination"
                    label="View all destination"
                    value={normalized.pagination?.viewAllHref}
                    onChange={(next) => updatePagination(value, onChange, { viewAllHref: next })}
                    emptyLabel="Use posts list route"
                    helpText="Pick a published site page. Leave empty to use the configured posts list route."
                  />
                )}
              </WidgetControlRow>
            </>
          ) : null}
        </div>
      ) : null}
    </EditorSection>
  );
}

function EmptyStateOptions({
  value,
  onChange,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
}) {
  const normalized = normalizePostsFeedData(value);

  return (
    <EditorSection
      id="posts-feed.visual.empty-state"
      title="Empty state"
      mode="visual"
      role="content"
      description="Message shown when no posts match source."
    >
      <WidgetControlRow
        id="posts-feed.visual.empty-state-title"
        label="Empty state title"
        path="emptyState.title"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.emptyState?.title ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                emptyState: {
                  ...current.emptyState,
                  title: event.target.value,
                },
              }))
            }
            placeholder="No posts found"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="posts-feed.visual.empty-state-description"
        label="Empty state description"
        path="emptyState.description"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            value={normalized.emptyState?.description ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                emptyState: {
                  ...current.emptyState,
                  description: event.target.value,
                },
              }))
            }
            rows={3}
            placeholder="Adjust source settings or publish posts to show content here."
          />
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

function formatListValue(items: string[] | undefined) {
  if (!items || items.length === 0) return "None";
  return items.join(", ");
}

function ResolvedQueryDiagnostics({
  value,
  context,
}: {
  value: PostsFeedData;
  context?: WidgetEditorContext;
}) {
  const normalized = normalizePostsFeedData(value);
  const resolved = resolvePreviewResolvedData(normalized, context?.previewState);
  const source = normalized.source ?? postsFeedDefaults.source!;
  const pagination = normalized.pagination ?? postsFeedDefaults.pagination!;
  const resolvedItems = typeof resolved.total === "number" ? resolved.total : 0;
  const runtime = resolved.runtime ?? {};
  const sourceLabel =
    sourceModeOptions.find((option) => option.id === source.mode)?.label ?? source.mode ?? "Latest";

  return (
    <EditorSection
      id="posts-feed.advanced.resolved-query"
      title="Resolved query"
      mode="advanced"
      role="diagnostics"
      description="Read-only source and pagination summary used by runtime hydration."
    >
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.source-mode"
        label="Source mode"
        path="source.mode"
        value={sourceLabel}
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.source-limit"
        label="Initial item count"
        path="source.limit"
        value={String(source.limit ?? postsFeedDefaults.source?.limit ?? 6)}
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.source-sort"
        label="Sort"
        path="source.sort"
        value={source.mode === "manual" ? "Manual order" : source.sort}
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.source-filters"
        label="Source filters"
        path="source"
        value={
          [
            source.category ? `Category: ${source.category}` : null,
            source.authorId ? `Author: ${source.authorId}` : null,
            source.dateRange?.from ? `From: ${source.dateRange.from}` : null,
            source.dateRange?.to ? `To: ${source.dateRange.to}` : null,
            source.featuredFirst ? "Featured first" : null,
          ]
            .filter(Boolean)
            .join(" | ") || "No filters"
        }
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.manual-posts"
        label="Manual posts"
        path="source.manualPostIds"
        value={formatListValue(source.manualPostIds)}
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.pagination-mode"
        label="Pagination mode"
        path="pagination.mode"
        value={pagination.mode ?? "none"}
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.pagination-runtime"
        label="Runtime pagination"
        path="resolved.runtime"
        value={`page ${runtime.page ?? 1} of ${runtime.totalPages ?? 1}, page size ${
          runtime.pageSize ?? pagination.pageSize ?? source.limit ?? 6
        }`}
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.route-capability"
        label="Route capability"
        path="resolved.listPath"
        value={
          resolved.listPath?.trim() ? `List route: ${resolved.listPath}` : "No list route resolved"
        }
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.resolved-items"
        label="Resolved items"
        path="resolved.items"
        value={String(resolvedItems)}
      />
    </EditorSection>
  );
}

function ContractSummary() {
  return (
    <EditorSection
      id="posts-feed.advanced.contract-summary"
      title="Contract summary"
      mode="advanced"
      role="summary"
      description="Mode ownership for the Posts Feed editor contract."
    >
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.contract-wizard"
        label="Wizard"
        value="Source mode, filters, manual order, initial count, and sort."
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.contract-visual"
        label="Visual"
        value="Display fields, section header, variant, layout, style, pagination labels, and empty state."
      />
      <ReadonlyWidgetSummaryRow
        id="posts-feed.advanced.contract-advanced"
        label="Advanced"
        value="Read-only query, runtime, route, payload, and ownership diagnostics."
      />
    </EditorSection>
  );
}

function RuntimeSnapshot({
  value,
  context,
}: {
  value: PostsFeedData;
  context?: WidgetEditorContext;
}) {
  const normalized = normalizePostsFeedData(value);
  const resolved = resolvePreviewResolvedData(normalized, context?.previewState);

  return (
    <EditorSection
      id="posts-feed.advanced.runtime-payload"
      title="Runtime payload"
      mode="advanced"
      role="technical"
      description="Read-only snapshot of resolved runtime data."
    >
      <pre className="max-h-64 overflow-auto rounded-md border border-border/70 bg-background/70 p-3 text-xs">
        {JSON.stringify(resolved ?? {}, null, 2)}
      </pre>
    </EditorSection>
  );
}

function PostsFeedWizardBody(props: WidgetEditorProps<PostsFeedData>) {
  return (
    <div className="space-y-4">
      <PostsFeedPreviewBridge value={props.value} context={props.context} />
      <SourceSetup value={props.value} onChange={props.onChange} />
    </div>
  );
}

function PostsFeedVisualBody(props: WidgetEditorProps<PostsFeedData>) {
  return (
    <div className="space-y-4">
      <PostsFeedPreviewBridge value={props.value} context={props.context} />
      <DisplayOptions value={props.value} onChange={props.onChange} />
      <SectionChromeOptions value={props.value} onChange={props.onChange} />
      <LayoutOptions
        value={props.value}
        onChange={props.onChange}
        variant={props.variant}
        onVariantChange={props.onVariantChange}
      />
      <PaginationOptions value={props.value} onChange={props.onChange} />
      <EmptyStateOptions value={props.value} onChange={props.onChange} />
    </div>
  );
}

function PostsFeedAdvancedBody(props: WidgetEditorProps<PostsFeedData>) {
  return (
    <div className="space-y-4">
      <PostsFeedPreviewBridge value={props.value} context={props.context} />
      <ResolvedQueryDiagnostics value={props.value} context={props.context} />
      <RuntimeStatusCard value={props.value} context={props.context} />
      <RuntimeSnapshot value={props.value} context={props.context} />
      <ContractSummary />
    </div>
  );
}

export function PostsFeedWizardEditor(props: WidgetEditorProps<PostsFeedData>) {
  return <PostsFeedWizardBody {...props} />;
}

export function PostsFeedVisualEditor(props: WidgetEditorProps<PostsFeedData>) {
  return <PostsFeedVisualBody {...props} />;
}

export function PostsFeedAdvancedEditor(props: WidgetEditorProps<PostsFeedData>) {
  return <PostsFeedAdvancedBody {...props} />;
}
