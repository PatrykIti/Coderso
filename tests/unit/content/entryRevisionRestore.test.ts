import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentRevisions, contentTypes, users } from "../../../core/db/schema";
import {
  createEntry,
  listEntryRevisions,
  publishEntry,
  restoreEntryRevision,
  updateEntry,
} from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import { buildEmailFields } from "../../../core/services/security/piiEmail";
import { deleteSetting, setSetting } from "../../../core/services/settings/settingsService";
import {
  buildSiteCacheKey,
  clearSiteCache,
  getSiteCacheEntry,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string" },
  },
};

const uniqueName = (prefix: string) => `${prefix} ${randomUUID()}`;

type Fixture = {
  actorId: string;
  entryId: string;
  typeId: string;
  typeSlug: string;
};

/**
 * Every test in this file owns its rows: users, content types, entries and
 * revisions are deleted in the `finally` of the fixture helper, and the
 * file-level `afterAll` only sweeps rows the tests may not have reached.
 */
const withEntryRevisionFixture = async <T>(run: (fixture: Fixture) => Promise<T>): Promise<T> => {
  let actorId: string | undefined;
  let typeId: string | undefined;
  let entryId: string | undefined;

  try {
    const [actor] = await db
      .insert(users)
      .values({
        email: `revision-actor-${randomUUID()}@example.com`,
        passwordHash: "test",
        status: "active",
      })
      .returning({ id: users.id });
    if (!actor) throw new Error("missing_revision_actor");
    actorId = actor.id;

    const type = await createContentType({
      name: uniqueName("Revision entry"),
      slug: `revision-entry-${randomUUID()}`,
      schema,
    });
    typeId = type.id;

    const entry = await createEntry(type.id, {
      title: "Revision fixture",
      slug: `revision-fixture-${randomUUID()}`,
      data: { title: "Revision fixture" },
      authorId: actor.id,
    });
    entryId = entry.id;

    return await run({
      actorId: actor.id,
      entryId: entry.id,
      typeId: type.id,
      typeSlug: type.slug,
    });
  } finally {
    if (entryId) {
      await db.delete(contentRevisions).where(eq(contentRevisions.entryId, entryId));
      await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
    }
    if (typeId) await db.delete(contentTypes).where(eq(contentTypes.id, typeId));
    if (actorId) await db.delete(users).where(eq(users.id, actorId));
  }
};

afterAll(async () => {
  clearSiteCache();
});

