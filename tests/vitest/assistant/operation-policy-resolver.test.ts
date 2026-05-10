import { expect, test } from "vitest";

import type { CmsResolvedTargetCandidate } from "../../../core/services/assistant/cmsTargetResolver";
import { buildCmsOperationDraftFromPrompt } from "../../../core/services/assistant/cmsTargetResolver";
import { normalizeCmsOperationDraft } from "../../../core/services/assistant/cmsOperationDraftSchema";
import {
  getResolverResourcePolicy,
  inferActiveResourceKindWithPolicy,
  inferFiltersFromPromptWithPolicy,
  inferOperationWithPolicy,
  inferRequestedCountWithPolicy,
  isSurfaceOnlyReadQueryWithPolicy,
  matchesCandidateWithPolicy,
  matchesFiltersWithPolicy,
  normalizeResolverText,
  resolveResourcePolicyEntryFromPromptWithPolicy,
  resolveResourceKindFromPromptWithPolicy,
} from "../../../core/services/assistant/operationPolicy/resolverPolicy";

test("resolver policy resolves resource operation and count aliases from operation policy", () => {
  expect(resolveResourceKindFromPromptWithPolicy("usun dwie strony")).toBe("page");
  expect(resolveResourceKindFromPromptWithPolicy("pokaż detail page Products")).toBe("detail-page");
  expect(resolveResourceKindFromPromptWithPolicy("pokaż API Keys")).toBe("settings-surface");
  expect(resolveResourcePolicyEntryFromPromptWithPolicy("pokaż API Keys")?.key).toBe(
    "settings-api-keys"
  );
  expect(
    resolveResourcePolicyEntryFromPromptWithPolicy("assistant settings provider key")?.key
  ).toBe("settings-assistant");
  expect(resolveResourcePolicyEntryFromPromptWithPolicy("security csrf settings")?.key).toBe(
    "settings-security"
  );
  expect(resolveResourcePolicyEntryFromPromptWithPolicy("webhook secret")?.key).toBe(
    "settings-webhooks"
  );
  expect(inferOperationWithPolicy(normalizeResolverText("usun dwie strony"))).toBe("delete");
  expect(inferOperationWithPolicy(normalizeResolverText("czy istnieje model Products"))).toBe(
    "inspect"
  );
  expect(inferRequestedCountWithPolicy(normalizeResolverText("usun dwie strony"))).toBe(2);
});

test("resolver policy infers active detail pages through the shared policy seam", () => {
  expect(
    inferActiveResourceKindWithPolicy({
      activeSurface: {
        kind: "detail-page",
        detailPage: {
          id: "detail-page-products",
          name: "Product Detail",
          status: "draft",
          contentTypeId: "ct-products",
          contentTypeSlug: "products",
          titlePattern: "{title}",
        },
        sampleEntryId: null,
        selectedBlockId: null,
        blocks: [],
        warnings: [],
      },
    })
  ).toBe("detail-page");
});

test("resolver policy infers filters from resource filter aliases", () => {
  const policy = getResolverResourcePolicy("custom-screen");
  const filters = inferFiltersFromPromptWithPolicy(
    normalizeResolverText("jakie opublikowane widoczne ekrany są w Screens"),
    policy
  );

  expect(filters).toEqual([
    { field: "status", operator: "eq", value: "active" },
    { field: "showInSidebar", operator: "eq", value: true },
  ]);
  expect(
    buildCmsOperationDraftFromPrompt("jakie opublikowane widoczne ekrany są w Screens")
  ).toMatchObject({
    operation: "inspect",
    resourceKind: "custom-screen",
    filters,
  });
});

test("resolver policy applies canonicalized filter values to candidates", () => {
  const policy = getResolverResourcePolicy("custom-screen");
  const visibleActive: CmsResolvedTargetCandidate = {
    kind: "custom-screen",
    id: "screen-1",
    label: "Screen",
    slug: null,
    status: "active",
    adminHref: "/admin/advanced/custom-screens/screen-1",
    details: { showInSidebar: true },
  };
  const hiddenDraft: CmsResolvedTargetCandidate = {
    ...visibleActive,
    id: "screen-2",
    status: "draft",
    details: { showInSidebar: false },
  };
  const filters = [
    { field: "status" as const, operator: "eq" as const, value: "published" },
    { field: "showInSidebar" as const, operator: "eq" as const, value: "widoczne" },
  ];

  expect(matchesFiltersWithPolicy(visibleActive, filters, policy)).toBe(true);
  expect(matchesFiltersWithPolicy(hiddenDraft, filters, policy)).toBe(false);
  expect(
    matchesFiltersWithPolicy(
      visibleActive,
      [{ field: "visibility", operator: "eq", value: "public" }],
      policy
    )
  ).toBe(false);
});

test("resolver policy handles text matching and surface-only read queries", () => {
  const policy = getResolverResourcePolicy("page");
  const candidate: CmsResolvedTargetCandidate = {
    kind: "page",
    id: "page-test",
    label: "test-page",
    slug: "/test-page",
    status: "published",
    adminHref: "/admin/pages/page-test",
  };

  expect(matchesCandidateWithPolicy(candidate, { text: "missing OR test-page" }, policy)).toBe(
    true
  );

  const surfaceDraft = normalizeCmsOperationDraft({
    operation: "find",
    resourceKind: "page",
    surfaceHint: "Pages",
    targetQuery: { text: "opublikowane strony w Pages" },
  });
  const realSearchDraft = normalizeCmsOperationDraft({
    operation: "find",
    resourceKind: "page",
    surfaceHint: "Pages",
    targetQuery: { text: "test-page OR test2" },
  });

  expect(isSurfaceOnlyReadQueryWithPolicy(surfaceDraft, surfaceDraft.targetQuery!, policy)).toBe(
    true
  );
  expect(
    isSurfaceOnlyReadQueryWithPolicy(realSearchDraft, realSearchDraft.targetQuery!, policy)
  ).toBe(false);
});
