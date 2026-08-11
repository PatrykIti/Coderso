import {
  autosavePost,
  createPost,
  createPostPreview,
  deletePost,
  duplicatePost,
  getPost,
  listPostRevisions,
  listPosts,
  publishPost,
  restorePostRevision,
  unpublishPost,
  updatePost,
  type PostDetail,
  type UpdatePostMetadataInput,
} from "../../services/content/postsService";
import { runPostsBackfill } from "../../services/posts/migration/postsBackfillService";
import {
  parseExactRfc3339DateTime,
  projectPostMetadataMutation,
  requestsPostPublicationMutation,
  type PostMetadataMutationV1,
} from "../../services/posts/postMetadataContract";
import { ApiError } from "../errorHandler";
import type { PermissionRequirement } from "../middleware/rbac";
import { createPublicUrlContextFromHeaders, resolvePreviewUrl } from "../utils/previewUrls";
import {
  postAutosaveSchema,
  postBackfillSchema,
  postCreateSchema,
  postMetadataSchema,
  postPreviewSchema,
  postUpdateSchema,
} from "../validation/postSchemas";
import type { RouteContext } from "../router";

export type PostsRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type PostMetadataUpdater = (
  id: string,
  input: UpdatePostMetadataInput,
  actorId?: string
) => Promise<PostDetail | null>;

export type PostsRouteDeps = {
  requirePermission: (permission: PermissionRequirement) => PostsRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  updatePostMetadata: PostMetadataUpdater;
};

export type Router = {
  get: (path: string, ...handlers: PostsRouteHandler[]) => void;
  post: (path: string, ...handlers: PostsRouteHandler[]) => void;
  patch: (path: string, ...handlers: PostsRouteHandler[]) => void;
  delete: (path: string, ...handlers: PostsRouteHandler[]) => void;
};

export const mapPostError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "post_not_found":
      return new ApiError("post_not_found", "Post not found.", 404);
    case "post_title_invalid":
      return new ApiError("post_title_invalid", "Post title is invalid.", 400);
    case "post_slug_invalid":
      return new ApiError("post_slug_invalid", "Post slug is invalid.", 400);
    case "post_data_invalid":
      return new ApiError("post_data_invalid", "Post data is invalid.", 400);
    case "post_document_invalid":
      return new ApiError("post_document_invalid", "Post document is invalid.", 400);
    case "post_slug_conflict":
      return new ApiError("post_slug_conflict", "Post with this slug already exists.", 409);
    case "post_validation_failed":
      return new ApiError("post_validation_failed", "Post data failed schema validation.", 400);
    case "post_create_failed":
      return new ApiError("post_create_failed", "Failed to create post.", 500);
    case "scheduled_at_invalid":
      return new ApiError(
        "scheduled_at_invalid",
        "Schedule date must be a valid ISO timestamp.",
        400
      );
    case "scheduled_at_required":
      return new ApiError(
        "scheduled_at_required",
        "Schedule date is required for scheduled posts.",
        400
      );
    case "taxonomy_category_disabled":
      return new ApiError(
        "taxonomy_category_disabled",
        "Categories are disabled for this post type.",
        400
      );
    case "taxonomy_tag_disabled":
      return new ApiError("taxonomy_tag_disabled", "Tags are disabled for this post type.", 400);
    case "taxonomy_term_invalid":
      return new ApiError("taxonomy_term_invalid", "Term does not belong to taxonomy.", 400);
    case "taxonomy_term_missing":
      return new ApiError("taxonomy_term_missing", "Term not found.", 404);
    case "auth_required":
      return new ApiError("auth_required", "Authentication required.", 401);
    case "post_duplicate_failed":
      return new ApiError("post_duplicate_failed", "Failed to duplicate post.", 500);
    case "post_revision_not_found":
      return new ApiError("post_revision_not_found", "Revision not found.", 404);
    case "post_revision_create_failed":
      return new ApiError("post_revision_create_failed", "Failed to create post revision.", 500);
    default:
      return null;
  }
};

