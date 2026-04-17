import type {
  AssistantActionContext,
  AssistantAdminContext,
} from "./actionPlanTypes";
import type { AssistantResourceCatalogSnapshot } from "./adminContextTypes";
import {
  type CmsOperation,
  type CmsOperationDraft,
  type CmsResourceKind,
  normalizeCmsOperationDraft,
} from "./cmsOperationDraftSchema";
import {
  getCmsResourceRegistryEntry,
  resolveCmsResourceKindFromPrompt,
} from "./cmsResourceRegistry";

export type CmsResolvedTargetCandidate = {
  kind: CmsResourceKind;
  id: string;
  label: string;
  slug: string | null;
  status: string | null;
  adminHref: string | null;
  details?: Record<string, string | number | boolean | null>;
};

export type CmsTargetResolution =
  | {
      status: "unsupported";
      draft: CmsOperationDraft;
      candidates: [];
      reason: string;
    }
  | {
      status: "no_match";
      draft: CmsOperationDraft;
      candidates: [];
      reason: string;
    }
  | {
      status: "exact";
      draft: CmsOperationDraft;
      candidates: [CmsResolvedTargetCandidate];
      reason: string;
    }
  | {
      status: "candidates" | "ambiguous";
      draft: CmsOperationDraft;
      candidates: CmsResolvedTargetCandidate[];
      reason: string;
    };

const inspectSignals = [
  "czy widzisz",
  "widzisz",
  "jakie",
  "ktore",
  "które",
  "which",
  "find",
  "show",
  "list",
  "pokaż",
  "pokaz",
  "znajdz",
  "znajdź",
  "czy jest",
];

const deleteSignals = ["usun", "usuń", "usuw", "skasuj", "kasuj", "delete", "remove"];
const archiveSignals = ["archive", "archiwizuj", "zarchiwizuj"];
const publishSignals = ["publish", "opublikuj"];
const updateSignals = [
  "zmien",
  "zmień",
  "update",
  "rename",
  "ustaw",
  "set",
  "ukryj",
  "hide",
  "show",
  "pokaz",
  "pokaż",
];
const createSignals = ["stworz", "stwórz", "utworz", "utwórz", "create", "build", "set up"];
const prefixSignals = ["prefix", "prefixem", "prefiks", "prefiksem", "starts with", "zaczyna"];

const countWords = new Map<string, number>([
  ["jeden", 1],
  ["jedna", 1],
  ["one", 1],
  ["dwa", 2],
  ["dwie", 2],
  ["two", 2],
  ["trzy", 3],
  ["three", 3],
]);

const normalizeText = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const includesAny = (value: string, candidates: string[]) =>
  candidates.some((candidate) => value.includes(candidate));

const extractQuotedValues = (prompt: string) =>
  [...prompt.matchAll(/['"“”]([^'"“”]+)['"“”]/g)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));

const extractRequestedCount = (normalizedPrompt: string) => {
  const digitMatch = normalizedPrompt.match(/\b(\d{1,2})\b/);
  if (digitMatch?.[1]) return Number(digitMatch[1]);
  for (const [word, count] of countWords) {
    if (new RegExp(`(^|\\s)${word}(\\s|$)`).test(normalizedPrompt)) {
      return count;
    }
  }
  return undefined;
};

const cleanupWildcardPrefix = (value: string) =>
  value
    .replace(/(?:\s|^)[x*]{2,}$/i, "")
    .replace(/\s+\*+$/g, "")
    .trim();

const inferOperation = (normalizedPrompt: string): CmsOperation | null => {
  if (includesAny(normalizedPrompt, deleteSignals)) return "delete";
  if (includesAny(normalizedPrompt, archiveSignals)) return "archive";
  if (includesAny(normalizedPrompt, publishSignals)) return "publish";
  if (includesAny(normalizedPrompt, updateSignals)) return "update";
  if (includesAny(normalizedPrompt, createSignals)) return "create";
  if (includesAny(normalizedPrompt, inspectSignals)) return "inspect";
  return null;
};

