import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { acquireNativeCmsWriterFence } from "../../../core/db/nativeCmsWriterFence";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  forms,
  listingQueries,
  listingTemplates,
  menus,
  pages,
  pageTemplates,
  settings,
} from "../../../core/db/schema";
import type { PlannedPackageResource } from "../../../core/services/kits/fullSitePackage/referenceGraph";
import type {
  FullSiteInstallResourceKind,
  FullSiteResourceIdentity,
} from "../../../core/services/kits/fullSiteInstallTypes";
import { readFullSitePlanningResourcesBatch } from "../../../core/services/kits/fullSiteInstall/planningResourceBatchReader";
import type {
  JsonObject,
  PackageResourceCollection,
} from "../../../core/services/kits/fullSitePackage/types";

const collectionByKind: Readonly<Record<FullSiteInstallResourceKind, PackageResourceCollection>> = {
  content_type: "contentTypes",
  form: "forms",
  page_template: "pageTemplates",
  listing_template: "listingTemplates",
  content_entry: "entries",
  listing_query: "listingQueries",
  detail_page: "detailPages",
  page: "pages",
  menu: "menus",
  setting: "settings",
};

const makeResource = (
  kind: FullSiteInstallResourceKind,
  key: string,
  desired: JsonObject,
  ordinal: number
): PlannedPackageResource =>
  Object.freeze({
    identity: `${kind}:${key}` as FullSiteResourceIdentity,
    kind,
    collection: collectionByKind[kind],
    key,
    ordinal,
    collectionIndex: ordinal,
    seed: Object.freeze({ key, desired: Object.freeze(desired) }),
    dependencies: Object.freeze([]),
    references: Object.freeze([]),
  });

const noEvidence = (resources: readonly PlannedPackageResource[]) =>
  resources.map((resource) => ({ identity: resource.identity, evidence: null }));

