import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { SmokeError } from "../../contracts";
import type { PlainJsonObject } from "../../workers/contracts";
import { assertSha256, assertWorkerToken } from "../../workers/contracts";

type SourceModule = Readonly<Record<string, unknown>>;
type ExactOperationSources = Readonly<{
  provenance: string;
  delete: string;
  absence: string;
}>;

const requireWorkflowModule = createRequire(import.meta.url);

function loadWorkflowModule<T>(specifier: string): T {
  return requireWorkflowModule(specifier) as T;
}

const bridgeProtocol = loadWorkflowModule<{
  readonly BRIDGE_INPUT_READER: string;
  readonly BRIDGE_OUTPUT_WRITER: string;
}>("../../../../_docs/_workflows/task-540-smoke/runtime/bun-child-protocol.mjs");
export const TASK540_BRIDGE_INPUT_READER = bridgeProtocol.BRIDGE_INPUT_READER;
export const TASK540_BRIDGE_OUTPUT_WRITER = bridgeProtocol.BRIDGE_OUTPUT_WRITER;
const BRIDGE_INPUT_READER = TASK540_BRIDGE_INPUT_READER;
const BRIDGE_OUTPUT_WRITER = TASK540_BRIDGE_OUTPUT_WRITER;

const bootstrapSourceExports = loadWorkflowModule<SourceModule>(
  "../../../../_docs/_workflows/task-540-smoke/executor/bridge-sources/bootstrap.mjs"
);
const {
  API_SESSION_OBSERVATION_BRIDGE_SOURCE,
  BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE,
} = bootstrapSourceExports as Readonly<
  Record<
    | "API_SESSION_OBSERVATION_BRIDGE_SOURCE"
    | "BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE"
    | "BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE"
    | "BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE",
    string
  >
>;
const platformSourceExports = loadWorkflowModule<SourceModule>(
  "../../../../_docs/_workflows/task-540-smoke/executor/bridge-sources/platform.mjs"
);
const {
  CONTENT_ROUTES_EXACT_BRIDGE_SOURCE,
  CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
  MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
  SCREEN_MATERIALIZE_BRIDGE_SOURCE,
  SECURITY_RATE_BRIDGE_SOURCE,
  SECURITY_SESSION_BRIDGE_SOURCE,
  SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
  STORAGE_PREFLIGHT_BRIDGE_SOURCE,
} = platformSourceExports as Readonly<
  Record<
    | "CONTENT_ROUTES_EXACT_BRIDGE_SOURCE"
    | "CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE"
    | "MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE"
    | "SCREEN_MATERIALIZE_BRIDGE_SOURCE"
    | "SECURITY_RATE_BRIDGE_SOURCE"
    | "SECURITY_SESSION_BRIDGE_SOURCE"
    | "SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE"
    | "STORAGE_PREFLIGHT_BRIDGE_SOURCE",
    string
  >
>;
const responseLostSourceExports = loadWorkflowModule<SourceModule>(
  "../../../../_docs/_workflows/task-540-smoke/executor/bridge-sources/response-lost.mjs"
);
const {
  RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
} = responseLostSourceExports as Readonly<
  Record<
    | "RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE"
    | "RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE"
    | "RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE"
    | "RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE"
    | "RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE"
    | "RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE"
    | "RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE"
    | "RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE"
    | "RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE"
    | "RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE"
    | "RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE",
    string
  >
>;
const userPreferenceSourceExports = loadWorkflowModule<SourceModule>(
  "../../../../_docs/_workflows/task-540-smoke/executor/bridge-sources/user-preference.mjs"
);
const {
  PREFERENCE_GET_BRIDGE_SOURCE,
  PREFERENCE_SET_BRIDGE_SOURCE,
  USER_ABSENCE_BRIDGE_SOURCE,
  USER_DELETE_BRIDGE_SOURCE,
  USER_PROOF_BRIDGE_SOURCE,
  USER_PROVISION_BRIDGE_SOURCE,
} = userPreferenceSourceExports as Readonly<
  Record<
    | "PREFERENCE_GET_BRIDGE_SOURCE"
    | "PREFERENCE_SET_BRIDGE_SOURCE"
    | "USER_ABSENCE_BRIDGE_SOURCE"
    | "USER_DELETE_BRIDGE_SOURCE"
    | "USER_PROOF_BRIDGE_SOURCE"
    | "USER_PROVISION_BRIDGE_SOURCE",
    string
  >
