// Platform runtime operations for the TASK-540 smoke executor.
//
// Owns the content-type schema projection, the safe runtime projection and record identity
// primitives, the auth rate policy normalizer, the Screen body materializer and every
// setup-phase runtime operation that launches the owned host, proves the platform health
// and security posture and creates and proves the persistent smoke fixtures.
import { ownString } from "../environment.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../foundation.mjs";
import { resolveFixtureValue } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export function contentSchemaFromFields(fields) {
  const properties = {};
  fields.forEach((field, order) => {
    const common = { title: field.label, xFieldType: field.type };
    if (field.type === "relation") {
      properties[field.name] = {
        type: field.relation.multiple ? "array" : "string",
        ...(field.relation.multiple ? { items: { type: "string" } } : {}),
        ...common,
        xRelationTarget: field.relation.target,
        xFieldConfig: { relation: field.relation, order },
      };
    } else if (field.type === "media") {
      properties[field.name] = {
        type: field.media.multiple ? "array" : "string",
        ...(field.media.multiple ? { items: { type: "string" } } : {}),
        ...common,
        xFieldConfig: { media: { accept: field.media.accept }, order },
      };
    } else {
      properties[field.name] = { type: "string", ...common, xFieldConfig: { order } };
    }
  });
  return { type: "object", additionalProperties: false, properties };
}

export function runtimeSafeProjection(observation, captureBindings = {}) {
  return {
    captureBindings,
    observationSha256: hashBytes(Buffer.from(canonicalJson(observation))),
  };
}

export function assertRecordIdentity(value, expected, label) {
  invariant(value && typeof value === "object" && !Array.isArray(value), label + " is missing");
  for (const [key, expectedValue] of Object.entries(expected)) {
    invariant(deepEqualJson(value[key], expectedValue), label + " " + key + " drift");
  }
}

export function readExactEntryAuthorId(value, expectedAuthorId, label) {
  invariant(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof expectedAuthorId === "string" &&
      /^[0-9a-f-]{36}$/u.test(expectedAuthorId),
    label + " authority is invalid"
  );
  const author = value.author;
  exactOwnKeys(author, ["id", "name", "email"], label + " author", { plain: true });
  invariant(
    author.id === expectedAuthorId &&
      (author.name === null || typeof author.name === "string") &&
      typeof author.email === "string",
    label + " author identity drift"
  );
  return author.id;
}

export function normalizeAuthRatePolicy(value, requiredPlan) {
  invariant(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "auth rate policy is absent or invalid"
  );
  exactOwnKeys(value, ["enabled", "maxRequests", "windowSeconds"], "auth rate policy", {
    plain: true,
  });
  invariant(
    requiredPlan !== null &&
      typeof requiredPlan === "object" &&
      Number.isSafeInteger(requiredPlan.requiredEnabledMaxRequests) &&
      Number.isSafeInteger(requiredPlan.requiredEnabledWindowSecondsMin) &&
      Number.isSafeInteger(requiredPlan.requiredEnabledWindowSecondsMax) &&
      typeof value.enabled === "boolean" &&
      Number.isSafeInteger(value.maxRequests) &&
      Number.isSafeInteger(value.windowSeconds) &&
      (!value.enabled ||
        (value.maxRequests >= requiredPlan.requiredEnabledMaxRequests &&
          value.windowSeconds >= requiredPlan.requiredEnabledWindowSecondsMin &&
          value.windowSeconds <= requiredPlan.requiredEnabledWindowSecondsMax)),
    "auth rate policy is absent or invalid"
  );
  return deepFreezeExact({
    enabled: value.enabled,
    maxRequests: value.maxRequests,
    windowSeconds: value.windowSeconds,
  });
}

