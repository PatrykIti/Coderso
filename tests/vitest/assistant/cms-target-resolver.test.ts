import { expect, test } from "vitest";

import { buildAssistantAdminContext } from "../../../core/services/assistant/adminContextService";
import {
  buildCmsOperationDraftFromPrompt,
  resolveCmsOperationTargets,
} from "../../../core/services/assistant/cmsTargetResolver";
import { normalizeCmsOperationDraft } from "../../../core/services/assistant/cmsOperationDraftSchema";

const context = buildAssistantAdminContext({
  page: "/admin/pages",
  locale: "pl-PL",
  resourceCatalog: {
    schemaVersion: 1,
    generatedAt: "2026-04-16T10:00:00.000Z",
    budget: {
      maxItemsPerGroup: 50,
      maxFieldsPerResource: 24,
      truncated: false,
    },
    pages: [
      {
        id: "page-pysiek",
        title: "Pysiek Mysiek",
        slug: "/pysiek-mysiek",
        status: "draft",
      },
      {
        id: "page-contact",
        title: "Contact",
        slug: "/contact",
        status: "published",
      },
      {
        id: "page-catalog-1",
        title: "Katalog Projektów Domów 33151341",
        slug: "/projekty-domow-33151341",
        status: "published",
      },
      {
        id: "page-catalog-2",
        title: "Katalog Projektów Domów a3afbe30",
        slug: "/projekty-domow-a3afbe30",
        status: "published",
      },
    ],
    contentTypes: [],
    customScreens: [
      {
        id: "screen-house",
        name: "House Projects",
        contentTypeId: "ct-house",
        status: "active",
        showInSidebar: true,
        sidebarLabel: "House Projects",
        writableBindingFields: [],
        bindings: [],
      },
      {
        id: "screen-house-archive",
        name: "House Projects Archive",
        contentTypeId: "ct-house",
        status: "draft",
        showInSidebar: false,
        sidebarLabel: null,
        writableBindingFields: [],
        bindings: [],
      },
    ],
    listings: { queries: [], templates: [] },
    forms: [
      {
        id: "form-lead",
        name: "Lead Form",
        slug: "lead-form",
        status: "published",
        submissionAccess: "public",
        fields: [],
      },
      {
        id: "form-internal",
        name: "Internal Form",
        slug: "internal-form",
        status: "draft",
        submissionAccess: "internal",
        fields: [],
      },
    ],
    menus: [],
    seoDocuments: [],
    widgets: [],
    warnings: [],
  },
});

test("buildCmsOperationDraftFromPrompt extracts operation, resource, and target", () => {
  expect(
    buildCmsOperationDraftFromPrompt("czy widzisz strone 'Pysiek Mysiek' w pages")
  ).toMatchObject({
    operation: "inspect",
    resourceKind: "page",
    targetQuery: {
      exactName: "Pysiek Mysiek",
    },
  });

  expect(
    buildCmsOperationDraftFromPrompt("jakie ekrany widzisz z prefixem 'House Projects'")
  ).toMatchObject({
    operation: "inspect",
    resourceKind: "custom-screen",
    targetQuery: {
      prefix: "House Projects",
    },
  });
});

test("resolveCmsOperationTargets resolves exact and prefix candidates", () => {
  const pageDraft = buildCmsOperationDraftFromPrompt(
    "czy widzisz strone 'Pysiek Mysiek' w pages"
  );
  if (!pageDraft) throw new Error("missing_page_draft");
  expect(resolveCmsOperationTargets(pageDraft, context)).toMatchObject({
    status: "exact",
    candidates: [
      {
        id: "page-pysiek",
        label: "Pysiek Mysiek",
        slug: "/pysiek-mysiek",
      },
    ],
  });

  const screenDraft = buildCmsOperationDraftFromPrompt(
    "jakie ekrany widzisz z prefixem 'House Projects'"
  );
  if (!screenDraft) throw new Error("missing_screen_draft");
  const resolution = resolveCmsOperationTargets(screenDraft, context);
  expect(resolution.status).toBe("candidates");
  expect(resolution.candidates.map((candidate) => candidate.label)).toEqual([
    "House Projects",
    "House Projects Archive",
  ]);
});

test("resolveCmsOperationTargets falls back to visible candidates for vague read-only text", () => {
  const draft = normalizeCmsOperationDraft({
    operation: "find",
    resourceKind: "custom-screen",
    targetQuery: {
      text: "widoczne w sekcji Screens",
    },
  });
  const resolution = resolveCmsOperationTargets(
    draft,
    context
  );

  expect(resolution.status).toBe("candidates");
  expect(resolution.candidates.map((candidate) => candidate.label)).toEqual([
    "House Projects",
    "House Projects Archive",
  ]);
});

test("resolveCmsOperationTargets uses surface hints and custom screen filters", () => {
  const activeDraft = normalizeCmsOperationDraft({
    operation: "inspect",
    resourceKind: "custom-screen",
    surfaceHint: "Screens",
    filters: [{ field: "status", operator: "eq", value: "published" }],
    targetQuery: null,
  });

  expect(resolveCmsOperationTargets(activeDraft, context)).toMatchObject({
    status: "exact",
    candidates: [
      {
        label: "House Projects",
        status: "active",
      },
    ],
  });

  const visibleDraft = normalizeCmsOperationDraft({
    operation: "inspect",
    resourceKind: "custom-screen",
    surfaceHint: "Screens",
    filters: [{ field: "showInSidebar", operator: "eq", value: true }],
    targetQuery: null,
  });

  expect(resolveCmsOperationTargets(visibleDraft, context)).toMatchObject({
    status: "exact",
    candidates: [
      {
        label: "House Projects",
      },
    ],
  });
});