const inferActiveResourceKind = (
  context?: AssistantActionContext | AssistantAdminContext
): CmsResourceKind | null => {
  const activeSurface = context?.activeSurface ?? null;
  if (activeSurface?.kind === "page") return "page";
  if (activeSurface?.kind === "custom-screen") return "custom-screen";
  if (activeSurface?.kind === "widget-template") return "widget-template";
  const selected = context?.runtimeSnapshot?.selectedResource;
  if (selected?.kind === "entry" || selected?.kind === "custom-screen-entry") return "entry";
  if (selected?.kind === "form") return "form";
  if (selected?.kind === "listing-query") return "listing-query";
  if (selected?.kind === "listing-template") return "listing-template";
  if (selected?.kind === "content-type") return "content-type";
  if (selected?.kind === "menu-item") return "menu-item";
  if (selected?.kind === "seo-document") return "seo-document";
  return null;
};

const normalizeSlug = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("/") ? trimmed : null;
};

export const buildCmsOperationDraftFromPrompt = (
  prompt: string,
  context?: AssistantActionContext | AssistantAdminContext
): CmsOperationDraft | null => {
  const normalizedPrompt = normalizeText(prompt);
  if (!normalizedPrompt) return null;

  const operation = inferOperation(normalizedPrompt);
  const resourceKind =
    resolveCmsResourceKindFromPrompt(prompt) ?? inferActiveResourceKind(context);
  if (!operation || !resourceKind) return null;

  const quotedValues = extractQuotedValues(prompt);
  const firstQuoted = quotedValues[0];
  const activeContextMatches = inferActiveResourceKind(context) === resourceKind;
  const usesActiveTarget =
    /\b(this|current|active|ten|te|ta|tej)\b/.test(normalizedPrompt) ||
    (operation === "update" && activeContextMatches && quotedValues.length === 1);
  const targetValue = firstQuoted ? cleanupWildcardPrefix(firstQuoted) : undefined;
  const isPrefixQuery =
    includesAny(normalizedPrompt, prefixSignals) ||
    Boolean(firstQuoted && cleanupWildcardPrefix(firstQuoted) !== firstQuoted.trim());
  const slug = targetValue ? normalizeSlug(targetValue) : null;
  const secondQuoted = quotedValues[1];
  const mutationValue =
    secondQuoted ?? (operation === "update" && usesActiveTarget ? firstQuoted : undefined);
  const queryValue =
    operation === "update" && usesActiveTarget && !secondQuoted ? undefined : targetValue;

  return normalizeCmsOperationDraft({
    operation,
    resourceKind,
    targetQuery: {
      ...(queryValue && isPrefixQuery ? { prefix: queryValue } : {}),
      ...(queryValue && !isPrefixQuery && !slug ? { exactName: queryValue } : {}),
      ...(queryValue && slug ? { slug } : {}),
      ...(queryValue ? { text: queryValue } : {}),
      ...(!queryValue && usesActiveTarget ? { active: true } : {}),
    },
    ...(operation === "update" && mutationValue
      ? {
          mutation: {
            fieldIntent: includesAny(normalizedPrompt, ["slug", "url"])
              ? "slug"
              : includesAny(normalizedPrompt, ["status"])
                ? "status"
                : includesAny(normalizedPrompt, ["title", "tytul", "tytuł", "nazwa", "nazwe", "nazwę"])
                  ? "title"
                  : "title",
            value: mutationValue,
          },
        }
      : {}),
    constraints: {
      ...(extractRequestedCount(normalizedPrompt)
        ? { expectedCount: extractRequestedCount(normalizedPrompt) }
        : {}),
      destructive: operation === "delete" || operation === "archive",
      requiresConfirmation: operation === "delete" || operation === "archive",
    },
  });
};

const pageHref = (id: string) => `/admin/pages/${encodeURIComponent(id)}`;
const customScreenHref = (id: string) => `/admin/coderso/custom-screens/${encodeURIComponent(id)}`;
const formHref = (id: string) => `/admin/coderso/forms/${encodeURIComponent(id)}`;
const listingHref = (id: string) => `/admin/coderso/listings/${encodeURIComponent(id)}`;
const widgetTemplateHref = (id: string) =>
  `/admin/coderso/widgets/templates/${encodeURIComponent(id)}`;

