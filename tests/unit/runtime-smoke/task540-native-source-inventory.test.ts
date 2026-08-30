import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import {
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  createSourceFile,
  forEachChild,
  isCallExpression,
  isStringLiteralLike,
  preProcessFile,
  type Node,
} from "typescript";

import { buildTask540ScenarioResetContracts } from "../../../scripts/runtime-smoke/adapters/task-540/scenario-resets";

type Reachability = "registered-static" | "host-subprocess" | "workflow-only";
type Disposition =
  | "l01-stable-contract"
  | "l02-typed-operation"
  | "l03-browser-host-composition"
  | "l04-delete-only";

interface InventoryEntry {
  readonly path: string;
  readonly sha256: string;
  readonly reachability: Reachability;
  readonly importTimeSelfTest: boolean;
  readonly disposition: Disposition;
  readonly destination: string | null;
}

interface CurrentDestinationDivergence {
  readonly destination: string;
  readonly historicalSha256: string;
  readonly currentSha256: string;
  readonly owner: string;
  readonly rationale: string;
}

interface InventoryFixture {
  readonly schemaVersion: 2;
  readonly sourceManifestSha256: string;
  readonly currentDestinationDivergences: readonly CurrentDestinationDivergence[];
  readonly counts: {
    readonly tracked: number;
    readonly reachability: Readonly<Record<Reachability, number>>;
    readonly importTimeSelfTests: number;
    readonly dispositions: Readonly<Record<Disposition, number>>;
  };
  readonly destinationOwnership: readonly {
    readonly disposition: Disposition;
    readonly roots: readonly string[];
    readonly exactPaths: readonly string[];
  }[];
  readonly entries: readonly InventoryEntry[];
}

interface NativeAction {
  readonly id: string;
  readonly scenario: string;
  readonly executable: {
    readonly type: string;
  };
}

interface NativePlan {
  readonly requiredScenarios: readonly string[];
  readonly actionManifest: readonly NativeAction[];
  readonly requiredScreenshotPaths: readonly string[];
  readonly registries: {
    readonly screenshotPaths: Readonly<Record<string, string>>;
  };
}

interface NativePlanModule {
  readonly buildTask540NativePlan: (input: { readonly nonce: string }) => NativePlan;
}

interface NativeSharedModule {
  readonly canonicalJson: (value: unknown) => string;
  readonly hashBytes: (bytes: Uint8Array) => string;
}

const root = path.resolve(import.meta.dir, "../../..");
const fixturePath = "tests/fixtures/runtime-smoke/task540-native-source-inventory.json";
const adapterRoot = "scripts/runtime-smoke/adapters/task-540";
const nativeContractRoot = `${adapterRoot}/suite/contract/`;
const nativeSharedRoot = `${adapterRoot}/suite/shared/`;
const legacyTree = "_docs/_workflows/task-540-smoke/";
const sha256Pattern = /^[a-f0-9]{64}$/u;

const topLevelLegacyPaths = Object.freeze(
  [
    "task-540-codex-agent-bridge.mjs",
    "task-540-implement.mjs",
    "task-540-local-orchestrator.mjs",
    "task-540-smoke-contract.mjs",
    "task-540-smoke-executor.mjs",
    "task-540-smoke-host.mjs",
    "task-540-test-name-contract.mjs",
  ].map((name) => `_docs/_workflows/${name}`)
);

const expectedCounts = Object.freeze({
  tracked: 169,
  reachability: Object.freeze({
    "host-subprocess": 17,
    "registered-static": 148,
    "workflow-only": 4,
  }),
  importTimeSelfTests: 44,
  dispositions: Object.freeze({
    "l01-stable-contract": 26,
    "l02-typed-operation": 43,
    "l03-browser-host-composition": 51,
    "l04-delete-only": 49,
  }),
});

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function isAbsent(relativePath: string): Promise<boolean> {
  return lstat(path.join(root, relativePath)).then(
    () => false,
    (error: NodeJS.ErrnoException) => error.code === "ENOENT"
  );
}

