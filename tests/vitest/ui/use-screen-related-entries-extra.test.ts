// TASK-105-08-04 (Item H): useScreenRelatedEntries exhaustiveness guards —
// the related-attempt reducer rejects unknown actions through assertNever.

import { expect, test } from "vitest";

import {
  createRelatedAttemptMachine,
  relatedAttemptReducer,
} from "../../../core/admin/ui/custom-screens/hooks/useScreenRelatedEntries";

test("related attempt reducer rejects unknown actions", () => {
  const machine = createRelatedAttemptMachine({
    enabled: false,
    requestKey: "rk",
    targetLoadKey: "[]",
    hasTargets: false,
    plan: { blocks: [], targetSlugs: [], targetLoadKey: "[]", requestKey: "[]" },
  });
  const rogue = JSON.parse('{"type":"bogus-action"}');
  expect(() => relatedAttemptReducer(machine, rogue)).toThrow(
    "Unhandled related-attempt action: [object Object]"
  );
});
