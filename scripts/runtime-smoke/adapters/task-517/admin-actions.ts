import { SmokeError } from "../../contracts";
import type { SmokeVisibleAssertionResult } from "../types";
import { assertion } from "./assertions";
import type { Task517BrowserReceipt } from "./receipt";
import type { Task517ScenarioId } from "./scenarios";

/** Per-variant visible assertions for the admin-surface flows of a TASK-517 scenario.
 * The orchestrator (scenario-assertions.ts) merges these with the public-surface blocks
 * before building the manifestable variant results. */
export function buildTask517AdminVariantAssertions(
  scenarioId: Task517ScenarioId,
  receipt: Task517BrowserReceipt
): Readonly<Record<string, readonly SmokeVisibleAssertionResult[]>> {
  if (
    scenarioId === "anon-public-cached-render" ||
    scenarioId === "password-unlock-cycle" ||
    scenarioId === "cross-entry-unlock-isolation"
  ) {
    return Object.freeze({});
  }

  if (scenarioId === "private-anon-uniform-404") {
    return {
      "admin-bypass-light": Object.freeze([
        assertion(
          "dom-state",
          "request:private-entry",
          "adminAuthedStatus",
          "200",
          String(receipt.adminAuthedStatus),
          receipt.adminAuthedStatus === 200
        ),
        assertion(
          "dom-state",
          "dom:private-authed",
          "h1",
          receipt.adminAuthedH1,
          receipt.adminAuthedH1,
          receipt.adminAuthedH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:private-authed",
          "preVisible",
          "true",
          String(receipt.adminAuthedPreVisible),
          receipt.adminAuthedPreVisible === true
        ),
      ]),
      "admin-bypass-dark": Object.freeze([
        assertion(
          "dom-state",
          "dom:private-authed-dark",
          "h1",
          receipt.darkAuthedH1,
          receipt.darkAuthedH1,
          receipt.darkAuthedH1.length > 0
        ),
        assertion(
          "geometry",
          "dom:private-authed-dark",
          "preVisible",
          "true",
          String(receipt.darkAuthedPreVisible),
          receipt.darkAuthedPreVisible === true
        ),
      ]),
    };
  }

  if (scenarioId === "no-shared-cache-leak") {
    return {
      "private-404-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:private-authed",
          "h1",
          receipt.adminAuthedH1,
          receipt.adminAuthedH1,
          receipt.adminAuthedH1.length > 0
        ),
        assertion(
          "dom-state",
          "request:ungated-private",
          "status",
          "404",
          String(receipt.ungatedPrivateStatus),
          receipt.ungatedPrivateStatus === 404
        ),
        assertion(
          "dom-state",
          "response:ungated-private",
          "notFound",
          "true",
          String(receipt.ungatedPrivateIsNotFound),
          receipt.ungatedPrivateIsNotFound === true
        ),
      ]),
    };
  }

  if (scenarioId === "publish-front-admin-parity") {
    return {
      "admin-editor-light": Object.freeze([
        assertion(
          "dom-state",
          "dom:editor",
          "heading",
          receipt.editorHeading,
          receipt.editorHeading,
          receipt.editorHeading.length > 0
        ),
        assertion(
          "dom-state",
          "dom:editor",
          "titleValue",
          receipt.editorTitleValue,
          receipt.editorTitleValue,
          receipt.editorTitleValue.length > 0
        ),
        assertion(
          "geometry",
          "dom:editor",
          "titleVisible",
          "true",
          String(receipt.editorTitleVisible),
          receipt.editorTitleVisible === true
        ),
        assertion(
          "dom-state",
          "dom:editor",
          "slugValue",
          receipt.editorSlugValue,
          receipt.editorSlugValue,
          receipt.editorSlugValue.length > 0
        ),
        assertion(
          "geometry",
          "dom:editor",
          "slugVisible",
          "true",
          String(receipt.editorSlugVisible),
          receipt.editorSlugVisible === true
        ),
      ]),
      "admin-editor-dark": Object.freeze([
        assertion(
          "dom-state",
          "dom:editor-dark",
          "titleValue",
          receipt.darkEditorTitleValue,
          receipt.darkEditorTitleValue,
          receipt.darkEditorTitleValue.length > 0
        ),
        assertion(
          "geometry",
          "dom:editor-dark",
          "titleVisible",
          "true",
          String(receipt.darkEditorTitleVisible),
          receipt.darkEditorTitleVisible === true
        ),
        assertion(
          "dom-state",
          "dom:editor-dark",
          "slugValue",
          receipt.darkEditorSlugValue,
          receipt.darkEditorSlugValue,
          receipt.darkEditorSlugValue.length > 0
        ),
        assertion(
          "geometry",
          "dom:editor-dark",
          "slugVisible",
          "true",
          String(receipt.darkEditorSlugVisible),
          receipt.darkEditorSlugVisible === true
        ),
      ]),
    };
  }

  throw new SmokeError("smoke_output_invalid", "TASK-517 scenario has no admin variant assertions");
}
