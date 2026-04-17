import type {
  AssistantActionPlan,
  AssistantAdminContext,
  AssistantPlannedAction,
} from "./actionPlanTypes";
import type { CmsOperationDraft } from "./cmsOperationDraftSchema";
import {
  type CmsResolvedTargetCandidate,
  resolveCmsOperationTargets,
} from "./cmsTargetResolver";

const readString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readDetailString = (target: CmsResolvedTargetCandidate, key: string) =>
  readString(target.details?.[key]);

const readDetailNumber = (target: CmsResolvedTargetCandidate, key: string) =>
  readNumber(target.details?.[key]);

const describeCmsTargetQuery = (draft: CmsOperationDraft) =>
  draft.targetQuery?.exactName ??
  draft.targetQuery?.prefix ??
  draft.targetQuery?.slug ??
  draft.targetQuery?.text ??
  null;

const toInspectionCandidates = (candidates: CmsResolvedTargetCandidate[]) =>
  candidates.slice(0, 10).map((candidate) => ({
    kind: candidate.kind,
    id: candidate.id,
    label: candidate.label,
    slug: candidate.slug,
    status: candidate.status,
    adminHref: candidate.adminHref,
  }));

const buildNeedsInputPlan = (
  prompt: string,
  draft: CmsOperationDraft,
  reason: string,
  candidates: CmsResolvedTargetCandidate[]
): AssistantActionPlan => ({
  id: `plan-cms-${draft.resourceKind}-${draft.operation}-needs-input`,
  status: "needs_input",
  intentId: `cms-${draft.resourceKind}-${draft.operation}-needs-input`,
  responseKind: "needs_input",
  promptKind: "refinement_request",
  intentFamily: "unknown",
  inspection: {
    kind: "resource-candidates",
    operation: "find",
    resourceKind: draft.resourceKind,
    matchStatus: candidates.length > 0 ? "ambiguous" : "no_match",
    query: describeCmsTargetQuery(draft),
    candidates: toInspectionCandidates(candidates),
    truncated: candidates.length > 10,
  },
  title: "CMS operation needs a precise target",
  answer: [
    "I can plan this CMS operation only after the target is resolved safely.",
    "",
    reason,
  ].join("\n"),
  summary: "The CMS operation target is not precise enough for a reviewed action plan.",
  confidence: 0.45,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions: [
    {
      id: "cms-operation-target",
      label: "Which exact CMS resource should I use?",
      description: "Choose one exact candidate, provide a stricter name, or add the expected count.",
      required: true,
    },
  ],
  actions: [],
});

const normalizePageSlug = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const readMutationValue = (draft: CmsOperationDraft) => draft.mutation?.value;

