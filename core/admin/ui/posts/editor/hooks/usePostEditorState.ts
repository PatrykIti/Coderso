import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  autosavePost,
  deletePost,
  getCachedPostDetail,
  getCachedPostRevisions,
  getPostCached,
  listPostRevisionsCached,
  previewPost,
  publishPost,
  restorePostRevision,
  type PostRevision,
  type PostAutosavePayload,
  type PostDetail,
  type PostSeo,
  type PostStatus,
  unpublishPost,
  updatePostMetadata,
  updatePost,
} from "@/services/postsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { uploadClipboardImage } from "@/services/mediaClient";

import { coercePostDocument } from "../../../../../services/posts/editor/postBlockLegacyAdapter";
import {
  POST_BLOCK_TYPES,
  WRITING_CANVAS_VERSION,
  type PostBlock,
  type PostBlockDocumentMeta,
  type PostBlockType,
} from "../../../../../services/posts/editor/postBlockDocument";
import { normalizePostBlockDocument } from "../../../../../services/posts/editor/postBlockNormalizer";
import { postRichTextToPlainText } from "../../../../../services/posts/editor/postRichTextSerializer";
import {
  createInitialPostEditorState,
  createPostBlock,
  postEditorReducer,
  type PostEditorAction,
  type PostEditorState,
} from "../postEditorStore";
import { resolvePostInsertMutation, type PostInsertOptions } from "../postInsertFlow";
import { usePostAutosave } from "./usePostAutosave";

export type { PostInsertOptions, PostInsertSource, PostInsertTarget } from "../postInsertFlow";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolvePostIdFromPath = (path: string): string | null => {
  const pathname = path.split(/[?#]/)[0] ?? "";
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "posts");
  if (index === -1) return null;
  const raw = parts[index + 1] ?? null;
  return raw ? decodeURIComponent(raw) : null;
};

const getPostDataRecord = (post: PostDetail | null): Record<string, unknown> => {
  if (!post || !isRecord(post.data)) return {};
  return { ...post.data };
};

const createSafeBlockType = (value: string): PostBlockType => {
  const fallback: PostBlockType = "writing-canvas";
  if ((POST_BLOCK_TYPES as readonly string[]).includes(value)) {
    return value as PostBlockType;
  }
  return fallback;
};

const hasMeaningfulParagraphAttrs = (attrs: Record<string, unknown>) =>
  Object.entries(attrs).some(([key, value]) => {
    if (key === "align") return value !== "left";
    if (key === "width") return value !== "auto";
    if (key === "spacingTop") return value !== "md";
    if (key === "spacingBottom") return value !== "md";
    if (key === "textScale") return value !== "md";
    if (key === "highlight") return value === true;
    if (key === "hideOnMobile") return value === true;
    if (key === "anchorId" || key === "className") {
      return typeof value === "string" && value.trim().length > 0;
    }
    return true;
  });

const isEmptyParagraphBlock = (block: PostBlock) => {
  if (block.type !== "paragraph") return false;
  const plainText = postRichTextToPlainText(typeof block.content === "string" ? block.content : "");
  const attrs = isRecord(block.attrs) ? block.attrs : {};
  return plainText.trim().length === 0 && !hasMeaningfulParagraphAttrs(attrs);
};

export const normalizeEditorDocumentForWritingFlow = (input: unknown) => {
  const document = coercePostDocument(input);
  const firstWritingCanvasIndex = document.blocks.findIndex(
    (block) => block.type === "writing-canvas"
  );

  if (firstWritingCanvasIndex !== -1) {
    const nextBlocks = document.blocks.filter(
      (block, index) => !(index < firstWritingCanvasIndex && isEmptyParagraphBlock(block))
    );
    if (nextBlocks.length !== document.blocks.length) {
      return normalizePostBlockDocument(
        {
          version: document.version,
          blocks: nextBlocks,
          meta: document.meta,
        },
        { fallbackToEmpty: true }
      );
    }
    return document;
  }

  if (document.blocks.length === 1 && (document.blocks[0] as PostBlock).type === "paragraph") {
    const paragraphBlock = document.blocks[0] as PostBlock;
    const paragraphId = paragraphBlock.id || "block-1";
    const paragraphText = typeof paragraphBlock.content === "string" ? paragraphBlock.content : "";
    return normalizePostBlockDocument(
      {
        version: document.version,
        blocks: [
          {
            ...createPostBlock("writing-canvas", paragraphId),
            content: {
              version: WRITING_CANVAS_VERSION,
              nodes: [
                {
                  id: "node-1",
                  type: "paragraph",
                  text: paragraphText,
                },
              ],
            },
          },
        ],
        meta: document.meta,
      },
      { fallbackToEmpty: true }
    );
  }

  return document;
};

const readOptionalString = (value: unknown) => (typeof value === "string" ? value : "");

const normalizeTagInput = (value: string) => {
  const seen = new Set<string>();
  const result: string[] = [];
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(tag);
    });
  return result;
};

type MetadataDraftState = {
  tagsInput: string;
  categoryId: string;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    robots: string;
  };
};

const createMetadataDraftState = (post: PostDetail | null): MetadataDraftState => {
  const tagsInput = (post?.tags ?? []).join(", ");
  const categoryId = post?.taxonomy?.category?.id ?? "";
  const seo = {
    title: readOptionalString(post?.seo?.title),
    description: readOptionalString(post?.seo?.description),
    canonicalUrl: readOptionalString(post?.seo?.canonicalUrl),
    robots: readOptionalString(post?.seo?.robots) || "index,follow",
  };
  return { tagsInput, categoryId, seo };
};

const serializeMetadataDraft = (draft: MetadataDraftState) =>
  JSON.stringify({
    tags: normalizeTagInput(draft.tagsInput),
    categoryId: draft.categoryId.trim() || null,
    seo: {
      title: draft.seo.title.trim(),
      description: draft.seo.description.trim(),
      canonicalUrl: draft.seo.canonicalUrl.trim(),
      robots: draft.seo.robots.trim() || "index,follow",
    },
  });

type PostBasePayload = Readonly<{
  title: string;
  slug: string;
  data: Record<string, unknown>;
}>;

type PostMetadataPayload = Readonly<{
  tags: string[];
  taxonomy: Readonly<{ categoryId: string | null }>;
  seo: PostSeo;
}>;

type PostDraftSnapshot = Readonly<{
  editorIdentity: string;
  basePayload: PostBasePayload;
  metadataPayload: PostMetadataPayload;
  autosavePayload: Readonly<PostAutosavePayload>;
  metadataSignature: string;
  signature: string;
}>;

type SaveTarget = Readonly<{
  editorIdentity: string;
  editorEpoch: number;
  revision: number;
  snapshot: PostDraftSnapshot;
}>;

type LivePostDraft = {
  editorIdentity: string;
  title: string;
  slug: string;
  featuredImage: string;
  metadataDraft: MetadataDraftState;
  baseData: Record<string, unknown>;
  editorState: PostEditorState;
};

type SaveMode = "manual" | "background" | "close";
type SavePersistenceKind = "autosave" | "draft";
type PersistedSaveResult = Readonly<{ post: PostDetail; savedAt: string }>;
type AuthoritativeBarrierMode = "read-only" | "potential-write";

type QueuedRevisionSave = {
  target: SaveTarget;
  modes: Set<SaveMode>;
  persistenceKind: SavePersistenceKind;
  syncMode: PostDraftSyncMode;
  admissionOrder: number;
  predecessorBarrierOutcome: Promise<void> | null;
  dispatched: boolean;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

type AuthoritativeBarrierState = {
  editorIdentity: string;
  editorEpoch: number;
  potentialWritePending: boolean;
  completion: Promise<void>;
  outcome: Promise<void>;
  cutoffAdmissionOrder: number;
  reservedRevision: number;
  userMutationGenerationAtStart: number;
};

const buildEditorSessionKey = (editorIdentity: string | null, editorEpoch: number) =>
  JSON.stringify([editorIdentity, editorEpoch]);

const buildSaveTargetKey = (target: SaveTarget) =>
  JSON.stringify([target.editorIdentity, target.editorEpoch, target.revision]);

const isSameEditorSession = (left: SaveTarget, right: SaveTarget) =>
  left.editorIdentity === right.editorIdentity && left.editorEpoch === right.editorEpoch;

const isUnresolvedPredecessorForTarget = (record: QueuedRevisionSave, target: SaveTarget) =>
  record.target.editorIdentity === target.editorIdentity &&
  (record.target.editorEpoch !== target.editorEpoch || record.target.revision <= target.revision);

const cloneJsonContract = <T>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

const deepFreezeJsonContract = <T>(value: T): T => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeJsonContract(child);
  }
  return value;
};

const buildMetadataPayloadFromDraft = (metadataDraft: MetadataDraftState): PostMetadataPayload => {
  const categoryId = metadataDraft.categoryId.trim() || null;
  return {
    tags: normalizeTagInput(metadataDraft.tagsInput),
    taxonomy: { categoryId },
    seo: {
      title: metadataDraft.seo.title.trim() || null,
      description: metadataDraft.seo.description.trim() || null,
      canonicalUrl: metadataDraft.seo.canonicalUrl.trim() || null,
      robots: metadataDraft.seo.robots.trim() || "index,follow",
    },
  };
};

const buildDraftSnapshot = (draft: LivePostDraft): PostDraftSnapshot => {
  const data = cloneJsonContract(draft.baseData);
  data.document = cloneJsonContract(draft.editorState.document);
  const featuredImage = draft.featuredImage.trim();
  if (featuredImage) data.featuredImage = featuredImage;
  else delete data.featuredImage;

  const basePayload: PostBasePayload = {
    title: draft.title,
    slug: draft.slug,
    data,
  };
  const metadataPayload = buildMetadataPayloadFromDraft(draft.metadataDraft);
  const metadataSignature = JSON.stringify(metadataPayload);
  const signature = JSON.stringify({ basePayload, metadataPayload });
  return deepFreezeJsonContract({
    editorIdentity: draft.editorIdentity,
    basePayload,
    metadataPayload,
    autosavePayload: {
      ...basePayload,
      ...metadataPayload,
    },
    metadataSignature,
    signature,
  });
};

const sameSnapshot = (left: PostDraftSnapshot, right: PostDraftSnapshot) =>
  left.editorIdentity === right.editorIdentity && left.signature === right.signature;

const createLiveDraftFromPost = (post: PostDetail): LivePostDraft => {
  const baseData = getPostDataRecord(post);
  const editorState = createInitialPostEditorState(
    normalizeEditorDocumentForWritingFlow(post.data)
  );
  return {
    editorIdentity: post.id,
    title: post.title,
    slug: post.slug,
    featuredImage:
      isRecord(post.data) && typeof post.data.featuredImage === "string"
        ? post.data.featuredImage
        : "",
    metadataDraft: createMetadataDraftState(post),
    baseData,
    editorState,
  };
};

const createEditorIdentityChangedError = () =>
  Object.assign(new Error("The active post changed before saving completed."), {
    code: "editor_identity_changed",
  });

const resolveCloseSaveErrorCopy = (error: unknown) =>
  isApiClientError(error) && error.message.trim().length > 0
    ? error.message
    : "Failed to save latest changes before closing.";

const upsertRevisionList = (revisions: PostRevision[], revision: PostRevision) => {
  const index = revisions.findIndex((item) => item.id === revision.id);
  const next = [...revisions];
  if (index === -1) next.unshift(revision);
  else next[index] = revision;
  return next.sort((left, right) => right.version - left.version);
};

