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

const operationVerb = (operation: CmsOperationDraft["operation"]) => {
  if (operation === "archive") return "Archive";
  if (operation === "delete") return "Delete";
  if (operation === "update") return "Update";
  return "Run";
};

const secretKeyPattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const containsSecretLikeKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsSecretLikeKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => {
    if (secretKeyPattern.test(key)) return true;
    return containsSecretLikeKey(nested);
  });
};

const hasOnlyKeys = (record: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(record).every((key) => keys.includes(key));

const readCreateItems = (draft: CmsOperationDraft) => {
  const items = draft.mutation?.patch?.items;
  if (!Array.isArray(items)) return null;
  const records = items.filter(isRecord);
  if (records.length !== items.length) return null;
  if (records.some(containsSecretLikeKey)) return null;
  return records;
};

const readRequiredTextField = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === "string" && record[key].trim() ? record[key].trim() : null;

const readOptionalTextField = (record: Record<string, unknown>, key: string) => {
  if (record[key] === undefined || record[key] === null) return null;
  return readRequiredTextField(record, key);
};

const readOptionalBooleanField = (
  record: Record<string, unknown>,
  key: string,
  fallback: boolean
) => (typeof record[key] === "boolean" ? record[key] : fallback);

const readOptionalNumberField = (
  record: Record<string, unknown>,
  key: string,
  fallback: number
) => (typeof record[key] === "number" && Number.isFinite(record[key]) ? record[key] : fallback);

const readStringArrayField = (record: Record<string, unknown>, key: string, fallback: string[]) => {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return null;
  return value.map((item) => item.trim()).filter(Boolean);
};

const readRecordField = (
  record: Record<string, unknown>,
  key: string,
  fallback: Record<string, unknown>
) => {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  return isRecord(value) && !containsSecretLikeKey(value) ? value : null;
};

const readRecordArrayField = (
  record: Record<string, unknown>,
  key: string,
  fallback: Array<Record<string, unknown>>
) => {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  if (!Array.isArray(value) || !value.every(isRecord)) return null;
  return value.some(containsSecretLikeKey) ? null : value;
};

const slugForActionId = (value: string, fallback: number) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
  `item-${fallback + 1}`;

const readCreateStatus = <TAllowed extends string>(
  record: Record<string, unknown>,
  key: string,
  allowed: readonly TAllowed[],
  fallback: TAllowed
): TAllowed | null => {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  return typeof value === "string" && allowed.includes(value as TAllowed)
    ? (value as TAllowed)
    : null;
};

const readListingSort = (record: Record<string, unknown>) => {
  const value = record.sort;
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const result: Array<{ field: string; dir: "asc" | "desc" }> = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const field = readRequiredTextField(item, "field");
    const dir = item.dir;
    if (!field || (dir !== "asc" && dir !== "desc")) return null;
    result.push({ field, dir });
  }
  return result;
};