>;
const resourceSourceExports = loadWorkflowModule<SourceModule>(
  "../../../../_docs/_workflows/task-540-smoke/executor/bun-bridge-resource-sources.mjs"
);
const {
  CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
  CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
  CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
  MEDIA_EXACT_BRIDGE_SOURCES,
  PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES,
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE,
  USER_EXACT_BRIDGE_SOURCES,
  USER_SETTING_EXACT_BRIDGE_SOURCES,
} = resourceSourceExports as Readonly<{
  CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE: string;
  CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE: string;
  CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE: string;
  MEDIA_EXACT_BRIDGE_SOURCES: ExactOperationSources;
  PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES: ExactOperationSources;
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES: ExactOperationSources;
  TASK_TRAFFIC_EXACT_BRIDGE_SOURCES: Readonly<
    Record<"audit-log-task-ua" | "access-log-task-ua" | "session-task", ExactOperationSources>
  >;
  TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE: string;
  USER_EXACT_BRIDGE_SOURCES: ExactOperationSources;
  USER_SETTING_EXACT_BRIDGE_SOURCES: ExactOperationSources;
}>;
const operationRegistryModule = loadWorkflowModule<{
  readonly RESOURCE_BUN_SOURCE_SPECS: Readonly<
    Record<
      string,
      Readonly<{
        source: string;
        envProfileId: string;
      }>
    >
  >;
}>("../../../../_docs/_workflows/task-540-smoke/executor/bridge-operation-registry.mjs");
const RESOURCE_BUN_SOURCE_SPECS = operationRegistryModule.RESOURCE_BUN_SOURCE_SPECS;

export const TASK540_SOURCE_PROFILE_IDS = [
  "schema-only",
  "database",
  "bootstrap-preflight",
  "user-identity-proof",
  "user-provisioning",
] as const;

export type Task540SourceProfileId = (typeof TASK540_SOURCE_PROFILE_IDS)[number];

export interface Task540SourceEntry {
  readonly sourceId: string;
  readonly profileId: Task540SourceProfileId;
  readonly inputSchemaId: string;
  readonly sourceSha256: string;
  readonly source: string;
}

export interface Task540SourceRequest {
  readonly operationId: string;
  readonly profileId: Task540SourceProfileId;
  readonly sourceSha256: string;
  readonly input: PlainJsonObject;
}

type SourceDeclaration = readonly [
  sourceId: string,
  profileId: Task540SourceProfileId,
  source: string,
];

const SOURCE_GUARD_PATTERN = /^validateInput\("([a-z0-9-]+)",input\);\/\*wf540-bound-input\*\/\n/u;

function sha256(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}

function sourceEntry([sourceId, profileId, source]: SourceDeclaration): Task540SourceEntry {
  assertWorkerToken(sourceId, "TASK-540 source ID");
  if (!TASK540_SOURCE_PROFILE_IDS.includes(profileId)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source profile is unregistered");
  }
  if (!source.startsWith(BRIDGE_INPUT_READER) || !source.endsWith(BRIDGE_OUTPUT_WRITER)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source envelope drifted");
  }
  const guard = source.slice(BRIDGE_INPUT_READER.length).match(SOURCE_GUARD_PATTERN);
  if (guard === null) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source input guard drifted");
  }
  const inputSchemaId = guard[1];
  assertWorkerToken(inputSchemaId, "TASK-540 input schema ID");
  return Object.freeze({
    sourceId,
    profileId,
    inputSchemaId,
    sourceSha256: sha256(source),
    source,
  });
}