export type PostDraftSyncMode = "silent" | "hydrate";

export const normalizePostDraftSyncMode = (
  mode: PostDraftSyncMode | undefined
): PostDraftSyncMode => (mode === "hydrate" ? "hydrate" : "silent");

export const buildSilentSyncSnapshot = (post: PostDetail, savedAt?: string) => {
  const metadataDraft = createMetadataDraftState(post);
  return {
    title: post.title,
    slug: post.slug,
    status: post.status,
    featuredImage:
      isRecord(post.data) && typeof post.data.featuredImage === "string"
        ? post.data.featuredImage
        : "",
    metadataDraft,
    metadataSignature: serializeMetadataDraft(metadataDraft),
    baseData: getPostDataRecord(post),
    savedAt: savedAt ?? post.updatedAt,
  };
};

export const shouldDeferRefreshForDirtyState = (
  options: { allowDirty?: boolean } | undefined,
  hasUnsavedChanges: boolean
) => options?.allowDirty !== true && hasUnsavedChanges;

export type UsePostEditorStateResult = {
  postId: string | null;
  editorSessionKey: string;
  post: PostDetail | null;
  title: string;
  slug: string;
  status: PostStatus;
  hasUnsavedChanges: boolean;
  canMutatePost: boolean;
  loading: boolean;
  error: string | null;
  autosaveError: string | null;
  autosaveSaving: boolean;
  lastSavedAt: string | null;
  remoteUpdatePending: boolean;
  setTitle: (value: string) => void;
  setSlug: (value: string) => void;
  featuredImage: string;
  setFeaturedImage: (value: string) => void;
  tagsInput: string;
  setTagsInput: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  seoDraft: {
    title: string;
    description: string;
    canonicalUrl: string;
    robots: string;
  };
  setSeoDraft: (patch: Partial<UsePostEditorStateResult["seoDraft"]>) => void;
  taxonomySummary: {
    categoryName: string | null;
    tagCount: number;
  };
  deletingPost: boolean;
  moveToTrash: () => Promise<boolean>;
  saveDraft: () => Promise<void>;
  flushLatestAutosave: () => Promise<void>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  preview: () => Promise<void>;
  previewUrl: string | null;
  previewOpen: boolean;
  previewLoading: boolean;
  previewError: string | null;
  setPreviewOpen: (open: boolean) => void;
  revisionsOpen: boolean;
  setRevisionsOpen: (open: boolean) => void;
  revisions: PostRevision[];
  revisionsLoading: boolean;
  revisionsError: string | null;
  restoringRevisionId: string | null;
  openRevisions: () => void;
  restoreRevision: (revisionId: string) => Promise<void>;
  state: ReturnType<typeof createInitialPostEditorState>;
  selectedBlock: PostBlock | null;
  insertFocusToken: number;
  canUndo: boolean;
  canRedo: boolean;
  selectBlock: (id: string | null) => void;
  updateBlockContent: (id: string, content: unknown) => void;
  updateSelectedBlockContent: (content: unknown) => void;
  updateBlockAttrs: (id: string, patch: Record<string, unknown>) => void;
  updateSelectedBlockAttrs: (patch: Record<string, unknown>) => void;
  updateDocumentTypography: (typography: NonNullable<PostBlockDocumentMeta["typography"]>) => void;
  setExcerpt: (value: string) => void;
  insertBlock: (type: string, options?: PostInsertOptions) => void;
  ensureDynamicTocBlock: () => void;
  deleteBlock: (id: string) => void;
  deleteSelectedBlock: () => void;
  moveBlock: (id: string, direction: "up" | "down") => void;
  moveSelectedBlock: (direction: "up" | "down") => void;
  moveBlockToIndex: (id: string, targetIndex: number) => void;
  transformBlock: (id: string, targetType: PostBlockType) => void;
  transformSelectedBlock: (targetType: PostBlockType) => void;
  undo: () => void;
  redo: () => void;
  markReloadRemote: () => Promise<void>;
  uploadClipboardImage: (file: File) => Promise<{ id: string; key: string; url: string }>;
};

