import { SmokeError } from "../../contracts";
import type { PlainJsonObject } from "../../workers/contracts";
import type { Task517BrowserActionConfig } from "./config";
export interface Task517BrowserReceipt extends PlainJsonObject {
  readonly scenarioId: string;
  readonly theme: string;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly anonPublicStatus: number;
  readonly anonPublicSecondStatus: number;
  readonly anonPublicFirstMs: number;
  readonly anonPublicSecondMs: number;
  readonly anonPublicSecondFaster: boolean;
  readonly anonPublicBodyMatches: boolean;
  readonly anonPublicH1: string;
  readonly anonPublicPreVisible: boolean;
  readonly anonPublicPreHeight: number;
  readonly privateAnonStatus: number;
  readonly missingAnonStatus: number;
  readonly privateAnonBodyEqualMissing: boolean;
  readonly privateAnonBodyIsNotFound: boolean;
  readonly adminAuthedStatus: number;
  readonly adminAuthedH1: string;
  readonly adminAuthedPreVisible: boolean;
  readonly darkAuthedH1: string;
  readonly darkAuthedPreVisible: boolean;
  readonly passAInitialH1: string;
  readonly passAInitialPrompt: boolean;
  readonly passAInitialHasMarker: boolean;
  readonly wrongUnlockStatus: number;
  readonly wrongRetryPrompt: boolean;
  readonly passAUnlockedStatus: number;
  readonly passAUnlockedH1: string;
  readonly passAUnlockedPreVisible: boolean;
  readonly passAUnlockedHasMarker: boolean;
  readonly passAUnlockedReloadH1: string;
  readonly passBInitialH1: string;
  readonly passBInitialPrompt: boolean;
  readonly passBInitialHasMarkerA: boolean;
  readonly passBInitialHasMarkerB: boolean;
  readonly passBUnlockedH1: string;
  readonly passBUnlockedPreVisible: boolean;
  readonly passBUnlockedHasMarkerB: boolean;
  readonly passBUnlockedReloadH1: string;
  readonly passBUnlockedStatus: number;
  readonly ungatedAStatus: number;
  readonly ungatedAIsPrompt: boolean;
  readonly ungatedAHasMarker: boolean;
  readonly ungatedPrivateStatus: number;
  readonly ungatedPrivateIsNotFound: boolean;
  readonly listH1: string;
  readonly listHasPublicLink: boolean;
  readonly listHasPrivateLink: boolean;
  readonly listHasPassALink: boolean;
  readonly listHasPassBLink: boolean;
  readonly listEmptyMarkerAbsent: boolean;
  readonly searchStatus: number;
  readonly searchHasPublic: boolean;
  readonly searchHasPrivate: boolean;
  readonly searchHasPassA: boolean;
  readonly searchHasPassB: boolean;
  readonly editorHeading: string;
  readonly editorTitleValue: string;
  readonly editorTitleVisible: boolean;
  readonly editorSlugValue: string;
  readonly editorSlugVisible: boolean;
  readonly darkEditorTitleValue: string;
  readonly darkEditorTitleVisible: boolean;
  readonly darkEditorSlugValue: string;
  readonly darkEditorSlugVisible: boolean;
}

const RECEIPT_KEYS = Object.freeze([
  "adminAuthedH1",
  "adminAuthedPreVisible",
  "adminAuthedStatus",
  "anonPublicBodyMatches",
  "anonPublicFirstMs",
  "anonPublicH1",
  "anonPublicPreHeight",
  "anonPublicPreVisible",
  "anonPublicSecondFaster",
  "anonPublicSecondMs",
  "anonPublicSecondStatus",
  "anonPublicStatus",
  "consoleErrors",
  "darkAuthedH1",
  "darkAuthedPreVisible",
  "darkEditorSlugValue",
  "darkEditorSlugVisible",
  "darkEditorTitleValue",
  "darkEditorTitleVisible",
  "editorHeading",
  "editorSlugValue",
  "editorSlugVisible",
  "editorTitleValue",
  "editorTitleVisible",
  "listEmptyMarkerAbsent",
  "listH1",
  "listHasPassALink",
  "listHasPassBLink",
  "listHasPrivateLink",
  "listHasPublicLink",
  "missingAnonStatus",
  "pageErrors",
  "passAInitialH1",
  "passAInitialHasMarker",
  "passAInitialPrompt",
  "passAUnlockedH1",
  "passAUnlockedHasMarker",
  "passAUnlockedPreVisible",
  "passAUnlockedReloadH1",
  "passAUnlockedStatus",
  "passBInitialH1",
  "passBInitialHasMarkerA",
  "passBInitialHasMarkerB",
  "passBInitialPrompt",
  "passBUnlockedH1",
  "passBUnlockedHasMarkerB",
  "passBUnlockedPreVisible",
  "passBUnlockedReloadH1",
  "passBUnlockedStatus",
  "privateAnonBodyEqualMissing",
  "privateAnonBodyIsNotFound",
  "privateAnonStatus",
  "scenarioId",
  "searchHasPassA",
  "searchHasPassB",
  "searchHasPrivate",
  "searchHasPublic",
  "searchStatus",
  "theme",
  "ungatedAHasMarker",
  "ungatedAIsPrompt",
  "ungatedAStatus",
  "ungatedPrivateIsNotFound",
  "ungatedPrivateStatus",
  "wrongRetryPrompt",
  "wrongUnlockStatus",
] as const);