const buildCreateActionForItem = (
  draft: CmsOperationDraft,
  item: Record<string, unknown>,
  index: number
): AssistantPlannedAction | null => {
  if (draft.resourceKind === "page") {
    if (!hasOnlyKeys(item, ["title", "slug", "status", "introTitle", "introBody", "ctaLabel", "blocks"])) {
      return null;
    }
    const title = readRequiredTextField(item, "title");
    const slug = readRequiredTextField(item, "slug");
    const introTitle = readRequiredTextField(item, "introTitle") ?? title;
    const introBody = readRequiredTextField(item, "introBody");
    const status = readCreateStatus(item, "status", ["draft", "published"] as const, "draft");
    const blocks = readRecordArrayField(item, "blocks", []);
    if (!title || !slug || !introTitle || !introBody || status === null || blocks === null) {
      return null;
    }
    return {
      id: actionId("page.upsert", slugForActionId(slug, index)),
      type: "page.upsert",
      title: `Create ${title}`,
      description: "Create an explicitly provided page through the reviewed action flow.",
      input: {
        title,
        slug: normalizePageSlug(slug) ?? slug,
        status,
        introTitle,
        introBody,
        ...(readOptionalTextField(item, "ctaLabel")
          ? { ctaLabel: readOptionalTextField(item, "ctaLabel") ?? undefined }
          : {}),
        ...(blocks.length > 0
          ? {
              blocks:
                blocks as Extract<AssistantPlannedAction, { type: "page.upsert" }>["input"]["blocks"],
            }
          : {}),
      },
    };
  }

  if (draft.resourceKind === "form") {
    if (!hasOnlyKeys(item, ["name", "slug", "status", "description", "successMessage", "submissionAccess", "fields"])) {
      return null;
    }
    const name = readRequiredTextField(item, "name");
    const slug = readRequiredTextField(item, "slug");
    const status = readCreateStatus(item, "status", ["draft", "published", "archived"] as const, "draft");
    const submissionAccess = readCreateStatus(item, "submissionAccess", ["public", "internal"] as const, "internal");
    const fields = readRecordArrayField(item, "fields", []);
    if (!name || !slug || status === null || submissionAccess === null || fields === null) return null;
    return {
      id: actionId("form.upsert", slugForActionId(slug, index)),
      type: "form.upsert",
      title: `Create ${name}`,
      description: "Create an explicitly provided form through the reviewed action flow.",
      input: {
        name,
        slug,
        status,
        description: readOptionalTextField(item, "description"),
        successMessage: readOptionalTextField(item, "successMessage"),
        submissionAccess,
        fields,
      },
    };
  }

  if (draft.resourceKind === "entry") {
    if (!hasOnlyKeys(item, ["contentTypeSlug", "title", "slug", "values"])) return null;
    const contentTypeSlug = readRequiredTextField(item, "contentTypeSlug");
    const title = readRequiredTextField(item, "title");
    const slug = readRequiredTextField(item, "slug");
    const values = readRecordField(item, "values", {});
    if (!contentTypeSlug || !title || !slug || values === null) return null;
    return {
      id: actionId("entry.upsert-draft", slugForActionId(`${contentTypeSlug}-${slug}`, index)),
      type: "entry.upsert-draft",
      title: `Create ${title}`,
      description: "Create an explicitly provided draft entry through the reviewed action flow.",
      input: { contentTypeSlug, title, slug, values },
    };
  }

  if (draft.resourceKind === "content-type") {
    if (!hasOnlyKeys(item, ["slug", "name", "schema"])) return null;
    const slug = readRequiredTextField(item, "slug");
    const name = readRequiredTextField(item, "name");
    const schema = readRecordField(item, "schema", {});
    if (!slug || !name || !schema) return null;
    return {
      id: actionId("content-type.upsert", slugForActionId(slug, index)),
      type: "content-type.upsert",
      title: `Create ${name}`,
      description: "Create an explicitly provided content type through the reviewed action flow.",
      input: { slug, name, schema },
    };
  }

  if (draft.resourceKind === "custom-screen") {
    if (!hasOnlyKeys(item, ["name", "contentTypeSlug", "status", "showInSidebar", "sidebarLabel", "blocks", "bindings"])) {
      return null;
    }
    const name = readRequiredTextField(item, "name");
    const contentTypeSlug = readRequiredTextField(item, "contentTypeSlug");
    const status = readCreateStatus(item, "status", ["draft", "active"] as const, "draft");
    const blocks = readRecordArrayField(item, "blocks", []);
    const bindings = readRecordArrayField(item, "bindings", []);
    if (!name || !contentTypeSlug || status === null || blocks === null || bindings === null) {
      return null;
    }
    return {
      id: actionId("custom-screen.upsert", slugForActionId(name, index)),
      type: "custom-screen.upsert",
      title: `Create ${name}`,
      description: "Create an explicitly provided custom screen through the reviewed action flow.",
      input: {
        name,
        contentTypeSlug,
        status,
        showInSidebar: readOptionalBooleanField(item, "showInSidebar", false),
        sidebarLabel: readOptionalTextField(item, "sidebarLabel"),
        blocks,
        bindings,
      },
    };
  }

  if (draft.resourceKind === "listing-query") {
    if (!hasOnlyKeys(item, ["name", "description", "contentTypeSlug", "fields", "includeDrafts", "limit", "sort"])) {
      return null;
    }
    const name = readRequiredTextField(item, "name");
    const contentTypeSlug = readRequiredTextField(item, "contentTypeSlug");
    const fields = readStringArrayField(item, "fields", []);
    const sort = readListingSort(item);
    if (!name || !contentTypeSlug || !fields || !sort) return null;
    return {
      id: actionId("listing-query.upsert", slugForActionId(name, index)),
      type: "listing-query.upsert",
      title: `Create ${name}`,
      description: "Create an explicitly provided listing query through the reviewed action flow.",
      input: {
        name,
        description: readOptionalTextField(item, "description"),
        contentTypeSlug,
        fields,
        includeDrafts: readOptionalBooleanField(item, "includeDrafts", false),
        limit: readOptionalNumberField(item, "limit", 12),
        sort,
      },
    };
  }

  if (draft.resourceKind === "listing-template") {
    if (!hasOnlyKeys(item, ["name", "slug", "description", "layout", "config"])) return null;
    const name = readRequiredTextField(item, "name");
    const slug = readRequiredTextField(item, "slug");
    const layout = readCreateStatus(item, "layout", ["grid", "list", "table", "calendar", "map"] as const, "grid");
    const config = readRecordField(item, "config", {});
    if (!name || !slug || layout === null || config === null) return null;
    return {
      id: actionId("listing-template.upsert", slugForActionId(slug, index)),
      type: "listing-template.upsert",
      title: `Create ${name}`,
      description: "Create an explicitly provided listing template through the reviewed action flow.",
      input: {
        name,
        slug,
        description: readOptionalTextField(item, "description"),
        layout,
        config,
      },
    };
  }

  if (draft.resourceKind === "menu-item") {
    if (!hasOnlyKeys(item, ["menuId", "label", "href", "parentId", "orderIndex", "settings"])) return null;
    const menuId = readRequiredTextField(item, "menuId");
    const label = readRequiredTextField(item, "label");
    const href = readRequiredTextField(item, "href");
    const settings = readRecordField(item, "settings", {});
    if (!menuId || !label || !href || settings === null) return null;
    return {
      id: actionId("menu.item.upsert", slugForActionId(`${menuId}-${label}`, index)),
      type: "menu.item.upsert",
      title: `Create ${label}`,
      description: "Create an explicitly provided menu item through the reviewed action flow.",
      input: {
        menuId,
        label,
        href,
        parentId: readOptionalTextField(item, "parentId"),
        orderIndex: readOptionalNumberField(item, "orderIndex", index),
        settings,
      },
    };
  }

  if (draft.resourceKind === "seo-document") {
    if (!hasOnlyKeys(item, ["targetType", "targetId", "seo"])) return null;
    const targetType = item.targetType;
    const targetId = readRequiredTextField(item, "targetId");
    const seo = readRecordField(item, "seo", {});
    if ((targetType !== "page" && targetType !== "entry") || !targetId || seo === null) return null;
    return {
      id: actionId("seo.document.upsert", slugForActionId(`${targetType}-${targetId}`, index)),
      type: "seo.document.upsert",
      title: `Create SEO for ${targetId}`,
      description: "Create an explicitly provided SEO document through the reviewed action flow.",
      input: {
        targetType,
        targetId,
        seo: {
          slug: readOptionalTextField(seo, "slug"),
          title: readOptionalTextField(seo, "title"),
          description: readOptionalTextField(seo, "description"),
          canonicalUrl: readOptionalTextField(seo, "canonicalUrl"),
          robots: readOptionalTextField(seo, "robots"),
        },
      },
    };
  }

  return null;
};