export function usePostEditorState(): UsePostEditorStateResult {
  const { path } = useAdminRouter();
  const postId = useMemo(() => resolvePostIdFromPath(path), [path]);
  const routePostIdRef = useRef(postId);
  const routeGenerationRef = useRef(0);
  if (routePostIdRef.current !== postId) {
    routePostIdRef.current = postId;
    routeGenerationRef.current += 1;
  }
  const editorRouteEpoch = routeGenerationRef.current;
  const hydrationRequestGenerationRef = useRef(0);
  const restoreRequestGenerationRef = useRef(0);
  const initialCachedPost = useMemo(() => (postId ? getCachedPostDetail(postId) : null), [postId]);

  const [post, setPost] = useState<PostDetail | null>(() => initialCachedPost);
  const [title, setTitleState] = useState(() => initialCachedPost?.title ?? "");
  const [slug, setSlugState] = useState(() => initialCachedPost?.slug ?? "");
  const [status, setStatus] = useState<PostStatus>(() => initialCachedPost?.status ?? "draft");
  const [featuredImage, setFeaturedImageState] = useState(() => {
    if (!initialCachedPost || !isRecord(initialCachedPost.data)) return "";
    return readOptionalString(initialCachedPost.data.featuredImage);
  });
  const [metadataDraft, setMetadataDraftState] = useState<MetadataDraftState>(() =>
    createMetadataDraftState(initialCachedPost)
  );
  const [loading, setLoading] = useState(() => !initialCachedPost);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [autosaveSaving, setAutosaveSaving] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const [insertFocusToken, setInsertFocusToken] = useState(0);
  const [editorStateIdentity, setEditorStateIdentity] = useState<string | null>(() => postId);
  const [editorStateEpoch, setEditorStateEpoch] = useState(() => routeGenerationRef.current);

  const initialEditorState = useMemo(
    () =>
      createInitialPostEditorState(normalizeEditorDocumentForWritingFlow(initialCachedPost?.data)),
    [initialCachedPost]
  );
  const [state, setEditorState] = useState(initialEditorState);
  const dispatch = useCallback((action: PostEditorAction) => {
    setEditorState((current) => postEditorReducer(current, action));
  }, []);

  const [baseData, setBaseData] = useState<Record<string, unknown>>(() =>
    getPostDataRecord(initialCachedPost)
  );
  const initialLiveDraft = useMemo<LivePostDraft | null>(() => {
    if (!initialCachedPost || !postId) return null;
    return {
      editorIdentity: postId,
      title: initialCachedPost.title,
      slug: initialCachedPost.slug,
      featuredImage:
        isRecord(initialCachedPost.data) && typeof initialCachedPost.data.featuredImage === "string"
          ? initialCachedPost.data.featuredImage
          : "",
      metadataDraft: createMetadataDraftState(initialCachedPost),
      baseData: getPostDataRecord(initialCachedPost),
      editorState: initialEditorState,
    };
  }, [initialCachedPost, initialEditorState, postId]);
  const initialTarget = useMemo<SaveTarget | null>(() => {
    if (!initialLiveDraft) return null;
    return {
      editorIdentity: initialLiveDraft.editorIdentity,
      editorEpoch: routeGenerationRef.current,
      revision: 0,
      snapshot: buildDraftSnapshot(initialLiveDraft),
    };
  }, [initialLiveDraft]);

  const mountedRef = useRef(true);
  const activeEditorIdentityRef = useRef<string | null>(postId);
  const activeEditorEpochRef = useRef(routeGenerationRef.current);
  const editorStateIdentityRef = useRef<string | null>(postId);
  const editorStateEpochRef = useRef(routeGenerationRef.current);
  const dirtyRevisionRef = useRef(0);
  const userMutationGenerationRef = useRef(0);
  const liveDraftRef = useRef<LivePostDraft | null>(initialLiveDraft);
  const liveSignatureRef = useRef(initialTarget?.snapshot.signature ?? "");
  const lastPersistedExactTargetRef = useRef<SaveTarget | null>(initialTarget);
  const queuedSaveByIdentityRevisionRef = useRef(new Map<string, QueuedRevisionSave>());
  const orderedSaveQueueRef = useRef<QueuedRevisionSave[]>([]);
  const inFlightSaveByIdentityRef = useRef(new Map<string, QueuedRevisionSave>());
  const drainPromiseByIdentityRef = useRef(new Map<string, Promise<void>>());
  const drainQueueRef = useRef<(identity: string) => Promise<void>>(async () => undefined);
  const authoritativeBarrierBySessionRef = useRef(new Map<string, AuthoritativeBarrierState>());
  const potentialWriteSettlementGenerationByIdentityRef = useRef(new Map<string, number>());
  const persistedPotentialWriteWatermarkBySessionRef = useRef(
    initialTarget
      ? new Map<string, number>([
          [buildEditorSessionKey(initialTarget.editorIdentity, initialTarget.editorEpoch), 0],
        ])
      : new Map<string, number>()
  );
  const saveAdmissionSequenceRef = useRef(0);
  const localSaveGenerationBySessionRef = useRef(new Map<string, number>());
  const getPotentialWriteSettlementGeneration = useCallback(
    (identity: string) =>
      potentialWriteSettlementGenerationByIdentityRef.current.get(identity) ?? 0,
    []
  );
  const recordPotentialWriteSettlement = useCallback((identity: string) => {
    const nextGeneration =
      (potentialWriteSettlementGenerationByIdentityRef.current.get(identity) ?? 0) + 1;
    potentialWriteSettlementGenerationByIdentityRef.current.set(identity, nextGeneration);
    return nextGeneration;
  }, []);
  const acceptPersistedPotentialWriteWatermark = useCallback(
    (identity: string, epoch: number, generation: number) => {
      persistedPotentialWriteWatermarkBySessionRef.current.set(
        buildEditorSessionKey(identity, epoch),
        generation
      );
    },
    []
  );
  const hasRestorationDebt = useCallback((identity: string, epoch: number) => {
    const currentGeneration =
      potentialWriteSettlementGenerationByIdentityRef.current.get(identity) ?? 0;
    const persistedWatermark = persistedPotentialWriteWatermarkBySessionRef.current.get(
      buildEditorSessionKey(identity, epoch)
    );
    return persistedWatermark === undefined
      ? currentGeneration > 0
      : persistedWatermark < currentGeneration;
  }, []);
  const hasPendingPotentialWrite = useCallback(
    (identity: string) =>
      [...queuedSaveByIdentityRevisionRef.current.values()].some(
        (record) => record.target.editorIdentity === identity
      ) ||
      [...authoritativeBarrierBySessionRef.current.values()].some(
        (barrier) => barrier.editorIdentity === identity && barrier.potentialWritePending
      ),
    []
  );
  const advanceLocalMutationGeneration = useCallback((identity: string, epoch: number) => {
    const sessionKey = buildEditorSessionKey(identity, epoch);
    localSaveGenerationBySessionRef.current.set(
      sessionKey,
      (localSaveGenerationBySessionRef.current.get(sessionKey) ?? 0) + 1
    );
  }, []);
  const [persistedSignature, setPersistedSignature] = useState(
    initialTarget?.snapshot.signature ?? ""
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isCurrentEditableSession = useCallback((identity: string, epoch: number) => {
    const liveDraft = liveDraftRef.current;
    return (
      mountedRef.current &&
      routePostIdRef.current === identity &&
      routeGenerationRef.current === epoch &&
      activeEditorIdentityRef.current === identity &&
      activeEditorEpochRef.current === epoch &&
      editorStateIdentityRef.current === identity &&
      editorStateEpochRef.current === epoch &&
      liveDraft?.editorIdentity === identity
    );
  }, []);

  const requireCurrentEditableSession = useCallback(() => {
    if (!postId || !isCurrentEditableSession(postId, editorRouteEpoch)) {
      throw createEditorIdentityChangedError();
    }
    return { identity: postId, epoch: editorRouteEpoch } as const;
  }, [editorRouteEpoch, isCurrentEditableSession, postId]);

  const dispatchEditorAction = useCallback(
    (action: PostEditorAction) => {
      const identity = activeEditorIdentityRef.current;
      const liveDraft = liveDraftRef.current;
      if (
        !identity ||
        routePostIdRef.current !== identity ||
        routeGenerationRef.current !== activeEditorEpochRef.current ||
        editorStateIdentityRef.current !== identity ||
        editorStateEpochRef.current !== activeEditorEpochRef.current ||
        !liveDraft ||
        liveDraft.editorIdentity !== identity
      ) {
        return false;
      }
      const nextEditorState = postEditorReducer(liveDraft.editorState, action);
      const nextDraft = { ...liveDraft, editorState: nextEditorState };
      const nextSignature = buildDraftSnapshot(nextDraft).signature;
      if (nextSignature !== liveSignatureRef.current) {
        dirtyRevisionRef.current += 1;
        userMutationGenerationRef.current += 1;
        liveSignatureRef.current = nextSignature;
      }
      liveDraftRef.current = nextDraft;
      dispatch(action);
      return true;
    },
    [dispatch]
  );

  const installLiveDraftMutation = useCallback(
    (mutate: (current: LivePostDraft) => LivePostDraft) => {
      const current = liveDraftRef.current;
      const identity = activeEditorIdentityRef.current;
      if (
        !identity ||
        routePostIdRef.current !== identity ||
        routeGenerationRef.current !== activeEditorEpochRef.current ||
        editorStateIdentityRef.current !== identity ||
        editorStateEpochRef.current !== activeEditorEpochRef.current ||
        !current ||
        current.editorIdentity !== identity
      ) {
        return false;
      }
      const next = mutate(current);
      const nextSignature = buildDraftSnapshot(next).signature;
      if (nextSignature !== liveSignatureRef.current) {
        dirtyRevisionRef.current += 1;
        userMutationGenerationRef.current += 1;
        liveSignatureRef.current = nextSignature;
      }
      liveDraftRef.current = next;
      return true;
    },
    []
  );

  const setTitle = useCallback(
    (value: string) => {
      if (installLiveDraftMutation((current) => ({ ...current, title: value }))) {
        setTitleState(value);
      }
    },
    [installLiveDraftMutation]
  );

  const setSlug = useCallback(
    (value: string) => {
      if (installLiveDraftMutation((current) => ({ ...current, slug: value }))) {
        setSlugState(value);
      }
    },
    [installLiveDraftMutation]
  );

  const setFeaturedImage = useCallback(
    (value: string) => {
      if (installLiveDraftMutation((current) => ({ ...current, featuredImage: value }))) {
        setFeaturedImageState(value);
      }
    },
    [installLiveDraftMutation]
  );

  const rejectQueuedSession = useCallback((identity: string, epoch: number) => {
    const error = createEditorIdentityChangedError();
    const remaining: QueuedRevisionSave[] = [];
    for (const record of orderedSaveQueueRef.current) {
      if (
        record.target.editorIdentity !== identity ||
        record.target.editorEpoch !== epoch ||
        record.dispatched
      ) {
        remaining.push(record);
        continue;
      }
      queuedSaveByIdentityRevisionRef.current.delete(buildSaveTargetKey(record.target));
      record.reject(error);
    }
    orderedSaveQueueRef.current = remaining;
  }, []);

  const installAuthoritativePost = useCallback(
    (
      nextPost: PostDetail,
      reason: "initial-load" | "accepted-hydration" | "identity-transition",
      savedAt = nextPost.updatedAt,
      expectedEpoch = routeGenerationRef.current,
      acceptedPotentialWriteGeneration = getPotentialWriteSettlementGeneration(nextPost.id)
    ) => {
      const previousIdentity = activeEditorIdentityRef.current;
      const previousEpoch = activeEditorEpochRef.current;
      if (
        routePostIdRef.current !== nextPost.id ||
        routeGenerationRef.current !== expectedEpoch ||
        activeEditorIdentityRef.current !== nextPost.id ||
        activeEditorEpochRef.current !== expectedEpoch
      ) {
        return false;
      }
      if (
        reason === "identity-transition" &&
        previousIdentity &&
        (previousIdentity !== nextPost.id || previousEpoch !== expectedEpoch)
      ) {
        rejectQueuedSession(previousIdentity, previousEpoch);
      }

      const hasPendingSameIdentitySave = [...queuedSaveByIdentityRevisionRef.current.values()].some(
        (record) =>
          record.target.editorIdentity === nextPost.id &&
          record.target.editorEpoch === expectedEpoch
      );
      if (reason !== "identity-transition" && hasPendingSameIdentitySave) {
        if (mountedRef.current) setRemoteUpdatePending(true);
        return false;
      }

      const nextLiveDraft = createLiveDraftFromPost(nextPost);
      const revision = reason === "identity-transition" ? 0 : dirtyRevisionRef.current;
      const target: SaveTarget = {
        editorIdentity: nextPost.id,
        editorEpoch: expectedEpoch,
        revision,
        snapshot: buildDraftSnapshot(nextLiveDraft),
      };

      activeEditorIdentityRef.current = nextPost.id;
      activeEditorEpochRef.current = expectedEpoch;
      editorStateIdentityRef.current = nextPost.id;
      editorStateEpochRef.current = expectedEpoch;
      dirtyRevisionRef.current = revision;
      if (reason === "identity-transition") userMutationGenerationRef.current = 0;
      liveDraftRef.current = nextLiveDraft;
      liveSignatureRef.current = target.snapshot.signature;
      lastPersistedExactTargetRef.current = target;
      acceptPersistedPotentialWriteWatermark(
        nextPost.id,
        expectedEpoch,
        acceptedPotentialWriteGeneration
      );

      if (!mountedRef.current) return true;
      setEditorStateIdentity(nextPost.id);
      setEditorStateEpoch(expectedEpoch);
      setPost(nextPost);
      setTitleState(nextLiveDraft.title);
      setSlugState(nextLiveDraft.slug);
      setStatus(nextPost.status);
      setFeaturedImageState(nextLiveDraft.featuredImage);
      setMetadataDraftState(nextLiveDraft.metadataDraft);
      setBaseData(nextLiveDraft.baseData);
      dispatch({
        type: "hydrate",
        document: nextLiveDraft.editorState.document,
      });
      setLastSavedAt(savedAt);
      setPersistedSignature(target.snapshot.signature);
      setRemoteUpdatePending(false);
      if (reason === "identity-transition") {
        setError(null);
        setPreviewOpen(false);
        setPreviewUrl(null);
        setPreviewLoading(false);
        setPreviewError(null);
        setAutosaveSaving(false);
        setAutosaveError(null);
        setDeletingPost(false);
        setRevisionsOpen(false);
        setRevisions([]);
        setRevisionsLoading(false);
        setRevisionsError(null);
        setRestoringRevisionId(null);
        setInsertFocusToken(0);
      }
      return true;
    },
    [
      acceptPersistedPotentialWriteWatermark,
      dispatch,
      getPotentialWriteSettlementGeneration,
      rejectQueuedSession,
    ]
  );

  const applyLoadedPost = useCallback(
    (
      nextPost: PostDetail,
      expectedIdentity: string,
      expectedEpoch: number,
      acceptedPotentialWriteGeneration: number
    ) => {
      if (
        nextPost.id !== expectedIdentity ||
        routePostIdRef.current !== expectedIdentity ||
        routeGenerationRef.current !== expectedEpoch ||
        activeEditorIdentityRef.current !== expectedIdentity ||
        activeEditorEpochRef.current !== expectedEpoch
      ) {
        return false;
      }
      return installAuthoritativePost(
        nextPost,
        editorStateIdentityRef.current === expectedIdentity &&
          editorStateEpochRef.current === expectedEpoch
          ? "accepted-hydration"
          : "identity-transition",
        nextPost.updatedAt,
        expectedEpoch,
        acceptedPotentialWriteGeneration
      );
    },
    [installAuthoritativePost]
  );

  const commitIdentityLoadFailure = useCallback(
    (expectedIdentity: string | null, expectedEpoch: number, message: string) => {
      if (
        !mountedRef.current ||
        routePostIdRef.current !== expectedIdentity ||
        routeGenerationRef.current !== expectedEpoch ||
        activeEditorIdentityRef.current !== expectedIdentity ||
        activeEditorEpochRef.current !== expectedEpoch
      ) {
        return;
      }
      if (
        editorStateIdentityRef.current === expectedIdentity &&
        editorStateEpochRef.current === expectedEpoch
      ) {
        setError(message);
        return;
      }
      editorStateIdentityRef.current = expectedIdentity;
      editorStateEpochRef.current = expectedEpoch;
      setEditorStateIdentity(expectedIdentity);
      setEditorStateEpoch(expectedEpoch);
      setPost(null);
      setTitleState("");
      setSlugState("");
      setStatus("draft");
      setFeaturedImageState("");
      setMetadataDraftState(createMetadataDraftState(null));
      setBaseData({});
      setEditorState(createInitialPostEditorState(normalizeEditorDocumentForWritingFlow(null)));
      setPersistedSignature("");
      setLastSavedAt(null);
      setRemoteUpdatePending(false);
      setPreviewOpen(false);
      setPreviewUrl(null);
      setPreviewLoading(false);
      setPreviewError(null);
      setAutosaveSaving(false);
      setAutosaveError(null);
      setDeletingPost(false);
      setRevisionsOpen(false);
      setRevisions([]);
      setRevisionsLoading(false);
      setRevisionsError(null);
      setRestoringRevisionId(null);
      setInsertFocusToken(0);
      setError(message);
    },
    []
  );

  const applyBarrierAuthoritativePost = useCallback(
    (
      nextPost: PostDetail,
      expectedIdentity: string,
      expectedEpoch: number,
      reservedRevision: number,
      userMutationGenerationAtBarrierStart: number,
      savedAt = nextPost.updatedAt,
      acceptedPotentialWriteGeneration = getPotentialWriteSettlementGeneration(expectedIdentity)
    ) => {
      if (
        !mountedRef.current ||
        nextPost.id !== expectedIdentity ||
        routePostIdRef.current !== expectedIdentity ||
        routeGenerationRef.current !== expectedEpoch ||
        activeEditorIdentityRef.current !== expectedIdentity ||
        activeEditorEpochRef.current !== expectedEpoch ||
        editorStateIdentityRef.current !== expectedIdentity ||
        editorStateEpochRef.current !== expectedEpoch
      ) {
        return false;
      }
      if (
        userMutationGenerationRef.current === userMutationGenerationAtBarrierStart &&
        installAuthoritativePost(
          nextPost,
          "accepted-hydration",
          savedAt,
          expectedEpoch,
          acceptedPotentialWriteGeneration
        )
      ) {
        return true;
      }

      const responseDraft = createLiveDraftFromPost(nextPost);
      const persistedTarget: SaveTarget = {
        editorIdentity: expectedIdentity,
        editorEpoch: expectedEpoch,
        revision: reservedRevision,
        snapshot: buildDraftSnapshot(responseDraft),
      };
      lastPersistedExactTargetRef.current = persistedTarget;
      acceptPersistedPotentialWriteWatermark(
        expectedIdentity,
        expectedEpoch,
        acceptedPotentialWriteGeneration
      );
      setPost(nextPost);
      setStatus(nextPost.status);
      setPersistedSignature(persistedTarget.snapshot.signature);
      setLastSavedAt(savedAt);
      setRemoteUpdatePending(false);
      setAutosaveError(null);
      return true;
    },
    [
      acceptPersistedPotentialWriteWatermark,
      getPotentialWriteSettlementGeneration,
      installAuthoritativePost,
    ]
  );

  const routeStateCurrent =
    editorStateIdentity === postId &&
    editorStateEpoch === routeGenerationRef.current &&
    activeEditorIdentityRef.current === postId &&
    activeEditorEpochRef.current === routeGenerationRef.current;
  const hasCurrentLiveDraft =
    routeStateCurrent && Boolean(postId) && liveDraftRef.current?.editorIdentity === postId;
  const renderedSignature = useMemo(() => {
    if (!postId || !routeStateCurrent) return "";
    return buildDraftSnapshot({
      editorIdentity: postId,
      title,
      slug,
      featuredImage,
      metadataDraft,
      baseData,
      editorState: state,
    }).signature;
  }, [baseData, featuredImage, metadataDraft, postId, routeStateCurrent, slug, state, title]);
  const hasUnsavedChanges = hasCurrentLiveDraft && renderedSignature !== persistedSignature;
  const editorSessionKey = buildEditorSessionKey(postId, editorRouteEpoch);
  const canMutatePost = postId
    ? !loading && Boolean(post) && isCurrentEditableSession(postId, routeGenerationRef.current)
    : false;

  const hasSynchronousUnsavedDraft = useCallback(
    (identity: string, epoch: number) => {
      const liveDraft = liveDraftRef.current;
      const persisted = lastPersistedExactTargetRef.current;
      return (
        liveDraft?.editorIdentity === identity &&
        (!persisted ||
          persisted.editorIdentity !== identity ||
          persisted.editorEpoch !== epoch ||
          liveSignatureRef.current !== persisted.snapshot.signature ||
          hasRestorationDebt(identity, epoch))
      );
    },
    [hasRestorationDebt]
  );

  const taxonomySummary = useMemo(
    () => ({
      categoryName: post?.taxonomy?.category?.name ?? null,
      tagCount: post?.taxonomy?.tags?.length ?? 0,
    }),
    [post]
  );

  const cancelAutosaveRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const previousIdentity = activeEditorIdentityRef.current;
    const previousEpoch = activeEditorEpochRef.current;
    const nextEpoch = routeGenerationRef.current;
    if (previousIdentity === postId && previousEpoch === nextEpoch) return;
    cancelAutosaveRef.current();
    if (previousIdentity) rejectQueuedSession(previousIdentity, previousEpoch);
    activeEditorIdentityRef.current = postId;
    activeEditorEpochRef.current = nextEpoch;
    dirtyRevisionRef.current = 0;
    userMutationGenerationRef.current = 0;
    liveDraftRef.current = null;
    liveSignatureRef.current = "";
    lastPersistedExactTargetRef.current = null;
  }, [postId, rejectQueuedSession]);

  const refresh = useCallback(
    async (options?: { force?: boolean; allowDirty?: boolean; setLoading?: boolean }) => {
      if (!postId) {
        setLoading(false);
        commitIdentityLoadFailure(null, routeGenerationRef.current, "Post ID is missing.");
        return;
      }
      const expectedIdentity = postId;
      const routeGeneration = routeGenerationRef.current;
      const sessionKey = buildEditorSessionKey(expectedIdentity, routeGeneration);
      const potentialWriteGenerationAtRequestStart =
        getPotentialWriteSettlementGeneration(expectedIdentity);
      const requestGeneration = hydrationRequestGenerationRef.current + 1;
      hydrationRequestGenerationRef.current = requestGeneration;
      const saveGeneration = localSaveGenerationBySessionRef.current.get(sessionKey) ?? 0;
      const startedAcrossLocalSave = [...queuedSaveByIdentityRevisionRef.current.values()].some(
        (record) =>
          record.target.editorIdentity === expectedIdentity &&
          record.target.editorEpoch === routeGeneration
      );
      const startedAcrossAuthoritativeBarrier =
        authoritativeBarrierBySessionRef.current.has(sessionKey);
      const startedAcrossLocalMutation =
        startedAcrossLocalSave || startedAcrossAuthoritativeBarrier;
      const isStaleAcrossLocalMutation = () =>
        startedAcrossLocalMutation ||
        (localSaveGenerationBySessionRef.current.get(sessionKey) ?? 0) !== saveGeneration ||
        [...queuedSaveByIdentityRevisionRef.current.values()].some(
          (record) =>
            record.target.editorIdentity === expectedIdentity &&
            record.target.editorEpoch === routeGeneration
        ) ||
        authoritativeBarrierBySessionRef.current.has(sessionKey);
      const isCurrentRequest = () =>
        mountedRef.current &&
        routePostIdRef.current === expectedIdentity &&
        routeGenerationRef.current === routeGeneration &&
        activeEditorIdentityRef.current === expectedIdentity &&
        activeEditorEpochRef.current === routeGeneration &&
        hydrationRequestGenerationRef.current === requestGeneration;
      if (options?.setLoading !== false) {
        setLoading(true);
      }
      if (!startedAcrossLocalMutation) setError(null);
      try {
        const nextPost = await getPostCached(expectedIdentity, {
          force: options?.force ?? true,
        });
        if (!isCurrentRequest()) return;
        if (isStaleAcrossLocalMutation()) return;
        if (!nextPost) {
          commitIdentityLoadFailure(expectedIdentity, routeGeneration, "Post not found.");
          return;
        }
        const hasDirtyActiveDraft =
          liveDraftRef.current?.editorIdentity === expectedIdentity &&
          (hasSynchronousUnsavedDraft(expectedIdentity, routeGeneration) ||
            [...queuedSaveByIdentityRevisionRef.current.values()].some(
              (record) =>
                record.target.editorIdentity === expectedIdentity &&
                record.target.editorEpoch === routeGeneration
            ));
        if (shouldDeferRefreshForDirtyState(options, hasDirtyActiveDraft)) {
          setRemoteUpdatePending(true);
          return;
        }
        if (
          applyLoadedPost(
            nextPost,
            expectedIdentity,
            routeGeneration,
            potentialWriteGenerationAtRequestStart
          )
        ) {
          setRemoteUpdatePending(false);
        }
      } catch (err) {
        if (!isCurrentRequest()) return;
        if (isStaleAcrossLocalMutation()) return;
        commitIdentityLoadFailure(
          expectedIdentity,
          routeGeneration,
          isApiClientError(err) ? err.message : "Failed to load post editor."
        );
      } finally {
        if (isCurrentRequest() && options?.setLoading !== false) {
          setLoading(false);
        }
      }
    },
    [
      applyLoadedPost,
      commitIdentityLoadFailure,
      getPotentialWriteSettlementGeneration,
      hasSynchronousUnsavedDraft,
      postId,
    ]
  );

  useEffect(() => {
    let active = true;
    const expectedIdentity = postId;
    const routeGeneration = routeGenerationRef.current;
    const sessionKey = expectedIdentity
      ? buildEditorSessionKey(expectedIdentity, routeGeneration)
      : null;
    const potentialWriteGenerationAtRequestStart = expectedIdentity
      ? getPotentialWriteSettlementGeneration(expectedIdentity)
      : 0;
    const requestGeneration = hydrationRequestGenerationRef.current + 1;
    hydrationRequestGenerationRef.current = requestGeneration;
    const saveGeneration = expectedIdentity
      ? (localSaveGenerationBySessionRef.current.get(sessionKey as string) ?? 0)
      : 0;
    const startedAcrossLocalSave = expectedIdentity
      ? [...queuedSaveByIdentityRevisionRef.current.values()].some(
          (record) =>
            record.target.editorIdentity === expectedIdentity &&
            record.target.editorEpoch === routeGeneration
        )
      : false;
    const startedAcrossAuthoritativeBarrier = expectedIdentity
      ? authoritativeBarrierBySessionRef.current.has(sessionKey as string)
      : false;
    const startedAcrossLocalMutation = startedAcrossLocalSave || startedAcrossAuthoritativeBarrier;
    const isStaleAcrossLocalMutation = () => {
      if (!expectedIdentity) return false;
      return (
        startedAcrossLocalMutation ||
        (localSaveGenerationBySessionRef.current.get(sessionKey as string) ?? 0) !==
          saveGeneration ||
        [...queuedSaveByIdentityRevisionRef.current.values()].some(
          (record) =>
            record.target.editorIdentity === expectedIdentity &&
            record.target.editorEpoch === routeGeneration
        ) ||
        authoritativeBarrierBySessionRef.current.has(sessionKey as string)
      );
    };
    const isCurrentRequest = () =>
      active &&
      mountedRef.current &&
      routePostIdRef.current === expectedIdentity &&
      routeGenerationRef.current === routeGeneration &&
      activeEditorIdentityRef.current === expectedIdentity &&
      activeEditorEpochRef.current === routeGeneration &&
      hydrationRequestGenerationRef.current === requestGeneration;
    Promise.resolve()
      .then(async () => {
        if (!expectedIdentity) {
          if (!isCurrentRequest()) return;
          setLoading(false);
          commitIdentityLoadFailure(null, routeGeneration, "Post ID is missing.");
          return;
        }
        const nextPost = await getPostCached(expectedIdentity, { force: true });
        if (!isCurrentRequest()) return;
        if (isStaleAcrossLocalMutation()) return;
        if (!nextPost) {
          commitIdentityLoadFailure(expectedIdentity, routeGeneration, "Post not found.");
          return;
        }
        const hasDirtyActiveDraft =
          liveDraftRef.current?.editorIdentity === expectedIdentity &&
          (hasSynchronousUnsavedDraft(expectedIdentity, routeGeneration) ||
            [...queuedSaveByIdentityRevisionRef.current.values()].some(
              (record) =>
                record.target.editorIdentity === expectedIdentity &&
                record.target.editorEpoch === routeGeneration
            ));
        if (shouldDeferRefreshForDirtyState(undefined, hasDirtyActiveDraft)) {
          setRemoteUpdatePending(true);
          return;
        }
        if (
          applyLoadedPost(
            nextPost,
            expectedIdentity,
            routeGeneration,
            potentialWriteGenerationAtRequestStart
          )
        ) {
          setRemoteUpdatePending(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!isCurrentRequest()) return;
        if (isStaleAcrossLocalMutation()) return;
        commitIdentityLoadFailure(
          expectedIdentity,
          routeGeneration,
          isApiClientError(err) ? err.message : "Failed to load post editor."
        );
      })
      .finally(() => {
        if (isCurrentRequest()) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    applyLoadedPost,
    commitIdentityLoadFailure,
    getPotentialWriteSettlementGeneration,
    hasSynchronousUnsavedDraft,
    postId,
  ]);

  useEffect(() => {
    if (!postId) return;
    const expectedEpoch = routeGenerationRef.current;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postDetail(postId)) return;
      if (
        routePostIdRef.current !== postId ||
        routeGenerationRef.current !== expectedEpoch ||
        activeEditorEpochRef.current !== expectedEpoch
      ) {
        return;
      }
      const hasLocalPersistenceWork =
        inFlightSaveByIdentityRef.current.has(postId) ||
        [...queuedSaveByIdentityRevisionRef.current.values()].some(
          (record) => record.target.editorIdentity === postId
        ) ||
        [...authoritativeBarrierBySessionRef.current.values()].some(
          (barrier) => barrier.editorIdentity === postId
        ) ||
        hasRestorationDebt(postId, expectedEpoch);
      if (hasLocalPersistenceWork) return;
      refresh({ force: true, setLoading: false }).catch(() => undefined);
    });
  }, [hasRestorationDebt, postId, refresh]);

  useEffect(() => {
    if (!postId) return;
    const expectedEpoch = routeGenerationRef.current;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postRevisions(postId)) return;
      if (!isCurrentEditableSession(postId, expectedEpoch)) return;
      const cached = getCachedPostRevisions(postId);
      if (cached) {
        setRevisions(cached);
      }
    });
  }, [isCurrentEditableSession, postId]);

  const captureCurrentTarget = useCallback((): SaveTarget => {
    const identity = activeEditorIdentityRef.current;
    const epoch = activeEditorEpochRef.current;
    const liveDraft = liveDraftRef.current;
    if (
      !identity ||
      !isCurrentEditableSession(identity, epoch) ||
      routePostIdRef.current !== identity ||
      !liveDraft ||
      liveDraft.editorIdentity !== identity
    ) {
      throw createEditorIdentityChangedError();
    }
    const snapshot = buildDraftSnapshot(liveDraft);
    if (snapshot.signature !== liveSignatureRef.current) {
      liveSignatureRef.current = snapshot.signature;
      dirtyRevisionRef.current += 1;
      userMutationGenerationRef.current += 1;
    }
    return deepFreezeJsonContract({
      editorIdentity: identity,
      editorEpoch: epoch,
      revision: dirtyRevisionRef.current,
      snapshot,
    });
  }, [isCurrentEditableSession]);

  const captureCurrentTargetAfterAuthoritativeBarrier = useCallback(
    async (identity: string, epoch: number): Promise<SaveTarget> => {
      const sessionKey = buildEditorSessionKey(identity, epoch);
      for (;;) {
        const barrier = authoritativeBarrierBySessionRef.current.get(sessionKey);
        if (!barrier) return captureCurrentTarget();
        await barrier.outcome;
        if (!isCurrentEditableSession(identity, epoch)) {
          throw createEditorIdentityChangedError();
        }
      }
    },
    [captureCurrentTarget, isCurrentEditableSession]
  );

  const applyPersistedResponse = useCallback(
    (record: QueuedRevisionSave, response: PersistedSaveResult) => {
      const { editorIdentity, editorEpoch, revision } = record.target;
      if (!isCurrentEditableSession(editorIdentity, editorEpoch)) {
        return;
      }
      const authoritativeTarget = lastPersistedExactTargetRef.current;
      if (
        authoritativeTarget &&
        isSameEditorSession(authoritativeTarget, record.target) &&
        authoritativeTarget.revision > revision
      ) {
        return;
      }

      const responseLiveDraft = createLiveDraftFromPost(response.post);
      responseLiveDraft.editorIdentity = editorIdentity;
      const persistedTarget: SaveTarget = {
        editorIdentity,
        editorEpoch,
        revision,
        snapshot: buildDraftSnapshot(responseLiveDraft),
      };
      const isCurrentRevision =
        dirtyRevisionRef.current === revision &&
        liveDraftRef.current?.editorIdentity === editorIdentity &&
        liveSignatureRef.current === record.target.snapshot.signature;

      lastPersistedExactTargetRef.current = persistedTarget;
      if (!mountedRef.current) return;
      setPost(response.post);
      setStatus(response.post.status);
      setPersistedSignature(persistedTarget.snapshot.signature);
      setLastSavedAt(response.savedAt);
      setRemoteUpdatePending(false);
      setAutosaveError(null);

      if (!isCurrentRevision) {
        const currentLiveDraft = liveDraftRef.current;
        if (currentLiveDraft?.editorIdentity === editorIdentity) {
          const rebasedLiveDraft: LivePostDraft = {
            ...currentLiveDraft,
            baseData: responseLiveDraft.baseData,
          };
          const rebasedSignature = buildDraftSnapshot(rebasedLiveDraft).signature;
          if (rebasedSignature !== liveSignatureRef.current) {
            dirtyRevisionRef.current += 1;
          }
          liveDraftRef.current = rebasedLiveDraft;
          liveSignatureRef.current = rebasedSignature;
          setBaseData(responseLiveDraft.baseData);
        }
        return;
      }

      if (record.syncMode === "silent") {
        const currentLiveDraft = liveDraftRef.current;
        if (!currentLiveDraft || currentLiveDraft.editorIdentity !== editorIdentity) return;
        const responseDocument = responseLiveDraft.editorState.document;
        const retainedSelection = responseDocument.blocks.some(
          (block) => block.id === currentLiveDraft.editorState.selectedBlockId
        )
          ? currentLiveDraft.editorState.selectedBlockId
          : (responseDocument.blocks[0]?.id ?? null);
        const synchronizedEditorState: PostEditorState = {
          ...currentLiveDraft.editorState,
          document: responseDocument,
          selectedBlockId: retainedSelection,
          dirty: false,
          saving: false,
          lastSavedAt: response.savedAt,
        };
        const silentlySynchronizedDraft: LivePostDraft = {
          ...responseLiveDraft,
          editorState: synchronizedEditorState,
        };
        const synchronizedSnapshot = buildDraftSnapshot(silentlySynchronizedDraft);
        liveDraftRef.current = silentlySynchronizedDraft;
        liveSignatureRef.current = synchronizedSnapshot.signature;
        setEditorState(synchronizedEditorState);
        setTitleState(silentlySynchronizedDraft.title);
        setSlugState(silentlySynchronizedDraft.slug);
        setFeaturedImageState(silentlySynchronizedDraft.featuredImage);
        setMetadataDraftState(silentlySynchronizedDraft.metadataDraft);
        setBaseData(silentlySynchronizedDraft.baseData);
        return;
      }

      const currentSelection = liveDraftRef.current?.editorState.selectedBlockId ?? null;
      responseLiveDraft.editorState = createInitialPostEditorState(
        responseLiveDraft.editorState.document,
        currentSelection
      );
      liveDraftRef.current = responseLiveDraft;
      liveSignatureRef.current = persistedTarget.snapshot.signature;
      setTitleState(responseLiveDraft.title);
      setSlugState(responseLiveDraft.slug);
      setFeaturedImageState(responseLiveDraft.featuredImage);
      setMetadataDraftState(responseLiveDraft.metadataDraft);
      setBaseData(responseLiveDraft.baseData);
      dispatch({
        type: "hydrate",
        document: responseLiveDraft.editorState.document,
        selectedBlockId: currentSelection,
      });
    },
    [dispatch, isCurrentEditableSession]
  );

  const drainExactRevisionQueue = useCallback(
    async (identity: string): Promise<void> => {
      const activeDrain = drainPromiseByIdentityRef.current.get(identity);
      if (activeDrain) return activeDrain;
      const drainPromise = (async () => {
        for (;;) {
          const nextRecord = orderedSaveQueueRef.current.find(
            (record) => record.target.editorIdentity === identity
          );
          if (!nextRecord) break;
          const sessionKey = buildEditorSessionKey(
            nextRecord.target.editorIdentity,
            nextRecord.target.editorEpoch
          );
          if (nextRecord.predecessorBarrierOutcome) {
            try {
              await nextRecord.predecessorBarrierOutcome;
              nextRecord.predecessorBarrierOutcome = null;
            } catch (error) {
              const queuedIndex = orderedSaveQueueRef.current.indexOf(nextRecord);
              if (queuedIndex !== -1) {
                orderedSaveQueueRef.current.splice(queuedIndex, 1);
              }
              const key = buildSaveTargetKey(nextRecord.target);
              if (queuedSaveByIdentityRevisionRef.current.get(key) === nextRecord) {
                queuedSaveByIdentityRevisionRef.current.delete(key);
              }
              nextRecord.reject(error);
              continue;
            }
            if (!orderedSaveQueueRef.current.includes(nextRecord)) continue;
          }
          const crossSessionBarriers = [
            ...authoritativeBarrierBySessionRef.current.values(),
          ].filter(
            (barrier) =>
              barrier.editorIdentity === identity &&
              barrier.editorEpoch !== nextRecord.target.editorEpoch &&
              nextRecord.admissionOrder > barrier.cutoffAdmissionOrder
          );
          if (crossSessionBarriers.length > 0) {
            await Promise.all(crossSessionBarriers.map((barrier) => barrier.completion));
            continue;
          }
          const barrier = authoritativeBarrierBySessionRef.current.get(sessionKey);
          if (barrier && nextRecord.admissionOrder > barrier.cutoffAdmissionOrder) {
            await barrier.completion;
            continue;
          }
          const queuedIndex = orderedSaveQueueRef.current.indexOf(nextRecord);
          if (queuedIndex === -1) continue;
          const [record] = orderedSaveQueueRef.current.splice(queuedIndex, 1);
          if (!record) continue;
          inFlightSaveByIdentityRef.current.set(identity, record);
          const { editorIdentity, editorEpoch, snapshot } = record.target;
          let potentialWriteStarted = false;
          let exactWriteSucceeded = false;
          try {
            record.dispatched = true;
            if (isCurrentEditableSession(editorIdentity, editorEpoch)) {
              if (record.persistenceKind === "autosave") setAutosaveSaving(true);
              setAutosaveError(null);
            }
            if (!isCurrentEditableSession(editorIdentity, editorEpoch)) {
              throw createEditorIdentityChangedError();
            }

            let response: PersistedSaveResult;
            if (record.persistenceKind === "autosave") {
              potentialWriteStarted = true;
              const result = await autosavePost(editorIdentity, snapshot.autosavePayload);
              response = { post: result.post, savedAt: result.savedAt };
            } else {
              const restorationDebtAtDispatch = hasRestorationDebt(editorIdentity, editorEpoch);
              potentialWriteStarted = true;
              const updatedDraft = await updatePost(editorIdentity, snapshot.basePayload);
              const predecessorMetadataSignature =
                lastPersistedExactTargetRef.current &&
                isSameEditorSession(lastPersistedExactTargetRef.current, record.target)
                  ? lastPersistedExactTargetRef.current.snapshot.metadataSignature
                  : null;
              const sessionStillCurrent = isCurrentEditableSession(editorIdentity, editorEpoch);
              const synchronizedPost =
                sessionStillCurrent &&
                (restorationDebtAtDispatch ||
                  predecessorMetadataSignature !== snapshot.metadataSignature)
                  ? await (async () => {
                      return updatePostMetadata(editorIdentity, snapshot.metadataPayload);
                    })()
                  : updatedDraft;
              response = { post: synchronizedPost, savedAt: synchronizedPost.updatedAt };
            }

            applyPersistedResponse(record, response);
            exactWriteSucceeded = true;
            record.resolve();
          } catch (error) {
            if (isCurrentEditableSession(editorIdentity, editorEpoch)) {
              setAutosaveError(
                isApiClientError(error) ? error.message : "Failed to autosave post."
              );
            }
            record.reject(error);

            const remaining: QueuedRevisionSave[] = [];
            for (const dependent of orderedSaveQueueRef.current) {
              if (
                dependent.target.editorIdentity !== editorIdentity ||
                dependent.target.editorEpoch !== editorEpoch
              ) {
                remaining.push(dependent);
                continue;
              }
              queuedSaveByIdentityRevisionRef.current.delete(buildSaveTargetKey(dependent.target));
              dependent.reject(error);
            }
            orderedSaveQueueRef.current = remaining;
            break;
          } finally {
            const key = buildSaveTargetKey(record.target);
            if (queuedSaveByIdentityRevisionRef.current.get(key) === record) {
              queuedSaveByIdentityRevisionRef.current.delete(key);
            }
            if (inFlightSaveByIdentityRef.current.get(identity) === record) {
              inFlightSaveByIdentityRef.current.delete(identity);
            }
            if (potentialWriteStarted) {
              const settlementGeneration = recordPotentialWriteSettlement(identity);
              if (exactWriteSucceeded && isCurrentEditableSession(editorIdentity, editorEpoch)) {
                acceptPersistedPotentialWriteWatermark(
                  editorIdentity,
                  editorEpoch,
                  settlementGeneration
                );
              }
            }
            if (isCurrentEditableSession(editorIdentity, editorEpoch)) {
              if (record.persistenceKind === "autosave") setAutosaveSaving(false);
            }
          }
        }
      })().finally(() => {
        drainPromiseByIdentityRef.current.delete(identity);
        const hasQueuedIdentityRecord = orderedSaveQueueRef.current.some(
          (record) => record.target.editorIdentity === identity
        );
        if (hasQueuedIdentityRecord) {
          queueMicrotask(() => {
            if (
              !drainPromiseByIdentityRef.current.has(identity) &&
              orderedSaveQueueRef.current.some(
                (record) => record.target.editorIdentity === identity
              )
            ) {
              void drainQueueRef.current(identity);
            }
          });
        }
      });
      drainPromiseByIdentityRef.current.set(identity, drainPromise);
      return drainPromise;
    },
    [
      acceptPersistedPotentialWriteWatermark,
      applyPersistedResponse,
      hasRestorationDebt,
      isCurrentEditableSession,
      recordPotentialWriteSettlement,
    ]
  );
  drainQueueRef.current = drainExactRevisionQueue;

  const enqueueExactRevisionSave = useCallback(
    (
      target: SaveTarget,
      mode: SaveMode,
      persistenceKind: SavePersistenceKind = mode === "manual" ? "draft" : "autosave",
      syncMode: PostDraftSyncMode = "silent"
    ): Promise<void> => {
      if (!isCurrentEditableSession(target.editorIdentity, target.editorEpoch)) {
        return Promise.reject(createEditorIdentityChangedError());
      }

      const predecessors = [...queuedSaveByIdentityRevisionRef.current.values()].filter((record) =>
        isUnresolvedPredecessorForTarget(record, target)
      );
      const conflictingPredecessor = predecessors.some(
        (record) => !sameSnapshot(record.target.snapshot, target.snapshot)
      );
      const persisted = lastPersistedExactTargetRef.current;
      const admittedAcrossAuthoritativeBarrier = authoritativeBarrierBySessionRef.current.has(
        buildEditorSessionKey(target.editorIdentity, target.editorEpoch)
      );
      const restorationDebt = hasRestorationDebt(target.editorIdentity, target.editorEpoch);
      const pendingPotentialWrite = hasPendingPotentialWrite(target.editorIdentity);
      if (
        persisted &&
        isSameEditorSession(persisted, target) &&
        sameSnapshot(persisted.snapshot, target.snapshot) &&
        !conflictingPredecessor &&
        !admittedAcrossAuthoritativeBarrier &&
        !restorationDebt &&
        !pendingPotentialWrite
      ) {
        return Promise.resolve();
      }

      const key = buildSaveTargetKey(target);
      const existing = queuedSaveByIdentityRevisionRef.current.get(key);
      if (existing) {
        if (!sameSnapshot(existing.target.snapshot, target.snapshot)) {
          return Promise.reject(new Error("A save revision captured conflicting draft bytes."));
        }
        existing.modes.add(mode);
        if (syncMode === "hydrate") existing.syncMode = "hydrate";
        return existing.promise;
      }

      let resolvePromise: () => void = () => undefined;
      let rejectPromise: (error: unknown) => void = () => undefined;
      const promise = new Promise<void>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      void promise.catch(() => undefined);
      const record: QueuedRevisionSave = {
        target,
        modes: new Set([mode]),
        persistenceKind,
        syncMode,
        admissionOrder: saveAdmissionSequenceRef.current + 1,
        predecessorBarrierOutcome:
          authoritativeBarrierBySessionRef.current.get(
            buildEditorSessionKey(target.editorIdentity, target.editorEpoch)
          )?.outcome ?? null,
        dispatched: false,
        promise,
        resolve: resolvePromise,
        reject: rejectPromise,
      };
      saveAdmissionSequenceRef.current = record.admissionOrder;
      advanceLocalMutationGeneration(target.editorIdentity, target.editorEpoch);
      queuedSaveByIdentityRevisionRef.current.set(key, record);
      const insertAt = orderedSaveQueueRef.current.findIndex(
        (queued) =>
          queued.target.editorIdentity === target.editorIdentity &&
          queued.target.editorEpoch === target.editorEpoch &&
          queued.target.revision > target.revision
      );
      if (insertAt === -1) orderedSaveQueueRef.current.push(record);
      else orderedSaveQueueRef.current.splice(insertAt, 0, record);
      void drainExactRevisionQueue(target.editorIdentity);
      return promise;
    },
    [
      advanceLocalMutationGeneration,
      drainExactRevisionQueue,
      hasPendingPotentialWrite,
      hasRestorationDebt,
      isCurrentEditableSession,
    ]
  );

  const runAuthoritativeIdentityBarrier = useCallback(
    async <T>(
      identity: string,
      epoch: number,
      mode: AuthoritativeBarrierMode,
      operation: (
        reservedRevision: number,
        userMutationGenerationAtStart: number,
        markPotentialWriteStarted: () => void
      ) => Promise<T>
    ): Promise<T> => {
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      const sessionKey = buildEditorSessionKey(identity, epoch);
      const previousBarrier = authoritativeBarrierBySessionRef.current.get(sessionKey);
      const crossSessionBarrierPredecessors = [
        ...authoritativeBarrierBySessionRef.current.values(),
      ].filter(
        (candidate) => candidate.editorIdentity === identity && candidate.editorEpoch !== epoch
      );
      let releaseBarrier: () => void = () => undefined;
      let resolveOutcome: () => void = () => undefined;
      let rejectOutcome: (error: unknown) => void = () => undefined;
      let potentialWriteStarted = false;
      let operationSucceeded = false;
      const barrierCompletion = new Promise<void>((resolve) => {
        releaseBarrier = resolve;
      });
      const barrierOutcome = new Promise<void>((resolve, reject) => {
        resolveOutcome = resolve;
        rejectOutcome = reject;
      });
      void barrierOutcome.catch(() => undefined);
      dirtyRevisionRef.current += 1;
      const barrier: AuthoritativeBarrierState = {
        editorIdentity: identity,
        editorEpoch: epoch,
        potentialWritePending:
          mode === "potential-write" ||
          Boolean(previousBarrier?.potentialWritePending) ||
          crossSessionBarrierPredecessors.some((candidate) => candidate.potentialWritePending),
        completion: barrierCompletion,
        outcome: barrierOutcome,
        cutoffAdmissionOrder: saveAdmissionSequenceRef.current,
        reservedRevision: dirtyRevisionRef.current,
        userMutationGenerationAtStart: userMutationGenerationRef.current,
      };
      advanceLocalMutationGeneration(identity, epoch);
      authoritativeBarrierBySessionRef.current.set(sessionKey, barrier);
      try {
        if (previousBarrier) await previousBarrier.outcome;
        await Promise.all(crossSessionBarrierPredecessors.map((candidate) => candidate.completion));
        const predecessors = [...queuedSaveByIdentityRevisionRef.current.values()].filter(
          (record) =>
            record.target.editorIdentity === identity &&
            record.admissionOrder <= barrier.cutoffAdmissionOrder
        );
        await Promise.all(
          predecessors.map((record) =>
            record.target.editorEpoch === epoch
              ? record.promise
              : record.promise.catch(() => undefined)
          )
        );
        const result = await operation(
          barrier.reservedRevision,
          barrier.userMutationGenerationAtStart,
          () => {
            if (mode === "potential-write") potentialWriteStarted = true;
          }
        );
        operationSucceeded = true;
        resolveOutcome();
        return result;
      } catch (error) {
        rejectOutcome(error);
        const remaining: QueuedRevisionSave[] = [];
        for (const record of orderedSaveQueueRef.current) {
          if (
            record.target.editorIdentity !== identity ||
            record.target.editorEpoch !== epoch ||
            record.admissionOrder <= barrier.cutoffAdmissionOrder
          ) {
            remaining.push(record);
            continue;
          }
          queuedSaveByIdentityRevisionRef.current.delete(buildSaveTargetKey(record.target));
          record.reject(error);
        }
        orderedSaveQueueRef.current = remaining;
        throw error;
      } finally {
        if (potentialWriteStarted) {
          const settlementGeneration = recordPotentialWriteSettlement(identity);
          if (operationSucceeded && isCurrentEditableSession(identity, epoch)) {
            acceptPersistedPotentialWriteWatermark(identity, epoch, settlementGeneration);
          }
        }
        releaseBarrier();
        if (authoritativeBarrierBySessionRef.current.get(sessionKey) === barrier) {
          authoritativeBarrierBySessionRef.current.delete(sessionKey);
        }
      }
    },
    [
      acceptPersistedPotentialWriteWatermark,
      advanceLocalMutationGeneration,
      isCurrentEditableSession,
      recordPotentialWriteSettlement,
    ]
  );

  const runAutosave = useCallback(async () => {
    const identity = activeEditorIdentityRef.current;
    const epoch = activeEditorEpochRef.current;
    const target =
      identity &&
      authoritativeBarrierBySessionRef.current.has(buildEditorSessionKey(identity, epoch))
        ? await captureCurrentTargetAfterAuthoritativeBarrier(identity, epoch)
        : captureCurrentTarget();
    await enqueueExactRevisionSave(target, "background", "autosave");
  }, [
    captureCurrentTarget,
    captureCurrentTargetAfterAuthoritativeBarrier,
    enqueueExactRevisionSave,
  ]);

  const autosaveSignature = `${postId ?? ""}:${routeGenerationRef.current}:${dirtyRevisionRef.current}:${renderedSignature}`;
  const { cancel: cancelAutosave, flush: flushScheduledAutosave } = usePostAutosave({
    enabled: hasCurrentLiveDraft && !loading && !remoteUpdatePending,
    dirty: hasUnsavedChanges,
    signature: autosaveSignature,
    onAutosave: runAutosave,
  });
  cancelAutosaveRef.current = cancelAutosave;

  const loadRevisions = useCallback(
    async (options?: { silent?: boolean }) => {
      const { identity, epoch } = requireCurrentEditableSession();
      if (!options?.silent) {
        setRevisionsLoading(true);
      }
      setRevisionsError(null);
      try {
        const nextRevisions = await listPostRevisionsCached(identity, {
          force: false,
        });
        if (!isCurrentEditableSession(identity, epoch)) {
          throw createEditorIdentityChangedError();
        }
        setRevisions(nextRevisions);
      } catch (err) {
        if (isCurrentEditableSession(identity, epoch)) {
          if (isApiClientError(err)) {
            setRevisionsError(err.message);
          } else {
            setRevisionsError("Failed to load post revisions.");
          }
        }
        throw err;
      } finally {
        if (!options?.silent && isCurrentEditableSession(identity, epoch)) {
          setRevisionsLoading(false);
        }
      }
    },
    [isCurrentEditableSession, requireCurrentEditableSession]
  );

  const saveDraftInternal = useCallback(
    async (options?: { syncMode?: PostDraftSyncMode }) => {
      const { identity, epoch } = requireCurrentEditableSession();
      const syncMode = normalizePostDraftSyncMode(options?.syncMode);
      cancelAutosave();
      const target = captureCurrentTarget();
      dispatchEditorAction({ type: "set_saving", saving: true });
      setAutosaveError(null);
      setError(null);
      try {
        await enqueueExactRevisionSave(target, "manual", "draft", syncMode);
      } catch (err) {
        if (isCurrentEditableSession(identity, epoch)) {
          if (isApiClientError(err)) {
            setError(err.message);
          } else {
            setError("Failed to save post draft.");
          }
        }
        throw err;
      } finally {
        if (isCurrentEditableSession(identity, epoch)) {
          dispatchEditorAction({ type: "set_saving", saving: false });
        }
      }
    },
    [
      cancelAutosave,
      captureCurrentTarget,
      dispatchEditorAction,
      enqueueExactRevisionSave,
      isCurrentEditableSession,
      requireCurrentEditableSession,
    ]
  );

  const saveDraft = useCallback(async () => {
    await saveDraftInternal({ syncMode: "silent" });
  }, [saveDraftInternal]);

  const flushLatestAutosave = useCallback(async () => {
    const closeIdentity = postId;
    const closeEpoch = editorRouteEpoch;
    if (!mountedRef.current) throw createEditorIdentityChangedError();
    if (routePostIdRef.current !== closeIdentity || routeGenerationRef.current !== closeEpoch) {
      throw createEditorIdentityChangedError();
    }
    if (
      editorStateIdentityRef.current !== closeIdentity ||
      editorStateEpochRef.current !== closeEpoch ||
      liveDraftRef.current?.editorIdentity !== closeIdentity
    ) {
      return;
    }
    if (!closeIdentity) return;
    if (
      activeEditorIdentityRef.current !== closeIdentity ||
      activeEditorEpochRef.current !== closeEpoch
    ) {
      throw createEditorIdentityChangedError();
    }
    const assertCloseIdentityCurrent = () => {
      if (
        !mountedRef.current ||
        routePostIdRef.current !== closeIdentity ||
        routeGenerationRef.current !== closeEpoch ||
        activeEditorIdentityRef.current !== closeIdentity ||
        activeEditorEpochRef.current !== closeEpoch
      ) {
        throw createEditorIdentityChangedError();
      }
    };
    try {
      assertCloseIdentityCurrent();
      let scheduledAutosaveFlushed = false;
      for (;;) {
        assertCloseIdentityCurrent();
        const barrier = authoritativeBarrierBySessionRef.current.get(
          buildEditorSessionKey(closeIdentity, closeEpoch)
        );
        if (barrier) {
          await barrier.outcome;
          assertCloseIdentityCurrent();
          continue;
        }
        const stalePotentialWriteBarriers = [
          ...authoritativeBarrierBySessionRef.current.values(),
        ].filter(
          (candidate) =>
            candidate.editorIdentity === closeIdentity &&
            candidate.editorEpoch !== closeEpoch &&
            candidate.potentialWritePending
        );
        if (stalePotentialWriteBarriers.length > 0) {
          await Promise.all(stalePotentialWriteBarriers.map((candidate) => candidate.completion));
          assertCloseIdentityCurrent();
          continue;
        }
        if (!scheduledAutosaveFlushed) {
          scheduledAutosaveFlushed = true;
          await flushScheduledAutosave();
          assertCloseIdentityCurrent();
          continue;
        }
        assertCloseIdentityCurrent();
        const target = captureCurrentTarget();
        if (target.editorIdentity !== closeIdentity) {
          throw createEditorIdentityChangedError();
        }
        const predecessors = [...queuedSaveByIdentityRevisionRef.current.values()].filter(
          (record) => isUnresolvedPredecessorForTarget(record, target)
        );
        const conflictingPredecessor = predecessors.some(
          (record) => !sameSnapshot(record.target.snapshot, target.snapshot)
        );
        const persisted = lastPersistedExactTargetRef.current;
        const restorationDebt = hasRestorationDebt(target.editorIdentity, target.editorEpoch);
        if (
          persisted &&
          isSameEditorSession(persisted, target) &&
          sameSnapshot(persisted.snapshot, target.snapshot) &&
          !conflictingPredecessor &&
          !restorationDebt
        ) {
          await Promise.all(
            predecessors.map((record) =>
              record.target.editorEpoch === target.editorEpoch
                ? record.promise
                : record.promise.catch(() => undefined)
            )
          );
        } else {
          await enqueueExactRevisionSave(target, "close", "autosave");
        }

        assertCloseIdentityCurrent();
        if (
          dirtyRevisionRef.current === target.revision &&
          !hasRestorationDebt(target.editorIdentity, target.editorEpoch) &&
          !hasPendingPotentialWrite(target.editorIdentity)
        ) {
          assertCloseIdentityCurrent();
          return;
        }
      }
    } catch (error) {
      if (
        closeIdentity &&
        mountedRef.current &&
        routePostIdRef.current === closeIdentity &&
        routeGenerationRef.current === closeEpoch &&
        activeEditorIdentityRef.current === closeIdentity &&
        activeEditorEpochRef.current === closeEpoch
      ) {
        setAutosaveError(resolveCloseSaveErrorCopy(error));
      }
      throw error;
    }
  }, [
    captureCurrentTarget,
    editorRouteEpoch,
    enqueueExactRevisionSave,
    flushScheduledAutosave,
    hasPendingPotentialWrite,
    hasRestorationDebt,
    postId,
  ]);

  const publish = useCallback(async () => {
    const { identity, epoch } = requireCurrentEditableSession();
    setError(null);
    try {
      await saveDraft();
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      await publishPost(identity);
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      await refresh({ force: true, allowDirty: true, setLoading: false });
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
    } catch (err) {
      if (isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to publish post.");
        }
      }
      throw err;
    }
  }, [isCurrentEditableSession, refresh, requireCurrentEditableSession, saveDraft]);

  const unpublish = useCallback(async () => {
    const { identity, epoch } = requireCurrentEditableSession();
    setError(null);
    try {
      if (hasRestorationDebt(identity, epoch) || hasPendingPotentialWrite(identity)) {
        await saveDraft();
      }
      await unpublishPost(identity);
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      await refresh({ force: true, allowDirty: true, setLoading: false });
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
    } catch (err) {
      if (isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to move post to draft.");
        }
      }
      throw err;
    }
  }, [
    hasPendingPotentialWrite,
    hasRestorationDebt,
    isCurrentEditableSession,
    refresh,
    requireCurrentEditableSession,
    saveDraft,
  ]);

  const preview = useCallback(async () => {
    const { identity, epoch } = requireCurrentEditableSession();
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setError(null);
    try {
      await saveDraftInternal({ syncMode: "silent" });
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      const result = await previewPost(identity, 30);
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      setPreviewUrl(result.previewUrl);
    } catch (err) {
      if (isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setPreviewError(err.message);
        } else {
          setPreviewError("Failed to generate post preview.");
        }
        setPreviewUrl(null);
      }
    } finally {
      if (isCurrentEditableSession(identity, epoch)) setPreviewLoading(false);
    }
  }, [isCurrentEditableSession, requireCurrentEditableSession, saveDraftInternal]);

  const selectedBlock = useMemo(() => {
    if (!state.selectedBlockId) return null;
    return state.document.blocks.find((block) => block.id === state.selectedBlockId) ?? null;
  }, [state.document.blocks, state.selectedBlockId]);

  const updateBlockContent = useCallback(
    (id: string, content: unknown) => {
      dispatchEditorAction({
        type: "update_block",
        mutation: {
          id,
          mutate: (block) => ({ ...block, content }),
        },
      });
    },
    [dispatchEditorAction]
  );

  const updateSelectedBlockContent = useCallback(
    (content: unknown) => {
      if (!selectedBlock) return;
      updateBlockContent(selectedBlock.id, content);
    },
    [selectedBlock, updateBlockContent]
  );

  const updateBlockAttrs = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      dispatchEditorAction({
        type: "update_block",
        mutation: {
          id,
          mutate: (block) => ({
            ...block,
            attrs: {
              ...(isRecord(block.attrs) ? block.attrs : {}),
              ...patch,
            },
          }),
        },
      });
    },
    [dispatchEditorAction]
  );

  const updateSelectedBlockAttrs = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedBlock) return;
      updateBlockAttrs(selectedBlock.id, patch);
    },
    [selectedBlock, updateBlockAttrs]
  );

  const updateDocumentTypography = useCallback(
    (typography: NonNullable<PostBlockDocumentMeta["typography"]>) => {
      dispatchEditorAction({
        type: "update_meta",
        patch: {
          typography,
        },
      });
    },
    [dispatchEditorAction]
  );

  const setExcerpt = useCallback(
    (value: string) => {
      dispatchEditorAction({
        type: "update_meta",
        patch: {
          excerpt: value,
        },
      });
    },
    [dispatchEditorAction]
  );

  const insertBlock = useCallback(
    (type: string, options?: PostInsertOptions) => {
      const safeType = createSafeBlockType(type);
      const mutation = resolvePostInsertMutation({
        blocks: state.document.blocks,
        selectedBlockId: state.selectedBlockId,
        options,
      });
      const inserted = dispatchEditorAction({
        type: "insert_block",
        mutation: {
          block: createPostBlock(safeType),
          ...mutation,
        },
      });
      if (inserted && options?.focus !== false) {
        setInsertFocusToken((value) => value + 1);
      }
    },
    [dispatchEditorAction, state.document.blocks, state.selectedBlockId]
  );

  const ensureDynamicTocBlock = useCallback(() => {
    dispatchEditorAction({
      type: "ensure_toc_block",
      afterBlockId: null,
    });
  }, [dispatchEditorAction]);

  const deleteBlock = useCallback(
    (id: string) => {
      dispatchEditorAction({ type: "delete_block", id });
    },
    [dispatchEditorAction]
  );

  const deleteSelectedBlock = useCallback(() => {
    if (!state.selectedBlockId) return;
    deleteBlock(state.selectedBlockId);
  }, [deleteBlock, state.selectedBlockId]);

  const moveBlock = useCallback(
    (id: string, direction: "up" | "down") => {
      dispatchEditorAction({
        type: "move_block",
        mutation: { id, direction },
      });
    },
    [dispatchEditorAction]
  );

  const moveSelectedBlock = useCallback(
    (direction: "up" | "down") => {
      if (!state.selectedBlockId) return;
      moveBlock(state.selectedBlockId, direction);
    },
    [moveBlock, state.selectedBlockId]
  );

  const moveBlockToIndex = useCallback(
    (id: string, targetIndex: number) => {
      dispatchEditorAction({
        type: "move_block_to_index",
        mutation: { id, targetIndex },
      });
    },
    [dispatchEditorAction]
  );

  const transformBlock = useCallback(
    (id: string, targetType: PostBlockType) => {
      dispatchEditorAction({
        type: "transform_block",
        mutation: { id, targetType },
      });
    },
    [dispatchEditorAction]
  );

  const transformSelectedBlock = useCallback(
    (targetType: PostBlockType) => {
      if (!state.selectedBlockId) return;
      transformBlock(state.selectedBlockId, targetType);
    },
    [state.selectedBlockId, transformBlock]
  );

  const setTagsInput = useCallback(
    (value: string) => {
      if (
        installLiveDraftMutation((current) => ({
          ...current,
          metadataDraft: { ...current.metadataDraft, tagsInput: value },
        }))
      ) {
        setMetadataDraftState((prev) => ({ ...prev, tagsInput: value }));
      }
    },
    [installLiveDraftMutation]
  );

  const setCategoryId = useCallback(
    (value: string) => {
      if (
        installLiveDraftMutation((current) => ({
          ...current,
          metadataDraft: { ...current.metadataDraft, categoryId: value },
        }))
      ) {
        setMetadataDraftState((prev) => ({ ...prev, categoryId: value }));
      }
    },
    [installLiveDraftMutation]
  );

  const setSeoDraft = useCallback(
    (patch: Partial<UsePostEditorStateResult["seoDraft"]>) => {
      if (
        installLiveDraftMutation((current) => ({
          ...current,
          metadataDraft: {
            ...current.metadataDraft,
            seo: { ...current.metadataDraft.seo, ...patch },
          },
        }))
      ) {
        setMetadataDraftState((prev) => ({
          ...prev,
          seo: {
            ...prev.seo,
            ...patch,
          },
        }));
      }
    },
    [installLiveDraftMutation]
  );

  const openRevisions = useCallback(() => {
    try {
      requireCurrentEditableSession();
    } catch {
      return;
    }
    setRevisionsOpen(true);
    loadRevisions().catch(() => undefined);
  }, [loadRevisions, requireCurrentEditableSession]);

  const moveToTrash = useCallback(async () => {
    if (deletingPost) return false;
    let session: Readonly<{ identity: string; epoch: number }>;
    try {
      session = requireCurrentEditableSession();
    } catch {
      return false;
    }
    const { identity, epoch } = session;
    setError(null);
    setAutosaveError(null);
    setDeletingPost(true);
    cancelAutosave();
    try {
      const result = await deletePost(identity);
      if (!isCurrentEditableSession(identity, epoch)) return false;
      return result?.ok === true;
    } catch (err) {
      if (isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to move post to trash.");
        }
      }
      return false;
    } finally {
      if (isCurrentEditableSession(identity, epoch)) setDeletingPost(false);
    }
  }, [cancelAutosave, deletingPost, isCurrentEditableSession, requireCurrentEditableSession]);

  const handleSetRevisionsOpen = useCallback(
    (open: boolean) => {
      if (open) {
        try {
          requireCurrentEditableSession();
        } catch {
          return;
        }
      }
      setRevisionsOpen(open);
      if (open) {
        loadRevisions().catch(() => undefined);
      }
    },
    [loadRevisions, requireCurrentEditableSession]
  );

  const handleSetPreviewOpen = useCallback(
    (open: boolean) => {
      if (open) {
        try {
          requireCurrentEditableSession();
        } catch {
          return;
        }
      }
      setPreviewOpen(open);
    },
    [requireCurrentEditableSession]
  );

  const restoreRevision = useCallback(
    async (revisionId: string) => {
      const { identity: expectedIdentity, epoch: routeGeneration } =
        requireCurrentEditableSession();
      const isCurrentIdentity = () => isCurrentEditableSession(expectedIdentity, routeGeneration);
      if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
      const requestGeneration = restoreRequestGenerationRef.current + 1;
      restoreRequestGenerationRef.current = requestGeneration;
      const isLatestRequest = () =>
        isCurrentIdentity() && restoreRequestGenerationRef.current === requestGeneration;
      setError(null);
      setRevisionsError(null);
      setRestoringRevisionId(revisionId);
      try {
        cancelAutosave();
        await runAuthoritativeIdentityBarrier(
          expectedIdentity,
          routeGeneration,
          "potential-write",
          async (
            reservedRevision,
            userMutationGenerationAtBarrierStart,
            markPotentialWriteStarted
          ) => {
            if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
            markPotentialWriteStarted();
            const restored = await restorePostRevision(expectedIdentity, revisionId);
            if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
            const restoredAt = new Date().toISOString();
            if (
              !applyBarrierAuthoritativePost(
                restored.post,
                expectedIdentity,
                routeGeneration,
                reservedRevision,
                userMutationGenerationAtBarrierStart,
                restoredAt
              )
            ) {
              throw createEditorIdentityChangedError();
            }
            setRevisions((current) => upsertRevisionList(current, restored.revision));
          }
        );
      } catch (err) {
        if (isLatestRequest()) {
          if (isApiClientError(err)) {
            setRevisionsError(err.message);
          } else {
            setRevisionsError("Failed to restore revision.");
          }
        }
        throw err;
      } finally {
        if (isLatestRequest()) setRestoringRevisionId(null);
      }
    },
    [
      applyBarrierAuthoritativePost,
      cancelAutosave,
      isCurrentEditableSession,
      requireCurrentEditableSession,
      runAuthoritativeIdentityBarrier,
    ]
  );

  const markReloadRemote = useCallback(async () => {
    const { identity: expectedIdentity, epoch: routeGeneration } = requireCurrentEditableSession();
    const isCurrentIdentity = () => isCurrentEditableSession(expectedIdentity, routeGeneration);
    if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
    const requestGeneration = hydrationRequestGenerationRef.current + 1;
    hydrationRequestGenerationRef.current = requestGeneration;
    const isLatestRequest = () =>
      isCurrentIdentity() && hydrationRequestGenerationRef.current === requestGeneration;
    setError(null);
    if (hasRestorationDebt(expectedIdentity, routeGeneration)) {
      setRemoteUpdatePending(true);
      return;
    }
    try {
      await runAuthoritativeIdentityBarrier(
        expectedIdentity,
        routeGeneration,
        "read-only",
        async (reservedRevision, userMutationGenerationAtBarrierStart) => {
          if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
          if (hasRestorationDebt(expectedIdentity, routeGeneration)) {
            setRemoteUpdatePending(true);
            return;
          }
          const acceptedPotentialWriteGeneration =
            getPotentialWriteSettlementGeneration(expectedIdentity);
          const nextPost = await getPostCached(expectedIdentity, { force: true });
          if (!isCurrentIdentity()) {
            const currentEpoch = activeEditorEpochRef.current;
            if (
              currentEpoch !== routeGeneration &&
              isCurrentEditableSession(expectedIdentity, currentEpoch)
            ) {
              await getPostCached(expectedIdentity, { force: true }).catch(() => undefined);
            }
            throw createEditorIdentityChangedError();
          }
          if (hasRestorationDebt(expectedIdentity, routeGeneration)) {
            setRemoteUpdatePending(true);
            return;
          }
          if (!nextPost) {
            if (isLatestRequest()) setError("Post not found.");
            return;
          }
          if (
            !applyBarrierAuthoritativePost(
              nextPost,
              expectedIdentity,
              routeGeneration,
              reservedRevision,
              userMutationGenerationAtBarrierStart,
              nextPost.updatedAt,
              acceptedPotentialWriteGeneration
            )
          ) {
            throw createEditorIdentityChangedError();
          }
        }
      );
    } catch (error) {
      if (isLatestRequest()) {
        setError(isApiClientError(error) ? error.message : "Failed to load post editor.");
      }
      throw error;
    }
  }, [
    applyBarrierAuthoritativePost,
    getPotentialWriteSettlementGeneration,
    hasRestorationDebt,
    isCurrentEditableSession,
    requireCurrentEditableSession,
    runAuthoritativeIdentityBarrier,
  ]);

  const handleUploadClipboardImage = useCallback(
    async (file: File) => {
      const { identity, epoch } = requireCurrentEditableSession();
      try {
        const result = await uploadClipboardImage(file);
        if (!isCurrentEditableSession(identity, epoch)) {
          throw createEditorIdentityChangedError();
        }
        return result;
      } catch (err) {
        if (isApiClientError(err)) {
          throw new Error(err.message);
        }
        throw err;
      }
    },
    [isCurrentEditableSession, requireCurrentEditableSession]
  );

  const blankEditorState = useMemo(
    () => createInitialPostEditorState(normalizeEditorDocumentForWritingFlow(null)),
    []
  );
  const blankMetadataDraft = useMemo(() => createMetadataDraftState(null), []);
  const visibleEditorState = routeStateCurrent ? state : blankEditorState;

  return {
    postId,
    editorSessionKey,
    post: routeStateCurrent ? post : null,
    title: routeStateCurrent ? title : "",
    slug: routeStateCurrent ? slug : "",
    status: routeStateCurrent ? status : "draft",
    hasUnsavedChanges,
    canMutatePost,
    loading: !routeStateCurrent || loading,
    error: routeStateCurrent ? error : null,
    autosaveError: routeStateCurrent ? autosaveError : null,
    autosaveSaving: routeStateCurrent ? autosaveSaving : false,
    lastSavedAt: routeStateCurrent ? (lastSavedAt ?? visibleEditorState.lastSavedAt) : null,
    remoteUpdatePending: routeStateCurrent ? remoteUpdatePending : false,
    setTitle,
    setSlug,
    featuredImage: routeStateCurrent ? featuredImage : "",
    setFeaturedImage,
    tagsInput: routeStateCurrent ? metadataDraft.tagsInput : blankMetadataDraft.tagsInput,
    setTagsInput,
    categoryId: routeStateCurrent ? metadataDraft.categoryId : blankMetadataDraft.categoryId,
    setCategoryId,
    seoDraft: routeStateCurrent ? metadataDraft.seo : blankMetadataDraft.seo,
    setSeoDraft,
    taxonomySummary: routeStateCurrent ? taxonomySummary : { categoryName: null, tagCount: 0 },
    deletingPost: routeStateCurrent ? deletingPost : false,
    moveToTrash,
    saveDraft,
    flushLatestAutosave,
    publish,
    unpublish,
    preview,
    previewUrl: routeStateCurrent ? previewUrl : null,
    previewOpen: routeStateCurrent ? previewOpen : false,
    previewLoading: routeStateCurrent ? previewLoading : false,
    previewError: routeStateCurrent ? previewError : null,
    setPreviewOpen: handleSetPreviewOpen,
    revisionsOpen: routeStateCurrent ? revisionsOpen : false,
    setRevisionsOpen: handleSetRevisionsOpen,
    revisions: routeStateCurrent ? revisions : [],
    revisionsLoading: routeStateCurrent ? revisionsLoading : false,
    revisionsError: routeStateCurrent ? revisionsError : null,
    restoringRevisionId: routeStateCurrent ? restoringRevisionId : null,
    openRevisions,
    restoreRevision,
    state: visibleEditorState,
    selectedBlock: routeStateCurrent ? selectedBlock : null,
    insertFocusToken: routeStateCurrent ? insertFocusToken : 0,
    canUndo: visibleEditorState.history.past.length > 0,
    canRedo: visibleEditorState.history.future.length > 0,
    selectBlock: (id) => dispatchEditorAction({ type: "select_block", id }),
    updateBlockContent,
    updateSelectedBlockContent,
    updateBlockAttrs,
    updateSelectedBlockAttrs,
    updateDocumentTypography,
    setExcerpt,
    insertBlock,
    ensureDynamicTocBlock,
    deleteBlock,
    deleteSelectedBlock,
    moveBlock,
    moveSelectedBlock,
    moveBlockToIndex,
    transformBlock,
    transformSelectedBlock,
    undo: () => dispatchEditorAction({ type: "undo" }),
    redo: () => dispatchEditorAction({ type: "redo" }),
    markReloadRemote,
    uploadClipboardImage: handleUploadClipboardImage,
  };
}
