import { deepFreezeExact, invariant } from "../executor/foundation.mjs";
import { registeredSelector, resolveExactRef } from "../executor/ref-dsl.mjs";
import {
  buildDataBearingRunCodeInvocation,
  playwrightArgs,
  runCode,
} from "./run-code.mjs";
import { buildSimpleBrowserInvocation as buildSimpleBrowserInvocationCore } from "./simple-invocations.mjs";
import {
  buildBlockBaselineSource,
  buildCaptureNewSource,
  buildLogReadSource,
  buildLoggerInstallSource,
  buildSelectionHandleSource,
  resolveBuilderExpression,
} from "./expression-and-capture-sources.mjs";
import {
  buildCleanupRoutesSource,
  buildRouteHitSource,
  buildRouteReleaseSource,
  buildRouteSetupSource,
  buildRouteUnrouteSource,
  expandedRoute,
} from "./route-and-action-sources.mjs";
import { buildObservationSource } from "./observation-sources.mjs";
import { buildVisibleAssertionSource } from "./visible-assertion-sources.mjs";

export function createSharedBrowserInvocationRuntime({ normalizeAuthRatePolicy }) {
  function buildSimpleBrowserInvocation(
    action,
    executionSpec,
    plan,
    captures,
    root,
    browserCwd,
    refContext
  ) {
    return buildSimpleBrowserInvocationCore(
      { buildDataBearingRunCodeInvocation, playwrightArgs, runCode },
      action,
      executionSpec,
      plan,
      captures,
      root,
      browserCwd,
      refContext
    );
  }

  function buildAuthRateWindowBarrierSource(policy, plan) {
    const waitMs = policy.enabled ? policy.windowSeconds * 1000 + 1000 : 0;
    const authOrigin = JSON.stringify(plan.fixtureBlueprint.origins.admin);
    return `async (page) => {
    const context = page.context();
    const parseHttpUrl = (value) => {
      if (typeof value !== "string" || value.length === 0 || /[\\u0000-\\u0020\\u007f\\\\]/u.test(value)) return null;
      const schemeEnd = value.indexOf("://");
      if (schemeEnd <= 0) return null;
      const scheme = value.slice(0, schemeEnd);
      if (scheme !== "http" && scheme !== "https") return null;
      const authorityStart = schemeEnd + 3;
      let boundary = value.length;
      for (const delimiter of ["/", "?", "#"]) {
        const index = value.indexOf(delimiter, authorityStart);
        if (index !== -1 && index < boundary) boundary = index;
      }
      const authority = value.slice(authorityStart, boundary);
      if (authority.length === 0 || authority.includes("@") || authority.includes("[")) return null;
      const firstColon = authority.indexOf(":");
      if (firstColon !== authority.lastIndexOf(":")) return null;
      const host = firstColon === -1 ? authority : authority.slice(0, firstColon);
      const portText = firstColon === -1 ? null : authority.slice(firstColon + 1);
      if (host.length === 0 || host.length > 253 || host !== host.toLowerCase()) return null;
      if (portText !== null) {
        if (!/^(?:0|[1-9][0-9]{0,4})$/u.test(portText)) return null;
        const port = Number(portText);
        if (!Number.isSafeInteger(port) || port > 65535) return null;
      }
      const numericHost = /^[0-9.]+$/u.test(host);
      if (numericHost) {
        const octets = host.split(".");
        if (octets.length !== 4 || octets.some((part) => !/^(?:0|[1-9][0-9]{0,2})$/u.test(part) || Number(part) > 255)) return null;
      } else {
        const labels = host.split(".");
        if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))) return null;
      }
      const origin = value.slice(0, boundary);
      let pathname = "/";
      if (value[boundary] === "/") {
        let pathnameEnd = value.length;
        for (const delimiter of ["?", "#"]) {
          const index = value.indexOf(delimiter, boundary);
          if (index !== -1 && index < pathnameEnd) pathnameEnd = index;
        }
        pathname = value.slice(boundary, pathnameEnd);
      }
      return pathname.startsWith("/") ? { origin, pathname } : null;
    };
    const sample = async () => {
      const root = page.locator("html");
      if (await root.count() !== 1 || !(await root.isVisible())) throw new Error("wf540_barrier_root");
      const rect = await root.boundingBox();
      if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y) || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) throw new Error("wf540_barrier_geometry");
      const rawUrl = page.url();
      const parsedUrl = parseHttpUrl(rawUrl);
      if (parsedUrl === null || parsedUrl.origin !== ${authOrigin} || !parsedUrl.pathname.startsWith("/admin/")) throw new Error("wf540_barrier_url");
      const navigationCount = page.__wf540ReadNavigationCount();
      if (!Number.isSafeInteger(navigationCount) || navigationCount < 0) throw new Error("wf540_barrier_navigation_count");
      return { url: rawUrl, navigationCount };
    };
    const before = await sample();
    let authRequests = 0;
    let invalidRequestUrl = false;
    const onRequest = (request) => {
      const parsedUrl = parseHttpUrl(request.url());
      if (parsedUrl === null) invalidRequestUrl = true;
      else if (parsedUrl.origin === ${authOrigin} && parsedUrl.pathname.startsWith("/admin/api/auth/")) authRequests += 1;
    };
    context.on("request", onRequest);
    try {
      if (${waitMs} > 0) await page.waitForTimeout(${waitMs});
      const after = await sample();
      if (invalidRequestUrl || authRequests !== 0 || before.url !== after.url || before.navigationCount !== after.navigationCount) throw new Error("wf540_barrier_realm_drift");
    } finally {
      context.off("request", onRequest);
    }
    return { barrierSatisfied: true };
  }`;
  }

  function buildAdvancedBrowserInvocation(
    action,
    executionSpec,
    plan,
    captures,
    root,
    refContext,
    runtimeConfig
  ) {
    const parsed = executionSpec.builderAst;
    const resolve = (argument) => resolveBuilderExpression(argument, plan, captures);
    if (action.kind === "logger-install") {
      invariant(parsed.args.length === 0, "logger-install arity");
      return { args: runCode(buildLoggerInstallSource(plan)), displayArgs: null };
    }
    if (action.kind === "blocksBefore") {
      invariant(parsed.args.length === 1, "blocksBefore arity");
      return {
        args: runCode(
          buildBlockBaselineSource(
            action,
            registeredSelector(plan, "canvas"),
            registeredSelector(plan, "insertPanel"),
            registeredSelector(plan, "blockLibrary")
          )
        ),
        displayArgs: null,
      };
    }
    if (action.kind === "captureNew") {
      invariant(parsed.args.length === 3, "captureNew arity");
      return {
        args: runCode(buildCaptureNewSource(action, executionSpec, plan, captures)),
        displayArgs: null,
      };
    }
    if (action.kind === "route") {
      invariant(parsed.args.length === 2, "route arity");
      const route = expandedRoute(plan, parsed.args[0], captures, runtimeConfig);
      const operation = parsed.args[1];
      const source =
        operation === "route-setup"
          ? buildRouteSetupSource(route)
          : operation === "route-hit-read"
            ? buildRouteHitSource(route)
            : operation === "route-release"
              ? buildRouteReleaseSource(route)
              : operation === "unroute"
                ? buildRouteUnrouteSource(route)
                : null;
      invariant(source !== null, "route operation is not implemented");
      return { args: runCode(source), displayArgs: null };
    }
    if (action.kind === "logs") {
      invariant(parsed.args.length === 2, "logs arity");
      return { args: runCode(buildLogReadSource()), displayArgs: null };
    }
    if (
      action.kind === "media-count-before-release" ||
      action.kind === "media-count-after-release"
    ) {
      invariant(parsed.args.length === 0, "media count arity");
      return {
        args: runCode("(page) => page.context().__wf540ReadMediaGetCount()"),
        displayArgs: null,
      };
    }
    if (action.kind === "dispatchAndCaptureSelectionHandle") {
      invariant(parsed.args.length === 1, "selection-handle arity");
      return {
        args: runCode(buildSelectionHandleSource(resolve(parsed.args[0]))),
        displayArgs: null,
      };
    }
    if (action.kind === "observe") {
      const selectsBaseline = action.id === "ss-011-selection-before";
      invariant(parsed.args.length === (selectsBaseline ? 2 : 1), "observe arity");
      const selectionSelector = selectsBaseline
        ? resolveExactRef(executionSpec.refs[1], refContext, action.id + " selection Ref")
        : null;
      const source = buildObservationSource(
        action,
        parsed.args[0],
        plan,
        captures,
        selectionSelector
      );
      return {
        args: runCode(source),
        displayArgs: null,
      };
    }
    if (action.kind === "assert") {
      invariant(parsed.args.length === 1, "assert arity");
      return {
        args: runCode(buildVisibleAssertionSource(action, parsed.args[0], plan, captures)),
        displayArgs: null,
      };
    }
    if (action.kind === "authRateWindowBarrier") {
      invariant(parsed.args.length === 0, "auth rate barrier arity");
      const policy = normalizeAuthRatePolicy(
        runtimeConfig.authRatePolicy,
        plan.requiredAuthRatePlan
      );
      return {
        args: runCode(buildAuthRateWindowBarrierSource(policy, plan)),
        displayArgs: null,
      };
    }
    if (action.kind === "cleanup-release-unroute") {
      return { args: runCode(buildCleanupRoutesSource(plan)), displayArgs: null };
    }
    if (action.kind === "cleanup-route-list") {
      return { args: playwrightArgs("route-list"), displayArgs: null };
    }
    if (
      action.kind === "cleanup-console-errors" ||
      action.kind === "cleanup-console-warnings" ||
      action.kind === "cleanup-page-errors"
    ) {
      return { args: runCode(buildLogReadSource()), displayArgs: null };
    }
    if (action.kind === "cleanup-close") {
      return { args: playwrightArgs("close"), displayArgs: null };
    }
    if (action.kind === "cleanup-session-absence") {
      return { args: ["--raw", "list"], displayArgs: null };
    }
    return null;
  }

  return deepFreezeExact({
    buildSimpleBrowserInvocation,
    buildAuthRateWindowBarrierSource,
    buildAdvancedBrowserInvocation,
  });
}
