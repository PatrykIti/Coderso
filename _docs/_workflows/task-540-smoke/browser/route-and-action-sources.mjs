import { DATABASE_OPERATION_TIMEOUT_MS } from "../executor/config.mjs";
import { deepFreezeExact, invariant } from "../executor/foundation.mjs";
import { expandPathTemplate, parseBuilder } from "./expression-and-capture-sources.mjs";

function expandedRoute(plan, key, captures, runtimeConfig) {
  const route = plan.registries.routes[key];
  invariant(route !== undefined, "unknown registered route: " + key);
  const rawPattern = expandPathTemplate(route.fixture.pattern, captures);
  const pathname = rawPattern.startsWith("/") ? rawPattern : new URL(rawPattern).pathname;
  invariant(pathname.startsWith("/admin/api/"), "route pathname must remain Admin-internal");
  const pattern = "**" + pathname;
  const expectedMediaUrl =
    key === "media-prior-resolution" ? new URL(captures.get("media.resolved-url")) : null;
  if (expectedMediaUrl !== null) {
    invariant(
      expectedMediaUrl.pathname === "/media/" + captures.get("media.storage-key") &&
        expectedMediaUrl.search === "" &&
        expectedMediaUrl.hash === "",
      "media route fixture URL drift"
    );
  }
  return deepFreezeExact({
    key,
    method: route.method,
    mode: route.mode,
    pathname,
    pattern,
    expectedUserId: key === "preference-a-write-exit" ? captures.get("user-a.id") : null,
    csrfHeaderName: key === "preference-a-write-exit" ? runtimeConfig.csrfHeaderName : null,
    expectedMedia:
      key === "media-prior-resolution"
        ? {
            id: captures.get("media.id"),
            key: captures.get("media.storage-key"),
            url: expectedMediaUrl.pathname,
            title: plan.fixtureBlueprint.media.title,
            originalName: plan.fixtureBlueprint.media.originalName,
            mimeType: plan.fixtureBlueprint.media.mimeType,
            size: plan.fixtureBlueprint.media.uploadFixture.decodedSizeBytes,
          }
        : null,
    expectedRows:
      key === "related-a-refresh"
        ? [
            {
              id: captures.get("related-entry-a1.id"),
              typeId: captures.get("content-type-related-a.id"),
              title: plan.fixtureBlueprint.relatedEntries.a1.updatedTitle,
            },
            {
              id: captures.get("related-entry-a2.id"),
              typeId: captures.get("content-type-related-a.id"),
              title: plan.fixtureBlueprint.relatedEntries.a2.title,
            },
          ]
        : null,
  });
}

function assertTaskOwnedMediaListTransport(status, contentType) {
  const mediaType =
    typeof contentType === "string" ? contentType.split(";", 1)[0].trim().toLowerCase() : "";
  if (status !== 200 || mediaType !== "application/json") {
    throw new Error("wf540_media_route_response_transport");
  }
  return true;
}

