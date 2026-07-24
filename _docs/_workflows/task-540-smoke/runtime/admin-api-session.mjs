import { isNullableIsoTimestamp } from "../executor/bootstrap-contracts.mjs";
import {
  DATABASE_OPERATION_TIMEOUT_MS,
  MAX_STREAM_BYTES,
} from "../executor/config.mjs";
import { ownString } from "../executor/environment.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../executor/foundation.mjs";
import { assertPlainJsonValue } from "../executor/json-schema.mjs";

const API_BASE = "http://127.0.0.1:3000/admin/api";
const PRIVATE_API_REQUEST_CONTEXT = new WeakMap();
const PRIVATE_EPHEMERAL_API_REQUEST_CONTEXT = new WeakMap();

export function createAdminApiSessionRuntime({
  PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY,
  PRIVATE_RUNTIME,
  runBunBridgeOperation,
}) {
  async function readBoundedJsonResponse(response, label) {
    const text = await response.text();
    invariant(
      text.length > 0 && Buffer.byteLength(text) <= MAX_STREAM_BYTES,
      label + " response bound drift"
    );
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      invariant(false, label + " response is not JSON");
    }
    assertPlainJsonValue(value, label);
    return { value, bytes: Buffer.from(text) };
  }

  function privateApiContextRegistry(state) {
    const registry = PRIVATE_API_REQUEST_CONTEXT.get(state);
    invariant(registry instanceof Map, "private API context registry is absent");
    return registry;
  }

  function privateEphemeralApiContextRegistry(state) {
    const registry = PRIVATE_EPHEMERAL_API_REQUEST_CONTEXT.get(state);
    invariant(registry instanceof Map, "private ephemeral API context registry is absent");
    return registry;
  }

  function privateApiContextRecord(state, capability, expectedKey = capability?.key) {
    const record = privateApiContextRegistry(state).get(expectedKey);
    invariant(
      capability &&
        record &&
        record.capability === capability &&
        record.key === expectedKey &&
        record.userAgent === capability.userAgent &&
        record.disposeProof === null,
      "API request context is missing, disposed, or has lost capability identity"
    );
    return record;
  }

  function validateEmptyApiStorageState(storageState, label) {
    exactOwnKeys(storageState, ["cookies", "origins"], label, { plain: true });
    invariant(
      Array.isArray(storageState.cookies) &&
        storageState.cookies.length === 0 &&
        Array.isArray(storageState.origins) &&
        storageState.origins.length === 0,
      label + " is not an exact empty jar"
    );
    return storageState;
  }

  function validateApiSessionObservation(value, expectedUserId, expectedUserAgent, label) {
    exactOwnKeys(value, ["rows"], label, { plain: true });
    invariant(Array.isArray(value.rows) && value.rows.length <= 1, label + " cardinality drift");
    for (const row of value.rows) {
      exactOwnKeys(
        row,
        [
          "createdAt",
          "csrfTokenHash",
          "expiresAt",
          "id",
          "ip",
          "revokedAt",
          "tokenHash",
          "userAgent",
          "userId",
        ],
        label + " row",
        { plain: true }
      );
      invariant(
        typeof row.id === "string" &&
          /^[0-9a-f-]{36}$/u.test(row.id) &&
          row.userId === expectedUserId &&
          row.userAgent === expectedUserAgent &&
          typeof row.tokenHash === "string" &&
          /^[a-f0-9]{64}$/u.test(row.tokenHash) &&
          (row.csrfTokenHash === null ||
            (typeof row.csrfTokenHash === "string" && /^[a-f0-9]{64}$/u.test(row.csrfTokenHash))) &&
          isNullableIsoTimestamp(row.createdAt) &&
          isNullableIsoTimestamp(row.expiresAt) &&
          isNullableIsoTimestamp(row.revokedAt) &&
          (row.ip === null || typeof row.ip === "string"),
        label + " row projection drift"
      );
    }
    return value.rows;
  }

  async function readExactApiSessionRows(state, expectedUserId, expectedUserAgent, label) {
    return validateApiSessionObservation(
      await runBunBridgeOperation(state, "resource/api-session-observation", {
        userAgent: expectedUserAgent,
        userId: expectedUserId,
      }),
      expectedUserId,
      expectedUserAgent,
      label
    );
  }

  function validateAuthenticatedApiStorageState(storageState, label) {
    exactOwnKeys(storageState, ["cookies", "origins"], label, { plain: true });
    invariant(
      Array.isArray(storageState.cookies) &&
        storageState.cookies.length === 1 &&
        Array.isArray(storageState.origins) &&
        storageState.origins.length === 0,
      label + " isolated cookie cardinality drift"
    );
    const cookie = storageState.cookies[0];
    exactOwnKeys(
      cookie,
      ["domain", "expires", "httpOnly", "name", "path", "sameSite", "secure", "value"],
      label + " cookie",
      { plain: true }
    );
    invariant(
      cookie.name === "session" &&
        cookie.domain === new URL(API_BASE).hostname &&
        cookie.path === "/" &&
        cookie.httpOnly === true &&
        cookie.secure === false &&
        cookie.sameSite === "Strict" &&
        typeof cookie.value === "string" &&
        cookie.value.length > 0 &&
        typeof cookie.expires === "number" &&
        Number.isFinite(cookie.expires),
      label + " cookie identity drift"
    );
    return cookie;
  }

  async function bindAuthenticatedApiSession(state, capability, expectedUserId) {
    const record = privateApiContextRecord(state, capability);
    const storageState = await record.context.storageState();
    const cookie = validateAuthenticatedApiStorageState(
      storageState,
      record.key + " authenticated storage"
    );
    const rows = await readExactApiSessionRows(
      state,
      expectedUserId,
      record.userAgent,
      record.key + " exact session observation"
    );
    invariant(rows.length === 1, record.key + " exact session row is absent");
    const [row] = rows;
    invariant(
      row.csrfTokenHash === null &&
        row.revokedAt === null &&
        hashBytes(Buffer.from(cookie.value)) === row.tokenHash,
      record.key + " cookie/session token identity drift"
    );
    if (record.sessionId !== null) {
      invariant(
        record.sessionId === row.id &&
          record.userId === row.userId &&
          record.tokenHash === row.tokenHash &&
          canonicalJson(record.cookieStorageState) === canonicalJson(storageState),
        record.key + " repeated session binding drift"
      );
      return row;
    }
    record.userId = row.userId;
    record.sessionId = row.id;
    record.tokenHash = row.tokenHash;
    record.sessionRow = deepFreezeExact(row);
    record.cookieStorageState = deepFreezeExact(storageState);
    const earlyTuple = deepFreezeExact({ id: row.id, userAgent: row.userAgent, userId: row.userId });
    invariant(
      !state.earlyApiSessionTuples.has(record.key),
      record.key + " early API session tuple was assigned twice"
    );
    state.earlyApiSessionTuples.set(record.key, earlyTuple);
    return row;
  }

  async function adminApiRequest(state, session, method, route, options = {}) {
    const privateContext = privateApiContextRecord(state, session);
    const bootstrapAuthority = PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state);
    invariant(
      bootstrapAuthority?.restorationStarted !== true,
      "API request is forbidden after bootstrap restoration starts"
    );
    const headers = { "User-Agent": session.userAgent, Accept: "application/json" };
    if (options.json !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (options.expectedUserId) headers["X-Coderso-Expected-User-Id"] = options.expectedUserId;
    if (options.csrf !== false && !["GET", "HEAD"].includes(method)) {
      invariant(
        typeof privateContext.csrf === "string" && privateContext.csrf.length > 0,
        "API CSRF capability is missing"
      );
      const csrfHeaderName = PRIVATE_RUNTIME.get(state)?.csrfHeaderName;
      invariant(
        typeof csrfHeaderName === "string" && /^[a-z0-9][a-z0-9-]{0,127}$/u.test(csrfHeaderName),
        "API CSRF header authority is missing"
      );
      headers[csrfHeaderName] = privateContext.csrf;
    }
    const response = await privateContext.context.fetch(API_BASE + route, {
      method,
      headers,
      ...(options.multipart === undefined ? {} : { multipart: options.multipart }),
      ...(options.json === undefined ? {} : { data: canonicalJson(options.json) }),
      failOnStatusCode: false,
      maxRedirects: 0,
      maxRetries: 0,
      timeout: DATABASE_OPERATION_TIMEOUT_MS,
    });
    const status = response.status();
    const parsed =
      status === 204
        ? { value: null, bytes: Buffer.alloc(0) }
        : await readBoundedJsonResponse(response, route);
    const result =
      options.retainAuthoritativeBytes === true
        ? { status, value: parsed.value, authoritativeBytes: parsed.bytes }
        : { status, value: parsed.value };
    await response.dispose();
    if (options.allowedStatus?.includes(status)) {
      return result;
    }
    invariant(status >= 200 && status < 300, route + " returned HTTP " + status);
    return result;
  }

  function validateExactApiLoginResponse(value, expectedUserId, expectedEmail) {
    exactOwnKeys(value, ["session", "user"], "API login response", { plain: true });
    exactOwnKeys(value.user, ["email", "id", "name"], "API login user", { plain: true });
    exactOwnKeys(value.session, ["expiresAt"], "API login session", { plain: true });
    invariant(
      value.user.id === expectedUserId &&
        typeof value.user.email === "string" &&
        value.user.email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() &&
        (value.user.name === null || typeof value.user.name === "string") &&
        typeof value.session.expiresAt === "string" &&
        new Date(value.session.expiresAt).toISOString() === value.session.expiresAt,
      "API login identity or strict response projection drift"
    );
    return value;
  }

  async function loginApiSession(state, key, email, userAgent) {
    const registry = privateApiContextRegistry(state);
    invariant(!state.sessions.has(key) && !registry.has(key), "API session already exists: " + key);
    invariant(
      state.playwrightRequest && typeof state.playwrightRequest.newContext === "function",
      "Playwright request authority is absent"
    );
    const expectedUserId = key === "bootstrap" ? state.bootstrapBaseline?.id : state.ids.userA;
    invariant(
      typeof expectedUserId === "string" && /^[0-9a-f-]{36}$/u.test(expectedUserId),
      key + " expected login identity is absent"
    );
    const priorRows = await readExactApiSessionRows(
      state,
      expectedUserId,
      userAgent,
      key + " pre-login session observation"
    );
    invariant(priorRows.length === 0, key + " task-UA session existed before isolated login");
    const context = await state.playwrightRequest.newContext({
      baseURL: API_BASE + "/",
      extraHTTPHeaders: { Accept: "application/json", "User-Agent": userAgent },
      failOnStatusCode: false,
      maxRedirects: 0,
      storageState: { cookies: [], origins: [] },
      timeout: DATABASE_OPERATION_TIMEOUT_MS,
      userAgent,
    });
    const session = { key, userAgent, userId: null };
    const record = {
      capability: session,
      context,
      cookieStorageState: null,
      csrf: null,
      disposalErrors: [],
      disposeAttemptPromise: null,
      disposeProof: null,
      key,
      sessionId: null,
      sessionRow: null,
      tokenHash: null,
      userAgent,
      userId: null,
    };
    registry.set(key, record);
    try {
      validateEmptyApiStorageState(await context.storageState(), key + " initial API storage");
      const response = await adminApiRequest(state, session, "POST", "/auth/login", {
        csrf: false,
        json: {
          email,
          password: ownString(state.repoEnvironment, "ADMIN_PASSWORD", { required: true }),
        },
      });
      validateExactApiLoginResponse(response.value, expectedUserId, email);
      const row = await bindAuthenticatedApiSession(state, session, expectedUserId);
      session.userId = row.userId;
      Object.freeze(session);
      state.sessions.set(key, session);
      return session;
    } catch (cause) {
      const failures = [cause];
      try {
        await bindAuthenticatedApiSession(state, session, expectedUserId);
      } catch (observationError) {
        failures.push(observationError);
      }
      let disposalAttemptFailed = false;
      try {
        await disposeApiRequestContextAndProveAbsent(state, session, key);
      } catch (disposeError) {
        disposalAttemptFailed = true;
        failures.push(disposeError);
      }
      if (!disposalAttemptFailed) {
        const lifecycleError = retainedApiLifecycleFailure(record, key);
        if (lifecycleError !== null) failures.push(lifecycleError);
      }
      throw failures.length === 1
        ? cause
        : new AggregateError(
            failures,
            "API login, exact session observation, or isolated context disposal failed"
          );
    }
  }

  async function captureApiCsrf(state, key) {
    const session = state.sessions.get(key);
    const record = privateApiContextRecord(state, session, key);
    invariant(
      record.csrf === null &&
        record.sessionId !== null &&
        record.sessionRow?.csrfTokenHash === null &&
        canonicalJson(await record.context.storageState()) ===
          canonicalJson(record.cookieStorageState),
      "API CSRF session state drift"
    );
    const beforeRows = await readExactApiSessionRows(
      state,
      record.userId,
      record.userAgent,
      key + " pre-CSRF session observation"
    );
    invariant(
      beforeRows.length === 1 &&
        beforeRows[0].id === record.sessionId &&
        beforeRows[0].tokenHash === record.tokenHash &&
        beforeRows[0].csrfTokenHash === null,
      key + " pre-CSRF row identity drift"
    );
    const response = await adminApiRequest(state, session, "GET", "/auth/csrf", { csrf: false });
    invariant(
      response.value &&
        Object.keys(response.value).length === 1 &&
        typeof response.value.token === "string" &&
        response.value.token.length > 0,
      "API CSRF response drift"
    );
    const storageAfter = await record.context.storageState();
    invariant(
      canonicalJson(storageAfter) === canonicalJson(record.cookieStorageState),
      key + " CSRF request rotated or changed the isolated session cookie"
    );
    const afterRows = await readExactApiSessionRows(
      state,
      record.userId,
      record.userAgent,
      key + " post-CSRF session observation"
    );
    const [before] = beforeRows;
    const [after] = afterRows;
    invariant(
      afterRows.length === 1 &&
        after.id === before.id &&
        after.userId === before.userId &&
        after.userAgent === before.userAgent &&
        after.tokenHash === before.tokenHash &&
        after.ip === before.ip &&
        after.createdAt === before.createdAt &&
        after.expiresAt === before.expiresAt &&
        after.revokedAt === before.revokedAt &&
        after.csrfTokenHash === hashBytes(Buffer.from(response.value.token)),
      key + " CSRF changed more than csrfTokenHash or failed to bind its exact hash"
    );
    record.csrf = response.value.token;
    record.sessionRow = deepFreezeExact(after);
    return session;
  }

  async function disposeOwnedApiRequestContextAndProveAbsent(privateContext, expectedKey) {
    invariant(
      privateContext &&
        privateContext.key === expectedKey &&
        privateContext.context &&
        Array.isArray(privateContext.disposalErrors),
      expectedKey + " API context disposal authority drift"
    );
    if (privateContext.disposeProof !== null) {
      let capabilityRejected = false;
      try {
        await privateContext.context.storageState();
      } catch {
        capabilityRejected = true;
      }
      invariant(
        capabilityRejected,
        expectedKey + " API context capability reappeared after absence proof"
      );
      return privateContext.disposeProof;
    }
    if (privateContext.disposeAttemptPromise === null) {
      privateContext.disposeAttemptPromise = (async () => {
        const failures = [];
        try {
          await privateContext.context.dispose();
        } catch (error) {
          failures.push(error);
        }
        let capabilityRejected = false;
        try {
          await privateContext.context.storageState();
        } catch {
          capabilityRejected = true;
        }
        if (!capabilityRejected) {
          failures.push(new Error(expectedKey + " API context retained capability after dispose"));
        }
        privateContext.disposalErrors.push(...failures);
        if (!capabilityRejected) {
          throw failures.length === 1
            ? failures[0]
            : new AggregateError(
                failures,
                expectedKey + " API context disposal and absence proof failed"
              );
        }
        privateContext.disposeProof = deepFreezeExact({
          acquired: true,
          capabilityAbsent: true,
          disposeCalled: true,
          userAgent: privateContext.userAgent,
        });
        return privateContext.disposeProof;
      })();
    }
    try {
      return await privateContext.disposeAttemptPromise;
    } finally {
      if (privateContext.disposeProof === null) privateContext.disposeAttemptPromise = null;
    }
  }

  async function disposeApiRequestContextAndProveAbsent(state, session, expectedKey) {
    const privateContext = privateApiContextRegistry(state).get(expectedKey);
    invariant(
      privateContext && privateContext.capability === session,
      expectedKey + " API context capability identity drift"
    );
    return disposeOwnedApiRequestContextAndProveAbsent(privateContext, expectedKey);
  }

  function retainedApiLifecycleFailure(record, label) {
    if (!record || record.disposalErrors.length === 0) return null;
    return new AggregateError(
      [...record.disposalErrors],
      label + " retained API context lifecycle failure"
    );
  }

  function bootstrapApiSession(state) {
    const session = state.sessions.get("bootstrap");
    const record = session && privateApiContextRecord(state, session, "bootstrap");
    invariant(
      session?.userId === state.bootstrapBaseline.id &&
        typeof record?.csrf === "string" &&
        record.sessionId === state.earlyApiSessionTuples.get("bootstrap")?.id,
      "bootstrap API session is not ready"
    );
    return session;
  }

  async function readPublicApiExactlyOnce(state, route, userAgent) {
    invariant(
      PRIVATE_BOOTSTRAP_LOGIN_AUTHORITY.get(state)?.restorationStarted !== true &&
        state.playwrightRequest &&
        typeof state.playwrightRequest.newContext === "function",
      "public API read authority is unavailable"
    );
    const ephemeralRegistry = privateEphemeralApiContextRegistry(state);
    const contextKey = "public-preflight";
    invariant(!ephemeralRegistry.has(contextKey), "public preflight API context was acquired twice");
    const context = await state.playwrightRequest.newContext({
      baseURL: API_BASE + "/",
      extraHTTPHeaders: { Accept: "application/json", "User-Agent": userAgent },
      failOnStatusCode: false,
      maxRedirects: 0,
      storageState: { cookies: [], origins: [] },
      timeout: DATABASE_OPERATION_TIMEOUT_MS,
      userAgent,
    });
    const contextRecord = {
      context,
      disposalErrors: [],
      disposeAttemptPromise: null,
      disposeProof: null,
      key: contextKey,
      userAgent,
    };
    ephemeralRegistry.set(contextKey, contextRecord);
    let value;
    let primaryError = null;
    try {
      validateEmptyApiStorageState(
        await context.storageState(),
        "public preflight initial API storage"
      );
      const response = await context.fetch(API_BASE + route, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": userAgent },
        failOnStatusCode: false,
        maxRedirects: 0,
        maxRetries: 0,
        timeout: DATABASE_OPERATION_TIMEOUT_MS,
      });
      try {
        const status = response.status();
        const parsed = await readBoundedJsonResponse(response, route);
        invariant(status >= 200 && status < 300, route + " returned HTTP " + status);
        value = parsed.value;
      } finally {
        await response.dispose();
      }
    } catch (error) {
      primaryError = error;
    }
    let disposalAttemptError = null;
    try {
      await disposeOwnedApiRequestContextAndProveAbsent(contextRecord, contextKey);
    } catch (error) {
      disposalAttemptError = error;
    }
    const lifecycleError =
      disposalAttemptError === null ? retainedApiLifecycleFailure(contextRecord, contextKey) : null;
    if (contextRecord.disposeProof !== null && lifecycleError === null) {
      ephemeralRegistry.delete(contextKey);
    }
    if (primaryError !== null || disposalAttemptError !== null || lifecycleError !== null) {
      const failures = [primaryError, disposalAttemptError, lifecycleError].filter(
        (error) => error !== null
      );
      throw failures.length === 1
        ? failures[0]
        : new AggregateError(failures, "public API read or ephemeral context disposal failed");
    }
    return value;
  }

  return Object.freeze({
    PRIVATE_API_REQUEST_CONTEXT,
    PRIVATE_EPHEMERAL_API_REQUEST_CONTEXT,
    adminApiRequest,
    bootstrapApiSession,
    captureApiCsrf,
    disposeApiRequestContextAndProveAbsent,
    disposeOwnedApiRequestContextAndProveAbsent,
    loginApiSession,
    privateApiContextRegistry,
    privateEphemeralApiContextRegistry,
    readPublicApiExactlyOnce,
    retainedApiLifecycleFailure,
    validateApiSessionObservation,
    validateExactApiLoginResponse,
  });
}