const SOURCE_DECLARATIONS: readonly SourceDeclaration[] = Object.freeze([
  ["source/platform/missing-media-db-absence", "database", MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE],
  ["source/platform/content-routes-exact", "database", CONTENT_ROUTES_EXACT_BRIDGE_SOURCE],
  ["source/platform/seo-entry-discovery", "database", SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE],
  [
    "source/platform/current-resource-owner",
    "database",
    CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
  ],
  ["source/platform/storage-preflight", "bootstrap-preflight", STORAGE_PREFLIGHT_BRIDGE_SOURCE],
  ["source/platform/security-session", "database", SECURITY_SESSION_BRIDGE_SOURCE],
  ["source/platform/security-rate", "database", SECURITY_RATE_BRIDGE_SOURCE],
  ["source/platform/screen-materialize", "schema-only", SCREEN_MATERIALIZE_BRIDGE_SOURCE],
  ["source/response-lost/user", "user-identity-proof", RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE],
  ["source/response-lost/content-type", "database", RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE],
  ["source/response-lost/entry", "database", RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE],
  ["source/response-lost/screen", "database", RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE],
  ["source/response-lost/media", "database", RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE],
  ["source/response-lost/override", "database", RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE],
  [
    "source/response-lost/setting",
    "user-identity-proof",
    RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE,
  ],
  ["source/response-lost/entry-preflight", "database", RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE],
  [
    "source/response-lost/screen-preflight",
    "database",
    RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE,
  ],
  [
    "source/response-lost/override-preflight",
    "database",
    RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE,
  ],
  [
    "source/response-lost/setting-preflight",
    "user-identity-proof",
    RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE,
  ],
  ["source/user/preference-set", "database", PREFERENCE_SET_BRIDGE_SOURCE],
  ["source/user/preference-get", "database", PREFERENCE_GET_BRIDGE_SOURCE],
  ["source/user/provision", "user-provisioning", USER_PROVISION_BRIDGE_SOURCE],
  ["source/user/proof", "user-identity-proof", USER_PROOF_BRIDGE_SOURCE],
  ["source/user/delete", "user-identity-proof", USER_DELETE_BRIDGE_SOURCE],
  ["source/user/absence", "user-identity-proof", USER_ABSENCE_BRIDGE_SOURCE],
  ["source/bootstrap/api-session-observation", "database", API_SESSION_OBSERVATION_BRIDGE_SOURCE],
  ["source/bootstrap/login-observation", "database", BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE],
  ["source/bootstrap/baseline-read", "database", BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE],
  ["source/bootstrap/cas-restore", "database", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE],
  ["source/resource/content-entry-provenance", "database", CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE],
  ["source/resource/content-type-provenance", "database", CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE],
  ["source/resource/custom-screen-provenance", "database", CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE],
  ["source/resource/media/provenance", "database", MEDIA_EXACT_BRIDGE_SOURCES.provenance],
  ["source/resource/media/delete", "database", MEDIA_EXACT_BRIDGE_SOURCES.delete],
  ["source/resource/media/absence", "database", MEDIA_EXACT_BRIDGE_SOURCES.absence],
  [
    "source/resource/override/provenance",
    "database",
    PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.provenance,
  ],
  [
    "source/resource/override/delete",
    "database",
    PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.delete,
  ],
  [
    "source/resource/override/absence",
    "database",
    PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.absence,
  ],
  [
    "source/resource/seo/provenance",
    "database",
    SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.provenance,
  ],
  ["source/resource/seo/delete", "database", SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.delete],
  ["source/resource/seo/absence", "database", SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.absence],
  ["source/resource/task-traffic-snapshot", "database", TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE],
  [
    "source/resource/audit-log/provenance",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["audit-log-task-ua"].provenance,
  ],
  [
    "source/resource/audit-log/delete",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["audit-log-task-ua"].delete,
  ],
  [
    "source/resource/audit-log/absence",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["audit-log-task-ua"].absence,
  ],
  [
    "source/resource/access-log/provenance",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["access-log-task-ua"].provenance,
  ],
  [
    "source/resource/access-log/delete",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["access-log-task-ua"].delete,
  ],
  [
    "source/resource/access-log/absence",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["access-log-task-ua"].absence,
  ],
  [
    "source/resource/session/provenance",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["session-task"].provenance,
  ],
  [
    "source/resource/session/delete",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["session-task"].delete,
  ],
  [
    "source/resource/session/absence",
    "database",
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES["session-task"].absence,
  ],
  ["source/resource/user/provenance", "user-identity-proof", USER_EXACT_BRIDGE_SOURCES.provenance],
  ["source/resource/user/delete", "database", USER_EXACT_BRIDGE_SOURCES.delete],
  ["source/resource/user/absence", "database", USER_EXACT_BRIDGE_SOURCES.absence],
  ["source/resource/setting/provenance", "database", USER_SETTING_EXACT_BRIDGE_SOURCES.provenance],
  ["source/resource/setting/delete", "database", USER_SETTING_EXACT_BRIDGE_SOURCES.delete],
  ["source/resource/setting/absence", "database", USER_SETTING_EXACT_BRIDGE_SOURCES.absence],
]);

