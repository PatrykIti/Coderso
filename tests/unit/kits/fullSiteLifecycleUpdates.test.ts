import { expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, seoDocuments, users } from "../../../core/db/schema";
import { deleteContentType } from "../../../core/services/content/typeService";
import { getEntry, updateEntry } from "../../../core/services/content/entryService";
import {
  createContentEntryResourceAdapter,
  createPageResourceAdapter,
  FULL_SITE_ROLLBACK_ADAPTERS,
  FULL_SITE_RESOURCE_ADAPTERS,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import {
  assertInstalledSnapshotCurrent,
  preflightFullSitePlan,
} from "../../../core/services/kits/fullSiteInstall/preflight";
import type {
  FullSiteInstallLedgerPort,
  FullSiteInstallPlan,
} from "../../../core/services/kits/fullSiteInstallTypes";
import {
  deleteDetailPageDocument,
  getDetailPageDocument,
} from "../../../core/services/content/detailPageDocumentService";
import { deleteMenu, getMenu } from "../../../core/services/menus/menuService";
import { deletePage, getPage, updatePage } from "../../../core/services/pages/pageService";
import type { JsonObject } from "../../../core/services/kits/fullSitePackage/types";
import { buildFormaDomPackage } from "../../../scripts/projekty-domow/package";

const statusOf = async (kind: "content_entry" | "page" | "menu", id: string) => {
  if (kind === "content_entry") return (await getEntry(id))?.status;
  if (kind === "page") return (await getPage(id))?.status;
  return (await getMenu(id))?.status;
};

test("entry preflight keys its AJV cache by package and schema fingerprint", async () => {
  const plan = (
    packageKey: string,
    field: string,
    fieldSchema: JsonObject,
    value: JsonObject
  ): FullSiteInstallPlan => ({
    packageKey,
    operations: [
      {
        position: 0,
        identity: "content_type:shared",
        kind: "content_type",
        key: "shared",
        operation: "create",
        desired: {
          name: "Shared",
          slug: `shared-${packageKey}`,
          status: "published",
          schema: {
            type: "object",
            additionalProperties: false,
            required: [field],
            properties: { [field]: fieldSchema },
          },
          config: {},
        },
        currentId: null,
        currentDesired: null,
        managedRunId: null,
        dependencies: [],
      },
      {
        position: 1,
        identity: "content_entry:entry",
        kind: "content_entry",
        key: "entry",
        operation: "create",
        desired: {
          contentTypeId: { ref: "content_type", key: "shared" },
          title: "Entry",
          slug: `entry-${packageKey}`,
          status: "published",
          data: value,
        },
        currentId: null,
        currentDesired: null,
        managedRunId: null,
        dependencies: ["content_type:shared"],
      },
    ],
  });
  await preflightFullSitePlan({
    plan: plan("alpha", "alpha", { type: "string" }, { alpha: "ok" }),
    actorId: "00000000-0000-4000-8000-000000000547",
    adapters: FULL_SITE_RESOURCE_ADAPTERS,
  });
  await preflightFullSitePlan({
    plan: plan("beta", "beta", { type: "number" }, { beta: 1 }),
    actorId: "00000000-0000-4000-8000-000000000547",
    adapters: FULL_SITE_RESOURCE_ADAPTERS,
  });
});

test("published entry, page and menu updates stage as draft and publish only at the end", async () => {
  const scope = crypto.randomUUID();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${scope}@lifecycle.task-547.invalid`,
      passwordHash: "task-547-not-a-login",
      status: "inactive",
    })
    .returning({ id: users.id });
  if (!actor) throw new Error("actor_fixture_failed");
  const pkg = structuredClone(buildFormaDomPackage());
  const contentTypeDesired = pkg.resources.contentTypes[0]!.desired;
  contentTypeDesired.slug = `house-project-${scope}`;
  contentTypeDesired.name = `House project ${scope}`;
  const contentType = await FULL_SITE_RESOURCE_ADAPTERS.content_type.applyDesired({
    operation: "create",
    currentId: null,
    key: `type-${scope}`,
    desired: contentTypeDesired,
    actorId: actor.id,
  });
  const created: Array<{ kind: "content_entry" | "page" | "menu"; id: string }> = [];
  try {
    const entryDesired = pkg.resources.entries[0]!.desired;
    entryDesired.contentTypeId = contentType.id;
    entryDesired.slug = `entry-${scope}`;
    const pageDesired = pkg.resources.pages[0]!.desired;
    pageDesired.slug = `/page-${scope}`;
    const entry = await FULL_SITE_RESOURCE_ADAPTERS.content_entry.applyStaged({
      operation: "create",
      currentId: null,
      key: `entry-${scope}`,
      desired: entryDesired,
      actorId: actor.id,
    });
    created.push({ kind: "content_entry", id: entry.id });
    const page = await FULL_SITE_RESOURCE_ADAPTERS.page.applyStaged({
      operation: "create",
      currentId: null,
      key: `page-${scope}`,
      desired: pageDesired,
      actorId: actor.id,
    });
    created.push({ kind: "page", id: page.id });
    const menuDesired = pkg.resources.menus[0]!.desired;
    menuDesired.name = `Menu ${scope}`;
    menuDesired.location = `location-${scope}`;
    for (const item of menuDesired.items as JsonObject[]) {
      item.id = crypto.randomUUID();
      item.pageId = page.id;
    }
    const menu = await FULL_SITE_RESOURCE_ADAPTERS.menu.applyStaged({
      operation: "create",
      currentId: null,
      key: `menu-${scope}`,
      desired: menuDesired,
      actorId: actor.id,
    });
    created.push({ kind: "menu", id: menu.id });
    for (const resource of created) {
      await FULL_SITE_RESOURCE_ADAPTERS[resource.kind].publish(resource.id, actor.id);
      expect(await statusOf(resource.kind, resource.id)).toBe("published");
    }

    const entryBefore = await getEntry(entry.id);
    let entryUpdateCalls = 0;
    const failingEntryAdapter = createContentEntryResourceAdapter({
      updateEntry: async (id, desired) => {
        entryUpdateCalls += 1;
        if (entryUpdateCalls === 1) throw new Error("injected_entry_update_failure");
        return updateEntry(id, desired);
      },
    });
    await expect(
      failingEntryAdapter.applyStaged({
        operation: "update",
        currentId: entry.id,
        key: `entry-${scope}`,
        desired: { ...entryDesired, title: "Changed before failure" },
        actorId: actor.id,
      })
    ).rejects.toThrow("injected_entry_update_failure");
    const entryAfterFailure = await getEntry(entry.id);
    expect({
      title: entryAfterFailure?.title,
      slug: entryAfterFailure?.slug,
      data: entryAfterFailure?.data,
      status: entryAfterFailure?.status,
    }).toEqual({
      title: entryBefore?.title,
      slug: entryBefore?.slug,
      data: entryBefore?.data,
      status: entryBefore?.status,
    });

    const pageBefore = await getPage(page.id);
    let pageUpdateCalls = 0;
    const failingPageAdapter = createPageResourceAdapter({
      updatePage: async (id, desired) => {
        pageUpdateCalls += 1;
        if (pageUpdateCalls === 1) throw new Error("injected_page_update_failure");
        return updatePage(id, desired);
      },
    });
    await expect(
      failingPageAdapter.applyStaged({
        operation: "update",
        currentId: page.id,
        key: `page-${scope}`,
        desired: { ...pageDesired, title: "Changed before failure" },
        actorId: actor.id,
      })
    ).rejects.toThrow("injected_page_update_failure");
    const pageAfterFailure = await getPage(page.id);
    expect({
      title: pageAfterFailure?.title,
      slug: pageAfterFailure?.slug,
      currentData: pageAfterFailure?.currentData,
      publishedData: pageAfterFailure?.publishedData,
      status: pageAfterFailure?.status,
    }).toEqual({
      title: pageBefore?.title,
      slug: pageBefore?.slug,
      currentData: pageBefore?.currentData,
      publishedData: pageBefore?.publishedData,
      status: pageBefore?.status,
    });

    const desiredByKind = {
      content_entry: entryDesired,
      page: pageDesired,
      menu: menuDesired,
    };
    for (const resource of created) {
      const desired = desiredByKind[resource.kind];
      desired.status = "draft";
      await FULL_SITE_RESOURCE_ADAPTERS[resource.kind].applyStaged({
        operation: "update",
        currentId: resource.id,
        key: `${resource.kind}-${scope}`,
        desired,
        actorId: actor.id,
      });
      expect(await statusOf(resource.kind, resource.id)).toBe("draft");

      desired.status = "published";
      await FULL_SITE_RESOURCE_ADAPTERS[resource.kind].applyStaged({
        operation: "update",
        currentId: resource.id,
        key: `${resource.kind}-${scope}`,
        desired,
        actorId: actor.id,
      });
      expect(await statusOf(resource.kind, resource.id)).toBe("draft");
      await FULL_SITE_RESOURCE_ADAPTERS[resource.kind].publish(resource.id, actor.id);
      expect(await statusOf(resource.kind, resource.id)).toBe("published");
    }
  } finally {
    for (const resource of [...created].reverse()) {
      if (resource.kind === "menu") await deleteMenu(resource.id);
      if (resource.kind === "page") await deletePage(resource.id);
      if (resource.kind === "content_entry") {
        await db
          .delete(seoDocuments)
          .where(and(eq(seoDocuments.targetType, "entry"), eq(seoDocuments.targetId, resource.id)));
        await db.delete(contentEntries).where(eq(contentEntries.id, resource.id));
      }
    }
    await deleteContentType(contentType.id);
    await db.delete(users).where(eq(users.id, actor.id));
  }
}, 360_000);

test("detail-page staging preserves live revisions but draft restore explicitly unpublishes", async () => {
  const scope = crypto.randomUUID();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${scope}@detail-lifecycle.task-547.invalid`,
      passwordHash: "task-547-not-a-login",
      status: "inactive",
    })
    .returning({ id: users.id });
  if (!actor) throw new Error("actor_fixture_failed");
  const pkg = structuredClone(buildFormaDomPackage());
  const contentTypeDesired = pkg.resources.contentTypes[0]!.desired;
  contentTypeDesired.slug = `detail-project-${scope}`;
  contentTypeDesired.name = `Detail project ${scope}`;
  const contentType = await FULL_SITE_RESOURCE_ADAPTERS.content_type.applyDesired({
    operation: "create",
    currentId: null,
    key: `detail-type-${scope}`,
    desired: contentTypeDesired,
    actorId: actor.id,
  });
  let detailId: string | null = null;
  try {
    const desired = pkg.resources.detailPages[0]!.desired;
    desired.contentTypeId = contentType.id;
    desired.contentTypeSlug = contentTypeDesired.slug;
    desired.name = `Detail ${scope}`;
    const created = await FULL_SITE_RESOURCE_ADAPTERS.detail_page.applyStaged({
      operation: "create",
      currentId: null,
      key: `detail-${scope}`,
      desired,
      actorId: actor.id,
    });
    detailId = created.id;
    const draft = await getDetailPageDocument(created.id);
    expect(draft).toMatchObject({
      id: created.id,
      status: "draft",
      currentDocument: { status: "draft" },
      publishedDocument: null,
    });

    await FULL_SITE_RESOURCE_ADAPTERS.detail_page.publish(created.id, actor.id);
    const published = await getDetailPageDocument(created.id);
    expect(published).toMatchObject({
      status: "published",
      currentDocument: { status: "published", name: desired.name },
      publishedDocument: { status: "published", name: desired.name },
    });

    const updatedDesired = {
      ...desired,
      name: `Updated detail ${scope}`,
      status: "published",
    } as JsonObject;
    await FULL_SITE_RESOURCE_ADAPTERS.detail_page.applyStaged({
      operation: "update",
      currentId: created.id,
      key: `detail-${scope}`,
      desired: updatedDesired,
      actorId: actor.id,
    });
    const staged = await getDetailPageDocument(created.id);
    expect(staged).toMatchObject({
      status: "published",
      currentDocument: { status: "draft", name: updatedDesired.name },
      publishedDocument: { status: "published", name: desired.name },
    });

    const stagedDesired = { ...updatedDesired, status: "draft" } as JsonObject;
    const ledger: FullSiteInstallLedgerPort = {
      withPackageLock: async (_reservation, execute) =>
        execute({ intent: "apply", ownerRunId: "unused", resumePhase: "reserved" }),
      createRun: async () => ({ id: "unused" }),
      recordItem: async () => undefined,
      finalizeRun: async () => undefined,
      getRun: async () => null,
      listItems: async () => [],
      listRawItems: async () => [],
      initializeReservedRun: async (input) => ({ id: input.ownerRunId }),
      finalizeOwnedRun: async () => ({ outcome: "desired_terminal" }),
      createRollbackRun: async () => ({ id: "unused" }),
      hasSuccessfulRollback: async () => false,
      findManagedResourceEvidence: async () => ({
        runId: "managed-run",
        resourceId: created.id,
        desired: stagedDesired,
        successful: true,
        rolledBack: false,
      }),
    };
    const resolveCurrentResource = createFullSiteCurrentResourceResolver(
      `detail-package-${scope}`,
      ledger
    );
    expect(
      await resolveCurrentResource(
        "detail_page",
        { key: `detail-${scope}`, desired: stagedDesired },
        created.id
      )
    ).toEqual({ id: created.id, desired: stagedDesired });
    await assertInstalledSnapshotCurrent({
      operation: {
        position: 0,
        identity: `detail_page:detail-${scope}`,
        kind: "detail_page",
        key: `detail-${scope}`,
        operation: "update",
        desired: updatedDesired,
        currentId: created.id,
        currentDesired: published?.currentDocument as unknown as JsonObject,
        managedRunId: "managed-run",
        dependencies: [],
      },
      id: created.id,
      desired: stagedDesired,
      resolveCurrentResource,
    });

    await FULL_SITE_RESOURCE_ADAPTERS.detail_page.publish(created.id, actor.id);
    expect(await getDetailPageDocument(created.id)).toMatchObject({
      status: "published",
      currentDocument: { status: "published", name: updatedDesired.name },
      publishedDocument: { status: "published", name: updatedDesired.name },
    });

    const restoredDraft = {
      ...updatedDesired,
      name: `Restored draft ${scope}`,
      status: "draft",
    } as JsonObject;
    const expectedCurrent = await FULL_SITE_ROLLBACK_ADAPTERS.detail_page.captureSnapshotByIdOrNull(
      created.id
    );
    if (!expectedCurrent) throw new Error("detail_page_not_found");
    const target = {
      id: created.id,
      desired: {
        ...expectedCurrent.desired,
        name: restoredDraft.name,
        status: "draft",
        currentDocument: {
          ...(expectedCurrent.desired.currentDocument as JsonObject),
          ...restoredDraft,
          id: created.id,
          status: "draft",
        },
        publishedDocument: null,
        publishedAt: null,
      },
    };
    await FULL_SITE_ROLLBACK_ADAPTERS.detail_page.restoreSnapshotAtomic({
      id: created.id,
      expectedCurrent,
      target,
      actorId: actor.id,
    });
    expect(await getDetailPageDocument(created.id)).toMatchObject({
      status: "draft",
      currentDocument: { status: "draft", name: restoredDraft.name },
      publishedDocument: null,
      publishedAt: null,
    });
  } finally {
    if (detailId) await deleteDetailPageDocument(detailId);
    await deleteContentType(contentType.id);
    await db.delete(users).where(eq(users.id, actor.id));
  }
}, 360_000);
