import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { CollectionOverview } from "../../../core/admin/ui/content-types/CollectionOverview";
import type { ContentTypeCollectionWorkspaceSummary } from "../../../core/admin/services/contentTypesClient";

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({ href, children }: { href: string; children?: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/ui/shared/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-slot="status">{status}</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-slot="badge">{children}</span>,
}));

const candidate = (overrides: Record<string, unknown>) => ({
  id: "res-1",
  label: "Product detail",
  status: "published",
  slug: "products",
  role: "primary",
  updatedAt: "2025-01-15T10:00:00Z",
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
    detailPage: candidate({ id: "dp-1", label: "Product detail page" }),
    listPage: candidate({ id: "lp-1", label: "Products list" }),
    listingQuery: candidate({ id: "lq-1", label: "Published products" }),
    listingTemplate: candidate({ id: "lt-1", label: "Product template" }),
    adminScreen: candidate({ id: "as-1", label: "Product screen" }),
  },
  linkedSecondary: {
    pages: [candidate({ id: "p-1" }), candidate({ id: "p-2" })],
    adminScreens: [candidate({ id: "s-1" })],
  },
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
    fieldCount: 2,
    updatedAt: "not-a-real-date",
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
    { resource: "detailPage", reason: "canonical_resolution_deferred" },
    { resource: "listPage", reason: "explicit_link_missing" },
  ],
  candidates: {
    detailPages: [],
    pages: [],
    listingQueries: [],
    listingTemplates: [],
    adminScreens: [],
  },
};

const stripComments = (html: string) => html.replace(/<!--.*?-->/g, "");

test("CollectionOverview renders the full workspace with linked resources and edit actions", () => {
  const html = stripComments(renderToString(<CollectionOverview summary={fullSummary} />));
  expect(html).toContain("Products");
  expect(html).toContain("/products");
  expect(html).toContain("4 fields");
  expect(html).toContain("published");
  expect(html).toContain("Ready");
  expect(html).toContain("Linked resources");
  expect(html).toContain("2");
  expect(html).toContain("1");
  expect(html).toContain("Product detail page");
  expect(html).toContain("Products list");
  expect(html).toContain("Published products");
  expect(html).toContain("Product template");
  expect(html).toContain("Product screen");
  expect(html).toContain("Edit");
  expect(html).toContain("Edit page");
  expect(html).toContain("Edit query");
  expect(html).toContain("Open templates");
  expect(html).toContain("Open settings");
  expect(html).toContain("/products");
});

test("CollectionOverview renders candidate meta joining status, slug, role and date", () => {
  const html = stripComments(renderToString(<CollectionOverview summary={fullSummary} />));
  expect(html).toContain("published · /products · primary · Jan");
});

test("CollectionOverview renders missing badges and creation actions for an empty workspace", () => {
  const onCreate = vi.fn();
  const html = renderToString(
    <CollectionOverview summary={emptySummary} onCreateDetailTemplate={onCreate} />
  );
  expect(html).toContain("2 open");
  expect(html).toContain("Missing");
  expect(html).toContain("Create detail template");
  expect(html).toContain("Open Pages");
  expect(html).toContain("Create query");
  expect(html).toContain("Open Screens");
  expect(html).toContain("Open templates");
});

test("CollectionOverview shows the creating state and disables the create button", () => {
  const html = renderToString(
    <CollectionOverview summary={emptySummary} isCreatingDetailTemplate />
  );
  expect(html).toContain("Creating...");
});

test("CollectionOverview shows the deleting state for the matching detail template", () => {
  const html = renderToString(
    <CollectionOverview
      summary={fullSummary}
      deletingDetailTemplateId="dp-1"
      onDeleteDetailTemplate={vi.fn()}
    />
  );
  expect(html).toContain("Deleting...");
});

test("CollectionOverview omits a meta line for candidates without optional fields", () => {
  const sparse: ContentTypeCollectionWorkspaceSummary = {
    ...fullSummary,
    canonical: {
      ...fullSummary.canonical,
      detailPage: candidate({ status: null, slug: null, role: null, updatedAt: null }),
      listPage: candidate({ status: null, slug: null, role: null, updatedAt: null }),
      listingQuery: candidate({ status: null, slug: null, role: null, updatedAt: null }),
      listingTemplate: candidate({ status: null, slug: null, role: null, updatedAt: null }),
      adminScreen: candidate({ status: null, slug: null, role: null, updatedAt: null }),
    },
  };
  const html = stripComments(renderToString(<CollectionOverview summary={sparse} />));
  expect(html).toContain("Product detail");
  expect(html).not.toContain(" · ");
});

test("CollectionOverview renders a candidate with a display-only value when href is absent", () => {
  const sparse: ContentTypeCollectionWorkspaceSummary = {
    ...fullSummary,
    canonical: {
      ...fullSummary.canonical,
      listingTemplate: candidate({ id: "lt-1", label: "Product template" }),
    },
  };
  const html = renderToString(<CollectionOverview summary={sparse} />);
  expect(html).toContain("Product template");
});