export const mapUnexpectedPostRouteError = (
  _error: unknown,
  options: { code: string; message: string; status?: number }
) => {
  return new ApiError(options.code, options.message, options.status ?? 500);
};

const withPostErrors = async <T>(
  fn: () => Promise<T>,
  unexpected?: { code: string; message: string; status?: number }
) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapPostError(error);
    if (mapped) throw mapped;
    if (unexpected) throw mapUnexpectedPostRouteError(error, unexpected);
    throw error;
  }
};

const invalidScheduledAt = () =>
  new ApiError("validation_error", "Invalid payload", 400, [
    {
      path: "scheduledAt",
      message: 'must match format "date-time"',
      keyword: "format",
    },
  ]);

export const toPostMetadataServicePatch = (
  value: PostMetadataMutationV1
): UpdatePostMetadataInput => {
  const patch: UpdatePostMetadataInput = {};
  if (Object.hasOwn(value, "status")) patch.status = value.status;
  if (Object.hasOwn(value, "tags")) patch.tags = value.tags;
  if (Object.hasOwn(value, "taxonomy")) patch.taxonomy = value.taxonomy;
  if (Object.hasOwn(value, "seo")) patch.seo = value.seo;
  if (!Object.hasOwn(value, "scheduledAt")) return patch;

  const scheduledAtValue = value.scheduledAt;
  if (scheduledAtValue === null) {
    patch.scheduledAt = null;
    return patch;
  }

  if (typeof scheduledAtValue !== "string") throw invalidScheduledAt();
  const scheduledAt = parseExactRfc3339DateTime(scheduledAtValue);
  if (!scheduledAt) throw invalidScheduledAt();
  patch.scheduledAt = scheduledAt;
  return patch;
};

const asValidatedRecord = (value: unknown): Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("validation_error", "Invalid payload", 400);
  }
  return value as Record<string, unknown>;
};