function isolateTaskOwnedMediaList(payload, expected) {
  const fail = (code) => {
    throw new Error("wf540_media_route_" + code);
  };
  const exactKeys = (value, keys) =>
    Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    );
  const expectedKeys = ["id", "key", "url", "title", "originalName", "mimeType", "size"];
  if (
    !exactKeys(expected, expectedKeys) ||
    typeof expected.id !== "string" ||
    !/^[0-9a-f-]{36}$/u.test(expected.id) ||
    typeof expected.key !== "string" ||
    expected.key.length === 0 ||
    typeof expected.url !== "string" ||
    expected.url !== "/media/" + expected.key ||
    typeof expected.title !== "string" ||
    expected.title.length === 0 ||
    typeof expected.originalName !== "string" ||
    expected.originalName.length === 0 ||
    expected.mimeType !== "image/png" ||
    !Number.isSafeInteger(expected.size) ||
    expected.size <= 0
  ) {
    fail("expected_shape");
  }
  if (!Array.isArray(payload) || payload.length === 0 || payload.length > 10_000) {
    fail("response_shape");
  }
  const ids = payload.map((row) =>
    row && typeof row === "object" && !Array.isArray(row) && typeof row.id === "string"
      ? row.id
      : null
  );
  if (ids.some((id) => id === null) || new Set(ids).size !== ids.length) {
    fail("response_identity");
  }
  const matching = payload.filter((row) => row.id === expected.id);
  if (matching.length !== 1) fail("fixture_cardinality");
  const [row] = matching;
  const mediaRowKeys = [
    "id",
    "key",
    "url",
    "originalName",
    "type",
    "mimeType",
    "size",
    "width",
    "height",
    "alt",
    "title",
    "caption",
    "folderId",
    "tags",
    "focalX",
    "focalY",
    "description",
    "credit",
    "createdAt",
    "createdBy",
  ];
  if (!exactKeys(row, mediaRowKeys)) fail("fixture_shape");
  if (
    row.id !== expected.id ||
    row.key !== expected.key ||
    row.url !== expected.url ||
    row.originalName !== expected.originalName ||
    row.type !== "image" ||
    row.mimeType !== expected.mimeType ||
    row.size !== expected.size ||
    row.width !== 1 ||
    row.height !== 1 ||
    row.title !== expected.title
  ) {
    fail("fixture_identity");
  }
  if (
    row.alt !== null ||
    row.caption !== null ||
    row.folderId !== null ||
    !Array.isArray(row.tags) ||
    row.tags.length !== 0 ||
    row.focalX !== null ||
    row.focalY !== null ||
    row.description !== null ||
    row.credit !== null ||
    typeof row.createdAt !== "string" ||
    !Number.isFinite(Date.parse(row.createdAt)) ||
    (row.createdBy !== null &&
      (typeof row.createdBy !== "string" || !/^[0-9a-f-]{36}$/u.test(row.createdBy)))
  ) {
    fail("fixture_metadata");
  }
  return Object.freeze([Object.freeze({ ...row })]);
}

// The shared delayed-route handler holds one matching request parked for the whole route
// lifetime. For five of the six routes that lifetime contains no user interaction, so "exactly one
// matching request, ever" is a true invariant and a second request means the cacheBus delivered a
// mirrored event twice - the regression the fixture exists to catch.
//
// `related-a-refresh` is the exception, and the frozen manifest makes it one deliberately: the
// route is installed at rc-018 and held to rc-036, and rc-025 clears one relation option while it
// is held. The application is SPECIFIED and unit-tested (tests/vitest/ui/
// use-screen-related-entries.test.tsx, "inherits force for same-target projection changes") to
// answer an id-set change during a pending forced read by inheriting force, and a forced
// listEntriesCached bypasses both the value cache and the pending-request dedupe, so a second GET
// to the parked path is required behaviour rather than a defect. Forbidding it made the contract
// contradict itself: rc-025 could never pass. Duplicates are therefore allowed for this key ONLY,
// only AFTER the first request is parked (a mirrored double delivery arrives before that, while
// the backing fetch is still outstanding, and still fails closed), and their exact count is
// asserted at unroute - so the removed constraint is replaced by a stricter one, not by nothing.
const POST_PARK_DUPLICATE_ROUTE_KEY = "related-a-refresh";
const EXPECTED_POST_PARK_DUPLICATES_BY_ROUTE_KEY = deepFreezeExact({
  [POST_PARK_DUPLICATE_ROUTE_KEY]: 1,
});

function expectedPostParkDuplicatesForRouteKey(key) {
  return Object.hasOwn(EXPECTED_POST_PARK_DUPLICATES_BY_ROUTE_KEY, key)
    ? EXPECTED_POST_PARK_DUPLICATES_BY_ROUTE_KEY[key]
    : 0;
}

