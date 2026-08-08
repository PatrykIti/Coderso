import type { PlannedPackageResource } from "../fullSitePackage/referenceGraph";
import { PACKAGE_LIMITS } from "../fullSitePackage/types";
import type {
  FullSitePlanningReadTransaction,
  FullSitePlanningSnapshotLoader,
  FullSitePlanningSnapshotRow,
  FullSiteResourceIdentity,
} from "../fullSiteInstallTypes";

const fail = (code = "site_package_invalid"): never => {
  throw new Error(code);
};

const guardSnapshotShape = <T>(read: () => T): T => {
  try {
    return read();
  } catch (error) {
    if (error instanceof Error && error.message === "site_package_too_large") {
      fail("site_package_too_large");
    }
    return fail();
  }
};

const assertRequests = (
  resources: readonly PlannedPackageResource[]
): readonly PlannedPackageResource[] => {
  return guardSnapshotShape(() => {
    if (!Array.isArray(resources)) fail();
    const length = Reflect.get(resources, "length");
    if (!Number.isSafeInteger(length) || length < 0) fail();
    if (length > PACKAGE_LIMITS.resourcesTotal) fail("site_package_too_large");
    const identities = new Set<FullSiteResourceIdentity>();
    for (let index = 0; index < length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(resources, index)) fail();
      const resource = Reflect.get(resources, String(index));
      if (!resource || identities.has(resource.identity)) fail();
      identities.add(resource.identity);
    }
    if (Reflect.get(resources, "length") !== length) fail();
    return resources;
  });
};

const assertEvidence = (
  resources: readonly PlannedPackageResource[],
  values: readonly Readonly<{
    identity: FullSiteResourceIdentity;
    evidence: Readonly<{ runId: string; resourceId: string }> | null;
  }>[]
): typeof values => {
  return guardSnapshotShape(() => {
    if (!Array.isArray(values) || values.length !== resources.length) fail();
    for (let index = 0; index < resources.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(values, index)) fail();
      if (Reflect.get(values, String(index))?.identity !== resources[index].identity) fail();
    }
    return values;
  });
};

const assertNative = (
  resources: readonly PlannedPackageResource[],
  values: readonly Readonly<{
    identity: FullSiteResourceIdentity;
    current: FullSitePlanningSnapshotRow["current"];
  }>[]
): typeof values => {
  return guardSnapshotShape(() => {
    if (!Array.isArray(values) || values.length !== resources.length) fail();
    for (let index = 0; index < resources.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(values, index)) fail();
      if (Reflect.get(values, String(index))?.identity !== resources[index].identity) fail();
    }
    return values;
  });
};

export const createFullSitePlanningSnapshotLoader =
  (
    deps: Readonly<{
      packageKey: string;
      withReadTransaction: FullSitePlanningReadTransaction;
    }>
  ): FullSitePlanningSnapshotLoader =>
  async (input) => {
    const resources = assertRequests(input);
    return deps.withReadTransaction(async ({ findEvidence, readNative }) => {
      const evidence = assertEvidence(
        resources,
        await findEvidence({
          packageKey: deps.packageKey,
          resources: resources.map(({ identity, kind, key }) => ({ identity, kind, key })),
        })
      );
      const native = assertNative(resources, await readNative({ resources, evidence }));
      return Object.freeze(
        resources.map((resource, index) =>
          Object.freeze({
            identity: resource.identity,
            evidence: evidence[index].evidence
              ? Object.freeze({ ...evidence[index].evidence })
              : null,
            current: native[index].current
              ? Object.freeze({
                  id: native[index].current!.id,
                  desired: native[index].current!.desired,
                })
              : null,
          })
        )
      );
    });
  };
