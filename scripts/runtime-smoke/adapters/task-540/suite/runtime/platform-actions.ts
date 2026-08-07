import { SmokeError } from "../../../../contracts";
import type { PlainJsonObject, PlainJsonValue } from "../../../../workers/contracts";
import { dispatchTask540Operation } from "../executor/operation-dispatch";
import type { Task540NativeAction } from "../composition/contracts";
import type { Task540RuntimeState } from "./contracts";
import {
  assertRecordFields,
  capture,
  contentSchemaFromFields,
  fixtureObject,
  fixtureString,
  resolveTask540Captures,
  runtimeInvariant,
  runtimeObject,
  runtimeSafeProjection,
  runtimeString,
  runtimeUuid,
  task540Sha256,
} from "./native-utils";
import { captureTask540ResponseLostBaselines } from "./response-lost-baselines";
import {
  captureTask540BootstrapBaseline,
  observeTask540BootstrapLogin,
} from "./bootstrap-restoration";

const MAXIMUM_PUBLIC_RESPONSE_BYTES = 4 * 1024 * 1024;

type ContentTypeKey = "editable" | "relatedA" | "relatedB" | "relatedFailure";
type RelatedEntryKey = "a1" | "a2" | "b1" | "b2" | "failure1";

function environmentSecret(environment: NodeJS.ProcessEnv, name: string): string {
  return runtimeString(environment[name], `TASK-540 ${name}`, 16_384);
}

async function readBoundedPublicResponse(response: Response, label: string): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  runtimeInvariant(reader !== undefined, `${label} body is absent`);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      runtimeInvariant(bytes <= MAXIMUM_PUBLIC_RESPONSE_BYTES, `${label} body exceeded its bound`);
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  runtimeInvariant(bytes > 0, `${label} body is empty`);
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

async function boundedHealth(url: string): Promise<PlainJsonObject> {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    throw new SmokeError("smoke_process_failed", "TASK-540 health request failed", {
      cause: error,
    });
  }
  runtimeInvariant(response.status >= 200 && response.status < 400, "TASK-540 health failed");
  const body = await readBoundedPublicResponse(response, "TASK-540 health");
  return Object.freeze({
    bytes: body.byteLength,
    sha256: task540Sha256(body),
    status: response.status,
  });
}

function decodePublicJson(bytes: Uint8Array, label: string): PlainJsonValue {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as PlainJsonValue;
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", `${label} body is not bounded UTF-8 JSON`, {
      cause: error,
    });
  }
}

function contentType(state: Task540RuntimeState, key: ContentTypeKey): PlainJsonObject {
  return fixtureObject(state.plan.fixtureBlueprint, ["contentTypes", key], "TASK-540 content type");
}

function contentTypeCapture(key: ContentTypeKey): string {
  const captures: Readonly<Record<ContentTypeKey, string>> = Object.freeze({
    editable: "content-type-editable.id",
    relatedA: "content-type-related-a.id",
    relatedB: "content-type-related-b.id",
    relatedFailure: "content-type-related-failure.id",
  });
  return captures[key];
}

function relatedEntry(state: Task540RuntimeState, key: RelatedEntryKey): PlainJsonObject {
  return fixtureObject(
    state.plan.fixtureBlueprint,
    ["relatedEntries", key],
    "TASK-540 related entry"
  );
}

function relatedEntryCapture(key: RelatedEntryKey): string {
  const captures: Readonly<Record<RelatedEntryKey, string>> = Object.freeze({
    a1: "related-entry-a1.id",
    a2: "related-entry-a2.id",
    b1: "related-entry-b1.id",
    b2: "related-entry-b2.id",
    failure1: "related-entry-failure1.id",
  });
  return captures[key];
}

function relatedEntryType(key: RelatedEntryKey): ContentTypeKey {
  if (key === "a1" || key === "a2") return "relatedA";
  if (key === "b1" || key === "b2") return "relatedB";
  return "relatedFailure";
}

function bootstrap(state: Task540RuntimeState) {
  return state.sessions.require("bootstrap");
}

