import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  previewTokens,
  users,
} from "../../../core/db/schema";
import { createEntry, updateEntryMetadata } from "../../../core/services/content/entryService";
import {
  buildDeterministicDetailPageId,
  normalizeDetailPageDocument,
} from "../../../core/services/content/detailPageSchema";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import { createContentType } from "../../../core/services/content/typeService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { clearSiteCache } from "../../../core/site/cache/siteCache";

type RuntimeFixtureSpec = {
  key: string;
  name: string;
  slugBase: string;
  listBase: string;
  schema: Record<string, unknown>;
  entryData: Record<string, unknown>;
  headline: string;
  summary: string;
  primaryFact: string;
  staticBody: string;
};

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 30_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedUserIds = new Set<string>();
const trackedContentEntryIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
const trackedDetailPageIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

const rememberSetting = async (key: string) => {
  if (settingSnapshots.has(key)) return;
  const row = await getSettingRecord(key);
  settingSnapshots.set(key, {
    exists: Boolean(row),
    value: row?.value,
  });
};

const setTestSetting = async (key: string, value: unknown) => {
  await rememberSetting(key);
  await setSetting(key, value);
};

const restoreSettings = async () => {
  for (const [key, snapshot] of [...settingSnapshots].reverse()) {
    if (snapshot.exists) {
      await setSetting(key, snapshot.value);
    } else {
      await deleteSetting(key);
    }
  }
  settingSnapshots.clear();
};

