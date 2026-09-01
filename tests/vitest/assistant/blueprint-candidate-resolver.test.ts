import { expect, test } from "vitest";

import { resolveBlueprintCandidates } from "../../../core/services/assistant/blueprints/blueprintCandidateResolver";

test("resolveBlueprintCandidates returns product catalog primary with inquiry and editorial adjuncts", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Create a product catalog with inquiry form and a blog hub for guides.",
    context: {
      page: "/admin/advanced/entries",
      locale: "en-US",
    },
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["product-catalog", "primary"],
    ["product-inquiry-catalog", "adjunct"],
    ["editorial-content-hub", "adjunct"],
  ]);
});

test("resolveBlueprintCandidates adds services directory as an adjunct for offer prompts", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Stwórz katalog produktów z ofertą usług i listą rozwiązań.",
    context: {
      page: "/admin/advanced/entries/products",
      locale: "pl-PL",
    },
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["product-catalog", "primary"],
    ["services-directory", "adjunct"],
  ]);
});

test("resolveBlueprintCandidates keeps booking gated and adds lead capture for mixed house-project prompts", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Build a Mabudo-like house projects catalog with contact form and appointment booking.",
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["house-projects-catalog", "primary"],
    ["lead-capture-site", "adjunct"],
    ["booking-service", "gated"],
  ]);
});

test("resolveBlueprintCandidates returns gated-only booking setup when no executable primary exists", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "I need booking setup with reservations and a calendar.",
  });

  expect(candidates).toEqual([
    expect.objectContaining({
      capabilityId: "booking-service",
      role: "gated",
    }),
  ]);
});

test("resolveBlueprintCandidates uses route context to recover the primary capability", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Need an inquiry form here.",
    context: {
      page: "/admin/advanced/entries/products",
      locale: "en-US",
    },
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["product-catalog", "primary"],
    ["product-inquiry-catalog", "adjunct"],
  ]);
});

test("resolveBlueprintCandidates uses normalized content-type alias context with mixed catalog families", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/content-types/type-1",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "type-1",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
          {
            id: "type-2",
            slug: "services",
            name: "Services",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        media: [],
        warnings: [],
      },
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/content-types/type-1",
        activeHref: "/admin/content-types/type-1",
        area: "advanced",
        advancedModule: null,
        selectedResource: {
          kind: "content-type",
          id: "type-1",
        },
        visibleActions: [],
        permissionHints: {
          known: false,
          reason: "not_available",
          requiredForVisibleActions: [],
        },
      },
    },
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["product-catalog", "primary"],
  ]);
});

test("resolveBlueprintCandidates can recover content-type alias context without selectedResource", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/content-types/type-1",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "type-1",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
          {
            id: "type-2",
            slug: "services",
            name: "Services",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        media: [],
        warnings: [],
      },
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/content-types/type-1",
        activeHref: "/admin/content-types/type-1",
        area: "advanced",
        advancedModule: null,
        selectedResource: null,
        visibleActions: [],
        permissionHints: {
          known: false,
          reason: "not_available",
          requiredForVisibleActions: [],
        },
      },
    },
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["product-catalog", "primary"],
  ]);
});

test("resolveBlueprintCandidates falls back to exact capability aliases when prompt classification stays unknown", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Mabudo",
  });

  expect(candidates).toEqual([
    expect.objectContaining({
      capabilityId: "house-projects-catalog",
      role: "primary",
      matchedSignals: ["alias-match"],
    }),
  ]);
});