function normalizeRatePolicy(
  value: PlainJsonValue,
  required: Readonly<Record<string, unknown>>
): Readonly<Record<string, PlainJsonValue>> {
  const policy = runtimeObject(value, "TASK-540 auth rate policy");
  runtimeInvariant(
    typeof policy.enabled === "boolean" &&
      Number.isSafeInteger(policy.maxRequests) &&
      Number.isSafeInteger(policy.windowSeconds),
    "TASK-540 auth rate policy is invalid"
  );
  if (policy.enabled === true) {
    runtimeInvariant(
      typeof required.requiredEnabledMaxRequests === "number" &&
        typeof required.requiredEnabledWindowSecondsMin === "number" &&
        typeof required.requiredEnabledWindowSecondsMax === "number" &&
        (policy.maxRequests as number) >= required.requiredEnabledMaxRequests &&
        (policy.windowSeconds as number) >= required.requiredEnabledWindowSecondsMin &&
        (policy.windowSeconds as number) <= required.requiredEnabledWindowSecondsMax,
      "TASK-540 auth rate budget is incompatible"
    );
  }
  return Object.freeze({
    enabled: policy.enabled,
    maxRequests: policy.maxRequests,
    windowSeconds: policy.windowSeconds,
  }) as Readonly<Record<string, PlainJsonValue>>;
}

async function storagePreflight(state: Task540RuntimeState): Promise<PlainJsonValue> {
  runtimeInvariant(!state.baselineCaptured, "TASK-540 baseline preflight was repeated");
  await captureTask540ResponseLostBaselines(state.pool, state.plan);
  state.baselineCaptured = true;
  const agents = Object.values(
    fixtureObject(state.plan.fixtureBlueprint, ["userAgents"], "TASK-540 user agents")
  );
  runtimeInvariant(
    agents.length === 4 && agents.every((agent) => typeof agent === "string"),
    "TASK-540 user agent set drifted"
  );
  const result = await dispatchTask540Operation(state.pool, {
    operationId: "runtime/set-001-storage-preflight",
    input: { userAgents: agents as readonly string[] },
  });
  state.bootstrapBaseline = captureTask540BootstrapBaseline(result);
  state.bootstrapUserId = runtimeUuid(
    state.bootstrapBaseline.id,
    "TASK-540 bootstrap baseline user ID"
  );
  return runtimeSafeProjection(result);
}

async function securityPolicy(
  state: Task540RuntimeState,
  mode: "session" | "rate"
): Promise<PlainJsonValue> {
  const operationId =
    mode === "session"
      ? "runtime/set-004b-session-policy-preflight"
      : "runtime/set-004c-auth-rate-budget-preflight";
  const value = await dispatchTask540Operation(state.pool, { operationId, input: {} });
  const object = runtimeObject(value, "TASK-540 security policy");
  if (mode === "session") {
    runtimeInvariant(
      object.singleSession === false &&
        object.effectiveMaxPerUserAtLeast2 === true &&
        state.csrfHeaderName === null,
      "TASK-540 session policy is incompatible"
    );
    state.csrfHeaderName = runtimeString(object.csrfHeaderName, "TASK-540 CSRF header", 128);
    return runtimeSafeProjection({
      effectiveMaxPerUserAtLeast2: true,
      singleSession: false,
    });
  }
  runtimeInvariant(state.authRatePolicy === null, "TASK-540 auth rate policy was repeated");
  state.authRatePolicy = normalizeRatePolicy(value, state.plan.requiredAuthRatePlan);
  return runtimeSafeProjection(state.authRatePolicy as PlainJsonObject);
}