export function registerPostsRoutes(router: Router, deps: PostsRouteDeps) {
  const { requirePermission, updatePostMetadata, validate } = deps;
  const requirePostMetadataWrite = requirePermission("content:write");
  const requirePostMetadataWriteAndPublish = requirePermission([
    "content:write",
    "content:publish",
  ]);

  router.get("/posts", requirePermission("content:read"), async () => {
    return withPostErrors(async () => listPosts());
  });

  router.post("/posts", requirePermission("content:write"), async (ctx) => {
    return withPostErrors(async () => {
      validate(postCreateSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as {
        title: string;
        slug?: string;
        data?: Record<string, unknown>;
      };
      return createPost({
        title: body.title,
        slug: body.slug,
        data: body.data,
        authorId: ctx.user?.id ?? null,
      });
    });
  });

  router.post("/posts/migration/backfill", requirePermission("settings:write"), async (ctx) => {
    return withPostErrors(async () => {
      validate(postBackfillSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as {
        dryRun?: boolean;
        shadowRead?: boolean;
        entryIds?: string[];
      };
      return runPostsBackfill({
        dryRun: body.dryRun ?? true,
        shadowRead: body.shadowRead ?? true,
        entryIds: body.entryIds,
      });
    });
  });

  router.get("/posts/:id", requirePermission("content:read"), async (ctx) => {
    return withPostErrors(async () => {
      const post = await getPost(ctx.params.id);
      if (!post) throw new Error("post_not_found");
      return post;
    });
  });

  router.patch("/posts/:id", requirePermission("content:write"), async (ctx) => {
    return withPostErrors(async () => {
      validate(postUpdateSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as {
        title?: string;
        slug?: string;
        data?: Record<string, unknown>;
      };
      const updated = await updatePost(ctx.params.id, body);
      if (!updated) throw new Error("post_not_found");
      return updated;
    });
  });

  router.patch("/posts/:id/metadata", async (ctx) => {
    if (!ctx.user?.id) throw new Error("auth_required");
    const actorId = ctx.user.id;

    const rawBody = ctx.body ?? {};
    validate(postMetadataSchema, rawBody);
    const body = projectPostMetadataMutation(asValidatedRecord(rawBody));
    const patch = toPostMetadataServicePatch(body);
    const requireMetadataPermission = requestsPostPublicationMutation(body)
      ? requirePostMetadataWriteAndPublish
      : requirePostMetadataWrite;
    await requireMetadataPermission(ctx);

    return withPostErrors(
      async () => {
        const updated = await updatePostMetadata(ctx.params.id, patch, actorId);
        if (!updated) throw new Error("post_not_found");
        return updated;
      },
      {
        code: "post_metadata_update_failed",
        message: "Failed to update post metadata.",
      }
    );
  });

  router.post("/posts/:id/publish", requirePermission("content:publish"), async (ctx) => {
    return withPostErrors(async () => {
      if (!ctx.user?.id) throw new Error("auth_required");
      const result = await publishPost(ctx.params.id, ctx.user.id);
      if (!result) throw new Error("post_not_found");
      return {
        ok: true,
        revision: result.revision,
        reusedRevision: result.reusedRevision,
      };
    });
  });

  router.post("/posts/:id/unpublish", requirePermission("content:publish"), async (ctx) => {
    return withPostErrors(async () => {
      await unpublishPost(ctx.params.id);
      return { ok: true };
    });
  });

  router.post("/posts/:id/preview", requirePermission("content:read"), async (ctx) => {
    return withPostErrors(async () => {
      validate(postPreviewSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as { ttlMinutes?: number };
      const post = await getPost(ctx.params.id);
      if (!post) throw new Error("post_not_found");
      const { token, expiresAt } = await createPostPreview(post.id, body.ttlMinutes);
      const previewUrl = await resolvePreviewUrl(
        {
          targetType: "content",
          token,
          contentType: "post",
          slug: post.slug,
        },
        createPublicUrlContextFromHeaders(ctx.headers)
      );
      return { token, previewUrl, expiresAt };
    });
  });

  router.post("/posts/:id/duplicate", requirePermission("content:write"), async (ctx) => {
    return withPostErrors(async () => {
      const duplicated = await duplicatePost(ctx.params.id, ctx.user?.id ?? null);
      if (!duplicated) throw new Error("post_duplicate_failed");
      return duplicated;
    });
  });

  router.post("/posts/:id/autosave", requirePermission("content:write"), async (ctx) => {
    return withPostErrors(
      async () => {
        validate(postAutosaveSchema, ctx.body ?? {});
        const body = (ctx.body ?? {}) as {
          title?: string;
          slug?: string;
          data?: Record<string, unknown>;
          tags?: string[];
          taxonomy?: {
            categoryId?: string | null;
            tagIds?: string[];
          };
          seo?: {
            title?: string;
            description?: string;
            canonicalUrl?: string;
            robots?: string;
          };
        };
        const result = await autosavePost(
          ctx.params.id,
          {
            title: body.title,
            slug: body.slug,
            data: body.data,
            tags: body.tags,
            taxonomy: body.taxonomy,
            seo: body.seo,
          },
          ctx.user?.id ?? null
        );
        return {
          post: result.post,
          revision: result.revision,
          savedAt: result.savedAt,
          reusedRevision: result.reusedRevision,
        };
      },
      {
        code: "post_autosave_failed",
        message: "Could not autosave post.",
      }
    );
  });

  router.get("/posts/:id/revisions", requirePermission("content:read"), async (ctx) => {
    return withPostErrors(async () => listPostRevisions(ctx.params.id));
  });

  router.post(
    "/posts/:id/revisions/:revisionId/restore",
    requirePermission("content:write"),
    async (ctx) => {
      return withPostErrors(async () => {
        const restored = await restorePostRevision(
          ctx.params.id,
          ctx.params.revisionId,
          ctx.user?.id ?? null
        );
        return {
          ok: true,
          restored: restored.restored,
          revision: restored.revision,
          post: restored.post,
        };
      });
    }
  );

  router.delete("/posts/:id", requirePermission("content:write"), async (ctx) => {
    return withPostErrors(async () => deletePost(ctx.params.id));
  });
}
