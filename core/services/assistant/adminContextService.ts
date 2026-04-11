import type { AssistantActionContext, AssistantAdminContext } from "./actionPlanTypes";

const normalizeRoute = (value: string | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveArea = (route: string | null): AssistantAdminContext["area"] => {
  if (!route) return "other";
  if (route === "/admin") return "dashboard";
  if (route.startsWith("/admin/pages")) return "pages";
  if (route.startsWith("/admin/posts")) return "posts";
  if (route.startsWith("/admin/settings")) return "settings";
  if (route.startsWith("/admin/coderso")) return "coderso";
  return "other";
};

const resolveCodersoModule = (
  route: string | null
): AssistantAdminContext["codersoModule"] => {
  if (!route || !route.startsWith("/admin/coderso")) return null;
  if (route.startsWith("/admin/coderso/engine")) return "engine";
  if (route.startsWith("/admin/coderso/entries")) return "entries";
  if (route.startsWith("/admin/coderso/custom-screens")) return "custom-screens";
  if (route.startsWith("/admin/coderso/widgets")) return "widgets";
  if (route.startsWith("/admin/coderso/forms")) return "forms";
  if (route.startsWith("/admin/coderso/listings")) return "listings";
  if (route.startsWith("/admin/coderso/booking")) return "booking";
  if (route.startsWith("/admin/coderso/commerce")) return "commerce";
  return "other";
};

export const buildAssistantAdminContext = (
  input: AssistantActionContext | undefined
): AssistantAdminContext => {
  const route = normalizeRoute(input?.page);
  const locale =
    typeof input?.locale === "string" && input.locale.trim().length > 0
      ? input.locale.trim()
      : null;

  return {
    route,
    locale,
    resourceCatalog: input?.resourceCatalog ?? null,
    area: resolveArea(route),
    codersoModule: resolveCodersoModule(route),
  };
};
