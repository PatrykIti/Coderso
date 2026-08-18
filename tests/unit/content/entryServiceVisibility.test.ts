import { afterAll, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { contentEntries, contentRevisions, contentTypes, users } from "../../../core/db/schema";
import {
  createEntry,
  duplicateEntry,
  getEntry,
  getEntryBySlug,
  listEntries,
  listEntriesWithContentTypes,
  publishEntry,
  unpublishEntry,
  updateEntryMetadata,
} from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import {
  cleanup,
  entryServiceTestState,
  hasSecretKey,
  schema,
  testIfDb,
  testIfDbWithOptions,
  uniqueName,
} from "./support/entryServiceTestSupport";

afterAll(async () => {
  await cleanup();
});

// TASK-514-01: entry visibility (schema + service round-trip + secret never leaks).

testIfDbWithOptions(
  "entry visibility round-trips and never echoes the access password",
  async () => {
    let localContentTypeId: string | undefined;
    let localEntryId: string | undefined;
    let localUserId: string | undefined;

    try {
      const [user] = await db
        .insert(users)
        .values({
          email: `visibility-${randomUUID()}@example.com`,
          passwordHash: "test",
          status: "active",
        })
        .returning();
      localUserId = user?.id;

      const type = await createContentType({
        name: uniqueName("Visibility"),
        slug: `visibility-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const slug = `entry-${randomUUID()}`;
      const created = await createEntry(type.id, {
        title: "Visible Entry",
        slug,
        data: { title: "Hello" },
      });
      localEntryId = created?.id;

      // AC#2b/#8: fresh create is narrowed through getEntry — defaults + no secret.
      expect(created?.visibility).toBe("public");
      expect(created?.hasPassword).toBe(false);
      expect(hasSecretKey(created)).toBe(false);

      // public -> private (no password involved)
      const priv = await updateEntryMetadata(created!.id, { visibility: "private" });
      expect(priv?.visibility).toBe("private");
      expect(priv?.hasPassword).toBe(false);
      expect(hasSecretKey(priv)).toBe(false);

      // private -> password (AC#3): stores hash, hasPassword true, secret not echoed.
      const pw = await updateEntryMetadata(created!.id, {
        visibility: "password",
        accessPassword: "s3cret",
      });
      expect(pw?.visibility).toBe("password");
      expect(pw?.hasPassword).toBe(true);
      expect(hasSecretKey(pw)).toBe(false);

      // AC#6: omitting visibility leaves stored value + hash untouched (present-only).
      const untouched = await updateEntryMetadata(created!.id, { tags: ["keep"] });
      expect(untouched?.visibility).toBe("password");
      expect(untouched?.hasPassword).toBe(true);

      // password + no accessPassword but existing hash -> keep hash (no reject).
      const keep = await updateEntryMetadata(created!.id, { visibility: "password" });
      expect(keep?.hasPassword).toBe(true);

      // AC#5: password -> public clears the stored hash.
      const cleared = await updateEntryMetadata(created!.id, { visibility: "public" });
      expect(cleared?.visibility).toBe("public");
      expect(cleared?.hasPassword).toBe(false);

      // AC#2b: no read/return path over content_entries leaks the secret.
      const detail = await getEntry(created!.id);
      expect(hasSecretKey(detail)).toBe(false);
      const bySlug = await getEntryBySlug(type.id, slug);
      expect(hasSecretKey(bySlug)).toBe(false);
      const published = await publishEntry(created!.id, localUserId!);
      expect(hasSecretKey(published)).toBe(false);
      const unpublished = await unpublishEntry(created!.id);
      expect(hasSecretKey(unpublished)).toBe(false);
    } finally {
      if (localEntryId) {
        await db.delete(contentRevisions).where(eq(contentRevisions.entryId, localEntryId));
        await db.delete(contentEntries).where(eq(contentEntries.id, localEntryId));
      }
      if (localContentTypeId) {
        await db.delete(contentTypes).where(eq(contentTypes.id, localContentTypeId));
      }
      if (localUserId) {
        await db.delete(users).where(eq(users.id, localUserId));
      }
    }
  },
  { timeout: 20_000 }
);

testIfDb("visibility password with no password and no existing hash is rejected", async () => {
  const type = await createContentType({
    name: uniqueName("PwReq"),
    slug: `pwreq-${randomUUID()}`,
    schema,
  });
  entryServiceTestState.contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryServiceTestState.entryId = entry?.id;

  await expect(updateEntryMetadata(entry!.id, { visibility: "password" })).rejects.toThrow(
    "entry_password_required"
  );

  await cleanup();
  entryServiceTestState.contentTypeId = undefined;
  entryServiceTestState.entryId = undefined;
});

testIfDbWithOptions(
  "combined {status:published, visibility:password} without password rejects before any write",
  async () => {
    let localContentTypeId: string | undefined;
    let localEntryId: string | undefined;
    let localUserId: string | undefined;

    try {
      const [user] = await db
        .insert(users)
        .values({
          email: `combined-${randomUUID()}@example.com`,
          passwordHash: "test",
          status: "active",
        })
        .returning();
      localUserId = user?.id;

      const type = await createContentType({
        name: uniqueName("Combined"),
        slug: `combined-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const entry = await createEntry(type.id, {
        title: "Entry",
        slug: `entry-${randomUUID()}`,
        data: { title: "Hello" },
      });
      localEntryId = entry?.id;

      await expect(
        updateEntryMetadata(entry!.id, { status: "published", visibility: "password" }, localUserId)
      ).rejects.toThrow("entry_password_required");

      // AC#10: the status side-effect must NOT have committed (no partial write).
      const after = await getEntry(entry!.id);
      expect(after?.status).toBe("draft");
      expect(after?.visibility).toBe("public");
      expect(after?.hasPassword).toBe(false);
    } finally {
      if (localEntryId) {
        await db.delete(contentRevisions).where(eq(contentRevisions.entryId, localEntryId));
        await db.delete(contentEntries).where(eq(contentEntries.id, localEntryId));
      }
      if (localContentTypeId) {
        await db.delete(contentTypes).where(eq(contentTypes.id, localContentTypeId));
      }
      if (localUserId) {
        await db.delete(users).where(eq(users.id, localUserId));
      }
    }
  },
  { timeout: 20_000 }
);

testIfDbWithOptions(
  "duplicateEntry copies visibility, downgrades password to private, never copies the hash",
  async () => {
    let localContentTypeId: string | undefined;

    try {
      const type = await createContentType({
        name: uniqueName("Dup"),
        slug: `dup-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const entry = await createEntry(type.id, {
        title: "Password Source",
        slug: `dup-${randomUUID()}`,
        data: { title: "Password Source" },
      });
      await updateEntryMetadata(entry!.id, {
        visibility: "password",
        accessPassword: "s3cret",
      });

      const duplicated = await duplicateEntry(entry!.id);
      // AC#9: password source -> copy downgraded to private, no hash copied.
      expect(duplicated?.visibility).toBe("private");
      expect(duplicated?.hasPassword).toBe(false);
      expect(hasSecretKey(duplicated)).toBe(false);
    } finally {
      if (localContentTypeId) {
        await db.delete(contentTypes).where(eq(contentTypes.id, localContentTypeId));
      }
    }
  },
  { timeout: 20_000 }
);

testIfDb("all three read projections expose visibility + hasPassword", async () => {
  const type = await createContentType({
    name: uniqueName("Projections"),
    slug: `projections-${randomUUID()}`,
    schema,
  });
  entryServiceTestState.contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Projection Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryServiceTestState.entryId = entry?.id;

  // (a) per-type list selection
  const listRows = await listEntries(type.id);
  const listRow = listRows.find((row) => row.id === entry!.id);
  expect(listRow?.visibility).toBe("public");
  expect(listRow?.hasPassword).toBe(false);

  // (b) all-entries list selection
  const allRows = await listEntriesWithContentTypes();
  const allRow = allRows.find((row) => row.id === entry!.id);
  expect(allRow?.visibility).toBe("public");
  expect(allRow?.hasPassword).toBe(false);

  // (c) detail
  const detail = await getEntry(entry!.id);
  expect(detail?.visibility).toBe("public");
  expect(detail?.hasPassword).toBe(false);

  await cleanup();
  entryServiceTestState.contentTypeId = undefined;
  entryServiceTestState.entryId = undefined;
});
