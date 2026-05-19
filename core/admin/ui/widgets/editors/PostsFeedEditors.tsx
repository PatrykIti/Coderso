import { useEffect, useMemo, useState, type ReactNode } from "react";

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
import { isApiClientError } from "@/services/apiClient";
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
import { ClearableInputField } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

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
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
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

function resolvePostsCatalogError(error: unknown) {
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
  const previewKey = buildPostsFeedPreviewKey(normalizePostsFeedData(value));

  useEffect(() => {
    if (!active || !setPreviewState) return;

    let activeRequest = true;

    if (loading) {
      setPreviewState({ status: "loading" });
      return () => {
        activeRequest = false;
      };
    }
    if (resourcesLoading) {
      setPreviewState({ status: "loading" });
      return () => {
        activeRequest = false;
      };
    }

    if (error) {
      setPreviewState({
        status: "error",
        message: error,
      });
      return () => {
        activeRequest = false;
      };
    }
    setPreviewState({ status: "loading" });

    const mediaById = new Map(mediaItems.map((item) => [item.id, item]));
    resolvePostsFeedResolvedData(
      normalizePostsFeedData(value),
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
        setPreviewState({
          status: "ready",
          ...(resourcesWarning ? { message: resourcesWarning } : {}),
          dataPatch: {
            resolved,
          },
        });
      })
      .catch(() => {
        if (!activeRequest) return;
        setPreviewState({
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
    previewKey,
    resourcesLoading,
    resourcesWarning,
    setPreviewState,
    value,
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
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search posts"
        aria-label="Search posts for manual selection"
      />

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
      <p className="text-sm font-medium">Author filter</p>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search authors"
      />
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(next === NO_AUTHOR_VALUE ? "" : next)}
      >
        <SelectTrigger>
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
      title="Runtime status"
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
  context,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
  context?: WidgetEditorContext;
}) {
  const normalized = normalizePostsFeedData(value);
  const mode = normalized.source?.mode ?? "latest";
  const { items: posts, loading, error, needsAuth, retry } = usePostOptions();
  const {
    contentRoutes,
    mediaItems,
    loading: previewResourcesLoading,
    warning: previewResourcesWarning,
  } = usePostsFeedPreviewResources(typeof context?.setPreviewState === "function");
  const selectedManualIds = normalized.source?.manualPostIds ?? [];
  const paginationMode = normalized.pagination?.mode ?? "none";
  const paginationActive = paginationMode !== "none";
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

  usePostsFeedAdminPreview({
    value,
    posts,
    loading,
    error,
    contentRoutes,
    mediaItems,
    resourcesLoading: previewResourcesLoading,
    resourcesWarning: previewResourcesWarning,
    active: typeof context?.setPreviewState === "function",
    setPreviewState: context?.setPreviewState,
    blockId: context?.blockId,
  });

  return (
    <EditorSection
      title="Source setup"
      description="Choose how posts are selected for this widget."
    >
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
        <SelectTrigger>
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
      <p className="text-xs text-muted-foreground">
        {sourceModeOptions.find((item) => item.id === mode)?.hint}
      </p>

      {showCategoryFilter ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Category/tag filter</p>
          <Input
            value={normalized.source?.category ?? ""}
            onChange={(event) => updateSource(value, onChange, { category: event.target.value })}
            placeholder="e.g. news"
          />
        </div>
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
        <div className="space-y-2">
          <p className="text-sm font-medium">Limit</p>
          <Input
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
        </div>
        {showSortControl ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sort</p>
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
              <SelectTrigger>
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
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sort</p>
            <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
              Order is determined by your selection.
            </div>
          </div>
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
            <div className="space-y-2">
              <p className="text-sm font-medium">Date from</p>
              <Input
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
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Date to</p>
              <Input
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
            </div>
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
        <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
          <span>Featured posts first</span>
          <Switch
            checked={Boolean(normalized.source?.featuredFirst)}
            onCheckedChange={(next) => updateSource(value, onChange, { featuredFirst: next })}
          />
        </label>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Pagination mode</p>
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
          <SelectTrigger>
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
      </div>

      {paginationActive ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {paginationMode === "view-all" ? "Initial items" : "Page size"}
            </p>
            <Input
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
          </div>
          {paginationMode === "load-more" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Load more label</p>
              <Input
                value={normalized.pagination?.loadMoreLabel ?? ""}
                onChange={(event) =>
                  updatePagination(value, onChange, { loadMoreLabel: event.target.value })
                }
                placeholder="Load more"
              />
            </div>
          ) : null}
          {paginationMode === "view-all" ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">View all label</p>
                <Input
                  value={normalized.pagination?.viewAllLabel ?? ""}
                  onChange={(event) =>
                    updatePagination(value, onChange, { viewAllLabel: event.target.value })
                  }
                  placeholder="View all posts"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">View all href</p>
                <Input
                  value={normalized.pagination?.viewAllHref ?? ""}
                  onChange={(event) =>
                    updatePagination(value, onChange, { viewAllHref: event.target.value })
                  }
                  placeholder="Leave empty to use the posts list route"
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </EditorSection>
  );
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
    <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={(next) => updateFields(value, onChange, { [key]: next })}
      />
    </label>
  );

  return (
    <EditorSection title="Display" description="Toggle visible post metadata and actions.">
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
      title="Section header"
      description="Optional heading and description above the posts feed."
    >
      <Input
        value={normalized.title ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            title: event.target.value,
          }))
        }
        placeholder="Latest articles"
      />
      <Textarea
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
    <EditorSection title="Layout and style" description="Card density and basic style tokens.">
      <div className="space-y-2">
        <p className="text-sm font-medium">Variant</p>
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
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {supportsColumns ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Columns</p>
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
              <SelectTrigger>
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
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Columns</p>
            <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
              Columns only affect the cards variant.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Gap</p>
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
            <SelectTrigger>
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
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Card style</p>
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
            <SelectTrigger>
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
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Image aspect</p>
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
            <SelectTrigger>
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
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">CTA label</p>
        <Input
          value={normalized.style?.ctaLabel ?? ""}
          onChange={(event) => updateStyle(value, onChange, { ctaLabel: event.target.value })}
          placeholder="Read more"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ClearableInputField
          label="Card background"
          value={normalized.style?.backgroundColor}
          onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
          onClear={() => clearStyle(value, onChange, "backgroundColor")}
          placeholder="var(--color-bg)"
        />
        <ClearableInputField
          label="Card border"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          onClear={() => clearStyle(value, onChange, "borderColor")}
          placeholder="var(--color-border)"
        />
        <ClearableInputField
          label="Text color"
          value={normalized.style?.textColor}
          onChange={(next) => updateStyle(value, onChange, { textColor: next })}
          onClear={() => clearStyle(value, onChange, "textColor")}
          placeholder="var(--color-text)"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Entry motion</p>
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
          <SelectTrigger>
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
        <p className="text-xs text-muted-foreground">
          {motionOptions.find((option) => option.id === (normalized.style?.motion ?? "none"))?.hint}
        </p>
      </div>
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
    <EditorSection title="Empty state" description="Message shown when no posts match source.">
      <Input
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
      <Textarea
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
      title="Runtime payload"
      description="Read-only snapshot of resolved runtime data."
    >
      <pre className="max-h-64 overflow-auto rounded-md border border-border/70 bg-background/70 p-3 text-xs">
        {JSON.stringify(resolved ?? {}, null, 2)}
      </pre>
    </EditorSection>
  );
}

function PostsFeedWizardBody(props: WidgetEditorProps<PostsFeedData>) {
  const [step, setStep] = useState<"source" | "display" | "layout">("source");
  const stepOrder: Array<"source" | "display" | "layout"> = ["source", "display", "layout"];
  const currentIndex = stepOrder.indexOf(step);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {stepOrder.map((item, index) => (
          <button
            key={item}
            type="button"
            className={`rounded-full border px-3 py-1 ${
              index === currentIndex
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border/70"
            }`}
            onClick={() => setStep(item)}
          >
            {index + 1}. {item === "source" ? "Source" : item === "display" ? "Display" : "Layout"}
          </button>
        ))}
      </div>
      {step === "source" ? (
        <SourceSetup value={props.value} onChange={props.onChange} context={props.context} />
      ) : null}
      {step === "display" ? (
        <>
          <DisplayOptions value={props.value} onChange={props.onChange} />
          <SectionChromeOptions value={props.value} onChange={props.onChange} />
        </>
      ) : null}
      {step === "layout" ? (
        <>
          <LayoutOptions
            value={props.value}
            onChange={props.onChange}
            variant={props.variant}
            onVariantChange={props.onVariantChange}
          />
          <EmptyStateOptions value={props.value} onChange={props.onChange} />
          <RuntimeStatusCard value={props.value} context={props.context} />
        </>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => setStep(stepOrder[Math.max(0, currentIndex - 1)] ?? "source")}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentIndex === stepOrder.length - 1}
          onClick={() =>
            setStep(stepOrder[Math.min(stepOrder.length - 1, currentIndex + 1)] ?? "layout")
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function PostsFeedVisualBody(props: WidgetEditorProps<PostsFeedData>) {
  return (
    <div className="space-y-3">
      <SourceSetup value={props.value} onChange={props.onChange} context={props.context} />
      <RuntimeStatusCard value={props.value} context={props.context} />
      <DisplayOptions value={props.value} onChange={props.onChange} />
      <SectionChromeOptions value={props.value} onChange={props.onChange} />
      <LayoutOptions
        value={props.value}
        onChange={props.onChange}
        variant={props.variant}
        onVariantChange={props.onVariantChange}
      />
      <EmptyStateOptions value={props.value} onChange={props.onChange} />
    </div>
  );
}

function PostsFeedAdvancedBody(props: WidgetEditorProps<PostsFeedData>) {
  return (
    <div className="space-y-3">
      <SourceSetup value={props.value} onChange={props.onChange} context={props.context} />
      <RuntimeStatusCard value={props.value} context={props.context} />
      <DisplayOptions value={props.value} onChange={props.onChange} />
      <SectionChromeOptions value={props.value} onChange={props.onChange} />
      <LayoutOptions
        value={props.value}
        onChange={props.onChange}
        variant={props.variant}
        onVariantChange={props.onVariantChange}
      />
      <EmptyStateOptions value={props.value} onChange={props.onChange} />
      <RuntimeSnapshot value={props.value} context={props.context} />
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
