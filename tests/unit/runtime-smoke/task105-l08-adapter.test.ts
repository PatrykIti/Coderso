import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { SmokeError } from "../../../scripts/runtime-smoke/contracts";
import type { SmokeInput } from "../../../scripts/runtime-smoke/contracts";
import {
  assertExactTask105L08Invocation,
  buildTask105L08ManifestableScenarios,
  defaultTask105L08AdapterFixtureDeps,
  runTask105L08Adapter,
  task105L08EvidenceDirectory,
} from "../../../scripts/runtime-smoke/adapters/task-105-l08";
import { TASK105_L08_SCENARIOS } from "../../../scripts/runtime-smoke/adapters/task-105-l08";
import {
  TASK_105_L08_SCENARIO_DESCRIPTORS,
  TASK_105_L08_SCENARIO_SURFACES,
  requireTask105L08Descriptor,
  task105L08FactsFor,
} from "../../../scripts/runtime-smoke/adapters/task-105-l08/descriptors";
import { buildExactTask105L08ScreenshotManifest } from "../../../scripts/runtime-smoke/adapters/task-105-l08/output-manifest";
import {
  task105L08AdminBase,
  task105L08ContentListPath,
  task105L08RoleName,
  task105L08UserEmail,
} from "../../../scripts/runtime-smoke/adapters/task-105-l08/fixture";
import {
  TASK_105_L08_ADMIN_ORIGIN,
  TASK_105_L08_PUBLIC_ORIGIN,
  task105L08Readiness,
  validateTask105L08AdminBase,
} from "../../../scripts/runtime-smoke/adapters/task-105-l08/host";
import { proveTask105L08Routes } from "../../../scripts/runtime-smoke/adapters/task-105-l08/browser-drivers";

const INPUT: SmokeInput = {
  command: "run",
  suite: "task-105-l08",
  profile: "fast",
  session: "task105l08-fast",
};

function scenarioFacts(scenarioId: string): Record<string, unknown>[] {
  const id = requireTask105L08Descriptor(scenarioId).id;
  return task105L08FactsFor(id).map((contract) => {
    const value = contract.expected ?? "128px";
    return {
      kind: contract.kind,
      target: contract.target,
      property: contract.property,
      expected: value,
      actual: value,
      pass: true,
    };
  });
}

function receipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    scenarioIds: [...TASK105_L08_SCENARIOS],
    consoleErrorCount: 0,
    pageErrorCount: 0,
    scenarios: TASK_105_L08_SCENARIO_DESCRIPTORS.map((descriptor) => ({
      scenarioId: descriptor.id,
      theme: descriptor.themes[0] ?? "light",
      surface: TASK_105_L08_SCENARIO_SURFACES[descriptor.id],
      viewport: { width: descriptor.viewport.width, height: descriptor.viewport.height },
      facts: scenarioFacts(descriptor.id),
    })),
    ...overrides,
  };
}

function archived() {
  const manifest = buildExactTask105L08ScreenshotManifest(INPUT);
  return manifest.entries.map((entry, index) => ({
    path: `screenshots/${entry.path.split("/").at(-1) ?? ""}`,
    sha256: `${String(index).padStart(2, "0")}${"a".repeat(62)}`,
  }));
}

