import { expect, test } from "vitest";

import { createCacheEventOperationToken } from "../../../core/admin/utils/cacheBus";
import {
  createPostExternalUpdateAuthority,
  createPostMutationLease,
} from "../../../core/admin/ui/posts/editor/postExternalUpdateAuthority";

test("the exact current local lease token is the only cache event classified as self", () => {
  const authority = createPostExternalUpdateAuthority();
  const lease = createPostMutationLease({ postId: "post-1", routeEpoch: 3 }, 7);

  expect(
    authority.observe("local", lease.cacheEventOperationToken, lease.cacheEventOperationToken)
  ).toBe(false);
  expect(authority.hasPendingUpdate()).toBe(false);

  expect(
    authority.observe("remote", lease.cacheEventOperationToken, lease.cacheEventOperationToken)
  ).toBe(true);
  expect(authority.observe("local", undefined, lease.cacheEventOperationToken)).toBe(true);
  expect(
    authority.observe("local", createCacheEventOperationToken(), lease.cacheEventOperationToken)
  ).toBe(true);
  expect(authority.hasPendingUpdate()).toBe(true);
});

test("an accepted hydration resolves exactly the external generation captured at dispatch", () => {
  const authority = createPostExternalUpdateAuthority();

  authority.observe("remote", undefined, undefined);
  const captured = authority.captureHydration();
  expect(authority.resolveHydration(captured)).toBe(true);
  expect(authority.hasPendingUpdate()).toBe(false);
});

test("a newer external event prevents an older hydration from clearing the pending update", () => {
  const authority = createPostExternalUpdateAuthority();

  authority.observe("remote", undefined, undefined);
  const staleCapture = authority.captureHydration();
  authority.observe("local", undefined, undefined);

  expect(authority.resolveHydration(staleCapture)).toBe(false);
  expect(authority.hasPendingUpdate()).toBe(true);
  expect(authority.resolveHydration(authority.captureHydration())).toBe(true);
  expect(authority.hasPendingUpdate()).toBe(false);
});