const buildCreateActionPlan = (input: {
  prompt: string;
  draft: CmsOperationDraft;
}): AssistantActionPlan | null => {
  const items = readCreateItems(input.draft);
  if (!items || items.length === 0) {
    return buildNeedsInputPlan(
      input.prompt,
      input.draft,
      "Create operations require explicit validated item definitions before a reviewed action plan can be built.",
      []
    );
  }
  if (
    input.draft.constraints?.expectedCount !== undefined &&
    input.draft.constraints.expectedCount !== items.length
  ) {
    return buildNeedsInputPlan(
      input.prompt,
      input.draft,
      `The create request provided ${items.length} item definition(s), but expected ${input.draft.constraints.expectedCount}.`,
      []
    );
  }
  const actions = items
    .map((item, index) => buildCreateActionForItem(input.draft, item, index))
    .filter((action): action is AssistantPlannedAction => Boolean(action));
  if (actions.length !== items.length) {
    return buildNeedsInputPlan(
      input.prompt,
      input.draft,
      "One or more create item definitions did not match the strict typed action contract.",
      []
    );
  }
  return {
    id: `plan-cms-${input.draft.resourceKind}-create-multi`,
    status: "ready",
    intentId: `cms-${input.draft.resourceKind}-create`,
    responseKind: "action_plan",
    promptKind: "setup_request",
    intentFamily: "unknown",
    title: `Create ${actions.length} ${input.draft.resourceKind} resources`,
    answer: "I can prepare these CMS create operations through the reviewed LLM Guide action flow.",
    summary: `Create ${actions.length} explicit ${input.draft.resourceKind} resources.`,
    confidence: 0.76,
    assumptions: [
      "Each create item was provided explicitly and validated locally.",
      "Dry-run must be reviewed before execution.",
    ],
    questions: [],
    actions,
  };
};

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
  if (input.draft.operation === "create") {
    return buildCreateActionPlan({ prompt: input.prompt, draft: input.draft });
  }
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
    (input.draft.operation === "delete" ||
      input.draft.operation === "archive" ||
      input.draft.operation === "update") &&
    input.draft.constraints?.expectedCount === resolution.candidates.length &&
    resolution.candidates.length > 1
  ) {
    const verb = operationVerb(input.draft.operation);
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
        title: `${verb} ${actions.length} ${input.draft.resourceKind} resources`,
        answer: "I can prepare these CMS operations through the reviewed LLM Guide action flow.",
        summary: `${verb} ${actions.length} resolved ${input.draft.resourceKind} resources.`,
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
