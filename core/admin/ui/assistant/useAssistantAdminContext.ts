import { useMemo } from "react";

import {
  resolveAdminBasePath,
  stripAdminBasePath,
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

type RuntimeSurface = Pick<AssistantAdminRuntimeSnapshot, "area" | "codersoModule">;

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
  if (!route) return { area: "other", codersoModule: null };
  if (route === "/admin") return { area: "dashboard", codersoModule: null };
  if (route.startsWith("/admin/pages")) return { area: "pages", codersoModule: null };
  if (route.startsWith("/admin/posts")) return { area: "posts", codersoModule: null };
  if (route.startsWith("/admin/settings")) return { area: "settings", codersoModule: null };
  if (!route.startsWith("/admin/coderso")) return { area: "other", codersoModule: null };
  if (route.startsWith("/admin/coderso/engine")) return { area: "coderso", codersoModule: "engine" };
  if (route.startsWith("/admin/coderso/entries")) return { area: "coderso", codersoModule: "entries" };
  if (route.startsWith("/admin/coderso/custom-screens")) {
    return { area: "coderso", codersoModule: "custom-screens" };
  }
  if (route.startsWith("/admin/coderso/widgets")) return { area: "coderso", codersoModule: "widgets" };
  if (route.startsWith("/admin/coderso/forms")) return { area: "coderso", codersoModule: "forms" };
  if (route.startsWith("/admin/coderso/listings")) return { area: "coderso", codersoModule: "listings" };
  if (route.startsWith("/admin/coderso/booking")) return { area: "coderso", codersoModule: "booking" };
  if (route.startsWith("/admin/coderso/commerce")) return { area: "coderso", codersoModule: "commerce" };
  return { area: "coderso", codersoModule: "other" };
};

const routeSegments = (route: string | null) => {
  if (!route) return [];
  const basePath = resolveAdminBasePath(route);
  const relative = stripAdminBasePath(route, basePath);
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
  if (segments[0] !== "coderso") return null;
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
  if (surface.area === "coderso" && surface.codersoModule === "engine") {
    actions.push(action({
      id: "content-type.create",
      label: "Create content type",
      kind: "create",
      href: "/admin/coderso/engine",
      requiredPermission: "content:write",
    }));
  }
  if (surface.area === "coderso" && surface.codersoModule === "entries") {
    actions.push(action({
      id: "entry.create",
      label: "Create entry",
      kind: "create",
      href: "/admin/coderso/entries",
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
  if (surface.area === "coderso" && surface.codersoModule === "custom-screens") {
    actions.push(action({
      id: "custom-screen.create",
      label: "Create custom screen",
      kind: "create",
      href: "/admin/coderso/custom-screens",
      requiredPermission: "content:write",
    }));
  }
  if (surface.area === "coderso" && surface.codersoModule === "forms") {
    actions.push(action({
      id: "form.create",
      label: "Create form",
      kind: "create",
      href: "/admin/coderso/forms",
      requiredPermission: "forms:write",
    }));
  }
  if (surface.area === "coderso" && surface.codersoModule === "listings") {
    actions.push(action({
      id: "listing.create",
      label: "Create listing",
      kind: "create",
      href: "/admin/coderso/listings",
      requiredPermission: "content:write",
    }));
  }
  if (surface.area === "coderso" && surface.codersoModule === "widgets") {
    actions.push(action({
      id: "widget-template.create",
      label: "Create widget template",
      kind: "create",
      href: "/admin/coderso/widgets",
      requiredPermission: "widgets:write",
    }));
  }
  if (surface.area === "coderso" && surface.codersoModule === "booking") {
    actions.push(action({
      id: "booking.configure",
      label: "Configure booking",
      kind: "configure",
      href: "/admin/coderso/booking",
      requiredPermission: "booking:write",
    }));
  }
  if (surface.area === "coderso" && surface.codersoModule === "commerce") {
    actions.push(action({
      id: "commerce.configure",
      label: "Configure commerce",
      kind: "configure",
      href: "/admin/coderso/commerce",
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
  const route = normalizePath(input.route ?? null);
  const activeHref = normalizePath(input.activeHref ?? route);
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
    schemaVersion: 1,
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
      page: normalizePath(route) ?? undefined,
      locale: readBrowserLocale(),
      runtimeSnapshot,
      activeSurface: resolvedActiveSurface,
    }),
    [resolvedActiveSurface, route, runtimeSnapshot]
  );
};