function buildRouteSetupSource(route) {
  const descriptor = JSON.stringify(route);
  return `(async (page) => {
    const descriptor = ${descriptor};
    const assertTaskOwnedMediaListTransport = ${assertTaskOwnedMediaListTransport.toString()};
    const isolateTaskOwnedMediaList = ${isolateTaskOwnedMediaList.toString()};
    const context = page.context();
    if (context.__wf540RouteHas(descriptor.key)) throw new Error("wf540_duplicate_route");
    let active = true;
    let hits = 0;
    // Pre-park duplicates are the cacheBus double-delivery detector and still fail closed;
    // post-park duplicates are a manifest-driven projection re-read and are counted instead.
    let firstRequestParked = false;
    let postCaptureHits = 0;
    const POST_PARK_DUPLICATES_ALLOWED = descriptor.key === ${JSON.stringify(POST_PARK_DUPLICATE_ROUTE_KEY)};
    let capturedResolve;
    let releaseResolve;
    let fulfilledResolve;
    let uiSettledResolve;
    let backingSettledResolve;
    let clientAbortedResolve;
    let capturedRequest = null;
    let requestFailureListener = null;
    const captured = new Promise((resolve) => { capturedResolve = resolve; });
    const releaseGate = new Promise((resolve) => { releaseResolve = resolve; });
    const fulfilled = new Promise((resolve) => { fulfilledResolve = resolve; });
    const uiSettled = new Promise((resolve) => { uiSettledResolve = resolve; });
    const backingSettled = new Promise((resolve) => { backingSettledResolve = resolve; });
    const clientAborted = new Promise((resolve) => { clientAbortedResolve = resolve; });
    let backingStatus = null;
    let bodyAbsent = null;
    let bodyMatches = null;
    let contentTypeJson = null;
    let expectedUserIdMatches = null;
    let csrfPresent = null;
    let preferenceValue = null;
    let rowCount = null;
    let rowIdsMatch = null;
    let uniqueIds = null;
    let updatedA1Matches = null;
    let responseBodyOverride = null;
    let handlerFailure = null;
    if (descriptor.mode === "abort-aware-preference-write") {
      if (typeof descriptor.expectedUserId !== "string" || !/^[0-9a-f-]{36}$/u.test(descriptor.expectedUserId) ||
        typeof descriptor.csrfHeaderName !== "string" || !/^[a-z0-9][a-z0-9-]{0,127}$/u.test(descriptor.csrfHeaderName)) {
        throw new Error("wf540_preference_route_private_config");
      }
      requestFailureListener = (request) => {
        if (request !== capturedRequest) return;
        const href = request.url();
        const scheme = href.indexOf("://");
        const start = href.indexOf("/", scheme === -1 ? 0 : scheme + 3);
        const pathname = (start === -1 ? "/" : href.slice(start)).split(/[?#]/u, 1)[0];
        if (request.method() !== "PATCH" || pathname !== descriptor.pathname) throw new Error("wf540_abort_request_identity");
        const failure = request.failure();
        if (!failure || failure.errorText !== "net::ERR_ABORTED") throw new Error("wf540_abort_reason");
        clientAbortedResolve(true);
      };
      page.on("requestfailed", requestFailureListener);
    }
    const handler = async (route) => {
      let handlerStage = "request_identity";
      try {
      const request = route.request();
      const requestHref = request.url();
      const authorityEnd = requestHref.indexOf("/", requestHref.indexOf("://") + 3);
      const requestSuffix = authorityEnd === -1 ? "/" : requestHref.slice(authorityEnd);
      const requestPathname = requestSuffix.split(/[?#]/u, 1)[0];
      if (request.method() !== descriptor.method || requestPathname !== descriptor.pathname) {
        return route.continue();
      }
      hits += 1;
      if (hits !== 1) {
        if (!firstRequestParked || !POST_PARK_DUPLICATES_ALLOWED) throw new Error("wf540_unexpected_duplicate");
        postCaptureHits += 1;
        return route.continue();
      }
      capturedRequest = request;
      bodyAbsent = request.postData() === null;
      if (descriptor.mode === "malformed") {
        capturedResolve(true);
        return route.fulfill({ status: 200, contentType: "application/json", body: "{" });
      }
      if (descriptor.mode === "abort-aware-preference-write") {
        let body = null;
        try { body = JSON.parse(request.postData() ?? ""); } catch { body = null; }
        bodyMatches = body?.value?.version === 1 && body?.value?.showFieldMetadata === true && Object.keys(body).length === 1 && Object.keys(body.value).length === 2;
        contentTypeJson = (request.headers()["content-type"] ?? "").startsWith("application/json");
        expectedUserIdMatches = request.headers()["x-coderso-expected-user-id"] === descriptor.expectedUserId;
        csrfPresent = typeof request.headers()[descriptor.csrfHeaderName] === "string" && request.headers()[descriptor.csrfHeaderName].length > 0;
      }
      handlerStage = "backing_fetch";
      const backingUrl = "http://127.0.0.1:5173" + requestSuffix;
      const response = await route.fetch({
        url: backingUrl,
        method: request.method(),
        headers: request.headers(),
        postData: request.postData() ?? undefined,
        timeout: ${DATABASE_OPERATION_TIMEOUT_MS},
      });
      backingStatus = response.status();
      handlerStage = "backing_validation";
      if (descriptor.key === "media-prior-resolution") {
        const responseContentType = response.headers()["content-type"] ?? "";
        assertTaskOwnedMediaListTransport(backingStatus, responseContentType);
        const isolatedPayload = isolateTaskOwnedMediaList(await response.json(), descriptor.expectedMedia);
        responseBodyOverride = JSON.stringify(isolatedPayload);
      }
      if (descriptor.mode === "delayed-preference-read") {
        const payload = await response.json();
        if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length !== 2 || payload.key !== "customScreens.entry.preferences" || !payload.value || typeof payload.value !== "object" || Array.isArray(payload.value) || Object.keys(payload.value).length !== 2 || payload.value.version !== 1 || typeof payload.value.showFieldMetadata !== "boolean") throw new Error("wf540_preference_route_response_shape");
        preferenceValue = payload.value.showFieldMetadata;
      }
      if (descriptor.key === "related-a-refresh") {
        const payload = await response.json();
        if (!Array.isArray(payload) || payload.length !== 2 || !Array.isArray(descriptor.expectedRows) || descriptor.expectedRows.length !== 2) throw new Error("wf540_related_route_response_shape");
        const allowedRowKeys = new Set(["id", "typeId", "title", "slug", "status", "visibility", "hasPassword", "data", "tags", "scheduledAt", "createdAt", "updatedAt", "publishedAt", "author", "seo"]);
        const requiredRowKeys = ["id", "typeId", "title", "slug", "status", "visibility", "hasPassword", "data", "createdAt", "updatedAt"];
        const exactOptionalObject = (value, allowed, label) => {
          if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !allowed.includes(key))) throw new Error(label);
        };
        for (const row of payload) {
          if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).some((key) => !allowedRowKeys.has(key)) || requiredRowKeys.some((key) => !Object.prototype.hasOwnProperty.call(row, key))) throw new Error("wf540_related_route_row_keys");
          if (!/^[0-9a-f-]{36}$/u.test(row.id) || !/^[0-9a-f-]{36}$/u.test(row.typeId) || typeof row.title !== "string" || row.title.length === 0 || typeof row.slug !== "string" || row.slug.length === 0 || !["draft", "published", "scheduled", "archived"].includes(row.status) || !["public", "private", "password"].includes(row.visibility) || typeof row.hasPassword !== "boolean") throw new Error("wf540_related_route_row_scalar");
          if (!row.data || typeof row.data !== "object" || Array.isArray(row.data) || Object.keys(row.data).length !== 1 || typeof row.data.label !== "string") throw new Error("wf540_related_route_row_data");
          if (typeof row.createdAt !== "string" || typeof row.updatedAt !== "string" || !Number.isFinite(Date.parse(row.createdAt)) || !Number.isFinite(Date.parse(row.updatedAt))) throw new Error("wf540_related_route_row_dates");
          for (const key of ["publishedAt", "scheduledAt"]) if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && (typeof row[key] !== "string" || !Number.isFinite(Date.parse(row[key])))) throw new Error("wf540_related_route_optional_date");
          if (Object.prototype.hasOwnProperty.call(row, "tags") && (!Array.isArray(row.tags) || row.tags.some((tag) => typeof tag !== "string") || new Set(row.tags).size !== row.tags.length)) throw new Error("wf540_related_route_tags");
          if (Object.prototype.hasOwnProperty.call(row, "author") && row.author !== null) {
            exactOptionalObject(row.author, ["id", "name", "email"], "wf540_related_route_author_keys");
            if (Object.keys(row.author).length !== 3 || !/^[0-9a-f-]{36}$/u.test(row.author.id) || (row.author.name !== null && typeof row.author.name !== "string") || typeof row.author.email !== "string") throw new Error("wf540_related_route_author");
          }
          if (Object.prototype.hasOwnProperty.call(row, "seo") && row.seo !== null) {
            exactOptionalObject(row.seo, ["title", "description", "canonicalUrl", "robots"], "wf540_related_route_seo_keys");
            if (Object.values(row.seo).some((value) => value !== null && typeof value !== "string")) throw new Error("wf540_related_route_seo");
          }
        }
        const ids = payload.map((row) => row.id);
        const expectedIds = descriptor.expectedRows.map((row) => row.id);
        rowCount = payload.length;
        uniqueIds = new Set(ids).size === ids.length;
        rowIdsMatch = uniqueIds && [...ids].sort().join("\\u0000") === [...expectedIds].sort().join("\\u0000") && payload.every((row) => descriptor.expectedRows.some((expected) => expected.id === row.id && expected.typeId === row.typeId));
        updatedA1Matches = descriptor.expectedRows.every((expected) => payload.some((row) => row.id === expected.id && row.title === expected.title));
        if (!rowIdsMatch || !uniqueIds || !updatedA1Matches) throw new Error("wf540_related_route_authority");
      }
      backingSettledResolve(true);
      capturedResolve(true);
      handlerStage = "release_wait";
      firstRequestParked = true;
      await releaseGate;
      if (descriptor.mode === "abort-aware-preference-write") return;
      handlerStage = "fulfill";
      await route.fulfill(responseBodyOverride === null
        ? { response }
        : { response, body: responseBodyOverride, contentType: "application/json" });
      fulfilledResolve(true);
      handlerStage = "ui_settlement";
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      uiSettledResolve(true);
      } catch (error) {
        const privateMessage = String(error?.message ?? "");
        // Our own tokens ARE the diagnosis, so they are carried through verbatim. Naming the
        // failure from handlerStage alone reported a duplicate-request rejection as
        // "request_identity_failed" - a stage that had provably passed - and cost two full runs.
        const innerCause = /^wf540_[a-z0-9_]{1,64}$/u.test(privateMessage) ? privateMessage.slice("wf540_".length) : null;
        const stageFailureClass = handlerStage === "backing_fetch"
          ? privateMessage.includes("ENOTFOUND") || privateMessage.includes("getaddrinfo")
            ? "dns"
            : privateMessage.includes("ECONNREFUSED") || privateMessage.includes("connect refused")
              ? "connection_refused"
              : privateMessage.includes("Route is already handled")
                ? "already_handled"
                : privateMessage.includes("Target page, context or browser has been closed")
                  ? "context_closed"
                  : privateMessage.includes("Invalid URL")
                    ? "invalid_url"
                    : privateMessage.includes("fetch")
                      ? "fetch_error"
                      : "unknown"
          : "failed";
        const namedFailure = "wf540_route_handler_" + handlerStage + "_" + (innerCause ?? stageFailureClass);
        // The emitted token has to stay inside the harness reason vocabulary, so an over-long
        // composition falls back to the stage label rather than escaping the anchored pattern.
        handlerFailure = /^wf540_[a-z0-9_]{1,64}$/u.test(namedFailure) ? namedFailure : "wf540_route_handler_" + handlerStage + "_" + stageFailureClass;
        capturedResolve(true);
        throw new Error(handlerFailure);
      }
    };
    await page.route(descriptor.pattern, handler);
    const entry = Object.freeze({
      descriptor: Object.freeze(descriptor),
      ownerPage: page,
      handler,
      active: () => active,
      deactivate: () => { active = false; },
      hits: () => hits,
      postCaptureHits: () => postCaptureHits,
      failure: () => handlerFailure,
      captured,
      fulfilled,
      uiSettled,
      backingSettled,
      clientAborted,
      release: () => { if (!releaseResolve) throw new Error("wf540_route_released_twice"); const resolve = releaseResolve; releaseResolve = null; resolve(true); return true; },
      projection: () => Object.freeze({ backingStatus, bodyAbsent, bodyMatches, contentTypeJson, expectedUserIdMatches, csrfPresent, preferenceValue, rowCount, rowIdsMatch, uniqueIds, updatedA1Matches }),
      removeFailureListener: () => { if (requestFailureListener) { page.off("requestfailed", requestFailureListener); requestFailureListener = null; } },
    });
    context.__wf540RouteSet(descriptor.key, entry);
    const mode = descriptor.mode === "malformed" ? "malformed" : descriptor.mode === "abort-aware-preference-write" ? "abort-aware" : "delayed";
    return { key: descriptor.key, method: descriptor.method, pattern: descriptor.pattern, mode };
  })`;
}

