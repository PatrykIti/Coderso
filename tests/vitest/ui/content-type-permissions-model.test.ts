import { describe, expect, test } from "vitest";

import {
  CAPABILITIES,
  normalizePermissionsMatrix,
  resolveRoleCapabilities,
  toggleCapability,
  type PermissionsMatrix,
} from "../../../core/admin/ui/content-types/contentTypePermissions";

describe("contentTypePermissions", () => {
  test("CAPABILITIES is the fixed five-capability allowlist", () => {
    expect(CAPABILITIES).toEqual(["read", "create", "update", "delete", "publish"]);
  });

  test("normalizePermissionsMatrix keeps only true caps and drops malformed or empty rows", () => {
    // Malformed rows are invalid at the type level; they model hostile payloads.
    const input = {
      editor: { read: true, create: false, delete: true },
      viewer: { read: false },
      ghost: null,
      stranger: "nope",
      custom: { read: true, anything: true },
      empty: {},
    } as unknown as PermissionsMatrix;
    expect(normalizePermissionsMatrix(input)).toEqual({
      editor: { read: true, delete: true },
      custom: { read: true },
    });
  });

  test("normalizePermissionsMatrix is a no-op on already clean matrices", () => {
    const clean = { editor: { read: true } };
    expect(normalizePermissionsMatrix(clean)).toEqual(clean);
    expect(normalizePermissionsMatrix({})).toEqual({});
  });

  test("resolveRoleCapabilities returns a copy and defaults to empty", () => {
    const matrix = { editor: { read: true } };
    const caps = resolveRoleCapabilities(matrix, "editor");
    expect(caps).toEqual({ read: true });
    expect(caps).not.toBe(matrix.editor);
    expect(resolveRoleCapabilities(matrix, "missing")).toEqual({});
    expect(resolveRoleCapabilities(undefined, "editor")).toEqual({});
  });

  test("toggleCapability sets and clears caps without mutating the input", () => {
    const matrix = { editor: { read: true } };
    const next = toggleCapability(matrix, "editor", "create", true);
    expect(next).toEqual({ editor: { read: true, create: true } });
    expect(matrix).toEqual({ editor: { read: true } });

    const cleared = toggleCapability(next, "editor", "read", false);
    expect(cleared).toEqual({ editor: { create: true } });

    const emptied = toggleCapability(cleared, "editor", "create", false);
    expect(emptied).toEqual({});

    expect(toggleCapability(undefined, "editor", "read", true)).toEqual({
      editor: { read: true },
    });
  });
});
