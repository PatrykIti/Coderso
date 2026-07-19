import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { XMLParser } from "fast-xml-parser";
import ts from "typescript";

const execFileAsync = promisify(execFile);
const ROOT = "/home/coder/project/Coderso";
const VITEST = ROOT + "/node_modules/.bin/vitest";
const GIT = "/usr/bin/git";
const EXTERNAL_TEMP_ROOT = "/tmp";
const USER_SETTINGS_PRE_SPLIT_REVISION = "d803bbcfa5b52cb1e5036836592bd92ee2c03b6f";
const USER_SETTINGS_PRE_SPLIT_PATH = "tests/integration/routes/userSettings.test.ts";
const USER_SETTINGS_RETAINED_DECLARATION_SHA256 =
  "dc303e17e132938d2556ddcba832b913f6a3bacbde3bb04089b3887ab85c5399";
const USER_SETTINGS_RETAINED_TEST_NAMES = Object.freeze([
  "registerUserSettingsRoutes wires endpoints",
  "real HTTP user-settings routes preserve self-scope, CSRF, buckets, errors, and exact log ownership",
]);
const USER_SETTINGS_HARNESS_SUPPORT_PATH =
  "tests/integration/routes/support/userSettingsAccessLogHarness.ts";
const USER_SETTINGS_HARNESS_SUPPORT_IMPORT_TOKENS = Object.freeze([
  "type:AccessLogCandidate",
  "type:AccessLogScope",
  "type:ExpectedAccessLog",
  "type:PollDeps",
  "value:accessLogSignature",
  "value:drainExactAccessLogs",
  "value:observeStableAccessLogInventory",
  "value:trackedFetch",
  "value:validateAndCleanupAccessLogs",
]);
const USER_SETTINGS_HARNESS_SUPPORT_EXPORT_TOKENS = Object.freeze([
  "type:AccessLogCandidate",
  "type:AccessLogIdentity",
  "type:AccessLogScope",
  "type:ExpectedAccessLog",
  "type:PollDeps",
  "type:StableAccessLogInventory",
  "value:ACCESS_LOG_MIN_QUIET_MS",
  "value:ACCESS_LOG_POLL_CADENCE_MS",
  "value:ACCESS_LOG_POLL_TIMEOUT_MS",
  "value:ACCESS_LOG_REQUIRED_STABLE_POLLS",
  "value:accessLogSignature",
  "value:drainExactAccessLogs",
  "value:expectedAccessLogSignature",
  "value:isOwnedAccessLogCandidate",
  "value:observeStableAccessLogInventory",
  "value:trackedFetch",
  "value:validateAndCleanupAccessLogs",
]);
const USER_SETTINGS_HARNESS_SUPPORT_PRIVATE_RUNTIME_NAMES = Object.freeze([
  "isSubmultiset",
  "sameArray",
]);
const USER_SETTINGS_ADDITIVE_RESULT_CONTRACT = Object.freeze({
  "access-log inventory distinguishes missing, extra, late, and out-of-scope rows": Object.freeze({
    duplicateExtraInventory: Object.freeze({
      producer: "observeStableAccessLogInventory",
      awaitProducer: true,
      subjectPath: Object.freeze(["behaviorError"]),
      expectModifier: null,
      matcher: "toBe",
      expectedLiterals: Object.freeze(["access_log_extra"]),
    }),
    wrongPathInventory: Object.freeze({
      producer: "observeStableAccessLogInventory",
      awaitProducer: true,
      subjectPath: Object.freeze(["behaviorError"]),
      expectModifier: null,
      matcher: "toBe",
      expectedLiterals: Object.freeze(["access_log_extra"]),
    }),
    wrongIdentityInventory: Object.freeze({
      producer: "observeStableAccessLogInventory",
      awaitProducer: true,
      subjectPath: Object.freeze(["behaviorError"]),
      expectModifier: null,
      matcher: "toBe",
      expectedLiterals: Object.freeze(["access_log_extra"]),
    }),
    signatureChangedInventory: Object.freeze({
      producer: "observeStableAccessLogInventory",
      awaitProducer: true,
      subjectPath: Object.freeze(["behaviorError"]),
      expectModifier: null,
      matcher: "toBe",
      expectedLiterals: Object.freeze(["access_log_late"]),
    }),
  }),
  "exact access-log cleanup drains late owned UUIDs without deleting outsiders": Object.freeze({
    postEmptyReappearanceDrain: Object.freeze({
      producer: "drainExactAccessLogs",
      awaitProducer: true,
      subjectPath: Object.freeze(["lateAfterDelete"]),
      expectModifier: null,
      matcher: "toBe",
      expectedLiterals: Object.freeze(["true"]),
    }),
  }),
  "validateAndCleanupAccessLogs proves both quiet windows before fixture cleanup": Object.freeze({
    queryLatencyInventory: Object.freeze({
      producer: "observeStableAccessLogInventory",
      awaitProducer: true,
      subjectPath: Object.freeze(["behaviorError"]),
      expectModifier: null,
      matcher: "toBe",
      expectedLiterals: Object.freeze(["null"]),
    }),
    deleteLatencyDrain: Object.freeze({
      producer: "drainExactAccessLogs",
      awaitProducer: true,
      subjectPath: Object.freeze(["cleanupError"]),
      expectModifier: null,
      matcher: "toBe",
      expectedLiterals: Object.freeze(["null"]),
    }),
  }),
  "validateAndCleanupAccessLogs preserves deterministic error ordering while draining exact IDs":
    Object.freeze({
      compoundValidationPromise: Object.freeze({
        producer: "validateAndCleanupAccessLogs",
        awaitProducer: false,
        subjectPath: Object.freeze([]),
        expectModifier: "rejects",
        matcher: "toMatchObject",
        expectedLiterals: Object.freeze([
          "access_log_extra",
          "access_log_scope_invalid",
          "access_log_late_after_delete",
          "access_log_absence_unstable",
        ]),
      }),
    }),
  "deadline-crossing cleanup makes one final exact delete and retains absence failure":
    Object.freeze({
      deadlineCrossingInventory: Object.freeze({
        producer: "observeStableAccessLogInventory",
        awaitProducer: true,
        subjectPath: Object.freeze(["behaviorError"]),
        expectModifier: null,
        matcher: "toBe",
        expectedLiterals: Object.freeze(["access_log_unstable"]),
      }),
      deadlineCrossingDrain: Object.freeze({
        producer: "drainExactAccessLogs",
        awaitProducer: true,
        subjectPath: Object.freeze(["cleanupError", "message"]),
        expectModifier: null,
        matcher: "toBe",
        expectedLiterals: Object.freeze(["access_log_absence_unstable"]),
      }),
    }),
});