export function createScreenMaterialization(dependencies) {
  // The Bun bridge operation runner is composed by the facade from the descriptor authority
  // and the bridge transport, so it arrives as an injected dependency instead of a static
  // import and this factory keeps no mutable state of its own.
  exactOwnKeys(dependencies, ["runBunBridgeOperation"], "screen materialization dependencies", {
    plain: true,
  });
  invariant(
    typeof dependencies.runBunBridgeOperation === "function",
    "screen materialization dependencies are not callable"
  );
  const { runBunBridgeOperation } = dependencies;

  async function materializeScreenBody(state, blueprint, captures, operationId) {
    invariant(state.editableContentTypeDetail !== null, "editable content-type projection is absent");
    const { listView: descriptor, ...definitionWithoutListView } = blueprint.definitionTemplate;
    invariant(
      descriptor.materializerId === "buildDefaultListViewDefinition" &&
        descriptor.privateProjectionAuthorityId === "editable-content-type-detail",
      "screen list-view descriptor drift"
    );
    const bodyWithoutDefinition = {
      name: blueprint.name,
      contentTypeId: captures.get("content-type-editable.id"),
      status: blueprint.status,
      showInSidebar: blueprint.showInSidebar,
      sidebarLabel: blueprint.sidebarLabel,
    };
    const body = await runBunBridgeOperation(state, operationId, {
      bodyWithoutDefinition,
      contentType: state.editableContentTypeDetail,
      definitionWithoutListView,
    });
    invariant(
      body.contentTypeId === state.editableContentTypeDetail.id && body.schemaVersion === 4,
      "materialized Screen body drift"
    );
    return deepFreezeExact(body);
  }

  return Object.freeze({ materializeScreenBody });
}

