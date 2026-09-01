import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { CollectionReadinessChecklist } from "../../../core/admin/ui/content-types/CollectionReadinessChecklist";
import type { ContentTypeCollectionWorkspaceSummary } from "../../../core/admin/services/contentTypesClient";

const stripComments = (html: string) => html.replace(/<!--.*?-->/g, "");

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-slot="badge">{children}</span>,
}));

const candidate = (overrides: Record<string, unknown>) => ({
  id: "res-1",
  label: "Resource",
  ...overrides,
});

const fullSummary: ContentTypeCollectionWorkspaceSummary = {
  contentType: {
    id: "ct-1",
    name: "Products",
    slug: "products",
    status: "published",
    fieldCount: 4,
    updatedAt: "2025-01-15T10:00:00Z",
  },
  canonical: {
    contentRoute: {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
    },
    detailPage: candidate({ id: "dp-1" }),
    listPage: candidate({ id: "lp-1" }),
    listingQuery: candidate({ id: "lq-1" }),
    listingTemplate: candidate({ id: "lt-1" }),
    adminScreen: candidate({ id: "as-1" }),
  },
  linkedSecondary: { pages: [], adminScreens: [] },
  unresolved: [],
  candidates: {
    detailPages: [],
    pages: [],
    listingQueries: [],
    listingTemplates: [],
    adminScreens: [],
  },
};

const emptySummary: ContentTypeCollectionWorkspaceSummary = {
  contentType: {
    id: "ct-2",
    name: "Posts",
    slug: "posts",
    status: "draft",
    fieldCount: 0,
    updatedAt: "2025-01-15T10:00:00Z",
  },
  canonical: {
    contentRoute: null,
    detailPage: null,
    listPage: null,
    listingQuery: null,
    listingTemplate: null,
    adminScreen: null,
  },
  linkedSecondary: { pages: [], adminScreens: [] },
  unresolved: [
    { resource: "contentRoute", reason: "missing_content_route" },
    { resource: "detailPage", reason: "canonical_resolution_deferred" },
    { resource: "listPage", reason: "explicit_link_missing" },
    { resource: "listingQuery", reason: "ambiguous_candidates" },
    { resource: "listingTemplate", reason: "permission_missing" },
  ],
  candidates: {
    detailPages: [],
    pages: [],
    listingQueries: [],
    listingTemplates: [],
    adminScreens: [],
  },
};

test("CollectionReadinessChecklist reports a fully linked workspace as ready", () => {
  const html = stripComments(
    renderToString(<CollectionReadinessChecklist summary={fullSummary} />)
  );
  expect(html).toContain("6 of 6 canonical resources linked");
  expect(html).toContain("Ready");
  expect(html).toContain("Content route");
  expect(html).toContain("Detail page");
  expect(html).toContain("List page");
  expect(html).toContain("Listing query");
  expect(html).toContain("Listing template");
  expect(html).toContain("Admin screen");
  expect(html).not.toContain("Needs attention");
});

test("CollectionReadinessChecklist shows open items with localized reason labels", () => {
  const html = stripComments(
    renderToString(<CollectionReadinessChecklist summary={emptySummary} />)
  );
  expect(html).toContain("0 of 6 canonical resources linked");
  expect(html).toContain("Needs attention");
  expect(html).toContain("Route missing");
  expect(html).toContain("Waiting for canonical page");
  expect(html).toContain("Explicit link missing");
  expect(html).toContain("Multiple candidates");
  expect(html).toContain("Permission missing");
});

test("CollectionReadinessChecklist renders an unresolved item without a reason label as open", () => {
  const partial: ContentTypeCollectionWorkspaceSummary = {
    ...emptySummary,
    unresolved: [],
    canonical: {
      ...emptySummary.canonical,
      listPage: candidate({ id: "lp-1" }),
    },
  };
  const html = stripComments(renderToString(<CollectionReadinessChecklist summary={partial} />));
  expect(html).toContain("1 of 6 canonical resources linked");
  expect(html).toContain("Needs attention");
});