async function login(state: Task540RuntimeState, key: "bootstrap" | "user-a") {
  const fixture = state.plan.fixtureBlueprint;
  const userAgent = fixtureString(
    fixture,
    ["userAgents", key === "bootstrap" ? "apiBootstrap" : "apiUserA"],
    "TASK-540 API user agent"
  );
  const email =
    key === "bootstrap"
      ? environmentSecret(state.environment, "ADMIN_EMAIL")
      : fixtureString(fixture, ["users", "a", "email"], "TASK-540 user A email");
  runtimeInvariant(state.csrfHeaderName !== null, "TASK-540 CSRF header authority is absent");
  const session = state.sessions.create(key, userAgent, state.csrfHeaderName);
  if (key === "bootstrap") state.bootstrapLoginAttempted = true;
  const userId = await session.login(email, environmentSecret(state.environment, "ADMIN_PASSWORD"));
  if (key === "bootstrap") {
    runtimeInvariant(
      state.bootstrapBaseline !== null && state.bootstrapUserId === userId,
      "TASK-540 bootstrap login identity drifted"
    );
    state.bootstrapNewestOwnedPair = await observeTask540BootstrapLogin(state.pool, {
      baseline: state.bootstrapBaseline,
      userAgent,
      userId,
    });
  } else
    runtimeInvariant(
      userId === capture(state.memory.captures, "user-a.id"),
      "TASK-540 user-A login drifted"
    );
  return runtimeSafeProjection({ authenticated: true, identityMatches: true });
}

async function csrf(state: Task540RuntimeState, key: "bootstrap" | "user-a") {
  runtimeInvariant(state.csrfHeaderName !== null, "TASK-540 CSRF header authority is absent");
  await state.sessions.require(key).captureCsrf();
  return runtimeSafeProjection({ captured: true });
}

async function createUser(state: Task540RuntimeState, key: "a" | "b") {
  runtimeInvariant(state.baselineCaptured, "TASK-540 user create lacks baseline authority");
  const user = fixtureObject(state.plan.fixtureBlueprint, ["users", key], "TASK-540 user");
  const operationId =
    key === "a" ? "runtime/set-012-user-a-create" : "runtime/set-014-user-b-create";
  const value = await dispatchTask540Operation(state.pool, {
    operationId,
    input: {
      email: runtimeString(user.email, "TASK-540 user email"),
      name: runtimeString(user.displayName, "TASK-540 user name"),
    },
  });
  const output = runtimeObject(value, "TASK-540 provisioned user");
  const userId = runtimeUuid(output.userId, "TASK-540 provisioned user ID");
  runtimeInvariant(
    output.userEmail === user.email &&
      output.adminRoleTupleCount === 1 &&
      output.exactIdPasswordUpdate === true &&
      output.normalizedEmailMatches === true,
    "TASK-540 provisioned user proof drifted"
  );
  return runtimeSafeProjection(
    { userEmail: output.userEmail as string, userId },
    { [key === "a" ? "user-a.id" : "user-b.id"]: userId }
  );
}

async function proveUser(state: Task540RuntimeState, key: "a" | "b") {
  const user = fixtureObject(state.plan.fixtureBlueprint, ["users", key], "TASK-540 user");
  const userId = capture(state.memory.captures, key === "a" ? "user-a.id" : "user-b.id");
  const value = await dispatchTask540Operation(state.pool, {
    operationId: key === "a" ? "runtime/set-013-user-a-proof" : "runtime/set-015-user-b-proof",
    input: { email: runtimeString(user.email, "TASK-540 user email"), userId },
  });
  runtimeInvariant(
    runtimeObject(value, "TASK-540 user proof").ok === true,
    "TASK-540 user proof failed"
  );
  return runtimeSafeProjection({ active: true, admin: true, userId });
}

async function createContentType(state: Task540RuntimeState, key: ContentTypeKey) {
  runtimeInvariant(state.baselineCaptured, "TASK-540 content-type create lacks baseline authority");
  const fixture = contentType(state, key);
  const body = Object.freeze({
    name: runtimeString(fixture.name, "TASK-540 content-type name"),
    slug: runtimeString(fixture.slug, "TASK-540 content-type slug"),
    schema: contentSchemaFromFields(fixture.fields),
  });
  const response = await bootstrap(state).request("POST", "/content-types", { json: body });
  const record = assertRecordFields(response.value, body, "TASK-540 content-type create");
  const id = runtimeUuid(record.id, "TASK-540 content-type ID");
  state.contentTypeBodies.set(key, body);
  return runtimeSafeProjection(record, { [contentTypeCapture(key)]: id });
}