export function createPlatformRuntimeOperations(dependencies) {
  // The owned-host launcher, the private process runner, the admin API session authority, the
  // observed bootstrap login attempt and the Bun bridge operation runner all belong to
  // authorities the facade composes, together with the per-run private runtime registry, so
  // they arrive as injected dependencies and every operation below closes over those exact
  // values instead of a rebindable module slot.
  exactOwnKeys(
    dependencies,
    [
      "PRIVATE_RUNTIME",
      "adminApiRequest",
      "bootstrapApiSession",
      "captureApiCsrf",
      "loginApiSession",
      "readPublicApiExactlyOnce",
      "runBunBridgeOperation",
      "runObservedBootstrapLoginAttempt",
      "runPrivateProcess",
      "startOwnedHost",
    ],
    "platform runtime operation dependencies",
    { plain: true }
  );
  invariant(
    dependencies.PRIVATE_RUNTIME instanceof WeakMap,
    "platform runtime operation private runtime registry is absent"
  );
  invariant(
    Object.entries(dependencies).every(
      ([key, dependency]) => key === "PRIVATE_RUNTIME" || typeof dependency === "function"
    ),
    "platform runtime operation dependencies are not callable"
  );
  const {
    PRIVATE_RUNTIME,
    adminApiRequest,
    bootstrapApiSession,
    captureApiCsrf,
    loginApiSession,
    readPublicApiExactlyOnce,
    runBunBridgeOperation,
    runObservedBootstrapLoginAttempt,
    runPrivateProcess,
    startOwnedHost,
  } = dependencies;

  async function runtimeHostLaunch({ state }) {
    const ready = await startOwnedHost(state);
    return runtimeSafeProjection({ runnerPid: ready.runnerPid, ports: ready.ports });
  }

  async function runtimeHealth({ state }, kind) {
    const url =
      kind === "admin"
        ? "http://coderso-a.localhost:5173/admin/advanced/custom-screens"
        : "http://coderso-a.localhost:3000/";
    const environment = Object.create(null);
    environment.PATH = ownString(process.env, "PATH", { required: true });
    const bytes = await runPrivateProcess({
      file: "curl",
      args: ["--fail", "--silent", "--show-error", url],
      cwd: state.root,
      env: Object.freeze(environment),
      stdin: Buffer.alloc(0),
      timeoutMs: 90_000,
    });
    invariant(bytes.length > 0, kind + " health response is empty");
    return runtimeSafeProjection({ kind, bytes: bytes.length, sha256: hashBytes(bytes) });
  }

  async function runtimeBotProtection({ state, plan }) {
    const value = await readPublicApiExactlyOnce(
      state,
      "/auth/bot-protection",
      plan.fixtureBlueprint.userAgents.publicPreflight
    );
    exactOwnKeys(value, ["enabled", "provider", "siteKey", "enforceOnLocalhost"], "bot protection", {
      plain: true,
    });
    invariant(value.enabled === false, "bot protection must be disabled for the smoke");
    return runtimeSafeProjection({ enabled: false });
  }

  async function runtimeSecurity({ state, plan }, mode, operationId) {
    invariant(
      (mode === "session" && operationId === "runtime/set-004b-session-policy-preflight") ||
        (mode === "rate" && operationId === "runtime/set-004c-auth-rate-budget-preflight"),
      "security runtime descriptor binding drift"
    );
    const value = await runBunBridgeOperation(state, operationId, {});
    if (mode === "session") {
      invariant(
        value.singleSession === false &&
          value.effectiveMaxPerUserAtLeast2 === true &&
          typeof value.csrfHeaderName === "string" &&
          /^[a-z0-9][a-z0-9-]{0,127}$/u.test(value.csrfHeaderName),
        "session policy is incompatible with the smoke"
      );
      const runtime = PRIVATE_RUNTIME.get(state);
      invariant(runtime.csrfHeaderName === null, "CSRF header authority may be assigned only once");
      runtime.csrfHeaderName = value.csrfHeaderName;
      return runtimeSafeProjection({
        singleSession: false,
        effectiveMaxPerUserAtLeast2: true,
      });
    } else {
      const policy = normalizeAuthRatePolicy(value, plan.requiredAuthRatePlan);
      const runtime = PRIVATE_RUNTIME.get(state);
      invariant(runtime.authRatePolicy === null, "auth rate policy may be assigned only once");
      runtime.authRatePolicy = policy;
    }
    return runtimeSafeProjection(value);
  }

  async function runtimeLogin({ state, plan }, key) {
    const blueprint = plan.fixtureBlueprint;
    const email =
      key === "bootstrap"
        ? ownString(state.repoEnvironment, "ADMIN_EMAIL", { required: true })
        : blueprint.users.a.email;
    const userAgent =
      key === "bootstrap" ? blueprint.userAgents.apiBootstrap : blueprint.userAgents.apiUserA;
    const session =
      key === "bootstrap"
        ? await runObservedBootstrapLoginAttempt(state, "api-bootstrap", userAgent, () =>
            loginApiSession(state, key, email, userAgent)
          )
        : await loginApiSession(state, key, email, userAgent);
    if (key === "user-a")
      invariant(session.userId === state.ids.userA, "user-A isolated login identity drift");
    return runtimeSafeProjection({ authenticated: true, identityMatches: true });
  }

  async function runtimeCsrf({ state }, key) {
    await captureApiCsrf(state, key);
    return runtimeSafeProjection({ captured: true });
  }

  async function runtimeProvisionUser({ state, plan, action }, key, operationId) {
    const user = plan.fixtureBlueprint.users[key];
    const captureName = key === "a" ? "user-a.id" : "user-b.id";
    invariant(state.responseLostIntents.has(action.id), "user create lacks its pre-write intent");
    const result = await runBunBridgeOperation(state, operationId, {
      email: user.email,
      name: user.displayName,
    });
    exactOwnKeys(
      result,
      [
        "adminRoleTupleCount",
        "exactIdPasswordUpdate",
        "normalizedEmailMatches",
        "userEmail",
        "userId",
      ],
      "provisioned user proof",
      { plain: true }
    );
    invariant(
      result.userEmail === user.email &&
        /^[0-9a-f-]{36}$/u.test(result.userId) &&
        result.adminRoleTupleCount === 1 &&
        result.exactIdPasswordUpdate === true &&
        result.normalizedEmailMatches === true,
      "provisioned user drift"
    );
    state.ids[key === "a" ? "userA" : "userB"] = result.userId;
    return runtimeSafeProjection(
      { userId: result.userId, userEmail: result.userEmail },
      { [captureName]: result.userId }
    );
  }

  async function runtimeProveUser({ state, plan }, key, operationId) {
    const user = plan.fixtureBlueprint.users[key];
    const userId = state.ids[key === "a" ? "userA" : "userB"];
    const proof = await runBunBridgeOperation(state, operationId, {
      email: user.email,
      userId,
    });
    invariant(proof.ok === true, "user proof failed");
    return runtimeSafeProjection({ active: true, admin: true, userId });
  }

  async function runtimeCreateContentType({ state, plan, action }, blueprintKey, captureName) {
    const contentType = plan.fixtureBlueprint.contentTypes[blueprintKey];
    const body = state.preparedCreateBodies.get(action.id);
    invariant(
      body !== undefined &&
        deepEqualJson(body, {
          name: contentType.name,
          slug: contentType.slug,
          schema: contentSchemaFromFields(contentType.fields),
        }),
      "content type prepared request drift"
    );
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "POST",
      "/content-types",
      { json: body }
    );
    assertRecordIdentity(
      response.value,
      { name: body.name, slug: body.slug, schema: body.schema },
      "content type create"
    );
    invariant(/^[0-9a-f-]{36}$/u.test(response.value.id), "content type ID drift");
    state.contentTypeBodies[blueprintKey] = body;
    state.ids[captureName] = response.value.id;
    return runtimeSafeProjection(response.value, { [captureName]: response.value.id });
  }

  async function runtimeProveContentType(
    { state, plan, captures },
    blueprintKey,
    captureName,
    editable = false
  ) {
    const id = captures.get(captureName);
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/content-types/" + encodeURIComponent(id),
      { csrf: false }
    );
    const expected = state.contentTypeBodies[blueprintKey];
    assertRecordIdentity(
      response.value,
      { id, name: expected.name, slug: expected.slug, schema: expected.schema },
      "content type proof"
    );
    if (editable) {
      const projection = { id, slug: expected.slug, name: expected.name, schema: expected.schema };
      state.editableContentTypeDetail = deepFreezeExact(projection);
      return projection;
    }
    return runtimeSafeProjection({
      id,
      slug: expected.slug,
      schemaSha256: hashBytes(Buffer.from(canonicalJson(expected.schema))),
    });
  }

  async function runtimeCreateRelatedEntry(
    { state, plan, action },
    entryKey,
    contentTypeKey,
    captureName
  ) {
    const entry = plan.fixtureBlueprint.relatedEntries[entryKey];
    const type = plan.fixtureBlueprint.contentTypes[contentTypeKey];
    const body = state.preparedCreateBodies.get(action.id);
    invariant(
      body !== undefined &&
        deepEqualJson(body, { title: entry.title, slug: entry.slug, data: entry.data }),
      "related entry prepared request drift"
    );
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "POST",
      "/content/" + encodeURIComponent(type.slug) + "/entries",
      { json: body }
    );
    assertRecordIdentity(response.value, body, "related entry create");
    invariant(/^[0-9a-f-]{36}$/u.test(response.value.id), "related entry ID drift");
    state.entryBodies[entryKey] = { ...body, typeSlug: type.slug };
    return runtimeSafeProjection(response.value, { [captureName]: response.value.id });
  }

  async function runtimeProveRelatedEntry({ state, captures }, entryKey, captureName) {
    const id = captures.get(captureName);
    const body = state.entryBodies[entryKey];
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/content/" + encodeURIComponent(body.typeSlug) + "/entries/" + encodeURIComponent(id),
      { csrf: false }
    );
    assertRecordIdentity(
      response.value,
      { id, title: body.title, slug: body.slug, data: body.data },
      "related entry proof"
    );
    const semanticByEntryKey = {
      a1: "related-entry-a1",
      a2: "related-entry-a2",
      b1: "related-entry-b1",
      b2: "related-entry-b2",
      failure1: "related-entry-failure1",
    };
    const authorId = readExactEntryAuthorId(
      response.value,
      state.bootstrapBaseline.id,
      "related entry proof"
    );
    state.resourceOwners.set(semanticByEntryKey[entryKey], authorId);
    return runtimeSafeProjection({
      id,
      title: body.title,
      slug: body.slug,
      dataSha256: hashBytes(Buffer.from(canonicalJson(body.data))),
    });
  }

  async function runtimeCreateEditableEntry({ state, plan, action, captures }) {
    const entry = plan.fixtureBlueprint.entry;
    const body = state.preparedCreateBodies.get(action.id);
    invariant(
      body !== undefined &&
        deepEqualJson(body, {
          title: entry.title,
          slug: entry.slug,
          data: resolveFixtureValue(entry.baseline, captures),
        }),
      "editable entry prepared request drift"
    );
    const typeSlug = plan.fixtureBlueprint.contentTypes.editable.slug;
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "POST",
      "/content/" + encodeURIComponent(typeSlug) + "/entries",
      { json: body }
    );
    assertRecordIdentity(response.value, body, "editable entry create");
    state.editableEntryBody = deepFreezeExact(body);
    return runtimeSafeProjection(response.value, { "entry.id": response.value.id });
  }

  async function runtimeProveEditableEntry({ state, plan, captures }) {
    const id = captures.get("entry.id");
    const slug = plan.fixtureBlueprint.contentTypes.editable.slug;
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/content/" + encodeURIComponent(slug) + "/entries/" + encodeURIComponent(id),
      { csrf: false, retainAuthoritativeBytes: true }
    );
    assertRecordIdentity(response.value, { id, ...state.editableEntryBody }, "editable entry proof");
    const authorId = readExactEntryAuthorId(
      response.value,
      state.bootstrapBaseline.id,
      "editable entry proof"
    );
    state.resourceOwners.set("editable-entry", authorId);
    state.mediaRaceAdminEvidence.entry = response.authoritativeBytes;
    return runtimeSafeProjection({
      id,
      bodySha256: hashBytes(Buffer.from(canonicalJson(state.editableEntryBody))),
    });
  }

  async function runtimeCreateScreen({ state, plan, action, captures }, key, captureName) {
    const blueprint =
      key === "main" ? plan.fixtureBlueprint.screen : plan.fixtureBlueprint.retryScreen;
    const body = state.preparedCreateBodies.get(action.id);
    invariant(body !== undefined && body.name === blueprint.name, "Screen prepared request drift");
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "POST",
      "/custom-screens",
      { json: body }
    );
    assertRecordIdentity(
      response.value,
      { name: body.name, contentTypeId: body.contentTypeId, definition: body.definition },
      "Screen create"
    );
    state.screenBodies[key] = body;
    return runtimeSafeProjection(response.value, { [captureName]: response.value.id });
  }

  async function runtimeProveScreen({ state, captures }, key, captureName) {
    const id = captures.get(captureName);
    const body = state.screenBodies[key];
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/custom-screens/" + encodeURIComponent(id),
      { csrf: false, retainAuthoritativeBytes: key === "main" }
    );
    assertRecordIdentity(
      response.value,
      { id, name: body.name, contentTypeId: body.contentTypeId, definition: body.definition },
      "Screen proof"
    );
    if (key === "main") state.mediaRaceAdminEvidence.screen = response.authoritativeBytes;
    return runtimeSafeProjection({
      id,
      definitionSha256: hashBytes(Buffer.from(canonicalJson(body.definition))),
    });
  }

  return Object.freeze({
    runtimeBotProtection,
    runtimeCreateContentType,
    runtimeCreateEditableEntry,
    runtimeCreateRelatedEntry,
    runtimeCreateScreen,
    runtimeCsrf,
    runtimeHealth,
    runtimeHostLaunch,
    runtimeLogin,
    runtimeProveContentType,
    runtimeProveEditableEntry,
    runtimeProveRelatedEntry,
    runtimeProveScreen,
    runtimeProveUser,
    runtimeProvisionUser,
    runtimeSecurity,
  });
}
