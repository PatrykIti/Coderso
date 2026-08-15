import { describe, expect, it } from "vitest";

import {
  resolveEntryVisibilityGate,
  type EntryGateDecision,
} from "../../../core/services/content/entryVisibilityGate";

const decisionKind = (input: {
  visibility: string | null | undefined;
  hasPassword?: boolean;
  isAuthenticated?: boolean;
  hasValidUnlock?: boolean;
}): EntryGateDecision["kind"] =>
  resolveEntryVisibilityGate({
    visibility: input.visibility,
    hasPassword: input.hasPassword ?? false,
    isAuthenticated: input.isAuthenticated ?? false,
    hasValidUnlock: input.hasValidUnlock ?? false,
  }).kind;

describe("resolveEntryVisibilityGate", () => {
  it("allows public entries for anonymous visitors", () => {
    expect(decisionKind({ visibility: "public" })).toBe("allow");
  });

  it("allows public entries for authenticated visitors", () => {
    expect(decisionKind({ visibility: "public", isAuthenticated: true })).toBe("allow");
  });

  it("hides private entries from anonymous visitors (uniform not-found)", () => {
    expect(decisionKind({ visibility: "private" })).toBe("not-found");
  });

  it("bypasses the gate for authenticated private-entry renders", () => {
    expect(decisionKind({ visibility: "private", isAuthenticated: true })).toBe("allow");
  });

  it("prompts for password entries without a valid unlock", () => {
    expect(decisionKind({ visibility: "password", hasPassword: true, hasValidUnlock: false })).toBe(
      "prompt"
    );
  });

  it("allows password entries with a valid unlock", () => {
    expect(decisionKind({ visibility: "password", hasPassword: true, hasValidUnlock: true })).toBe(
      "allow"
    );
  });

  it("bypasses the gate for authenticated password-entry renders regardless of unlock", () => {
    expect(decisionKind({ visibility: "password", hasPassword: true, isAuthenticated: true })).toBe(
      "allow"
    );
  });

  it("treats unknown visibility values as not-found (fail-closed)", () => {
    for (const visibility of ["secret", "draft", "archived"]) {
      expect(decisionKind({ visibility })).toBe("not-found");
    }
  });

  it("treats null and undefined visibility as not-found (fail-closed)", () => {
    expect(decisionKind({ visibility: null })).toBe("not-found");
    expect(decisionKind({ visibility: undefined })).toBe("not-found");
  });

  it("treats empty-string visibility as not-found (fail-closed)", () => {
    expect(decisionKind({ visibility: "" })).toBe("not-found");
  });

  it("always allows authenticated renders for every visibility value", () => {
    for (const visibility of ["public", "private", "password", "secret", null, undefined]) {
      expect(decisionKind({ visibility, isAuthenticated: true })).toBe("allow");
    }
  });

  it("keeps a password entry with no hash set fail-closed to prompt", () => {
    expect(
      decisionKind({ visibility: "password", hasPassword: false, hasValidUnlock: false })
    ).toBe("prompt");
  });
});
