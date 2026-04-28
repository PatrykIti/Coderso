import { useMemo } from "react";

import {
  resolveAdminBasePath,
  resolveAdminRoutePath,
  stripAdminBasePath,
  withAdminBasePath,
} from "@/utils/adminPaths";
import { useOptionalAdminRouter } from "@/ui/contexts/AdminRouterContext";
import type {
  AssistantActionContext,
  AssistantActiveSurfaceContext,
  AssistantAdminRuntimeActionKind,
  AssistantAdminRuntimeSelectedResource,
  AssistantAdminRuntimeSnapshot,
  AssistantAdminRuntimeVisibleAction,
} from "../../../services/assistant/actionPlanTypes";
import { useActiveAssistantSurfaceContext } from "./activeSurfaceContext";

type AssistantAdminContextOptions = {
  activeHref?: string | null;
};

type RuntimeSurface = Pick<AssistantAdminRuntimeSnapshot, "area" | "advancedModule">;

const actionKindValues = new Set<AssistantAdminRuntimeActionKind>([
  "navigate",
  "create",
  "edit",
  "publish",
  "delete",
  "execute",
  "configure",
]);

const normalizePath = (value: string | null | undefined) => {
  if (!value) return null;
  const withoutHash = value.split("#")[0] ?? value;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  const trimmed = withoutQuery.trim();
  if (!trimmed) return null;
  return trimmed.length > 1 && trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const canonicalizeAdminRoute = (route: string | null) => {
  if (!route) return null;
  const basePath = resolveAdminBasePath(route);
  const relative = stripAdminBasePath(route, basePath);
  return withAdminBasePath(basePath, resolveAdminRoutePath(relative));
};

const readBrowserPath = () => {
  if (typeof window === "undefined") return null;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const readBrowserLocale = () => {
  if (typeof navigator === "undefined") return undefined;
  return navigator.language || undefined;
};

const activeSurfaceMatchesRoute = (
  activeSurface: AssistantActiveSurfaceContext | null,
  selectedResource: AssistantAdminRuntimeSelectedResource | null
) => {
  if (!activeSurface || !selectedResource) return false;
  if (activeSurface.kind === "page") {
    return selectedResource.kind === "page" && selectedResource.id === activeSurface.page.id;
  }
  if (activeSurface.kind === "widget-template") {
    return (
      selectedResource.kind === "widget-template" &&
      selectedResource.id === activeSurface.template.id
    );
  }
  if (activeSurface.kind === "custom-screen") {
    if (selectedResource.kind === "custom-screen") {
      return selectedResource.id === activeSurface.screen.id;
    }
    if (selectedResource.kind === "custom-screen-entry") {
      return selectedResource.id === activeSurface.selectedEntryId;
    }
  }
  return false;
};

const resolveSurface = (route: string | null): RuntimeSurface => {
  if (!route) return { area: "other", advancedModule: null };
  if (route === "/admin") return { area: "dashboard", advancedModule: null };
  if (route.startsWith("/admin/pages")) return { area: "pages", advancedModule: null };
  if (route.startsWith("/admin/posts")) return { area: "posts", advancedModule: null };
  if (route.startsWith("/admin/settings")) return { area: "settings", advancedModule: null };
  if (!route.startsWith("/admin/advanced")) return { area: "other", advancedModule: null };
  if (route.startsWith("/admin/advanced/engine")) return { area: "advanced", advancedModule: "engine" };
  if (route.startsWith("/admin/advanced/entries")) return { area: "advanced", advancedModule: "entries" };
  if (route.startsWith("/admin/advanced/custom-screens")) {
    return { area: "advanced", advancedModule: "custom-screens" };
  }
  if (route.startsWith("/admin/advanced/widgets")) return { area: "advanced", advancedModule: "widgets" };
  if (route.startsWith("/admin/advanced/forms")) return { area: "advanced", advancedModule: "forms" };
  if (route.startsWith("/admin/advanced/listings")) return { area: "advanced", advancedModule: "listings" };
  if (route.startsWith("/admin/advanced/booking")) return { area: "advanced", advancedModule: "booking" };
  if (route.startsWith("/admin/advanced/commerce")) return { area: "advanced", advancedModule: "commerce" };
  return { area: "advanced", advancedModule: "other" };
};

const routeSegments = (route: string | null) => {
  if (!route) return [];
  const basePath = resolveAdminBasePath(route);
  const relative = resolveAdminRoutePath(stripAdminBasePath(route, basePath));
  return relative.split("/").filter(Boolean);
};

const safeDecode = (value: string | undefined) => {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const selectedResourceFromRoute = (
  route: string | null
): AssistantAdminRuntimeSelectedResource | null => {
  const segments = routeSegments(route);
  if (segments[0] === "pages" && segments[1]) {
    return { kind: "page", id: safeDecode(segments[1]) ?? segments[1] };
  }
  if (segments[0] === "posts" && segments[1]) {
    return { kind: "post", id: safeDecode(segments[1]) ?? segments[1] };
  }
  if (segments[0] === "menus" && segments[1]) {
    return { kind: "menu", id: safeDecode(segments[1]) ?? segments[1] };
  }
  if (segments[0] === "seo" && segments[1]) {
    return { kind: "seo-document", id: safeDecode(segments[1]) ?? segments[1] };
  }
  if (segments[0] !== "advanced") return null;
  if (segments[1] === "engine" && segments[2]) {
    return { kind: "content-type", id: safeDecode(segments[2]) ?? segments[2] };
  }
  if (segments[1] === "posts" && segments[2]) {
    return { kind: "post", id: safeDecode(segments[2]) ?? segments[2] };
  }
  if (segments[1] === "entries" && segments[2] && segments[3]) {
    return { kind: "entry", id: safeDecode(segments[3]) ?? segments[3] };
  }
  if (segments[1] === "forms" && segments[2]) {
    return { kind: "form", id: safeDecode(segments[2]) ?? segments[2] };
  }
  if (segments[1] === "custom-screens" && segments[2] && segments[3] === "entries" && segments[4]) {
    return { kind: "custom-screen-entry", id: safeDecode(segments[4]) ?? segments[4] };
  }
  if (segments[1] === "custom-screens" && segments[2]) {
    return { kind: "custom-screen", id: safeDecode(segments[2]) ?? segments[2] };
  }
  if (segments[1] === "widgets" && segments[2] === "templates" && segments[3]) {
    return { kind: "widget-template", id: safeDecode(segments[3]) ?? segments[3] };
  }
  if (segments[1] === "listings" && segments[2] && segments[2] !== "new") {
    return { kind: "listing-query", id: safeDecode(segments[2]) ?? segments[2] };
  }
  return null;
};

const action = (
  input: AssistantAdminRuntimeVisibleAction
): AssistantAdminRuntimeVisibleAction | null => {
  if (!input.id.trim() || !input.label.trim() || !actionKindValues.has(input.kind)) {
    return null;
  }
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    href: input.href,
    requiredPermission: input.requiredPermission,
  };
};

const actionsForRoute = (
  route: string | null,
  selectedResource: AssistantAdminRuntimeSelectedResource | null
) => {
  const surface = resolveSurface(route);
  const actions: Array<AssistantAdminRuntimeVisibleAction | null> = [];
  if (surface.area === "pages") {
    actions.push(action({
      id: "page.create",
      label: "Create page",
      kind: "create",
      href: "/admin/pages/new",
      requiredPermission: "content:write",
    }));
    if (selectedResource?.kind === "page") {
      actions.push(action({
        id: "page.publish",
        label: "Publish page",
        kind: "publish",
        href: null,
        requiredPermission: "content:publish",
      }));
    }
  }
  if (surface.area === "advanced" && surface.advancedModule === "engine") {
    actions.push(action({
      id: "content-type.create",
      label: "Create content type",
      kind: "create",
      href: "/admin/advanced/engine",
      requiredPermission: "content:write",
    }));
  }
  if (surface.area === "advanced" && surface.advancedModule === "entries") {
    actions.push(action({
      id: "entry.create",
      label: "Create entry",
      kind: "create",
      href: "/admin/advanced/entries",
      requiredPermission: "content:write",
    }));
    if (selectedResource?.kind === "entry") {
      actions.push(action({
        id: "entry.publish",
        label: "Publish entry",
        kind: "publish",
        href: null,
        requiredPermission: "content:publish",
      }));
    }
  }
  if (surface.area === "advanced" && surface.advancedModule === "custom-screens") {
    actions.push(action({
      id: "custom-screen.create",
      label: "Create custom screen",
      kind: "create",
      href: "/admin/advanced/custom-screens",
      requiredPermission: "content:write",
    }));
  }
  if (surface.area === "advanced" && surface.advancedModule === "forms") {
    actions.push(action({
      id: "form.create",
      label: "Create form",
      kind: "create",
      href: "/admin/advanced/forms",
      requiredPermission: "forms:write",
    }));
  }
  if (surface.area === "advanced" && surface.advancedModule === "listings") {
    actions.push(action({
      id: "listing.create",
      label: "Create listing",
      kind: "create",
      href: "/admin/advanced/listings",
      requiredPermission: "content:write",
    }));
  }
  if (surface.area === "advanced" && surface.advancedModule === "widgets") {
    actions.push(action({
      id: "widget-template.create",
      label: "Create widget template",
      kind: "create",
      href: "/admin/advanced/widgets",
      requiredPermission: "widgets:write",
    }));
  }
  if (surface.area === "advanced" && surface.advancedModule === "booking") {
    actions.push(action({
      id: "booking.configure",
      label: "Configure booking",
      kind: "configure",
      href: "/admin/advanced/booking",
      requiredPermission: "booking:write",
    }));
  }
  if (surface.area === "advanced" && surface.advancedModule === "commerce") {
    actions.push(action({
      id: "commerce.configure",
      label: "Configure commerce",
      kind: "configure",
      href: "/admin/advanced/commerce",
      requiredPermission: "commerce:write",
    }));
  }
  if (surface.area === "settings") {
    actions.push(action({
      id: "settings.configure",
      label: "Configure settings",
      kind: "configure",
      href: route,
      requiredPermission: "settings:write",
    }));
  }
  return actions.filter((item): item is AssistantAdminRuntimeVisibleAction => Boolean(item));
};

export const buildAssistantAdminRuntimeSnapshot = (input: {
  route?: string | null;
  activeHref?: string | null;
}): AssistantAdminRuntimeSnapshot => {
  const route = canonicalizeAdminRoute(normalizePath(input.route ?? null));
  const activeHref = canonicalizeAdminRoute(normalizePath(input.activeHref ?? route));
  const selectedResource = selectedResourceFromRoute(route);
  const visibleActions = actionsForRoute(route, selectedResource);
  const requiredForVisibleActions = [
    ...new Set(
      visibleActions
        .map((item) => item.requiredPermission)
        .filter((item): item is string => Boolean(item))
    ),
  ].sort((left, right) => left.localeCompare(right));
  const surface = resolveSurface(route);

  return {
    schemaVersion: 2,
    route,
    activeHref,
    ...surface,
    selectedResource,
    visibleActions,
    permissionHints: {
      known: false,
      requiredForVisibleActions,
      reason: "frontend_user_has_no_permissions",
    },
  };
};

export const useAssistantAdminContext = (
  options: AssistantAdminContextOptions = {}
): AssistantActionContext => {
  const router = useOptionalAdminRouter();
  const activeSurface = useActiveAssistantSurfaceContext();
  const route = router?.path ?? readBrowserPath();
  const activeHref = options.activeHref ?? route;
  const runtimeSnapshot = useMemo(
    () =>
      buildAssistantAdminRuntimeSnapshot({
        route,
        activeHref,
      }),
    [activeHref, route]
  );
  const resolvedActiveSurface = activeSurfaceMatchesRoute(
    activeSurface,
    runtimeSnapshot.selectedResource
  )
    ? activeSurface
    : null;

  return useMemo(
    () => ({
      page: canonicalizeAdminRoute(normalizePath(route)) ?? undefined,
      locale: readBrowserLocale(),
      runtimeSnapshot,
      activeSurface: resolvedActiveSurface,
    }),
    [resolvedActiveSurface, route, runtimeSnapshot]
  );
};
