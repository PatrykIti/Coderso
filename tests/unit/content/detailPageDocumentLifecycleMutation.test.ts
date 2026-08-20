import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentTypes, detailPageDocuments, users } from "../../../core/db/schema";
import {
  captureDetailPageDocumentLifecycleNativeSnapshot,
  mutateDetailPageDocumentLifecycleAtomic,
  prepareDetailPageDocumentLifecycleNativeTargets,
} from "../../../core/services/content/detailPageDocumentService";

const dbTestTimeoutMs = 360_000;
const ownedDetailPageIds = new Set<string>();
const ownedContentTypeIds = new Set<string>();
const ownedUserIds = new Set<string>();
const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  for (const id of ownedDetailPageIds) {
    await db.delete(detailPageDocuments).where(eq(detailPageDocuments.id, id));
  }
  for (const id of ownedContentTypeIds) {
    await db.delete(contentTypes).where(eq(contentTypes.id, id));
  }
  for (const id of ownedUserIds) await db.delete(users).where(eq(users.id, id));
  ownedDetailPageIds.clear();
  ownedContentTypeIds.clear();
  ownedUserIds.clear();
});

const createRoots = async () => {
  const actorId = crypto.randomUUID();
  const contentTypeId = crypto.randomUUID();
  const contentTypeSlug = `detail-lifecycle-${contentTypeId}`;
  ownedUserIds.add(actorId);
  ownedContentTypeIds.add(contentTypeId);
  await db.insert(users).values({
    id: actorId,
    email: `detail-lifecycle-${actorId}@example.com`,
    passwordHash: "test",
    status: "active",
  });
  await db.insert(contentTypes).values({
    id: contentTypeId,
    name: `Detail lifecycle ${contentTypeId}`,
    slug: contentTypeSlug,
    schema: { type: "object", additionalProperties: false, properties: {} },
  });
  return { actorId, contentTypeId, contentTypeSlug };
};

const packageDesired = (contentTypeId: string, contentTypeSlug: string) => ({
  schemaVersion: 2,
  name: "Atomic detail page",
  contentTypeId,
  contentTypeSlug,
  status: "published" as const,
  titlePattern: "{{ title }}",
  settings: { template: "detail", layout: {} },
  sections: [
    {
      id: "hero-section",
      type: "content",
      variant: "default",
      layout: {
        columns: 1,
        align: "start",
        justify: "start",
        maxWidth: 1080,
        stackVertical: false,
      },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: { paddingTop: 64, paddingBottom: 64, paddingLeft: 40, paddingRight: 40, gap: 24 },
      visibility: { visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null },
      responsive: {},
      blocks: [{ id: "hero-heading", type: "heading", props: { text: "Detail" } }],
    },
  ],
  bindings: [
    {
      id: "title-binding",
      blockId: "hero-heading",
      propPath: "text",
      source: { kind: "entry-meta" as const, field: "title" as const },
    },
  ],
});

testIfDb(
  "stages and publishes one exact Detail Page aggregate",
  async () => {
    const { actorId, contentTypeId, contentTypeSlug } = await createRoots();
    const id = crypto.randomUUID();
    ownedDetailPageIds.add(id);
    const targets = prepareDetailPageDocumentLifecycleNativeTargets({
      id,
      desired: packageDesired(contentTypeId, contentTypeSlug),
      actorId,
      expectedCurrent: null,
      revisionId: crypto.randomUUID(),
      publicationTimestamp: "2026-08-06T12:00:00.000Z",
    });
    expect(targets.staged?.desired.status).toBe("draft");
    expect(targets.complete.desired.revisions).toHaveLength(1);

    const staged = await mutateDetailPageDocumentLifecycleAtomic({
      operation: "create",
      id,
      desired: targets.staged!.desired,
      actorId,
    });
    expect(staged.snapshot).toEqual(targets.staged);
    const durableStaged = JSON.parse(JSON.stringify(targets.staged)) as typeof targets.staged;
    const published = await mutateDetailPageDocumentLifecycleAtomic({
      operation: "replace",
      id,
      desired: targets.complete.desired,
      expectedCurrent: durableStaged!,
      actorId,
    });
    expect(published.snapshot).toEqual(targets.complete);
    expect(await captureDetailPageDocumentLifecycleNativeSnapshot(id)).toEqual(targets.complete);

    await mutateDetailPageDocumentLifecycleAtomic({
      operation: "delete",
      id,
      expectedCurrent: targets.complete,
      actorId,
    });
    ownedDetailPageIds.delete(id);
  },
  dbTestTimeoutMs
);

testIfDb(
  "rejects stale Detail Page CAS before mutation",
  async () => {
    const { actorId, contentTypeId, contentTypeSlug } = await createRoots();
    const id = crypto.randomUUID();
    ownedDetailPageIds.add(id);
    const targets = prepareDetailPageDocumentLifecycleNativeTargets({
      id,
      desired: { ...packageDesired(contentTypeId, contentTypeSlug), status: "draft" },
      actorId,
      expectedCurrent: null,
      revisionId: crypto.randomUUID(),
      publicationTimestamp: "2026-08-06T12:00:00.000Z",
    });
    const created = await mutateDetailPageDocumentLifecycleAtomic({
      operation: "create",
      id,
      desired: targets.complete.desired,
      actorId,
    });
    await expect(
      mutateDetailPageDocumentLifecycleAtomic({
        operation: "delete",
        id,
        expectedCurrent: {
          ...created.snapshot!,
          desired: { ...created.snapshot!.desired, name: "Stale" },
        },
        actorId,
      })
    ).rejects.toThrow("site_package_state_changed");
    expect(await captureDetailPageDocumentLifecycleNativeSnapshot(id)).toEqual(created.snapshot);
  },
  dbTestTimeoutMs
);
