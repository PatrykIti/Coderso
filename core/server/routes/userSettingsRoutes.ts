import {
  getUserSetting,
  listUserSettings,
  setUserSetting,
} from "../../services/settings/userSettingsService";
import { userSettingsUpdateSchema } from "../validation/settingsSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
};

export type UserSettingsRouteDeps = {
  requireAuth: (ctx: RouteContext) => Promise<void> | void;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerUserSettingsRoutes(
  router: Router,
  deps: UserSettingsRouteDeps
) {
  const { requireAuth, validate } = deps;

  router.get("/user-settings", requireAuth, async (ctx) => {
    if (!ctx.user?.id) {
      throw new Error("auth_required");
    }
    return listUserSettings(ctx.user.id);
  });

  router.get("/user-settings/:key", requireAuth, async (ctx) => {
    if (!ctx.user?.id) {
      throw new Error("auth_required");
    }
    const value = await getUserSetting(ctx.user.id, ctx.params.key);
    return { key: ctx.params.key, value };
  });

  router.patch("/user-settings/:key", requireAuth, async (ctx) => {
    if (!ctx.user?.id) {
      throw new Error("auth_required");
    }
    validate(userSettingsUpdateSchema, ctx.body);
    const body = ctx.body as { value: unknown };
    const updated = await setUserSetting(ctx.user.id, ctx.params.key, body.value);
    return { key: updated.key, value: updated.value };
  });
}