async function walkCode(relativeRoot: string): Promise<readonly string[]> {
  const found: string[] = [];
  const visit = async (relativeDirectory: string): Promise<void> => {
    for (const entry of await readdir(path.join(root, relativeDirectory), {
      withFileTypes: true,
    })) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      expect(entry.isSymbolicLink()).toBe(false);
      if (entry.isDirectory()) {
        await visit(relativePath);
      } else if (/\.(?:[cm]?[jt]s|[cm]?[jt]sx)$/u.test(entry.name)) {
        found.push(relativePath);
      }
    }
  };
  await visit(relativeRoot);
  return Object.freeze(found.sort());
}

function dynamicImportSpecifiers(sourcePath: string, source: string): readonly string[] {
  const sourceFile = createSourceFile(sourcePath, source, ScriptTarget.ESNext, true, ScriptKind.TS);
  const specifiers: string[] = [];
  const visit = (node: Node): void => {
    if (isCallExpression(node) && node.expression.kind === SyntaxKind.ImportKeyword) {
      expect(node.arguments).toHaveLength(1);
      expect(isStringLiteralLike(node.arguments[0])).toBe(true);
      if (isStringLiteralLike(node.arguments[0])) specifiers.push(node.arguments[0].text);
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return Object.freeze(specifiers);
}

const fixture = JSON.parse(
  await readFile(path.join(root, fixturePath), "utf8")
) as InventoryFixture;

test("TASK-540 immutable legacy manifest proves the exact reviewed 169-file deletion", async () => {
  expect(fixture.schemaVersion).toBe(2);
  expect(Object.keys(fixture).sort()).toEqual([
    "counts",
    "currentDestinationDivergences",
    "destinationOwnership",
    "entries",
    "schemaVersion",
    "sourceManifestSha256",
  ]);
  expect(fixture.counts).toEqual(expectedCounts);
  expect(fixture.entries).toHaveLength(169);
  expect(new Set(fixture.entries.map(({ path: sourcePath }) => sourcePath)).size).toBe(169);
  expect(
    fixture.entries.filter(({ path: sourcePath }) => sourcePath.startsWith(legacyTree))
  ).toHaveLength(162);
  expect(
    fixture.entries
      .filter(({ path: sourcePath }) => !sourcePath.startsWith(legacyTree))
      .map(({ path: sourcePath }) => sourcePath)
      .sort()
  ).toEqual([...topLevelLegacyPaths].sort());
  expect(
    fixture.entries.every(
      (entry) =>
        sha256Pattern.test(entry.sha256) &&
        entry.path.endsWith(".mjs") &&
        (entry.path.startsWith(legacyTree) || topLevelLegacyPaths.includes(entry.path))
    )
  ).toBe(true);
  expect(
    sha256(
      fixture.entries
        .map(({ path: sourcePath, sha256: digest }) => `${digest}  ${sourcePath}\n`)
        .join("")
    )
  ).toBe(fixture.sourceManifestSha256);
  expect(fixture.sourceManifestSha256).toBe(
    "5e2e2e7571deeede2db1c58ab3f2e4c4a7ad36952a38f2d90b392e643584c13f"
  );
  expect(
    await Promise.all(fixture.entries.map(({ path: sourcePath }) => isAbsent(sourcePath)))
  ).toEqual(Array.from({ length: 169 }, () => true));
  expect(await isAbsent(legacyTree.slice(0, -1))).toBe(true);
  expect(await isAbsent(`${adapterRoot}/source-catalog.ts`)).toBe(true);
});

test("TASK-540 registered native tree has no executable docs dependency or dynamic worker-code loader", async () => {
  const adapterPath = `${adapterRoot}.ts`;
  const adapterSource = await readFile(path.join(root, adapterPath), "utf8");
  expect(adapterSource).toContain("runTask540NativeSuite");
  expect(adapterSource).not.toContain("_docs/_workflows");

  const codePaths = [adapterPath, ...(await walkCode(adapterRoot))];
  expect(codePaths.length).toBeGreaterThan(100);
  for (const sourcePath of codePaths) {
    const absolutePath = path.join(root, sourcePath);
    expect(await realpath(absolutePath)).toBe(absolutePath);
    const source = await readFile(absolutePath, "utf8");
    expect(source).not.toContain("_docs/_workflows/task-540");
    expect(source).not.toContain("source-catalog");
    expect(source).not.toMatch(
      /createRequire|data:text\/javascript|URL\.createObjectURL|\bnew Function\b|\beval\s*\(/u
    );
    for (const specifier of dynamicImportSpecifiers(sourcePath, source)) {
      expect(specifier).not.toContain("_docs");
    }
  }
});

test("TASK-540 stable native relocation is closed, import-time pure, and permits only its reviewed divergence", async () => {
  const nativeEntries = fixture.entries.filter(
    (entry): entry is InventoryEntry & { readonly destination: string } =>
      entry.destination !== null
  );
  expect(nativeEntries).toHaveLength(26);
  const nativePaths = nativeEntries.map(({ destination }) => destination).sort();
  const nativeSet = new Set(nativePaths);
  expect(fixture.destinationOwnership).toHaveLength(4);
  expect(
    fixture.destinationOwnership
      .filter(({ disposition }) => disposition === "l01-stable-contract")
      .flatMap(({ exactPaths }) => exactPaths)
      .sort()
  ).toEqual(nativePaths);

  const currentDestinations = await Promise.all(
    nativeEntries.map(async (entry) => {
      const source = await readFile(path.join(root, entry.destination));
      return Object.freeze({
        entry,
        source,
        currentSha256: sha256(source),
      });
    })
  );
  const actualDivergences = currentDestinations
    .filter(({ entry, currentSha256 }) => currentSha256 !== entry.sha256)
    .map(({ entry, currentSha256 }) =>
      Object.freeze({
        destination: entry.destination,
        historicalSha256: entry.sha256,
        currentSha256,
      })
    );

  expect(fixture.currentDestinationDivergences).toHaveLength(1);
  const [approvedDivergence] = fixture.currentDestinationDivergences;
  if (approvedDivergence === undefined) throw new Error("missing TASK-105-08-16 divergence");
  expect(Object.keys(approvedDivergence).sort()).toEqual([
    "currentSha256",
    "destination",
    "historicalSha256",
    "owner",
    "rationale",
  ]);
  expect(approvedDivergence.destination).toBe(
    "scripts/runtime-smoke/adapters/task-540/suite/contract/actions/setup.mjs"
  );
  expect(approvedDivergence.historicalSha256).toBe(
    "39c3c7c553b8f75473c226bff10e028a9a2266881bc4aef6c23ed85482ac606b"
  );
  expect(approvedDivergence.currentSha256).toBe(
    "c5cacbd8e106563eed2c7cf9c9bae551de20796cf25f47aed5e5f2e73e35c038"
  );
  expect(approvedDivergence.owner).toBe("TASK-105-08-16");
  expect(approvedDivergence.rationale).toBe(
    "Corrects the active preflight description to the exact task-User-Agent bounded session baseline."
  );
  expect(actualDivergences).toEqual(
    fixture.currentDestinationDivergences.map(({ destination, historicalSha256, currentSha256 }) =>
      Object.freeze({ destination, historicalSha256, currentSha256 })
    )
  );

  for (const { entry, source } of currentDestinations) {
    expect(
      entry.destination.startsWith(nativeContractRoot) ||
        entry.destination.startsWith(nativeSharedRoot)
    ).toBe(true);
    const text = source.toString("utf8");
    expect(text).not.toContain("_docs/_workflows/task-540");
    expect(text).not.toMatch(
      /String\.raw|\bBun\.|node:child_process|playwright-cli|\bspawn\s*\(|\bBlob\b|\beval\s*\(|\bcreateRequire\b|\brequire\s*\(|\bimport\s*\(/u
    );
    for (const { fileName: specifier } of preProcessFile(text, true, true).importedFiles) {
      if (!specifier.startsWith(".")) continue;
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(entry.destination), specifier)
      );
      expect(nativeSet.has(resolved)).toBe(true);
    }
  }

  const importProgram =
    `const paths=${JSON.stringify(nativePaths)};` +
    'for (const path of paths) await import("./" + path);' +
    'process.stdout.write("task540-native-stable-loaded\\n");';
  const result = spawnSync(process.execPath, ["--no-env-file", "--eval", importProgram], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "", TZ: "Etc/UTC" },
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("task540-native-stable-loaded\n");
  expect(result.stderr).toBe("");
});

test("TASK-540 native contract retains seven scenarios, 496 actions, lane totals, screenshots, and resets", async () => {
  const planModule = (await import(
    path.join(root, `${adapterRoot}/suite/composition/plan.mjs`)
  )) as NativePlanModule;
  const sharedModule = (await import(
    path.join(root, `${nativeSharedRoot}foundation.mjs`)
  )) as NativeSharedModule;
  const plan = planModule.buildTask540NativePlan({ nonce: "0123456789ab" });
  const typeCounts = Object.fromEntries(
    [...new Set(plan.actionManifest.map(({ executable }) => executable.type))]
      .sort()
      .map((type) => [
        type,
        plan.actionManifest.filter(({ executable }) => executable.type === type).length,
      ])
  );

  expect(plan.requiredScenarios).toEqual([
    "button-image",
    "tabs-content",
    "tabs-keyboard-aria",
    "space-selection",
    "dirty-guards",
    "related-retry-cache",
    "responsive-users",
  ]);
  expect(plan.actionManifest).toHaveLength(496);
  expect(new Set(plan.actionManifest.map(({ id }) => id)).size).toBe(496);
  expect(typeCounts).toEqual({
    "browser-global-list": 1,
    "browser-native": 14,
    "browser-run-code": 392,
    "browser-screenshot": 13,
    "runtime-operation": 76,
  });
  expect(plan.requiredScreenshotPaths).toHaveLength(13);
  expect(new Set(plan.requiredScreenshotPaths).size).toBe(13);
  expect(sha256(plan.actionManifest.map(({ id }) => id).join("\n") + "\n")).toBe(
    "22de74af6a38ad3ad1e2383a73d8d6a7169004e6efaba28e22dd4a0b86b8b72a"
  );
  expect(sha256(plan.requiredScreenshotPaths.join("\n") + "\n")).toBe(
    "408854beb345aba9057cb199f46c9bd0a753f945c913bf6eaceeae26731f7b63"
  );
  expect(sharedModule.hashBytes(Buffer.from(sharedModule.canonicalJson(plan.actionManifest)))).toBe(
    "847741d06227ff0c84af22ed79e4c387c8e00d850e4f70e21d0350bb1dff4c98"
  );

  const resetContracts = buildTask540ScenarioResetContracts(plan);
  expect(
    resetContracts.map(({ scenarioId, actionIds, screenshotPaths }) => ({
      scenarioId,
      actions: actionIds.length,
      screenshots: screenshotPaths.length,
    }))
  ).toEqual([
    { scenarioId: "button-image", actions: 76, screenshots: 2 },
    { scenarioId: "tabs-content", actions: 49, screenshots: 1 },
    { scenarioId: "tabs-keyboard-aria", actions: 36, screenshots: 1 },
    { scenarioId: "space-selection", actions: 35, screenshots: 1 },
    { scenarioId: "dirty-guards", actions: 49, screenshots: 2 },
    { scenarioId: "related-retry-cache", actions: 54, screenshots: 3 },
    { scenarioId: "responsive-users", actions: 135, screenshots: 3 },
  ]);
  expect(resetContracts.flatMap(({ actionIds }) => actionIds)).toEqual(
    plan.actionManifest
      .filter(({ scenario }) => plan.requiredScenarios.includes(scenario))
      .map(({ id }) => id)
  );
  expect(resetContracts.flatMap(({ screenshotPaths }) => screenshotPaths)).toEqual(
    Object.values(plan.registries.screenshotPaths)
  );
});