const families = Object.freeze({
  actionExecutor: Object.freeze({
    lane: "bun-source",
    tests: 73,
    sha256: "4502969fecf5a82f5da3b1b1e648fa435d6b79a4dc070cf73e853eb9d31ef48c",
    fileTests: Object.freeze([6, 8, 6, 7, 4, 7, 5, 3, 8, 6, 8, 5]),
    fileNameSha256: Object.freeze([
      "4776ebd95ae993c8addb73fe2fab5b40a20630a9f5fbb550f2cb014b3822b3c9",
      "218885f02973b788ff59cd037e34185bb421d5ba4799b1c1c7be361363d93e14",
      "fc13d62ac84daec9479c7640966368c97a35e3b25d5ef00e755c66844b73745d",
      "6dd51efcdf066859b79b6b20f63ebbc65f592c4ba62023b26c93ca349d969298",
      "a1fa1b36f63a868a28d3ac75f577dc1eca0f1e6d6a66614b73e9195464e1a0c3",
      "27db252fee291dafdc0bec7d37651003cf2758a6cf282d6c63747f850058b978",
      "7a24f66b7bdbadf05b83ba51db4716105a75115eda348a725c6ff98f088e6329",
      "7fe9c7de22bcac5da73f6205ba2c4df68afbe9567c9d57932741b4516a69e885",
      "eacdce569d4053460472b29b09b27da88eb0674cdeff77f1e6cf71917e32ef4c",
      "fa498c860a7d4624aabc7dd0b775ab0fe3a9f87efb4e1dc9416b884e6e8c4261",
      "23c1ff773d9d78ad3f432b9d467a69d1c282a380d87ba135819ea815192d2c63",
      "436f04e3d9f1b5256b8ba7f54683a68e1fead6ba7b47c869c689c8a190633af4",
    ]),
    declarations: 73,
    declarationSha256: "52008e478cf59e1d6ad2b3a01335617d7dd67c10f6c5fad58ebb3ab56ef3ac4f",
    files: Object.freeze([
      "tests/unit/assistant/actionExecutorService.test.ts",
      "tests/unit/assistant/actionExecutorCustomScreens.test.ts",
      "tests/unit/assistant/actionExecutorPages.test.ts",
      "tests/unit/assistant/actionExecutorListingsAndWidgets.test.ts",
      "tests/unit/assistant/actionExecutorForms.test.ts",
      "tests/unit/assistant/actionExecutorMenusAndSeo.test.ts",
      "tests/unit/assistant/actionExecutorContentUpdates.test.ts",
      "tests/unit/assistant/actionExecutorAutomationBlueprints.test.ts",
      "tests/unit/assistant/actionExecutorIdempotencyAndSiteKit.test.ts",
      "tests/unit/assistant/actionExecutorCatalogBlueprints.test.ts",
      "tests/unit/assistant/actionExecutorSupportingPageLinks.test.ts",
      "tests/unit/assistant/actionExecutorDetailPages.test.ts",
    ]),
  }),
  screenRuntime: Object.freeze({
    lane: "vitest",
    tests: 72,
    sha256: "f35643b91c5b59ebf5e3445535d3e3ba0628782cae860126e2062176f5abfcbb",
    fileTests: Object.freeze([22, 13, 24, 13]),
    fileNameSha256: Object.freeze([
      "549d546341ff0a8cd41def11c022dd83792526214a4b3741c1da50b439aefa49",
      "016a52df5c08e20b57094acd81e8342303b54ac25a4022e81179d159cd6e941f",
      "5d10f961ede7f2d4207e3d744b0bc636f101fa82d46870639ab42cac2c68e023",
      "95d614a88db6711cb115831b4c8425889e94ff9ccf5b20f6b6f7a368e1e127ba",
    ]),
    declarations: 67,
    declarationSha256: "c48c2596b0f3931bddee7d84c811013c128091aa93d3553f2766e9c5acd6fbaf",
    files: Object.freeze([
      "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx",
      "tests/vitest/ui-integration/custom-screen-runtime-interactions.test.tsx",
      "tests/vitest/ui-integration/custom-screen-runtime-presentation.test.tsx",
      "tests/vitest/ui-integration/custom-screen-runtime-layout.test.tsx",
    ]),
  }),
  screenEditorPage: Object.freeze({
    lane: "vitest",
    tests: 36,
    sha256: "869d5a6156fabfccb222f1206df8781bc22ceaf167d03023d5e6178ab7b8ea3d",
    fileTests: Object.freeze([6, 13, 8, 9]),
    fileNameSha256: Object.freeze([
      "b1f5b418e6377942688c3304fba6a7719c01c41e6e6e0ac53d4ce428285f7848",
      "1cd9999fc2b70308e90454908567b8273289bedbf24e6ad91efec3122a630f22",
      "a6bd4e264c802620ec2e10bd10a6a0f80de3bf2ea5ca86f8a6c477b18735e307",
      "ef2f79b268f403d3d55e719f0556336f6cbe0cfc308d5f933c2583ed408eff21",
    ]),
    declarations: 36,
    declarationSha256: "2bd33166dfd768b089caf437b5263413d24e033eb18b9a92d152321525a898bb",
    files: Object.freeze([
      "tests/vitest/ui/custom-screens-page.test.tsx",
      "tests/vitest/ui/custom-screen-editor-draft-and-save.test.tsx",
      "tests/vitest/ui/custom-screen-editor-hydration-authority.test.tsx",
      "tests/vitest/ui/custom-screen-editor-visit-authority.test.tsx",
    ]),
  }),
  entriesClient: Object.freeze({
    lane: "vitest",
    tests: 42,
    sha256: "4ac0a985562db074992ca7af1ec9e3b7030eb5de9ae4e5ec1de94cf263249ae8",
    fileTests: Object.freeze([19, 15, 8]),
    fileNameSha256: Object.freeze([
      "c59939e166edd4bb4f5aec4f8d95174384b44857a6da144f2ffe4075f7152a2a",
      "47cedf78c23e17feab06f85f09a45ddfb0d4c2eaa5766e43b733382b3e8b57a9",
      "f69cbd52b677ff1363eeb40988261615d153c06e1dbf2c8b91c9ffe372e4ff31",
    ]),
    declarations: 38,
    declarationSha256: "5612f5cf3293e2a06db1d0a3c519d627930b799206b53698a530cc074c2c1bab",
    files: Object.freeze([
      "tests/vitest/admin/entriesClient.test.ts",
      "tests/vitest/admin/entriesClientReadAuthority.test.ts",
      "tests/vitest/admin/entriesClientMutationReconciliation.test.ts",
    ]),
  }),
  assistantPanel: Object.freeze({
    lane: "vitest",
    tests: 13,
    sha256: "ddaae2ae13d07277b746cb32031453f4aad2222310ee5505648ba2fcf59b40ed",
    fileTests: Object.freeze([7, 6]),
    fileNameSha256: Object.freeze([
      "097caf37e67cfdada6add71f31c9119b70a99ddba0f845ff65b44cc8c0372473",
      "e62ded441b70777d7650650efae04de68ed1b2d27283375eb66c619d189ba65f",
    ]),
    declarations: 13,
    declarationSha256: "7c4545631fd23c811b5639bc4c27496a18e70d874431df5b8c895757a794eb4e",
    files: Object.freeze([
      "tests/vitest/ui/assistant-panel-interaction.test.tsx",
      "tests/vitest/ui/assistant-panel-conversation.test.tsx",
    ]),
  }),
  customScreensClient: Object.freeze({
    lane: "vitest",
    tests: 40,
    sha256: "112acfd31ff00d9ad5f33fa77bbc00891c5e13d387f79df0a4ed5796c4b1fc36",
    fileTests: Object.freeze([29, 11]),
    fileNameSha256: Object.freeze([
      "9a25d9d0a43936d21e775241e49e988bdc07a612e843660c17882b5918605dce",
      "3342b348ca2cb43a08ccaf460d76d94648ea944a6908ec31296b746e587dadc0",
    ]),
    declarations: 26,
    declarationSha256: "c00a3a72748eeb6d0e98f80436bfb2ce33246db2762b09a9b514c299c6cc876a",
    files: Object.freeze([
      "tests/vitest/admin/customScreensClient.test.ts",
      "tests/vitest/admin/customScreensEntryOverridesClient.test.ts",
    ]),
  }),
  cacheBus: Object.freeze({
    lane: "vitest",
    tests: 22,
    sha256: "fb5fefd740c65c9bf5d98793831e0d06fc78712c9fb6c1a239b76da6bc9d1f0a",
    fileTests: Object.freeze([6, 11, 5]),
    fileNameSha256: Object.freeze([
      "3345a24050365e303047d3d0e4a684ba3a7aac025acdfb6a205cc6b8fab6dbbf",
      "7b770f2ef7e821329c0872d27f79c9b099e5f84e04efbc9d7631d24afe96bd7c",
      "83623b5575abf89db4e4f79cc1acd7e4c86e115430eac04f5cc1370d7df249b4",
    ]),
    declarations: 22,
    declarationSha256: "8830e6136e0b7df47b7ab73ae81c0c69602eb305f86f49258e6341b0c7fdbc18",
    files: Object.freeze([
      "tests/vitest/admin/cacheBus.test.ts",
      "tests/vitest/admin/cacheBusCorrelation.test.ts",
      "tests/vitest/admin/cacheBusHardening.test.ts",
    ]),
  }),
  entryRestyle: Object.freeze({
    lane: "vitest",
    tests: 17,
    sha256: "219111fd536cf6005e754820d0ad61680add470725defa358a75c021cb7065a4",
    fileTests: Object.freeze([13, 4]),
    fileNameSha256: Object.freeze([
      "ebfefcdf8167a927dcbfe5f3159a892e34124f98f27e691b6a1888138e436076",
      "b932d8833667fc0e08733720fa10856c720b1c6a69524e5b728bff063ffc0948",
    ]),
    declarations: 17,
    declarationSha256: "a4fdbf1301ea0fffae79cd743d5de85d25b43f87437cd6019964ab76c8db10b9",
    files: Object.freeze([
      "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
      "tests/vitest/ui/custom-screen-entry-presentation-media.test.ts",
    ]),
  }),
  entryNavigation: Object.freeze({
    lane: "vitest",
    tests: 22,
    sha256: "ebc4626c3bffd12fabef6b1696900972b3a9eb71b643d8840332a55fc1fd237f",
    fileTests: Object.freeze([9, 13]),
    fileNameSha256: Object.freeze([
      "a36f8c2baa63f488a687b7ebaa016603f6b3f61501715ccfb3d09d7603fa9ba7",
      "ecbaef1ee377bc23b6fc36a2fcd533e3a86c306555b666a664dc831d7a10db60",
    ]),
    declarations: 18,
    declarationSha256: "16e197de4e6a8713696cbc68f643a5e13dfc53cff66c84b7b6c0d8f75629899f",
    files: Object.freeze([
      "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx",
      "tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx",
    ]),
  }),
  userSettingsRoutes: Object.freeze({
    lane: "bun-source",
    tests: 10,
    sha256: "9f27be47df713540ee6af1ae06983e3fce78cbc750f8ca3b21d880ffb41fe538",
    fileTests: Object.freeze([2, 8]),
    sourcePositions: Object.freeze([
      Object.freeze([0, 9]),
      Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]),
    ]),
    fileNameSha256: Object.freeze([
      "f7cf0c74702f9ff1767aed68c896f7ddb711dee3c46a6989b803647829e3737a",
      "3bf26107efff955f9ad5ba030b1500266760f85322487e3b112dc738a9fe7250",
    ]),
    declarations: 10,
    declarationSha256: "a83b8e25d4a8b06a1591a0f15faf565f562a0b1a6d5fb07dc2c548bba7979996",
    files: Object.freeze([
      "tests/integration/routes/userSettings.test.ts",
      "tests/integration/routes/userSettingsAccessLogHarness.test.ts",
    ]),
  }),
});