function buildRouteHitSource(route) {
  return `(async (page) => {
    const route = page.context().__wf540RouteGet(${JSON.stringify(route.key)});
    const timeout = page.waitForTimeout(540000).then(() => { throw new Error("wf540_capture_timeout"); });
    await Promise.race([route.captured, timeout]);
    if (route.failure() !== null) throw new Error(route.failure());
    if (route.hits() !== 1) throw new Error("wf540_route_hits");
    const projection = route.projection();
    if (${JSON.stringify(route.mode)} === "malformed") return { hits: 1 };
    if (${JSON.stringify(route.mode)} === "delayed-preference-read") return { hits: 1, captured: true, method: "GET", bodyAbsent: projection.bodyAbsent === true };
    if (${JSON.stringify(route.key)} === "related-a-refresh") return { hits: 1, captured: true, rowCount: projection.rowCount, rowIdsMatch: projection.rowIdsMatch === true, uniqueIds: projection.uniqueIds === true, updatedA1Matches: projection.updatedA1Matches === true };
    if (${JSON.stringify(route.mode)} === "abort-aware-preference-write") {
      await Promise.race([route.backingSettled, timeout]);
      return { hits: 1, captured: true, backingSettled: true, method: "PATCH", bodyMatches: projection.bodyMatches === true, contentTypeJson: projection.contentTypeJson === true, expectedUserIdMatches: projection.expectedUserIdMatches === true, csrfPresent: projection.csrfPresent === true };
    }
    return { hits: 1, captured: true };
  })`;
}

