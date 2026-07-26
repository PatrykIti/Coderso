import { describe, expect, test } from "bun:test";

import {
  DEFAULT_FORMA_DOM_PACKAGE_PATH,
  parseFullSiteCliArgs,
  runFullSiteCli,
  safeCliError,
  type FullSiteCliDeps,
} from "../../../scripts/projekty-domow/fullSiteCli";
import type { FullSitePackageV1 } from "../../../core/services/kits/fullSitePackage/types";

const ACTOR = "123e4567-e89b-42d3-a456-426614174000";
const RUN = "123e4567-e89b-42d3-a456-426614174001";
const pkg: FullSitePackageV1 = {
  schemaVersion: 1,
  key: "cli-test",
  metadata: { name: "CLI", locale: "pl" },
  resources: {
    contentTypes: [],
    forms: [],
    pageTemplates: [],
    listingTemplates: [],
    entries: [],
    listingQueries: [],
    detailPages: [],
    pages: [],
    menus: [],
    settings: [],
  },
};

const deps = () => {
  const calls: string[] = [];
  const output: string[] = [];
  const value: FullSiteCliDeps = {
    readPackage: async (path) => {
      calls.push(`read:${path}`);
      return pkg;
    },
    apply: async (input) => {
      calls.push(`apply:${input.dryRun}`);
      return { runId: RUN, resources: [{ id: "safe" }] };
    },
    rollback: async (input) => {
      calls.push(`rollback:${input.sourceRunId}`);
      return { runId: RUN };
    },
    writeOutput: (line) => output.push(line),
  };
  return { value, calls, output };
};

describe("full-site CLI parser", () => {
  test("parses strict dry-run, apply and rollback modes", () => {
    expect(parseFullSiteCliArgs(["--dry-run", "--file", "site.json", "--actor", ACTOR])).toEqual({
      mode: "dry-run",
      file: "site.json",
      actorId: ACTOR,
      allowSettingTakeover: false,
    });
    expect(parseFullSiteCliArgs(["--apply", "--file", "site.json", "--actor", ACTOR])).toEqual({
      mode: "apply",
      file: "site.json",
      actorId: ACTOR,
      allowSettingTakeover: false,
    });
    expect(parseFullSiteCliArgs(["--dry-run", "--actor", ACTOR])).toEqual({
      mode: "dry-run",
      file: DEFAULT_FORMA_DOM_PACKAGE_PATH,
      actorId: ACTOR,
      allowSettingTakeover: false,
    });
    expect(
      parseFullSiteCliArgs([
        "--apply",
        "--allow-setting-takeover",
        "--file",
        "site.json",
        "--actor",
        ACTOR,
      ])
    ).toEqual({
      mode: "apply",
      file: "site.json",
      actorId: ACTOR,
      allowSettingTakeover: true,
    });
    expect(parseFullSiteCliArgs(["--rollback", RUN, "--actor", ACTOR])).toEqual({
      mode: "rollback",
      sourceRunId: RUN,
      actorId: ACTOR,
    });
  });

  test.each([
    [["--apply", "--dry-run", "--file", "site.json", "--actor", ACTOR]],
    [["--rollback", RUN, "--file", "site.json", "--actor", ACTOR]],
    [["--apply", "--file", "site.json"]],
    [["--apply", "--file", "site.json", "--actor", "bad"]],
    [["--rollback", "bad", "--actor", ACTOR]],
    [["--unknown", "--actor", ACTOR]],
  ] as const)("rejects ambiguous or malformed arguments", (argv) => {
    expect(() => parseFullSiteCliArgs(argv)).toThrow();
  });

  test("rejects missing arguments", () => {
    expect(() => parseFullSiteCliArgs([])).toThrow("site_package_actor_invalid");
  });
});

describe("full-site CLI execution", () => {
  test("invalid actor causes zero file or database dependency calls", async () => {
    const state = deps();
    await expect(
      runFullSiteCli(["--apply", "--file", "site.json", "--actor", "bad"], state.value)
    ).rejects.toThrow("site_package_actor_invalid");
    expect(state.calls).toEqual([]);
  });

  test("file/schema failure occurs before apply dependency", async () => {
    const state = deps();
    state.value.readPackage = async () => {
      state.calls.push("read");
      throw new Error("site_package_file_invalid");
    };
    await expect(
      runFullSiteCli(["--apply", "--file", "huge.json", "--actor", ACTOR], state.value)
    ).rejects.toThrow("site_package_file_invalid");
    expect(state.calls).toEqual(["read"]);
  });

  test("delegates dry-run and apply with explicit actor and safe summary", async () => {
    for (const [flag, expected] of [
      ["--dry-run", true],
      ["--apply", false],
    ] as const) {
      const state = deps();
      await runFullSiteCli([flag, "--file", "site.json", "--actor", ACTOR], state.value);
      expect(state.calls).toEqual(["read:site.json", `apply:${expected}`]);
      expect(JSON.parse(state.output[0]!)).toEqual({
        ok: true,
        mode: expected ? "dry-run" : "apply",
        runId: RUN,
        resourceCount: 1,
      });
    }
  });

  test("reads the canonical artifact when --file is omitted", async () => {
    const state = deps();
    await runFullSiteCli(["--dry-run", "--actor", ACTOR], state.value);
    expect(state.calls).toEqual([`read:${DEFAULT_FORMA_DOM_PACKAGE_PATH}`, "apply:true"]);
  });

  test("delegates exact rollback source without reading a package", async () => {
    const state = deps();
    await runFullSiteCli(["--rollback", RUN, "--actor", ACTOR], state.value);
    expect(state.calls).toEqual([`rollback:${RUN}`]);
  });

  test("redacts unsafe service errors", () => {
    expect(safeCliError(new Error("password=secret raw payload"))).toBe(
      '{"ok":false,"error":"site_package_cli_failed"}'
    );
    expect(safeCliError(new Error("site_package_token_sk_live_123456"))).toBe(
      '{"ok":false,"error":"site_package_cli_failed"}'
    );
    expect(safeCliError(new Error("site_package_conflict"))).toContain("site_package_conflict");
  });
});
