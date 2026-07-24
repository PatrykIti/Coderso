function createExpectedAuthChallengeAuthority(options) {
  const fail = (code) => {
    throw new Error("wf540_auth_challenge_" + code);
  };
  const exactKeys = (value, keys) =>
    Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    );
  const freeze = (value, seen = new WeakSet()) => {
    if ((typeof value !== "object" && typeof value !== "function") || value === null) return value;
    if (seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) freeze(value[key], seen);
    return Object.freeze(value);
  };
  const integer = (value) => Number.isSafeInteger(value) && value >= 0;
  const parseHttpUrl = (value) => {
    if (typeof value !== "string" || value.length === 0 || value.length > 4096) return null;
    const match =
      /^(https?):\/\/([A-Za-z0-9.-]+|\[[0-9A-Fa-f:.]+\])(?::([0-9]{1,5}))?(\/[^?#\s\\]*)?(\?[^#\s\\]*)?(#[^\s\\]*)?$/u.exec(
        value
      );
    if (match === null) return null;
    const protocol = match[1].toLowerCase();
    const rawHostname = match[2];
    const bracketed = rawHostname.startsWith("[");
    if (bracketed) {
      const address = rawHostname.slice(1, -1);
      if (!address.includes(":") || !/^[0-9A-Fa-f:.]+$/u.test(address)) return null;
    } else {
      const labels = rawHostname.split(".");
      if (
        rawHostname.length > 253 ||
        labels.some(
          (label) =>
            label.length === 0 ||
            label.length > 63 ||
            !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u.test(label)
        )
      ) {
        return null;
      }
    }
    const suppliedPort = match[3] ?? "";
    const portNumber = suppliedPort === "" ? null : Number(suppliedPort);
    if (
      portNumber !== null &&
      (!Number.isSafeInteger(portNumber) || portNumber < 1 || portNumber > 65535)
    ) {
      return null;
    }
    const port =
      portNumber === null ||
      (protocol === "http" && portNumber === 80) ||
      (protocol === "https" && portNumber === 443)
        ? ""
        : String(portNumber);
    const hostname = rawHostname.toLowerCase();
    const origin = protocol + "://" + hostname + (port === "" ? "" : ":" + port);
    const pathname = match[4] ?? "/";
    const search = match[5] ?? "";
    const hash = match[6] ?? "";
    return freeze({
      hash,
      href: origin + pathname + search + hash,
      origin,
      pathname,
      port,
      search,
    });
  };
  const pageIdPattern = /^wf540-page-[1-9][0-9]*$/u;
  const safeTokenPattern = /^[a-z0-9][a-z0-9-]{0,95}$/u;
  if (
    !exactKeys(options, [
      "expectedUrl",
      "loginUrl",
      "expectedText",
      "expectedPageId",
      "phases",
      "maxFailureEvents",
      "maxAuthEvents",
    ])
  )
    fail("options_shape");
  if (
    typeof options.expectedUrl !== "string" ||
    options.expectedUrl.length === 0 ||
    options.expectedUrl.length > 4096 ||
    typeof options.loginUrl !== "string" ||
    options.loginUrl.length === 0 ||
    options.loginUrl.length > 4096 ||
    typeof options.expectedText !== "string" ||
    options.expectedText.length === 0 ||
    options.expectedText.length > 16384 ||
    typeof options.expectedPageId !== "string" ||
    !pageIdPattern.test(options.expectedPageId) ||
    !Number.isSafeInteger(options.maxFailureEvents) ||
    options.maxFailureEvents < 1 ||
    !Number.isSafeInteger(options.maxAuthEvents) ||
    options.maxAuthEvents < 1 ||
    !Array.isArray(options.phases) ||
    options.phases.length !== 6
  )
    fail("options_value");
  const expectedUrl = parseHttpUrl(options.expectedUrl);
  const loginUrl = parseHttpUrl(options.loginUrl);
  if (expectedUrl === null || loginUrl === null) fail("options_url");
  if (
    expectedUrl.href !== options.expectedUrl ||
    expectedUrl.search !== "" ||
    expectedUrl.hash !== "" ||
    loginUrl.href !== options.loginUrl ||
    loginUrl.search !== "" ||
    loginUrl.hash !== ""
  )
    fail("options_url_canonical");
  const phaseDefinitions = options.phases.map((phase) => {
    if (!exactKeys(phase, ["armActionId", "closeActionId", "tokens", "successiveInitialEpochs"])) {
      fail("phase_shape");
    }
    if (
      typeof phase.armActionId !== "string" ||
      !safeTokenPattern.test(phase.armActionId) ||
      typeof phase.closeActionId !== "string" ||
      !safeTokenPattern.test(phase.closeActionId) ||
      !Array.isArray(phase.tokens) ||
      (phase.tokens.length !== 1 && phase.tokens.length !== 2) ||
      phase.tokens.some((token) => typeof token !== "string" || !safeTokenPattern.test(token)) ||
      typeof phase.successiveInitialEpochs !== "boolean" ||
      (phase.tokens.length === 2) !== phase.successiveInitialEpochs
    )
      fail("phase_value");
    return freeze({
      armActionId: phase.armActionId,
      closeActionId: phase.closeActionId,
      tokens: [...phase.tokens],
      successiveInitialEpochs: phase.successiveInitialEpochs,
    });
  });
  const allArmIds = phaseDefinitions.map(({ armActionId }) => armActionId);
  const allCloseIds = phaseDefinitions.map(({ closeActionId }) => closeActionId);
  const allTokenIds = phaseDefinitions.flatMap(({ tokens }) => tokens);
  if (
    new Set(allArmIds).size !== 6 ||
    new Set(allCloseIds).size !== 6 ||
    allTokenIds.length !== 7 ||
    new Set(allTokenIds).size !== 7 ||
    phaseDefinitions.filter(({ successiveInitialEpochs }) => successiveInitialEpochs).length !== 1
  )
    fail("phase_cardinality");

  const definitionsByArm = new Map(
    phaseDefinitions.map((definition) => [definition.armActionId, definition])
  );
  const definitionsByClose = new Map(
    phaseDefinitions.map((definition) => [definition.closeActionId, definition])
  );
  const phaseStates = new Map(
    phaseDefinitions.map((definition) => [
      definition.armActionId,
      {
        status: "idle",
        definition,
        pageId: null,
        failureBaseline: null,
        nextTokenIndex: 0,
        tokenStates: new Map(),
        consumedEpochs: [],
      },
    ])
  );
  const failureLedger = [];
  const authLedger = [];
  const consumedFailureSequences = new Set();
  let activePhaseId = null;
  let nextFailureSequence = 1;
  let nextAuthSequence = 1;

  const appendFailure = (event) => {
    if (failureLedger.length >= options.maxFailureEvents) fail("failure_ledger_overflow");
    const row = freeze({ sequence: nextFailureSequence++, ...event });
    failureLedger.push(row);
    return row;
  };
  const appendAuth = (event) => {
    if (authLedger.length >= options.maxAuthEvents) fail("auth_ledger_overflow");
    const row = freeze({ sequence: nextAuthSequence++, ...event });
    authLedger.push(row);
    return row;
  };
  const classifyUrl = (value) => {
    const parsed = parseHttpUrl(value);
    if (parsed === null) return "invalid_url";
    if (parsed.origin === expectedUrl.origin && parsed.pathname.startsWith("/admin/api/"))
      return "admin_api";
    if (parsed.pathname.startsWith("/media/")) return "media_delivery";
    if (parsed.pathname.startsWith("/site/") || parsed.port === "5174") return "site_vite";
    if (parsed.origin === expectedUrl.origin && parsed.pathname.startsWith("/admin/"))
      return "admin_asset";
    if (parsed.pathname.includes("favicon")) return "favicon";
    return "front_other";
  };
  const classifyText = (value) => {
    if (/net::err_connection_refused/iu.test(value)) return "connection_refused";
    if (/net::err_aborted/iu.test(value)) return "request_aborted";
    if (/net::err_/iu.test(value)) return "network";
    if (/cors|cross-origin/iu.test(value)) return "cors";
    if (/failed to load resource/iu.test(value) && /(?:\b5[0-9]{2}\b|server error)/iu.test(value))
      return "resource_5xx";
    if (
      /failed to load resource/iu.test(value) &&
      /(?:\b401\b|\b403\b|unauthorized|forbidden)/iu.test(value)
    )
      return "resource_auth";
    if (/failed to load resource/iu.test(value) && /(?:404|not found)/iu.test(value))
      return "resource_404";
    if (/failed to load resource/iu.test(value) && /\b4[0-9]{2}\b/iu.test(value))
      return "resource_4xx";
    if (/failed to load resource/iu.test(value)) return "resource_load";
    if (/content security policy|refused to/iu.test(value)) return "csp";
    if (/hydration|react/iu.test(value)) return "react";
    if (/typeerror|referenceerror|syntaxerror/iu.test(value)) return "runtime";
    return "other";
  };
  const currentTokenState = () => {
    if (activePhaseId === null) return null;
    const phaseState = phaseStates.get(activePhaseId);
    if (!phaseState || phaseState.status !== "armed") return null;
    const tokenId = phaseState.definition.tokens[phaseState.nextTokenIndex];
    return tokenId === undefined ? null : (phaseState.tokenStates.get(tokenId) ?? null);
  };
  const responseMatchesToken = (response, tokenState, phaseState) =>
    Boolean(
      response.pageId === tokenState.record.pageId &&
      response.pageId === options.expectedPageId &&
      response.method === "GET" &&
      response.url === options.expectedUrl &&
      response.status === 401 &&
      response.navigationEpoch > tokenState.record.navigationBaseline &&
      (!phaseState.definition.successiveInitialEpochs ||
        response.navigationEpoch === tokenState.record.navigationBaseline + 1)
    );
  const consoleMatchesResponse = (message, response) =>
    Boolean(
      message.type === "console-error" &&
      message.pageId === response.pageId &&
      message.navigationEpoch === response.navigationEpoch &&
      message.locationUrl === response.url &&
      message.text === options.expectedText
    );
  const armToken = (phaseState, tokenIndex, navigationBaseline) => {
    const tokenId = phaseState.definition.tokens[tokenIndex];
    if (tokenId === undefined || phaseState.tokenStates.has(tokenId)) fail("token_reuse");
    const armEvent = appendAuth({
      type: "arm",
      phaseId: phaseState.definition.armActionId,
      tokenId,
      pageId: phaseState.pageId,
      navigationBaseline,
    });
    const record = freeze({
      phaseId: phaseState.definition.armActionId,
      tokenId,
      pageId: phaseState.pageId,
      navigationBaseline,
      armEventSequence: armEvent.sequence,
    });
    phaseState.tokenStates.set(tokenId, {
      record,
      boundResponseSequence: null,
      consumedPair: null,
    });
  };
  const tryConsumeAdjacentPair = () => {
    if (failureLedger.length < 2 || activePhaseId === null) return false;
    const left = failureLedger.at(-2);
    const right = failureLedger.at(-1);
    const response = left.type === "response" ? left : right.type === "response" ? right : null;
    const message =
      left.type === "console-error" ? left : right.type === "console-error" ? right : null;
    if (!response || !message || response === message) return false;
    const phaseState = phaseStates.get(activePhaseId);
    const tokenState = currentTokenState();
    if (!phaseState || !tokenState || !responseMatchesToken(response, tokenState, phaseState))
      return false;
    if (tokenState.boundResponseSequence === null) {
      tokenState.boundResponseSequence = response.sequence;
      appendAuth({
        type: "bind",
        phaseId: phaseState.definition.armActionId,
        tokenId: tokenState.record.tokenId,
        failureSequence: response.sequence,
      });
    }
    if (tokenState.boundResponseSequence !== response.sequence || tokenState.consumedPair !== null)
      return false;
    if (!consoleMatchesResponse(message, response)) return false;
    tokenState.consumedPair = freeze({
      responseSequence: response.sequence,
      messageSequence: message.sequence,
    });
    consumedFailureSequences.add(response.sequence);
    consumedFailureSequences.add(message.sequence);
    phaseState.consumedEpochs.push(response.navigationEpoch);
    appendAuth({
      type: "consume",
      phaseId: phaseState.definition.armActionId,
      tokenId: tokenState.record.tokenId,
      responseSequence: response.sequence,
      messageSequence: message.sequence,
    });
    phaseState.nextTokenIndex += 1;
    if (phaseState.nextTokenIndex < phaseState.definition.tokens.length) {
      armToken(phaseState, phaseState.nextTokenIndex, response.navigationEpoch);
    }
    return true;
  };
  const bindResponseIfEligible = (response) => {
    if (activePhaseId === null) return false;
    const phaseState = phaseStates.get(activePhaseId);
    const tokenState = currentTokenState();
    if (!phaseState || !tokenState || !responseMatchesToken(response, tokenState, phaseState))
      return false;
    if (tokenState.boundResponseSequence !== null) return false;
    tokenState.boundResponseSequence = response.sequence;
    appendAuth({
      type: "bind",
      phaseId: phaseState.definition.armActionId,
      tokenId: tokenState.record.tokenId,
      failureSequence: response.sequence,
    });
    return true;
  };
  const safePageId = (value) => {
    if (typeof value !== "string" || !pageIdPattern.test(value)) fail("page_id");
    return value;
  };

  const arm = (input) => {
    if (!exactKeys(input, ["phaseId", "pageId", "navigationBaseline"])) fail("arm_shape");
    const definition = definitionsByArm.get(input.phaseId);
    if (
      !definition ||
      activePhaseId !== null ||
      input.pageId !== options.expectedPageId ||
      !integer(input.navigationBaseline)
    ) {
      fail("arm_state");
    }
    const phaseState = phaseStates.get(definition.armActionId);
    if (!phaseState || phaseState.status !== "idle") fail("arm_reuse");
    phaseState.status = "armed";
    phaseState.pageId = safePageId(input.pageId);
    phaseState.failureBaseline = nextFailureSequence - 1;
    activePhaseId = definition.armActionId;
    armToken(phaseState, 0, input.navigationBaseline);
    return true;
  };
  const close = (input) => {
    if (!exactKeys(input, ["closeActionId", "pageId", "navigationEpoch", "url"]))
      fail("close_shape");
    const definition = definitionsByClose.get(input.closeActionId);
    if (
      !definition ||
      activePhaseId !== definition.armActionId ||
      input.pageId !== options.expectedPageId ||
      !integer(input.navigationEpoch) ||
      input.url !== options.loginUrl
    )
      fail("close_state");
    const phaseState = phaseStates.get(definition.armActionId);
    if (
      !phaseState ||
      phaseState.status !== "armed" ||
      phaseState.nextTokenIndex !== definition.tokens.length ||
      phaseState.consumedEpochs.length !== definition.tokens.length ||
      phaseState.consumedEpochs.some((epoch) => epoch > input.navigationEpoch)
    )
      fail("close_unconsumed");
    if (
      definition.successiveInitialEpochs &&
      phaseState.consumedEpochs[1] !== phaseState.consumedEpochs[0] + 1
    )
      fail("close_epoch_order");
    const remainingDuringPhase = failureLedger.some(
      (event) =>
        event.sequence > phaseState.failureBaseline && !consumedFailureSequences.has(event.sequence)
    );
    if (remainingDuringPhase) fail("close_unexpected_failure");
    appendAuth({
      type: "close",
      phaseId: definition.armActionId,
      closeActionId: definition.closeActionId,
      pageId: input.pageId,
      navigationEpoch: input.navigationEpoch,
    });
    phaseState.status = "closed";
    activePhaseId = null;
    return true;
  };
  const recordResponse = (input) => {
    if (!exactKeys(input, ["pageId", "navigationEpoch", "url", "method", "status"]))
      fail("response_shape");
    if (
      typeof input.url !== "string" ||
      input.url.length === 0 ||
      input.url.length > 4096 ||
      typeof input.method !== "string" ||
      input.method.length === 0 ||
      input.method.length > 16 ||
      !Number.isSafeInteger(input.status) ||
      input.status < 400 ||
      input.status > 599 ||
      !integer(input.navigationEpoch)
    )
      fail("response_value");
    const row = appendFailure({
      type: "response",
      pageId: safePageId(input.pageId),
      navigationEpoch: input.navigationEpoch,
      url: input.url,
      method: input.method,
      status: input.status,
      safeCode:
        "response_" +
        classifyUrl(input.url) +
        "_" +
        (input.status === 401 || input.status === 403
          ? "auth"
          : input.status === 404
            ? "not_found"
            : input.status >= 500
              ? "server"
              : "client"),
    });
    bindResponseIfEligible(row);
    tryConsumeAdjacentPair();
    return true;
  };
  const recordConsole = (input) => {
    if (!exactKeys(input, ["pageId", "navigationEpoch", "type", "text", "locationUrl"]))
      fail("console_shape");
    if (
      (input.type !== "error" && input.type !== "warning") ||
      typeof input.text !== "string" ||
      input.text.length > 16384 ||
      typeof input.locationUrl !== "string" ||
      input.locationUrl.length > 4096 ||
      !integer(input.navigationEpoch)
    )
      fail("console_value");
    appendFailure({
      type: input.type === "error" ? "console-error" : "console-warning",
      pageId: safePageId(input.pageId),
      navigationEpoch: input.navigationEpoch,
      text: input.text,
      locationUrl: input.locationUrl,
      safeCode: (input.type === "error" ? "console_" : "warning_") + classifyText(input.text),
    });
    tryConsumeAdjacentPair();
    return true;
  };
  const recordPageError = (input) => {
    if (!exactKeys(input, ["pageId", "navigationEpoch", "text"])) fail("page_error_shape");
    if (
      typeof input.text !== "string" ||
      input.text.length > 16384 ||
      !integer(input.navigationEpoch)
    )
      fail("page_error_value");
    appendFailure({
      type: "page-error",
      pageId: safePageId(input.pageId),
      navigationEpoch: input.navigationEpoch,
      text: input.text,
      safeCode: "page_" + classifyText(input.text),
    });
    tryConsumeAdjacentPair();
    return true;
  };
  const reconcile = (pageRecords) => {
    if (!Array.isArray(pageRecords)) fail("page_records_shape");
    const pages = pageRecords
      .map((record) => {
        if (
          !exactKeys(record, ["pageId", "tabIndex", "mediaGetCount"]) ||
          typeof record.pageId !== "string" ||
          !pageIdPattern.test(record.pageId) ||
          !integer(record.tabIndex) ||
          !integer(record.mediaGetCount)
        )
          fail("page_record_value");
        return {
          pageId: record.pageId,
          tabIndex: record.tabIndex,
          consoleErrors: [],
          consoleWarnings: [],
          pageErrors: [],
          mediaGetCount: record.mediaGetCount,
        };
      })
      .sort((left, right) => left.tabIndex - right.tabIndex);
    if (
      new Set(pages.map(({ pageId }) => pageId)).size !== pages.length ||
      new Set(pages.map(({ tabIndex }) => tabIndex)).size !== pages.length
    ) {
      fail("page_record_duplicate");
    }
    const byPage = new Map(pages.map((page) => [page.pageId, page]));
    let firstUnexpected = null;
    for (const event of failureLedger) {
      if (consumedFailureSequences.has(event.sequence)) continue;
      const page = byPage.get(event.pageId);
      if (!page) fail("event_page_missing");
      const channel =
        event.type === "console-warning"
          ? "consoleWarnings"
          : event.type === "page-error"
            ? "pageErrors"
            : "consoleErrors";
      page[channel].push(event.safeCode);
      if (firstUnexpected === null) firstUnexpected = { channel, code: event.safeCode };
    }
    for (const page of pages) {
      Object.freeze(page.consoleErrors);
      Object.freeze(page.consoleWarnings);
      Object.freeze(page.pageErrors);
      Object.freeze(page);
    }
    const aggregate = freeze({
      consoleErrors: pages.flatMap((page) => page.consoleErrors.map(() => page.pageId)),
      consoleWarnings: pages.flatMap((page) => page.consoleWarnings.map(() => page.pageId)),
      pageErrors: pages.flatMap((page) => page.pageErrors.map(() => page.pageId)),
      mediaGetCount: pages.reduce((total, page) => total + page.mediaGetCount, 0),
    });
    return freeze({ aggregate, pages, firstUnexpected });
  };
  return freeze({ arm, close, recordResponse, recordConsole, recordPageError, reconcile });
}

export { createExpectedAuthChallengeAuthority };
