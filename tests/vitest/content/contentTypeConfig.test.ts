import { describe, expect, it } from "vitest";
import {
  normalizeContentTypeConfig,
  type ContentTypeConfig,
} from "../../../core/services/content/contentTypeConfig";
import { resolveDraftsEnabled, resolveVersioning } from "@/services/contentTypesClient";
import {
  CAPABILITIES,
  normalizePermissionsMatrix,
  resolveRoleCapabilities,
  toggleCapability,
  type PermissionsMatrix,
} from "@/ui/content-types/contentTypePermissions";

// TASK-513-06 cross-cutting pure-lane coverage (Bun-free): the server-authoritative
// normalizeContentTypeConfig (imported directly from the db-free module), the client-mirrored
// resolve helpers, and 513-04's UI-side permissions minimizer.

describe("normalizeContentTypeConfig (server-authoritative, db-free)", () => {
  it("returns {} for empty / null / undefined / non-object (legacy rows unchanged)", () => {
    expect(normalizeContentTypeConfig(undefined)).toEqual({});
    expect(normalizeContentTypeConfig(null)).toEqual({});
    expect(normalizeContentTypeConfig({})).toEqual({});
  });

  it("throws content_type_config_invalid for non-object non-null input (e.g. array)", () => {
    expect(() => normalizeContentTypeConfig([])).toThrow("content_type_config_invalid");
    expect(() => normalizeContentTypeConfig("nope")).toThrow("content_type_config_invalid");
  });

  it("trims names and drops empty / >120-char names (fail-soft omit)", () => {
    expect(normalizeContentTypeConfig({ singularName: "  Story  ", pluralName: "" })).toEqual({
      singularName: "Story",
    });
    const long = "x".repeat(200);
    const out = normalizeContentTypeConfig({ singularName: long });
    expect(out.singularName?.length).toBe(120);
  });

  it("drops booleans at their resolved default (draftsEnabled=true, versioning=false)", () => {
    expect(normalizeContentTypeConfig({ draftsEnabled: true, versioning: false })).toEqual({});
    expect(normalizeContentTypeConfig({ draftsEnabled: false, versioning: true })).toEqual({
      draftsEnabled: false,
      versioning: true,
    });
  });

  it("rejects an unknown top-level key", () => {
    expect(() => normalizeContentTypeConfig({ bogus: true })).toThrow(
      "content_type_config_invalid"
    );
  });

  it("rejects an unknown per-role capability key (inlined permission normalization)", () => {
    expect(() => normalizeContentTypeConfig({ permissions: { editor: { bogus: true } } })).toThrow(
      "content_type_config_invalid"
    );
  });

  it("keeps only true caps, drops empty roles, round-trips a valid permissions matrix", () => {
    const out = normalizeContentTypeConfig({
      permissions: {
        editor: { read: true, create: false },
        viewer: { read: false }, // all-false role dropped entirely
      },
    });
    expect(out).toEqual({ permissions: { editor: { read: true } } });
  });

  it("is idempotent (normalize(normalize(x)) === normalize(x)) — duplicate copies config safely", () => {
    const input: ContentTypeConfig = {
      singularName: "Story",
      draftsEnabled: false,
      permissions: { editor: { read: true, publish: true } },
    };
    const once = normalizeContentTypeConfig(input);
    expect(normalizeContentTypeConfig(once)).toEqual(once);
  });
});

describe("resolveDraftsEnabled / resolveVersioning (client-mirrored, pure)", () => {
  it("resolves defaults for missing config (drafts on, versioning off)", () => {
    expect(resolveDraftsEnabled(undefined)).toBe(true);
    expect(resolveVersioning(undefined)).toBe(false);
    expect(resolveDraftsEnabled({})).toBe(true);
    expect(resolveVersioning({})).toBe(false);
  });

  it("honors explicit overrides", () => {
    expect(resolveDraftsEnabled({ draftsEnabled: false })).toBe(false);
    expect(resolveVersioning({ versioning: true })).toBe(true);
  });
});

describe("permissions matrix UI helpers (513-04 minimizer)", () => {
  it("exposes the fixed 5-cap allowlist", () => {
    expect([...CAPABILITIES]).toEqual(["read", "create", "update", "delete", "publish"]);
  });

  it("normalizePermissionsMatrix drops false caps + empty roles, round-trips a valid matrix", () => {
    const input: PermissionsMatrix = {
      editor: { read: true, create: false },
      ghost: { read: false, publish: false },
    };
    expect(normalizePermissionsMatrix(input)).toEqual({ editor: { read: true } });
  });

  it("toggleCapability sets and clears (clearing the last cap removes the role row)", () => {
    let m: PermissionsMatrix = {};
    m = toggleCapability(m, "editor", "read", true);
    expect(m).toEqual({ editor: { read: true } });
    m = toggleCapability(m, "editor", "publish", true);
    expect(m).toEqual({ editor: { read: true, publish: true } });
    m = toggleCapability(m, "editor", "read", false);
    expect(m).toEqual({ editor: { publish: true } });
    m = toggleCapability(m, "editor", "publish", false);
    expect(m).toEqual({}); // clearing the last cap removes the role
  });

  it("toggleCapability never mutates the input matrix", () => {
    const input: PermissionsMatrix = { editor: { read: true } };
    const next = toggleCapability(input, "editor", "create", true);
    expect(input).toEqual({ editor: { read: true } });
    expect(next).toEqual({ editor: { read: true, create: true } });
  });

  it("resolveRoleCapabilities returns {} for a missing role and a copy for a present one", () => {
    const matrix: PermissionsMatrix = { editor: { read: true } };
    expect(resolveRoleCapabilities(matrix, "viewer")).toEqual({});
    expect(resolveRoleCapabilities(undefined, "editor")).toEqual({});
    const caps = resolveRoleCapabilities(matrix, "editor");
    expect(caps).toEqual({ read: true });
    caps.create = true; // mutate the returned copy
    expect(matrix.editor).toEqual({ read: true }); // stored config untouched
  });
});
