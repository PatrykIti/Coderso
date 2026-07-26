import { Script } from "node:vm";

import { NAVIGATION_DISCARD_TIMEOUT_MS } from "../config.mjs";
import { invariant } from "../foundation.mjs";
import {
  buildRouteReleaseSource,
  buildRouteSetupSource,
  buildRouteUnrouteSource,
  expandedRoute,
} from "../../browser/route-and-action-sources.mjs";

const ABORT_AWARE_ROUTE_KEY = "preference-a-write-exit";
const DISCARD_OBSERVATION_ACTION_ID = "ru-090a-a-exit-signout-settled";
const SELF_TEST_RUNTIME_CONFIG = Object.freeze({ csrfHeaderName: "x-self-test-csrf" });
// The single bounded tick that stands in for the nine minutes the production blocker burnt. It has
// to be long enough that a resolver scheduled on the microtask queue always wins, and short enough
// that a NEVER-resolving postcondition is reported in milliseconds instead of by a smoke run.
const BOUNDED_TICK_MS = 50;
const TICK_TOKEN = "wf540_self_test_bounded_tick";

function boundedTick() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(TICK_TOKEN), BOUNDED_TICK_MS);
  });
}

// A fake page that RECORDS listeners and can emit them, unlike the duplicate-policy fake whose
// `on` is a no-op. Emitting is the whole point: the production defect was a postcondition that
// only one never-emitted event could satisfy, so a fake that cannot emit cannot see it.
function createFakeDiscardPage() {
  const routes = new Map();
  const installed = [];
  const unrouted = [];
  const listeners = new Map();
  const pendingTimeouts = [];
  let frameUrl = "http://coderso-a.localhost:5173/admin/";
  const mainFrame = Object.freeze({ url: () => frameUrl });
  const context = Object.freeze({
    __wf540RouteHas: (key) => routes.has(key),
    __wf540RouteSet: (key, entry) => {
      if (routes.has(key)) throw new Error("wf540_duplicate_route");
      routes.set(key, entry);
      return true;
    },
    __wf540RouteGet: (key) => {
      if (!routes.has(key)) throw new Error("wf540_route_missing");
      return routes.get(key);
    },
    __wf540RouteDeactivate: (key) => {
      routes.get(key).deactivate();
      return true;
    },
    __wf540ActiveRouteKeys: () => [...routes.keys()].filter((key) => routes.get(key).active()),
    pages: () => [page],
  });
  const page = Object.freeze({
    context: () => context,
    mainFrame: () => mainFrame,
    route: async (pattern, handler) => {
      installed.push({ pattern, handler });
    },
    unroute: async (pattern, handler) => {
      unrouted.push({ pattern, handler });
    },
    unrouteAll: async () => undefined,
    on: (event, listener) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(listener);
    },
    off: (event, listener) => {
      const registered = listeners.get(event) ?? [];
      const index = registered.indexOf(listener);
      if (index !== -1) registered.splice(index, 1);
    },
    // Controllable rather than real: the bounded discard budget must be reachable in a test
    // without waiting the real 60 000 ms for it.
    waitForTimeout: (ms) =>
      new Promise((resolve) => {
        pendingTimeouts.push({ ms, resolve });
      }),
    evaluate: async () => undefined,
  });
  return {
    page,
    installed,
    unrouted,
    listenerCount: (event) => (listeners.get(event) ?? []).length,
    // Playwright would swallow nothing here: a listener that throws inside the emitter resolves no
    // promise and is awaited nowhere, so this deliberately lets a throw ESCAPE. Any escape is the
    // diagnosability defect resurfacing.
    emit: (event, payload) => {
      for (const listener of [...(listeners.get(event) ?? [])]) listener(payload);
    },
    navigateMainFrameTo: (url) => {
      frameUrl = url;
      for (const listener of [...(listeners.get("framenavigated") ?? [])]) listener(mainFrame);
    },
    firePendingTimeouts: () => {
      const fired = pendingTimeouts.splice(0, pendingTimeouts.length);
      for (const { resolve } of fired) resolve();
      return fired.map(({ ms }) => ms);
    },
  };
}

