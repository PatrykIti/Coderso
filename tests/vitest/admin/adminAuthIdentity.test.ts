import { expect, test } from "vitest";

import {
  clearAdminAuthIdentity,
  getAdminAuthIdentity,
  publishAdminAuthIdentity,
  subscribeAdminAuthIdentity,
} from "../../../core/admin/services/adminAuthIdentity";

test("subscribe returns an unsubscribe function that removes the listener", () => {
  const listener = () => undefined;
  const unsubscribe = subscribeAdminAuthIdentity(listener);
  const publisher = Symbol("admin-auth");
  publishAdminAuthIdentity(publisher, "user-1");
  unsubscribe();
  publishAdminAuthIdentity(publisher, "user-2");
  expect(getAdminAuthIdentity().userId).toBe("user-2");
  unsubscribe();
});

test("publishing the same identity for the same publisher is a no-op", () => {
  const publisher = Symbol("admin-auth-same");
  const first = publishAdminAuthIdentity(publisher, "user-same");
  const second = publishAdminAuthIdentity(publisher, "user-same");
  expect(second).toBe(first);
  expect(second.epoch).toBe(first.epoch);
});

test("clearing with a different publisher is a no-op", () => {
  const publisher = Symbol("admin-auth-clear");
  publishAdminAuthIdentity(publisher, "user-clear");
  const before = getAdminAuthIdentity();
  clearAdminAuthIdentity(Symbol("other-publisher"));
  expect(getAdminAuthIdentity()).toBe(before);
  expect(before.userId).toBe("user-clear");
});

test("clearing with the owning publisher resets the identity and bumps the epoch", () => {
  const publisher = Symbol("admin-auth-clear-owner");
  publishAdminAuthIdentity(publisher, "user-clear-owner");
  const epochBeforeClear = getAdminAuthIdentity().epoch;
  clearAdminAuthIdentity(publisher);
  const after = getAdminAuthIdentity();
  expect(after.userId).toBeNull();
  expect(after.epoch).toBe(epochBeforeClear + 1);
});
