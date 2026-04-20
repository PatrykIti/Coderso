import { expect, test } from "vitest";

import {
  areRevisionSnapshotsEqual,
  serializeRevisionSnapshot,
} from "../../../core/services/content/revisionSnapshot";

test("serializeRevisionSnapshot normalizes object key order recursively", () => {
  const left = {
    b: 2,
    a: 1,
    nested: {
      z: true,
      y: "value",
    },
  };

  const right = {
    a: 1,
    nested: {
      y: "value",
      z: true,
    },
    b: 2,
  };

  expect(serializeRevisionSnapshot(left)).toBe(serializeRevisionSnapshot(right));
});

test("areRevisionSnapshotsEqual preserves array order semantics", () => {
  const ordered = {
    blocks: [
      { id: "a", content: "one" },
      { id: "b", content: "two" },
    ],
  };
  const reordered = {
    blocks: [
      { id: "b", content: "two" },
      { id: "a", content: "one" },
    ],
  };

  expect(areRevisionSnapshotsEqual(ordered, ordered)).toBe(true);
  expect(areRevisionSnapshotsEqual(ordered, reordered)).toBe(false);
});