const auxiliaryFamilies = Object.freeze({
  r01Schema: Object.freeze({
    lane: "vitest",
    tests: 77,
    sha256: "021b5bd353cf7cf775ae7a06b1477f6b0c5e6933c64518a6aaa36bbbf3f2ebc2",
    fileTests: Object.freeze([18, 9, 10, 13, 11, 5, 11]),
    fileNameSha256: Object.freeze([
      "3bc33544c8750ea721ccd30993d5000a2525e6f5096555ec786a8128c5fc9a01",
      "892e8a43828f3730c4681e56c15f561005e2554abdf16bdf8725e901c129fb8e",
      "8fd2a42d86edf83cb445dd6f0afca3febe3fbda50b83b192337a651a0689df9b",
      "99fabc38404bc71bbb1687dec945d4ebc5d3b3d95843bfa70e795a79b1677073",
      "1cd5e7af104b451a364a40a3d623040e495ef609a8ea0e6720bfc677f14bc47c",
      "b46512e7ddea5aedb4eb6cac33943ea906fce30f05522f0b589174b8b5694221",
      "2999367a7d6209104a11564b88cdcdf269040bd2c4913fb07e9baceb6cd5e0a9",
    ]),
    declarations: 77,
    declarationSha256: "b449c23cd2a77a99e14d58fec23cec8a25a45d1c36178d6328b75203957f83c2",
    files: Object.freeze([
      "tests/vitest/admin/custom-screen-schemas.test.ts",
      "tests/vitest/admin/custom-screen-document-contract.test.ts",
      "tests/vitest/admin/custom-screen-block-style.test.ts",
      "tests/vitest/admin/custom-screen-section-style-and-binding-gc.test.ts",
      "tests/vitest/admin/custom-screen-fixed-block-contract.test.ts",
      "tests/vitest/admin/custom-screen-binding-contract.test.ts",
      "tests/vitest/admin/custom-screen-stored-read-repair.test.ts",
    ]),
  }),
  r01Routes: Object.freeze({
    lane: "bun-source",
    tests: 21,
    sha256: "46732d12d9b540910242f22dc2591224adcf003b1cf371ade1211de0c7eacd97",
    fileTests: Object.freeze([13, 8]),
    fileNameSha256: Object.freeze([
      "f460449ca950d89950ee92270f2a24b8132ba3c75addce60bd515f20a938dc4b",
      "f2b1d22c0604abd4d546b2163b45a39cd812d21e1860cdfc10919102d1ec0d36",
    ]),
    declarations: 21,
    declarationSha256: "c4662daa636508bb6b4bc6385a052e68ea4438aa030419b79c7459cbad0e0617",
    files: Object.freeze([
      "tests/integration/routes/customScreensRoutes.test.ts",
      "tests/integration/routes/customScreensDefinitionIntegrityRoutes.test.ts",
    ]),
  }),
});

const protectedFamilyEntries = Object.entries(families);
const auxiliaryFamilyEntries = Object.entries(auxiliaryFamilies);
const familyEntries = [...protectedFamilyEntries, ...auxiliaryFamilyEntries];
const familyFiles = familyEntries.flatMap(([, family]) => family.files);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
if (
  protectedFamilyEntries.length !== 10 ||
  protectedFamilyEntries.reduce((total, [, family]) => total + family.tests, 0) !== 347 ||
  protectedFamilyEntries.flatMap(([, family]) => family.files).length !== 36 ||
  auxiliaryFamilyEntries.length !== 2 ||
  auxiliaryFamilyEntries.reduce((total, [, family]) => total + family.tests, 0) !== 98 ||
  auxiliaryFamilyEntries.flatMap(([, family]) => family.files).length !== 9 ||
  familyFiles.length !== 45 ||
  new Set(familyFiles).size !== familyFiles.length ||
  familyEntries.some(
    ([, family]) =>
      family.fileTests.length !== family.files.length ||
      family.fileTests.reduce((total, count) => total + count, 0) !== family.tests ||
      family.fileNameSha256.length !== family.files.length ||
      !Number.isInteger(family.declarations) ||
      family.declarations < 1 ||
      !SHA256_PATTERN.test(family.sha256) ||
      !SHA256_PATTERN.test(family.declarationSha256) ||
      family.fileNameSha256.some((sha256) => !SHA256_PATTERN.test(sha256))
  )
) {
  throw new Error("TASK-540 test-name family authority drifted");
}

const hashNames = (names) =>
  createHash("sha256")
    .update(JSON.stringify([...names].sort()))
    .digest("hex");

async function existingFiles(files, requireFinal) {
  const existing = [];
  for (const file of files) {
    try {
      await access(ROOT + "/" + file);
      existing.push(file);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      if (requireFinal) throw new Error("TASK-540 split test is missing: " + file);
    }
  }
  if (existing.length === 0) throw new Error("TASK-540 split family has no existing test file");
  return existing;
}

const normalizeRowFile = (file) =>
  file.startsWith(ROOT + "/") ? file.slice(ROOT.length + 1) : file;

async function listVitestRows(files) {
  const directory = await mkdtemp(join(EXTERNAL_TEMP_ROOT, "task-540-test-names-"));
  const output = join(directory, "names.json");
  let rows;
  try {
    const { stderr } = await execFileAsync(
      VITEST,
      ["list", "--config", "vitest.config.ts", "--json=" + output, ...files],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
    );
    if (stderr.trim()) throw new Error("TASK-540 Vitest list emitted stderr: " + stderr.trim());
    rows = JSON.parse(await readFile(output, "utf8"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  if (
    !Array.isArray(rows) ||
    rows.some(
      (row) =>
        typeof row?.name !== "string" ||
        typeof row?.file !== "string" ||
        !files.includes(normalizeRowFile(row.file))
    )
  ) {
    throw new Error("TASK-540 Vitest list payload is invalid");
  }
  return rows.map(({ name, file }) => Object.freeze({ name, file: normalizeRowFile(file) }));
}

function callRoot(expression, roots) {
  if (ts.isIdentifier(expression)) {
    return roots.has(expression.text)
      ? Object.freeze({ root: expression.text, modifiers: Object.freeze([]) })
      : null;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const nested = callRoot(expression.expression, roots);
    return nested
      ? Object.freeze({
          root: nested.root,
          modifiers: Object.freeze([...nested.modifiers, expression.name.text]),
        })
      : null;
  }
  if (ts.isCallExpression(expression)) return callRoot(expression.expression, roots);
  return null;
}

const TEST_ROOTS = new Set(["test", "it", "testIfDb"]);
const SUITE_ROOTS = new Set(["describe", "suite", "context"]);

const testCallRoot = (expression) => callRoot(expression, TEST_ROOTS);
const suiteCallRoot = (expression) => callRoot(expression, SUITE_ROOTS);

function scanTestDeclarations(source, relativePath) {
  const kind = relativePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, kind);
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  const registrations = [];
  const declarationFingerprints = [];
  const callbackRecords = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const suiteRoot = suiteCallRoot(node.expression);
      if (suiteRoot && suiteRoot.modifiers.some((modifier) => modifier !== "each")) {
        throw new Error(
          `TASK-540 protected suite uses forbidden modifier in ${relativePath}: ${suiteRoot.modifiers.join(".")}`
        );
      }
      const root = testCallRoot(node.expression);
      const callback = node.arguments.find(
        (argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)
      );
      const isEachRegistration = root?.modifiers.includes("each")
        ? ts.isCallExpression(node.expression)
        : true;
      if (root && callback && isEachRegistration) {
        if (root.modifiers.some((modifier) => modifier !== "each")) {
          throw new Error(
            `TASK-540 protected test uses forbidden modifier in ${relativePath}: ${root.modifiers.join(".")}`
          );
        }
        const nameNode = node.arguments[0];
        const name =
          nameNode && (ts.isStringLiteral(nameNode) || ts.isNoSubstitutionTemplateLiteral(nameNode))
            ? nameNode.text
            : null;
        const declarationFingerprint = printer.printNode(ts.EmitHint.Expression, node, sourceFile);
        registrations.push(Object.freeze({ name }));
        declarationFingerprints.push(declarationFingerprint);
        callbackRecords.push(
          Object.freeze({
            name,
            declarationFingerprint,
            statements: Object.freeze(
              ts.isBlock(callback.body)
                ? callback.body.statements.map((statement) =>
                    Object.freeze({
                      fingerprint: printer.printNode(
                        ts.EmitHint.Unspecified,
                        statement,
                        sourceFile
                      ),
                      node: statement,
                    })
                  )
                : [
                    Object.freeze({
                      fingerprint: printer.printNode(
                        ts.EmitHint.Expression,
                        callback.body,
                        sourceFile
                      ),
                      node: callback.body,
                    }),
                  ]
            ),
          })
        );
        return true;
      }
    }
    let found = false;
    ts.forEachChild(node, (child) => {
      if (visit(child)) found = true;
    });
    return found;
  };
  for (const statement of sourceFile.statements) visit(statement);
  return Object.freeze({ registrations, declarationFingerprints, callbackRecords });
}