const candidate = (input: CmsResolvedTargetCandidate): CmsResolvedTargetCandidate => input;

const candidatesForKind = (
  kind: CmsResourceKind,
  catalog: AssistantResourceCatalogSnapshot | null,
  context: AssistantAdminContext
): CmsResolvedTargetCandidate[] => {
  const result: CmsResolvedTargetCandidate[] = [];
  if (kind === "page") {
    for (const page of catalog?.pages ?? []) {
      result.push(candidate({
        kind,
        id: page.id,
        label: page.title,
        slug: page.slug,
        status: page.status,
        adminHref: pageHref(page.id),
      }));
    }
    if (context.activeSurface?.kind === "page") {
      const page = context.activeSurface.page;
      if (!result.some((item) => item.id === page.id)) {
        result.push(candidate({
          kind,
          id: page.id,
          label: page.title,
          slug: page.slug,
          status: page.status,
          adminHref: pageHref(page.id),
        }));
      }
    }
  }
  if (kind === "custom-screen") {
    for (const screen of catalog?.customScreens ?? []) {
      result.push(candidate({
        kind,
        id: screen.id,
        label: screen.name,
        slug: null,
        status: screen.status,
        adminHref: customScreenHref(screen.id),
        details: {
          contentTypeId: screen.contentTypeId,
          showInSidebar: screen.showInSidebar,
          sidebarLabel: screen.sidebarLabel,
        },
      }));
    }
    if (context.activeSurface?.kind === "custom-screen") {
      const screen = context.activeSurface.screen;
      if (!result.some((item) => item.id === screen.id)) {
        result.push(candidate({
          kind,
          id: screen.id,
          label: screen.name,
          slug: null,
          status: screen.status,
          adminHref: customScreenHref(screen.id),
          details: {
            contentTypeId: screen.contentTypeId,
            showInSidebar: screen.showInSidebar,
            sidebarLabel: screen.sidebarLabel,
          },
        }));
      }
    }
  }
  if (kind === "content-type") {
    for (const contentType of catalog?.contentTypes ?? []) {
      result.push(candidate({
        kind,
        id: contentType.id,
        label: contentType.name,
        slug: contentType.slug,
        status: null,
        adminHref: `/admin/coderso/engine/${encodeURIComponent(contentType.id)}`,
        details: {
          entryCount: contentType.entryCount,
        },
      }));
    }
  }
  if (kind === "form") {
    for (const form of catalog?.forms ?? []) {
      result.push(candidate({
        kind,
        id: form.id,
        label: form.name,
        slug: form.slug,
        status: form.status,
        adminHref: formHref(form.id),
        details: {
          submissionAccess: form.submissionAccess,
        },
      }));
    }
  }
  if (kind === "listing-query") {
    for (const query of catalog?.listings.queries ?? []) {
      result.push(candidate({
        kind,
        id: query.id,
        label: query.name,
        slug: null,
        status: null,
        adminHref: listingHref(query.id),
        details: {
          source: query.source,
          limit: query.limit,
          includeDrafts: query.includeDrafts,
        },
      }));
    }
  }
  if (kind === "listing-template") {
    for (const template of catalog?.listings.templates ?? []) {
      result.push(candidate({
        kind,
        id: template.id,
        label: template.name,
        slug: template.slug,
        status: template.layout,
        adminHref: "/admin/coderso/listings",
        details: {
          layout: template.layout,
        },
      }));
    }
  }
  if (kind === "widget-template") {
    for (const widget of (catalog?.widgets ?? []).filter((item) => item.source === "template")) {
      result.push(candidate({
        kind,
        id: widget.id,
        label: widget.name,
        slug: null,
        status: widget.status,
        adminHref: widgetTemplateHref(widget.id),
        details: {
          category: widget.category,
        },
      }));
    }
    if (context.activeSurface?.kind === "widget-template") {
      const template = context.activeSurface.template;
      if (!result.some((item) => item.id === template.id)) {
        result.push(candidate({
          kind,
          id: template.id,
          label: template.name,
          slug: null,
          status: template.status,
          adminHref: widgetTemplateHref(template.id),
          details: {
            category: template.category,
          },
        }));
      }
    }
  }
  if (kind === "menu-item") {
    for (const menu of catalog?.menus ?? []) {
      for (const item of menu.items) {
        result.push(candidate({
          kind,
          id: item.id,
          label: item.label,
          slug: item.href,
          status: menu.name,
          adminHref: "/admin/menus",
          details: {
            menuId: menu.id,
            href: item.href,
            parentId: item.parentId,
          },
        }));
      }
    }
  }
  if (kind === "seo-document") {
    for (const doc of catalog?.seoDocuments ?? []) {
      result.push(candidate({
        kind,
        id: doc.id,
        label: doc.targetTitle ?? doc.title ?? doc.slug ?? doc.targetId,
        slug: doc.slug,
        status: doc.status,
        adminHref: "/admin/seo",
        details: {
          targetType: doc.targetType,
          targetId: doc.targetId,
          title: doc.title,
        },
      }));
    }
  }
  return result.sort((left, right) => left.label.localeCompare(right.label));
};

