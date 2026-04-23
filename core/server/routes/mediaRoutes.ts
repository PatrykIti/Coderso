import type { MediaMeta } from "../../services/media/mediaService";
import {
  deleteMedia,
  getMediaById,
  listMedia,
  recoverMediaDimensions,
  replaceMedia,
  updateMedia,
  uploadMedia,
} from "../../services/media/mediaService";
import { listMediaUsage } from "../../services/media/mediaUsageService";
import type { UploadFile } from "../../services/media/storage/adapter";
import { ApiError } from "../errorHandler";
import {
  mediaRecoverDimensionsSchema,
  mediaReplaceSchema,
  mediaUpdateSchema,
  mediaUploadSchema,
  mediaUsageQuerySchema,
} from "../validation/mediaSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type MediaRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

type UploadBody = {
  file: UploadFile;
  alt?: unknown;
  title?: unknown;
  caption?: unknown;
};

type ReplaceBody = {
  file: UploadFile;
};

function isUploadFile(input: unknown): input is UploadFile {
  if (!input || typeof input !== "object") return false;
  const file = input as UploadFile;
  return (
    typeof file.name === "string" &&
    typeof file.type === "string" &&
    typeof file.size === "number" &&
    typeof file.arrayBuffer === "function"
  );
}

export const mapMediaError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "media_file_invalid":
      return new ApiError("media_file_invalid", "Invalid upload payload", 400);
    case "media_file_too_large":
      return new ApiError("media_file_too_large", "File exceeds size limit", 413);
    case "media_mime_not_allowed":
      return new ApiError("media_mime_not_allowed", "File type not allowed", 400);
    case "media_not_found":
      return new ApiError("media_not_found", "Media item not found", 404);
    case "media_storage_unavailable":
      return new ApiError(
        "media_storage_unavailable",
        "Storage path is not writable",
        503
      );
    default:
      return null;
  }
};

const withMediaErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapMediaError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

const parseLimit = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function registerMediaRoutes(router: Router, deps: MediaRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/media", requirePermission("media:read"), async () => {
    return withMediaErrors(async () => listMedia());
  });

  router.post("/media", requirePermission("media:write"), async (ctx) => {
    return withMediaErrors(async () => {
      validate(mediaUploadSchema, ctx.body);
      if (!ctx.body || typeof ctx.body !== "object") {
        throw new Error("media_file_invalid");
      }
      const body = ctx.body as UploadBody;

      if (!isUploadFile(body.file)) {
        throw new Error("media_file_invalid");
      }

      return uploadMedia(
        body.file,
        {
          alt: typeof body.alt === "string" ? body.alt : undefined,
          title: typeof body.title === "string" ? body.title : undefined,
          caption: typeof body.caption === "string" ? body.caption : undefined,
        },
        ctx.user?.id
      );
    });
  });

  router.get("/media/:id", requirePermission("media:read"), async (ctx) => {
    return withMediaErrors(async () => {
      const item = await getMediaById(ctx.params.id);
      if (!item) throw new Error("media_not_found");
      return item;
    });
  });

  router.get("/media/:id/usage", requirePermission("media:read"), async (ctx) => {
    return withMediaErrors(async () => {
      validate(mediaUsageQuerySchema, ctx.query);
      const item = await getMediaById(ctx.params.id);
      if (!item) throw new Error("media_not_found");
      return listMediaUsage(ctx.params.id, {
        limitPerFamily: parseLimit(ctx.query.limit),
      });
    });
  });

  router.patch(
    "/media/:id",
    requirePermission("media:write"),
    async (ctx) => {
      return withMediaErrors(async () => {
        validate(mediaUpdateSchema, ctx.body);
        const body = ctx.body as MediaMeta;
        const updated = await updateMedia(ctx.params.id, body);
        if (!updated) throw new Error("media_not_found");
        return updated;
      });
    }
  );

  router.post(
    "/media/:id/dimensions/recover",
    requirePermission("media:write"),
    async (ctx) => {
      return withMediaErrors(async () => {
        validate(mediaRecoverDimensionsSchema, ctx.body ?? {});
        return recoverMediaDimensions(ctx.params.id);
      });
    }
  );

  router.post(
    "/media/:id/replace",
    requirePermission("media:write"),
    async (ctx) => {
      return withMediaErrors(async () => {
        validate(mediaReplaceSchema, ctx.body);
        if (!ctx.body || typeof ctx.body !== "object") {
          throw new Error("media_file_invalid");
        }
        const body = ctx.body as ReplaceBody;

        if (!isUploadFile(body.file)) {
          throw new Error("media_file_invalid");
        }

        return replaceMedia(ctx.params.id, body.file);
      });
    }
  );

  router.delete(
    "/media/:id",
    requirePermission("media:write"),
    async (ctx) => {
      return withMediaErrors(async () => {
        await deleteMedia(ctx.params.id);
        return { ok: true };
      });
    }
  );
}
