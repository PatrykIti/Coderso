import { expect } from "vitest";

import type { PackageReferenceEdge } from "../../../core/services/kits/fullSitePackage/referenceGraph";
import {
  ReferenceGraphError,
  indexUniqueKindKeys,
  toResourceIdentity,
} from "../../../core/services/kits/fullSitePackage/referenceRegistry";
import type {
  FullSitePackageResources,
  FullSitePackageV1,
  JsonObject,
  PackageRef,
  PackageResourceCollection,
} from "../../../core/services/kits/fullSitePackage/types";
import { emptyFullSitePackageResources } from "./fullSitePackageTestSupport";

export const packageRef = (ref: PackageRef["ref"], key: string): PackageRef => ({ ref, key });

export const packageWithResources = (resources: FullSitePackageResources): FullSitePackageV1 => ({
  schemaVersion: 1,
  key: "reference-graph-package",
  metadata: { name: "Reference Graph", locale: "en" },
  resources,
});

export const addPackageSeed = (
  resources: FullSitePackageResources,
  collection: PackageResourceCollection,
  key: string,
  desired: JsonObject
): void => {
  resources[collection].push({ key, desired });
};

export const expectReferenceGraphCode = (
  callback: () => unknown,
  code: ReferenceGraphError["code"]
): ReferenceGraphError => {
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(ReferenceGraphError);
    expect((error as ReferenceGraphError).code).toBe(code);
    return error as ReferenceGraphError;
  }
  throw new Error(`Expected ${code}`);
};

export const completeReferencePackage = (): FullSitePackageV1 => {
  const resources = emptyFullSitePackageResources();
  addPackageSeed(resources, "contentTypes", "house-project", {
    slug: "house-project",
    status: "published",
  });
  addPackageSeed(resources, "forms", "project-brief", { status: "published" });
  addPackageSeed(resources, "pageTemplates", "footer", {
    document: { sections: [] },
    status: "published",
  });
  addPackageSeed(resources, "listingTemplates", "project-cards", { name: "Cards" });
  addPackageSeed(resources, "entries", "aurora", {
    contentTypeId: packageRef("content_type", "house-project"),
  });
  addPackageSeed(resources, "listingQueries", "published-projects", {
    query: {
      sourceConfig: { contentTypeId: packageRef("content_type", "house-project") },
    },
  });
  addPackageSeed(resources, "detailPages", "project-detail", {
    contentTypeId: packageRef("content_type", "house-project"),
    related: [{ listingQueryId: packageRef("listing_query", "published-projects") }],
  });
  addPackageSeed(resources, "pages", "home", {
    data: { sections: [] },
    status: "published",
  });
  addPackageSeed(resources, "pages", "projects", {
    data: {
      settings: {
        collectionLink: {
          contentTypeId: packageRef("content_type", "house-project"),
          listingQueryId: packageRef("listing_query", "published-projects"),
          listingTemplateId: packageRef("listing_template", "project-cards"),
        },
      },
      sections: [
        {
          blocks: [
            {
              type: "collection",
              props: {
                contentTypeId: packageRef("content_type", "house-project"),
                queryId: packageRef("listing_query", "published-projects"),
                templateId: packageRef("listing_template", "project-cards"),
              },
              responsive: {
                tablet: { props: { queryId: null } },
                mobile: { props: {} },
              },
            },
            {
              type: "form",
              props: { formId: packageRef("form", "project-brief") },
            },
          ],
        },
      ],
    },
    status: "published",
  });
  addPackageSeed(resources, "menus", "primary", {
    items: [{ pageId: packageRef("page", "home") }],
  });
  addPackageSeed(resources, "settings", "site.homepageId", {
    value: packageRef("page", "home"),
  });
  addPackageSeed(resources, "settings", "site.navigationMenuId", {
    value: packageRef("menu", "primary"),
  });
  addPackageSeed(resources, "settings", "site.footerTemplateId", {
    value: packageRef("page_template", "footer"),
  });
  addPackageSeed(resources, "settings", "site.contentRoutes", {
    value: [
      {
        type: "house-project",
        detailPageId: packageRef("detail_page", "project-detail"),
      },
    ],
  });
  return packageWithResources(resources);
};

export const linearDependencyGraph = (edgesCount: number) => {
  const resources = emptyFullSitePackageResources();
  const keys = Array.from(
    { length: edgesCount + 1 },
    (_, index) => `depth-${String(index).padStart(3, "0")}`
  );
  for (const key of keys) addPackageSeed(resources, "pages", key, { data: { sections: [] } });
  const identities = keys.map((key) => toResourceIdentity("page", key));
  const edges: PackageReferenceEdge[] = identities.slice(1).map((identity, index) => ({
    from: identity,
    to: identities[index],
    path: Object.freeze(["synthetic", index]),
    purpose: "substitute",
  }));
  return {
    registry: indexUniqueKindKeys(resources),
    edges,
    identities,
  };
};

export const pageBlockChain = (depth: number, leaf: JsonObject): JsonObject => {
  let block = leaf;
  for (let currentDepth = depth - 1; currentDepth >= 1; currentDepth -= 1) {
    block = {
      type: "container",
      props: {},
      slots: { children: [block] },
    };
  }
  return block;
};
