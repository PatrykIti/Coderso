import type {
  AssistantActionContext,
  AssistantAdminContext,
  AssistantAdminRuntimeActionKind,
  AssistantAdminRuntimePermissionHints,
  AssistantAdminRuntimeSelectedResource,
  AssistantAdminRuntimeSnapshot,
  AssistantAdminRuntimeVisibleAction,
} from "./actionPlanTypes";

const actionKinds = new Set<AssistantAdminRuntimeActionKind>([
  "navigate",
  "create",
  "edit",
  "publish",
  "delete",
  "execute",
  "configure",
]);
const permissionPattern = /^[a-z0-9*:_-]+$/i;
const secretLikePattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;

const normalizeRoute = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const withoutHash = trimmed.split("#")[0] ?? trimmed;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  return withoutQuery.length > 1 && withoutQuery.endsWith("/")
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
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

const normalizeText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || secretLikePattern.test(trimmed)) return null;
  return trimmed;
};

const normalizePermission = (value: unknown) => {
  const text = normalizeText(value, 120);
  if (!text || !permissionPattern.test(text)) return null;
  return text;
};

const normalizeHref = (value: unknown) => {
  const text = normalizeText(value, 240);
  if (!text || !text.startsWith("/admin")) return null;
  return text;
};

const normalizeSelectedResource = (
  value: unknown
): AssistantAdminRuntimeSelectedResource | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const kind = normalizeText(record.kind, 80);
  const id = normalizeText(record.id, 200);
  if (!kind || !id) return null;
  return { kind, id };
};

const normalizeVisibleActions = (value: unknown): AssistantAdminRuntimeVisibleAction[] => {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, AssistantAdminRuntimeVisibleAction>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const id = normalizeText(record.id, 120);
    const label = normalizeText(record.label, 160);
    const kind = record.kind;
    if (!id || !label || !actionKinds.has(kind as AssistantAdminRuntimeActionKind)) {
      continue;
    }
    const href = record.href === null ? null : normalizeHref(record.href);
    const requiredPermission =
      record.requiredPermission === null
        ? null
        : normalizePermission(record.requiredPermission);
    if (record.href !== null && record.href !== undefined && !href) continue;
    if (
      record.requiredPermission !== null &&
      record.requiredPermission !== undefined &&
      !requiredPermission
    ) {
      continue;
    }
    byId.set(id, {
      id,
      label,
      kind: kind as AssistantAdminRuntimeActionKind,
      href,
      requiredPermission,
    });
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
};

const normalizePermissionHints = (
  value: unknown,
  visibleActions: AssistantAdminRuntimeVisibleAction[]
): AssistantAdminRuntimePermissionHints => {
  const fromActions = visibleActions
    .map((item) => item.requiredPermission)
    .filter((item): item is string => Boolean(item));
  const fromHints =
    value && typeof value === "object" && !Array.isArray(value)
      ? ((value as Record<string, unknown>).requiredForVisibleActions as unknown)
      : [];
  const normalized = [
    ...new Set(
      [
        ...fromActions,
        ...(Array.isArray(fromHints) ? fromHints : []),
      ]
        .map(normalizePermission)
        .filter((item): item is string => Boolean(item))
    ),
  ].sort((left, right) => left.localeCompare(right));

  return {
    known: false,
    requiredForVisibleActions: normalized,
    reason: "frontend_user_has_no_permissions",
  };
};

const normalizeRuntimeSnapshot = (
  value: AssistantActionContext["runtimeSnapshot"] | undefined,
  fallbackRoute: string | null
): AssistantAdminRuntimeSnapshot | null => {
  if (!value) return null;
  const route = normalizeRoute(value.route) ?? fallbackRoute;
  const visibleActions = normalizeVisibleActions(value.visibleActions);
  const area = resolveArea(route);
  const codersoModule = resolveCodersoModule(route);
  return {
    schemaVersion: 1,
    route,
    activeHref: normalizeHref(value.activeHref) ?? route,
    area,
    codersoModule,
    selectedResource: normalizeSelectedResource(value.selectedResource),
    visibleActions,
    permissionHints: normalizePermissionHints(value.permissionHints, visibleActions),
  };
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
    runtimeSnapshot: normalizeRuntimeSnapshot(input?.runtimeSnapshot, route),
    area: resolveArea(route),
    codersoModule: resolveCodersoModule(route),
  };
};
