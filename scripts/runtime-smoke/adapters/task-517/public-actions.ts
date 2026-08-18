import { SmokeError } from "../../contracts";
import type { SmokeVisibleAssertionResult } from "../types";
import { assertion } from "./assertions";
import type { Task517BrowserReceipt } from "./receipt";
import type { Task517ScenarioId } from "./scenarios";

/** Per-variant visible assertions for the public-surface flows of a TASK-517 scenario.
 * The orchestrator (scenario-assertions.ts) merges these with the admin-surface blocks
 * before building the manifestable variant results. */
export function buildTask517PublicVariantAssertions(
  scenarioId: Task517ScenarioId,
  receipt: Task517BrowserReceipt
): Readonly<Record<string, readonly SmokeVisibleAssertionResult[]>> {
  if (scenarioId === "anon-public-cached-render") {
    return {
      "anon-public-cached-light": Object.freeze([
        assertion(
          "dom-state",
          "request:entry-detail",
          "anonFirstStatus",
          "200",
          String(receipt.anonPublicStatus),
          receipt.anonPublicStatus === 200
        ),
        assertion(
          "dom-state",
          "request:entry-detail",
          "anonSecondStatus",
          "200",
          String(receipt.anonPublicSecondStatus),
          receipt.anonPublicSecondStatus === 200
        ),
        assertion(
          "dom-state",
          "response:entry-detail",
          "secondFaster",
          "true",
          String(receipt.anonPublicSecondFaster),
          receipt.anonPublicSecondFaster === true
        ),
        assertion(
          "dom-state",
          "response:entry-detail",
          "byteIdentical",
          "true",
          String(receipt.anonPublicBodyMatches),
          receipt.anonPublicBodyMatches === true
        ),
        assertion(
          "dom-state",
          "dom:entry-detail",
          "h1",
          receipt.anonPublicH1,
          receipt.anonPublicH1,
          receipt.anonPublicH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:entry-body",
          "preVisible",
          "true",
          String(receipt.anonPublicPreVisible),
          receipt.anonPublicPreVisible === true
        ),
        assertion(
          "geometry",
          "dom:entry-body",
          "preHeight",
          ">0",
          String(receipt.anonPublicPreHeight),
          receipt.anonPublicPreHeight > 0
        ),
      ]),
    };
  }

  if (scenarioId === "private-anon-uniform-404") {
    return {
      "anon-404-light": Object.freeze([
        assertion(
          "dom-state",
          "request:private-entry",
          "anonStatus",
          "404",
          String(receipt.privateAnonStatus),
          receipt.privateAnonStatus === 404
        ),
        assertion(
          "dom-state",
          "request:missing-slug",
          "anonStatus",
          "404",
          String(receipt.missingAnonStatus),
          receipt.missingAnonStatus === 404
        ),
        assertion(
          "dom-state",
          "response:private-vs-missing",
          "bodyByteEqual",
          "true",
          String(receipt.privateAnonBodyEqualMissing),
          receipt.privateAnonBodyEqualMissing === true
        ),
        assertion(
          "dom-state",
          "dom:private-anon",
          "notFoundText",
          "Not Found",
          receipt.privateAnonBodyIsNotFound ? "Not Found" : "",
          receipt.privateAnonBodyIsNotFound === true
        ),
      ]),
    };
  }

  if (scenarioId === "password-unlock-cycle") {
    return {
      "password-unlock-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:prompt",
          "h1",
          receipt.passAInitialH1,
          receipt.passAInitialH1,
          receipt.passAInitialH1.length > 0
        ),
        assertion(
          "dom-state",
          "dom:prompt",
          "passwordProtected",
          "true",
          String(receipt.passAInitialPrompt),
          receipt.passAInitialPrompt === true
        ),
        assertion(
          "dom-state",
          "dom:prompt",
          "bodyExcludesMarker",
          "true",
          String(!receipt.passAInitialHasMarker),
          !receipt.passAInitialHasMarker === true
        ),
        assertion(
          "dom-state",
          "request:wrong-unlock",
          "status",
          "401",
          String(receipt.wrongUnlockStatus),
          receipt.wrongUnlockStatus === 401
        ),
        assertion(
          "dom-state",
          "dom:after-wrong",
          "promptRetained",
          "true",
          String(receipt.wrongRetryPrompt),
          receipt.wrongRetryPrompt === true
        ),
        assertion(
          "dom-state",
          "request:correct-unlock",
          "status",
          "302",
          String(receipt.passAUnlockedStatus),
          receipt.passAUnlockedStatus === 302
        ),
        assertion(
          "dom-state",
          "dom:unlocked",
          "h1",
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:unlocked",
          "preVisible",
          "true",
          String(receipt.passAUnlockedPreVisible),
          receipt.passAUnlockedPreVisible === true
        ),
        assertion(
          "dom-state",
          "dom:unlocked",
          "bodyHasMarker",
          "true",
          String(receipt.passAUnlockedHasMarker),
          receipt.passAUnlockedHasMarker === true
        ),
        assertion(
          "dom-state",
          "dom:unlocked-reload",
          "h1",
          receipt.passAUnlockedReloadH1,
          receipt.passAUnlockedReloadH1,
          receipt.passAUnlockedReloadH1.length > 0
        ),
      ]),
    };
  }

  if (scenarioId === "cross-entry-unlock-isolation") {
    return {
      "cross-entry-isolation-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:entry-a",
          "unlockedH1",
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1.length > 0
        ),
        assertion(
          "dom-state",
          "dom:entry-b",
          "promptH1",
          receipt.passBInitialH1,
          receipt.passBInitialH1,
          receipt.passBInitialH1.length > 0
        ),
        assertion(
          "dom-state",
          "dom:entry-b",
          "promptShown",
          "true",
          String(receipt.passBInitialPrompt),
          receipt.passBInitialPrompt === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b",
          "excludesMarkerA",
          "true",
          String(!receipt.passBInitialHasMarkerA),
          !receipt.passBInitialHasMarkerA === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b",
          "excludesBodyB",
          "true",
          String(!receipt.passBInitialHasMarkerB),
          !receipt.passBInitialHasMarkerB === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b-unlocked",
          "h1",
          receipt.passBUnlockedH1,
          receipt.passBUnlockedH1,
          receipt.passBUnlockedH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:entry-b-unlocked",
          "preVisible",
          "true",
          String(receipt.passBUnlockedPreVisible),
          receipt.passBUnlockedPreVisible === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b-unlocked",
          "bodyHasMarkerB",
          "true",
          String(receipt.passBUnlockedHasMarkerB),
          receipt.passBUnlockedHasMarkerB === true
        ),
        assertion(
          "dom-state",
          "dom:entry-b-reload",
          "h1",
          receipt.passBUnlockedReloadH1,
          receipt.passBUnlockedReloadH1,
          receipt.passBUnlockedReloadH1.length > 0
        ),
      ]),
    };
  }

  if (scenarioId === "no-shared-cache-leak") {
    return {
      "cache-proof-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:entry-a",
          "unlockedH1",
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1,
          receipt.passAUnlockedH1.length > 0
        ),
        assertion(
          "dom-state",
          "request:ungated-a",
          "status",
          "200",
          String(receipt.ungatedAStatus),
          receipt.ungatedAStatus === 200
        ),
        assertion(
          "dom-state",
          "response:ungated-a",
          "promptNotBody",
          "true",
          String(receipt.ungatedAIsPrompt),
          receipt.ungatedAIsPrompt === true
        ),
        assertion(
          "dom-state",
          "response:ungated-a",
          "excludesMarker",
          "true",
          String(!receipt.ungatedAHasMarker),
          !receipt.ungatedAHasMarker === true
        ),
      ]),
    };
  }

  if (scenarioId === "publish-front-admin-parity") {
    return {
      "front-list-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:list",
          "h1",
          receipt.listH1,
          receipt.listH1,
          receipt.listH1.length > 0
        ),
        assertion(
          "dom-state",
          "dom:list",
          "publicLinkPresent",
          "true",
          String(receipt.listHasPublicLink),
          receipt.listHasPublicLink === true
        ),
        assertion(
          "dom-state",
          "dom:list",
          "privateLinkAbsent",
          "true",
          String(!receipt.listHasPrivateLink),
          !receipt.listHasPrivateLink === true
        ),
        assertion(
          "dom-state",
          "dom:list",
          "passALinkAbsent",
          "true",
          String(!receipt.listHasPassALink),
          !receipt.listHasPassALink === true
        ),
        assertion(
          "dom-state",
          "dom:list",
          "passBLinkAbsent",
          "true",
          String(!receipt.listHasPassBLink),
          !receipt.listHasPassBLink === true
        ),
        assertion(
          "dom-state",
          "dom:list",
          "emptyMarkerAbsent",
          "true",
          String(receipt.listEmptyMarkerAbsent),
          receipt.listEmptyMarkerAbsent === true
        ),
        assertion(
          "dom-state",
          "request:search",
          "status",
          "200",
          String(receipt.searchStatus),
          receipt.searchStatus === 200
        ),
        assertion(
          "dom-state",
          "response:search",
          "publicPresent",
          "true",
          String(receipt.searchHasPublic),
          receipt.searchHasPublic === true
        ),
        assertion(
          "dom-state",
          "response:search",
          "privateAbsent",
          "true",
          String(!receipt.searchHasPrivate),
          !receipt.searchHasPrivate === true
        ),
        assertion(
          "dom-state",
          "response:search",
          "passAAbsent",
          "true",
          String(!receipt.searchHasPassA),
          !receipt.searchHasPassA === true
        ),
        assertion(
          "dom-state",
          "response:search",
          "passBAbsent",
          "true",
          String(!receipt.searchHasPassB),
          !receipt.searchHasPassB === true
        ),
      ]),
    };
  }

  throw new SmokeError(
    "smoke_output_invalid",
    "TASK-517 scenario has no public variant assertions"
  );
}