const readMutationText = (draft: CmsOperationDraft) => {
  const value = readMutationValue(draft);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const readMutationNumber = (draft: CmsOperationDraft) => {
  const value = readMutationValue(draft);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const readMutationBoolean = (draft: CmsOperationDraft) => {
  const value = readMutationValue(draft);
  return typeof value === "boolean" ? value : null;
};

const fieldIntent = (draft: CmsOperationDraft) =>
  (draft.mutation?.fieldIntent ?? "").trim().toLowerCase();

const buildPageUpdatePatch = (
  draft: CmsOperationDraft
): { title?: string; slug?: string; status?: "draft" | "published" } | null => {
  const value = readMutationText(draft);
  if (!value) return null;
  const field = fieldIntent(draft);
  if (field === "slug" || field === "url") {
    const slug = normalizePageSlug(value);
    return slug ? { slug } : null;
  }
  if (field === "status") {
    if (value === "draft" || value === "published") return { status: value };
    return null;
  }
  return { title: value };
};

const buildCustomScreenUpdatePatch = (
  draft: CmsOperationDraft
): Extract<AssistantPlannedAction, { type: "custom-screen.update" }>["input"]["patch"] | null => {
  const value = readMutationText(draft);
  const bool = readMutationBoolean(draft);
  const field = fieldIntent(draft);
  if (field === "status" && (value === "draft" || value === "active")) return { status: value };
  if (field === "showinsidebar" || field === "sidebar") {
    if (bool !== null) return { showInSidebar: bool };
    if (value) return { sidebarLabel: value };
  }
  return value ? { name: value } : null;
};

const buildFormUpdatePatch = (
  draft: CmsOperationDraft
): Extract<AssistantPlannedAction, { type: "form.update" }>["input"]["patch"] | null => {
  const value = readMutationText(draft);
  const field = fieldIntent(draft);
  if (!value) return null;
  if (field === "slug") return { slug: value };
  if (field === "status" && (value === "draft" || value === "published" || value === "archived")) {
    return { status: value };
  }
  if (
    (field === "access" || field === "submissionaccess") &&
    (value === "public" || value === "internal")
  ) {
    return { submissionAccess: value };
  }
  return { name: value };
};

const buildListingQueryUpdatePatch = (draft: CmsOperationDraft) => {
  const field = fieldIntent(draft);
  const number = readMutationNumber(draft);
  const bool = readMutationBoolean(draft);
  const text = readMutationText(draft);
  if (field === "limit" && number !== null) return { limit: number };
  if ((field === "includedrafts" || field === "drafts") && bool !== null) {
    return { includeDrafts: bool };
  }
  return text ? { name: text } : null;
};

const buildListingTemplateUpdatePatch = (draft: CmsOperationDraft) => {
  const value = readMutationText(draft);
  const field = fieldIntent(draft);
  if (!value) return null;
  if (field === "slug") return { slug: value };
  if (field === "layout" && ["grid", "list", "table", "calendar", "map"].includes(value)) {
    return { layout: value as "grid" | "list" | "table" | "calendar" | "map" };
  }
  return { name: value };
};

const buildWidgetTemplateUpdatePatch = (
  draft: CmsOperationDraft
): Extract<AssistantPlannedAction, { type: "widget-template.update" }>["input"]["patch"] | null => {
  const value = readMutationText(draft);
  const field = fieldIntent(draft);
  if (!value) return null;
  if (field === "status" && (value === "draft" || value === "published")) return { status: value };
  if (field === "category") return { category: value };
  if (field === "description") return { description: value };
  return { name: value };
};

const buildMenuItemUpdatePatch = (draft: CmsOperationDraft) => {
  const value = readMutationText(draft);
  if (!value) return null;
  const field = fieldIntent(draft);
  return field === "href" || field === "url" || field === "slug"
    ? { href: value }
    : { label: value };
};

const buildSeoUpdatePatch = (draft: CmsOperationDraft) => {
  const value = readMutationText(draft);
  if (!value) return null;
  const field = fieldIntent(draft);
  return field === "description" || field === "opis"
    ? { description: value }
    : { title: value };
};

const actionId = (type: string, id: string) => `${type.replaceAll(".", "-")}-${id}`;

const buildActionForExactTarget = (
  draft: CmsOperationDraft,
  target: CmsResolvedTargetCandidate
): AssistantPlannedAction | null => {
  if (draft.resourceKind === "page" && draft.operation === "delete") {
    return {
      id: actionId("page.delete", target.id),
      type: "page.delete",
      title: `Delete ${target.label}`,
      description: "Delete the resolved page selected from trusted CMS context.",
      input: {
        id: target.id,
        title: target.label,
        slug: target.slug ?? "",
        expectedStatus: target.status,
      },
    };
  }
  if (draft.resourceKind === "page" && draft.operation === "update") {
    const patch = buildPageUpdatePatch(draft);
    if (!patch) return null;
    return {
      id: actionId("page.update", target.id),
      type: "page.update",
      title: `Update ${target.label}`,
      description: "Update resolved page metadata/settings selected from trusted CMS context.",
      input: {
        id: target.id,
        title: target.label,
        slug: target.slug ?? "",
        expectedStatus: target.status,
        patch,
      },
    };
  }
  if (draft.resourceKind === "content-type" && draft.operation === "delete") {
    const entryCount = readDetailNumber(target, "entryCount") ?? 0;
    if (entryCount > 0) return null;
    return {
      id: actionId("content-type.delete", target.id),
      type: "content-type.delete",
      title: `Delete ${target.label}`,
      description: "Delete a content type selected from trusted CMS context.",
      input: {
        id: target.id,
        name: target.label,
        slug: target.slug ?? "",
        expectedEntryCount: entryCount,
      },
    };
  }
  if (draft.resourceKind === "custom-screen" && draft.operation === "delete") {
    return {
      id: actionId("custom-screen.delete", target.id),
      type: "custom-screen.delete",
      title: `Delete ${target.label}`,
      description: "Delete a custom screen selected from trusted CMS context.",
      input: {
        id: target.id,
        name: target.label,
        expectedNamePrefix: draft.targetQuery?.prefix ?? null,
      },
    };
  }
  if (draft.resourceKind === "custom-screen" && draft.operation === "update") {
    const patch = buildCustomScreenUpdatePatch(draft);
    const contentTypeId = readDetailString(target, "contentTypeId");
    if (!patch || !contentTypeId) return null;
    return {
      id: actionId("custom-screen.update", target.id),
      type: "custom-screen.update",
      title: `Update ${target.label}`,
      description: "Update a custom screen selected from trusted CMS context.",
      input: {
        id: target.id,
        name: target.label,
        expectedStatus: target.status,
        expectedContentTypeId: contentTypeId,
        patch,
      },
    };
  }
  if (draft.resourceKind === "form" && (draft.operation === "delete" || draft.operation === "archive")) {
    if (!target.slug) return null;
    return {
      id: actionId(draft.operation === "archive" ? "form.archive" : "form.delete", target.id),
      type: draft.operation === "archive" ? "form.archive" : "form.delete",
      title: `${draft.operation === "archive" ? "Archive" : "Delete"} ${target.label}`,
      description: `${draft.operation === "archive" ? "Archive" : "Delete"} a form selected from trusted CMS context.`,
      input: {
        id: target.id,
        name: target.label,
        slug: target.slug,
        expectedStatus: target.status,
      },
    };
  }
  if (draft.resourceKind === "form" && draft.operation === "update") {
    const patch = buildFormUpdatePatch(draft);
    if (!patch || !target.slug) return null;
    return {
      id: actionId("form.update", target.id),
      type: "form.update",
      title: `Update ${target.label}`,
      description: "Update a form selected from trusted CMS context.",
      input: {
        id: target.id,
        name: target.label,
        slug: target.slug,
        expectedStatus: target.status,
        patch,
      },
    };
  }
  if (draft.resourceKind === "listing-query" && draft.operation === "delete") {
    return {
      id: actionId("listing-query.delete", target.id),
      type: "listing-query.delete",
      title: `Delete ${target.label}`,
      description: "Delete a listing query selected from trusted CMS context.",
      input: { id: target.id, name: target.label },
    };
  }
  if (draft.resourceKind === "listing-query" && draft.operation === "update") {
    const patch = buildListingQueryUpdatePatch(draft);
    if (!patch) return null;
    return {
      id: actionId("listing-query.update", target.id),
      type: "listing-query.update",
      title: `Update ${target.label}`,
      description: "Update a listing query selected from trusted CMS context.",
      input: { id: target.id, name: target.label, patch },
    };
  }
  if (draft.resourceKind === "listing-template" && draft.operation === "delete") {
    if (!target.slug) return null;
    return {
      id: actionId("listing-template.delete", target.id),
      type: "listing-template.delete",
      title: `Delete ${target.label}`,
      description: "Delete a listing template selected from trusted CMS context.",
      input: {
        id: target.id,
        name: target.label,
        slug: target.slug,
        expectedLayout: target.status,
      },
    };
  }
  if (draft.resourceKind === "listing-template" && draft.operation === "update") {
    const patch = buildListingTemplateUpdatePatch(draft);
    if (!patch || !target.slug) return null;
    return {
      id: actionId("listing-template.update", target.id),
      type: "listing-template.update",
      title: `Update ${target.label}`,
      description: "Update a listing template selected from trusted CMS context.",
      input: {
        id: target.id,
        name: target.label,
        slug: target.slug,
        expectedLayout: target.status,
        patch,
      },
    };
  }
  if (draft.resourceKind === "widget-template" && draft.operation === "delete") {
    return {
      id: actionId("widget-template.delete", target.id),
      type: "widget-template.delete",
      title: `Delete ${target.label}`,
      description: "Delete a widget template selected from trusted CMS context.",
      input: {
        id: target.id,
        name: target.label,
        expectedStatus: target.status,
        expectedCategory: readDetailString(target, "category"),
      },
    };
  }
  if (draft.resourceKind === "widget-template" && draft.operation === "update") {
    const patch = buildWidgetTemplateUpdatePatch(draft);
    if (!patch) return null;
    return {
      id: actionId("widget-template.update", target.id),
      type: "widget-template.update",
      title: `Update ${target.label}`,
      description: "Update a widget template selected from trusted CMS context.",
      input: {
        id: target.id,
        name: target.label,
        expectedStatus: target.status,
        expectedCategory: readDetailString(target, "category"),
        patch,
      },
    };
  }
  if (draft.resourceKind === "menu-item" && draft.operation === "delete") {
    const menuId = readDetailString(target, "menuId");
    if (!menuId) return null;
    return {
      id: actionId("menu.item.delete", target.id),
      type: "menu.item.delete",
      title: `Delete ${target.label}`,
      description: "Delete a menu item selected from trusted CMS context.",
      input: {
        menuId,
        itemId: target.id,
        label: target.label,
        expectedHref: readDetailString(target, "href"),
        expectedParentId: readDetailString(target, "parentId"),
      },
    };
  }
  if (draft.resourceKind === "menu-item" && draft.operation === "update") {
    const menuId = readDetailString(target, "menuId");
    const patch = buildMenuItemUpdatePatch(draft);
    if (!menuId || !patch) return null;
    return {
      id: actionId("menu.item.update", target.id),
      type: "menu.item.update",
      title: `Update ${target.label}`,
      description: "Update a menu item selected from trusted CMS context.",
      input: {
        menuId,
        itemId: target.id,
        label: target.label,
        expectedHref: readDetailString(target, "href"),
        expectedParentId: readDetailString(target, "parentId"),
        patch,
      },
    };
  }
  if (draft.resourceKind === "seo-document" && draft.operation === "delete") {
    const targetType = readDetailString(target, "targetType");
    const targetId = readDetailString(target, "targetId");
    if (targetType !== "page" && targetType !== "entry") return null;
    if (!targetId) return null;
    return {
      id: actionId("seo.document.delete", target.id),
      type: "seo.document.delete",
      title: `Delete SEO for ${target.label}`,
      description: "Delete a SEO document selected from trusted CMS context.",
      input: {
        id: target.id,
        targetType,
        targetId,
        expectedSlug: target.slug,
        expectedTitle: readDetailString(target, "title"),
      },
    };
  }
  if (draft.resourceKind === "seo-document" && draft.operation === "update") {
    const targetType = readDetailString(target, "targetType");
    const targetId = readDetailString(target, "targetId");
    const patch = buildSeoUpdatePatch(draft);
    if ((targetType !== "page" && targetType !== "entry") || !targetId || !patch) return null;
    return {
      id: actionId("seo.document.update", target.id),
      type: "seo.document.update",
      title: `Update SEO for ${target.label}`,
      description: "Update a SEO document selected from trusted CMS context.",
      input: {
        id: target.id,
        targetType,
        targetId,
        expectedSlug: target.slug,
        expectedTitle: readDetailString(target, "title"),
        patch,
      },
    };
  }
  return null;
};

export const mapCmsOperationToActionPlan = (input: {
  prompt: string;
  draft: CmsOperationDraft;
  context: AssistantAdminContext;
}): AssistantActionPlan | null => {
  if (
    input.draft.operation !== "delete" &&
    input.draft.operation !== "update" &&
    input.draft.operation !== "archive"
  ) {
    return null;
  }
  const resolution = resolveCmsOperationTargets(input.draft, input.context);
  if (
    resolution.status === "ambiguous" &&
    (input.draft.operation === "delete" || input.draft.operation === "archive") &&
    input.draft.constraints?.expectedCount === resolution.candidates.length &&
    resolution.candidates.length > 1
  ) {
    const actions = resolution.candidates
      .map((target) => buildActionForExactTarget(input.draft, target))
      .filter((action): action is AssistantPlannedAction => Boolean(action));
    if (actions.length === resolution.candidates.length) {
      return {
        id: `plan-cms-${input.draft.resourceKind}-${input.draft.operation}-multi`,
        status: "ready",
        intentId: `cms-${input.draft.resourceKind}-${input.draft.operation}`,
        responseKind: "action_plan",
        promptKind: "refinement_request",
        intentFamily: "unknown",
        title: `${input.draft.operation === "archive" ? "Archive" : "Delete"} ${actions.length} ${input.draft.resourceKind} resources`,
        answer: "I can prepare these CMS operations through the reviewed LLM Guide action flow.",
        summary: `${input.draft.operation === "archive" ? "Archive" : "Delete"} ${actions.length} resolved ${input.draft.resourceKind} resources.`,
        confidence: 0.76,
        assumptions: [
          "The target count was explicit and candidates were resolved from trusted context.",
          "Dry-run must be reviewed before execution.",
        ],
        questions: [],
        actions,
      };
    }
  }
  if (resolution.status !== "exact") {
    return buildNeedsInputPlan(input.prompt, input.draft, resolution.reason, resolution.candidates);
  }
  const target = resolution.candidates[0];
  const action = buildActionForExactTarget(input.draft, target);
  if (!action) {
    return buildNeedsInputPlan(
      input.prompt,
      input.draft,
      "This CMS operation resolved through the generic mapper, but it does not yet map to a supported typed action for this resource family or field.",
      [target]
    );
  }
  return {
    id: `plan-${action.type.replaceAll(".", "-")}-${target.id}`,
    status: "ready",
    intentId: action.type.replaceAll(".", "-"),
    responseKind: "action_plan",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: action.title,
    answer: "I can prepare this CMS operation through the reviewed LLM Guide action flow.",
    summary: `${action.title}${target.slug ? ` (${target.slug})` : ""}.`,
    confidence: 0.78,
    assumptions: [
      "The target is resolved from trusted active context or the server-side resource catalog.",
      "Dry-run must be reviewed before execution.",
    ],
    questions: [],
    actions: [action],
  };
};