testIfDbWithOptions(
  "listEntryRevisions joins authors and redacts encrypted email",
  async () => {
    await withEntryRevisionFixture(async (fixture) => {
      // The actor's email is stored ENCRYPTED (plaintext column holds a hash), so
      // the read shape must resolve the decrypted value and never leak the raw
      // hash or the encrypted payload.
      const email = `encrypted-${randomUUID()}@example.com`;
      await db.update(users).set(buildEmailFields(email)).where(eq(users.id, fixture.actorId));

      await publishEntry(fixture.entryId, fixture.actorId);
      await publishEntry(fixture.entryId, fixture.actorId);

      const revisions = await listEntryRevisions(fixture.entryId);
      expect(revisions).toHaveLength(2);
      expect(revisions[0]?.version).toBe(2);
      expect(revisions[1]?.version).toBe(1);
      expect(revisions[0]?.entryId).toBe(fixture.entryId);
      expect(revisions[0]?.createdAt).toBeInstanceOf(Date);

      const author = revisions[0]?.createdBy;
      expect(author?.id).toBe(fixture.actorId);
      expect(author?.email).toBe(email);
      const serialized = JSON.stringify(revisions);
      expect(serialized).toContain(email);
      expect(serialized).not.toContain("emailEncrypted");
      expect(serialized).not.toContain("email_hash");
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "restoreEntryRevision restores an earlier snapshot and snapshots the current state",
  async () => {
    await withEntryRevisionFixture(async (fixture) => {
      await publishEntry(fixture.entryId, fixture.actorId);
      await updateEntry(fixture.entryId, { data: { title: "Second version" } });

      const revisionsBefore = await listEntryRevisions(fixture.entryId);
      expect(revisionsBefore).toHaveLength(1);
      const firstRevision = revisionsBefore[0];
      if (!firstRevision) throw new Error("missing_revision");

      const result = await restoreEntryRevision(fixture.entryId, firstRevision.id, fixture.actorId);
      expect(result.restored).toBe(true);
      expect(result.entry?.data).toEqual({ title: "Revision fixture" });

      const stored = await db
        .select({ data: contentEntries.data })
        .from(contentEntries)
        .where(eq(contentEntries.id, fixture.entryId));
      expect(stored[0]?.data).toEqual({ title: "Revision fixture" });

      // The current state was snapshotted BEFORE the restore, so the entry now
      // has two revisions: the pre-restore snapshot (v2) and the restored one (v1).
      const revisionsAfter = await listEntryRevisions(fixture.entryId);
      expect(revisionsAfter).toHaveLength(2);
      expect(revisionsAfter[0]?.version).toBe(2);
      expect(revisionsAfter[0]?.data).toEqual({ title: "Second version" });
      expect(revisionsAfter[0]?.createdBy?.id).toBe(fixture.actorId);
      expect(revisionsAfter[1]?.id).toBe(firstRevision.id);
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "restoreEntryRevision is a no-op for the already-current snapshot",
  async () => {
    await withEntryRevisionFixture(async (fixture) => {
      await publishEntry(fixture.entryId, fixture.actorId);

      const revisions = await listEntryRevisions(fixture.entryId);
      const onlyRevision = revisions[0];
      if (!onlyRevision) throw new Error("missing_revision");

      const result = await restoreEntryRevision(fixture.entryId, onlyRevision.id, fixture.actorId);
      expect(result.restored).toBe(false);
      expect(result.entry?.data).toEqual({ title: "Revision fixture" });

      const revisionsAfter = await listEntryRevisions(fixture.entryId);
      expect(revisionsAfter).toHaveLength(1);
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "restoreEntryRevision throws entry_revision_not_found for an unknown revision",
  async () => {
    await withEntryRevisionFixture(async (fixture) => {
      await publishEntry(fixture.entryId, fixture.actorId);
      await expect(
        restoreEntryRevision(fixture.entryId, randomUUID(), fixture.actorId)
      ).rejects.toThrow("entry_revision_not_found");
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "restoreEntryRevision invalidates the entry site cache after commit",
  async () => {
    await withEntryRevisionFixture(async (fixture) => {
      await publishEntry(fixture.entryId, fixture.actorId);
      await updateEntry(fixture.entryId, { data: { title: "Second version" } });

      const routes = [
        {
          type: fixture.typeSlug,
          listPath: "/revision-list",
          detailPath: "/revision-list/:slug",
        },
      ];
      await setSetting("site.contentRoutes", routes);

      const entry = await db
        .select({ slug: contentEntries.slug })
        .from(contentEntries)
        .where(eq(contentEntries.id, fixture.entryId));
      const entrySlug = entry[0]?.slug;
      if (!entrySlug) throw new Error("missing_entry_slug");

      const listKey = buildSiteCacheKey("default", "/revision-list", "");
      const detailKey = buildSiteCacheKey("default", `/revision-list/${entrySlug}`, "");
      setSiteCacheEntry(listKey, "cached-html", 60);
      setSiteCacheEntry(detailKey, "cached-html", 60);
      expect(getSiteCacheEntry(listKey)).toBe("cached-html");
      expect(getSiteCacheEntry(detailKey)).toBe("cached-html");

      try {
        const revisions = await listEntryRevisions(fixture.entryId);
        const firstRevision = revisions[0];
        if (!firstRevision) throw new Error("missing_revision");
        const result = await restoreEntryRevision(
          fixture.entryId,
          firstRevision.id,
          fixture.actorId
        );
        expect(result.restored).toBe(true);
        expect(getSiteCacheEntry(listKey)).toBeNull();
        expect(getSiteCacheEntry(detailKey)).toBeNull();
      } finally {
        clearSiteCache();
        await deleteSetting("site.contentRoutes");
      }
    });
  },
  { timeout: 45_000 }
);
