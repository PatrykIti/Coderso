import type {
  AssistantActionContext,
  AssistantActiveSurfaceContext,
  AssistantAdminContext,
} from "./actionPlanTypes";
import { buildAssistantAdminContext } from "./adminContextService";
import {
  buildCmsOperationDraftFromPrompt,
  type CmsResolvedTargetCandidate,
  resolveCmsOperationTargets,
} from "./cmsTargetResolver";
import type { CmsOperation, CmsOperationDraft, CmsResourceKind } from "./cmsOperationDraftSchema";
import { redactAssistantUnsafeText } from "./assistantRedaction";

export type AssistantSiteBuilderFollowUpRefinementKind =
  | "static-page"
  | "content-engine"
  | "entry"
  | "listing"
  | "detail-page"
  | "custom-screen"
  | "unsupported";

export type AssistantSiteBuilderFollowUpCandidate = {
  kind: CmsResourceKind;
  id: string;
  label: string;
  slug: string | null;
  status: string | null;
  adminHref: string | null;
  source: "active-context" | "server-catalog";
  refinementKind: AssistantSiteBuilderFollowUpRefinementKind;
  details: Record<string, string | number | boolean | null>;
};

export type AssistantSiteBuilderFollowUpRequest = {
  operation: CmsOperation;
  resourceKind: CmsResourceKind;
  resourceKey: string | null;
  mutationFieldIntent: string | null;
  destructive: boolean;
  requiresConfirmation: boolean;
};

export type AssistantSiteBuilderFollowUpResolution =
  | {
      status: "resolved";
      schemaVersion: 1;
      request: AssistantSiteBuilderFollowUpRequest;
      target: AssistantSiteBuilderFollowUpCandidate;
      candidates: [AssistantSiteBuilderFollowUpCandidate];
      question: null;
      gate: null;
    }
  | {
      status: "needs_input";
      schemaVersion: 1;
      request: AssistantSiteBuilderFollowUpRequest | null;
      target: null;
      candidates: AssistantSiteBuilderFollowUpCandidate[];
      question: {
        code: "target_required" | "target_ambiguous";
        message: string;
      };
      gate: null;
    }
  | {
      status: "gated";
      schemaVersion: 1;
      request: AssistantSiteBuilderFollowUpRequest;
      target: AssistantSiteBuilderFollowUpCandidate | null;
      candidates: AssistantSiteBuilderFollowUpCandidate[];
      question: null;
      gate: {
        code: "target_family_unsupported" | "operation_unsupported";
        message: string;
      };
    };

export type AssistantSiteBuilderFollowUpResolverInput = {
  prompt: string;
  context?: AssistantActionContext | AssistantAdminContext | null;
  draft?: CmsOperationDraft | null;
};

const secretLikePattern =
  /(token|secret|password|api[-_]?key|credential|cookie|session|csrf|signature|signed|jwt)/i;
const activeReferencePattern =
  /\b(this|current|active|aktywny|aktywna|aktywne|aktywną|aktywnym|obecny|obecna|bieżący|bieżąca|ten|te|ta|tej)\b/u;

const isAssistantAdminContext = (
  value: AssistantActionContext | AssistantAdminContext | null | undefined
): value is AssistantAdminContext =>
  Boolean(
    value &&
    typeof value === "object" &&
    "route" in value &&
    "area" in value &&
    "advancedModule" in value
  );

const toAdminContext = (
  context: AssistantActionContext | AssistantAdminContext | null | undefined
): AssistantAdminContext =>
  isAssistantAdminContext(context) ? context : buildAssistantAdminContext(context ?? {});

const sanitizeText = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  return redactAssistantUnsafeText(value);
};