const EXPECTED_RESOURCE_SPEC_KEYS = Object.freeze([
  "presentation-override/provenance/failure-discovery",
  "presentation-override/cleanup",
  "presentation-override/absence",
  "seo-document-entry/provenance/cleanup-discovery",
  "seo-document-entry/cleanup",
  "seo-document-entry/absence",
  "setting-user-a/provenance/failure-discovery",
  "setting-user-a/cleanup",
  "setting-user-a/absence",
  "setting-user-b/provenance/failure-discovery",
  "setting-user-b/cleanup",
  "setting-user-b/absence",
  "screen-main/provenance/failure-discovery",
  "screen-retry/provenance/failure-discovery",
  "entry-editable/provenance/failure-discovery",
  "entry-related/provenance/failure-discovery",
  "content-type/provenance/failure-discovery",
  "media-row-key/provenance/admin-api",
  "media-row-key/provenance/failure-discovery",
  "media-row-key/cleanup",
  "media-row-key/absence",
  "audit-log-task-ua/provenance/terminal-db-delta",
  "audit-log-task-ua/cleanup",
  "audit-log-task-ua/absence",
  "access-log-task-ua/provenance/terminal-db-delta",
  "access-log-task-ua/cleanup",
  "access-log-task-ua/absence",
  "session-task/provenance/terminal-db-delta",
  "session-task/cleanup",
  "session-task/absence",
  "user-a/provenance/failure-discovery",
  "user-a/cleanup",
  "user-a/absence",
  "user-b/provenance/failure-discovery",
  "user-b/cleanup",
  "user-b/absence",
  "bootstrap-user-login-state/cleanup",
  "bootstrap-user-login-state/absence",
  "site-content-routes-baseline/absence",
  "storage-baseline/absence",
  "missing-media-baseline/absence",
]);

const EXPLICIT_OPERATION_ALIASES = Object.freeze([
  ["runtime/set-001-storage-preflight", "source/platform/storage-preflight"],
  ["runtime/set-004b-session-policy-preflight", "source/platform/security-session"],
  ["runtime/set-004c-auth-rate-budget-preflight", "source/platform/security-rate"],
  ["runtime/set-032-storage-post-setup", "source/platform/missing-media-db-absence"],
  ["runtime/set-041-preference-a", "source/user/preference-set"],
  ["runtime/set-042-preference-a-proof", "source/user/preference-get"],
  ["runtime/set-043-preference-b", "source/user/preference-set"],
  ["runtime/set-044-preference-b-proof", "source/user/preference-get"],
  ["runtime/set-013-user-a-proof", "source/user/proof"],
  ["runtime/set-015-user-b-proof", "source/user/proof"],
  ["runtime/set-012-user-a-create", "source/user/provision"],
  ["runtime/set-014-user-b-create", "source/user/provision"],
  ["runtime/set-035-screen-create", "source/platform/screen-materialize"],
  ["runtime/set-037-retry-screen-create", "source/platform/screen-materialize"],
  ["terminal/task-traffic-snapshot", "source/resource/task-traffic-snapshot"],
  ["resource/content-routes-exact", "source/platform/content-routes-exact"],
  ["resource/current-owner-exact", "source/platform/current-resource-owner"],
  ["resource/seo-entry-discovery", "source/platform/seo-entry-discovery"],
  ["resource/api-session-observation", "source/bootstrap/api-session-observation"],
  ["resource/bootstrap-login-observation", "source/bootstrap/login-observation"],
  ["resource/bootstrap-cas-restore", "source/bootstrap/cas-restore"],
  ["resource/bootstrap-baseline-read", "source/bootstrap/baseline-read"],
  ["resource/storage-final-preflight", "source/platform/storage-preflight"],
  ["resource/missing-media-db-absence", "source/platform/missing-media-db-absence"],
  ["legacy/user-delete-exact", "source/user/delete"],
  ["legacy/user-absence-exact", "source/user/absence"],
] as const);

const RESPONSE_LOST_FAMILIES = Object.freeze({
  user: Object.freeze({
    actions: ["user-a", "user-b"],
    preflight: "source/response-lost/user",
    discovery: "source/response-lost/user",
  }),
  "content-type": Object.freeze({
    actions: [
      "content-type-editable",
      "content-type-related-a",
      "content-type-related-b",
      "content-type-related-failure",
    ],
    preflight: "source/response-lost/content-type",
    discovery: "source/response-lost/content-type",
  }),
  entry: Object.freeze({
    actions: [
      "entry-related-a1",
      "entry-related-a2",
      "entry-related-b1",
      "entry-related-b2",
      "entry-related-failure1",
      "entry-editable",
    ],
    preflight: "source/response-lost/entry-preflight",
    discovery: "source/response-lost/entry",
  }),
  media: Object.freeze({
    actions: ["media"],
    preflight: "source/response-lost/media",
    discovery: "source/response-lost/media",
  }),
  screen: Object.freeze({
    actions: ["screen-main", "screen-retry"],
    preflight: "source/response-lost/screen-preflight",
    discovery: "source/response-lost/screen",
  }),
  override: Object.freeze({
    actions: ["override"],
    preflight: "source/response-lost/override-preflight",
    discovery: "source/response-lost/override",
  }),
  setting: Object.freeze({
    actions: ["setting-user-a", "setting-user-b"],
    preflight: "source/response-lost/setting-preflight",
    discovery: "source/response-lost/setting",
  }),
});

