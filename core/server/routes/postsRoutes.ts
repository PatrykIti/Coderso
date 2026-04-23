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
  updatePostMetadata,
} from "../../services/content/postsService";
import { runPostsBackfill } from "../../services/posts/migration/postsBackfillService";
import { ApiError } from "../errorHandler";
import {
  createPublicUrlContextFromHeaders,
  resolvePreviewUrl,
} from "../utils/previewUrls";
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

export type PostsRouteDeps = {
  requirePermission: (permission: string) => PostsRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
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
      return new ApiError(
        "post_document_invalid",
        "Post document is invalid.",
        400
      );
    case "post_slug_conflict":
      return new ApiError(
        "post_slug_conflict",
        "Post with this slug already exists.",
        409
      );
    case "post_validation_failed":
      return new ApiError(
        "post_validation_failed",
        "Post data failed schema validation.",
        400
      );
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
      return new ApiError(
        "taxonomy_tag_disabled",
        "Tags are disabled for this post type.",
        400
      );
    case "taxonomy_term_invalid":
      return new ApiError(
        "taxonomy_term_invalid",
        "Term does not belong to taxonomy.",
        400
      );
    case "taxonomy_term_missing":
      return new ApiError("taxonomy_term_missing", "Term not found.", 404);
    case "auth_required":
      return new ApiError("auth_required", "Authentication required.", 401);
    case "post_duplicate_failed":
      return new ApiError("post_duplicate_failed", "Failed to duplicate post.", 500);
    case "post_revision_not_found":
      return new ApiError("post_revision_not_found", "Revision not found.", 404);
    case "post_revision_create_failed":
      return new ApiError(
        "post_revision_create_failed",
        "Failed to create post revision.",
        500
      );
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

export function registerPostsRoutes(router: Router, deps: PostsRouteDeps) {
  const { requirePermission, validate } = deps;

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

  router.post(
    "/posts/migration/backfill",
    requirePermission("settings:write"),
    async (ctx) => {
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
    }
  );

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

  router.patch(
    "/posts/:id/metadata",
    requirePermission("content:write"),
    async (ctx) => {
      return withPostErrors(async () => {
        validate(postMetadataSchema, ctx.body ?? {});
        const body = (ctx.body ?? {}) as {
          status?: "draft" | "published" | "scheduled" | "archived";
          scheduledAt?: string | null;
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
        const scheduledAt =
          body.scheduledAt === null ||
          body.scheduledAt === undefined ||
          body.scheduledAt === ""
            ? null
            : new Date(body.scheduledAt);

        const updated = await updatePostMetadata(
          ctx.params.id,
          {
            status: body.status,
            scheduledAt,
            tags: body.tags,
            taxonomy: body.taxonomy,
            seo: body.seo,
          },
          ctx.user?.id
        );
        if (!updated) throw new Error("post_not_found");
        return updated;
      });
    }
  );

  router.post("/posts/:id/publish", requirePermission("content:publish"), async (ctx) => {
    return withPostErrors(async () => {
      if (!ctx.user?.id) throw new Error("auth_required");
      await publishPost(ctx.params.id, ctx.user.id);
      return { ok: true };
    });
  });

  router.post(
    "/posts/:id/unpublish",
    requirePermission("content:publish"),
    async (ctx) => {
      return withPostErrors(async () => {
        await unpublishPost(ctx.params.id);
        return { ok: true };
      });
    }
  );

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
