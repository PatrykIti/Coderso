import { expect } from "bun:test";
import { and, eq } from "drizzle-orm";
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
  publishEntry,
  updateEntryMetadata,
  updateEntryMetadataForRoute,
  type EntryMutationDeps,
} from "../../../core/services/content/entryService";
import {
  createCacheRecordingDeps,
  createDeferred,
  createMutationTag,
  readEntryMutationDomainSnapshot,
  readStoredEntryMutationState,
  testIfDbWithOptions,
  withEntryMutationFixture,
} from "./support/entryServiceTestSupport";

testIfDbWithOptions(
  "deferred taxonomy and SEO applies are awaited and stay cache-silent until commit",
  async () => {
    const cases = [
      { seam: "taxonomy" as const, outcome: "resolve" as const },
      { seam: "taxonomy" as const, outcome: "reject" as const },
      { seam: "seo" as const, outcome: "resolve" as const },
      { seam: "seo" as const, outcome: "reject" as const },
    ];

    for (const testCase of cases) {
      await withEntryMutationFixture(async (fixture) => {
        const gate = createDeferred<void>();
        const entered = createDeferred<void>();
        const { cacheEvents, deps: base } = createCacheRecordingDeps();
        const tag =
          testCase.seam === "taxonomy"
            ? await createMutationTag(fixture.typeId, `Deferred ${testCase.outcome}`)
            : null;
        const before = await readEntryMutationDomainSnapshot(fixture.entryId);
        const deps = createEntryMutationDepsForTest({
          ...base,
          ...(testCase.seam === "taxonomy"
            ? {
                applyTaxonomy: async (...args: Parameters<EntryMutationDeps["applyTaxonomy"]>) => {
                  entered.resolve();
                  await gate.promise;
                  return base.applyTaxonomy(...args);
                },
              }
            : {
                applySeo: async (...args: Parameters<EntryMutationDeps["applySeo"]>) => {
                  entered.resolve();
                  await gate.promise;
                  return base.applySeo(...args);
                },
              }),
        });
        const scheduledAt = new Date("2036-02-03T04:05:06.000Z");
        let settled = false;
        const pending = coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          {
            status: "scheduled",
            scheduledAt,
            ...(testCase.seam === "taxonomy"
              ? { taxonomy: { tagIds: [tag?.id as string] } }
              : { seo: { description: `Deferred SEO ${testCase.outcome}` } }),
          },
          fixture.actorId,
          { kind: "trusted-internal" }
        );
        void pending.then(
          () => {
            settled = true;
          },
          () => {
            settled = true;
          }
        );

        await entered.promise;
        expect(settled, `${testCase.seam}:${testCase.outcome}`).toBe(false);
        expect(cacheEvents, `${testCase.seam}:${testCase.outcome}`).toHaveLength(0);

        if (testCase.outcome === "reject") {
          gate.reject(new Error(`deferred_${testCase.seam}_rejected`));
          await expect(pending).rejects.toThrow(`deferred_${testCase.seam}_rejected`);
          expect(
            await readEntryMutationDomainSnapshot(fixture.entryId),
            `${testCase.seam}:${testCase.outcome}`
          ).toEqual(before);
          expect(cacheEvents, `${testCase.seam}:${testCase.outcome}`).toHaveLength(0);
          return;
        }

        gate.resolve();
        await pending;
        const stored = await readStoredEntryMutationState(fixture.entryId);
        expect(stored.status, testCase.seam).toBe("scheduled");
        expect(stored.scheduledAt?.toISOString(), testCase.seam).toBe(scheduledAt.toISOString());
        if (testCase.seam === "taxonomy") {
          expect(cacheEvents).toEqual(["targeted"]);
          expect(
            await db
              .select({ termId: contentTermAssignments.termId })
              .from(contentTermAssignments)
              .where(eq(contentTermAssignments.entryId, fixture.entryId))
          ).toEqual([{ termId: tag?.id }]);
        } else {
          expect(cacheEvents).toEqual(["global"]);
          expect(
            await db
              .select({ description: seoDocuments.description })
              .from(seoDocuments)
              .where(eq(seoDocuments.targetId, fixture.entryId))
          ).toEqual([{ description: "Deferred SEO resolve" }]);
        }
      });
    }
  },
  { timeout: 60_000 }
);

