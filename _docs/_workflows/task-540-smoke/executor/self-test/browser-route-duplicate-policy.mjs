import { Script } from "node:vm";

import { invariant } from "../foundation.mjs";
import {
  POST_PARK_DUPLICATE_ROUTE_KEY,
  buildRouteSetupSource,
  buildRouteUnrouteSource,
  expandedRoute,
  expectedPostParkDuplicatesForRouteKey,
} from "../../browser/route-and-action-sources.mjs";

// A sibling delayed route that is parked the same way but whose lifetime spans no projection
// mutation, so it must keep byte-identical strict behaviour. Picking a real registered key rather
// than a synthetic one is the point: it proves the policy is scoped, not global.
const STRICT_ROUTE_KEY = "preference-a-read-refresh";
const SELF_TEST_RUNTIME_CONFIG = Object.freeze({ csrfHeaderName: "x-self-test-csrf" });
// The exact token the handler must emit for a rejected duplicate. It carries BOTH halves of the
// fix: the duplicate detector still fires, and the catch reports the inner cause instead of
// renaming it after a stage variable that was never advanced past its initialiser.
const DUPLICATE_FAILURE_TOKEN = "wf540_route_handler_request_identity_unexpected_duplicate";
const PREFERENCE_SETTING_KEY = "customScreens.entry.preferences";
const FIXTURE_TIMESTAMP = "2026-07-18T00:00:00.000Z";

function createFakeRoutePage() {
  const routes = new Map();
  const installed = [];
  const unrouted = [];
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
    route: async (pattern, handler) => {
      installed.push({ pattern, handler });
    },
    unroute: async (pattern, handler) => {
      unrouted.push({ pattern, handler });
    },
    unrouteAll: async () => undefined,
    on: () => undefined,
    off: () => undefined,
    evaluate: async () => undefined,
  });
  return { page, installed, unrouted };
}

function createFakeBackingResponse(payload) {
  return Object.freeze({
    status: () => 200,
    headers: () => ({ "content-type": "application/json" }),
    json: async () => payload,
  });
}

// `backingResponse === null` leaves the backing fetch outstanding forever, which is the window a
// mirrored cacheBus double delivery lands in: both GETs are dispatched before the first one's
// response returns from the slow test database.
function createFakeRoute(descriptor, backingResponse) {
  const calls = { continued: 0, fulfilled: 0, fetched: 0 };
  const request = Object.freeze({
    url: () => "http://coderso-a.localhost:5173" + descriptor.pathname,
    method: () => descriptor.method,
    postData: () => null,
    headers: () => ({ "content-type": "application/json" }),
    failure: () => null,
  });
  return {
    calls,
    request: () => request,
    continue: async () => {
      calls.continued += 1;
    },
    fulfill: async () => {
      calls.fulfilled += 1;
    },
    fetch: async () => {
      calls.fetched += 1;
      if (backingResponse === null) return await new Promise(() => undefined);
      return backingResponse;
    },
  };
}

function relatedBackingPayload(descriptor) {
  return descriptor.expectedRows.map((row, index) => ({
    id: row.id,
    typeId: row.typeId,
    title: row.title,
    slug: "wf540-related-" + (index + 1),
    status: "published",
    visibility: "public",
    hasPassword: false,
    data: { label: row.title },
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  }));
}

function backingPayloadForRoute(descriptor) {
  return descriptor.key === POST_PARK_DUPLICATE_ROUTE_KEY
    ? relatedBackingPayload(descriptor)
    : { key: PREFERENCE_SETTING_KEY, value: { version: 1, showFieldMetadata: true } };
}

async function installRouteHandler(descriptor) {
  const fake = createFakeRoutePage();
  const setup = new Script("(" + buildRouteSetupSource(descriptor) + ")", {
    filename: descriptor.key + ".route-setup.self-test.js",
  }).runInThisContext();
  const summary = await setup(fake.page);
  invariant(
    fake.installed.length === 1 &&
      summary.key === descriptor.key &&
      summary.pattern === descriptor.pattern,
    descriptor.key + " route setup round-trip drift"
  );
  const entry = fake.page.context().__wf540RouteGet(descriptor.key);
  return { ...fake, entry, handler: fake.installed[0].handler };
}