function buildRouteReleaseSource(route) {
  return `(async (page) => {
    const route = page.context().__wf540RouteGet(${JSON.stringify(route.key)});
    route.release();
    const timeout = page.waitForTimeout(540000).then(() => { throw new Error("wf540_settlement_timeout"); });
    if (${JSON.stringify(route.mode)} === "abort-aware-preference-write") {
      const settled = await Promise.race([Promise.all([route.backingSettled, route.clientAborted]), timeout]);
      return { released: true, backingSettled: settled[0] === true, clientAborted: settled[1] === true };
    }
    const settled = await Promise.race([Promise.all([route.fulfilled, route.uiSettled]), timeout]);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return { released: true, fulfilled: settled[0] === true, uiSettled: settled[1] === true };
  })`;
}

function buildRouteUnrouteSource(route) {
  const expectedPostParkDuplicates = expectedPostParkDuplicatesForRouteKey(route.key);
  return `(async (page) => {
    const context = page.context();
    const route = context.__wf540RouteGet(${JSON.stringify(route.key)});
    // Positive invariant replacing the whole-lifetime one-hit guard: the app's specified
    // force-inheriting re-read must happen exactly this many times while the route is held, so
    // losing it or repeating it fails here. The observed count is IN the token, so one run names
    // the real number instead of only reporting a mismatch.
    const observedPostCaptureHits = route.postCaptureHits();
    if (observedPostCaptureHits !== ${expectedPostParkDuplicates}) throw new Error("wf540_route_post_capture_duplicates_" + observedPostCaptureHits);
    await route.ownerPage.unroute(${JSON.stringify(route.pattern)}, route.handler);
    route.removeFailureListener();
    context.__wf540RouteDeactivate(${JSON.stringify(route.key)});
    return true;
  })`;
}

