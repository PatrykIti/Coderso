import type { RouteContext } from "../router";
import { ApiError } from "../errorHandler";
import { entryTeaserSchema, type EntryTeaserData } from "../../widgets/core/entryTeaser";
import { resolveEntryTeaserRuntimeData } from "../../services/content/entryTeaserResolver";
import {
  getSetting,
  normalizeContentRoutes,
  type ContentRouteSetting,
} from "../../services/settings/settingsService";

export type EntryTeaserPreviewRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type EntryTeaserPreviewRouteDeps = {
  requirePermission: (permission: string) => EntryTeaserPreviewRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  getContentRoutes?: () => Promise<ContentRouteSetting[]>;
  resolvePreview?: typeof resolveEntryTeaserRuntimeData;
};

export type Router = {
  post: (path: string, ...handlers: EntryTeaserPreviewRouteHandler[]) => void;
};

const entryTeaserPreviewSchema = {
  type: "object",
  required: ["data"],
  additionalProperties: false,
  properties: {
    data: entryTeaserSchema,
  },
};

const loadContentRoutes = async () =>
  normalizeContentRoutes(await getSetting("site.contentRoutes"));

export const mapEntryTeaserPreviewError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "entry_teaser_preview_invalid":
      return new ApiError(
        "entry_teaser_preview_invalid",
        "Invalid Entry Teaser preview payload",
        400
      );
    default:
      return null;
  }
};

const withEntryTeaserPreviewErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapEntryTeaserPreviewError(error);
    if (mapped) throw mapped;
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      throw new ApiError("entry_teaser_preview_error", error.message, 500);
    }
    throw error;
  }
};

export function registerEntryTeaserPreviewRoutes(
  router: Router,
  deps: EntryTeaserPreviewRouteDeps
) {
  const { requirePermission, validate } = deps;
  const resolvePreview = deps.resolvePreview ?? resolveEntryTeaserRuntimeData;
  const getContentRoutes = deps.getContentRoutes ?? loadContentRoutes;

  router.post("/widgets/entry-teaser/preview", requirePermission("content:read"), async (ctx) =>
    withEntryTeaserPreviewErrors(async () => {
      validate(entryTeaserPreviewSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as { data: EntryTeaserData };
      const contentRoutes = await getContentRoutes();
      return resolvePreview(body.data, {
        preview: true,
        contentRoutes,
      });
    })
  );
}