// Drives the handler to the state it occupies for most of the route's life: one matching request
// captured, validated and suspended on the release gate. Deliberately not awaited - awaiting it
// would hang, because that is precisely what parked means.
async function parkFirstMatchingRequest(descriptor, installation) {
  const first = createFakeRoute(descriptor, createFakeBackingResponse(backingPayloadForRoute(descriptor)));
  const parked = installation.handler(first).catch(() => null);
  await installation.entry.captured;
  invariant(
    installation.entry.hits() === 1 &&
      installation.entry.postCaptureHits() === 0 &&
      installation.entry.failure() === null &&
      first.calls.fetched === 1 &&
      first.calls.fulfilled === 0,
    descriptor.key + " parked first request drift"
  );
  return { first, parked };
}

async function handlerRejectionMessage(handler, route) {
  try {
    await handler(route);
    return null;
  } catch (error) {
    return String(error?.message ?? "");
  }
}

async function unrouteOutcome(descriptor, page) {
  const unroute = new Script("(" + buildRouteUnrouteSource(descriptor) + ")", {
    filename: descriptor.key + ".unroute.self-test.js",
  }).runInThisContext();
  try {
    return { value: await unroute(page), message: null };
  } catch (error) {
    return { value: null, message: String(error?.message ?? "") };
  }
}

/**
 * Behavioural round-trip against the REAL builder output for the route duplicate policy.
 *
 * The whole-lifetime "exactly one matching request" guard was unsatisfiable for one route: the
 * frozen manifest holds `related-a-refresh` from rc-018 to rc-036 and clears a relation option at
 * rc-025, and the application is required by tests/vitest/ui/use-screen-related-entries.test.tsx to
 * answer that with a second force-inheriting, dedupe-bypassing read. These cases pin the narrowed
 * policy from both sides: the cacheBus double-delivery detector still fires before the first
 * request is parked and still fires for every other route, and the duplicate that IS expected is
 * now counted and asserted rather than merely tolerated.
 */
