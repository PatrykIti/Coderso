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
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { PageFilters } from "../pages/PageFilters";
import { PostsCreateDrawer } from "./PostsCreateDrawer";
import { PostsTable } from "./PostsTable";

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
  const visibleIds = useMemo(() => filteredItems.map((item) => item.id), [filteredItems]);
  const isAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
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
      if (payload.openAfterCreate) {
        navigate(`/coderso/posts/${encodeURIComponent(post.id)}`);
        return;
      }
      await refresh({ force: true, background: true });
      setCreateOpen(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create post.");
      }
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
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to publish post.");
      }
    }
  };

  const handleUnpublish = async (id: string) => {
    setError(null);
    setBulkFeedback(null);
    try {
      await unpublishPost(id);
      await refresh({ force: true, background: true });
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to unpublish post.");
      }
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

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this post? This cannot be undone.");
      if (!confirmed) return;
    }
    setError(null);
    setBulkFeedback(null);
    try {
      await deletePost(id);
      await refresh({ force: true, background: true });
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to delete post.");
      }
    }
  };

  const handleBulkApply = async () => {
    if (!bulkAction || selectedIds.length === 0) return;

    if (bulkAction === "delete" && typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete ${selectedIds.length} post${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`
      );
      if (!confirmed) return;
    }

    setError(null);
    setBulkFeedback(null);
    setIsBulkWorking(true);

    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => {
          if (bulkAction === "publish") return publishPost(id);
          if (bulkAction === "unpublish") return unpublishPost(id);
          return deletePost(id);
        })
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const successCount = results.length - failedCount;

      await refresh({ force: true, background: true });
      clearSelection();

      if (failedCount > 0) {
        setError(
          failedCount === results.length
            ? `Bulk ${bulkAction} failed for ${failedCount} selected post${failedCount === 1 ? "" : "s"}.`
            : `Bulk ${bulkAction} finished with partial failures: ${successCount} succeeded, ${failedCount} failed.`
        );
        return;
      }

      setBulkFeedback({
        title: "Bulk action completed",
        message: `Successfully applied ${bulkAction} to ${successCount} post${successCount === 1 ? "" : "s"}.`,
      });
    } finally {
      setIsBulkWorking(false);
    }
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
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create New Post
            </Button>
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
        {selectedIds.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">
                {selectedIds.length} post{selectedIds.length === 1 ? "" : "s"} selected
              </span>
              <span className="text-muted-foreground">
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
                <SelectTrigger className="h-8 w-full sm:w-[220px]">
                  <SelectValue placeholder="Bulk actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publish">Publish</SelectItem>
                  <SelectItem value="unpublish">Move to Draft</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkApply} disabled={!bulkAction || isBulkWorking}>
                {isBulkWorking ? "Applying..." : "Apply"}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
            </div>
          </div>
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
            items={filteredItems}
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
    </AdminShell>
  );
}
