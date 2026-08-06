import { Script } from "node:vm";

import {
  EXPECTED_AUTH_CHALLENGE_PHASES,
  EXPECTED_AUTH_CHALLENGE_TEXT,
} from "../config.mjs";
import { canonicalJson, invariant } from "../foundation.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { createExpectedAuthChallengeAuthority } from "../auth-challenge-authority.mjs";

export async function runExpectedAuthChallengeSelfTest({ expectNegative, assertNegative }) {
  const expectedUrl = "http://127.0.0.1:5173/admin/api/auth/me";
  const loginUrl = "http://127.0.0.1:5173/admin/login";
  const pageId = "wf540-page-1";
  const secondPageId = "wf540-page-2";
  const pageRecords = Object.freeze([
    Object.freeze({ pageId, tabIndex: 0, mediaGetCount: 3 }),
    Object.freeze({ pageId: secondPageId, tabIndex: 1, mediaGetCount: 0 }),
  ]);
  const options = (overrides = {}) => ({
    expectedUrl,
    loginUrl,
    expectedText: EXPECTED_AUTH_CHALLENGE_TEXT,
    expectedPageId: pageId,
    phases: EXPECTED_AUTH_CHALLENGE_PHASES,
    maxFailureEvents: 128,
    maxAuthEvents: 64,
    ...overrides,
  });
  const authority = (overrides = {}) => createExpectedAuthChallengeAuthority(options(overrides));
  const [isolatedUrlType, isolatedAuthorityFactory] = new Script(
    `[typeof URL, (${createExpectedAuthChallengeAuthority.toString()})]`,
    { filename: "task-540-auth-authority-no-url.self-test.js" }
  ).runInNewContext({ URL: undefined }, { timeout: 15_000 });
  const isolatedProjection = isolatedAuthorityFactory(options()).reconcile(pageRecords);
  invariant(
    isolatedUrlType === "undefined" &&
      isolatedProjection.firstUnexpected === null &&
      isolatedProjection.aggregate.consoleErrors.length === 0,
    "expected auth authority retained a run-code URL global dependency"
  );
  const response = (subject, overrides = {}) =>
    subject.recordResponse({
      pageId,
      navigationEpoch: 2,
      url: expectedUrl,
      method: "GET",
      status: 401,
      ...overrides,
    });
  const message = (subject, overrides = {}) =>
    subject.recordConsole({
      pageId,
      navigationEpoch: 2,
      type: "error",
      text: EXPECTED_AUTH_CHALLENGE_TEXT,
      locationUrl: expectedUrl,
      ...overrides,
    });
  const arm = (subject, definition, navigationBaseline) =>
    subject.arm({
      phaseId: definition.armActionId,
      pageId,
      navigationBaseline,
    });
  const close = (subject, definition, navigationEpoch) =>
    subject.close({
      closeActionId: definition.closeActionId,
      pageId,
      navigationEpoch,
      url: loginUrl,
    });
  const emitPair = (subject, navigationEpoch, order = "response-first", overrides = {}) => {
    const responseInput = { navigationEpoch, ...(overrides.response ?? {}) };
    const messageInput = { navigationEpoch, ...(overrides.message ?? {}) };
    if (order === "response-first") {
      response(subject, responseInput);
      message(subject, messageInput);
    } else if (order === "message-first") {
      message(subject, messageInput);
      response(subject, responseInput);
    } else {
      invariant(false, "unknown auth callback self-test order");
    }
  };
  const completeSingleTokenPhase = (
    subject,
    definition,
    navigationBaseline,
    order = "response-first"
  ) => {
    arm(subject, definition, navigationBaseline);
    emitPair(subject, navigationBaseline + 1, order);
    close(subject, definition, navigationBaseline + 1);
  };
  const firstInitial = EXPECTED_AUTH_CHALLENGE_PHASES[0];
  const firstSignout = EXPECTED_AUTH_CHALLENGE_PHASES[1];

  const allPhases = authority();
  let navigationEpoch = 0;
  for (const [phaseIndex, definition] of EXPECTED_AUTH_CHALLENGE_PHASES.entries()) {
    arm(allPhases, definition, navigationEpoch);
    if (definition.successiveInitialEpochs) {
      emitPair(allPhases, navigationEpoch + 1, "response-first");
      emitPair(allPhases, navigationEpoch + 2, "message-first");
      navigationEpoch += 2;
    } else {
      emitPair(
        allPhases,
        navigationEpoch + 1,
        phaseIndex % 2 === 0 ? "response-first" : "message-first"
      );
      navigationEpoch += 1;
    }
    close(allPhases, definition, navigationEpoch);
  }
  const firstRead = allPhases.reconcile(pageRecords);
  const secondRead = allPhases.reconcile(pageRecords);
  invariant(
    deepEqualJson(firstRead, secondRead) &&
      firstRead.aggregate.consoleErrors.length === 0 &&
      firstRead.aggregate.consoleWarnings.length === 0 &&
      firstRead.aggregate.pageErrors.length === 0 &&
      firstRead.aggregate.mediaGetCount === 3 &&
      firstRead.firstUnexpected === null,
    "expected auth phases or idempotent reconciliation drift"
  );
  invariant(
    Object.isFrozen(firstRead) &&
      Object.isFrozen(firstRead.aggregate) &&
      firstRead.pages.every((page) => Object.isFrozen(page)),
    "expected auth projection is mutable"
  );

  {
    const subject = authority();
    emitPair(subject, 1);
    const projection = subject.reconcile(pageRecords);
    assertNegative(
      projection.aggregate.consoleErrors.length === 2 &&
        projection.firstUnexpected?.code === "response_admin_api_auth",
      "unarmed auth challenge"
    );
  }
  {
    const subject = authority();
    response(subject, {
      navigationEpoch: 0,
      url: "http://127.0.0.1:5173/admin/api/custom-screens",
      status: 500,
    });
    const projection = subject.reconcile(pageRecords);
    assertNegative(
      projection.aggregate.consoleErrors.length === 1 &&
        projection.firstUnexpected?.code === "response_admin_api_server",
      "unarmed non-auth HTTP failure preservation"
    );
  }
  {
    const subject = authority();
    completeSingleTokenPhase(subject, firstSignout, 0);
    emitPair(subject, 2);
    const projection = subject.reconcile(pageRecords);
    assertNegative(
      projection.aggregate.consoleErrors.length === 2 &&
        projection.firstUnexpected?.channel === "consoleErrors",
      "authenticated or late auth challenge"
    );
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    emitPair(subject, 1);
    emitPair(subject, 2);
    await expectNegative(async () => close(subject, firstSignout, 2), "second 401 for one token");
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    response(subject, { navigationEpoch: 1 });
    response(subject, { navigationEpoch: 1 });
    message(subject, { navigationEpoch: 1 });
    await expectNegative(async () => close(subject, firstSignout, 1), "rebound token response");
  }
  for (const [label, responseOverrides, messageOverrides] of [
    ["403 response", { status: 403 }, {}],
    ["POST auth response", { method: "POST" }, {}],
    [
      "media response path",
      { url: "http://127.0.0.1:5173/media/private.png" },
      { locationUrl: "http://127.0.0.1:5173/media/private.png" },
    ],
    [
      "Site Vite response path",
      { url: "http://127.0.0.1:5174/site/runtime.js" },
      { locationUrl: "http://127.0.0.1:5174/site/runtime.js" },
    ],
    [
      "other Admin response path",
      { url: "http://127.0.0.1:5173/admin/api/users" },
      { locationUrl: "http://127.0.0.1:5173/admin/api/users" },
    ],
  ]) {
    const subject = authority();
    arm(subject, firstSignout, 0);
    emitPair(subject, 1, "response-first", {
      response: responseOverrides,
      message: messageOverrides,
    });
    await expectNegative(async () => close(subject, firstSignout, 1), label);
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    response(subject, { navigationEpoch: 1 });
    await expectNegative(async () => close(subject, firstSignout, 1), "response without message");
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    message(subject, { navigationEpoch: 1 });
    await expectNegative(async () => close(subject, firstSignout, 1), "message without response");
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    emitPair(subject, 1, "response-first", {
      response: { pageId: secondPageId },
      message: { pageId: secondPageId },
    });
    await expectNegative(async () => close(subject, firstSignout, 1), "cross-page pair");
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    response(subject, { navigationEpoch: 1 });
    message(subject, { navigationEpoch: 2 });
    await expectNegative(async () => close(subject, firstSignout, 2), "cross-navigation pair");
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    emitPair(subject, 1);
    message(subject, { navigationEpoch: 1 });
    await expectNegative(
      async () => close(subject, firstSignout, 1),
      "one response with two messages"
    );
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    response(subject, { navigationEpoch: 1 });
    subject.recordConsole({
      pageId,
      navigationEpoch: 1,
      type: "warning",
      text: "intervening warning",
      locationUrl: loginUrl,
    });
    message(subject, { navigationEpoch: 1 });
    await expectNegative(
      async () => close(subject, firstSignout, 1),
      "intervening unrelated failure"
    );
  }
  for (const [label, text] of [
    ["auth text prefix drift", "prefix " + EXPECTED_AUTH_CHALLENGE_TEXT],
    ["auth text suffix drift", EXPECTED_AUTH_CHALLENGE_TEXT + " suffix"],
    ["auth text case drift", EXPECTED_AUTH_CHALLENGE_TEXT.toLowerCase()],
    ["auth text newline drift", EXPECTED_AUTH_CHALLENGE_TEXT + "\n"],
  ]) {
    const subject = authority();
    arm(subject, firstSignout, 0);
    emitPair(subject, 1, "response-first", { message: { text } });
    await expectNegative(async () => close(subject, firstSignout, 1), label);
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    emitPair(subject, 1, "response-first", { message: { locationUrl: loginUrl } });
    await expectNegative(async () => close(subject, firstSignout, 1), "userland console spoof");
  }
  for (const [label, url] of [
    ["wrong auth query", expectedUrl + "?retry=1"],
    ["wrong auth origin", "http://127.0.0.1:5174/admin/api/auth/me"],
  ]) {
    const subject = authority();
    arm(subject, firstSignout, 0);
    emitPair(subject, 1, "response-first", { message: { locationUrl: url } });
    await expectNegative(async () => close(subject, firstSignout, 1), label);
  }
  {
    const subject = authority();
    subject.recordConsole({
      pageId,
      navigationEpoch: 0,
      type: "warning",
      text: "warning marker",
      locationUrl: loginUrl,
    });
    const projection = subject.reconcile(pageRecords);
    assertNegative(
      projection.pages[0].consoleWarnings.length === 1 &&
        projection.aggregate.consoleWarnings[0] === pageId &&
        projection.firstUnexpected?.channel === "consoleWarnings",
      "warning preservation"
    );
  }
  {
    const subject = authority();
    subject.recordPageError({ pageId, navigationEpoch: 0, text: "TypeError: page marker" });
    const projection = subject.reconcile(pageRecords);
    assertNegative(
      projection.pages[0].pageErrors.length === 1 &&
        projection.aggregate.pageErrors[0] === pageId &&
        projection.firstUnexpected?.channel === "pageErrors",
      "page-error preservation"
    );
  }
  {
    const subject = authority();
    arm(subject, firstSignout, 0);
    await expectNegative(async () => close(subject, firstSignout, 1), "unused token");
  }
  {
    const subject = authority();
    completeSingleTokenPhase(subject, firstSignout, 0);
    await expectNegative(async () => arm(subject, firstSignout, 1), "reused token");
  }
  {
    const subject = authority({ maxFailureEvents: 1 });
    subject.recordConsole({
      pageId,
      navigationEpoch: 0,
      type: "warning",
      text: "one",
      locationUrl: loginUrl,
    });
    await expectNegative(
      async () => subject.recordPageError({ pageId, navigationEpoch: 0, text: "two" }),
      "failure ledger overflow"
    );
  }
  {
    const subject = authority({ maxAuthEvents: 1 });
    arm(subject, firstSignout, 0);
    await expectNegative(
      async () => response(subject, { navigationEpoch: 1 }),
      "auth ledger overflow"
    );
  }
  {
    const subject = authority();
    completeSingleTokenPhase(subject, firstSignout, 0);
    response(subject, { navigationEpoch: 2, status: 403 });
    const projection = subject.reconcile(pageRecords);
    assertNegative(
      projection.firstUnexpected?.code === "response_admin_api_auth" &&
        projection.pages[0].consoleErrors.length === 1,
      "diagnostic after quarantined event"
    );
  }
  {
    const subject = authority();
    arm(subject, firstInitial, 0);
    emitPair(subject, 1);
    await expectNegative(async () => close(subject, firstInitial, 1), "missing initial epoch");
  }
  {
    const subject = authority();
    arm(subject, firstInitial, 0);
    emitPair(subject, 1);
    emitPair(subject, 1);
    await expectNegative(async () => close(subject, firstInitial, 1), "duplicate initial epoch");
  }
  {
    const subject = authority();
    arm(subject, firstInitial, 0);
    emitPair(subject, 1);
    emitPair(subject, 0);
    await expectNegative(async () => close(subject, firstInitial, 1), "reversed initial epochs");
  }
  {
    const privateMarker = "TASK540_AUTH_PRIVATE_DO_NOT_EGRESS";
    const privateUrl = expectedUrl + "?private=" + privateMarker;
    const subject = authority();
    response(subject, { navigationEpoch: 0, url: privateUrl });
    message(subject, { navigationEpoch: 0, text: privateMarker, locationUrl: privateUrl });
    const serializedProjection = canonicalJson(subject.reconcile(pageRecords));
    assertNegative(
      !serializedProjection.includes(privateMarker) &&
        !serializedProjection.includes(privateUrl) &&
        !canonicalJson(subject).includes(privateMarker),
      "private auth records do not egress"
    );
  }
}
