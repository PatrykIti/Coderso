import { Eye, RefreshCcw, Save, Send, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { entryFieldEditedKey, useEntryEditTracker } from "@/ui/entries/useEntryEditTracker";
import { useEntrySnapshotAuthority } from "@/ui/entries/useEntrySnapshotAuthority";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import type { ContentField } from "../../content-types/SchemaBuilder";

import {
  createPostExternalUpdateAuthority,
  createPostMutationLease,
  type PostMutationLease,
} from "./postExternalUpdateAuthority";
import { buildPostMetadataMutationPayload } from "./postMetadataMutationPayload";

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

type PostRouteIdentity = Readonly<{
  postId: string;
  routeEpoch: number;
}>;

type PostMetadataBaseline = Readonly<
  PostRouteIdentity & {
    detail: PostDetail;
  }
>;

type PostLoadOptions = Readonly<{
  discardLocalEdits?: boolean;
  isBaseline?: boolean;
  lease?: PostMutationLease;
  setLoading?: boolean;
}>;

const classicContentEditKeys = [
  "title",
  "slug",
  entryFieldEditedKey("excerpt"),
  entryFieldEditedKey("content"),
  entryFieldEditedKey("featuredImage"),
  entryFieldEditedKey("featured"),
] as const;

const readPostData = (detail: PostDetail | null): Record<string, unknown> =>
  isRecord(detail?.data) ? detail.data : {};

const mergeClassicContent = (current: PostDetail | null, next: PostDetail): PostDetail => {
  if (!current || current.id !== next.id) return next;
  return {
    ...current,
    title: next.title,
    slug: next.slug,
    data: { ...readPostData(current), ...readPostData(next) },
    updatedAt: next.updatedAt,
  };
};

const mergePostMetadata = (current: PostDetail | null, next: PostDetail): PostDetail => {
  if (!current || current.id !== next.id) return next;
  return {
    ...current,
    status: next.status,
    tags: next.tags,
    taxonomy: next.taxonomy,
    scheduledAt: next.scheduledAt,
    updatedAt: next.updatedAt,
    publishedAt: next.publishedAt,
    author: next.author,
    seo: next.seo,
  };
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [routeEpoch, setRouteEpoch] = useState(0);
  const [baselineIdentity, setBaselineIdentity] = useState<PostRouteIdentity | null>(null);
  const [leaseOperationId, setLeaseOperationId] = useState<number | null>(null);

  const {
    begin: beginSnapshotWrite,
    claim: claimSnapshotWrite,
    isAuthoritative: isSnapshotAuthoritative,
    supersedeAll: supersedeSnapshotWrites,
  } = useEntrySnapshotAuthority();
  const {
    beginSubmit,
    editedKeys,
    hasContentEdits,
    hasEdits,
    hasMetadataEdits,
    markEdited,
    resetEdits,
    settleSubmit,
  } = useEntryEditTracker();
  const routeEpochRef = useRef(0);
  const routePostIdRef = useRef<string | null>(postId);
  const baselineRef = useRef<PostMetadataBaseline | null>(null);
  const leaseRef = useRef<PostMutationLease | null>(null);
  const nextLeaseOperationIdRef = useRef(0);
  const metadataDraftRevisionRef = useRef(0);
  const externalUpdateAuthorityRef = useRef(createPostExternalUpdateAuthority());

  const currentRouteIdentity = useCallback((): PostRouteIdentity | null => {
    if (!postId || routePostIdRef.current !== postId) return null;
    return { postId, routeEpoch: routeEpochRef.current };
  }, [postId]);

  const isCurrentRoute = useCallback(
    (identity: PostRouteIdentity) =>
      routePostIdRef.current === identity.postId &&
      postId === identity.postId &&
      routeEpochRef.current === identity.routeEpoch,
    [postId]
  );

  const hasCurrentBaseline = useCallback(
    (identity: PostRouteIdentity | null) => {
      const baseline = baselineRef.current;
      return Boolean(
        identity &&
        baseline &&
        baseline.postId === identity.postId &&
        baseline.routeEpoch === identity.routeEpoch &&
        isCurrentRoute(identity)
      );
    },
    [isCurrentRoute]
  );

  const ownsCurrentLease = useCallback(
    (lease: PostMutationLease) =>
      leaseRef.current?.operationId === lease.operationId && hasCurrentBaseline(lease),
    [hasCurrentBaseline]
  );

  const installMetadataBaseline = useCallback(
    (identity: PostRouteIdentity, detail: PostDetail) => {
      if (!isCurrentRoute(identity)) return false;
      baselineRef.current = { ...identity, detail };
      setBaselineIdentity(identity);
      return true;
    },
    [isCurrentRoute]
  );

  const applyContentSnapshot = useCallback(
    (identity: PostRouteIdentity, next: PostDetail) => {
      if (!isCurrentRoute(identity)) return false;
      const kept = editedKeys();
      const source = readPostData(next);
      setPost((current) => mergeClassicContent(current, next));
      if (!kept.has("title")) setTitle(next.title);
      if (!kept.has("slug")) setSlug(next.slug);
      if (!kept.has(entryFieldEditedKey("excerpt"))) {
        setExcerpt(readOptionalString(source.excerpt));
      }
      if (!kept.has(entryFieldEditedKey("content"))) {
        setContent(readOptionalString(source.content));
      }
      if (!kept.has(entryFieldEditedKey("featuredImage"))) {
        setFeaturedImage(readOptionalString(source.featuredImage));
      }
      if (!kept.has(entryFieldEditedKey("featured"))) {
        setFeatured(readOptionalBoolean(source.featured));
      }
      return true;
    },
    [editedKeys, isCurrentRoute]
  );

  const applyMetadataSnapshot = useCallback(
    (identity: PostRouteIdentity, next: PostDetail, submittedMetadataRevision: number) => {
      if (!installMetadataBaseline(identity, next)) return false;
      const kept = editedKeys();
      setPost((current) => mergePostMetadata(current, next));
      if (metadataDraftRevisionRef.current === submittedMetadataRevision) {
        if (!kept.has("status")) setStatus(parseStatus(next.status));
        if (!kept.has("scheduledAt")) setScheduledAt(next.scheduledAt ?? "");
        if (!kept.has("seoDescription")) setSeoDescription(next.seo?.description ?? "");
      }
      setError(null);
      return true;
    },
    [editedKeys, installMetadataBaseline]
  );

  const acquirePostMutationLease = useCallback((): PostMutationLease | null => {
    const identity = currentRouteIdentity();
    if (!identity || !hasCurrentBaseline(identity) || leaseRef.current) return null;
    const lease = createPostMutationLease(identity, (nextLeaseOperationIdRef.current += 1));
    leaseRef.current = lease;
    setLeaseOperationId(lease.operationId);
    return lease;
  }, [currentRouteIdentity, hasCurrentBaseline]);

  const releasePostMutationLease = useCallback(
    (lease: PostMutationLease) => {
      if (!ownsCurrentLease(lease)) return;
      leaseRef.current = null;
      setLeaseOperationId(null);
    },
    [ownsCurrentLease]
  );

  const loadPost = useCallback(
    async (options: PostLoadOptions = {}, exactIdentity?: PostRouteIdentity): Promise<boolean> => {
      const identity = exactIdentity ?? currentRouteIdentity();
      if (!identity || !isCurrentRoute(identity)) return false;
      if (options.lease) {
        if (!ownsCurrentLease(options.lease)) return false;
      } else {
        if (leaseRef.current) {
          if (hasCurrentBaseline(identity)) setRemoteUpdatePending(true);
          return false;
        }
        if (!options.isBaseline && !options.discardLocalEdits && hasEdits()) {
          setRemoteUpdatePending(true);
          return false;
        }
      }

      const hydrationGeneration = externalUpdateAuthorityRef.current.captureHydration();
      const snapshotTicket = beginSnapshotWrite();
      const metadataDraftRevision = metadataDraftRevisionRef.current;
      try {
        const refreshed = await getPostCached(identity.postId, { force: true });
        if (
          !isCurrentRoute(identity) ||
          (options.lease !== undefined && !ownsCurrentLease(options.lease))
        ) {
          return false;
        }
        if (options.lease === undefined && leaseRef.current) {
          if (hasCurrentBaseline(identity)) setRemoteUpdatePending(true);
          return false;
        }
        if (!isSnapshotAuthoritative(snapshotTicket) && hasCurrentBaseline(identity)) return false;
        claimSnapshotWrite(snapshotTicket);
        if (!refreshed) {
          setError("Post not found.");
          return false;
        }
        if (options.discardLocalEdits) resetEdits();
        if (!applyContentSnapshot(identity, refreshed)) return false;
        if (!applyMetadataSnapshot(identity, refreshed, metadataDraftRevision)) return false;
        if (options.lease === undefined) {
          externalUpdateAuthorityRef.current.resolveHydration(hydrationGeneration);
        }
        setRemoteUpdatePending(externalUpdateAuthorityRef.current.hasPendingUpdate());
        return true;
      } catch (err) {
        if (isCurrentRoute(identity) && isSnapshotAuthoritative(snapshotTicket)) {
          setError(isApiClientError(err) ? err.message : "Failed to load post.");
        }
        return false;
      } finally {
        if (options.setLoading && isCurrentRoute(identity)) setIsLoading(false);
      }
    },
    [
      applyContentSnapshot,
      applyMetadataSnapshot,
      beginSnapshotWrite,
      claimSnapshotWrite,
      currentRouteIdentity,
      hasCurrentBaseline,
      hasEdits,
      isCurrentRoute,
      isSnapshotAuthoritative,
      ownsCurrentLease,
      resetEdits,
    ]
  );

  useLayoutEffect(() => {
    const nextRouteEpoch = (routeEpochRef.current += 1);
    routePostIdRef.current = postId;
    baselineRef.current = null;
    leaseRef.current = null;
    externalUpdateAuthorityRef.current = createPostExternalUpdateAuthority();
    supersedeSnapshotWrites();
    setRouteEpoch(nextRouteEpoch);
    setBaselineIdentity(null);
    setLeaseOperationId(null);
  }, [postId, supersedeSnapshotWrites]);

  useEffect(() => {
    const routeEpoch = routeEpochRef.current;
    const preview = postId ? getCachedPostDetail(postId) : null;
    void Promise.resolve().then(() => {
      if (routeEpochRef.current !== routeEpoch || routePostIdRef.current !== postId) return;
      const source = readPostData(preview);
      setPost(preview);
      setTitle(preview?.title ?? "");
      setSlug(preview?.slug ?? "");
      setExcerpt(readOptionalString(source.excerpt));
      setContent(readOptionalString(source.content));
      setFeaturedImage(readOptionalString(source.featuredImage));
      setFeatured(readOptionalBoolean(source.featured));
      setStatus(parseStatus(preview?.status ?? "draft"));
      setScheduledAt(preview?.scheduledAt ?? "");
      setSeoDescription(preview?.seo?.description ?? "");
      setError(null);
      setRemoteUpdatePending(false);
      setLeaseOperationId(null);
      setIsSaving(false);
      setIsSavingMetadata(false);
      setIsLoading(postId !== null);
      resetEdits();
    });
  }, [postId, resetEdits]);

  useEffect(() => {
    const identity = currentRouteIdentity();
    if (!identity) return;
    void Promise.resolve().then(() => loadPost({ isBaseline: true, setLoading: true }, identity));
  }, [currentRouteIdentity, loadPost, postId]);

  useEffect(() => {
    if (!postId) return;
    return subscribeCacheEvents((event, origin, operationToken) => {
      if (event.key !== cacheKeys.postDetail(postId)) return;
      const identity = currentRouteIdentity();
      if (!identity || !hasCurrentBaseline(identity)) return;
      if (
        !externalUpdateAuthorityRef.current.observe(
          origin,
          operationToken,
          leaseRef.current?.cacheEventOperationToken
        )
      ) {
        return;
      }
      setRemoteUpdatePending(true);
      if (leaseRef.current || hasEdits()) {
        return;
      }
      void loadPost({}, identity);
    });
  }, [currentRouteIdentity, hasCurrentBaseline, hasEdits, loadPost, postId]);

  const hasHydratedCurrentPostBaseline =
    baselineIdentity?.postId === postId && baselineIdentity.routeEpoch === routeEpoch;
  const isPostMutationInFlight = leaseOperationId !== null;
  const canMutateCurrentPost = hasHydratedCurrentPostBaseline && !isPostMutationInFlight;
  const isEditorLoading = isLoading || !hasHydratedCurrentPostBaseline;
  const hasUnsavedChanges = hasContentEdits || hasMetadataEdits;

  const canEditCurrentPost = () => hasCurrentBaseline(currentRouteIdentity());

  const handleTitleChange = (value: string) => {
    if (!canEditCurrentPost()) return;
    setTitle(value);
    markEdited("title");
  };

  const handleSlugChange = (value: string) => {
    if (!canEditCurrentPost()) return;
    setSlug(value);
    markEdited("slug");
  };

  const handleExcerptChange = (value: string) => {
    if (!canEditCurrentPost()) return;
    setExcerpt(value);
    markEdited(entryFieldEditedKey("excerpt"));
  };

  const handleContentChange = (value: string) => {
    if (!canEditCurrentPost()) return;
    setContent(value);
    markEdited(entryFieldEditedKey("content"));
  };

  const handleFeaturedImageChange = (value: string) => {
    if (!canEditCurrentPost()) return;
    setFeaturedImage(value);
    markEdited(entryFieldEditedKey("featuredImage"));
  };

  const handleFeaturedChange = (value: boolean) => {
    if (!canEditCurrentPost()) return;
    setFeatured(value);
    markEdited(entryFieldEditedKey("featured"));
  };

  const handleStatusChange = (value: EntryStatus) => {
    if (!canEditCurrentPost()) return;
    metadataDraftRevisionRef.current += 1;
    setStatus(value);
    markEdited("status");
  };

  const handleScheduledAtChange = (value: string) => {
    if (!canEditCurrentPost()) return;
    metadataDraftRevisionRef.current += 1;
    setScheduledAt(value);
    markEdited("scheduledAt");
  };

  const handleSeoDescriptionChange = (value: string) => {
    if (!canEditCurrentPost()) return;
    metadataDraftRevisionRef.current += 1;
    setSeoDescription(value);
    markEdited("seoDescription");
  };

  const handleSaveDraft = async (options?: { lease?: PostMutationLease }): Promise<boolean> => {
    const lease = options?.lease ?? acquirePostMutationLease();
    if (!lease || !ownsCurrentLease(lease)) return false;
    const shouldReleaseLease = options?.lease === undefined;
    const submittedTick = beginSubmit();
    const snapshotTicket = beginSnapshotWrite();
    setIsSaving(true);
    setError(null);
    try {
      const source = readPostData(post);
      const updated = await updatePost(
        lease.postId,
        {
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
        },
        { operationToken: lease.cacheEventOperationToken }
      );
      if (!ownsCurrentLease(lease) || !isSnapshotAuthoritative(snapshotTicket) || !updated) {
        return false;
      }
      settleSubmit(classicContentEditKeys, submittedTick);
      supersedeSnapshotWrites();
      applyContentSnapshot(lease, updated);
      setError(null);
      return true;
    } catch (err) {
      if (ownsCurrentLease(lease)) {
        setError(isApiClientError(err) ? err.message : "Failed to save post.");
      }
      return false;
    } finally {
      if (ownsCurrentLease(lease)) setIsSaving(false);
      if (shouldReleaseLease) releasePostMutationLease(lease);
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
    const lease = acquirePostMutationLease();
    if (!lease || !ownsCurrentLease(lease)) return;
    if (checklist.blockingIssues.length > 0) {
      setError(checklist.blockingIssues.join(" "));
      releasePostMutationLease(lease);
      return;
    }

    setError(null);
    try {
      if (status === "published") {
        const updated = await handleSaveDraft({ lease });
        if (updated && ownsCurrentLease(lease)) {
          await loadPost({ lease, setLoading: false }, lease);
        }
      } else {
        const submittedTick = beginSubmit();
        const snapshotTicket = beginSnapshotWrite();
        await publishPost(lease.postId, {
          operationToken: lease.cacheEventOperationToken,
        });
        if (!ownsCurrentLease(lease) || !isSnapshotAuthoritative(snapshotTicket)) return;
        settleSubmit(["status"], submittedTick);
        supersedeSnapshotWrites();
        await loadPost({ lease, setLoading: false }, lease);
      }
    } catch (err) {
      if (ownsCurrentLease(lease)) {
        setError(isApiClientError(err) ? err.message : "Failed to publish post.");
      }
    } finally {
      releasePostMutationLease(lease);
    }
  };

  const handleSaveMetadata = async () => {
    const lease = acquirePostMutationLease();
    if (!lease || !ownsCurrentLease(lease)) return;
    setIsSavingMetadata(true);
    setError(null);
    try {
      const baseline = baselineRef.current;
      if (!baseline || !hasCurrentBaseline(lease)) return;
      const submittedTick = beginSubmit();
      const submittedMetadataRevision = metadataDraftRevisionRef.current;
      const built = buildPostMetadataMutationPayload(baseline.detail, {
        status,
        scheduledAt,
        seoDescription,
      });
      if (built.kind === "schedule_required") {
        setError("Schedule date is required for scheduled entries.");
        return;
      }
      if (built.kind === "invalid_schedule") {
        setError("Schedule date must be a valid ISO timestamp.");
        return;
      }
      if (built.kind === "noop") {
        settleSubmit(built.settleKeys, submittedTick);
        applyMetadataSnapshot(lease, baseline.detail, submittedMetadataRevision);
        return;
      }
      const snapshotTicket = beginSnapshotWrite();
      const updated = await updatePostMetadata(lease.postId, built.payload, {
        operationToken: lease.cacheEventOperationToken,
      });
      if (!ownsCurrentLease(lease) || !isSnapshotAuthoritative(snapshotTicket) || !updated) return;
      settleSubmit(built.settleKeys, submittedTick);
      supersedeSnapshotWrites();
      applyMetadataSnapshot(lease, updated, submittedMetadataRevision);
    } catch (err) {
      if (ownsCurrentLease(lease)) {
        setError(isApiClientError(err) ? err.message : "Failed to save metadata.");
      }
    } finally {
      if (ownsCurrentLease(lease)) setIsSavingMetadata(false);
      releasePostMutationLease(lease);
    }
  };

  const handleRefreshPost = () => {
    if (leaseRef.current) return;
    void loadPost({ discardLocalEdits: true, setLoading: false });
  };

  const handlePreview = async () => {
    if (previewLoading) return;
    setPreviewOpen(true);
    const identity = currentRouteIdentity();
    if (!identity) {
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewUrl(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewPost(identity.postId, 30);
      if (!isCurrentRoute(identity)) return;
      setPreviewUrl(result.previewUrl);
    } catch (err) {
      if (!isCurrentRoute(identity)) return;
      if (isApiClientError(err)) {
        setPreviewError(err.message);
      } else {
        setPreviewError("Failed to generate preview.");
      }
      setPreviewUrl(null);
    } finally {
      if (isCurrentRoute(identity)) setPreviewLoading(false);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/posts"
      showSearch={false}
      contentClassName="p-0 overflow-hidden"
      breadcrumbs={["Content", "Posts", post?.id === postId ? post.title : "Edit Post"]}
      topbarActions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase">
            {status}
          </Badge>
          {hasUnsavedChanges ? <Badge variant="warning">Unsaved changes</Badge> : null}
        </div>
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
                  disabled={isEditorLoading}
                  aria-busy={previewLoading || undefined}
                >
                  <Eye className="h-4 w-4" />
                  Runtime preview
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => void handleSaveDraft()}
                    disabled={!canMutateCurrentPost}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save draft"}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handlePublish}
                    disabled={!canMutateCurrentPost}
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

              {remoteUpdatePending && hasHydratedCurrentPostBaseline ? (
                <Alert>
                  <AlertTitle>Updated in another tab</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>New changes are available. Refresh to load the latest version.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshPost}
                      disabled={isPostMutationInFlight}
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
                      disabled={!hasHydratedCurrentPostBaseline}
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
                        disabled={!hasHydratedCurrentPostBaseline}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleSlugChange(slugify(title))}
                        disabled={!hasHydratedCurrentPostBaseline}
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
                      onChange={(event) => handleExcerptChange(event.target.value)}
                      rows={4}
                      placeholder="Short summary shown in post listings."
                      disabled={!hasHydratedCurrentPostBaseline}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Content
                    </label>
                    <Textarea
                      value={content}
                      onChange={(event) => handleContentChange(event.target.value)}
                      rows={14}
                      placeholder="Write your post body here."
                      disabled={!hasHydratedCurrentPostBaseline}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-center">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Featured image ID
                      </label>
                      <Input
                        value={featuredImage}
                        onChange={(event) => handleFeaturedImageChange(event.target.value)}
                        placeholder="media-id"
                        disabled={!hasHydratedCurrentPostBaseline}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={featured}
                        onChange={(event) => handleFeaturedChange(event.target.checked)}
                        disabled={!hasHydratedCurrentPostBaseline}
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
            onStatusChange={handleStatusChange}
            scheduledAt={scheduledAt}
            onScheduledAtChange={handleScheduledAtChange}
            title={title}
            slug={slug}
            seoDescription={seoDescription}
            onSeoDescriptionChange={handleSeoDescriptionChange}
            checklist={checklist}
            helpItems={[
              "Classic mode keeps a textarea-based authoring flow for fallback operations.",
              "Saving writes content/excerpt and synchronizes a document snapshot for runtime parity.",
              "Use Runtime preview to validate final rendering with the active site theme.",
            ]}
            author={post?.author ?? null}
            onSave={handleSaveMetadata}
            isSaving={isSavingMetadata}
            canSave={canMutateCurrentPost}
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
                onStatusChange={handleStatusChange}
                scheduledAt={scheduledAt}
                onScheduledAtChange={handleScheduledAtChange}
                title={title}
                slug={slug}
                seoDescription={seoDescription}
                onSeoDescriptionChange={handleSeoDescriptionChange}
                checklist={checklist}
                helpItems={[
                  "Classic mode keeps a textarea-based authoring flow for fallback operations.",
                  "Saving writes content/excerpt and synchronizes a document snapshot for runtime parity.",
                  "Use Runtime preview to validate final rendering with the active site theme.",
                ]}
                author={post?.author ?? null}
                onSave={handleSaveMetadata}
                isSaving={isSavingMetadata}
                canSave={canMutateCurrentPost}
              />
            </div>
            <div className="border-t px-6 py-4">
              <Button
                className="w-full"
                onClick={() => void handleSaveDraft()}
                disabled={!canMutateCurrentPost}
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