describe("TASK-105 L08 adapter boundary", () => {
  test("accepts only the exact invocation and evidence session", () => {
    expect(() => assertExactTask105L08Invocation(INPUT)).not.toThrow();
    expect(() => assertExactTask105L08Invocation({ ...INPUT, suite: "task-105-l05" })).toThrow(
      SmokeError
    );
    expect(() =>
      assertExactTask105L08Invocation({ ...INPUT, profile: "certification" })
    ).not.toThrow();
    expect(task105L08EvidenceDirectory(INPUT, "/repo")).toBe(
      join("/repo", "_docs/_workflows/_smoke/evidence/task-105/task105l08-fast")
    );
    expect(() =>
      task105L08EvidenceDirectory({ ...INPUT, session: "../../escape" }, "/repo")
    ).toThrow(SmokeError);
  });

  test("admin base derivation is session-owned and rejects defaults", () => {
    expect(task105L08AdminBase(INPUT.session)).toBe("/task105l08-fast-admin");
    expect(validateTask105L08AdminBase(INPUT.session, "/task105l08-fast-admin")).toBe(
      "/task105l08-fast-admin"
    );
    expect(() => validateTask105L08AdminBase(INPUT.session, "/admin")).toThrow(SmokeError);
    expect(() => validateTask105L08AdminBase(INPUT.session, "/other-admin")).toThrow(SmokeError);
    expect(() => validateTask105L08AdminBase("other", "/task105l08-fast-admin")).toThrow(
      SmokeError
    );
    expect(task105L08ContentListPath(INPUT.session)).toBe("/task105l08-fast-journal");
    expect(task105L08RoleName(INPUT.session)).toBe("task-105-l08-task105l08-fast-role");
    expect(task105L08UserEmail(INPUT.session)).toBe("task-105-l08-task105l08-fast@smoke.invalid");
  });

  test("projects manifestable scenarios only from proven facts and archives", () => {
    const scenarios = buildTask105L08ManifestableScenarios(
      receipt() as never,
      archived() as never
    ) as Record<string, unknown>[];
    expect(scenarios.map((scenario) => scenario.id)).toEqual([...TASK105_L08_SCENARIOS]);
    expect(scenarios.every((scenario) => scenario.pass === true)).toBe(true);
    expect(
      scenarios.every(
        (scenario) => Array.isArray(scenario.variants) && scenario.variants.length === 1
      )
    ).toBe(true);
    expect(
      scenarios.every(
        (scenario) => Array.isArray(scenario.screenshots) && scenario.screenshots.length === 1
      )
    ).toBe(true);
    expect(() => buildTask105L08ManifestableScenarios(receipt() as never, [])).toThrow();
    expect(() =>
      buildTask105L08ManifestableScenarios(
        receipt({ consoleErrorCount: 1 }) as never,
        archived() as never
      )
    ).toThrow();
  });

  test("default fixture deps fail closed without a live database seam", async () => {
    const deps = defaultTask105L08AdapterFixtureDeps();
    await expect(deps.createPublishedPage()).rejects.toThrow();
  });

  test("adapter contract rejects foreign contexts before any resource is created", async () => {
    const adapterModule = await import("../../../scripts/runtime-smoke/adapters/task-105-l08");
    expect(adapterModule.default.suiteId).toBe("task-105-l08");
    expect(adapterModule.default.supportedProfiles).toEqual(["fast", "certification"]);
    expect(adapterModule.default.evidenceSessionPolicy).toBeUndefined();
    await expect(
      runTask105L08Adapter({
        input: { ...INPUT, suite: "task-105-l05" },
        root: "/repo",
      } as never)
    ).rejects.toThrow(SmokeError);
  });

  test("fixture content plan covers both editors across five scenarios", () => {
    const descriptorIds = TASK_105_L08_SCENARIO_DESCRIPTORS.map((descriptor) => descriptor.id);
    expect(descriptorIds.filter((id) => id.startsWith("page-")).length).toBe(2);
    expect(descriptorIds.filter((id) => id.startsWith("post-")).length).toBe(3);
    expect(requireTask105L08Descriptor("page-deep-section-insert-visible-layer").number).toBe(1);
    expect(
      requireTask105L08Descriptor("post-richtext-command-slash-transition-visible").viewport
    ).toEqual({ width: 1440, height: 900 });
  });

  test("readiness probes target routes the host actually serves", async () => {
    const adminBase = task105L08AdminBase(INPUT.session);
    const requested: string[] = [];
    const probes = task105L08Readiness({
      adminBase,
      fetch: (async (url: string | URL) => {
        requested.push(String(url));
        return new Response(null, { status: 200 });
      }) as typeof fetch,
    });
    expect(await Promise.all(probes.map(({ check }) => check()))).toEqual([true, true, true, true]);
    // The core server permanently 404s a loopback Host on `/`, so the front
    // probe must target the direct-core admin API route, never the site root.
    expect(requested).toContain(
      `${TASK_105_L08_PUBLIC_ORIGIN}${adminBase}/api/auth/install/status`
    );
    expect(requested).toContain(`${TASK_105_L08_ADMIN_ORIGIN}${adminBase}/`);
    expect(requested).toContain(`${TASK_105_L08_ADMIN_ORIGIN}${adminBase}/api/auth/install/status`);
    expect(requested).toContain("http://127.0.0.1:5174/site/main.ts");
    expect(requested).not.toContain(`${TASK_105_L08_PUBLIC_ORIGIN}/`);
  });

  test("route proof covers admin base and list route, never the bare public root", async () => {
    const adminBase = task105L08AdminBase(INPUT.session);
    const listPath = task105L08ContentListPath(INPUT.session);
    const requested: string[] = [];
    await proveTask105L08Routes({
      adminBase,
      listPath,
      fetch: (async (url: string | URL) => {
        requested.push(String(url));
        return new Response(null, { status: 200 });
      }) as typeof fetch,
    });
    expect(requested).toContain(`${TASK_105_L08_ADMIN_ORIGIN}${adminBase}/`);
    expect(requested).toContain(`${TASK_105_L08_ADMIN_ORIGIN}${adminBase}/api/auth/install/status`);
    expect(requested).toContain(`${TASK_105_L08_PUBLIC_ORIGIN}${listPath}`);
    // The core server permanently 404s a loopback Host on `/`, so a bare-root
    // probe can never satisfy and would poison the whole route proof.
    expect(requested).not.toContain(`${TASK_105_L08_PUBLIC_ORIGIN}/`);
  });
});
