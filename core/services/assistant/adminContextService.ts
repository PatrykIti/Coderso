import type {
  AssistantActionContext,
  AssistantActiveSurfaceBlockSummary,
  AssistantActiveSurfaceContext,
  AssistantAdminContext,
  AssistantAdminRuntimeActionKind,
  AssistantAdminRuntimePermissionHints,
  AssistantAdminRuntimeSelectedResource,
  AssistantAdminRuntimeSnapshot,
  AssistantAdminRuntimeVisibleAction,
} from "./actionPlanTypes";
import type { AssistantCustomScreenBindingSummary } from "./adminContextTypes";
import {
  extractAssistantTemplateSectionReferences,
  mergeAssistantTemplateSectionReferences,
  normalizeAssistantReferencedWidgetTemplates,
} from "./adminContextCatalogNormalizer";
import { normalizeAssistantPlanningState } from "./cmsPlanningState";

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

const normalizeStringArray = (value: unknown, maxItems = 20, maxLength = 120) => {
  if (!Array.isArray(value)) return [];
  const output: string[] = [];
  for (const item of value) {
    const text = normalizeText(item, maxLength);
    if (text) output.push(text);
    if (output.length >= maxItems) break;
  }
  return [...new Set(output)].sort((left, right) => left.localeCompare(right));
};

const normalizeSurfaceBlock = (value: unknown): AssistantActiveSurfaceBlockSummary | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = normalizeText(record.id, 120);
  const type = normalizeText(record.type, 120);
  const path = normalizeText(record.path, 240) ?? id;
  if (!id || !type || !path) return null;
  const childCount =
    typeof record.childCount === "number" && Number.isFinite(record.childCount)
      ? Math.max(0, Math.min(999, Math.floor(record.childCount)))
      : 0;
  return {
    id,
    type,
    label: normalizeText(record.label, 160),
    path,
    childCount,
    slotKeys: normalizeStringArray(record.slotKeys),
    templateId: normalizeText(record.templateId, 160),
    templateName: normalizeText(record.templateName, 160),
  };
};

const normalizeCustomScreenBindingSummary = (
  value: unknown
): AssistantCustomScreenBindingSummary | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const widgetId = normalizeText(record.widgetId, 120);
  const field = normalizeText(record.field, 120);
  const propPath = normalizeText(record.propPath, 160);
  const mode = record.mode;
  if (!widgetId || !field || !propPath) return null;
  const normalizedMode: AssistantCustomScreenBindingSummary["mode"] =
    mode === "read" || mode === "write" || mode === "readwrite"
      ? mode
      : "readwrite";
  return {
    widgetId,
    field,
    propPath,
    mode: normalizedMode,
  };
};

const normalizeActiveSurface = (
  value: AssistantActionContext["activeSurface"] | undefined
): AssistantActiveSurfaceContext | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const blocks = Array.isArray(value.blocks)
    ? value.blocks
        .map(normalizeSurfaceBlock)
        .filter((block): block is AssistantActiveSurfaceBlockSummary => Boolean(block))
        .slice(0, 80)
    : [];

  if (value.kind === "page") {
    const page = value.page;
    if (!page || typeof page !== "object" || Array.isArray(page)) return null;
    const id = normalizeText(page.id, 160);
    const title = normalizeText(page.title, 240);
    const slug = normalizeText(page.slug, 240);
    const status = normalizeText(page.status, 80);
    if (!id || !title || !slug || !status) return null;
    return {
      kind: "page",
      page: {
        id,
        title,
        slug,
        status,
        template: normalizeText(page.template, 160),
      },
      selectedBlockId: normalizeText(value.selectedBlockId, 120),
      blocks,
      templateReferences: mergeAssistantTemplateSectionReferences([
        ...extractAssistantTemplateSectionReferences(blocks),
        ...(Array.isArray(value.templateReferences) ? value.templateReferences : []),
      ]),
      referencedTemplates: normalizeAssistantReferencedWidgetTemplates(
        value.referencedTemplates
      ),
      warnings: normalizeStringArray(value.warnings, 20, 160),
    };
  }

  if (value.kind === "widget-template") {
    const template = value.template;
    if (!template || typeof template !== "object" || Array.isArray(template)) return null;
    const id = normalizeText(template.id, 160);
    const name = normalizeText(template.name, 240);
    const status = normalizeText(template.status, 80);
    const category = normalizeText(template.category, 120);
    if (!id || !name || !status || !category) return null;
    const settings =
      value.settings && typeof value.settings === "object" && !Array.isArray(value.settings)
        ? (value.settings as Record<string, unknown>)
        : {};
    return {
      kind: "widget-template",
      template: { id, name, status, category },
      selectedBlockId: normalizeText(value.selectedBlockId, 120),
      blocks,
      settings: {
        wrapperContainer: normalizeText(settings.wrapperContainer, 80),
        sectionGap: normalizeText(settings.sectionGap, 80),
        hasBackgroundMedia: settings.hasBackgroundMedia === true,
      },
      warnings: normalizeStringArray(value.warnings, 20, 160),
    };
  }

  if (value.kind === "custom-screen") {
    const screen = value.screen;
    if (!screen || typeof screen !== "object" || Array.isArray(screen)) return null;
    const id = normalizeText(screen.id, 160);
    const name = normalizeText(screen.name, 240);
    const status = normalizeText(screen.status, 80);
    const contentTypeId = normalizeText(screen.contentTypeId, 160);
    const mode = normalizeText(screen.mode, 80);
    if (!id || !name || !status || !contentTypeId || !mode) return null;
    const bindings = Array.isArray(value.bindings)
      ? value.bindings
          .map(normalizeCustomScreenBindingSummary)
          .filter((binding): binding is AssistantCustomScreenBindingSummary => Boolean(binding))
          .slice(0, 80)
      : [];

    return {
      kind: "custom-screen",
      screen: {
        id,
        name,
        status,
        contentTypeId,
        showInSidebar: screen.showInSidebar === true,
        sidebarLabel: normalizeText(screen.sidebarLabel, 160),
        mode,
      },
      selectedEntryId: normalizeText(value.selectedEntryId, 160),
      selectedBlockId: normalizeText(value.selectedBlockId, 120),
      blocks,
      bindings,
      writableBindingFields: normalizeStringArray(value.writableBindingFields, 80, 120),
      warnings: normalizeStringArray(value.warnings, 20, 160),
    };
  }

  return null;
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
    activeSurface: normalizeActiveSurface(input?.activeSurface),
    planningState: normalizeAssistantPlanningState(input?.planningState),
    area: resolveArea(route),
    codersoModule: resolveCodersoModule(route),
  };
};
