import {
  createCacheEventOperationToken,
  type CacheEventOperationToken,
  type CacheEventOrigin,
} from "@/utils/cacheBus";

export type PostMutationLease = Readonly<{
  cacheEventOperationToken: CacheEventOperationToken;
  operationId: number;
  postId: string;
  routeEpoch: number;
}>;

export function createPostMutationLease(
  identity: Readonly<{ postId: string; routeEpoch: number }>,
  operationId: number
): PostMutationLease {
  return Object.freeze({
    ...identity,
    cacheEventOperationToken: createCacheEventOperationToken(),
    operationId,
  });
}

export type PostExternalUpdateAuthority = Readonly<{
  captureHydration: () => number;
  hasPendingUpdate: () => boolean;
  observe: (
    origin: CacheEventOrigin,
    eventToken: CacheEventOperationToken | undefined,
    activeLeaseToken: CacheEventOperationToken | undefined
  ) => boolean;
  resolveHydration: (capturedGeneration: number) => boolean;
}>;

export function createPostExternalUpdateAuthority(): PostExternalUpdateAuthority {
  let observedGeneration = 0;
  let resolvedGeneration = 0;

  return Object.freeze({
    captureHydration: () => observedGeneration,
    hasPendingUpdate: () => observedGeneration !== resolvedGeneration,
    observe(origin, eventToken, activeLeaseToken) {
      if (origin === "local" && activeLeaseToken !== undefined && eventToken === activeLeaseToken) {
        return false;
      }
      observedGeneration += 1;
      return true;
    },
    resolveHydration(capturedGeneration) {
      if (capturedGeneration !== observedGeneration) return false;
      resolvedGeneration = capturedGeneration;
      return true;
    },
  });
}