const sanitizeDetails = (
  details: CmsResolvedTargetCandidate["details"] | undefined
): Record<string, string | number | boolean | null> => {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(details ?? {})) {
    if (secretLikePattern.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") {
      sanitized[key] = sanitizeText(value, "[REDACTED]");
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
};

const sameActiveSurface = (
  candidate: Pick<CmsResolvedTargetCandidate, "kind" | "id">,
  activeSurface: AssistantActiveSurfaceContext | null
) => {
  if (!activeSurface) return false;
  if (candidate.kind === "page" && activeSurface.kind === "page") {
    return candidate.id === activeSurface.page.id;
  }
  if (candidate.kind === "custom-screen" && activeSurface.kind === "custom-screen") {
    return candidate.id === activeSurface.screen.id;
  }
  if (candidate.kind === "detail-page" && activeSurface.kind === "detail-page") {
    return candidate.id === activeSurface.detailPage.id;
  }
  if (candidate.kind === "widget-template" && activeSurface.kind === "widget-template") {
    return candidate.id === activeSurface.template.id;
  }
  return false;
};

const classifyRefinementKind = (
  candidate: Pick<CmsResolvedTargetCandidate, "kind" | "details">
): AssistantSiteBuilderFollowUpRefinementKind => {
  if (candidate.kind === "page") {
    return candidate.details?.collectionContentTypeId ? "content-engine" : "static-page";
  }
  if (candidate.kind === "content-type" || candidate.kind === "post") return "content-engine";
  if (candidate.kind === "entry") return "entry";
  if (candidate.kind === "listing-query" || candidate.kind === "listing-template") {
    return "listing";
  }
  if (candidate.kind === "detail-page") return "detail-page";
  if (candidate.kind === "custom-screen") return "custom-screen";
  return "unsupported";
};

const toFollowUpCandidate = (
  candidate: CmsResolvedTargetCandidate,
  context: AssistantAdminContext
): AssistantSiteBuilderFollowUpCandidate => ({
  kind: candidate.kind,
  id: sanitizeText(candidate.id, "[REDACTED]"),
  label: sanitizeText(candidate.label, "[REDACTED]"),
  slug: candidate.slug ? sanitizeText(candidate.slug, "[REDACTED]") : null,
  status: candidate.status ? sanitizeText(candidate.status, "[REDACTED]") : null,
  adminHref: candidate.adminHref ? sanitizeText(candidate.adminHref, "[REDACTED]") : null,
  source: sameActiveSurface(candidate, context.activeSurface) ? "active-context" : "server-catalog",
  refinementKind: classifyRefinementKind(candidate),
  details: sanitizeDetails(candidate.details),
});

const requestFromDraft = (draft: CmsOperationDraft): AssistantSiteBuilderFollowUpRequest => ({
  operation: draft.operation,
  resourceKind: draft.resourceKind,
  resourceKey: draft.resourceKey ?? null,
  mutationFieldIntent: draft.mutation?.fieldIntent ?? null,
  destructive:
    draft.constraints?.destructive === true ||
    draft.operation === "delete" ||
    draft.operation === "archive",
  requiresConfirmation:
    draft.constraints?.requiresConfirmation === true ||
    draft.operation === "delete" ||
    draft.operation === "archive",
});

const isSupportedFollowUpResourceKind = (kind: CmsResourceKind) =>
  classifyRefinementKind({ kind, details: undefined }) !== "unsupported";

const usesExplicitActiveReference = (prompt: string) =>
  activeReferencePattern.test(prompt.toLowerCase());

const usesNamedTargetQuery = (draft: CmsOperationDraft) =>
  Boolean(
    draft.targetQuery?.exactName ||
    draft.targetQuery?.prefix ||
    draft.targetQuery?.slug ||
    draft.targetQuery?.text
  );

const activeCandidateFromContext = (
  context: AssistantAdminContext
): AssistantSiteBuilderFollowUpCandidate | null => {
  const activeSurface = context.activeSurface;
  if (!activeSurface) return null;
  if (activeSurface.kind === "page") {
    return toFollowUpCandidate(
      {
        kind: "page",
        id: activeSurface.page.id,
        label: activeSurface.page.title,
        slug: activeSurface.page.slug,
        status: activeSurface.page.status,
        adminHref: `/admin/pages/${encodeURIComponent(activeSurface.page.id)}`,
      },
      context
    );
  }
  if (activeSurface.kind === "custom-screen") {
    return toFollowUpCandidate(
      {
        kind: "custom-screen",
        id: activeSurface.screen.id,
        label: activeSurface.screen.name,
        slug: null,
        status: activeSurface.screen.status,
        adminHref: `/admin/advanced/custom-screens/${encodeURIComponent(activeSurface.screen.id)}`,
        details: {
          contentTypeId: activeSurface.screen.contentTypeId,
          showInSidebar: activeSurface.screen.showInSidebar,
          sidebarLabel: activeSurface.screen.sidebarLabel,
        },
      },
      context
    );
  }
  if (activeSurface.kind === "detail-page") {
    return toFollowUpCandidate(
      {
        kind: "detail-page",
        id: activeSurface.detailPage.id,
        label: activeSurface.detailPage.name,
        slug: activeSurface.detailPage.contentTypeSlug,
        status: activeSurface.detailPage.status,
        adminHref: `/admin/advanced/engine/${encodeURIComponent(activeSurface.detailPage.contentTypeId)}/collection/detail-template/${encodeURIComponent(activeSurface.detailPage.id)}`,
        details: {
          contentTypeId: activeSurface.detailPage.contentTypeId,
          contentTypeSlug: activeSurface.detailPage.contentTypeSlug,
          linkedRouteType: activeSurface.detailPage.contentTypeSlug,
        },
      },
      context
    );
  }
  return null;
};

export const resolveSiteBuilderFollowUpTarget = (
  input: AssistantSiteBuilderFollowUpResolverInput
): AssistantSiteBuilderFollowUpResolution => {
  const context = toAdminContext(input.context);
  const draft = input.draft ?? buildCmsOperationDraftFromPrompt(input.prompt, context);
  if (!draft) {
    const activeCandidate = activeCandidateFromContext(context);
    return {
      status: "needs_input",
      schemaVersion: 1,
      request: null,
      target: null,
      candidates: activeCandidate ? [activeCandidate] : [],
      question: {
        code: "target_required",
        message:
          "Choose an existing admin resource before planning a site-builder follow-up change.",
      },
      gate: null,
    };
  }

  const request = requestFromDraft(draft);
  if (!isSupportedFollowUpResourceKind(draft.resourceKind)) {
    return {
      status: "gated",
      schemaVersion: 1,
      request,
      target: null,
      candidates: [],
      question: null,
      gate: {
        code: "target_family_unsupported",
        message: "This resource family is not supported by guided site-builder follow-ups.",
      },
    };
  }
  if (
    draft.targetQuery?.active === true &&
    (usesNamedTargetQuery(draft) || Boolean(context.resourceCatalog)) &&
    !usesExplicitActiveReference(input.prompt)
  ) {
    const fallbackResolution = resolveCmsOperationTargets(
      { ...draft, targetQuery: undefined },
      context
    );
    const fallbackCandidates =
      fallbackResolution.candidates.length > 0
        ? fallbackResolution.candidates.map((candidate) => toFollowUpCandidate(candidate, context))
        : [];
    return {
      status: "needs_input",
      schemaVersion: 1,
      request,
      target: null,
      candidates: fallbackCandidates,
      question: {
        code: "target_required",
        message:
          "Choose one exact server-derived resource when a follow-up prompt names a target instead of explicitly referring to the active surface.",
      },
      gate: null,
    };
  }

  const resolution = resolveCmsOperationTargets(draft, context);
  const candidates = resolution.candidates.map((candidate) =>
    toFollowUpCandidate(candidate, context)
  );

  if (resolution.status === "unsupported") {
    return {
      status: "gated",
      schemaVersion: 1,
      request,
      target: null,
      candidates: [],
      question: null,
      gate: {
        code: "operation_unsupported",
        message: "The requested operation is not supported for this resource family.",
      },
    };
  }
  if (resolution.status === "no_match") {
    return {
      status: "needs_input",
      schemaVersion: 1,
      request,
      target: null,
      candidates: [],
      question: {
        code: "target_required",
        message:
          "No trusted active resource or server-catalog candidate matched the follow-up target.",
      },
      gate: null,
    };
  }
  if (resolution.status !== "exact") {
    return {
      status: "needs_input",
      schemaVersion: 1,
      request,
      target: null,
      candidates,
      question: {
        code: "target_ambiguous",
        message: "Choose one exact server-derived resource before planning the follow-up change.",
      },
      gate: null,
    };
  }

  const target = candidates[0];
  if (!target || target.refinementKind === "unsupported") {
    return {
      status: "gated",
      schemaVersion: 1,
      request,
      target: target ?? null,
      candidates,
      question: null,
      gate: {
        code: "target_family_unsupported",
        message: "This resource family is not supported by guided site-builder follow-ups.",
      },
    };
  }

  return {
    status: "resolved",
    schemaVersion: 1,
    request,
    target,
    candidates: [target],
    question: null,
    gate: null,
  };
};
