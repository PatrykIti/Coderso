import type { MediaMeta } from "../../services/media/mediaService";
import {
  deleteMedia,
  getMediaById,
  listMedia,
  updateMedia,
  uploadMedia,
} from "../../services/media/mediaService";
import type { UploadFile } from "../../services/media/storage/adapter";
import { mediaUpdateSchema, mediaUploadSchema } from "../validation/mediaSchemas";

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

export function registerMediaRoutes(router: Router, deps: MediaRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/media", requirePermission("media:read"), async () => {
    return listMedia();
  });

  router.post("/media", requirePermission("media:write"), async (ctx) => {
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

  router.get("/media/:id", requirePermission("media:read"), async (ctx) => {
    const item = await getMediaById(ctx.params.id);
    if (!item) throw new Error("media_not_found");
    return item;
  });

  router.patch(
    "/media/:id",
    requirePermission("media:write"),
    async (ctx) => {
      validate(mediaUpdateSchema, ctx.body);
      const body = ctx.body as MediaMeta;
      const updated = await updateMedia(ctx.params.id, body);
      if (!updated) throw new Error("media_not_found");
      return updated;
    }
  );

  router.delete(
    "/media/:id",
    requirePermission("media:write"),
    async (ctx) => {
      await deleteMedia(ctx.params.id);
      return { ok: true };
    }
  );
}