const cleanupTrackedRows = async () => {
  const detailPageIds = [...trackedDetailPageIds];
  const contentEntryIds = [...trackedContentEntryIds];
  const contentTypeIds = [...trackedContentTypeIds];
  const userIds = [...trackedUserIds];

  if (detailPageIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, detailPageIds));
    await db.delete(detailPageDocuments).where(inArray(detailPageDocuments.id, detailPageIds));
  }
  if (contentEntryIds.length > 0) {
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, contentEntryIds));
    await db.delete(contentEntries).where(inArray(contentEntries.id, contentEntryIds));
  }
  if (contentTypeIds.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, contentTypeIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedDetailPageIds.clear();
  trackedContentEntryIds.clear();
  trackedContentTypeIds.clear();
  trackedUserIds.clear();
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const requestPublicPath = (path: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      headers: {
        "user-agent": "detail-page-composer-runtime-test",
        "x-forwarded-for": `127.0.2.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

const layoutSettings = {
  wrapper: {
    container: "default",
    padding: { top: "md", bottom: "lg" },
    background: {
      color: "#ffffff",
      image: null,
      media: {
        type: "none",
        source: "external",
        src: null,
      },
    },
  },
  sections: {
    gap: "lg",
    defaults: {
      container: "default",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "none", bottom: "none" },
    },
  },
  applyDefaultsToNewBlocks: false,
};

const textField = (title: string) => ({
  type: "string",
  title,
  xFieldType: "text",
});

const textareaField = (title: string) => ({
  type: "string",
  title,
  xFieldType: "textarea",
});

const createSchema = (fields: Record<string, Record<string, unknown>>) => ({
  type: "object",
  additionalProperties: false,
  properties: fields,
});

const runtimeFixtures: RuntimeFixtureSpec[] = [
  {
    key: "house-project-catalog",
    name: "House Projects",
    slugBase: "composer-house-projects",
    listBase: "composer-houses",
    schema: createSchema({
      headline: textField("Headline"),
      summary: textareaField("Summary"),
      primaryFact: textField("Price"),
    }),
    entryData: {
      headline: "Composer runtime house",
      summary: "Runtime specification, price and inquiry CTA.",
      primaryFact: "runtime 420k PLN",
    },
    headline: "Composer runtime house",
    summary: "Runtime specification, price and inquiry CTA.",
    primaryFact: "runtime 420k PLN",
    staticBody: "House composer runtime static body",
  },
  {
    key: "product-catalog",
    name: "Products",
    slugBase: "composer-products",
    listBase: "composer-products",
    schema: createSchema({
      headline: textField("Headline"),
      summary: textareaField("Summary"),
      primaryFact: textField("Price"),
    }),
    entryData: {
      headline: "Composer runtime product",
      summary: "Runtime gallery, specs and inquiry form.",
      primaryFact: "runtime $799",
    },
    headline: "Composer runtime product",
    summary: "Runtime gallery, specs and inquiry form.",
    primaryFact: "runtime $799",
    staticBody: "Product composer runtime static body",
  },
  {
    key: "services-directory",
    name: "Services",
    slugBase: "composer-services",
    listBase: "composer-services",
    schema: createSchema({
      headline: textField("Headline"),
      summary: textareaField("Summary"),
      primaryFact: textField("Timeline"),
    }),
    entryData: {
      headline: "Composer runtime service",
      summary: "Runtime offer, process, FAQ and CTA.",
      primaryFact: "runtime 2 weeks",
    },
    headline: "Composer runtime service",
    summary: "Runtime offer, process, FAQ and CTA.",
    primaryFact: "runtime 2 weeks",
    staticBody: "Service composer runtime static body",
  },
  {
    key: "portfolio-case-study",
    name: "Case Studies",
    slugBase: "composer-case-studies",
    listBase: "composer-case-studies",
    schema: createSchema({
      headline: textField("Headline"),
      summary: textareaField("Summary"),
      primaryFact: textField("Result"),
    }),
    entryData: {
      headline: "Composer runtime case study",
      summary: "Runtime challenge, solution, result and CTA.",
      primaryFact: "runtime +64%",
    },
    headline: "Composer runtime case study",
    summary: "Runtime challenge, solution, result and CTA.",
    primaryFact: "runtime +64%",
    staticBody: "Case study composer runtime static body",
  },
];

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `detail-page-composer-runtime-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (!actor?.id) throw new Error("missing_detail_page_composer_runtime_actor");
  trackedUserIds.add(actor.id);
  return actor;
};

const createDocument = (input: {
  spec: RuntimeFixtureSpec;
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
  status?: "draft" | "published";
  staticBody?: string;
}): DetailPageDocument =>
  normalizeDetailPageDocument({
    schemaVersion: 1,
    id: input.id,
    name: `${input.spec.name} composer detail`,
    contentTypeId: input.contentTypeId,
    contentTypeSlug: input.contentTypeSlug,
    status: input.status ?? "published",
    titlePattern: "{{ title }}",
    settings: {
      template: "detail",
      layout: layoutSettings,
    },
    blocks: [
      {
        id: "detail-hero",
        type: "hero",
        variant: "centered",
        data: {
          headline: `${input.spec.name} detail headline`,
          body: input.staticBody ?? input.spec.staticBody,
        },
      },
      {
        id: "detail-facts",
        type: "feature-grid",
        data: {
          header: {
            title: `${input.spec.name} facts`,
            description: "Runtime fixture facts.",
          },
          items: [
            {
              id: "primary-fact",
              title: "TBD",
              description: "Bound from the published entry.",
            },
          ],
        },
      },
      {
        id: "detail-cta",
        type: "cta-banner",
        data: {
          content: {
            title: `${input.spec.name} CTA`,
            description: input.staticBody ?? input.spec.staticBody,
          },
          actions: {
            primaryCta: {
              label: "Open detail",
              href: "#",
            },
          },
        },
      },
    ],
    bindings: [
      {
        id: "binding-headline",
        blockId: "detail-hero",
        propPath: "headline",
        source: {
          kind: "entry-field",
          field: "headline",
        },
        transform: "text",
        required: true,
      },
      {
        id: "binding-summary",
        blockId: "detail-hero",
        propPath: "body",
        source: {
          kind: "entry-field",
          field: "summary",
        },
        transform: "text",
        required: true,
      },
      {
        id: "binding-fact",
        blockId: "detail-facts",
        propPath: "items.0.title",
        source: {
          kind: "entry-field",
          field: "primaryFact",
        },
        transform: "text",
        required: true,
      },
      {
        id: "binding-href",
        blockId: "detail-cta",
        propPath: "actions.primaryCta.href",
        source: {
          kind: "computed",
          resolver: "detailHref",
        },
        transform: "text",
      },
    ],
  });

const createRuntimeFixture = async (
  spec: RuntimeFixtureSpec,
  status: "draft" | "published" = "published"
) => {
  const actor = await createActor();
  const token = randomUUID().slice(0, 8);
  const contentType = await createContentType({
    name: `${spec.name} ${token}`,
    slug: `${spec.slugBase}-${token}`,
    schema: spec.schema,
  });
  trackedContentTypeIds.add(contentType.id);

  const entry = await createEntry(contentType.id, {
    title: `${spec.name} entry ${token}`,
    slug: `${spec.key}-${token}`,
    authorId: actor.id,
    data: spec.entryData,
  });
  if (!entry) throw new Error("missing_detail_page_composer_runtime_entry");
  trackedContentEntryIds.add(entry.id);
  if (status === "published") {
    await updateEntryMetadata(entry.id, { status: "published" }, actor.id);
  }

  return {
    actor,
    contentType,
    entry,
    token,
  };
};

const insertDetailPageDocument = async (input: {
  spec: RuntimeFixtureSpec;
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
  status?: "draft" | "published";
  currentBody?: string;
  publishedBody?: string;
}) => {
  const currentDocument = createDocument({
    spec: input.spec,
    id: input.id,
    contentTypeId: input.contentTypeId,
    contentTypeSlug: input.contentTypeSlug,
    status: input.status ?? "published",
    staticBody: input.currentBody,
  });
  const publishedDocument =
    input.publishedBody === undefined
      ? currentDocument
      : createDocument({
          spec: input.spec,
          id: input.id,
          contentTypeId: input.contentTypeId,
          contentTypeSlug: input.contentTypeSlug,
          status: "published",
          staticBody: input.publishedBody,
        });

  await db.insert(detailPageDocuments).values({
    id: input.id,
    name: `${input.spec.name} composer detail`,
    contentTypeId: input.contentTypeId,
    status: input.status ?? "published",
    currentDocument,
    publishedDocument,
  });
  trackedDetailPageIds.add(input.id);
};

const setFixtureRoute = async (input: {
  contentTypeSlug: string;
  listPath: string;
  detailPath: string;
  detailPageId?: string | null;
}) => {
  await setTestSetting("site.contentRoutes", [
    {
      type: input.contentTypeSlug,
      listPath: input.listPath,
      detailPath: input.detailPath,
      enabled: true,
      ...(input.detailPageId !== undefined ? { detailPageId: input.detailPageId } : {}),
    } satisfies ContentRouteSetting,
  ]);
};

const assertComposedDetailPage = async (spec: RuntimeFixtureSpec) => {
  resetRateLimitBuckets();
  await setTestSetting("site.cacheTtlSeconds", 0);

  const fixture = await createRuntimeFixture(spec, "published");
  const detailPageId = buildDeterministicDetailPageId({
    contentTypeId: fixture.contentType.id,
    pageRole: "supporting-page",
    compositionKey: `${spec.key}-${fixture.token}`,
  });
  await insertDetailPageDocument({
    spec,
    id: detailPageId,
    contentTypeId: fixture.contentType.id,
    contentTypeSlug: fixture.contentType.slug,
  });
  await setFixtureRoute({
    contentTypeSlug: fixture.contentType.slug,
    listPath: `/${spec.listBase}-${fixture.token}`,
    detailPath: `/${spec.listBase}-${fixture.token}/:slug`,
    detailPageId,
  });

  const response = await requestPublicPath(
    `/${spec.listBase}-${fixture.token}/${fixture.entry.slug}`
  );
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain(spec.headline);
  expect(html).toContain(spec.summary);
  expect(html).toContain(spec.primaryFact);
  expect(html).toContain(`/${spec.listBase}-${fixture.token}/${fixture.entry.slug}`);
};

for (const spec of runtimeFixtures) {
  testIfDbWithOptions(
    `runtime renders the ${spec.key} composed detail-page fixture`,
    async () => assertComposedDetailPage(spec),
    { timeout: dbRuntimeTimeout }
  );
}

testIfDbWithOptions(
  "draft entries stay hidden behind route-linked detail pages",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const spec = runtimeFixtures[0]!;
    const fixture = await createRuntimeFixture(spec, "draft");
    const detailPageId = randomUUID();
    await insertDetailPageDocument({
      spec,
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
    });
    await setFixtureRoute({
      contentTypeSlug: fixture.contentType.slug,
      listPath: `/${spec.listBase}-${fixture.token}`,
      detailPath: `/${spec.listBase}-${fixture.token}/:slug`,
      detailPageId,
    });

    const response = await requestPublicPath(
      `/${spec.listBase}-${fixture.token}/${fixture.entry.slug}`
    );
    expect(response.status).toBe(404);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "detail-page preview renders current draft detail data with a valid token only",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.previewEnabled", true);
    await setTestSetting("site.cacheTtlSeconds", 0);

    const spec = runtimeFixtures[1]!;
    const fixture = await createRuntimeFixture(spec, "published");
    const detailPageId = randomUUID();
    await insertDetailPageDocument({
      spec,
      id: detailPageId,
      contentTypeId: fixture.contentType.id,
      contentTypeSlug: fixture.contentType.slug,
      status: "draft",
      currentBody: "Draft composer preview body",
      publishedBody: "Published composer preview body",
    });

    const { token } = await createPreviewToken({
      targetType: "detail-page",
      targetId: detailPageId,
      context: {
        kind: "detail-page",
        sampleEntryId: fixture.entry.id,
      },
    });

    const response = await requestPublicPath(
      `/preview?type=detail-page&token=${encodeURIComponent(token)}`
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(spec.headline);
    expect(html).toContain("Draft composer preview body");
    expect(html).not.toContain("Published composer preview body");
    expect(html).toContain("Preview mode");
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "legacy content detail route still renders without a linked detail-page document",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const spec = runtimeFixtures[2]!;
    const fixture = await createRuntimeFixture(spec, "published");
    await setFixtureRoute({
      contentTypeSlug: fixture.contentType.slug,
      listPath: `/${spec.listBase}-${fixture.token}`,
      detailPath: `/${spec.listBase}-${fixture.token}/:slug`,
    });

    const response = await requestPublicPath(
      `/${spec.listBase}-${fixture.token}/${fixture.entry.slug}`
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('data-template="content-detail"');
    expect(html).toContain(spec.headline);
    expect(html).not.toContain(spec.staticBody);
  },
  { timeout: dbRuntimeTimeout }
);
