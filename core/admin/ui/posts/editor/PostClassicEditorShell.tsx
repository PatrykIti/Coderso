import { Eye, RefreshCcw, Save, Send, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedPostDetail,
  getPostCached,
  previewPost,
  publishPost,
  updatePost,
  updatePostMetadata,
  type PostDetail,
  type PostStatus,
} from "@/services/postsClient";
import { EntryMetadataPanel, type EntryStatus } from "@/ui/entries/EntryMetadataPanel";
import { buildEntryChecklist } from "@/ui/entries/entryChecklist";
import { EntryEditorHeader } from "@/ui/entries/EntryEditorHeader";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import type { ContentField } from "../../content-types/SchemaBuilder";

const resolvePostIdFromPath = (path: string): string | null => {
  const pathname = path.split(/[?#]/)[0] ?? "";
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "posts");
  if (index === -1) return null;
  const raw = parts[index + 1] ?? null;
  return raw ? decodeURIComponent(raw) : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readOptionalString = (value: unknown) => (typeof value === "string" ? value : "");

const readOptionalBoolean = (value: unknown) => value === true;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const classicFields: ContentField[] = [
  {
    id: "post-excerpt",
    name: "excerpt",
    label: "Excerpt",
    type: "text",
    required: false,
  },
  {
    id: "post-content",
    name: "content",
    label: "Content",
    type: "richtext",
    required: false,
  },
  {
    id: "post-featured-image",
    name: "featuredImage",
    label: "Featured image",
    type: "media",
    required: false,
  },
  {
    id: "post-featured",
    name: "featured",
    label: "Featured",
    type: "boolean",
    required: false,
  },
];

const buildClassicDocument = (title: string, content: string, excerpt: string) => ({
  version: 1,
  blocks: [
    {
      id: "classic-block-1",
      type: "paragraph",
      attrs: {},
      content: content || excerpt || "",
    },
  ],
  meta: {
    ...(title.trim() ? { title: title.trim() } : {}),
    ...(excerpt.trim() ? { excerpt: excerpt.trim() } : {}),
  },
});

const parseStatus = (value: PostStatus): EntryStatus => {
  if (value === "published" || value === "scheduled" || value === "archived") {
    return value;
  }
  return "draft";
};

export function PostClassicEditorShell() {
  const { path } = useAdminRouter();
  const postId = useMemo(() => resolvePostIdFromPath(path), [path]);

  const [post, setPost] = useState<PostDetail | null>(() =>
    postId ? getCachedPostDetail(postId) : null
  );
  const [title, setTitle] = useState(() => post?.title ?? "");
  const [slug, setSlug] = useState(() => post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(() =>
    readOptionalString(isRecord(post?.data) ? post?.data.excerpt : undefined)
  );
  const [content, setContent] = useState(() =>
    readOptionalString(isRecord(post?.data) ? post?.data.content : undefined)
  );
  const [featuredImage, setFeaturedImage] = useState(() =>
    readOptionalString(isRecord(post?.data) ? post?.data.featuredImage : undefined)
  );
  const [featured, setFeatured] = useState(() =>
    readOptionalBoolean(isRecord(post?.data) ? post?.data.featured : undefined)
  );

  const [status, setStatus] = useState<EntryStatus>(() => parseStatus(post?.status ?? "draft"));
  const [scheduledAt, setScheduledAt] = useState(() => post?.scheduledAt ?? "");
  const [seoDescription, setSeoDescription] = useState(() => post?.seo?.description ?? "");

  const [isLoading, setIsLoading] = useState(() => !post);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);

  const hasUnsavedChangesRef = useRef(false);
  const setUnsavedChanges = useCallback((value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  }, []);

  const applyPost = useCallback(
    (next: PostDetail) => {
      setPost(next);
      setTitle(next.title);
      setSlug(next.slug);
      const source = isRecord(next.data) ? next.data : {};
      setExcerpt(readOptionalString(source.excerpt));
      setContent(readOptionalString(source.content));
      setFeaturedImage(readOptionalString(source.featuredImage));
      setFeatured(readOptionalBoolean(source.featured));
      setStatus(parseStatus(next.status));
      setScheduledAt(next.scheduledAt ?? "");
      setSeoDescription(next.seo?.description ?? "");
      setError(null);
      setRemoteUpdatePending(false);
      setUnsavedChanges(false);
    },
    [setUnsavedChanges]
  );

  const refreshPost = useCallback(
    async (options?: { allowUnsaved?: boolean; setLoading?: boolean }) => {
      if (!postId) return;
      const shouldSetLoading = options?.setLoading !== false;
      if (shouldSetLoading) setIsLoading(true);
      setError(null);
      try {
        const refreshed = await getPostCached(postId, { force: true });
        if (!refreshed) {
          setError("Post not found.");
          return;
        }
        if (!options?.allowUnsaved && hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyPost(refreshed);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load post.");
        }
      } finally {
        if (shouldSetLoading) setIsLoading(false);
      }
    },
    [applyPost, postId]
  );

  useEffect(() => {
    if (!postId) return;
    let active = true;
    getPostCached(postId, { force: true })
      .then((refreshed) => {
        if (!active || !refreshed) return;
        if (hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyPost(refreshed);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load post.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyPost, postId]);

  useEffect(() => {
    if (!postId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postDetail(postId)) return;
      refreshPost({ setLoading: false }).catch(() => undefined);
    });
  }, [postId, refreshPost]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setUnsavedChanges(true);
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setUnsavedChanges(true);
  };

  const handleSaveDraft = async () => {
    if (!postId) return;
    setIsSaving(true);
    setError(null);
    try {
      const source = isRecord(post?.data) ? post.data : {};
      const updated = await updatePost(postId, {
        title,
        slug,
        data: {
          ...source,
          excerpt,
          content,
          featuredImage,
          featured,
          document: buildClassicDocument(title, content, excerpt),
        },
      });
      if (updated) {
        applyPost(updated);
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save post.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const checklist = useMemo(
    () =>
      buildEntryChecklist({
        title,
        slug,
        status,
        scheduledAt,
        fields: classicFields,
        values: { excerpt, content, featuredImage, featured },
      }),
    [content, excerpt, featured, featuredImage, scheduledAt, slug, status, title]
  );

  const handlePublish = async () => {
    if (!postId) return;
    if (checklist.blockingIssues.length > 0) {
      setError(checklist.blockingIssues.join(" "));
      return;
    }

    setIsPublishing(true);
    setError(null);
    try {
      if (status === "published") {
        await handleSaveDraft();
      } else {
        await publishPost(postId);
        await refreshPost({ allowUnsaved: true, setLoading: false });
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to publish post.");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!postId) return;
    setIsSavingMetadata(true);
    setError(null);

    let scheduledAtIso: string | null = null;
    if (scheduledAt.trim()) {
      const parsed = new Date(scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        setError("Schedule date must be a valid ISO timestamp.");
        setIsSavingMetadata(false);
        return;
      }
      scheduledAtIso = parsed.toISOString();
    }

    if (status === "scheduled" && !scheduledAtIso) {
      setError("Schedule date is required for scheduled entries.");
      setIsSavingMetadata(false);
      return;
    }

    try {
      const updated = await updatePostMetadata(postId, {
        status,
        scheduledAt: status === "scheduled" ? scheduledAtIso : null,
        seo: { description: seoDescription },
      });
      if (updated) {
        applyPost(updated);
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save metadata.");
      }
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handlePreview = async () => {
    setPreviewOpen(true);
    if (!postId) {
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewUrl(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewPost(postId, 30);
      setPreviewUrl(result.previewUrl);
    } catch (err) {
      if (isApiClientError(err)) {
        setPreviewError(err.message);
      } else {
        setPreviewError("Failed to generate preview.");
      }
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/coderso/posts"
      showSearch={false}
      contentClassName="p-0 overflow-hidden"
      breadcrumbs={
        <EntryEditorHeader
          status={status}
          hasUnsavedChanges={hasUnsavedChanges}
          contentType="Posts"
          entryLabel={post?.title ?? "Edit Post"}
        />
      }
    >
      <div className="flex h-full min-h-0">
        <div className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-6 py-3 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handlePreview}
                  disabled={isLoading}
                >
                  <Eye className="h-4 w-4" />
                  Runtime preview
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={handleSaveDraft}
                    disabled={isSaving || isLoading}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save draft"}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handlePublish}
                    disabled={isPublishing || isLoading}
                  >
                    <Send className="h-4 w-4" />
                    {status === "published" ? "Update" : "Publish"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setDetailsOpen(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Details
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Unable to load post</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {remoteUpdatePending ? (
                <Alert>
                  <AlertTitle>Updated in another tab</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>New changes are available. Refresh to load the latest version.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshPost({ allowUnsaved: true, setLoading: false })}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              {hasUnsavedChanges ? (
                <Alert>
                  <AlertTitle>Unsaved changes</AlertTitle>
                  <AlertDescription>
                    Save draft to keep your classic editor updates.
                  </AlertDescription>
                </Alert>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Classic editor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Title
                    </label>
                    <Textarea
                      value={title}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      rows={1}
                      className="min-h-0 h-auto resize-none overflow-hidden rounded-lg border bg-background px-3 py-1 text-3xl font-semibold leading-tight tracking-tight focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Enter post title..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Slug
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                      <span className="text-xs text-muted-foreground">/</span>
                      <Input
                        value={slug}
                        onChange={(event) => handleSlugChange(event.target.value)}
                        className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-mono focus-visible:ring-0"
                        placeholder="post-slug"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleSlugChange(slugify(title))}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Excerpt
                    </label>
                    <Textarea
                      value={excerpt}
                      onChange={(event) => {
                        setExcerpt(event.target.value);
                        setUnsavedChanges(true);
                      }}
                      rows={4}
                      placeholder="Short summary shown in post listings."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Content
                    </label>
                    <Textarea
                      value={content}
                      onChange={(event) => {
                        setContent(event.target.value);
                        setUnsavedChanges(true);
                      }}
                      rows={14}
                      placeholder="Write your post body here."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-center">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Featured image ID
                      </label>
                      <Input
                        value={featuredImage}
                        onChange={(event) => {
                          setFeaturedImage(event.target.value);
                          setUnsavedChanges(true);
                        }}
                        placeholder="media-id"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={featured}
                        onChange={(event) => {
                          setFeatured(event.target.checked);
                          setUnsavedChanges(true);
                        }}
                      />
                      Featured post
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        <aside className="hidden h-full w-[340px] shrink-0 border-l bg-muted/20 lg:block">
          <EntryMetadataPanel
            status={status}
            onStatusChange={setStatus}
            scheduledAt={scheduledAt}
            onScheduledAtChange={setScheduledAt}
            title={title}
            slug={slug}
            seoDescription={seoDescription}
            onSeoDescriptionChange={setSeoDescription}
            checklist={checklist}
            helpItems={[
              "Classic mode keeps a textarea-based authoring flow for fallback operations.",
              "Saving writes content/excerpt and synchronizes a document snapshot for runtime parity.",
              "Use Runtime preview to validate final rendering with the active site theme.",
            ]}
            author={post?.author ?? null}
            onSave={handleSaveMetadata}
            isSaving={isSavingMetadata}
          />
        </aside>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Post details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit status, schedule, and metadata for this post.
          </SheetDescription>
          <ScrollArea className="h-full">
            <div className="px-6 py-6">
              <EntryMetadataPanel
                status={status}
                onStatusChange={setStatus}
                scheduledAt={scheduledAt}
                onScheduledAtChange={setScheduledAt}
                title={title}
                slug={slug}
                seoDescription={seoDescription}
                onSeoDescriptionChange={setSeoDescription}
                checklist={checklist}
                helpItems={[
                  "Classic mode keeps a textarea-based authoring flow for fallback operations.",
                  "Saving writes content/excerpt and synchronizes a document snapshot for runtime parity.",
                  "Use Runtime preview to validate final rendering with the active site theme.",
                ]}
                author={post?.author ?? null}
                onSave={handleSaveMetadata}
                isSaving={isSavingMetadata}
              />
            </div>
            <div className="border-t px-6 py-4">
              <Button
                className="w-full"
                onClick={handleSaveDraft}
                disabled={isSaving || isPublishing}
              >
                {isSaving ? "Saving..." : "Save draft"}
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <RuntimePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Post Preview"
        subtitle="Runtime preview (read-only, site theme)."
        canPreview={Boolean(postId)}
        previewUrl={previewUrl}
        isLoading={previewLoading}
        error={previewError}
        cannotPreviewMessage="Save this post first to generate a runtime preview."
        iframeTitle="Post runtime preview"
      />
    </AdminShell>
  );
}