function collectBridgeSources(value: unknown, output: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith(BRIDGE_INPUT_READER)) output.add(value);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const nested of Object.values(value)) collectBridgeSources(nested, output);
}

export class Task540SourceCatalog {
  readonly #entries = new Map<string, Task540SourceEntry>();
  readonly #aliases = new Map<string, Task540SourceEntry>();

  constructor() {
    for (const declaration of SOURCE_DECLARATIONS) {
      const entry = sourceEntry(declaration);
      if (this.#entries.has(entry.sourceId)) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 source ID is duplicated");
      }
      this.#entries.set(entry.sourceId, entry);
      this.#aliases.set(entry.sourceId, entry);
    }
    for (const [operationId, sourceId] of EXPLICIT_OPERATION_ALIASES) {
      this.#addAlias(operationId, sourceId);
    }
    for (const family of Object.values(RESPONSE_LOST_FAMILIES)) {
      for (const action of family.actions) {
        this.#addAlias(`response-lost/preflight/${action}`, family.preflight);
        this.#addAlias(`response-lost/discovery/${action}`, family.discovery);
      }
    }
    this.#bindResourceSpecs();
    this.assertComplete();
  }

  #addAlias(operationId: string, sourceId: string): void {
    assertWorkerToken(operationId, "TASK-540 source operation ID");
    const entry = this.#entries.get(sourceId);
    if (entry === undefined || this.#aliases.has(operationId)) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 source alias registry drifted");
    }
    this.#aliases.set(operationId, entry);
  }

  #bindResourceSpecs(): void {
    const actualKeys = Object.keys(RESOURCE_BUN_SOURCE_SPECS).sort();
    const expectedKeys = [...EXPECTED_RESOURCE_SPEC_KEYS].sort();
    if (
      actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key, index) => key !== expectedKeys[index])
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 resource source registry drifted");
    }
    for (const key of EXPECTED_RESOURCE_SPEC_KEYS) {
      const spec = RESOURCE_BUN_SOURCE_SPECS[key] as {
        readonly source: string;
        readonly envProfileId: Task540SourceProfileId;
      };
      const matching = [...this.#entries.values()].filter(
        (entry) => entry.source === spec.source && entry.profileId === spec.envProfileId
      );
      if (matching.length !== 1) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 resource source profile drifted");
      }
      this.#addAlias(key, matching[0]!.sourceId);
    }
  }

  assertComplete(): void {
    const discovered = new Set<string>();
    for (const namespace of [
      bootstrapSourceExports,
      platformSourceExports,
      responseLostSourceExports,
      userPreferenceSourceExports,
      resourceSourceExports,
    ]) {
      collectBridgeSources(namespace, discovered);
    }
    const declared = new Set([...this.#entries.values()].map(({ source }) => source));
    if (
      discovered.size !== declared.size ||
      [...discovered].some((source) => !declared.has(source))
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 source catalog is incomplete");
    }
  }

  entries(): readonly Task540SourceEntry[] {
    return Object.freeze(
      [...this.#entries.values()].sort((left, right) => left.sourceId.localeCompare(right.sourceId))
    );
  }

  operationIds(): readonly string[] {
    return Object.freeze([...this.#aliases.keys()].sort());
  }

  require(
    operationId: string,
    profileId?: Task540SourceProfileId,
    sourceSha256?: string
  ): Task540SourceEntry {
    assertWorkerToken(operationId, "TASK-540 source operation ID");
    let entry = this.#aliases.get(operationId);
    if (entry === undefined && profileId !== undefined && sourceSha256 !== undefined) {
      assertSha256(sourceSha256, "TASK-540 source digest");
      const matches = [...this.#entries.values()].filter(
        (candidate) => candidate.profileId === profileId && candidate.sourceSha256 === sourceSha256
      );
      if (matches.length === 1) entry = matches[0];
    }
    if (entry === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 source operation is not allowlisted");
    }
    if (profileId !== undefined && profileId !== entry.profileId) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 source profile authority drifted");
    }
    if (sourceSha256 !== undefined) {
      assertSha256(sourceSha256, "TASK-540 source digest");
      if (sourceSha256 !== entry.sourceSha256) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 source digest authority drifted");
      }
    }
    return entry;
  }
}

export const TASK540_SOURCE_CATALOG = new Task540SourceCatalog();