function buildCleanupRoutesSource(plan) {
  const keys = Object.keys(plan.registries.routes).sort();
  return `(async (page) => {
    const context = page.context();
    for (const key of context.__wf540ActiveRouteKeys()) {
      const route = context.__wf540RouteGet(key);
      try { route.release(); } catch {}
      await route.ownerPage.unroute(route.descriptor.pattern, route.handler).catch(() => {});
      route.removeFailureListener();
      context.__wf540RouteDeactivate(key);
    }
    for (const candidate of context.pages()) await candidate.unrouteAll({ behavior: "wait" });
    const inactiveKeys = ${JSON.stringify(keys)}.filter((key) => context.__wf540RouteHas(key) && !context.__wf540RouteGet(key).active());
    if (context.__wf540ActiveRouteKeys().length !== 0 || inactiveKeys.length !== ${keys.length}) throw new Error("wf540_route_cleanup");
    return true;
  })`;
}

function buildFailureCleanupRoutesSource() {
  return `(async (page) => {
    const context = page.context();
    for (const key of context.__wf540ActiveRouteKeys()) {
      const route = context.__wf540RouteGet(key);
      try { route.release(); } catch {}
      await route.ownerPage.unroute(route.descriptor.pattern, route.handler).catch(() => {});
      route.removeFailureListener();
      context.__wf540RouteDeactivate(key);
    }
    for (const candidate of context.pages()) await candidate.unrouteAll({ behavior: "wait" });
    if (context.__wf540ActiveRouteKeys().length !== 0) throw new Error("wf540_failure_route_cleanup");
    return true;
  })`;
}