async function proveContentType(state: Task540RuntimeState, key: ContentTypeKey) {
  const id = capture(state.memory.captures, contentTypeCapture(key));
  const body = state.contentTypeBodies.get(key);
  runtimeInvariant(body !== undefined, "TASK-540 content-type body is absent");
  const response = await bootstrap(state).request(
    "GET",
    `/content-types/${encodeURIComponent(id)}`,
    {
      csrf: false,
    }
  );
  assertRecordFields(response.value, { id, ...body }, "TASK-540 content-type proof");
  if (key === "editable") {
    const projection = Object.freeze({ id, name: body.name, schema: body.schema, slug: body.slug });
    state.editableContentType = projection;
    return projection;
  }
  return runtimeSafeProjection({
    id,
    schemaSha256: task540Sha256(JSON.stringify(body.schema)),
    slug: body.slug,
  });
}

async function createRelatedEntry(state: Task540RuntimeState, key: RelatedEntryKey) {
  runtimeInvariant(
    state.baselineCaptured,
    "TASK-540 related entry create lacks baseline authority"
  );
  const entry = relatedEntry(state, key);
  const type = contentType(state, relatedEntryType(key));
  const body = Object.freeze({
    data: runtimeObject(entry.data, "TASK-540 related entry data"),
    slug: runtimeString(entry.slug, "TASK-540 related entry slug"),
    title: runtimeString(entry.title, "TASK-540 related entry title"),
  });
  const typeSlug = runtimeString(type.slug, "TASK-540 related entry type slug");
  const response = await bootstrap(state).request(
    "POST",
    `/content/${encodeURIComponent(typeSlug)}/entries`,
    { json: body }
  );
  const record = assertRecordFields(response.value, body, "TASK-540 related entry create");
  const id = runtimeUuid(record.id, "TASK-540 related entry ID");
  state.entryBodies.set(key, Object.freeze({ ...body, typeSlug }));
  return runtimeSafeProjection(record, { [relatedEntryCapture(key)]: id });
}

async function proveRelatedEntry(state: Task540RuntimeState, key: RelatedEntryKey) {
  const id = capture(state.memory.captures, relatedEntryCapture(key));
  const body = state.entryBodies.get(key);
  runtimeInvariant(body !== undefined, "TASK-540 related entry body is absent");
  const typeSlug = runtimeString(body.typeSlug, "TASK-540 related entry type slug");
  const expected = { ...body };
  delete (expected as { typeSlug?: PlainJsonValue }).typeSlug;
  const response = await bootstrap(state).request(
    "GET",
    `/content/${encodeURIComponent(typeSlug)}/entries/${encodeURIComponent(id)}`,
    { csrf: false }
  );
  assertRecordFields(response.value, { id, ...expected }, "TASK-540 related entry proof");
  return runtimeSafeProjection({
    id,
    title: expected.title,
    slug: expected.slug,
    dataSha256: task540Sha256(JSON.stringify(expected.data)),
  });
}

async function uploadMedia(state: Task540RuntimeState) {
  runtimeInvariant(state.baselineCaptured, "TASK-540 media create lacks baseline authority");
  const fixture = fixtureObject(state.plan.fixtureBlueprint, ["media"], "TASK-540 media");
  const upload = runtimeObject(fixture.uploadFixture, "TASK-540 media fixture");
  runtimeInvariant(upload.encoding === "base64", "TASK-540 media encoding drifted");
  const bytes = Buffer.from(runtimeString(upload.data, "TASK-540 media fixture data"), "base64");
  runtimeInvariant(
    bytes.byteLength === upload.decodedSizeBytes && task540Sha256(bytes) === upload.sha256,
    "TASK-540 media fixture authority drifted"
  );
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: runtimeString(fixture.mimeType, "TASK-540 media MIME") }),
    runtimeString(fixture.originalName, "TASK-540 media filename")
  );
  form.append("title", runtimeString(fixture.title, "TASK-540 media title"));
  const response = await bootstrap(state).request("POST", "/media", { multipart: form });
  const record = runtimeObject(response.value, "TASK-540 media upload");
  const id = runtimeUuid(record.id, "TASK-540 media ID");
  const key = runtimeString(record.key, "TASK-540 media storage key", 512);
  runtimeInvariant(
    record.mimeType === fixture.mimeType && record.size === bytes.byteLength,
    "TASK-540 media upload response drifted"
  );
  const resolvedUrl = new URL(
    runtimeString(record.url, "TASK-540 media URL", 2_048),
    fixtureString(state.plan.fixtureBlueprint, ["origins", "admin"], "TASK-540 admin origin")
  ).href;
  state.mediaRecord = record;
  return runtimeSafeProjection(
    { id, key, resolvedUrl },
    { "media.id": id, "media.resolved-url": resolvedUrl, "media.storage-key": key }
  );
}

