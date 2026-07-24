import {
  ALLOWED_SECRET_NAMES,
  EXPECTED_AUTH_CHALLENGE_PHASES,
  EXPECTED_AUTH_CHALLENGE_TEXT,
} from "../executor/config.mjs";
import { createExpectedAuthChallengeAuthority } from "../executor/auth-challenge-authority.mjs";
import { deepFreezeExact, exactOwnKeys, invariant } from "../executor/foundation.mjs";
import { assertDenseJsonArray, freezeJsonTreeExact } from "../executor/json-schema.mjs";
import {
  expandRegisteredPath,
  registeredSelector,
  renderSelectorTemplate,
} from "../executor/ref-dsl.mjs";

function parseBuilder(builder) {
  invariant(typeof builder === "string" && builder.length > 0, "builder must be non-empty");
  const open = builder.indexOf("(");
  if (open === -1) return deepFreezeExact({ callee: builder, args: [] });
  invariant(builder.endsWith(")"), "builder call must close");
  const callee = builder.slice(0, open);
  const body = builder.slice(open + 1, -1);
  const args = [];
  let quote = null;
  let escaped = false;
  let depth = 0;
  let start = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    else if (character === ")") {
      invariant(depth > 0, "builder has an unmatched close parenthesis");
      depth -= 1;
    } else if (character === "," && depth === 0) {
      args.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  invariant(quote === null && depth === 0, "builder has an unterminated expression");
  if (body.trim().length > 0) args.push(body.slice(start).trim());
  invariant(
    args.every((argument) => argument.length > 0),
    "builder has an empty argument"
  );
  return deepFreezeExact({ callee, args });
}

function resolveLiteral(expression) {
  if (expression.startsWith('"') && expression.endsWith('"')) return JSON.parse(expression);
  if (/^-?\d+$/.test(expression)) return Number(expression);
  return expression;
}

function expandPathTemplate(pathDescriptor, captures) {
  if (typeof pathDescriptor === "string") {
    invariant(!/[{}]/u.test(pathDescriptor), "path template has unresolved markers");
    return pathDescriptor;
  }
  exactOwnKeys(pathDescriptor, ["template", "captures"], "path template");
  invariant(typeof pathDescriptor.template === "string", "path template invalid");
  assertDenseJsonArray(pathDescriptor.captures, "path template captures");
  invariant(
    new Set(pathDescriptor.captures).size === pathDescriptor.captures.length,
    "path template captures repeat"
  );
  let expanded = pathDescriptor.template;
  for (const captureName of pathDescriptor.captures) {
    invariant(
      typeof captureName === "string" && captureName.length > 0,
      "path capture name invalid"
    );
    const marker = "{" + captureName + "}";
    invariant(expanded.split(marker).length === 2, "path capture marker drift");
    expanded = expanded.replace(marker, encodeURIComponent(captures.get(captureName)));
  }
  invariant(!/[{}]/u.test(expanded), "path template has unresolved markers");
  return expanded;
}

function resolveBuilderExpression(expression, plan, captures) {
  const literal = resolveLiteral(expression);
  if (literal !== expression || typeof literal === "number") return literal;
  if (expression.startsWith("$")) {
    invariant(
      ["$ADMIN_EMAIL", "$ADMIN_PASSWORD", "$WF540_USER_A_EMAIL", "$WF540_USER_B_EMAIL"].includes(
        expression
      ),
      "credential reference is not allowlisted"
    );
    const key = expression.slice(1);
    if (key === "WF540_USER_A_EMAIL") return plan.fixtureBlueprint.users.a.email;
    if (key === "WF540_USER_B_EMAIL") return plan.fixtureBlueprint.users.b.email;
    invariant(ALLOWED_SECRET_NAMES.has(key), "secret reference is not allowlisted");
    return key;
  }
  if (expression.startsWith("paths.")) {
    const key = expression.slice("paths.".length);
    return expandRegisteredPath(plan, key, captures);
  }
  if (expression === "about:blank") return expression;
  if (expression.startsWith("S.")) {
    const selectorExpression = expression.slice(2);
    const parsed = parseBuilder(selectorExpression);
    const selector = plan.registries.selectors[parsed.callee];
    invariant(selector !== undefined, "selector is not registered: " + parsed.callee);
    const args = parsed.args.map((argument) => resolveBuilderExpression(argument, plan, captures));
    return renderSelectorTemplate(selector, args, parsed.callee);
  }
  if (expression.startsWith("screen.blockIds.")) {
    const key = expression.slice("screen.blockIds.".length);
    invariant(Object.hasOwn(plan.fixtureBlueprint.screen.blockIds, key), "unknown Screen block ID");
    return plan.fixtureBlueprint.screen.blockIds[key];
  }
  if (expression.startsWith("palette.")) {
    const aliases = {
      button: "palette.button",
      image: "palette.image",
      mediaField: "palette.media-field",
      outerTabs: "palette.outer-tabs",
      tabOneText: "palette.tab-one-text",
      tabTwoText: "palette.tab-two-text",
      tabThreeText: "palette.tab-three-text",
      innerTabs: "palette.inner-tabs",
      dirtyText: "palette.dirty-text",
    };
    const captureName = aliases[expression.slice("palette.".length)];
    invariant(captureName, "unknown runtime block capture");
    return captures.get(captureName);
  }
  if (expression === "screen.id") return captures.get("screen.id");
  if (expression === "entry.id") return captures.get("entry.id");
  if (expression === "media.title") return plan.fixtureBlueprint.media.title;
  if (expression === "users.a.displayName") return plan.fixtureBlueprint.users.a.displayName;
  if (expression === "users.b.displayName") return plan.fixtureBlueprint.users.b.displayName;
  return expression;
}

function buildLoggerInstallSource(plan) {
  const userAgent = JSON.stringify(plan.fixtureBlueprint.userAgents.browser);
  const preferencePath = "/admin/api/user-settings/customScreens.entry.preferences";
  const authChallengeOptions = {
    expectedUrl: plan.fixtureBlueprint.origins.admin + "/admin/api/auth/me",
    loginUrl: plan.fixtureBlueprint.origins.admin + plan.fixtureBlueprint.paths.login,
    expectedText: EXPECTED_AUTH_CHALLENGE_TEXT,
    expectedPageId: "wf540-page-1",
    phases: EXPECTED_AUTH_CHALLENGE_PHASES,
    maxFailureEvents: 128,
    maxAuthEvents: 64,
  };
  const relatedListPaths = [
    plan.fixtureBlueprint.contentTypes.relatedA.slug,
    plan.fixtureBlueprint.contentTypes.relatedB.slug,
    plan.fixtureBlueprint.contentTypes.relatedFailure.slug,
  ].map((slug) => "/admin/api/content/" + slug + "/entries");
  return `(async (page) => {
    const context = page.context();
    const ownedKeys = [
      "__wf540ReadLogProjection", "__wf540ReadAggregateChannels", "__wf540ReadAllPageChannels",
      "__wf540ReadMediaGetCount", "__wf540ReadPreferenceWrites",
      "__wf540ReadPreferenceReads", "__wf540ReadRelatedListGetCounts",
      "__wf540ReadRelatedEntryWrites", "__wf540ArmExpectedAuthChallenge",
      "__wf540CloseExpectedAuthChallenge",
      "__wf540BindActiveUser", "__wf540Remember",
      "__wf540Recall", "__wf540RouteHas", "__wf540RouteSet",
      "__wf540RouteGet", "__wf540RouteDeactivate", "__wf540ActiveRouteKeys"
    ];
    if (ownedKeys.some((key) => Object.prototype.hasOwnProperty.call(context, key))) {
      throw new Error("wf540_duplicate_instrumentation");
    }
    await context.clearCookies();
    await context.setExtraHTTPHeaders({ "user-agent": ${userAgent} });
    const createExpectedAuthChallengeAuthority = ${createExpectedAuthChallengeAuthority.toString()};
    const authAuthority = createExpectedAuthChallengeAuthority(${JSON.stringify(authChallengeOptions)});
    const pageRecords = [];
    const samples = new Map();
    const routes = new Map();
    const activeUserIds = new Map();
    const preferenceWrites = [];
    const preferenceReads = [];
    const relatedEntryWrites = [];
    const relatedListGetCounts = Object.create(null);
    const preferencePath = ${JSON.stringify(preferencePath)};
    const relatedListPaths = Object.freeze(${JSON.stringify(relatedListPaths)});
    for (const pathname of relatedListPaths) relatedListGetCounts[pathname] = 0;
    const MAX_SAFE_REQUESTS = 64;
    let nextPageNumber = 1;
    let nextPreferenceReadSequence = 1;
    let nextPreferenceWriteSequence = 1;
    const freezeTree = ${freezeJsonTreeExact.toString()};
    const frozenCopy = (value) => freezeTree(JSON.parse(JSON.stringify(value)));
    const exactKeys = (value, keys) => Boolean(
      value && typeof value === "object" && !Array.isArray(value) &&
      Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    );
    const parsePreference = (value) => {
      if (!exactKeys(value, ["key", "value"]) || value.key !== "customScreens.entry.preferences") throw new Error("wf540_preference_response_shape");
      if (!exactKeys(value.value, ["version", "showFieldMetadata"]) || value.value.version !== 1 || typeof value.value.showFieldMetadata !== "boolean") throw new Error("wf540_preference_value_shape");
      return Object.freeze({ version: 1, showFieldMetadata: value.value.showFieldMetadata });
    };
    const appendBounded = (rows, value, label) => {
      if (rows.length >= MAX_SAFE_REQUESTS) throw new Error("wf540_" + label + "_overflow");
      rows.push(Object.freeze(value));
    };
    const copyRows = (rows) => Object.freeze(rows.map(frozenCopy));
    const logProjection = () => authAuthority.reconcile(pageRecords.map((record) => ({
      pageId: record.pageId,
      tabIndex: record.tabIndex,
      mediaGetCount: record.mediaGetCount,
    })));
    const remember = (key, value) => {
      if (typeof key !== "string" || !key || samples.has(key)) throw new Error("wf540_sample_assignment");
      samples.set(key, frozenCopy(value));
      return true;
    };
    const recall = (key) => {
      if (!samples.has(key)) throw new Error("wf540_sample_missing");
      return frozenCopy(samples.get(key));
    };
    const preferenceWriteSnapshots = () => copyRows(preferenceWrites);
    const preferenceReadSnapshots = () => copyRows(preferenceReads);
    const relatedEntryWriteSnapshots = () => copyRows(relatedEntryWrites);
    const relatedListCountSnapshot = () => Object.freeze(Object.fromEntries(
      relatedListPaths.map((pathname) => [pathname, relatedListGetCounts[pathname]])
    ));
    const instrumentPage = (candidate) => {
      if (Object.prototype.hasOwnProperty.call(candidate, "__wf540PageIdentity")) {
        return candidate.__wf540PageIdentity;
      }
      const pageNumber = nextPageNumber++;
      const record = {
        pageId: "wf540-page-" + pageNumber,
        tabIndex: pageNumber - 1,
        mediaGetCount: 0,
        navigationCount: 0,
      };
      pageRecords.push(record);
      const identity = Object.freeze({ pageId: record.pageId, tabIndex: record.tabIndex });
      Object.defineProperties(candidate, {
        __wf540PageIdentity: { value: identity, writable: false, configurable: false },
        __wf540ReadMediaGetCount: { value: () => pageRecords.reduce((total, item) => total + item.mediaGetCount, 0), writable: false, configurable: false },
        __wf540ReadNavigationCount: { value: () => record.navigationCount, writable: false, configurable: false },
      });
      candidate.on("console", (message) => {
        if (message.type() !== "error" && message.type() !== "warning") return;
        const location = message.location();
        authAuthority.recordConsole({
          pageId: record.pageId,
          navigationEpoch: record.navigationCount,
          type: message.type(),
          text: message.text(),
          locationUrl: typeof location?.url === "string" ? location.url : "",
        });
      });
      candidate.on("pageerror", (error) => {
        authAuthority.recordPageError({
          pageId: record.pageId,
          navigationEpoch: record.navigationCount,
          text: error.message,
        });
      });
      candidate.on("framenavigated", (frame) => {
        if (frame === candidate.mainFrame()) record.navigationCount += 1;
      });
      candidate.on("request", (request) => {
        const requestUrl = request.url();
        const scheme = requestUrl.indexOf("://");
        const pathStart = requestUrl.indexOf("/", scheme === -1 ? 0 : scheme + 3);
        const pathname = (pathStart === -1 ? "/" : requestUrl.slice(pathStart)).split("?", 1)[0].split("#", 1)[0];
        if (request.method() === "GET" && pathname === "/admin/api/media") {
          record.mediaGetCount += 1;
        }
        if (request.method() === "GET" && Object.prototype.hasOwnProperty.call(relatedListGetCounts, pathname)) {
          relatedListGetCounts[pathname] += 1;
        }
        if (pathname === preferencePath && (request.method() === "GET" || request.method() === "PATCH")) {
          const method = request.method();
          request.response().then(async (response) => {
            if (!response) throw new Error("wf540_preference_response_missing");
            const value = parsePreference(await response.json());
            const sequence = method === "GET" ? nextPreferenceReadSequence++ : nextPreferenceWriteSequence++;
            const base = {
              pageId: record.pageId,
              sequence,
              status: response.status(),
              keyMatches: true,
              value,
            };
            if (method === "GET") {
              appendBounded(preferenceReads, base, "preference_reads");
              return;
            }
            const activeUserId = activeUserIds.get(record.pageId) ?? null;
            const expectedUserId = request.headers()["x-coderso-expected-user-id"] ?? null;
            appendBounded(preferenceWrites, {
              ...base,
              expectedUserIdMatches: typeof activeUserId === "string" && expectedUserId === activeUserId,
            }, "preference_writes");
          }).catch(() => {});
        }
        const relatedWriteMatch = request.method() === "PATCH"
          ? /^\\/admin\\/api\\/content\\/[^/]+\\/entries\\/([0-9a-f-]{36})$/u.exec(pathname)
          : null;
        if (relatedWriteMatch) {
          const expectedEntryId = relatedWriteMatch[1];
          request.response().then(async (response) => {
            if (!response) throw new Error("wf540_related_write_response_missing");
            const payload = await response.json();
            if (!payload || typeof payload !== "object" || Array.isArray(payload) || typeof payload.id !== "string" || typeof payload.title !== "string") throw new Error("wf540_related_write_response_shape");
            let requestTitle = null;
            try {
              const requestPayload = JSON.parse(request.postData() ?? "null");
              if (requestPayload && typeof requestPayload === "object" && !Array.isArray(requestPayload) && typeof requestPayload.title === "string") requestTitle = requestPayload.title;
            } catch {}
            appendBounded(relatedEntryWrites, {
              pageId: record.pageId,
              method: "PATCH",
              pathMatches: true,
              status: response.status(),
              idMatches: payload.id === expectedEntryId,
              titleMatches: requestTitle !== null && payload.title === requestTitle,
            }, "related_entry_writes");
          }).catch(() => {});
        }
      });
      candidate.on("response", (response) => {
        if (response.status() < 400) return;
        authAuthority.recordResponse({
          pageId: record.pageId,
          navigationEpoch: record.navigationCount,
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
        });
      });
      return identity;
    };
    Object.defineProperties(context, {
      __wf540ReadLogProjection: { value: logProjection, writable: false, configurable: false },
      __wf540ReadAggregateChannels: { value: () => logProjection().aggregate, writable: false, configurable: false },
      __wf540ReadAllPageChannels: { value: () => logProjection().pages, writable: false, configurable: false },
      __wf540ReadMediaGetCount: { value: () => pageRecords.reduce((total, record) => total + record.mediaGetCount, 0), writable: false, configurable: false },
      __wf540ReadPreferenceWrites: { value: preferenceWriteSnapshots, writable: false, configurable: false },
      __wf540ReadPreferenceReads: { value: preferenceReadSnapshots, writable: false, configurable: false },
      __wf540ReadRelatedListGetCounts: { value: relatedListCountSnapshot, writable: false, configurable: false },
      __wf540ReadRelatedEntryWrites: { value: relatedEntryWriteSnapshots, writable: false, configurable: false },
      __wf540ArmExpectedAuthChallenge: { value: authAuthority.arm, writable: false, configurable: false },
      __wf540CloseExpectedAuthChallenge: { value: authAuthority.close, writable: false, configurable: false },
      __wf540BindActiveUser: { value: (pageId, userId) => {
        if (typeof pageId !== "string" || !/^wf540-page-[1-9][0-9]*$/u.test(pageId) || typeof userId !== "string" || !/^[0-9a-f-]{36}$/u.test(userId)) throw new Error("wf540_active_user_binding");
        activeUserIds.set(pageId, userId);
        return true;
      }, writable: false, configurable: false },
      __wf540Remember: { value: remember, writable: false, configurable: false },
      __wf540Recall: { value: recall, writable: false, configurable: false },
      __wf540RouteHas: { value: (key) => routes.has(key), writable: false, configurable: false },
      __wf540RouteSet: { value: (key, value) => { if (routes.has(key)) throw new Error("wf540_duplicate_route"); routes.set(key, value); return true; }, writable: false, configurable: false },
      __wf540RouteGet: { value: (key) => { if (!routes.has(key)) throw new Error("wf540_route_missing"); return routes.get(key); }, writable: false, configurable: false },
      __wf540RouteDeactivate: { value: (key) => { const route = routes.get(key); if (!route || !route.active()) throw new Error("wf540_route_inactive"); route.deactivate(); return true; }, writable: false, configurable: false },
      __wf540ActiveRouteKeys: { value: () => Object.freeze([...routes].filter(([, route]) => route.active()).map(([key]) => key).sort()), writable: false, configurable: false },
    });
    await context.addInitScript(({ legacyKey }) => {
      if (Object.prototype.hasOwnProperty.call(window, "__wf540ReadLegacyStorageWrites")) throw new Error("wf540_duplicate_storage_instrumentation");
      let writes = 0;
      const original = Storage.prototype.setItem;
      Object.defineProperty(Storage.prototype, "setItem", {
        value: function wf540SetItem(key, value) {
          if (this === window.localStorage && key === legacyKey) writes += 1;
          return original.call(this, key, value);
        },
        writable: false,
        configurable: false,
      });
      Object.defineProperty(window, "__wf540ReadLegacyStorageWrites", {
        value: () => writes,
        writable: false,
        configurable: false,
      });
    }, { legacyKey: "coderso.screens.entry.preferences.v1" });
    for (const existingPage of context.pages()) instrumentPage(existingPage);
    context.on("page", instrumentPage);
    return true;
  })`;
}

function buildBlockBaselineSource(
  action,
  canvasSelector,
  insertPanelSelector,
  blockLibrarySelector
) {
  return `(async (page) => {
    const canvas = page.locator(${JSON.stringify(canvasSelector)});
    await canvas.waitFor({ state: "visible", timeout: 30000 });
    if (await canvas.count() !== 1 || !(await canvas.isVisible())) throw new Error("wf540_canvas_count");
    const blockIds = await canvas.locator("[data-screen-block-id][data-screen-block-type]").evaluateAll((nodes) => {
      const rows = nodes.map((node) => ({ id: node.getAttribute("data-screen-block-id"), type: node.getAttribute("data-screen-block-type") }));
      if (rows.some(({ id, type }) => !id || !type)) throw new Error("wf540_block_identity");
      const ids = rows.map(({ id }) => id);
      if (new Set(ids).size !== ids.length) throw new Error("wf540_block_duplicate");
      return ids.sort();
    });
    const insertPanel = page.locator(${JSON.stringify(insertPanelSelector)});
    await insertPanel.waitFor({ state: "visible", timeout: 30000 });
    if (await insertPanel.count() !== 1 || !(await insertPanel.isVisible()) || !(await insertPanel.isEnabled())) throw new Error("wf540_insert_panel_count");
    await insertPanel.click();
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && (await insertPanel.getAttribute("aria-pressed")) !== "true") {
      await page.waitForTimeout(25);
    }
    if ((await insertPanel.getAttribute("aria-pressed")) !== "true") throw new Error("wf540_insert_panel_state");
    const blockLibrary = page.locator(${JSON.stringify(blockLibrarySelector)});
    await blockLibrary.waitFor({ state: "visible", timeout: 30000 });
    if (await blockLibrary.count() !== 1 || !(await blockLibrary.isVisible())) throw new Error("wf540_block_library_count");
    page.context().__wf540Remember(${JSON.stringify("block-baseline:" + action.id)}, { blockIds });
    return { blockIds };
  })`;
}

function buildCaptureNewSource(action, executionSpec, plan, captures) {
  const [captureExpression, expectedTypeExpression, beforeActionToken] =
    executionSpec.builderAst.args;
  const captureNames = plan.runtimeCaptureBindings[action.id] ?? [];
  invariant(captureNames.length === 1, action.id + " runtime capture contract drift");
  const expectedType = resolveBuilderExpression(expectedTypeExpression, plan, captures);
  const beforeAction = plan.actionManifest.find(({ id }) => id.startsWith(beforeActionToken + "-"));
  invariant(beforeAction !== undefined, action.id + " block baseline dependency is missing");
  invariant(captureExpression.startsWith("palette."), action.id + " capture expression drift");
  return `(async (page) => {
    const baseline = page.context().__wf540Recall(${JSON.stringify("block-baseline:" + beforeAction.id)});
    const canvas = page.locator(${JSON.stringify(registeredSelector(plan, "canvas"))});
    await canvas.waitFor({ state: "visible", timeout: 30000 });
    if (await canvas.count() !== 1 || !(await canvas.isVisible())) throw new Error("wf540_canvas_count");
    let rows = [];
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      rows = await canvas.locator("[data-screen-block-id][data-screen-block-type]").evaluateAll((nodes) => nodes.map((node) => ({ id: node.getAttribute("data-screen-block-id"), type: node.getAttribute("data-screen-block-type") })));
      const added = rows.filter(({ id }) => !baseline.blockIds.includes(id));
      if (added.length === 1 && added[0].type === ${JSON.stringify(expectedType)}) break;
      await page.waitForTimeout(25);
    }
    if (rows.some(({ id, type }) => !id || !type)) throw new Error("wf540_block_identity");
    const afterIds = rows.map(({ id }) => id);
    if (new Set(afterIds).size !== afterIds.length || baseline.blockIds.some((id) => !afterIds.includes(id))) throw new Error("wf540_block_set");
    const added = rows.filter(({ id }) => !baseline.blockIds.includes(id));
    if (added.length !== 1 || added[0].type !== ${JSON.stringify(expectedType)}) throw new Error("wf540_new_block");
    page.context().__wf540Remember(${JSON.stringify("capture:" + captureNames[0])}, added[0].id);
    return { id: added[0].id, type: added[0].type };
  })`;
}

function buildLogReadSource() {
  return `(page) => {
    const projection = page.context().__wf540ReadLogProjection();
    const { aggregate, pages, firstUnexpected } = projection;
    const hasFailures = aggregate.consoleErrors.length || aggregate.consoleWarnings.length || aggregate.pageErrors.length ||
      pages.some((item) => item.consoleErrors.length || item.consoleWarnings.length || item.pageErrors.length);
    if (hasFailures) {
      if (!firstUnexpected) throw new Error("wf540_browser_log_projection_mismatch");
      const channel = firstUnexpected.channel === "consoleErrors"
        ? "console_error"
        : firstUnexpected.channel === "consoleWarnings"
          ? "console_warning"
          : firstUnexpected.channel === "pageErrors"
            ? "page_error"
            : null;
      if (channel === null || !/^[a-z0-9_]+$/u.test(firstUnexpected.code)) throw new Error("wf540_browser_log_diagnostic_shape");
      throw new Error("wf540_browser_log_" + channel + "_" + firstUnexpected.code);
    }
    if (firstUnexpected !== null) throw new Error("wf540_browser_log_projection_mismatch");
    return { aggregate, pages };
  }`;
}

function buildSelectionHandleSource(selector) {
  return `(async (page) => {
    const locator = page.locator(${JSON.stringify(selector)});
    if (await locator.count() !== 1) throw new Error("wf540_target_count");
    const handle = await locator.elementHandle();
    if (!handle) throw new Error("wf540_target_handle");
    const token = "wf540-selection-" + Date.now();
    await handle.evaluate((element, key) => {
      let seen = 0;
      let captured = null;
      const listener = (event) => { seen += 1; captured = event; };
      element.addEventListener("click", listener, { capture: true });
      window[key] = { element, listener, read: () => ({ seen, captured }) };
    }, token);
    try {
      await locator.click();
      await page.evaluate(() => Promise.resolve());
      const output = await handle.evaluate((element, key) => {
        const state = window[key];
        const observed = state?.read();
        if (!observed || observed.seen !== 1 || !(observed.captured instanceof MouseEvent) || !observed.captured.isTrusted || observed.captured.target !== element || !observed.captured.cancelable) throw new Error("wf540_selection_event");
        const wrapper = element.closest("[data-screen-block-id]");
        return {
          handleFocused: document.activeElement === element,
          ariaPressed: element.getAttribute("aria-pressed") === "true",
          selectedBlockId: wrapper?.getAttribute("data-screen-block-id") ?? "",
          defaultPrevented: observed.captured.defaultPrevented,
        };
      }, token);
      page.context().__wf540Remember("selection-handle", output);
      return output;
    } finally {
      await handle.evaluate((element, key) => {
        const state = window[key];
        if (state) element.removeEventListener("click", state.listener, { capture: true });
        delete window[key];
      }, token).catch(() => {});
      await handle.dispose();
    }
  })`;
}

export {
  buildBlockBaselineSource,
  buildCaptureNewSource,
  buildLogReadSource,
  buildLoggerInstallSource,
  buildSelectionHandleSource,
  expandPathTemplate,
  parseBuilder,
  resolveBuilderExpression,
  resolveLiteral,
};