function createFakeCapturedRoute(descriptor) {
  const calls = { continued: 0, fulfilled: 0, fetched: 0 };
  let failure = null;
  const request = Object.freeze({
    url: () => "http://coderso-a.localhost:5173" + descriptor.pathname,
    method: () => descriptor.method,
    postData: () => JSON.stringify({ value: { version: 1, showFieldMetadata: true } }),
    headers: () => ({
      "content-type": "application/json",
      "x-coderso-expected-user-id": descriptor.expectedUserId,
      [descriptor.csrfHeaderName]: "self-test-csrf-token",
    }),
    failure: () => failure,
  });
  return {
    calls,
    request: () => request,
    capturedRequest: request,
    setFailure: (value) => {
      failure = value;
    },
    continue: async () => {
      calls.continued += 1;
    },
    fulfill: async () => {
      calls.fulfilled += 1;
    },
    fetch: async () => {
      calls.fetched += 1;
      return Object.freeze({
        status: () => 200,
        headers: () => ({ "content-type": "application/json" }),
        json: async () => ({
          key: "customScreens.entry.preferences",
          value: { version: 1, showFieldMetadata: true },
        }),
      });
    },
  };
}

async function parkAbortAwareWrite(descriptor) {
  const fake = createFakeDiscardPage();
  const setup = new Script("(" + buildRouteSetupSource(descriptor) + ")", {
    filename: descriptor.key + ".discard-route-setup.self-test.js",
  }).runInThisContext();
  const summary = await setup(fake.page);
  invariant(
    fake.installed.length === 1 &&
      summary.key === descriptor.key &&
      summary.mode === "abort-aware" &&
      fake.listenerCount("requestfinished") === 1 &&
      fake.listenerCount("requestfailed") === 1 &&
      fake.listenerCount("framenavigated") === 1,
    "abort-aware discard listener installation drift"
  );
  const entry = fake.page.context().__wf540RouteGet(descriptor.key);
  const captured = createFakeCapturedRoute(descriptor);
  // Deliberately not awaited: the release gate is never opened here, which is exactly the state
  // the write occupies while user A signs out.
  const parked = fake.installed[0].handler(captured).catch(() => null);
  await entry.backingSettled;
  invariant(
    entry.hits() === 1 &&
      entry.failure() === null &&
      entry.listenerFailure() === null &&
      entry.responseDelivered() === false &&
      captured.calls.fetched === 1 &&
      captured.calls.fulfilled === 0,
    "abort-aware parked write drift"
  );
  return { fake, entry, captured, parked };
}

async function releaseOutcome(descriptor, fake) {
  const release = new Script("(" + buildRouteReleaseSource(descriptor) + ")", {
    filename: descriptor.key + ".discard-route-release.self-test.js",
  }).runInThisContext();
  const settled = release(fake.page).then(
    (value) => ({ value, message: null }),
    (error) => ({ value: null, message: String(error?.message ?? "") })
  );
  // One turn for the release source to install its own bounded timeout, then fire it so a
  // never-resolving postcondition is reported now rather than in 60 000 ms.
  await boundedTick();
  const firedBudgets = fake.firePendingTimeouts();
  return { ...(await settled), firedBudgets };
}

/**
 * Behavioural round-trip for the sign-out discard postcondition of the abort-aware preference
 * write, against the REAL builder output.
 *
 * The frozen contract used to demand that the captured PATCH emit `requestfailed` with
 * `net::ERR_ABORTED`. MEASURED on the smoke's own Playwright/Chromium build: Chromium emits NO
 * `requestfailed` for a request cancelled by a full-document navigation - with or without a route
 * parked on it - while an explicit `AbortController.abort()` on an identically parked request DOES.
 * The postcondition was therefore unsatisfiable by construction on the sign-out path and burnt its
 * whole 540 000 ms budget before reporting one anonymous token.
 *
 * These cases pin the corrected shape from both sides. The positive case emits ONLY
 * `framenavigated` - precisely what real Chromium does - and requires the postcondition to settle.
 * The negatives keep it falsifiable: a genuinely delivered response must still fail the suite, and
 * a wrong-reason `requestfailed` must be REPORTED rather than thrown into the event emitter, which
 * is what made "wrong event arrived" indistinguishable from "no event arrived".
 */