async function proveMedia(state: Task540RuntimeState) {
  const id = capture(state.memory.captures, "media.id");
  const key = capture(state.memory.captures, "media.storage-key");
  const response = await bootstrap(state).request("GET", `/media/${encodeURIComponent(id)}`, {
    csrf: false,
  });
  const record = assertRecordFields(response.value, { id, key }, "TASK-540 media proof");
  runtimeInvariant(record.url === `/media/${key}`, "TASK-540 canonical media URL drifted");
  return runtimeSafeProjection({ id, key, size: record.size as number, url: record.url as string });
}

async function storagePostSetup(state: Task540RuntimeState) {
  const media = fixtureObject(state.plan.fixtureBlueprint, ["media"], "TASK-540 media");
  const value = await dispatchTask540Operation(state.pool, {
    operationId: "runtime/set-032-storage-post-setup",
    input: { mediaId: runtimeUuid(media.missingBoundMediaId, "TASK-540 missing media ID") },
  });
  runtimeInvariant(
    runtimeObject(value, "TASK-540 missing media proof").rowCount === 0,
    "TASK-540 missing media row exists"
  );
  return runtimeSafeProjection(value);
}

async function createEditableEntry(state: Task540RuntimeState) {
  const fixture = fixtureObject(state.plan.fixtureBlueprint, ["entry"], "TASK-540 editable entry");
  const body = Object.freeze({
    data: resolveTask540Captures(
      runtimeObject(fixture.baseline, "TASK-540 editable entry baseline"),
      state.memory.captures
    ),
    slug: runtimeString(fixture.slug, "TASK-540 editable entry slug"),
    title: runtimeString(fixture.title, "TASK-540 editable entry title"),
  });
  const typeSlug = runtimeString(
    contentType(state, "editable").slug,
    "TASK-540 editable type slug"
  );
  const response = await bootstrap(state).request(
    "POST",
    `/content/${encodeURIComponent(typeSlug)}/entries`,
    { json: body }
  );
  const record = assertRecordFields(response.value, body, "TASK-540 editable entry create");
  const id = runtimeUuid(record.id, "TASK-540 editable entry ID");
  state.editableEntryBody = body;
  return runtimeSafeProjection(record, { "entry.id": id });
}

async function proveEditableEntry(state: Task540RuntimeState) {
  const id = capture(state.memory.captures, "entry.id");
  runtimeInvariant(state.editableEntryBody !== null, "TASK-540 editable entry body is absent");
  const slug = runtimeString(contentType(state, "editable").slug, "TASK-540 editable type slug");
  const response = await bootstrap(state).request(
    "GET",
    `/content/${encodeURIComponent(slug)}/entries/${encodeURIComponent(id)}`,
    { csrf: false }
  );
  assertRecordFields(
    response.value,
    { id, ...state.editableEntryBody },
    "TASK-540 editable entry proof"
  );
  return runtimeSafeProjection({
    id,
    bodySha256: task540Sha256(JSON.stringify(state.editableEntryBody)),
  });
}

