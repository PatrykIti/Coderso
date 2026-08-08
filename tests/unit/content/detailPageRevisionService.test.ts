import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentTypes,
  detailPageDocuments,
  detailPageRevisions,
  users,
} from "../../../core/db/schema";
import {
  autosaveDetailPageDocument,
  createDetailPageDraftDocument,
  getDetailPageDocument,
  publishDetailPageDocument,
  updateDetailPageDraftDocument,
} from "../../../core/services/content/detailPageDocumentService";
import {
  discardDetailPageAutosaveRevision,
  listDetailPageRevisions,
  restoreDetailPageRevision,
} from "../../../core/services/content/detailPageRevisionService";
import { createContentType, deleteContentType } from "../../../core/services/content/typeService";

const canConnect = async (): Promise<boolean> => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const detailPageIds = new Set<string>();
const contentTypeIds = new Set<string>();
const userIds = new Set<string>();

afterEach(async () => {
  if (!hasDb) return;
  if (detailPageIds.size > 0) {
    await db.delete(detailPageDocuments).where(inArray(detailPageDocuments.id, [...detailPageIds]));
  }
  detailPageIds.clear();
  for (const id of contentTypeIds) {
    await deleteContentType(id).catch(async () => {
      await db.delete(contentTypes).where(eq(contentTypes.id, id));
    });
  }
  contentTypeIds.clear();
  if (userIds.size > 0) await db.delete(users).where(inArray(users.id, [...userIds]));
  userIds.clear();
});

const schema = {
  type: "object",
  additionalProperties: false,
  properties: { headline: { type: "string", xFieldType: "text" } },
};

const documentInput = (contentTypeId: string, contentTypeSlug: string, name: string) => ({
  name,
  contentTypeId,
  contentTypeSlug,
  status: "draft" as const,
  titlePattern: "{{ title }}",
  settings: { template: "detail", layout: {} },
  blocks: [{ id: "hero", type: "hero", data: { headline: name } }],
  bindings: [],
});

const fixture = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `detail-revision-${randomUUID()}@example.test`,
      passwordHash: "test-only-password-hash",
      status: "active",
    })
    .returning({ id: users.id });
  if (!actor) throw new Error("detail_revision_actor_missing");
  userIds.add(actor.id);
  const contentType = await createContentType({
    name: `Revision type ${randomUUID()}`,
    slug: `revision-type-${randomUUID()}`,
    schema,
  });
  contentTypeIds.add(contentType.id);
  const created = await createDetailPageDraftDocument({
    document: documentInput(contentType.id, contentType.slug, "Initial detail"),
  });
  detailPageIds.add(created.record.id);
  return { actorId: actor.id, contentType, detailPageId: created.record.id };
};

testIfDb(
  "restores and discards one owned detail Page autosave revision atomically",
  async () => {
    const { actorId, contentType, detailPageId } = await fixture();
    const autosave = await autosaveDetailPageDocument(
      detailPageId,
      { document: documentInput(contentType.id, contentType.slug, "Saved revision") },
      actorId
    );
    await updateDetailPageDraftDocument(detailPageId, {
      document: documentInput(contentType.id, contentType.slug, "Current draft"),
    });

    const restored = await restoreDetailPageRevision(detailPageId, autosave.revision.id);
    expect(restored).toMatchObject({
      restored: true,
      revision: { id: autosave.revision.id, kind: "autosave" },
      detailPage: { id: detailPageId, name: "Saved revision", status: "draft" },
    });
    expect(await getDetailPageDocument(detailPageId)).toMatchObject({
      currentDocument: { name: "Saved revision", status: "draft" },
    });
    expect((await restoreDetailPageRevision(detailPageId, autosave.revision.id)).restored).toBe(
      false
    );

    const discarded = await discardDetailPageAutosaveRevision(detailPageId, autosave.revision.id);
    expect(discarded).toMatchObject({ id: autosave.revision.id, kind: "autosave" });
    expect(await listDetailPageRevisions(detailPageId)).toEqual([]);
  },
  360_000
);

testIfDb(
  "never discards publish revisions or revisions owned by another detail Page",
  async () => {
    const first = await fixture();
    const second = await fixture();
    await publishDetailPageDocument(first.detailPageId, first.actorId);
    const [published] = await db
      .select({ id: detailPageRevisions.id })
      .from(detailPageRevisions)
      .where(eq(detailPageRevisions.detailPageId, first.detailPageId));
    if (!published) throw new Error("publish_revision_missing");

    await expect(
      discardDetailPageAutosaveRevision(first.detailPageId, published.id)
    ).rejects.toThrow("detail_page_revision_delete_forbidden");
    await expect(restoreDetailPageRevision(second.detailPageId, published.id)).rejects.toThrow(
      "detail_page_revision_not_found"
    );
    expect(await listDetailPageRevisions(first.detailPageId)).toHaveLength(1);
  },
  360_000
);