function appendedStatementsAfterExactPrefix(baseline, candidate, label) {
  if (
    candidate.length < baseline.length ||
    baseline.some((statement, index) => statement.fingerprint !== candidate[index].fingerprint)
  ) {
    throw new Error(label + ": the exact pinned pre-split callback prefix changed");
  }
  return Object.freeze(candidate.slice(baseline.length));
}

function identifierNamesInStatements(statements) {
  const names = new Set();
  const visit = (node) => {
    if (ts.isIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };
  for (const { node } of statements) visit(node);
  return names;
}

function addBindingNames(name, names) {
  if (ts.isIdentifier(name)) {
    names.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) addBindingNames(element.name, names);
  }
}

function appendedCallbackScopeBindingNames(addedStatements) {
  const names = new Set();
  const collectHoistedVarBindings = (node) => {
    if (ts.isFunctionLike(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      return;
    }
    if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.BlockScoped) === 0) {
      for (const declaration of node.declarations) addBindingNames(declaration.name, names);
    }
    ts.forEachChild(node, collectHoistedVarBindings);
  };
  for (const { node } of addedStatements) {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        addBindingNames(declaration.name, names);
      }
      continue;
    }
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      if (node.name) names.add(node.name.text);
      continue;
    }
    collectHoistedVarBindings(node);
  }
  return names;
}

function requireNoProtectedCallbackScopeShadows(testName, addedStatements, protectedNames) {
  const shadows = [...appendedCallbackScopeBindingNames(addedStatements)]
    .filter((name) => protectedNames.has(name))
    .sort();
  if (shadows.length > 0) {
    throw new Error(
      `TASK-540 ${testName}: additive callback-scope binding shadows pinned baseline names: ${shadows.join(", ")}`
    );
  }
}