async function createScreen(state: Task540RuntimeState, key: "main" | "retry") {
  const fixtureKey = key === "main" ? "screen" : "retryScreen";
  const fixture = fixtureObject(state.plan.fixtureBlueprint, [fixtureKey], "TASK-540 Screen");
  runtimeInvariant(
    state.editableContentType !== null,
    "TASK-540 editable content-type projection is absent"
  );
  const template = runtimeObject(fixture.definitionTemplate, "TASK-540 Screen definition");
  const input = {
    bodyWithoutDefinition: Object.freeze({
      contentTypeId: capture(state.memory.captures, "content-type-editable.id"),
      name: runtimeString(fixture.name, "TASK-540 Screen name"),
      showInSidebar: fixture.showInSidebar as boolean,
      sidebarLabel: runtimeString(fixture.sidebarLabel, "TASK-540 Screen label"),
      status: runtimeString(fixture.status, "TASK-540 Screen status"),
    }),
    contentType: state.editableContentType,
    definitionWithoutListView: Object.freeze({
      schemaVersion: 4,
      editorView: runtimeObject(template.editorView, "TASK-540 Screen editor view"),
    }),
  };
  const operationId =
    key === "main" ? "runtime/set-035-screen-create" : "runtime/set-037-retry-screen-create";
  const body = runtimeObject(
    await dispatchTask540Operation(state.pool, { operationId, input }),
    "TASK-540 materialized Screen"
  );
  const response = await bootstrap(state).request("POST", "/custom-screens", { json: body });
  const record = assertRecordFields(
    response.value,
    {
      name: body.name as PlainJsonValue,
      contentTypeId: body.contentTypeId as PlainJsonValue,
      definition: body.definition as PlainJsonValue,
    },
    "TASK-540 Screen create"
  );
  const id = runtimeUuid(record.id, "TASK-540 Screen ID");
  state.screenBodies.set(key, body);
  return runtimeSafeProjection(record, { [key === "main" ? "screen.id" : "retry-screen.id"]: id });
}

async function proveScreen(state: Task540RuntimeState, key: "main" | "retry") {
  const captureName = key === "main" ? "screen.id" : "retry-screen.id";
  const id = capture(state.memory.captures, captureName);
  const body = state.screenBodies.get(key);
  runtimeInvariant(body !== undefined, "TASK-540 Screen body is absent");
  const response = await bootstrap(state).request(
    "GET",
    `/custom-screens/${encodeURIComponent(id)}`,
    {
      csrf: false,
    }
  );
  assertRecordFields(
    response.value,
    {
      id,
      name: body.name as PlainJsonValue,
      contentTypeId: body.contentTypeId as PlainJsonValue,
      definition: body.definition as PlainJsonValue,
    },
    "TASK-540 Screen proof"
  );
  return runtimeSafeProjection({
    id,
    definitionSha256: task540Sha256(JSON.stringify(body.definition)),
  });
}

async function setPreference(state: Task540RuntimeState, key: "a" | "b") {
  const userId = capture(state.memory.captures, key === "a" ? "user-a.id" : "user-b.id");
  const operationId = key === "a" ? "runtime/set-041-preference-a" : "runtime/set-043-preference-b";
  const result = runtimeObject(
    await dispatchTask540Operation(state.pool, {
      operationId,
      input: { showFieldMetadata: false, userId },
    }),
    "TASK-540 preference write"
  );
  runtimeInvariant(result.ok === true, "TASK-540 preference write failed");
  return runtimeSafeProjection({ key, showFieldMetadata: false });
}

async function provePreference(state: Task540RuntimeState, key: "a" | "b") {
  const userId = capture(state.memory.captures, key === "a" ? "user-a.id" : "user-b.id");
  const operationId =
    key === "a" ? "runtime/set-042-preference-a-proof" : "runtime/set-044-preference-b-proof";
  const result = runtimeObject(
    await dispatchTask540Operation(state.pool, { operationId, input: { userId } }),
    "TASK-540 preference proof"
  );
  runtimeInvariant(result.showFieldMetadata === false, "TASK-540 preference proof drifted");
  return runtimeSafeProjection({ key, showFieldMetadata: false });
}