function createActionExecutionCompiler({
  dirtyGuardsOperationForAction,
  dirtyGuardsRouteKeyForAction,
  relatedCacheOperationForAction,
  relatedCacheRouteKeyForAction,
}) {
  function operationForAction(action, builderAst) {
    if (action.kind === "assert") return "visible-effect-assertion";
    if (action.kind === "observe") return "observation";
    if (action.kind === "route") return builderAst.args[1];
    if (action.kind === "screen") return "screenshot";
    const dirtyGuardsOperation = dirtyGuardsOperationForAction(action);
    if (dirtyGuardsOperation !== null) return dirtyGuardsOperation;
    const relatedCacheOperation = relatedCacheOperationForAction(action);
    if (relatedCacheOperation !== null) return relatedCacheOperation;
    if (action.kind === "logs") return "log-read";
    if (action.kind === "captureNew") return "capture-new-block";
    if (action.kind === "blocksBefore") return "capture-block-baseline";
    if (action.kind === "dispatchAndCaptureSelectionHandle") return "selection-handle-click";
    return action.kind;
  }

  function routeReceiptMetadata(action, executionSpec, plan, captures, runtimeConfig) {
    let routeKey = action.kind === "route" ? executionSpec.builderAst.args[0] : null;
    routeKey = dirtyGuardsRouteKeyForAction(action) ?? routeKey;
    routeKey = relatedCacheRouteKeyForAction(action) ?? routeKey;
    if (routeKey === null) return deepFreezeExact({ routeKey: null, method: null, pattern: null });
    const route = expandedRoute(plan, routeKey, captures, runtimeConfig);
    return deepFreezeExact({ routeKey, method: route.method, pattern: route.pattern });
  }

  function compileActionExecutionSpec(action) {
    const builderAst = parseBuilder(action.builder);
    return deepFreezeExact({
      actionId: action.id,
      kind: action.kind,
      builder: action.builder,
      builderAst,
      refs: Object.hasOwn(action.executable, "refs") ? action.executable.refs : [],
      operation: operationForAction(action, builderAst),
      outputSchemaId: action.outputSchemaId,
      discardOutput:
        action.executable.type === "browser-native" &&
        action.executable.operationId === "fill-secret",
    });
  }

  return {
    compileActionExecutionSpec,
    operationForAction,
    routeReceiptMetadata,
  };
}

export {
  POST_PARK_DUPLICATE_ROUTE_KEY,
  assertTaskOwnedMediaListTransport,
  buildCleanupRoutesSource,
  buildFailureCleanupRoutesSource,
  buildRouteHitSource,
  buildRouteReleaseSource,
  buildRouteSetupSource,
  buildRouteUnrouteSource,
  createActionExecutionCompiler,
  expandedRoute,
  expectedPostParkDuplicatesForRouteKey,
  isolateTaskOwnedMediaList,
};