export async function runBrowserNavigationDiscardSourceSelfTest({
  assertNegative,
  buildBrowserInvocation,
  compileActionExecutionSpec,
  plan,
  sourceCaptures,
}) {
  invariant(
    typeof assertNegative === "function" &&
      typeof buildBrowserInvocation === "function" &&
      typeof compileActionExecutionSpec === "function" &&
      plan !== null &&
      typeof plan === "object" &&
      sourceCaptures !== null &&
      typeof sourceCaptures === "object",
    "navigation discard self-test dependencies are absent"
  );
  const descriptor = expandedRoute(
    plan,
    ABORT_AWARE_ROUTE_KEY,
    sourceCaptures,
    SELF_TEST_RUNTIME_CONFIG
  );
  const canonicalLoginUrl =
    plan.fixtureBlueprint.origins.admin + plan.fixtureBlueprint.paths.login;
  invariant(
    descriptor.mode === "abort-aware-preference-write" &&
      descriptor.method === "PATCH" &&
      descriptor.loginUrl === canonicalLoginUrl &&
      canonicalLoginUrl === "http://coderso-a.localhost:5173/admin/login",
    "abort-aware discard descriptor drift"
  );

  // Case 1 - the real Chromium shape: the parked write is cancelled by a full-document navigation
  // and NO network event ever arrives. Only the main-frame commit is emitted.
  const navigated = await parkAbortAwareWrite(descriptor);
  navigated.fake.navigateMainFrameTo(canonicalLoginUrl);
  const discarded = await Promise.race([navigated.entry.clientDiscarded, boundedTick()]);
  invariant(
    discarded === true &&
      navigated.entry.responseDelivered() === false &&
      navigated.entry.listenerFailure() === null,
    "navigation-cancelled write did not settle the discard postcondition"
  );
  const navigatedRelease = await releaseOutcome(descriptor, navigated.fake);
  invariant(
    navigatedRelease.message === null &&
      navigatedRelease.value?.released === true &&
      navigatedRelease.value?.backingSettled === true &&
      navigatedRelease.value?.clientDiscarded === true &&
      navigatedRelease.value?.responseDelivered === false &&
      Object.keys(navigatedRelease.value).length === 4 &&
      navigatedRelease.firedBudgets.length === 1 &&
      navigatedRelease.firedBudgets[0] === NAVIGATION_DISCARD_TIMEOUT_MS,
    "abort-aware release receipt drift"
  );
  await navigated.parked;
  const unroute = new Script("(" + buildRouteUnrouteSource(descriptor) + ")", {
    filename: descriptor.key + ".discard-unroute.self-test.js",
  }).runInThisContext();
  invariant(
    (await unroute(navigated.fake.page)) === true &&
      navigated.fake.listenerCount("requestfinished") === 0 &&
      navigated.fake.listenerCount("requestfailed") === 0 &&
      navigated.fake.listenerCount("framenavigated") === 0,
    "abort-aware discard listener removal drift"
  );

  // Case 2 - a navigation to a NON-canonical URL must not settle anything. Without this, the
  // corrected postcondition would accept any commit at all.
  const offRoute = await parkAbortAwareWrite(descriptor);
  offRoute.fake.navigateMainFrameTo("http://coderso-a.localhost:5173/admin/other");
  assertNegative(
    (await Promise.race([offRoute.entry.clientDiscarded, boundedTick()])) === TICK_TOKEN &&
      offRoute.entry.listenerFailure() === null,
    "non-canonical navigation discard settlement"
  );

  // Case 3 - a genuinely DELIVERED response is the dangerous state the scenario forbids. The
  // navigation must not rescue it, and the release must name it instead of timing out anonymously.
  const delivered = await parkAbortAwareWrite(descriptor);
  delivered.fake.emit("requestfinished", delivered.captured.capturedRequest);
  delivered.fake.navigateMainFrameTo(canonicalLoginUrl);
  const deliveredRelease = await releaseOutcome(descriptor, delivered.fake);
  assertNegative(
    delivered.entry.responseDelivered() === true &&
      (await Promise.race([delivered.entry.clientDiscarded, boundedTick()])) === TICK_TOKEN &&
      deliveredRelease.value === null &&
      deliveredRelease.message === "wf540_discard_response_delivered",
    "delivered old-client response discard rejection"
  );

  // Case 4 - a wrong-reason `requestfailed` must be RECORDED, never thrown into the emitter. The
  // fake re-throws whatever escapes, so an escape fails this case rather than hiding.
  const wrongReason = await parkAbortAwareWrite(descriptor);
  wrongReason.captured.setFailure({ errorText: "net::ERR_CONNECTION_RESET" });
  wrongReason.fake.emit("requestfailed", wrongReason.captured.capturedRequest);
  assertNegative(
    wrongReason.entry.listenerFailure() === "wf540_abort_reason" &&
      (await Promise.race([wrongReason.entry.clientDiscarded, boundedTick()])) === TICK_TOKEN,
    "wrong-reason request failure recorded instead of thrown"
  );
  const wrongReasonRelease = await releaseOutcome(descriptor, wrongReason.fake);
  invariant(
    wrongReasonRelease.value === null && wrongReasonRelease.message === "wf540_abort_reason",
    "recorded listener failure did not reach the release receipt"
  );

  // Case 5 - an unrelated Request must change nothing at all.
  const foreign = await parkAbortAwareWrite(descriptor);
  foreign.fake.emit(
    "requestfailed",
    Object.freeze({
      url: () => "http://coderso-a.localhost:5173/admin/api/other",
      method: () => "GET",
      failure: () => ({ errorText: "net::ERR_ABORTED" }),
    })
  );
  assertNegative(
    foreign.entry.listenerFailure() === null &&
      foreign.entry.responseDelivered() === false &&
      (await Promise.race([foreign.entry.clientDiscarded, boundedTick()])) === TICK_TOKEN,
    "foreign request failure ignored by the discard listeners"
  );

  // The observation that reads this postcondition must carry the SAME bounded, self-naming wait as
  // the release, otherwise ru-090a could still stall for nine minutes on a token that says nothing.
  const observationAction = plan.actionManifest.find(
    ({ id }) => id === DISCARD_OBSERVATION_ACTION_ID
  );
  invariant(
    observationAction?.builder === "observe(signout-settled-user-a-with-abort)",
    "discard observation action drift"
  );
  const observationSource = buildBrowserInvocation(
    observationAction,
    compileActionExecutionSpec(observationAction),
    sourceCaptures,
    "/task540-self-test-root",
    "/task540-self-test-root/private",
    plan,
    {
      plan,
      captures: sourceCaptures,
      priorOutputs: new Map(),
      variables: new Map(),
      currentOutput: null,
      root: "/task540-self-test-root",
      actionId: observationAction.id,
    },
    {
      csrfHeaderName: SELF_TEST_RUNTIME_CONFIG.csrfHeaderName,
      authRatePolicy: { enabled: true, maxRequests: 10, windowSeconds: 60 },
    }
  ).args[3];
  invariant(
    typeof observationSource === "string" &&
      observationSource.includes("route.clientDiscarded") &&
      observationSource.includes(
        "page.waitForTimeout(" + NAVIGATION_DISCARD_TIMEOUT_MS + ").then(() => { throw new Error("
      ) &&
      observationSource.includes('route.responseDelivered() ? "wf540_discard_response_delivered"') &&
      observationSource.includes('"wf540_discard_timeout"') &&
      observationSource.includes("output = await loginSample(discarded === true);") &&
      !observationSource.includes("clientAborted") &&
      !observationSource.includes("wf540_abort_timeout") &&
      !observationSource.includes("page.waitForTimeout(540000)"),
    "discard observation source drift"
  );
}