function subtreeContainsCall(node, calleeName) {
  let found = false;
  const visit = (candidate) => {
    if (found) return;
    if (
      ts.isCallExpression(candidate) &&
      ts.isIdentifier(candidate.expression) &&
      candidate.expression.text === calleeName
    ) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function unwrapTransparentExpression(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function exactBindingSubjectPath(node, bindingName) {
  let current = unwrapTransparentExpression(node);
  const path = [];
  while (ts.isPropertyAccessExpression(current)) {
    path.unshift(current.name.text);
    current = unwrapTransparentExpression(current.expression);
  }
  return ts.isIdentifier(current) && current.text === bindingName ? Object.freeze(path) : null;
}

function exactProducerInitializer(initializer, contract) {
  const unwrapped = unwrapTransparentExpression(initializer);
  const call = contract.awaitProducer
    ? ts.isAwaitExpression(unwrapped)
      ? unwrapTransparentExpression(unwrapped.expression)
      : null
    : unwrapped;
  return Boolean(
    call &&
    ts.isCallExpression(call) &&
    ts.isIdentifier(call.expression) &&
    call.expression.text === contract.producer
  );
}

function directLiteralToken(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return "true";
  if (node.kind === ts.SyntaxKind.FalseKeyword) return "false";
  if (node.kind === ts.SyntaxKind.NullKeyword) return "null";
  return null;
}

function exactErrorsMatcherArgument(node, expectedLiterals) {
  if (!ts.isObjectLiteralExpression(node) || node.properties.length !== 1) return false;
  const errorsProperty = node.properties[0];
  if (
    !ts.isPropertyAssignment(errorsProperty) ||
    !ts.isIdentifier(errorsProperty.name) ||
    errorsProperty.name.text !== "errors" ||
    !ts.isArrayLiteralExpression(errorsProperty.initializer) ||
    errorsProperty.initializer.elements.length !== expectedLiterals.length
  ) {
    return false;
  }
  return errorsProperty.initializer.elements.every((element, index) => {
    if (!ts.isObjectLiteralExpression(element) || element.properties.length !== 1) return false;
    const messageProperty = element.properties[0];
    return (
      ts.isPropertyAssignment(messageProperty) &&
      ts.isIdentifier(messageProperty.name) &&
      messageProperty.name.text === "message" &&
      directLiteralToken(messageProperty.initializer) === expectedLiterals[index]
    );
  });
}

function exactMatcherArguments(args, contract) {
  if (args.length !== 1) return false;
  if (contract.matcher === "toBe") {
    return (
      contract.expectedLiterals.length === 1 &&
      directLiteralToken(args[0]) === contract.expectedLiterals[0]
    );
  }
  if (contract.matcher === "toMatchObject") {
    return exactErrorsMatcherArgument(args[0], contract.expectedLiterals);
  }
  return false;
}

function directMatcherAssertionIndex(statements, bindingName, contract, declarationIndex) {
  return statements.findIndex(({ node: statement }, statementIndex) => {
    if (statementIndex <= declarationIndex) return false;
    if (!ts.isExpressionStatement(statement)) return false;
    let expression = unwrapTransparentExpression(statement.expression);
    const isAwaitedAssertion = ts.isAwaitExpression(expression);
    if (ts.isAwaitExpression(expression)) {
      expression = unwrapTransparentExpression(expression.expression);
    }
    if (isAwaitedAssertion !== (contract.expectModifier === "rejects")) return false;
    if (
      ts.isCallExpression(expression) &&
      ts.isPropertyAccessExpression(expression.expression) &&
      expression.expression.name.text === contract.matcher
    ) {
      const receiver = unwrapTransparentExpression(expression.expression.expression);
      const expectCall =
        contract.expectModifier === null
          ? receiver
          : ts.isPropertyAccessExpression(receiver) &&
              receiver.name.text === contract.expectModifier
            ? unwrapTransparentExpression(receiver.expression)
            : null;
      const subjectPath =
        expectCall &&
        ts.isCallExpression(expectCall) &&
        ts.isIdentifier(expectCall.expression) &&
        expectCall.expression.text === "expect" &&
        expectCall.arguments.length === 1
          ? exactBindingSubjectPath(expectCall.arguments[0], bindingName)
          : null;
      const subjectMatches =
        subjectPath !== null &&
        JSON.stringify(subjectPath) === JSON.stringify(contract.subjectPath);
      return subjectMatches && exactMatcherArguments(expression.arguments, contract);
    }
    return false;
  });
}

function statementReferencesBinding(statement, bindingName) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isIdentifier(node) && node.text === bindingName) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(statement);
  return found;
}

const USER_SETTINGS_ADDITIVE_PRODUCERS = new Set(
  Object.values(USER_SETTINGS_ADDITIVE_RESULT_CONTRACT).flatMap((contract) =>
    Object.values(contract).map(({ producer }) => producer)
  )
);

function addedStatementHasCallbackReturn(node) {
  let found = false;
  const visit = (candidate) => {
    if (found) return;
    if (candidate !== node && ts.isFunctionLike(candidate)) return;
    if (ts.isReturnStatement(candidate)) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  if (!ts.isFunctionLike(node)) visit(node);
  return found;
}

function addedStatementShadowsProducer(node) {
  let found = false;
  const visit = (candidate) => {
    if (found) return;
    if (ts.isIdentifier(candidate) && USER_SETTINGS_ADDITIVE_PRODUCERS.has(candidate.text)) {
      const parent = candidate.parent;
      if (
        (ts.isVariableDeclaration(parent) && parent.name === candidate) ||
        (ts.isParameter(parent) && parent.name === candidate) ||
        (ts.isBindingElement(parent) && parent.name === candidate) ||
        ((ts.isFunctionDeclaration(parent) ||
          ts.isFunctionExpression(parent) ||
          ts.isClassDeclaration(parent) ||
          ts.isClassExpression(parent)) &&
          parent.name === candidate) ||
        (ts.isBinaryExpression(parent) && parent.left === candidate)
      ) {
        found = true;
        return;
      }
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function requireAdditiveResultContract(testName, addedStatements) {
  const required = USER_SETTINGS_ADDITIVE_RESULT_CONTRACT[testName] ?? null;
  if (!required) return Object.freeze([]);
  if (
    addedStatements.some(
      ({ node }) => addedStatementHasCallbackReturn(node) || addedStatementShadowsProducer(node)
    )
  ) {
    throw new Error(
      `TASK-540 ${testName}: additive statements contain an early return or shadowed producer`
    );
  }
  const evidence = [];
  for (const [bindingName, contract] of Object.entries(required)) {
    const declarationStatements = addedStatements
      .map((statement, index) => Object.freeze({ statement, index }))
      .filter(
        ({ statement: { node } }) =>
          ts.isVariableStatement(node) &&
          (node.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
          node.declarationList.declarations.length === 1 &&
          ts.isIdentifier(node.declarationList.declarations[0].name) &&
          node.declarationList.declarations[0].name.text === bindingName
      );
    const declaration =
      declarationStatements.length === 1 &&
      ts.isVariableStatement(declarationStatements[0].statement.node)
        ? declarationStatements[0].statement.node.declarationList.declarations[0]
        : null;
    const declarationIndex = declarationStatements[0]?.index ?? -1;
    const assertionIndex = directMatcherAssertionIndex(
      addedStatements,
      bindingName,
      contract,
      declarationIndex
    );
    const bindingReferencedBeforeAssertion =
      assertionIndex > declarationIndex &&
      addedStatements
        .slice(declarationIndex + 1, assertionIndex)
        .some(({ node }) => statementReferencesBinding(node, bindingName));
    if (
      declarationStatements.length !== 1 ||
      !declaration?.initializer ||
      !exactProducerInitializer(declaration.initializer, contract) ||
      assertionIndex === -1 ||
      bindingReferencedBeforeAssertion
    ) {
      throw new Error(
        `TASK-540 ${testName}: additive result ${bindingName} must remain immutable from ${contract.producer} to the exact direct ${contract.matcher}(${contract.expectedLiterals.join(", ")}) assertion`
      );
    }
    evidence.push(
      Object.freeze({
        bindingName,
        producerName: contract.producer,
        matcher: contract.matcher,
        expectedLiterals: contract.expectedLiterals,
      })
    );
  }
  return Object.freeze(evidence);
}

async function readPinnedUserSettingsPreSplitSource() {
  const { stdout, stderr } = await execFileAsync(
    GIT,
    ["show", USER_SETTINGS_PRE_SPLIT_REVISION + ":" + USER_SETTINGS_PRE_SPLIT_PATH],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }
  );
  if (stderr.trim() || !stdout) {
    throw new Error("TASK-540 pinned user-settings pre-split source is unavailable");
  }
  return stdout;
}

function exactImportOrExportToken(name, typeOnly) {
  return (typeOnly ? "type:" : "value:") + name;
}

function hasSyntaxModifier(node, syntaxKind) {
  return (node.modifiers ?? []).some((modifier) => modifier.kind === syntaxKind);
}

function requireFinalUserSettingsSupportExports(source) {
  const sourceFile = ts.createSourceFile(
    USER_SETTINGS_HARNESS_SUPPORT_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if ((sourceFile.parseDiagnostics ?? []).length > 0) {
    throw new Error("TASK-540 user-settings support module has parse diagnostics");
  }
  const exportTokens = [];
  const privateRuntimeNames = [];
  const bunTestImportTokens = [];
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const moduleName = ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : null;
      const bindings = statement.importClause?.namedBindings;
      if (
        moduleName !== "bun:test" ||
        !statement.importClause ||
        statement.importClause.name ||
        statement.importClause.isTypeOnly ||
        !bindings ||
        !ts.isNamedImports(bindings)
      ) {
        throw new Error("TASK-540 user-settings support module has an unknown import");
      }
      for (const element of bindings.elements) {
        const local = element.name.text;
        const imported = element.propertyName?.text ?? local;
        if (local !== imported || element.isTypeOnly) {
          throw new Error("TASK-540 user-settings support Bun assertion import drifted");
        }
        bunTestImportTokens.push(exactImportOrExportToken(local, false));
      }
      continue;
    }
    if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) {
      throw new Error("TASK-540 user-settings support module uses an indirect/default export");
    }
    const exported = hasSyntaxModifier(statement, ts.SyntaxKind.ExportKeyword);
    if (exported && hasSyntaxModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
      throw new Error("TASK-540 user-settings support module has a default export");
    }
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      if (exported) exportTokens.push(exactImportOrExportToken(statement.name.text, true));
      continue;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      if (exported) {
        exportTokens.push(exactImportOrExportToken(statement.name.text, false));
      } else {
        privateRuntimeNames.push(statement.name.text);
      }
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      if (!exported || (statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
        throw new Error("TASK-540 user-settings support module has mutable/private state");
      }
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          throw new Error("TASK-540 user-settings support export is not a direct identifier");
        }
        exportTokens.push(exactImportOrExportToken(declaration.name.text, false));
      }
      continue;
    }
    throw new Error("TASK-540 user-settings support module has an unknown exported declaration");
  }
  if (
    JSON.stringify(exportTokens.sort()) !==
      JSON.stringify([...USER_SETTINGS_HARNESS_SUPPORT_EXPORT_TOKENS].sort()) ||
    JSON.stringify(privateRuntimeNames.sort()) !==
      JSON.stringify([...USER_SETTINGS_HARNESS_SUPPORT_PRIVATE_RUNTIME_NAMES].sort()) ||
    ![JSON.stringify([]), JSON.stringify(["value:expect"])].includes(
      JSON.stringify(bunTestImportTokens.sort())
    )
  ) {
    throw new Error("TASK-540 user-settings support top-level allowlist drifted");
  }
}

function requireFinalUserSettingsProducerImports(source) {
  const relativePath = "tests/integration/routes/userSettingsAccessLogHarness.test.ts";
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if ((sourceFile.parseDiagnostics ?? []).length > 0) {
    throw new Error("TASK-540 user-settings harness import owner has parse diagnostics");
  }
  const importCounts = new Map([...USER_SETTINGS_ADDITIVE_PRODUCERS].map((name) => [name, 0]));
  const bunTestImports = [];
  const supportImportTokens = [];
  const importDeclarationCounts = new Map([
    ["bun:test", 0],
    ["./support/userSettingsAccessLogHarness", 0],
  ]);
  const fixtureNames = new Set();
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const moduleName = ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : null;
      const bindings = statement.importClause?.namedBindings;
      if (
        !["bun:test", "./support/userSettingsAccessLogHarness"].includes(moduleName) ||
        !statement.importClause ||
        statement.importClause.name ||
        !bindings ||
        !ts.isNamedImports(bindings)
      ) {
        throw new Error("TASK-540 user-settings harness imports outside its exact contract");
      }
      importDeclarationCounts.set(moduleName, (importDeclarationCounts.get(moduleName) ?? 0) + 1);
      for (const element of bindings.elements) {
        const local = element.name.text;
        const imported = element.propertyName?.text ?? local;
        if (local !== imported) {
          throw new Error("TASK-540 user-settings harness import alias is forbidden");
        }
        if (moduleName === "bun:test") {
          if (statement.importClause.isTypeOnly || element.isTypeOnly) {
            throw new Error("TASK-540 user-settings Bun test import became type-only");
          }
          bunTestImports.push(local);
          continue;
        }
        supportImportTokens.push(
          exactImportOrExportToken(
            local,
            Boolean(statement.importClause?.isTypeOnly || element.isTypeOnly)
          )
        );
        if (USER_SETTINGS_ADDITIVE_PRODUCERS.has(local)) {
          if (statement.importClause?.isTypeOnly || element.isTypeOnly) {
            throw new Error("TASK-540 user-settings additive producer import was redirected");
          }
          importCounts.set(local, (importCounts.get(local) ?? 0) + 1);
        }
      }
      continue;
    }
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
        throw new Error("TASK-540 user-settings harness fixture became mutable");
      }
      for (const declaration of statement.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          !["makeCandidate", "createFakePollDeps", "fakeScope"].includes(declaration.name.text)
        ) {
          throw new Error("TASK-540 user-settings harness owns an unknown module fixture");
        }
        fixtureNames.add(declaration.name.text);
      }
      continue;
    }
    if (
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      ts.isIdentifier(statement.expression.expression) &&
      statement.expression.expression.text === "test"
    ) {
      continue;
    }
    throw new Error("TASK-540 user-settings harness has unknown module-scope behavior");
  }
  if (
    JSON.stringify([...bunTestImports].sort()) !== JSON.stringify(["expect", "test"]) ||
    JSON.stringify(supportImportTokens.sort()) !==
      JSON.stringify([...USER_SETTINGS_HARNESS_SUPPORT_IMPORT_TOKENS].sort()) ||
    [...importDeclarationCounts.values()].some((count) => count !== 1) ||
    [...importCounts.values()].some((count) => count !== 1) ||
    JSON.stringify([...fixtureNames].sort()) !==
      JSON.stringify(["createFakePollDeps", "fakeScope", "makeCandidate"])
  ) {
    throw new Error("TASK-540 user-settings additive producer imports are incomplete");
  }
}