test("planning base batch resolves all ten kinds in exact request order", async () => {
  const scope = randomUUID();
  const slug = (prefix: string) => `${prefix}-${scope}`;
  const ids = {
    contentType: randomUUID(),
    form: randomUUID(),
    pageTemplate: randomUUID(),
    listingTemplate: randomUUID(),
    entry: randomUUID(),
    listingQuery: randomUUID(),
    detailPage: randomUUID(),
    page: randomUUID(),
    menu: randomUUID(),
  };
  const settingKey = `planning-${scope}`;
  const [priorSetting] = await db.select().from(settings).where(eq(settings.key, settingKey));
  const resources = [
    makeResource(
      "content_type",
      "project",
      {
        name: `Project ${scope}`,
        slug: slug("project-type"),
        schema: {},
        status: "draft",
        config: {},
      },
      0
    ),
    makeResource(
      "form",
      "brief",
      {
        name: `Brief ${scope}`,
        slug: slug("brief"),
        status: "draft",
        description: null,
        successMessage: null,
        successRedirectUrl: null,
        submissionAccess: "public",
        settings: {},
        fields: [],
        actions: [],
      },
      1
    ),
    makeResource(
      "page_template",
      "landing",
      {
        name: `Landing ${scope}`,
        slug: slug("landing-template"),
        description: null,
        category: null,
        status: "draft",
        document: { sections: [] },
      },
      2
    ),
    makeResource(
      "listing_template",
      "cards",
      {
        name: `Cards ${scope}`,
        slug: slug("cards-template"),
        description: null,
        layout: "grid",
        config: {},
      },
      3
    ),
    makeResource(
      "content_entry",
      "aurora",
      {
        contentTypeId: ids.contentType,
        title: `Aurora ${scope}`,
        slug: slug("aurora"),
        status: "draft",
        data: { summary: "Visible" },
      },
      4
    ),
    makeResource(
      "listing_query",
      "projects",
      {
        name: `Projects ${scope}`,
        description: null,
        query: { source: "content" },
      },
      5
    ),
    makeResource(
      "detail_page",
      "project-detail",
      {
        name: `Project detail ${scope}`,
        contentTypeId: ids.contentType,
      },
      6
    ),
    makeResource(
      "page",
      "home",
      {
        slug: slug("home"),
        title: `Home ${scope}`,
        status: "draft",
        data: { sections: [] },
      },
      7
    ),
    makeResource(
      "menu",
      "primary",
      {
        name: `Primary ${scope}`,
        location: null,
        status: "draft",
        settings: null,
        items: [],
      },
      8
    ),
    makeResource("setting", settingKey, { value: `Value ${scope}` }, 9),
  ] as const;

  try {
    await db.insert(contentTypes).values({
      id: ids.contentType,
      name: `Project ${scope}`,
      slug: slug("project-type"),
      schema: {},
      status: "draft",
      config: {},
    });
    await db.insert(forms).values({
      id: ids.form,
      name: `Brief ${scope}`,
      slug: slug("brief"),
      status: "draft",
      settings: {},
    });
    await db.insert(pageTemplates).values({
      id: ids.pageTemplate,
      name: `Landing ${scope}`,
      slug: slug("landing-template"),
      status: "draft",
      document: { sections: [] },
    });
    await db.insert(listingTemplates).values({
      id: ids.listingTemplate,
      name: `Cards ${scope}`,
      slug: slug("cards-template"),
      layout: "grid",
      config: {},
    });
    await db.insert(listingQueries).values({
      id: ids.listingQuery,
      name: `Projects ${scope}`,
      query: { source: "content" },
    });
    await db.insert(pages).values({
      id: ids.page,
      slug: slug("home"),
      title: `Home ${scope}`,
      status: "draft",
      currentData: { sections: [] },
    });
    await db.insert(menus).values({
      id: ids.menu,
      name: `Primary ${scope}`,
      status: "draft",
      settings: null,
    });
    await db.insert(settings).values({ key: settingKey, value: `Value ${scope}` });
    await db.insert(contentEntries).values({
      id: ids.entry,
      typeId: ids.contentType,
      title: `Aurora ${scope}`,
      slug: slug("aurora"),
      status: "draft",
      data: { summary: "Visible" },
      accessPassword: "hashed-secret-must-not-project",
    });
    await db.insert(detailPageDocuments).values({
      id: ids.detailPage,
      name: `Project detail ${scope}`,
      contentTypeId: ids.contentType,
      status: "draft",
      currentDocument: { name: `Project detail ${scope}`, sections: [] },
    });

    const result = await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        return readFullSitePlanningResourcesBatch(tx, {
          resources,
          evidence: noEvidence(resources),
        });
      },
      { isolationLevel: "read committed" }
    );

    expect(result.map((row) => row.identity)).toEqual(resources.map((row) => row.identity));
    expect(result.map((row) => row.current?.id)).toEqual([
      ids.contentType,
      ids.form,
      ids.pageTemplate,
      ids.listingTemplate,
      ids.entry,
      ids.listingQuery,
      ids.detailPage,
      ids.page,
      ids.menu,
      settingKey,
    ]);
    expect(result[4]?.current?.desired).not.toHaveProperty("accessPassword");
    expect(result[1]?.current?.desired).toMatchObject({ fields: [], actions: [] });
    expect(result[8]?.current?.desired).toMatchObject({ items: [] });
  } finally {
    await db.delete(contentEntries).where(eq(contentEntries.id, ids.entry));
    await db.delete(detailPageDocuments).where(eq(detailPageDocuments.id, ids.detailPage));
    await db.delete(forms).where(eq(forms.id, ids.form));
    await db.delete(pageTemplates).where(eq(pageTemplates.id, ids.pageTemplate));
    await db.delete(listingTemplates).where(eq(listingTemplates.id, ids.listingTemplate));
    await db.delete(listingQueries).where(eq(listingQueries.id, ids.listingQuery));
    await db.delete(pages).where(eq(pages.id, ids.page));
    await db.delete(menus).where(eq(menus.id, ids.menu));
    await db.delete(contentTypes).where(eq(contentTypes.id, ids.contentType));
    if (priorSetting) {
      await db
        .insert(settings)
        .values(priorSetting)
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: priorSetting.value, updatedAt: priorSetting.updatedAt },
        });
    } else {
      await db.delete(settings).where(eq(settings.key, settingKey));
    }
  }
}, 360_000);

test("planning base batch preserves exact 0/1/512 order and rejects 513", async () => {
  await expect(
    readFullSitePlanningResourcesBatch(db, { resources: [], evidence: [] })
  ).resolves.toEqual([]);
  for (const count of [1, 512]) {
    const resources = Array.from({ length: count }, (_, index) =>
      makeResource("setting", `absent-${randomUUID()}-${index}`, { value: index }, index)
    );
    const result = await readFullSitePlanningResourcesBatch(db, {
      resources,
      evidence: noEvidence(resources),
    });
    expect(result.map((row) => row.identity)).toEqual(resources.map((row) => row.identity));
    expect(result.every((row) => row.current === null)).toBe(true);
  }
  const tooMany = Array.from({ length: 513 }, (_, index) =>
    makeResource("setting", `too-many-${index}`, { value: index }, index)
  );
  await expect(
    readFullSitePlanningResourcesBatch(db, {
      resources: tooMany,
      evidence: noEvidence(tooMany),
    })
  ).rejects.toThrow("site_package_too_large");
}, 360_000);
