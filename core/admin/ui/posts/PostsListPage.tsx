import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createPost,
  deletePost,
  duplicatePost,
  getCachedPosts,
  listPostsCached,
  previewPost,
  publishPost,
  type PostSummary,
  unpublishPost,
} from "@/services/postsClient";
import {
  getSiteSettings,
  resolvePostSlugRouteContext,
  type PostSlugRouteContext,
} from "@/services/siteSettingsClient";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { ListPaginationFooter } from "@/ui/shared/ListPaginationFooter";
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useListPagination } from "@/ui/shared/useListPagination";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { PageFilters } from "../pages/PageFilters";
import { PostsCreateDrawer } from "./PostsCreateDrawer";
import { PostsTable } from "./PostsTable";

const postListToasts = createListActionToastAdapter({
  labels: { singular: "post", plural: "posts" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    publish: { pastTense: "published", failureVerb: "publish" },
    unpublish: { pastTense: "unpublished", failureVerb: "unpublish" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});

export function filterPosts(
  posts: PostSummary[],
  query: string,
  status: string,
  author: string
) {
  const normalized = query.trim().toLowerCase();
  return posts.filter((post) => {
    const matchesQuery =
      !normalized ||
      post.title.toLowerCase().includes(normalized) ||
      post.slug.toLowerCase().includes(normalized) ||
      (post.tags ?? []).some((tag) => tag.toLowerCase().includes(normalized));
    const matchesStatus = status === "all" || post.status === status;
    const matchesAuthor = author === "any" || post.author?.id === author;
    return matchesQuery && matchesStatus && matchesAuthor;
  });
}

const resolvePostsRefreshBackground = (input: {
  explicitBackground?: boolean;
  hasHydrated: boolean;
  hasInitialCache: boolean;
}) => {
  if (typeof input.explicitBackground === "boolean") {
    return input.explicitBackground;
  }
  return input.hasHydrated || input.hasInitialCache;
};

export function PostsListPage() {
  const { navigate } = useAdminRouter();
  const initialCached = useMemo(() => getCachedPosts(), []);
  const hasInitialCache = initialCached !== null;
  const [items, setItems] = useState<PostSummary[]>(() => initialCached ?? []);
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("any");
  const [openAfterCreate, setOpenAfterCreate] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"" | "publish" | "unpublish" | "delete">("");
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const [bulkFeedback, setBulkFeedback] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [slugRouteContext, setSlugRouteContext] = useState<PostSlugRouteContext>(() =>
    resolvePostSlugRouteContext(null)
  );
  const hasHydratedRef = useRef(hasInitialCache);

  const refresh = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? false;
      const background = resolvePostsRefreshBackground({
        explicitBackground: options?.background,
        hasHydrated: hasHydratedRef.current,
        hasInitialCache,
      });

      if (!background) setIsLoading(true);
      setError(null);
      try {
        const next = await listPostsCached({ force });
        setItems(next);
        hasHydratedRef.current = true;
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load posts.");
        }
      } finally {
        if (!background) setIsLoading(false);
      }
    },
    [hasInitialCache]
  );

  useEffect(() => {
    refresh({ force: true, background: hasInitialCache }).catch(() => undefined);
  }, [hasInitialCache, refresh]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postsList) return;
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [refresh]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prefs = await getUserSettings();
        if (!active) return;
        setOpenAfterCreate(prefs["pages.openAfterCreate"]);
      } catch {
        // Ignore preference load failures; defaults will be used.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const settings = await getSiteSettings();
        if (!active) return;
        setSlugRouteContext(resolvePostSlugRouteContext(settings));
      } catch {
        if (!active) return;
        setSlugRouteContext(resolvePostSlugRouteContext(null));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const authorOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (!item.author) return;
      map.set(item.author.id, item.author.name ?? item.author.email);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filteredItems = useMemo(
    () => filterPosts(items, searchQuery, statusFilter, authorFilter),
    [items, searchQuery, statusFilter, authorFilter]
  );
  const pagination = useListPagination(filteredItems, {
    resetKey: JSON.stringify({
      searchQuery,
      statusFilter,
      authorFilter,
    }),
  });
  const visibleIds = useMemo(
    () => pagination.visibleRows.map((item) => item.id),
    [pagination.visibleRows]
  );
  const isAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => visibleIds.includes(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setBulkAction("");
  }, []);

  const handleTogglePost = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entryId) => entryId !== id) : [...prev, id]
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds(isAllSelected ? [] : visibleIds);
  }, [isAllSelected, visibleIds]);

  const handleCreate = async (payload: {
    title: string;
    slug: string;
    openAfterCreate: boolean;
  }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const post = await createPost({
        title: payload.title,
        slug: payload.slug,
        data: {},
      });
      postListToasts.success("create", { targetLabel: post.title });
      if (payload.openAfterCreate) {
        navigate(`/coderso/posts/${encodeURIComponent(post.id)}`);
        return;
      }
      await refresh({ force: true, background: true });
      setCreateOpen(false);
    } catch (err) {
      setError(postListToasts.error("create", err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/coderso/posts/${encodeURIComponent(id)}`);
  };

  const handlePreview = async (id: string) => {
    setError(null);
    try {
      const { previewUrl } = await previewPost(id);
      if (typeof window !== "undefined") {
        window.open(previewUrl, "_blank", "noopener");
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to generate preview.");
      }
    }
  };

  const handlePublish = async (id: string) => {
    setError(null);
    setBulkFeedback(null);
    try {
      await publishPost(id);
      await refresh({ force: true, background: true });
      postListToasts.success("publish");
    } catch (err) {
      setError(postListToasts.error("publish", err));
    }
  };

  const handleUnpublish = async (id: string) => {
    setError(null);
    setBulkFeedback(null);
    try {
      await unpublishPost(id);
      await refresh({ force: true, background: true });
      postListToasts.success("unpublish");
    } catch (err) {
      setError(postListToasts.error("unpublish", err));
    }
  };

  const handleDuplicate = async (id: string) => {
    setError(null);
    setBulkFeedback(null);
    try {
      const clone = await duplicatePost(id);
      navigate(`/coderso/posts/${encodeURIComponent(clone.id)}`);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to duplicate post.");
      }
    }
  };

  const runDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    setBulkFeedback(null);
    try {
      await deletePost(id);
      await refresh({ force: true, background: true });
      postListToasts.success("delete");
      setPendingDeleteId(null);
    } catch (err) {
      setError(postListToasts.error("delete", err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const runBulkAction = async (
    action: "publish" | "unpublish" | "delete",
    ids: string[]
  ) => {
    if (ids.length === 0) return;
    setError(null);
    setBulkFeedback(null);
    setIsBulkWorking(true);

    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "publish") return publishPost(id);
          if (action === "unpublish") return unpublishPost(id);
          return deletePost(id);
        })
      );

      const summary = postListToasts.summarizeBulkAction(action, ids, results);

      await refresh({ force: true, background: true });
      clearSelection();
      postListToasts.emitBulk(summary);

      if (!summary.ok) {
        setError(summary.inlineMessage);
        return;
      }

      setBulkFeedback({
        title: "Bulk action completed",
        message: summary.inlineMessage,
      });
    } finally {
      setIsBulkWorking(false);
      setPendingBulkDeleteIds([]);
    }
  };

  const handleBulkApply = () => {
    if (!bulkAction || selectedIds.length === 0) return;

    if (bulkAction === "delete") {
      setPendingBulkDeleteIds(selectedIds);
      return;
    }

    void runBulkAction(bulkAction, selectedIds);
  };

  const handleDrawerOpenChange = (next: boolean) => {
    setCreateOpen(next);
    if (next) setDrawerKey((prev) => prev + 1);
  };

  const handleOpenAfterCreateChange = async (next: boolean) => {
    setOpenAfterCreate(next);
    try {
      await setUserSetting("pages.openAfterCreate", next);
    } catch {
      // Keep UI responsive even if preference persistence fails.
    }
  };

  return (
    <AdminShell
      activeHref="/admin/posts"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Posts</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Posts"
          description="Create and publish articles rendered by widgets and templates."
          actions={
            <>
              {selectedIds.length > 0 ? (
                <div
                  data-post-bulk-actions="inline"
                  className="flex min-w-0 flex-wrap items-center justify-end gap-2"
                >
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    <span className="font-semibold text-foreground">
                      {selectedIds.length} post{selectedIds.length === 1 ? "" : "s"} selected
                    </span>
                    <span className="sr-only">
                      Apply a bulk action to the visible selection.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={bulkAction}
                      onValueChange={(value) =>
                        setBulkAction(value as "" | "publish" | "unpublish" | "delete")
                      }
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue placeholder="Bulk actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="publish">Publish</SelectItem>
                        <SelectItem value="unpublish">Move to Draft</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleBulkApply}
                      disabled={!bulkAction || isBulkWorking}
                    >
                      {isBulkWorking ? "Applying..." : "Apply"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      aria-label="Clear selection"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : null}
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Posts API error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {bulkFeedback ? (
          <Alert>
            <AlertTitle>{bulkFeedback.title}</AlertTitle>
            <AlertDescription>{bulkFeedback.message}</AlertDescription>
          </Alert>
        ) : null}
        <PageFilters
          search={searchQuery}
          status={statusFilter}
          author={authorFilter}
          authorOptions={authorOptions}
          searchPlaceholder="Search posts by title..."
          searchAriaLabel="Search posts by title"
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onAuthorChange={setAuthorFilter}
        />
        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading posts...
          </div>
        ) : (
          <PostsTable
            items={pagination.visibleRows}
            emptyMessage={
              items.length > 0
                ? "No posts match your current filters."
                : undefined
            }
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            onToggleAll={handleToggleAll}
            onTogglePost={handleTogglePost}
            onEdit={handleEdit}
            onPreview={handlePreview}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}
        <ListPaginationFooter
          resourceLabel="posts"
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>
      <PostsCreateDrawer
        key={drawerKey}
        open={createOpen}
        onOpenChange={handleDrawerOpenChange}
        onCreate={handleCreate}
        openAfterCreate={openAfterCreate}
        onOpenAfterCreateChange={handleOpenAfterCreateChange}
        isSubmitting={isSubmitting}
        error={error}
        slugRouteContext={slugRouteContext}
      />
      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete post?"
        description="Delete this post? This cannot be undone."
        confirmLabel="Delete post"
        confirmingLabel="Deleting..."
        isConfirming={deletingId === pendingDeleteId}
        onConfirm={() => {
          if (pendingDeleteId) return runDelete(pendingDeleteId);
        }}
      />
      <ConfirmActionDialog
        open={pendingBulkDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDeleteIds([]);
        }}
        title="Delete selected posts?"
        description={`Delete ${pendingBulkDeleteIds.length} post${pendingBulkDeleteIds.length === 1 ? "" : "s"}? This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isBulkWorking}
        onConfirm={() => runBulkAction("delete", pendingBulkDeleteIds)}
      />
    </AdminShell>
  );
}