async function requireFinalUserSettingsCallbackContract(files) {
  const baselineSource = await readPinnedUserSettingsPreSplitSource();
  const baseline = scanTestDeclarations(baselineSource, USER_SETTINGS_PRE_SPLIT_PATH);
  requireFinalUserSettingsSupportExports(
    await readFile(ROOT + "/" + USER_SETTINGS_HARNESS_SUPPORT_PATH, "utf8")
  );
  const finalRecords = [];
  for (const file of files) {
    const source = await readFile(ROOT + "/" + file, "utf8");
    if (file === "tests/integration/routes/userSettingsAccessLogHarness.test.ts") {
      requireFinalUserSettingsProducerImports(source);
    }
    const scanned = scanTestDeclarations(source, file);
    finalRecords.push(...scanned.callbackRecords.map((record) => ({ ...record, file })));
  }
  const baselineByName = new Map(baseline.callbackRecords.map((record) => [record.name, record]));
  const finalByName = new Map(finalRecords.map((record) => [record.name, record]));
  if (
    baselineByName.size !== 10 ||
    finalByName.size !== 10 ||
    finalRecords.some(({ name }) => name === null) ||
    finalByName.size !== finalRecords.length ||
    [...baselineByName.keys()].some((name) => !finalByName.has(name))
  ) {
    throw new Error("TASK-540 final user-settings callback identity drifted");
  }

  const retainedRecords = USER_SETTINGS_RETAINED_TEST_NAMES.map((name) => finalByName.get(name));
  if (
    retainedRecords.some((record) => record?.file !== USER_SETTINGS_PRE_SPLIT_PATH) ||
    hashNames(retainedRecords.map(({ declarationFingerprint }) => declarationFingerprint)) !==
      USER_SETTINGS_RETAINED_DECLARATION_SHA256
  ) {
    throw new Error("TASK-540 retained user-settings route callback body drifted");
  }

  const protectedBaselineNames = new Set();
  for (const [name, baselineRecord] of baselineByName) {
    if (USER_SETTINGS_RETAINED_TEST_NAMES.includes(name)) continue;
    for (const protectedName of identifierNamesInStatements(baselineRecord.statements)) {
      protectedBaselineNames.add(protectedName);
    }
  }

  let preservedStatements = 0;
  const additiveEvidence = [];
  for (const [name, baselineRecord] of baselineByName) {
    if (USER_SETTINGS_RETAINED_TEST_NAMES.includes(name)) continue;
    const finalRecord = finalByName.get(name);
    if (finalRecord.file !== "tests/integration/routes/userSettingsAccessLogHarness.test.ts") {
      throw new Error("TASK-540 user-settings harness callback landed in the wrong partition");
    }
    const addedStatements = appendedStatementsAfterExactPrefix(
      baselineRecord.statements,
      finalRecord.statements,
      "TASK-540 " + name
    );
    requireNoProtectedCallbackScopeShadows(name, addedStatements, protectedBaselineNames);
    preservedStatements += baselineRecord.statements.length;
    additiveEvidence.push(...requireAdditiveResultContract(name, addedStatements));
  }
  if (
    additiveEvidence.length !==
    Object.values(USER_SETTINGS_ADDITIVE_RESULT_CONTRACT).reduce(
      (total, contract) => total + Object.keys(contract).length,
      0
    )
  ) {
    throw new Error("TASK-540 user-settings additive result evidence is incomplete");
  }
  return Object.freeze({
    baselineRevision: USER_SETTINGS_PRE_SPLIT_REVISION,
    retainedDeclarationSha256: USER_SETTINGS_RETAINED_DECLARATION_SHA256,
    preservedStatements,
    additiveEvidence: Object.freeze(additiveEvidence),
  });
}

async function readStaticTestRowsAndDeclarations(files) {
  const rows = [];
  const statements = [];
  let declarations = 0;
  for (const file of files) {
    const source = await readFile(ROOT + "/" + file, "utf8");
    const scanned = scanTestDeclarations(source, file);
    declarations += scanned.registrations.length;
    statements.push(...scanned.declarationFingerprints);
    for (const registration of scanned.registrations) {
      if (registration.name === null) {
        throw new Error("TASK-540 Bun test name is not a static literal: " + file);
      }
      rows.push(Object.freeze({ name: registration.name, file }));
    }
  }
  return Object.freeze({
    rows,
    declarations,
    declarationSha256: hashNames(statements),
  });
}

async function declarationEvidence(files) {
  const statements = [];
  let declarations = 0;
  for (const file of files) {
    const source = await readFile(ROOT + "/" + file, "utf8");
    const scanned = scanTestDeclarations(source, file);
    declarations += scanned.registrations.length;
    statements.push(...scanned.declarationFingerprints);
  }
  return Object.freeze({ declarations, declarationSha256: hashNames(statements) });
}

