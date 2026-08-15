import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createEntryUnlockToken,
  hashEntryCookieId,
  resolveEntryUnlockTtlMs,
  verifyEntryUnlockToken,
} from "../../../core/services/content/entryUnlockToken";
import { ApiError } from "../../../core/server/errorHandler";

const SECRET = "test-entry-unlock-secret";
const ORIGINAL_SECRET = process.env.ENTRY_UNLOCK_SECRET;
const ORIGINAL_TTL = process.env.ENTRY_UNLOCK_TTL_HOURS;

beforeAll(() => {
  process.env.ENTRY_UNLOCK_SECRET = SECRET;
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.ENTRY_UNLOCK_SECRET;
  } else {
    process.env.ENTRY_UNLOCK_SECRET = ORIGINAL_SECRET;
  }
  if (ORIGINAL_TTL === undefined) {
    delete process.env.ENTRY_UNLOCK_TTL_HOURS;
  } else {
    process.env.ENTRY_UNLOCK_TTL_HOURS = ORIGINAL_TTL;
  }
});

describe("createEntryUnlockToken / verifyEntryUnlockToken", () => {
  it("round-trips a valid token for the same entry id", () => {
    const entryId = "11111111-1111-4111-8111-111111111111";
    const token = createEntryUnlockToken(entryId);
    expect(verifyEntryUnlockToken(entryId, token)).toBe(true);
  });

  it("binds the token to the entry id (no cross-entry unlock)", () => {
    const entryA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const entryB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const token = createEntryUnlockToken(entryA);
    expect(verifyEntryUnlockToken(entryA, token)).toBe(true);
    expect(verifyEntryUnlockToken(entryB, token)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const entryId = "11111111-1111-4111-8111-111111111111";
    const token = createEntryUnlockToken(entryId);
    const flipped = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(verifyEntryUnlockToken(entryId, flipped)).toBe(false);
  });

  it("rejects a tampered timestamp", () => {
    const entryId = "11111111-1111-4111-8111-111111111111";
    const token = createEntryUnlockToken(entryId);
    const tampered = `9999999999${token.slice(token.indexOf("."))}`;
    expect(verifyEntryUnlockToken(entryId, tampered)).toBe(false);
  });

  it("rejects malformed tokens without throwing", () => {
    const entryId = "11111111-1111-4111-8111-111111111111";
    for (const token of ["", "nodot", ".sig", "123.", "abc.def"]) {
      expect(verifyEntryUnlockToken(entryId, token)).toBe(false);
    }
    expect(verifyEntryUnlockToken(entryId, null)).toBe(false);
    expect(verifyEntryUnlockToken(entryId, undefined)).toBe(false);
    expect(verifyEntryUnlockToken("", createEntryUnlockToken(entryId))).toBe(false);
  });

  it("rejects an expired token", () => {
    const entryId = "11111111-1111-4111-8111-111111111111";
    const now = Date.now();
    const token = createEntryUnlockToken(entryId, now);
    const ttl = resolveEntryUnlockTtlMs();
    expect(verifyEntryUnlockToken(entryId, token, now + ttl + 1000)).toBe(false);
    expect(verifyEntryUnlockToken(entryId, token, now)).toBe(true);
  });

  it("rejects a future-skewed token", () => {
    const entryId = "11111111-1111-4111-8111-111111111111";
    const now = Date.now();
    const token = createEntryUnlockToken(entryId, now + 60 * 60 * 1000);
    expect(verifyEntryUnlockToken(entryId, token, now)).toBe(false);
  });

  it("never throws on a missing secret in verify; create still throws", () => {
    const entryId = "11111111-1111-4111-8111-111111111111";
    const token = createEntryUnlockToken(entryId);
    delete process.env.ENTRY_UNLOCK_SECRET;
    expect(verifyEntryUnlockToken(entryId, token)).toBe(false);
    expect(verifyEntryUnlockToken(entryId, null)).toBe(false);
    expect(() => createEntryUnlockToken(entryId)).toThrow(ApiError);
    process.env.ENTRY_UNLOCK_SECRET = SECRET;
  });
});

describe("resolveEntryUnlockTtlMs", () => {
  it("defaults to 12 hours when unset or invalid", () => {
    delete process.env.ENTRY_UNLOCK_TTL_HOURS;
    expect(resolveEntryUnlockTtlMs()).toBe(12 * 3600 * 1000);
    process.env.ENTRY_UNLOCK_TTL_HOURS = "0";
    expect(resolveEntryUnlockTtlMs()).toBe(12 * 3600 * 1000);
    process.env.ENTRY_UNLOCK_TTL_HOURS = "abc";
    expect(resolveEntryUnlockTtlMs()).toBe(12 * 3600 * 1000);
  });

  it("honors a positive TTL override", () => {
    process.env.ENTRY_UNLOCK_TTL_HOURS = "24";
    expect(resolveEntryUnlockTtlMs()).toBe(24 * 3600 * 1000);
  });
});

describe("hashEntryCookieId", () => {
  it("is deterministic for the same entry id", () => {
    const entryId = "11111111-1111-4111-8111-111111111111";
    expect(hashEntryCookieId(entryId)).toBe(hashEntryCookieId(entryId));
  });

  it("has a stable bounded length", () => {
    expect(hashEntryCookieId("any-id")).toHaveLength(16);
  });

  it("is distinct for distinct entry ids", () => {
    expect(hashEntryCookieId("entry-a")).not.toBe(hashEntryCookieId("entry-b"));
  });
});
