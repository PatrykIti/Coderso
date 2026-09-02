// TASK-105-08-04 (Item E): customScreenEntryPresentationMedia residual
// branches — malformed key JSON, structurally invalid route keys, and the
// reducer exhaustiveness guard for an unknown action.

import { expect, test } from "vitest";

import {
  buildPresentationMediaRequestKey,
  decodeAndValidatePresentationMediaRequestKey,
  initializeMediaMachineState,
  mediaAttemptReducer,
} from "../../../core/admin/ui/custom-screens/customScreenEntryPresentationMedia";

test("media key codec rejects malformed JSON and non-tuple route keys", () => {
  expect(() => decodeAndValidatePresentationMediaRequestKey("not-json")).toThrow(
    "custom_screen_presentation_media_invalid"
  );
  // route key parses but is not a [screenId, entryId, isCreateMode] tuple
  expect(() => buildPresentationMediaRequestKey(JSON.stringify(["only", "two"]), [])).toThrow(
    "custom_screen_presentation_media_invalid"
  );
});

test("media attempt reducer exhaustiveness guard reports unknown actions", () => {
  const state = initializeMediaMachineState({ requestKey: "rk", requestedIds: [] });
  // Runtime-crafted rogue action (no type cast in source) reaches the default.
  const rogue = JSON.parse('{"type":"bogus-action"}');
  expect(() => mediaAttemptReducer(state, rogue)).toThrow(
    "Unhandled media-attempt action: [object Object]"
  );
});