function exactKeys(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.keys(value).sort().join(",");
}

/** Strict receipt validation: exact keys + scenario-level flow invariants. */
export function assertTask517BrowserReceipt(
  value: unknown,
  cfg: Task517BrowserActionConfig
): asserts value is Task517BrowserReceipt {
  if (exactKeys(value) !== RECEIPT_KEYS.join(",")) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 browser receipt keys are invalid");
  }
  const receipt = value as Task517BrowserReceipt;
  const fail = (reason: string): never => {
    throw new SmokeError("smoke_output_invalid", `TASK-517 browser receipt ${reason}`);
  };
  if (receipt.scenarioId !== cfg.scenarioId) fail("scenario drifted");
  if (receipt.theme !== cfg.theme) fail("theme drifted");
  if (!Array.isArray(receipt.consoleErrors) || !Array.isArray(receipt.pageErrors)) {
    fail("error arrays are invalid");
  }
  if (receipt.consoleErrors.length !== 0 || receipt.pageErrors.length !== 0) {
    fail(
      "console errors surfaced " +
        JSON.stringify({
          scenarioId: receipt.scenarioId,
          consoleErrors: receipt.consoleErrors.slice(0, 5),
          pageErrors: receipt.pageErrors.slice(0, 5),
        })
    );
  }
  const scenarioId = receipt.scenarioId;
  if (scenarioId === "anon-public-cached-render") {
    if (
      receipt.anonPublicStatus !== 200 ||
      receipt.anonPublicSecondStatus !== 200 ||
      receipt.anonPublicFirstMs < 0 ||
      receipt.anonPublicSecondMs < 0 ||
      receipt.anonPublicSecondFaster !== true ||
      receipt.anonPublicBodyMatches !== true ||
      receipt.anonPublicH1 !== cfg.titles.public ||
      receipt.anonPublicPreVisible !== true ||
      receipt.anonPublicPreHeight <= 0
    ) {
      fail(
        "anon cached render proof failed " +
          JSON.stringify({
            status: receipt.anonPublicStatus,
            secondStatus: receipt.anonPublicSecondStatus,
            firstMs: receipt.anonPublicFirstMs,
            secondMs: receipt.anonPublicSecondMs,
            secondFaster: receipt.anonPublicSecondFaster,
            bodyMatches: receipt.anonPublicBodyMatches,
            h1: receipt.anonPublicH1,
            expectedH1: cfg.titles.public,
            preVisible: receipt.anonPublicPreVisible,
            preHeight: receipt.anonPublicPreHeight,
          })
      );
    }
    return;
  }
  if (scenarioId === "private-anon-uniform-404") {
    if (
      receipt.privateAnonStatus !== 404 ||
      receipt.missingAnonStatus !== 404 ||
      receipt.privateAnonBodyEqualMissing !== true ||
      receipt.privateAnonBodyIsNotFound !== true ||
      receipt.adminAuthedStatus !== 200 ||
      receipt.adminAuthedH1 !== cfg.titles.private ||
      receipt.adminAuthedPreVisible !== true ||
      receipt.darkAuthedH1 !== cfg.titles.private ||
      receipt.darkAuthedPreVisible !== true
    ) {
      fail("private 404 / admin bypass proof failed");
    }
    return;
  }
  if (scenarioId === "password-unlock-cycle") {
    if (
      receipt.passAInitialH1 !== cfg.titles.passA ||
      receipt.passAInitialPrompt !== true ||
      receipt.passAInitialHasMarker !== false ||
      receipt.wrongUnlockStatus !== 401 ||
      receipt.wrongRetryPrompt !== true ||
      receipt.passAUnlockedStatus !== 302 ||
      receipt.passAUnlockedH1 !== cfg.titles.passA ||
      receipt.passAUnlockedPreVisible !== true ||
      receipt.passAUnlockedHasMarker !== true ||
      receipt.passAUnlockedReloadH1 !== cfg.titles.passA
    ) {
      fail("password unlock cycle proof failed");
    }
    return;
  }
  if (scenarioId === "cross-entry-unlock-isolation") {
    if (
      receipt.passAUnlockedStatus !== 302 ||
      receipt.passAUnlockedH1 !== cfg.titles.passA ||
      receipt.passAUnlockedPreVisible !== true ||
      receipt.passAUnlockedHasMarker !== true ||
      receipt.passBInitialH1 !== cfg.titles.passB ||
      receipt.passBInitialPrompt !== true ||
      receipt.passBInitialHasMarkerA !== false ||
      receipt.passBInitialHasMarkerB !== false ||
      receipt.passBUnlockedStatus !== 302 ||
      receipt.passBUnlockedH1 !== cfg.titles.passB ||
      receipt.passBUnlockedPreVisible !== true ||
      receipt.passBUnlockedHasMarkerB !== true ||
      receipt.passBUnlockedReloadH1 !== cfg.titles.passB
    ) {
      fail("cross-entry unlock isolation proof failed");
    }
    return;
  }
  if (scenarioId === "no-shared-cache-leak") {
    if (
      receipt.passAUnlockedStatus !== 302 ||
      receipt.passAUnlockedH1 !== cfg.titles.passA ||
      receipt.passAUnlockedHasMarker !== true ||
      receipt.ungatedAStatus !== 200 ||
      receipt.ungatedAIsPrompt !== true ||
      receipt.ungatedAHasMarker !== false ||
      receipt.adminAuthedStatus !== 200 ||
      receipt.adminAuthedH1 !== cfg.titles.private ||
      receipt.adminAuthedPreVisible !== true ||
      receipt.ungatedPrivateStatus !== 404 ||
      receipt.ungatedPrivateIsNotFound !== true
    ) {
      fail("shared-cache leak proof failed");
    }
    return;
  }
  if (scenarioId === "publish-front-admin-parity") {
    if (
      receipt.listH1 !== cfg.contentTypeName ||
      receipt.listHasPublicLink !== true ||
      receipt.listHasPrivateLink !== false ||
      receipt.listHasPassALink !== false ||
      receipt.listHasPassBLink !== false ||
      receipt.listEmptyMarkerAbsent !== true ||
      receipt.searchStatus !== 200 ||
      receipt.searchHasPublic !== true ||
      receipt.searchHasPrivate !== false ||
      receipt.searchHasPassA !== false ||
      receipt.searchHasPassB !== false ||
      receipt.editorHeading !== cfg.editorLabel ||
      receipt.editorTitleValue !== cfg.titles.private ||
      receipt.editorTitleVisible !== true ||
      receipt.editorSlugValue !== cfg.slugs.private ||
      receipt.editorSlugVisible !== true ||
      receipt.darkEditorTitleValue !== cfg.titles.private ||
      receipt.darkEditorTitleVisible !== true ||
      receipt.darkEditorSlugValue !== cfg.slugs.private ||
      receipt.darkEditorSlugVisible !== true
    ) {
      fail(
        "publish/front/admin parity proof failed " +
          JSON.stringify({
            listH1: receipt.listH1,
            expectedListH1: cfg.contentTypeName,
            listHasPublicLink: receipt.listHasPublicLink,
            listHasPrivateLink: receipt.listHasPrivateLink,
            listHasPassALink: receipt.listHasPassALink,
            listHasPassBLink: receipt.listHasPassBLink,
            listEmptyMarkerAbsent: receipt.listEmptyMarkerAbsent,
            searchStatus: receipt.searchStatus,
            searchHasPublic: receipt.searchHasPublic,
            searchHasPrivate: receipt.searchHasPrivate,
            searchHasPassA: receipt.searchHasPassA,
            searchHasPassB: receipt.searchHasPassB,
            editorHeading: receipt.editorHeading,
            expectedEditorLabel: cfg.editorLabel,
            editorTitleValue: receipt.editorTitleValue,
            expectedTitle: cfg.titles.private,
            editorTitleVisible: receipt.editorTitleVisible,
            editorSlugValue: receipt.editorSlugValue,
            expectedSlug: cfg.slugs.private,
            editorSlugVisible: receipt.editorSlugVisible,
            darkEditorTitleValue: receipt.darkEditorTitleValue,
            darkEditorTitleVisible: receipt.darkEditorTitleVisible,
            darkEditorSlugValue: receipt.darkEditorSlugValue,
            darkEditorSlugVisible: receipt.darkEditorSlugVisible,
          })
      );
    }
    return;
  }
  fail("scenario is unregistered");
}
