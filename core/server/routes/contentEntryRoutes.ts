import {
  createEntry,
  createEntryPreview,
  deleteEntry,
  duplicateEntry,
  getEntry,
  listEntriesWithContentTypes,
  listEntries,
  publishEntry,
  unpublishEntry,
  updateEntryMetadata,
  updateEntry,
} from "../../services/content/entryService";
import { getContentTypeBySlug } from "../../services/content/typeService";
import {
  contentEntryAllEntriesQuerySchema,
  contentEntryCreateSchema,
  contentEntryDuplicateSchema,
  contentEntryMetadataSchema,
  contentEntryPreviewSchema,
  contentEntryUpdateSchema,
} from "../validation/contentSchemas";
import { ContentValidationError } from "../../services/content/validation";
import { createPublicUrlContextFromHeaders, resolvePreviewUrl } from "../utils/previewUrls";
import { ApiError } from "../errorHandler";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  headers?: Record<string, string | undefined>;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type ContentEntryRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

const readDomainField = (error: unknown) =>
  typeof (error as { field?: unknown } | undefined)?.field === "string"
    ? ((error as { field?: string }).field ?? undefined)
    : undefined;

const maybeFieldDetails = (field?: string) => (field ? { field } : undefined);

export const mapEntryMetadataError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "scheduled_at_invalid":
      return new ApiError(
        "scheduled_at_invalid",
        "Schedule date must be a valid ISO timestamp.",
        400
      );
    case "scheduled_at_required":
      return new ApiError(
        "scheduled_at_required",
        "Schedule date is required for scheduled entries.",
        400
      );
    case "auth_required":
      return new ApiError("auth_required", "Authentication is required.", 401);
    case "entry_password_required":
      return new ApiError(
        "entry_password_required",
        "A password is required for password-protected entries.",
        400
      );
    case "taxonomy_category_disabled":
      return new ApiError(
        "taxonomy_category_disabled",
        "Categories are disabled for this content type.",
        400
      );
    case "taxonomy_tag_disabled":
      return new ApiError("taxonomy_tag_disabled", "Tags are disabled for this content type.", 400);
    case "taxonomy_term_invalid":
      return new ApiError("taxonomy_term_invalid", "Term does not belong to taxonomy.", 400);
    case "taxonomy_term_missing":
      return new ApiError("taxonomy_term_missing", "Term not found.", 404);
    default:
      return null;
  }
};

export const mapContentEntryError = (error: unknown) => {
  if (error instanceof ContentValidationError) {
    return new ApiError("entry_validation_failed", "Entry validation failed.", 400, {
      validation: error.details ?? [],
    });
  }

  if (!(error instanceof Error)) return null;
  const field = readDomainField(error);
  switch (error.message) {
    case "content_type_not_found":
      return new ApiError("content_type_not_found", "Content type not found.", 404);
    case "entry_not_found":
      return new ApiError("entry_not_found", "Entry not found.", 404);
    case "entry_validation_failed":
      return new ApiError("entry_validation_failed", "Entry validation failed.", 400);
    case "entry_slug_conflict":
      return new ApiError("entry_slug_conflict", "Entry slug already exists.", 409, {
        field: field ?? "slug",
      });
    case "media_value_invalid":
      return new ApiError(
        "media_value_invalid",
        "Media field value is invalid.",
        400,
        maybeFieldDetails(field)
      );
    case "media_asset_missing":
      return new ApiError(
        "media_asset_missing",
        "Selected media asset was not found.",
        404,
        maybeFieldDetails(field)
      );
    case "media_type_not_allowed":
      return new ApiError(
        "media_type_not_allowed",
        "Selected media type is not allowed.",
        400,
        maybeFieldDetails(field)
      );
    case "relation_target_not_found":
      return new ApiError(
        "relation_target_not_found",
        "Relation target content type was not found.",
        404
      );
    case "relation_value_invalid":
      return new ApiError(
        "relation_value_invalid",
        "Relation field value is invalid.",
        400,
        maybeFieldDetails(field)
      );
    case "relation_entry_missing":
      return new ApiError(
        "relation_entry_missing",
        "Related entry was not found.",
        404,
        maybeFieldDetails(field)
      );
    case "entry_duplicate_failed":
      return new ApiError("entry_duplicate_failed", "Entry could not be duplicated.", 400);
    case "auth_required":
      return new ApiError("auth_required", "Authentication is required.", 401);
    default:
      return null;
  }
};

const withContentEntryErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapContentEntryError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerContentEntryRoutes(router: Router, deps: ContentEntryRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/content-entries", requirePermission("content:read"), async (ctx) => {
    return withContentEntryErrors(async () => {
      validate(contentEntryAllEntriesQuerySchema, ctx.query);
      return listEntriesWithContentTypes();
    });
  });

  router.get("/content/:type/entries", requirePermission("content:read"), async (ctx) => {
    return withContentEntryErrors(async () => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      return listEntries(type.id);
    });
  });

  router.post("/content/:type/entries", requirePermission("content:write"), async (ctx) => {
    return withContentEntryErrors(async () => {
      validate(contentEntryCreateSchema, ctx.body);
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const body = ctx.body as { title: string; slug: string; data: unknown };
      return createEntry(type.id, {
        title: body.title,
        slug: body.slug,
        data: body.data as Record<string, unknown>,
        authorId: ctx.user?.id ?? null,
      });
    });
  });

  router.get("/content/:type/entries/:id", requirePermission("content:read"), async (ctx) => {
    return withContentEntryErrors(async () => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
      return entry;
    });
  });

  router.patch("/content/:type/entries/:id", requirePermission("content:write"), async (ctx) => {
    return withContentEntryErrors(async () => {
      validate(contentEntryUpdateSchema, ctx.body);
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");

      const body = ctx.body as {
        title?: string;
        slug?: string;
        data?: Record<string, unknown>;
      };
      return updateEntry(entry.id, body);
    });
  });

  router.patch(
    "/content/:type/entries/:id/metadata",
    requirePermission("content:write"),
    async (ctx) => {
      return withContentEntryErrors(async () => {
        validate(contentEntryMetadataSchema, ctx.body);
        const type = await getContentTypeBySlug(ctx.params.type);
        if (!type) throw new Error("content_type_not_found");
        const entry = await getEntry(ctx.params.id);
        if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");

        const body = ctx.body as {
          status?: "draft" | "published" | "scheduled" | "archived";
          scheduledAt?: string | null;
          visibility?: "public" | "private" | "password";
          accessPassword?: string | null;
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

        if (body.status === "published" && entry.status !== "published") {
          await requirePermission("content:publish")(ctx);
        }

        const scheduledAt =
          body.scheduledAt === null || body.scheduledAt === undefined || body.scheduledAt === ""
            ? null
            : new Date(body.scheduledAt);

        let metadata: Awaited<ReturnType<typeof updateEntryMetadata>>;
        try {
          metadata = await updateEntryMetadata(
            entry.id,
            {
              status: body.status,
              scheduledAt,
              visibility: body.visibility,
              accessPassword: body.accessPassword,
              tags: body.tags,
              taxonomy: body.taxonomy,
              seo: body.seo,
            },
            ctx.user?.id
          );
        } catch (error) {
          const mapped = mapEntryMetadataError(error);
          if (mapped) throw mapped;
          throw error;
        }
        if (!metadata) throw new Error("entry_not_found");
        return metadata;
      });
    }
  );

  router.post(
    "/content/:type/entries/:id/duplicate",
    requirePermission("content:write"),
    async (ctx) => {
      return withContentEntryErrors(async () => {
        validate(contentEntryDuplicateSchema, ctx.body);
        const type = await getContentTypeBySlug(ctx.params.type);
        if (!type) throw new Error("content_type_not_found");
        const entry = await getEntry(ctx.params.id);
        if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
        const duplicated = await duplicateEntry(entry.id, ctx.user?.id ?? null);
        if (!duplicated) throw new Error("entry_duplicate_failed");
        return duplicated;
      });
    }
  );

  router.delete("/content/:type/entries/:id", requirePermission("content:write"), async (ctx) => {
    return withContentEntryErrors(async () => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
      await deleteEntry(entry.id);
      return { ok: true };
    });
  });

  router.post(
    "/content/:type/entries/:id/preview",
    requirePermission("content:read"),
    async (ctx) => {
      return withContentEntryErrors(async () => {
        validate(contentEntryPreviewSchema, ctx.body);
        const type = await getContentTypeBySlug(ctx.params.type);
        if (!type) throw new Error("content_type_not_found");
        const entry = await getEntry(ctx.params.id);
        if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");

        const body = ctx.body as { ttlMinutes?: number };
        const { token, expiresAt } = await createEntryPreview(entry.id, body.ttlMinutes);
        const previewUrl = await resolvePreviewUrl(
          {
            targetType: "content",
            token,
            contentType: type.slug,
            slug: entry.slug,
          },
          createPublicUrlContextFromHeaders(ctx.headers)
        );
        return { token, previewUrl, expiresAt };
      });
    }
  );

  router.post(
    "/content/:type/entries/:id/publish",
    requirePermission("content:publish"),
    async (ctx) => {
      return withContentEntryErrors(async () => {
        const type = await getContentTypeBySlug(ctx.params.type);
        if (!type) throw new Error("content_type_not_found");
        const entry = await getEntry(ctx.params.id);
        if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
        if (!ctx.user?.id) throw new Error("auth_required");
        await publishEntry(entry.id, ctx.user.id);
        return { ok: true };
      });
    }
  );

  router.post(
    "/content/:type/entries/:id/unpublish",
    requirePermission("content:publish"),
    async (ctx) => {
      return withContentEntryErrors(async () => {
        const type = await getContentTypeBySlug(ctx.params.type);
        if (!type) throw new Error("content_type_not_found");
        const entry = await getEntry(ctx.params.id);
        if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
        await unpublishEntry(entry.id);
        return { ok: true };
      });
    }
  );
}
