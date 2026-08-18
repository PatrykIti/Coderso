import { expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentRevisions,
  contentTermAssignments,
  seoDocuments,
} from "../../../core/db/schema";
import {
  coordinateEntryMetadataMutation,
  createEntryMutationDepsForTest,
  type EntryMutationDeps,
} from "../../../core/services/content/entryService";
import {
  createCacheRecordingDeps,
  createMutationTag,
  readEntryMutationDomainSnapshot,
  readStoredEntryMutationState,
  testIfDbWithOptions,
  withEntryMutationFixture,
} from "./support/entryServiceTestSupport";

testIfDbWithOptions(
  "entry metadata write plans follow the exact status and accumulated metadata matrix",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Write plan");
      const statusPlans: Array<Parameters<EntryMutationDeps["writeStatus"]>[1]> = [];
      const metadataPlans: Array<Parameters<EntryMutationDeps["writeMetadata"]>[1]> = [];
      const cacheEvents: string[] = [];
      const deps = createEntryMutationDepsForTest({
        hashPassword: async () => "prepared-test-hash",
        createRevision: async (_tx, entryId, data, userId) => ({
          id: randomUUID(),
          entryId,
          version: 1,
          data,
          createdBy: userId,
          createdAt: new Date(),
        }),
        writeStatus: async (_tx, plan) => {
          statusPlans.push(plan);
          return null;
        },
        applyTaxonomy: async () => ({ category: null, tags: [] }),
        writeMetadata: async (_tx, plan) => {
          metadataPlans.push(plan);
        },
        invalidateEntrySiteCache: async () => {
          cacheEvents.push("targeted");
        },
        clearAllSiteCache: () => {
          cacheEvents.push("global");
        },
      });

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "draft" },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(statusPlans).toHaveLength(0);
      expect(metadataPlans).toHaveLength(0);
      expect(cacheEvents).toHaveLength(0);

      const scheduledAt = new Date("2035-01-02T03:04:05.000Z");
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "scheduled", scheduledAt },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(statusPlans.at(-1)?.entryId).toBe(fixture.entryId);
      expect(statusPlans.at(-1)?.values).toMatchObject({
        status: "scheduled",
        scheduledAt,
      });
      expect(Object.hasOwn(statusPlans.at(-1)?.values ?? {}, "publishedAt")).toBe(false);
      expect(Object.isFrozen(statusPlans.at(-1))).toBe(true);
      expect(Object.isFrozen(statusPlans.at(-1)?.values)).toBe(true);

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "archived" },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(statusPlans.at(-1)?.values).toMatchObject({
        status: "archived",
        scheduledAt: null,
      });
      expect(Object.hasOwn(statusPlans.at(-1)?.values ?? {}, "publishedAt")).toBe(false);

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "published" },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(statusPlans.at(-1)?.values.status).toBe("published");
      expect(statusPlans.at(-1)?.values.publishedAt).toBeInstanceOf(Date);
      expect(statusPlans.at(-1)?.values.scheduledAt).toBeNull();

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        {
          scheduledAt,
          visibility: "password",
          accessPassword: "new password",
          taxonomy: { tagIds: [tag.id] },
        },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      const metadataPlan = metadataPlans.at(-1);
      expect(metadataPlan?.entryId).toBe(fixture.entryId);
      expect(metadataPlan?.values).toMatchObject({
        tags: [tag.name],
        scheduledAt,
        visibility: "password",
        accessPassword: "prepared-test-hash",
      });
      expect(Object.keys(metadataPlan?.values ?? {}).sort()).toEqual([
        "accessPassword",
        "scheduledAt",
        "tags",
        "updatedAt",
        "visibility",
      ]);
      expect(Object.isFrozen(metadataPlan)).toBe(true);
      expect(Object.isFrozen(metadataPlan?.values)).toBe(true);
      expect(cacheEvents.filter((event) => event === "targeted")).toHaveLength(4);
      expect(cacheEvents).not.toContain("global");
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "taxonomy and SEO preparation reject before every metadata write and cache effect",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Prepare rollback");
      const { cacheEvents, deps } = createCacheRecordingDeps();

      await expect(
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          {
            status: "published",
            taxonomy: { tagIds: [randomUUID()] },
          },
          fixture.actorId,
          { kind: "trusted-internal" }
        )
      ).rejects.toThrow(/taxonomy_term_(missing|invalid)/);

      await expect(
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          {
            taxonomy: { tagIds: [tag.id] },
            visibility: "private",
            seo: { canonicalUrl: "ftp://invalid.example.test" },
          },
          fixture.actorId,
          { kind: "trusted-internal" }
        )
      ).rejects.toThrow("seo_canonical_invalid");

      const stored = await readStoredEntryMutationState(fixture.entryId);
      expect(stored.status).toBe("draft");
      expect(stored.visibility).toBe("public");
      expect(stored.tags ?? []).toEqual([]);
      expect(
        await db
          .select({ id: contentRevisions.id })
          .from(contentRevisions)
          .where(eq(contentRevisions.entryId, fixture.entryId))
      ).toHaveLength(0);
      expect(
        await db
          .select({ termId: contentTermAssignments.termId })
          .from(contentTermAssignments)
          .where(eq(contentTermAssignments.entryId, fixture.entryId))
      ).toHaveLength(0);
      expect(
        await db
          .select({ id: seoDocuments.id })
          .from(seoDocuments)
          .where(eq(seoDocuments.targetId, fixture.entryId))
      ).toHaveLength(0);
      expect(cacheEvents).toHaveLength(0);
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "entry metadata cache matrix is global for SEO, targeted otherwise, and no-op silent",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const { cacheEvents, deps } = createCacheRecordingDeps();

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { seo: { description: "Cache matrix SEO description" } },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(cacheEvents).toEqual(["global"]);

      cacheEvents.length = 0;
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { tags: ["cache-matrix"] },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(cacheEvents).toEqual(["targeted"]);

      cacheEvents.length = 0;
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "draft", accessPassword: "ignored" },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(cacheEvents).toEqual([]);
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "post-commit cache and reporter failures preserve durable metadata success",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const reported: string[] = [];
      const deps = createEntryMutationDepsForTest({
        invalidateEntrySiteCache: async () => {
          throw new Error("raw-cache-provider-secret");
        },
        reportCacheFailure: (code) => {
          reported.push(code);
          throw new Error("reporter_failed");
        },
      });

      const result = await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { tags: ["durable-cache-failure"] },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(result?.tags).toEqual(["durable-cache-failure"]);
      expect((await readStoredEntryMutationState(fixture.entryId)).tags).toEqual([
        "durable-cache-failure",
      ]);
      expect(reported).toEqual(["entry_cache_invalidation_failed"]);
      expect(JSON.stringify(reported)).not.toContain("raw-cache-provider-secret");
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "a failure after every metadata write seam rolls the entire outer transaction back",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Fault seam");
      const initialScheduledAt = new Date("2036-01-02T03:04:05.000Z");
      await db
        .update(contentEntries)
        .set({
          status: "scheduled",
          scheduledAt: initialScheduledAt,
          visibility: "password",
          accessPassword: "fault-baseline-hash",
        })
        .where(eq(contentEntries.id, fixture.entryId));
      const before = await readEntryMutationDomainSnapshot(fixture.entryId);
      const { cacheEvents, deps: base } = createCacheRecordingDeps({
        hashPassword: async () => "fault-prepared-hash",
      });

      const failAfterCreateRevision: EntryMutationDeps["createRevision"] = async (...args) => {
        await base.createRevision(...args);
        throw new Error("fault_after_create_revision");
      };
      const failAfterWriteStatus: EntryMutationDeps["writeStatus"] = async (...args) => {
        await base.writeStatus(...args);
        throw new Error("fault_after_write_status");
      };
      const failAfterApplyTaxonomy: EntryMutationDeps["applyTaxonomy"] = async (...args) => {
        await base.applyTaxonomy(...args);
        throw new Error("fault_after_apply_taxonomy");
      };
      const failAfterWriteMetadata: EntryMutationDeps["writeMetadata"] = async (...args) => {
        await base.writeMetadata(...args);
        throw new Error("fault_after_write_metadata");
      };
      const failAfterApplySeo: EntryMutationDeps["applySeo"] = async (...args) => {
        await base.applySeo(...args);
        throw new Error("fault_after_apply_seo");
      };

      const faults: Array<{
        code: string;
        overrides: Partial<EntryMutationDeps>;
      }> = [
        {
          code: "fault_after_create_revision",
          overrides: { createRevision: failAfterCreateRevision },
        },
        { code: "fault_after_write_status", overrides: { writeStatus: failAfterWriteStatus } },
        {
          code: "fault_after_apply_taxonomy",
          overrides: { applyTaxonomy: failAfterApplyTaxonomy },
        },
        {
          code: "fault_after_write_metadata",
          overrides: { writeMetadata: failAfterWriteMetadata },
        },
        { code: "fault_after_apply_seo", overrides: { applySeo: failAfterApplySeo } },
      ];

      for (const fault of faults) {
        const deps = createEntryMutationDepsForTest({
          ...base,
          ...fault.overrides,
        });
        await expect(
          coordinateEntryMetadataMutation(
            deps,
            fixture.entryId,
            {
              status: "published",
              visibility: "password",
              accessPassword: "fault-new-password",
              taxonomy: { tagIds: [tag.id] },
              seo: { description: `SEO ${fault.code}` },
            },
            fixture.actorId,
            { kind: "trusted-internal" }
          )
        ).rejects.toThrow(fault.code);

        expect(await readEntryMutationDomainSnapshot(fixture.entryId), fault.code).toEqual(before);
        expect(cacheEvents, fault.code).toHaveLength(0);
      }
    });
  },
  { timeout: 45_000 }
);
