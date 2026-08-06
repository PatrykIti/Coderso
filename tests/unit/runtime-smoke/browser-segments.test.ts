import { expect, test } from "bun:test";
import {
  compileBrowserDispatchPlan,
  splitMaterializedSegment,
} from "../../../scripts/runtime-smoke/browser/segment-compiler";
import type { BrowserPlanAction } from "../../../scripts/runtime-smoke/browser/contracts";

const action = (
  id: string,
  scenarioId: string,
  lane: BrowserPlanAction["lane"],
  captureOutputs: readonly string[] = [],
  isolated = false
): BrowserPlanAction => ({ id, scenarioId, lane, captureOutputs, isolated });

test("segment compiler preserves barriers, capture frontiers, and isolated actions", () => {
  const plan = compileBrowserDispatchPlan([
    action("a", "one", "run-code"),
    action("b", "one", "run-code", ["capture.b"]),
    action("c", "one", "run-code"),
    action("runtime", "one", "runtime"),
    action("d", "one", "run-code", [], true),
    action("e", "two", "run-code"),
    action("screen", "two", "standalone"),
  ]);
  expect(
    plan.dispatches.map((dispatch) =>
      dispatch.kind === "run-code" ? dispatch.actionIds : [dispatch.actionId]
    )
  ).toEqual([["a", "b"], ["c"], ["d"], ["e"], ["screen"]]);
  expect(plan).toMatchObject({
    logicalBrowserActions: 6,
    runCodeActions: 5,
    runCodeBatches: 4,
    standaloneActions: 1,
    physicalDispatches: 5,
  });
});

test("materialized size splitting is deterministic and rejects an oversized action", () => {
  const [segment] = compileBrowserDispatchPlan([
    action("a", "one", "run-code"),
    action("b", "one", "run-code"),
    action("c", "one", "run-code"),
  ]).dispatches;
  if (segment?.kind !== "run-code") throw new Error("expected run-code segment");
  const split = splitMaterializedSegment(
    segment,
    new Map([
      ["a", 6],
      ["b", 6],
      ["c", 4],
    ]),
    { maximumActions: 3, maximumSourceBytes: 10 }
  );
  expect(
    split.map(({ segmentId, actionIds, estimatedSourceBytes }) => ({
      segmentId,
      actionIds,
      estimatedSourceBytes,
    }))
  ).toEqual([
    { segmentId: "segment-0001-part-01", actionIds: ["a"], estimatedSourceBytes: 6 },
    { segmentId: "segment-0001-part-02", actionIds: ["b", "c"], estimatedSourceBytes: 10 },
  ]);
  expect(() =>
    splitMaterializedSegment(
      segment,
      new Map([
        ["a", 11],
        ["b", 1],
        ["c", 1],
      ]),
      {
        maximumActions: 3,
        maximumSourceBytes: 10,
      }
    )
  ).toThrow();
});