async function runBunRows(files) {
  const directory = await mkdtemp(join(EXTERNAL_TEMP_ROOT, "task-540-bun-tests-"));
  const output = join(directory, "report.xml");
  let parsed;
  try {
    await execFileAsync(
      "/usr/local/bin/bun",
      ["test", "--reporter=junit", "--reporter-outfile=" + output, ...files],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
    parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" }).parse(
      await readFile(output, "utf8")
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  const root = parsed?.testsuites;
  const suites = Array.isArray(root?.testsuite)
    ? root.testsuite
    : root?.testsuite
      ? [root.testsuite]
      : [];
  const rows = suites.flatMap((suite) => {
    const cases = Array.isArray(suite.testcase)
      ? suite.testcase
      : suite.testcase
        ? [suite.testcase]
        : [];
    return cases.map((testCase) =>
      Object.freeze({ name: testCase.name, file: normalizeRowFile(testCase.file) })
    );
  });
  if (
    !root ||
    Number(root.tests) !== rows.length ||
    Number(root.failures) !== 0 ||
    Number(root.skipped) !== 0 ||
    rows.some(
      ({ name, file }) =>
        typeof name !== "string" || typeof file !== "string" || !files.includes(file)
    )
  ) {
    throw new Error("TASK-540 Bun executed-test report is invalid, failed, or skipped");
  }
  return Object.freeze(rows);
}

function expectedPartitionNames(names, family) {
  if (family.sourcePositions) {
    const flattened = family.sourcePositions.flat();
    if (
      flattened.length !== names.length ||
      new Set(flattened).size !== names.length ||
      flattened.some(
        (position) => !Number.isInteger(position) || position < 0 || position >= names.length
      )
    ) {
      throw new Error("TASK-540 explicit source-position partition is invalid");
    }
    return family.sourcePositions.map((positions) => positions.map((position) => names[position]));
  }
  let cursor = 0;
  return family.fileTests.map((count) => {
    const partition = names.slice(cursor, cursor + count);
    cursor += count;
    return partition;
  });
}

function actualFileEvidence(rows, family) {
  return family.files.map((file, index) => {
    const names = rows.filter((row) => row.file === file).map((row) => row.name);
    return Object.freeze({ file, tests: names.length, sha256: hashNames(names), index });
  });
}

function requireFamilyEvidenceContract(name, family, evidence, mode) {
  if (mode === "capture") return;
  const additiveUserSettingsContract =
    name === "userSettingsRoutes" && ["current", "final"].includes(mode);
  if (
    evidence.tests !== family.tests ||
    evidence.sha256 !== family.sha256 ||
    (!additiveUserSettingsContract && evidence.declarationSha256 !== family.declarationSha256) ||
    evidence.declarations !== family.declarations ||
    evidence.fileEvidence.length !== family.files.length ||
    evidence.fileEvidence.some(
      ({ tests, sha256, index }) =>
        tests !== family.fileTests[index] || sha256 !== family.fileNameSha256[index]
    )
  ) {
    throw new Error(`TASK-540 ${name} name/body/partition contract drifted`);
  }
}

function assertScannerSelfTest() {
  const before = `
    // test("commented out", () => expect(false).toBe(true));
    describe("before group", () => {
      test("kept", () => expect(1).toBe(1));
      test.each([1, 2])("row %s", (value) => expect(value).toBeGreaterThan(0));
    });
  `;
  const after = `
    describe("first output group", () => {
      test("kept", () => expect(1).toBe(1));
    });
    describe("second output group", () => {
      test.each([1, 2])("row %s", (value) => expect(value).toBeGreaterThan(0));
    });
  `;
  const baseline = scanTestDeclarations(before, "before.test.ts");
  const split = scanTestDeclarations(after, "after.test.ts");
  if (
    baseline.registrations.length !== 2 ||
    split.registrations.length !== 2 ||
    hashNames(baseline.declarationFingerprints) !== hashNames(split.declarationFingerprints)
  ) {
    throw new Error("TASK-540 per-registration declaration fingerprint self-test failed");
  }
  const bodyMutation = scanTestDeclarations(
    after.replace("toBe(1)", "toBe(2)"),
    "body-mutation.test.ts"
  );
  const dataMutation = scanTestDeclarations(
    after.replace("[1, 2]", "[1, 3]"),
    "data-mutation.test.ts"
  );
  if (
    hashNames(split.declarationFingerprints) === hashNames(bodyMutation.declarationFingerprints) ||
    hashNames(split.declarationFingerprints) === hashNames(dataMutation.declarationFingerprints)
  ) {
    throw new Error("TASK-540 declaration body/dataset mutation self-test failed");
  }
  const additiveBaseline = scanTestDeclarations(
    `test("kept", () => {
      expect(1).toBe(1);
    });`,
    "additive-baseline.test.ts"
  );
  const additive = scanTestDeclarations(
    `test("kept", async () => {
      expect(1).toBe(1);
      const deadlineCrossingInventory = await observeStableAccessLogInventory();
      expect(deadlineCrossingInventory.behaviorError).toBe("access_log_unstable");
      const deadlineCrossingDrain = await drainExactAccessLogs();
      expect(deadlineCrossingDrain.cleanupError?.message).toBe("access_log_absence_unstable");
    });`,
    "additive.test.ts"
  );
  const additiveStatements = appendedStatementsAfterExactPrefix(
    additiveBaseline.callbackRecords[0].statements,
    additive.callbackRecords[0].statements,
    "TASK-540 additive scanner self-test"
  );
  if (
    additiveStatements.length !== 4 ||
    !subtreeContainsCall(additiveStatements[0].node, "observeStableAccessLogInventory") ||
    requireAdditiveResultContract(
      "deadline-crossing cleanup makes one final exact delete and retains absence failure",
      additiveStatements
    ).length !== 2
  ) {
    throw new Error("TASK-540 additive callback scanner self-test failed");
  }
  const noOpAdditive = scanTestDeclarations(
    `test("kept", async () => {
      expect(1).toBe(1);
      const deadlineCrossingInventory = await observeStableAccessLogInventory();
      expect(deadlineCrossingInventory).toBeDefined();
      const deadlineCrossingDrain = await drainExactAccessLogs();
      expect(deadlineCrossingDrain).toBeDefined();
    });`,
    "additive-no-op.test.ts"
  );
  let noOpAdditiveRejected = false;
  try {
    requireAdditiveResultContract(
      "deadline-crossing cleanup makes one final exact delete and retains absence failure",
      appendedStatementsAfterExactPrefix(
        additiveBaseline.callbackRecords[0].statements,
        noOpAdditive.callbackRecords[0].statements,
        "TASK-540 no-op additive scanner self-test"
      )
    );
  } catch {
    noOpAdditiveRejected = true;
  }
  if (!noOpAdditiveRejected) {
    throw new Error("TASK-540 additive callback scanner accepted no-op expectations");
  }
  const shadowBaseline = scanTestDeclarations(
    `test("kept", () => {
      const row = makeCandidate();
      expect(row).toBeDefined();
    });`,
    "additive-shadow-baseline.test.ts"
  );
  const protectedShadowNames = identifierNamesInStatements(
    shadowBaseline.callbackRecords[0].statements
  );
  const shadowMutations = [
    `function expect() { return { toBeDefined: () => undefined }; }`,
    `function makeCandidate() { return { fabricated: true }; }`,
    `if (true) { var expect = () => ({ toBeDefined: () => undefined }); }`,
    `class makeCandidate {}`,
    `const { expect } = { expect: () => ({ toBeDefined: () => undefined }) };`,
  ];
  const rejectedShadows = shadowMutations.filter((mutation, index) => {
    const scanned = scanTestDeclarations(
      `test("kept", () => {
        const row = makeCandidate();
        expect(row).toBeDefined();
        ${mutation}
      });`,
      `additive-shadow-${index}.test.ts`
    );
    try {
      requireNoProtectedCallbackScopeShadows(
        "kept",
        appendedStatementsAfterExactPrefix(
          shadowBaseline.callbackRecords[0].statements,
          scanned.callbackRecords[0].statements,
          `TASK-540 additive shadow ${index} self-test`
        ),
        protectedShadowNames
      );
      return false;
    } catch {
      return true;
    }
  }).length;
  if (rejectedShadows !== shadowMutations.length) {
    throw new Error("TASK-540 additive callback scanner accepted a baseline-name shadow");
  }
  const bypassMutations = [
    `test("kept", async () => {
      expect(1).toBe(1);
      const deadlineCrossingInventory = (await observeStableAccessLogInventory(), { behaviorError: "access_log_unstable" });
      expect(deadlineCrossingInventory.behaviorError).toBe("access_log_unstable");
      const deadlineCrossingDrain = (await drainExactAccessLogs(), { cleanupError: { message: "access_log_absence_unstable" } });
      expect(deadlineCrossingDrain.cleanupError?.message).toBe("access_log_absence_unstable");
    });`,
    `test("kept", async () => {
      expect(1).toBe(1);
      const deadlineCrossingInventory = await observeStableAccessLogInventory();
      expect({ source: deadlineCrossingInventory, behaviorError: "access_log_unstable" }.behaviorError).toBe("access_log_unstable");
      const deadlineCrossingDrain = await drainExactAccessLogs();
      expect({ source: deadlineCrossingDrain, cleanupError: { message: "access_log_absence_unstable" } }.cleanupError?.message).toBe("access_log_absence_unstable");
    });`,
    `test("kept", async () => {
      expect(1).toBe(1);
      if (false) {
        const deadlineCrossingInventory = await observeStableAccessLogInventory();
        expect(deadlineCrossingInventory.behaviorError).toBe("access_log_unstable");
        const deadlineCrossingDrain = await drainExactAccessLogs();
        expect(deadlineCrossingDrain.cleanupError?.message).toBe("access_log_absence_unstable");
      }
    });`,
    `test("kept", async () => {
      expect(1).toBe(1);
      return;
      const deadlineCrossingInventory = await observeStableAccessLogInventory();
      expect(deadlineCrossingInventory.behaviorError).toBe("access_log_unstable");
      const deadlineCrossingDrain = await drainExactAccessLogs();
      expect(deadlineCrossingDrain.cleanupError?.message).toBe("access_log_absence_unstable");
    });`,
    `test("kept", async () => {
      expect(1).toBe(1);
      const observeStableAccessLogInventory = async () => ({ behaviorError: "access_log_unstable" });
      const deadlineCrossingInventory = await observeStableAccessLogInventory();
      expect(deadlineCrossingInventory.behaviorError).toBe("access_log_unstable");
      const deadlineCrossingDrain = await drainExactAccessLogs();
      expect(deadlineCrossingDrain.cleanupError?.message).toBe("access_log_absence_unstable");
    });`,
    `test("kept", async () => {
      expect(1).toBe(1);
      const deadlineCrossingInventory = await observeStableAccessLogInventory();
      Object.assign(deadlineCrossingInventory, { behaviorError: "access_log_unstable" });
      expect(deadlineCrossingInventory.behaviorError).toBe("access_log_unstable");
      const deadlineCrossingDrain = await drainExactAccessLogs();
      expect(deadlineCrossingDrain.cleanupError?.message).toBe("access_log_absence_unstable");
    });`,
    `test("kept", async () => {
      expect(1).toBe(1);
      const deadlineCrossingInventory = await observeStableAccessLogInventory();
      expect(deadlineCrossingInventory.behaviorError).toBe({
        required: "access_log_unstable",
        actual: deadlineCrossingInventory.behaviorError,
      }.actual);
      const deadlineCrossingDrain = await drainExactAccessLogs();
      expect(deadlineCrossingDrain.cleanupError?.message).toBe("access_log_absence_unstable");
    });`,
  ];
  const rejectedBypasses = bypassMutations.filter((source, index) => {
    const scanned = scanTestDeclarations(source, `additive-bypass-${index}.test.ts`);
    try {
      requireAdditiveResultContract(
        "deadline-crossing cleanup makes one final exact delete and retains absence failure",
        appendedStatementsAfterExactPrefix(
          additiveBaseline.callbackRecords[0].statements,
          scanned.callbackRecords[0].statements,
          `TASK-540 additive bypass ${index} self-test`
        )
      );
      return false;
    } catch {
      return true;
    }
  }).length;
  if (rejectedBypasses !== bypassMutations.length) {
    throw new Error("TASK-540 additive callback scanner accepted a fabricated/unreachable result");
  }
  const missingAwait = scanTestDeclarations(
    `test("kept", async () => {
      expect(1).toBe(1);
      const compoundValidationPromise = validateAndCleanupAccessLogs();
      expect(compoundValidationPromise).rejects.toMatchObject({
        errors: [
          { message: "access_log_extra" },
          { message: "access_log_scope_invalid" },
          { message: "access_log_late_after_delete" },
          { message: "access_log_absence_unstable" },
        ],
      });
    });`,
    "additive-missing-await.test.ts"
  );
  let missingAwaitRejected = false;
  try {
    requireAdditiveResultContract(
      "validateAndCleanupAccessLogs preserves deterministic error ordering while draining exact IDs",
      appendedStatementsAfterExactPrefix(
        additiveBaseline.callbackRecords[0].statements,
        missingAwait.callbackRecords[0].statements,
        "TASK-540 missing-await additive scanner self-test"
      )
    );
  } catch {
    missingAwaitRejected = true;
  }
  if (!missingAwaitRejected) {
    throw new Error("TASK-540 additive callback scanner accepted an unawaited rejects assertion");
  }
  const producerImports = `
    import { expect, test } from "bun:test";
    import {
      accessLogSignature,
      observeStableAccessLogInventory,
      drainExactAccessLogs,
      trackedFetch,
      validateAndCleanupAccessLogs,
      type AccessLogCandidate,
      type AccessLogScope,
      type ExpectedAccessLog,
      type PollDeps,
    } from "./support/userSettingsAccessLogHarness";
    const makeCandidate = () => undefined;
    const createFakePollDeps = () => undefined;
    const fakeScope = {};
  `;
  requireFinalUserSettingsProducerImports(producerImports);
  let producerShadowRejected = false;
  try {
    requireFinalUserSettingsProducerImports(
      producerImports.replace(
        "const makeCandidate = () => undefined;",
        "const makeCandidate = () => undefined;\nconst observeStableAccessLogInventory = async () => undefined;"
      )
    );
  } catch {
    producerShadowRejected = true;
  }
  if (!producerShadowRejected) {
    throw new Error("TASK-540 additive callback scanner accepted a shadowed producer import");
  }
  let unknownSupportImportRejected = false;
  try {
    requireFinalUserSettingsProducerImports(
      producerImports.replace("accessLogSignature,", "accessLogSignature,\n      mock,")
    );
  } catch {
    unknownSupportImportRejected = true;
  }
  if (!unknownSupportImportRejected) {
    throw new Error("TASK-540 user-settings harness accepted an unknown support import");
  }
  const exactSupportExports = `
    function sameArray() {}
    function isSubmultiset() {}
    export type AccessLogIdentity = Readonly<{}>;
    export type ExpectedAccessLog = Readonly<{}>;
    export type AccessLogCandidate = Readonly<{}>;
    export type PollDeps = Readonly<{}>;
    export type AccessLogScope = Readonly<{}>;
    export type StableAccessLogInventory = Readonly<{}>;
    export const ACCESS_LOG_POLL_CADENCE_MS = 50;
    export const ACCESS_LOG_MIN_QUIET_MS = 250;
    export const ACCESS_LOG_POLL_TIMEOUT_MS = 5_000;
    export const ACCESS_LOG_REQUIRED_STABLE_POLLS = 3;
    export function accessLogSignature() {}
    export function expectedAccessLogSignature() {}
    export function isOwnedAccessLogCandidate() {}
    export async function observeStableAccessLogInventory() {}
    export async function drainExactAccessLogs() {}
    export async function validateAndCleanupAccessLogs() {}
    export async function trackedFetch() {}
  `;
  requireFinalUserSettingsSupportExports(exactSupportExports);
  let unknownSupportExportRejected = false;
  try {
    requireFinalUserSettingsSupportExports(
      exactSupportExports + "\nexport const mock = () => {};\n"
    );
  } catch {
    unknownSupportExportRejected = true;
  }
  if (!unknownSupportExportRejected) {
    throw new Error("TASK-540 user-settings support accepted an unknown exported helper");
  }
  for (const mutation of [
    exactSupportExports + "\nlet sharedState = [];\n",
    exactSupportExports.replace(
      "export const ACCESS_LOG_POLL_CADENCE_MS",
      "export let ACCESS_LOG_POLL_CADENCE_MS"
    ),
    'import "bun:test";\n' + exactSupportExports,
  ]) {
    let rejected = false;
    try {
      requireFinalUserSettingsSupportExports(mutation);
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error("TASK-540 user-settings support accepted mutable/side-effect state");
    }
  }
  let changedBaselineRejected = false;
  try {
    appendedStatementsAfterExactPrefix(
      additiveBaseline.callbackRecords[0].statements,
      bodyMutation.callbackRecords[0].statements,
      "TASK-540 mutated additive scanner self-test"
    );
  } catch {
    changedBaselineRejected = true;
  }
  if (!changedBaselineRejected) {
    throw new Error("TASK-540 additive callback scanner accepted a changed baseline statement");
  }
  for (const forbidden of [
    `test.skip("disabled", () => {});`,
    `test.only("focused", () => {});`,
    `describe.skip("disabled suite", () => { test("nested", () => {}); });`,
    `describe.only("focused suite", () => { test("nested", () => {}); });`,
  ]) {
    let rejected = false;
    try {
      scanTestDeclarations(forbidden, "forbidden.test.ts");
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error("TASK-540 focused/disabled test self-test failed");
  }
  let auxiliaryMutationCases = 0;
  for (const [name, family] of auxiliaryFamilyEntries) {
    const exact = Object.freeze({
      tests: family.tests,
      sha256: family.sha256,
      declarations: family.declarations,
      declarationSha256: family.declarationSha256,
      fileEvidence: family.files.map((file, index) =>
        Object.freeze({
          file,
          index,
          tests: family.fileTests[index],
          sha256: family.fileNameSha256[index],
        })
      ),
    });
    requireFamilyEvidenceContract(name, family, exact, "current");
    for (const mutation of [
      { ...exact, tests: exact.tests - 1 },
      { ...exact, sha256: "0".repeat(64) },
      { ...exact, declarationSha256: "0".repeat(64) },
      {
        ...exact,
        fileEvidence: exact.fileEvidence.map((entry, index) =>
          index === 0 ? { ...entry, tests: entry.tests - 1 } : entry
        ),
      },
    ]) {
      let rejected = false;
      try {
        requireFamilyEvidenceContract(name, family, mutation, "current");
      } catch {
        rejected = true;
      }
      if (!rejected) throw new Error("TASK-540 auxiliary family mutation self-test failed");
      auxiliaryMutationCases += 1;
    }
  }
  return Object.freeze({ cases: 31 + auxiliaryMutationCases, registrations: 2 });
}

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/u, "").split("=");
    return [key, value.join("=") || "true"];
  })
);
const mode = args.get("mode") ?? "current";
const selected = args.get("family") ?? "all";
if (!new Set(["current", "final", "capture", "self-test"]).has(mode)) {
  throw new Error("TASK-540 test-name mode must be current, final, capture, or self-test");
}
if (mode === "self-test") {
  process.stdout.write(JSON.stringify({ pass: true, mode, evidence: assertScannerSelfTest() }));
  process.exit(0);
}
const allFamilies = Object.freeze({ ...families, ...auxiliaryFamilies });
const selectedFamilies = selected === "all" ? familyEntries : [[selected, allFamilies[selected]]];
if (selectedFamilies.some(([, family]) => !family)) {
  throw new Error("TASK-540 test-name family is unknown: " + selected);
}

