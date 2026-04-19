import type {
  AssistantActionContext,
  AssistantAdminContext,
} from "./actionPlanTypes";
import type { AssistantResourceCatalogSnapshot } from "./adminContextTypes";
import {
  type CmsOperationDraft,
  type CmsResourceKind,
  normalizeCmsOperationDraft,
} from "./cmsOperationDraftSchema";
import {
  findFieldPolicyByAliases,
  getResolverResourcePolicy,
  includesPrefixIntentWithPolicy,
  inferActiveResourceKindWithPolicy,
  inferFiltersFromPromptWithPolicy,
  inferOperationWithPolicy,
  inferRequestedCountWithPolicy,
  isSurfaceOnlyReadQueryWithPolicy,
  matchesCandidateWithPolicy,
  matchesFiltersWithPolicy,
  normalizeResolverText,
  resolveResourcePolicyEntryFromPromptWithPolicy,
  resolveFieldIntentWithPolicy,
  getResolverResourcePolicyForDraft,
} from "./operationPolicy/resolverPolicy";

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

const normalizeText = normalizeResolverText;

const extractQuotedValues = (prompt: string) =>
  [...prompt.matchAll(/['"“”]([^'"“”]+)['"“”]/g)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));

const extractNamedQuotedValue = (prompt: string, labels: string[]) => {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = prompt.match(new RegExp(`(?:^|[\\s,;])${escaped}\\s*[:=]?\\s*['"“”]([^'"“”]+)['"“”]`, "iu"));
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return null;
};