export async function runBrowserRouteDuplicatePolicySelfTest({ assertNegative, plan, sourceCaptures }) {
  invariant(
    typeof assertNegative === "function" &&
      plan !== null &&
      typeof plan === "object" &&
      sourceCaptures !== null &&
      typeof sourceCaptures === "object",
    "route duplicate policy self-test dependencies are absent"
  );
  const permissiveKeys = Object.keys(plan.registries.routes).filter(
    (key) => expectedPostParkDuplicatesForRouteKey(key) !== 0
  );
  invariant(
    permissiveKeys.length === 1 &&
      permissiveKeys[0] === POST_PARK_DUPLICATE_ROUTE_KEY &&
      expectedPostParkDuplicatesForRouteKey(POST_PARK_DUPLICATE_ROUTE_KEY) === 1 &&
      expectedPostParkDuplicatesForRouteKey(STRICT_ROUTE_KEY) === 0,
    "post-park duplicate policy scope drift"
  );
  const relatedDescriptor = expandedRoute(
    plan,
    POST_PARK_DUPLICATE_ROUTE_KEY,
    sourceCaptures,
    SELF_TEST_RUNTIME_CONFIG
  );
  const strictDescriptor = expandedRoute(
    plan,
    STRICT_ROUTE_KEY,
    sourceCaptures,
    SELF_TEST_RUNTIME_CONFIG
  );

  // Case 1 - duplicate BEFORE the first request is parked, on the permissive route. This is the
  // mirrored cacheBus delivery the design doc forbids relaxing, and it must still fail closed even
  // where post-park duplicates are allowed.
  const preParkInstallation = await installRouteHandler(relatedDescriptor);
  const preParkFirst = createFakeRoute(relatedDescriptor, null);
  preParkInstallation.handler(preParkFirst).catch(() => null);
  invariant(
    preParkInstallation.entry.hits() === 1 && preParkFirst.calls.fetched === 1,
    "pre-park first request did not reach the backing fetch"
  );
  const preParkDuplicate = createFakeRoute(relatedDescriptor, null);
  const preParkMessage = await handlerRejectionMessage(
    preParkInstallation.handler,
    preParkDuplicate
  );
  assertNegative(
    preParkMessage === DUPLICATE_FAILURE_TOKEN &&
      preParkInstallation.entry.failure() === DUPLICATE_FAILURE_TOKEN &&
      preParkInstallation.entry.postCaptureHits() === 0 &&
      preParkDuplicate.calls.continued === 0,
    "pre-park duplicate request rejection"
  );

  // Case 2 - duplicate AFTER the first request is parked, on the permissive route: passed through
  // to the real server so the superseding read gets authoritative data, counted, and the parked
  // request left parked so rc-035's stale-response ordering is preserved.
  const postParkInstallation = await installRouteHandler(relatedDescriptor);
  await parkFirstMatchingRequest(relatedDescriptor, postParkInstallation);
  const postParkDuplicate = createFakeRoute(relatedDescriptor, null);
  const postParkMessage = await handlerRejectionMessage(
    postParkInstallation.handler,
    postParkDuplicate
  );
  invariant(
    postParkMessage === null &&
      postParkDuplicate.calls.continued === 1 &&
      postParkDuplicate.calls.fulfilled === 0 &&
      postParkDuplicate.calls.fetched === 0 &&
      postParkInstallation.entry.hits() === 2 &&
      postParkInstallation.entry.postCaptureHits() === 1 &&
      postParkInstallation.entry.failure() === null,
    "post-park duplicate pass-through drift"
  );

  // Case 3 - duplicate AFTER park on a route whose lifetime spans no projection mutation. The
  // relaxation must not generalise: a second request there is still a real defect.
  const strictInstallation = await installRouteHandler(strictDescriptor);
  await parkFirstMatchingRequest(strictDescriptor, strictInstallation);
  const strictDuplicate = createFakeRoute(strictDescriptor, null);
  const strictMessage = await handlerRejectionMessage(strictInstallation.handler, strictDuplicate);
  assertNegative(
    strictMessage === DUPLICATE_FAILURE_TOKEN &&
      strictInstallation.entry.failure() === DUPLICATE_FAILURE_TOKEN &&
      strictInstallation.entry.postCaptureHits() === 0 &&
      strictDuplicate.calls.continued === 0,
    "post-park duplicate rejection outside the permissive route"
  );

  // Case 4 - the replacement invariant. Unroute is where the relaxed guard is paid back: the
  // expected post-park duplicate count is asserted exactly, and the observed count is inside the
  // failure token so a single run names the real number.
  const satisfiedUnroute = await unrouteOutcome(relatedDescriptor, postParkInstallation.page);
  invariant(
    satisfiedUnroute.value === true &&
      satisfiedUnroute.message === null &&
      postParkInstallation.unrouted.length === 1 &&
      postParkInstallation.unrouted[0].pattern === relatedDescriptor.pattern,
    "unroute post-park duplicate expectation drift"
  );
  const missingDuplicateInstallation = await installRouteHandler(relatedDescriptor);
  await parkFirstMatchingRequest(relatedDescriptor, missingDuplicateInstallation);
  const missingDuplicateUnroute = await unrouteOutcome(
    relatedDescriptor,
    missingDuplicateInstallation.page
  );
  assertNegative(
    missingDuplicateUnroute.value === null &&
      missingDuplicateUnroute.message === "wf540_route_post_capture_duplicates_0" &&
      missingDuplicateInstallation.unrouted.length === 0,
    "absent post-park duplicate unroute rejection"
  );
  const strictUnroute = await unrouteOutcome(strictDescriptor, strictInstallation.page);
  invariant(
    strictUnroute.value === true &&
      strictUnroute.message === null &&
      strictInstallation.unrouted.length === 1,
    "strict route unroute expectation drift"
  );
}