export async function executeTask540PlatformAction(
  state: Task540RuntimeState,
  action: Task540NativeAction
): Promise<PlainJsonValue | undefined> {
  switch (action.id) {
    case "set-001-storage-preflight":
      return storagePreflight(state);
    case "set-002-helper-launch":
      runtimeInvariant(state.hostReady, "TASK-540 owned host is unavailable");
      return runtimeSafeProjection({ hostReady: true });
    case "set-003-admin-health":
      return runtimeSafeProjection(
        await boundedHealth("http://coderso-a.localhost:5173/admin/advanced/custom-screens")
      );
    case "set-004-front-health":
      return runtimeSafeProjection(await boundedHealth("http://coderso-a.localhost:3000/"));
    case "set-004a-bot-protection-preflight": {
      let response: Response;
      try {
        response = await fetch("http://127.0.0.1:3000/admin/api/auth/bot-protection", {
          headers: {
            "User-Agent": fixtureString(
              state.plan.fixtureBlueprint,
              ["userAgents", "publicPreflight"],
              "TASK-540 public user agent"
            ),
          },
          redirect: "manual",
          signal: AbortSignal.timeout(90_000),
        });
      } catch (error) {
        throw new SmokeError("smoke_process_failed", "TASK-540 bot protection request failed", {
          cause: error,
        });
      }
      runtimeInvariant(response.ok, "TASK-540 bot protection request failed");
      const value = runtimeObject(
        decodePublicJson(
          await readBoundedPublicResponse(response, "TASK-540 bot protection"),
          "TASK-540 bot protection"
        ),
        "TASK-540 bot protection"
      );
      runtimeInvariant(value.enabled === false, "TASK-540 bot protection must be disabled");
      return runtimeSafeProjection({ enabled: false });
    }
    case "set-004b-session-policy-preflight":
      return securityPolicy(state, "session");
    case "set-004c-auth-rate-budget-preflight":
      return securityPolicy(state, "rate");
    case "set-011b-bootstrap-api-login":
      return login(state, "bootstrap");
    case "set-011c-bootstrap-csrf-capture":
      return csrf(state, "bootstrap");
    case "set-012-user-a-create":
      return createUser(state, "a");
    case "set-013-user-a-proof":
      return proveUser(state, "a");
    case "set-014-user-b-create":
      return createUser(state, "b");
    case "set-015-user-b-proof":
      return proveUser(state, "b");
    case "set-016-editable-type-create":
      return createContentType(state, "editable");
    case "set-017-editable-type-proof":
      return proveContentType(state, "editable");
    case "set-018-related-a-type-create":
      return createContentType(state, "relatedA");
    case "set-019-related-a-type-proof":
      return proveContentType(state, "relatedA");
    case "set-020-related-b-type-create":
      return createContentType(state, "relatedB");
    case "set-021-related-b-type-proof":
      return proveContentType(state, "relatedB");
    case "set-021a-related-failure-type-create":
      return createContentType(state, "relatedFailure");
    case "set-021b-related-failure-type-proof":
      return proveContentType(state, "relatedFailure");
    case "set-022-related-a1-create":
      return createRelatedEntry(state, "a1");
    case "set-023-related-a1-proof":
      return proveRelatedEntry(state, "a1");
    case "set-024-related-a2-create":
      return createRelatedEntry(state, "a2");
    case "set-025-related-a2-proof":
      return proveRelatedEntry(state, "a2");
    case "set-026-related-b1-create":
      return createRelatedEntry(state, "b1");
    case "set-027-related-b1-proof":
      return proveRelatedEntry(state, "b1");
    case "set-028-related-b2-create":
      return createRelatedEntry(state, "b2");
    case "set-029-related-b2-proof":
      return proveRelatedEntry(state, "b2");
    case "set-029a-related-failure1-create":
      return createRelatedEntry(state, "failure1");
    case "set-029b-related-failure1-proof":
      return proveRelatedEntry(state, "failure1");
    case "set-030-media-upload":
      return uploadMedia(state);
    case "set-031-media-proof":
      return proveMedia(state);
    case "set-032-storage-post-setup":
      return storagePostSetup(state);
    case "set-033-entry-create":
      return createEditableEntry(state);
    case "set-034-entry-proof":
      return proveEditableEntry(state);
    case "set-035-screen-create":
      return createScreen(state, "main");
    case "set-036-screen-proof":
      return proveScreen(state, "main");
    case "set-037-retry-screen-create":
      return createScreen(state, "retry");
    case "set-038-retry-screen-proof":
      return proveScreen(state, "retry");
    case "set-041-preference-a":
      return setPreference(state, "a");
    case "set-042-preference-a-proof":
      return provePreference(state, "a");
    case "set-043-preference-b":
      return setPreference(state, "b");
    case "set-044-preference-b-proof":
      return provePreference(state, "b");
    case "ru-043b-a-api-login":
      return login(state, "user-a");
    case "ru-043c-a-api-csrf-capture":
      return csrf(state, "user-a");
    default:
      return undefined;
  }
}