const cleanupWildcardPrefix = (value: string) =>
  value
    .replace(/(?:\s|^)[x*]{2,}$/i, "")
    .replace(/\s+\*+$/g, "")
    .trim();

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

  const operation = inferOperationWithPolicy(normalizedPrompt);
  const resourceEntry = resolveResourcePolicyEntryFromPromptWithPolicy(prompt);
  const resourceKind =
    (resourceEntry?.resource.kind as CmsResourceKind | undefined) ??
    inferActiveResourceKindWithPolicy(context);
  if (!operation || !resourceKind) return null;
  const resourcePolicy = resourceEntry?.resource ?? getResolverResourcePolicy(resourceKind);

  const quotedValues = extractQuotedValues(prompt);
  const firstQuoted = quotedValues[0];
  const activeContextMatches = inferActiveResourceKindWithPolicy(context) === resourceKind;
  const usesActiveTarget =
    /\b(this|current|active|ten|te|ta|tej)\b/.test(normalizedPrompt) ||
    (operation === "update" && activeContextMatches && quotedValues.length === 1);
  const targetValue = firstQuoted ? cleanupWildcardPrefix(firstQuoted) : undefined;
  const isPrefixQuery =
    includesPrefixIntentWithPolicy(normalizedPrompt) ||
    Boolean(firstQuoted && cleanupWildcardPrefix(firstQuoted) !== firstQuoted.trim());
  const slug = targetValue ? normalizeSlug(targetValue) : null;
  const secondQuoted = quotedValues[1];
  const mutationValue =
    secondQuoted ?? (operation === "update" && usesActiveTarget ? firstQuoted : undefined);
  const queryValue =
    operation === "update" && usesActiveTarget && !secondQuoted ? undefined : targetValue;

  if (operation === "create" && resourceKind === "page") {
    const title = extractNamedQuotedValue(
      prompt,
      findFieldPolicyByAliases(resourcePolicy, ["title", "tytul", "tytuł", "tytulem", "tytułem"])
    ) ?? firstQuoted;
    const pageSlug = extractNamedQuotedValue(
      prompt,
      findFieldPolicyByAliases(resourcePolicy, ["slug", "url", "sciezka", "ścieżka"])
    );
    const statusValue = extractNamedQuotedValue(
      prompt,
      findFieldPolicyByAliases(resourcePolicy, ["status"])
    );
    const introTitle = extractNamedQuotedValue(prompt, ["introTitle", "intro title", "naglowek", "nagłówek"]) ?? title;
    const introBody = extractNamedQuotedValue(prompt, ["introBody", "intro body", "opis", "tresc", "treść"]);
    if (title && pageSlug && introTitle && introBody) {
      return normalizeCmsOperationDraft({
        operation,
        resourceKind,
        mutation: {
          patch: {
            items: [
              {
                title,
                slug: normalizeSlug(pageSlug) ?? pageSlug,
                status:
                  statusValue === "published" || statusValue === "opublikowana" || statusValue === "opublikowane"
                    ? "published"
                    : "draft",
                introTitle,
                introBody,
              },
            ],
          },
        },
        constraints: {
          expectedCount: 1,
          destructive: false,
          requiresConfirmation: false,
        },
      });
    }
  }

  if (operation === "create" && resourceKind === "form") {
    const name = extractNamedQuotedValue(
      prompt,
      findFieldPolicyByAliases(resourcePolicy, ["name", "nazwa", "nazwie", "formularz"])
    ) ?? firstQuoted;
    const formSlug = extractNamedQuotedValue(
      prompt,
      findFieldPolicyByAliases(resourcePolicy, ["slug", "url"])
    );
    const statusValue = extractNamedQuotedValue(
      prompt,
      findFieldPolicyByAliases(resourcePolicy, ["status"])
    );
    const submissionAccessValue = extractNamedQuotedValue(prompt, [
      "submissionAccess",
      "submission access",
      "access",
      "dostep",
      "dostęp",
    ]);
    if (name && formSlug) {
      return normalizeCmsOperationDraft({
        operation,
        resourceKind,
        mutation: {
          patch: {
            items: [
              {
                name,
                slug: formSlug,
                status:
                  statusValue === "published" || statusValue === "opublikowany"
                    ? "published"
                    : statusValue === "archived" || statusValue === "zarchiwizowany"
                      ? "archived"
                      : "draft",
                submissionAccess:
                  submissionAccessValue === "public" || submissionAccessValue === "publiczny"
                    ? "public"
                    : "internal",
                fields: [],
              },
            ],
          },
        },
        constraints: {
          expectedCount: 1,
          destructive: false,
          requiresConfirmation: false,
        },
      });
    }
  }
  const inferredFilters = inferFiltersFromPromptWithPolicy(normalizedPrompt, resourcePolicy);
  const requestedCount = inferRequestedCountWithPolicy(normalizedPrompt);

  return normalizeCmsOperationDraft({
    operation,
    resourceKind,
    ...(resourceEntry ? { resourceKey: resourceEntry.key } : {}),
    ...(inferredFilters.length > 0 ? { filters: inferredFilters } : {}),
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
            fieldIntent: resolveFieldIntentWithPolicy(normalizedPrompt, resourcePolicy),
            value: mutationValue,
          },
        }
      : {}),
    constraints: {
      ...(requestedCount ? { expectedCount: requestedCount } : {}),
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

export const resolveCmsOperationTargets = (
  draft: CmsOperationDraft,
  context: AssistantAdminContext
): CmsTargetResolution => {
  const resourcePolicy = getResolverResourcePolicyForDraft(draft);
  if (!resourcePolicy || !resourcePolicy.operations.includes(draft.operation)) {
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
        reason: `No active ${resourcePolicy.label.toLowerCase()} context is available.`,
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
  const directMatches = allCandidates.filter((item) =>
    matchesCandidateWithPolicy(item, matchQuery, resourcePolicy)
  );
  const readOnlyPartialMatches =
    directMatches.length === 0 &&
    query.exactName &&
    (draft.operation === "inspect" || draft.operation === "find")
      ? allCandidates.filter((item) => {
          const target = normalizeText(query.exactName ?? "");
          return [item.label, item.slug ?? ""]
            .map(normalizeCandidateValue)
            .some((value) => value.includes(target));
        })
      : [];
  const matches =
    readOnlyPartialMatches.length > 0
      ? readOnlyPartialMatches
      : directMatches.length === 0 &&
    draft.constraints?.expectedCount !== undefined &&
    query.exactName &&
    (draft.operation === "delete" || draft.operation === "archive" || draft.operation === "update")
      ? allCandidates.filter((item) =>
          normalizeCandidateValue(item.label).includes(normalizeText(query.exactName ?? ""))
        )
      : directMatches;
  const hasFilters = (draft.filters ?? []).length > 0;
  const filteredMatches = matches.filter((item) =>
    matchesFiltersWithPolicy(item, draft.filters, resourcePolicy)
  );
  const filteredAllCandidates = allCandidates.filter((item) =>
    matchesFiltersWithPolicy(item, draft.filters, resourcePolicy)
  );
  const effectiveMatches = hasFilters ? filteredMatches : matches;
  if (
    matches.length === 0 &&
    isSurfaceOnlyReadQueryWithPolicy(draft, query, resourcePolicy) &&
    (draft.operation === "inspect" || draft.operation === "find") &&
    allCandidates.length > 0 &&
    (!hasFilters || filteredAllCandidates.length > 0)
  ) {
    const candidates = hasFilters ? filteredAllCandidates : allCandidates;
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
      reason: `No ${resourcePolicy.label.toLowerCase()} matched the requested target.`,
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