const activeCandidateForKind = (
  kind: CmsResourceKind,
  context: AssistantAdminContext
): CmsResolvedTargetCandidate | null => {
  if (kind === "page" && context.activeSurface?.kind === "page") {
    const page = context.activeSurface.page;
    return {
      kind,
      id: page.id,
      label: page.title,
      slug: page.slug,
      status: page.status,
      adminHref: pageHref(page.id),
    };
  }
  if (kind === "custom-screen" && context.activeSurface?.kind === "custom-screen") {
    const screen = context.activeSurface.screen;
    return {
      kind,
      id: screen.id,
      label: screen.name,
      slug: null,
      status: screen.status,
      adminHref: customScreenHref(screen.id),
      details: {
        contentTypeId: screen.contentTypeId,
        showInSidebar: screen.showInSidebar,
        sidebarLabel: screen.sidebarLabel,
      },
    };
  }
  if (kind === "widget-template" && context.activeSurface?.kind === "widget-template") {
    const template = context.activeSurface.template;
    return {
      kind,
      id: template.id,
      label: template.name,
      slug: null,
      status: template.status,
      adminHref: widgetTemplateHref(template.id),
      details: {
        category: template.category,
      },
    };
  }
  return null;
};

const normalizeCandidateValue = (value: string | null) => (value ? normalizeText(value) : "");

const matchesCandidate = (
  candidate: CmsResolvedTargetCandidate,
  query: NonNullable<CmsOperationDraft["targetQuery"]>
) => {
  const candidates = [
    candidate.id,
    candidate.label,
    candidate.slug ?? "",
  ].map(normalizeCandidateValue);
  if (query.slug) return normalizeCandidateValue(candidate.slug) === normalizeText(query.slug);
  if (query.exactName) {
    const target = normalizeText(query.exactName);
    return candidates.includes(target);
  }
  if (query.prefix) {
    const target = normalizeText(query.prefix);
    return candidates.some((value) => value.startsWith(target));
  }
  if (query.text) {
    const target = normalizeText(query.text);
    return candidates.some((value) => value.includes(target));
  }
  return true;
};

const normalizeFilterValue = (value: string | boolean | string[]) =>
  Array.isArray(value)
    ? value.map((item) => normalizeText(item))
    : typeof value === "string"
      ? normalizeText(value)
      : value;

const includesFilterValue = (
  filterValue: string | boolean | string[],
  expected: string | boolean
) => {
  const normalized = normalizeFilterValue(filterValue);
  if (Array.isArray(normalized)) {
    return normalized.includes(typeof expected === "string" ? normalizeText(expected) : String(expected));
  }
  if (typeof normalized === "string" && typeof expected === "string") {
    return normalized === normalizeText(expected);
  }
  return normalized === expected;
};