testIfDbWithOptions(
  "locked route authorization runs before preparation for every mutation",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Authorization order");
      const events: string[] = [];
      const { cacheEvents, deps: base } = createCacheRecordingDeps();
      let activeTransaction: unknown = null;
      const deps = createEntryMutationDepsForTest({
        ...base,
        transaction: (callback) =>
          base.transaction(async (tx) => {
            activeTransaction = tx;
            return callback(tx);
          }),
        hashPassword: async () => {
          events.push("hash");
          return "authorization-order-hash";
        },
        prepareTaxonomy: async (...args) => {
          events.push("prepare-taxonomy");
          return base.prepareTaxonomy(...args);
        },
        prepareSeo: async (...args) => {
          events.push("prepare-seo");
          return base.prepareSeo(...args);
        },
        createRevision: async (...args) => {
          events.push("create-revision");
          return base.createRevision(...args);
        },
        writeStatus: async (...args) => {
          events.push("write-status");
          return base.writeStatus(...args);
        },
        applyTaxonomy: async (...args) => {
          events.push("apply-taxonomy");
          return base.applyTaxonomy(...args);
        },
        writeMetadata: async (...args) => {
          events.push("write-metadata");
          return base.writeMetadata(...args);
        },
        applySeo: async (...args) => {
          events.push("apply-seo");
          return base.applySeo(...args);
        },
      });

      await expect(
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { status: "published" },
          fixture.actorId,
          undefined as never
        )
      ).rejects.toThrow("entry_publish_authorization_required");
      expect(events).toHaveLength(0);
      expect((await readStoredEntryMutationState(fixture.entryId)).status).toBe("draft");

      await expect(
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { tags: ["ordinary-without-authorization"] },
          fixture.actorId,
          undefined as never
        )
      ).rejects.toThrow("entry_publish_authorization_required");
      expect(events).toHaveLength(0);

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { tags: ["ordinary-authorized"] },
        fixture.actorId,
        {
          kind: "route",
          authorize: async (tx, requirement) => {
            expect(tx).toBe(activeTransaction);
            expect(requirement).toEqual({ publishTransition: false });
            expect(Object.isFrozen(requirement)).toBe(true);
            events.push("authorize");
          },
        }
      );
      expect(events).toEqual(["authorize", "write-metadata"]);

      events.length = 0;
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        {
          status: "published",
          visibility: "password",
          accessPassword: "authorization password",
          taxonomy: { tagIds: [tag.id] },
          seo: { description: "Authorization order SEO" },
        },
        fixture.actorId,
        {
          kind: "route",
          authorize: async (tx, requirement) => {
            expect(tx).toBe(activeTransaction);
            expect(requirement).toEqual({ publishTransition: true });
            expect(Object.isFrozen(requirement)).toBe(true);
            events.push("authorize");
          },
        }
      );
      expect(events).toEqual([
        "authorize",
        "hash",
        "prepare-taxonomy",
        "prepare-seo",
        "create-revision",
        "write-status",
        "apply-taxonomy",
        "write-metadata",
        "apply-seo",
      ]);

      events.length = 0;
      let alreadyPublishedAuthorizationCalls = 0;
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "published", tags: ["already-published"] },
        fixture.actorId,
        {
          kind: "route",
          authorize: async (tx, requirement) => {
            expect(tx).toBe(activeTransaction);
            expect(requirement).toEqual({ publishTransition: false });
            alreadyPublishedAuthorizationCalls += 1;
            events.push("authorize");
          },
        }
      );
      expect(alreadyPublishedAuthorizationCalls).toBe(1);
      expect(events).toEqual(["authorize", "write-metadata"]);

      events.length = 0;
      cacheEvents.length = 0;
      let noOpAuthorizationCalls = 0;
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "published" },
        fixture.actorId,
        {
          kind: "route",
          authorize: async (tx, requirement) => {
            expect(tx).toBe(activeTransaction);
            expect(requirement).toEqual({ publishTransition: false });
            noOpAuthorizationCalls += 1;
            events.push("authorize");
          },
        }
      );
      expect(noOpAuthorizationCalls).toBe(1);
      expect(events).toEqual(["authorize"]);
      expect(cacheEvents).toHaveLength(0);
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "row-locked route mutation waits for the lock and a denial leaves every domain unchanged",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Denied lock mutation");
      const before = await readEntryMutationDomainSnapshot(fixture.entryId);
      const holderLocked = createDeferred<void>();
      const releaseHolder = createDeferred<void>();
      const waiterStarted = createDeferred<void>();
      const guardEntered = createDeferred<void>();
      const seamEvents: string[] = [];
      const { cacheEvents, deps: base } = createCacheRecordingDeps();
      let waiterTransaction: unknown = null;
      const deps = createEntryMutationDepsForTest({
        ...base,
        transaction: (callback) =>
          base.transaction(async (tx) => {
            waiterTransaction = tx;
            waiterStarted.resolve();
            return callback(tx);
          }),
        hashPassword: async (...args) => {
          seamEvents.push("hash");
          return base.hashPassword(...args);
        },
        prepareTaxonomy: async (...args) => {
          seamEvents.push("prepare-taxonomy");
          return base.prepareTaxonomy(...args);
        },
        prepareSeo: async (...args) => {
          seamEvents.push("prepare-seo");
          return base.prepareSeo(...args);
        },
        createRevision: async (...args) => {
          seamEvents.push("create-revision");
          return base.createRevision(...args);
        },
        writeStatus: async (...args) => {
          seamEvents.push("write-status");
          return base.writeStatus(...args);
        },
        applyTaxonomy: async (...args) => {
          seamEvents.push("apply-taxonomy");
          return base.applyTaxonomy(...args);
        },
        writeMetadata: async (...args) => {
          seamEvents.push("write-metadata");
          return base.writeMetadata(...args);
        },
        applySeo: async (...args) => {
          seamEvents.push("apply-seo");
          return base.applySeo(...args);
        },
      });

      const holderPromise = db.transaction(async (tx) => {
        await tx
          .select({ id: contentEntries.id })
          .from(contentEntries)
          .where(eq(contentEntries.id, fixture.entryId))
          .for("update");
        holderLocked.resolve();
        await releaseHolder.promise;
      });

      let mutationPromise: ReturnType<typeof coordinateEntryMetadataMutation> | null = null;
      try {
        await Promise.race([
          holderLocked.promise,
          holderPromise.then(() => {
            throw new Error("entry_lock_holder_finished_before_barrier");
          }),
        ]);
        mutationPromise = coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          {
            status: "published",
            visibility: "password",
            accessPassword: "must never be hashed",
            taxonomy: { tagIds: [tag.id] },
            seo: { description: "must never be prepared" },
          },
          fixture.actorId,
          {
            kind: "route",
            authorize: async (tx, requirement) => {
              expect(tx).toBe(waiterTransaction);
              expect(requirement).toEqual({ publishTransition: true });
              guardEntered.resolve();
              throw new Error("forbidden");
            },
          }
        );
        await waiterStarted.promise;

        const guardStateBeforeRelease = await Promise.race([
          guardEntered.promise.then(() => "called" as const),
          new Promise<"blocked">((resolve) => {
            setTimeout(() => resolve("blocked"), 100);
          }),
        ]);
        expect(guardStateBeforeRelease).toBe("blocked");
        expect(seamEvents).toHaveLength(0);
        expect(cacheEvents).toHaveLength(0);

        releaseHolder.resolve();
        await holderPromise;
        await expect(mutationPromise).rejects.toThrow("forbidden");
        mutationPromise = null;

        expect(seamEvents).toHaveLength(0);
        expect(cacheEvents).toHaveLength(0);
        expect(await readEntryMutationDomainSnapshot(fixture.entryId)).toEqual(before);
      } finally {
        releaseHolder.resolve();
        await holderPromise.catch(() => undefined);
        await mutationPromise?.catch(() => undefined);
      }
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "accessPassword is ignored when visibility is omitted for every stored visibility",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      let hashCalls = 0;
      const { cacheEvents, deps: base } = createCacheRecordingDeps();
      const deps = createEntryMutationDepsForTest({
        ...base,
        hashPassword: async () => {
          hashCalls += 1;
          return "must-not-be-used";
        },
      });
      const states = [
        { visibility: "public" as const, accessPassword: null },
        { visibility: "private" as const, accessPassword: null },
        { visibility: "password" as const, accessPassword: "stored-byte-identical-hash" },
      ];

      for (const state of states) {
        await db.update(contentEntries).set(state).where(eq(contentEntries.id, fixture.entryId));
        await coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { accessPassword: "ignored-author-input" },
          fixture.actorId,
          { kind: "trusted-internal" }
        );
        const stored = await readStoredEntryMutationState(fixture.entryId);
        expect(stored.visibility).toBe(state.visibility);
        expect(stored.accessPassword).toBe(state.accessPassword);
      }

      expect(hashCalls).toBe(0);
      expect(cacheEvents).toHaveLength(0);
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "concurrent password keep and clear mutations cannot leave password visibility without a hash",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      await db
        .update(contentEntries)
        .set({ visibility: "password", accessPassword: "concurrency-hash" })
        .where(eq(contentEntries.id, fixture.entryId));
      const { deps } = createCacheRecordingDeps();

      const results = await Promise.allSettled([
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { visibility: "public" },
          fixture.actorId,
          { kind: "trusted-internal" }
        ),
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { visibility: "password" },
          fixture.actorId,
          { kind: "trusted-internal" }
        ),
      ]);
      expect(results.some((result) => result.status === "fulfilled")).toBe(true);
      for (const result of results) {
        if (result.status === "rejected") {
          expect(String(result.reason)).toContain("entry_password_required");
        }
      }

      const stored = await readStoredEntryMutationState(fixture.entryId);
      expect(stored.visibility === "password" && stored.accessPassword === null).toBe(false);
      if (stored.visibility === "password") {
        expect(stored.accessPassword).toBe("concurrency-hash");
      } else {
        expect(stored.visibility).toBe("public");
        expect(stored.accessPassword).toBeNull();
      }
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "concurrent standalone publishes serialize distinct revision versions",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const results = await Promise.all([
        publishEntry(fixture.entryId, fixture.actorId),
        publishEntry(fixture.entryId, fixture.actorId),
      ]);
      expect(results.every((result) => result?.status === "published")).toBe(true);
      const revisions = await db
        .select({ version: contentRevisions.version })
        .from(contentRevisions)
        .where(eq(contentRevisions.entryId, fixture.entryId));
      expect(
        revisions.map((revision) => revision.version).sort((left, right) => left - right)
      ).toEqual([1, 2]);
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "route metadata wrapper preserves direct SEO null values as omitted fields",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      await updateEntryMetadata(fixture.entryId, {
        seo: {
          title: "Stored SEO title",
          description: "Stored SEO description",
          canonicalUrl: "https://example.test/stored",
          robots: "index,follow",
        },
      });

      await updateEntryMetadataForRoute(
        fixture.entryId,
        {
          seo: {
            title: null,
            description: null,
            canonicalUrl: null,
            robots: null,
          },
        },
        fixture.actorId,
        async () => undefined
      );
      const [seo] = await db
        .select({
          title: seoDocuments.title,
          description: seoDocuments.description,
          canonicalUrl: seoDocuments.canonicalUrl,
          robots: seoDocuments.robots,
        })
        .from(seoDocuments)
        .where(
          and(eq(seoDocuments.targetType, "entry"), eq(seoDocuments.targetId, fixture.entryId))
        );
      expect(seo).toEqual({
        title: "Stored SEO title",
        description: "Stored SEO description",
        canonicalUrl: "https://example.test/stored",
        robots: "index,follow",
      });
    });
  },
  { timeout: 30_000 }
);
