import { describe, expect, it } from "vitest";

import type { PlannedPackageResource } from "../../../core/services/kits/fullSitePackage/referenceGraph";
import { createFullSitePlanningSnapshotLoader } from "../../../core/services/kits/fullSiteInstall/planningSnapshot";
import type {
  FullSitePlanningSnapshotRow,
  FullSiteResourceIdentity,
} from "../../../core/services/kits/fullSiteInstallTypes";

const makeResource = (index: number): PlannedPackageResource => {
  const key = `setting-${index}`;
  return Object.freeze({
    identity: `setting:${key}` as FullSiteResourceIdentity,
    kind: "setting",
    collection: "settings",
    key,
    ordinal: index,
    collectionIndex: index,
    seed: Object.freeze({ key, desired: Object.freeze({ value: index }) }),
    dependencies: Object.freeze([]),
    references: Object.freeze([]),
  });
};

const makeResources = (count: number): readonly PlannedPackageResource[] =>
  Object.freeze(Array.from({ length: count }, (_, index) => makeResource(index)));

describe("full-site planning snapshot", () => {
  it.each([0, 1, 512])(
    "loads %i resources through one transaction-bound evidence/native sequence",
    async (count) => {
      const events: string[] = [];
      const resources = makeResources(count);
      const loader = createFullSitePlanningSnapshotLoader({
        packageKey: "planning-snapshot",
        withReadTransaction: async (read) => {
          events.push("transaction");
          return read({
            findEvidence: async (input) => {
              events.push("evidence");
              expect(input.packageKey).toBe("planning-snapshot");
              return input.resources.map((resource) => ({
                identity: resource.identity,
                evidence: null,
              }));
            },
            readNative: async (input) => {
              events.push("native");
              expect(input.resources).toBe(resources);
              return input.resources.map((resource) => ({
                identity: resource.identity,
                current: {
                  id: `native-${resource.key}`,
                  desired: { value: resource.collectionIndex },
                },
              }));
            },
          });
        },
      });

      const snapshot = await loader(resources);

      expect(events).toEqual(["transaction", "evidence", "native"]);
      expect(snapshot).toHaveLength(count);
      expect(Object.isFrozen(snapshot)).toBe(true);
      for (let index = 0; index < snapshot.length; index += 1) {
        expect(snapshot[index].identity).toBe(resources[index].identity);
        expect(Object.isFrozen(snapshot[index])).toBe(true);
      }
    }
  );

  it("rejects a 513th request before opening the read transaction", async () => {
    let transactions = 0;
    const loader = createFullSitePlanningSnapshotLoader({
      packageKey: "planning-snapshot",
      withReadTransaction: async <T>(): Promise<T> => {
        transactions += 1;
        throw new Error("planning_snapshot_unexpected_transaction");
      },
    });

    await expect(loader(makeResources(513))).rejects.toThrow("site_package_too_large");
    expect(transactions).toBe(0);
  });

  it.each(["evidence order", "native cardinality"])(
    "fails closed for hostile %s",
    async (failure) => {
      const resources = makeResources(2);
      const loader = createFullSitePlanningSnapshotLoader({
        packageKey: "planning-snapshot",
        withReadTransaction: (read) =>
          read({
            findEvidence: async (input) => {
              const rows = input.resources.map((resource) => ({
                identity: resource.identity,
                evidence: null,
              }));
              return failure === "evidence order" ? rows.reverse() : rows;
            },
            readNative: async (input) => {
              const rows: FullSitePlanningSnapshotRow[] = input.resources.map((resource) => ({
                identity: resource.identity,
                evidence: null,
                current: null,
              }));
              const projected = rows.map(({ identity, current }) => ({ identity, current }));
              return failure === "native cardinality" ? projected.slice(1) : projected;
            },
          }),
      });

      await expect(loader(resources)).rejects.toThrow("site_package_invalid");
    }
  );

  it("sanitizes revoked and throwing request-array traps", async () => {
    const loader = createFullSitePlanningSnapshotLoader({
      packageKey: "planning-snapshot",
      withReadTransaction: async <T>(): Promise<T> => {
        throw new Error("planning_snapshot_unexpected_transaction");
      },
    });
    const revoked = Proxy.revocable<PlannedPackageResource[]>([], {});
    revoked.revoke();
    const throwing = new Proxy<PlannedPackageResource[]>([makeResource(0)], {
      getOwnPropertyDescriptor: () => {
        throw new Error("hostile_snapshot_sentinel");
      },
    });

    await expect(loader(revoked.proxy)).rejects.toThrow("site_package_invalid");
    await expect(loader(throwing)).rejects.toThrow("site_package_invalid");
  });
});