const matchesFilter = (candidate: CmsResolvedTargetCandidate, draft: CmsOperationDraft) => {
  const filters = draft.filters ?? [];
  if (filters.length === 0) return true;
  for (const filter of filters) {
    if (draft.resourceKind === "custom-screen") {
      if (filter.field === "status") {
        const expectsActive =
          includesFilterValue(filter.value, "active") ||
          includesFilterValue(filter.value, "published") ||
          includesFilterValue(filter.value, "opublikowane");
        if (expectsActive && candidate.status !== "active") return false;
        continue;
      }
      if (filter.field === "showInSidebar" || filter.field === "visibility") {
        const expectsVisible =
          includesFilterValue(filter.value, true) ||
          includesFilterValue(filter.value, "true") ||
          includesFilterValue(filter.value, "visible") ||
          includesFilterValue(filter.value, "widoczne");
        if (expectsVisible && candidate.details?.showInSidebar !== true) return false;
        continue;
      }
    }
    if (draft.resourceKind === "page" && filter.field === "status") {
      if (
        (includesFilterValue(filter.value, "published") ||
          includesFilterValue(filter.value, "opublikowana")) &&
        candidate.status !== "published"
      ) {
        return false;
      }
      continue;
    }
    return false;
  }
  return true;
};

const isSurfaceOnlyReadQuery = (
  draft: CmsOperationDraft,
  query: NonNullable<CmsOperationDraft["targetQuery"]>
) =>
  (draft.operation === "inspect" || draft.operation === "find") &&
  Boolean(draft.surfaceHint) &&
  Boolean(query.text) &&
  !query.exactName &&
  !query.prefix &&
  !query.slug &&
  !query.active;

export const resolveCmsOperationTargets = (
  draft: CmsOperationDraft,
  context: AssistantAdminContext
): CmsTargetResolution => {
  const entry = getCmsResourceRegistryEntry(draft.resourceKind);
  if (!entry || !entry.supportedOperations.includes(draft.operation)) {
    return {
      status: "unsupported",
      draft,
      candidates: [],
      reason: `Resource "${draft.resourceKind}" does not support "${draft.operation}".`,
    };
  }
  const query = draft.targetQuery ?? {};
  const activeCandidate = query.active ? activeCandidateForKind(draft.resourceKind, context) : null;
  if (query.active && !activeCandidate) {
    if (draft.operation !== "inspect" && draft.operation !== "find") {
      return {
        status: "no_match",
        draft,
        candidates: [],
        reason: `No active ${entry.label.toLowerCase()} context is available.`,
      };
    }
  }
  const allCandidates = activeCandidate
    ? [activeCandidate]
    : candidatesForKind(draft.resourceKind, context.resourceCatalog, context);
  const matchQuery =
    query.active && !activeCandidate && (draft.operation === "inspect" || draft.operation === "find")
      ? { ...query, active: undefined }
      : query;
  const matches = allCandidates.filter((item) => matchesCandidate(item, matchQuery));
  const filteredMatches = matches.filter((item) => matchesFilter(item, draft));
  const filteredAllCandidates = allCandidates.filter((item) => matchesFilter(item, draft));
  const effectiveMatches = filteredMatches.length > 0 ? filteredMatches : matches;
  if (
    (matches.length === 0 || isSurfaceOnlyReadQuery(draft, query)) &&
    (draft.operation === "inspect" || draft.operation === "find") &&
    allCandidates.length > 0
  ) {
    const candidates = filteredAllCandidates.length > 0 ? filteredAllCandidates : allCandidates;
    return {
      status: "candidates",
      draft,
      candidates,
      reason: "No exact text match; returning visible candidates for read-only inspection.",
    };
  }
  if (effectiveMatches.length === 0) {
    return {
      status: "no_match",
      draft,
      candidates: [],
      reason: `No ${entry.label.toLowerCase()} matched the requested target.`,
    };
  }
  const expectedCount = draft.constraints?.expectedCount;
  if (expectedCount !== undefined && effectiveMatches.length !== expectedCount) {
    return {
      status: "ambiguous",
      draft,
      candidates: effectiveMatches,
      reason: `Matched ${effectiveMatches.length} candidate(s), but the request expected ${expectedCount}.`,
    };
  }
  if (effectiveMatches.length === 1) {
    return {
      status: "exact",
      draft,
      candidates: [effectiveMatches[0]!],
      reason: "Resolved one exact candidate.",
    };
  }
  return {
    status: draft.operation === "inspect" || draft.operation === "find" ? "candidates" : "ambiguous",
    draft,
    candidates: effectiveMatches,
    reason: `Matched ${effectiveMatches.length} candidates.`,
  };
};