test("resolveCmsOperationTargets keeps page published filter family-specific", () => {
  const draft = normalizeCmsOperationDraft({
    operation: "inspect",
    resourceKind: "page",
    surfaceHint: "Pages",
    filters: [{ field: "status", operator: "eq", value: "published" }],
    targetQuery: null,
  });

  expect(resolveCmsOperationTargets(draft, context)).toMatchObject({
    status: "candidates",
    candidates: [
      {
        label: "Contact",
        status: "published",
      },
      {
        label: "Katalog Projektów Domów 33151341",
        status: "published",
      },
      {
        label: "Katalog Projektów Domów a3afbe30",
        status: "published",
      },
    ],
  });
});

test("resolveCmsOperationTargets filters page title searches instead of returning every surface candidate", () => {
  const pageSearchContext = buildAssistantAdminContext({
    page: "/admin/pages",
    locale: "pl-PL",
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: "2026-04-18T10:00:00.000Z",
      budget: {
        maxItemsPerGroup: 50,
        maxFieldsPerResource: 24,
        truncated: false,
      },
      pages: [
        { id: "page-home", title: "home", slug: "/", status: "published" },
        {
          id: "page-catalog",
          title: "Katalog Projektów Domów 33151341",
          slug: "/projekty-domow-33151341",
          status: "published",
        },
        { id: "page-test", title: "test-page", slug: "/test-page", status: "published" },
        { id: "page-test-2", title: "test2", slug: "/test2", status: "published" },
      ],
      contentTypes: [],
      customScreens: [],
      listings: { queries: [], templates: [] },
      forms: [],
      menus: [],
      seoDocuments: [],
      widgets: [],
      warnings: [],
    },
  });

  const orDraft = normalizeCmsOperationDraft({
    operation: "find",
    resourceKind: "page",
    surfaceHint: "Pages",
    filters: [{ field: "status", operator: "eq", value: "published" }],
    targetQuery: {
      text: "test-page OR test2 OR test",
    },
  });

  expect(resolveCmsOperationTargets(orDraft, pageSearchContext)).toMatchObject({
    status: "candidates",
    candidates: [
      { label: "test-page", status: "published" },
      { label: "test2", status: "published" },
    ],
  });

  const exactNameDraft = normalizeCmsOperationDraft({
    operation: "find",
    resourceKind: "page",
    surfaceHint: "Pages",
    filters: [{ field: "status", operator: "eq", value: "published" }],
    targetQuery: {
      exactName: "test",
    },
  });

  expect(resolveCmsOperationTargets(exactNameDraft, pageSearchContext)).toMatchObject({
    status: "candidates",
    candidates: [
      { label: "test-page", status: "published" },
      { label: "test2", status: "published" },
    ],
  });
});

test("resolveCmsOperationTargets resolves counted partial page deletes", () => {
  const draft = normalizeCmsOperationDraft({
    operation: "delete",
    resourceKind: "page",
    targetQuery: {
      exactName: "Katalog Projektów",
    },
    constraints: {
      expectedCount: 2,
      destructive: true,
      requiresConfirmation: true,
    },
  });

  const resolution = resolveCmsOperationTargets(draft, context);
  expect(resolution.status).toBe("ambiguous");
  expect(resolution.candidates.map((candidate) => candidate.label)).toEqual([
    "Katalog Projektów Domów 33151341",
    "Katalog Projektów Domów a3afbe30",
  ]);
});

test("resolveCmsOperationTargets resolves counted partial non-page updates", () => {
  const draft = normalizeCmsOperationDraft({
    operation: "update",
    resourceKind: "custom-screen",
    targetQuery: {
      exactName: "House",
    },
    mutation: {
      fieldIntent: "status",
      value: "draft",
    },
    constraints: {
      expectedCount: 2,
    },
  });

  const resolution = resolveCmsOperationTargets(draft, context);
  expect(resolution.status).toBe("ambiguous");
  expect(resolution.candidates.map((candidate) => candidate.label)).toEqual([
    "House Projects",
    "House Projects Archive",
  ]);
});

test("resolveCmsOperationTargets applies form visibility filters", () => {
  const draft = normalizeCmsOperationDraft({
    operation: "inspect",
    resourceKind: "form",
    surfaceHint: "Forms",
    filters: [{ field: "visibility", operator: "eq", value: "public" }],
    targetQuery: null,
  });

  expect(resolveCmsOperationTargets(draft, context)).toMatchObject({
    status: "exact",
    candidates: [
      {
        label: "Lead Form",
        status: "published",
      },
    ],
  });
});

test("resolveCmsOperationTargets fails closed for filters outside resource policy", () => {
  const draft = normalizeCmsOperationDraft({
    operation: "inspect",
    resourceKind: "page",
    surfaceHint: "Pages",
    filters: [{ field: "visibility", operator: "eq", value: "public" }],
    targetQuery: null,
  });

  expect(resolveCmsOperationTargets(draft, context)).toMatchObject({
    status: "no_match",
    candidates: [],
  });
});
