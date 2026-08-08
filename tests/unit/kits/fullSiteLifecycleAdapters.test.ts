import { describe, expect, test } from "bun:test";

import {
  FULL_SITE_RESOURCE_ADAPTERS,
  createPageResourceAdapter,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import {
  buildReferencePlan,
  resolvePlannedPackageResourceRefs,
} from "../../../core/services/kits/fullSitePackage/referenceGraph";
import {
  createPage,
  getPage,
  publishPage,
  unpublishPage,
  updatePage,
} from "../../../core/services/pages/pageService";
import { buildFormaDomPackage } from "../../../scripts/projekty-domow/package";

const ACTOR_ID = "00000000-0000-4000-8000-000000000547";
const PAGE_ID = "00000000-0000-4000-8000-000000000041";
const DETAIL_ID = "00000000-0000-4000-8000-000000000042";

const resolvedResource = (kind: "page" | "detail_page") => {
  const plan = buildReferencePlan(buildFormaDomPackage());
  const resource = plan.find(
    (candidate) => candidate.kind === kind && (kind !== "page" || candidate.references.length > 0)
  );
  if (!resource) throw new Error(`${kind}_fixture_missing`);
  const ids = new Map(
    plan.map((candidate, index) => [
      candidate.identity,
      `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
    ])
  );
  return {
    resource,
    desired: resolvePlannedPackageResourceRefs(resource, ids),
  };
};

describe("full-site lifecycle adapters", () => {
  test("accepts only the Page data root after package references resolve", async () => {
    const { resource, desired } = resolvedResource("page");
    const normalized = await FULL_SITE_RESOURCE_ADAPTERS.page.validateDesired({
      operation: "create",
      currentId: null,
      key: resource.key,
      desired,
      actorId: ACTOR_ID,
    });
    expect(normalized).toBeDefined();
    expect(normalized?.data).toEqual(desired.data);

    expect(resource.references.length).toBeGreaterThan(0);
    expect(JSON.stringify(desired.data)).not.toContain('"ref"');
    expect(() =>
      FULL_SITE_RESOURCE_ADAPTERS.page.validateDesired({
        operation: "create",
        currentId: null,
        key: "page",
        desired: {
          title: "Wrong root",
          slug: "wrong-root",
          status: "draft",
          data: { schemaVersion: 2, sections: [] },
          document: { schemaVersion: 2, sections: [] },
        },
        actorId: ACTOR_ID,
      })
    ).toThrow("page_invalid");
  });

  test("passes exact title, slug and data to Page create/update while publishing last", async () => {
    const calls: Array<Readonly<{ operation: string; value?: unknown }>> = [];
    const pageData = { schemaVersion: 2 as const, sections: [] };
    const adapter = createPageResourceAdapter({
      createPage: async (input) => {
        calls.push({ operation: "create", value: input });
        return { id: PAGE_ID } as unknown as Awaited<ReturnType<typeof createPage>>;
      },
      getPage: async () =>
        ({
          id: PAGE_ID,
          title: "Before",
          slug: "before",
          currentData: pageData,
          publishedData: pageData,
          status: "published",
        }) as Awaited<ReturnType<typeof getPage>>,
      unpublishPage: async () => {
        calls.push({ operation: "unpublish" });
        return { id: PAGE_ID } as unknown as Awaited<ReturnType<typeof unpublishPage>>;
      },
      updatePage: async (_id, input) => {
        calls.push({ operation: "update", value: input });
        return { id: PAGE_ID } as unknown as Awaited<ReturnType<typeof updatePage>>;
      },
      publishPage: async () => {
        calls.push({ operation: "publish" });
        return { id: PAGE_ID } as unknown as Awaited<ReturnType<typeof publishPage>>;
      },
    });
    const desired = {
      title: "Home",
      slug: "home",
      status: "published" as const,
      data: pageData,
    };

    await adapter.applyStaged({
      operation: "create",
      currentId: null,
      key: "home",
      desired,
      actorId: ACTOR_ID,
    });
    await adapter.applyStaged({
      operation: "update",
      currentId: PAGE_ID,
      key: "home",
      desired,
      actorId: ACTOR_ID,
    });
    await adapter.publish(PAGE_ID, ACTOR_ID);

    const native = { title: "Home", slug: "home", data: pageData };
    expect(calls).toEqual([
      { operation: "create", value: { ...native, authorId: ACTOR_ID } },
      { operation: "unpublish" },
      { operation: "update", value: native },
      { operation: "publish" },
    ]);
  });

  test("prepares a canonical detail lifecycle target from resolved native ids", async () => {
    const { resource, desired } = resolvedResource("detail_page");
    desired.name = `  ${String(desired.name)}  `;
    const normalized = await FULL_SITE_RESOURCE_ADAPTERS.detail_page.validateDesired({
      operation: "create",
      currentId: null,
      key: resource.key,
      desired,
      actorId: ACTOR_ID,
    });
    if (!normalized) throw new Error("detail_page_fixture_invalid");
    const targets = await FULL_SITE_RESOURCE_ADAPTERS.detail_page.prepareNativeTargets({
      operation: "create",
      currentId: null,
      key: resource.key,
      desired: normalized,
      actorId: ACTOR_ID,
      intendedId: DETAIL_ID,
      expectedSnapshot: null,
    });

    expect(targets.complete.id).toBe(DETAIL_ID);
    expect(targets.complete.desired.name).toBe(String(desired.name).trim());
    expect(targets.complete.desired.contentTypeId).toBe(normalized.contentTypeId);
    expect(targets.complete.desired.currentDocument).toMatchObject({
      id: DETAIL_ID,
      contentTypeId: normalized.contentTypeId,
    });
    expect(targets.staged).not.toBeNull();
  });
});