const evidence = [];
for (const [name, family] of selectedFamilies) {
  const files = await existingFiles(family.files, mode === "final");
  const staticEvidence = await declarationEvidence(files);
  let rows;
  if (family.lane === "vitest") {
    rows = await listVitestRows(files);
  } else if (mode === "final") {
    rows = await runBunRows(files);
  } else {
    ({ rows } = await readStaticTestRowsAndDeclarations(files));
  }
  const names = rows.map(({ name: testName }) => testName);
  const sha256 = hashNames(names);
  const preSplit = files.length === 1 && files[0] === family.files[0];
  const fileEvidence = preSplit
    ? expectedPartitionNames(names, family).map((partition, index) =>
        Object.freeze({
          file: family.files[index],
          tests: partition.length,
          sha256: hashNames(partition),
          index,
        })
      )
    : actualFileEvidence(rows, family);
  requireFamilyEvidenceContract(
    name,
    family,
    {
      tests: names.length,
      sha256,
      declarations: staticEvidence.declarations,
      declarationSha256: staticEvidence.declarationSha256,
      fileEvidence,
    },
    mode
  );
  const callbackContract =
    name === "userSettingsRoutes" && ["current", "final"].includes(mode)
      ? await requireFinalUserSettingsCallbackContract(files)
      : null;
  evidence.push(
    Object.freeze({
      family: name,
      files,
      tests: names.length,
      sha256,
      declarations: staticEvidence.declarations,
      declarationSha256: staticEvidence.declarationSha256,
      fileEvidence,
      ...(callbackContract ? { callbackContract } : {}),
    })
  );
}

process.stdout.write(JSON.stringify({ pass: true, mode, evidence }));
