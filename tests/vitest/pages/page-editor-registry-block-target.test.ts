import { describe, expect, test } from "vitest";

import type { PageBlockPath } from "../../../core/services/pages/pageBlockPaths";
import {
  resolveToolbarRegistryBlockTarget,
  type ToolbarRegistryBlockTarget,
} from "../../../core/services/pages/pageEditorRegistryBlockTarget";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

const ROOT_PATH: PageBlockPath = [{ index: 0 }];
const SECOND_PATH: PageBlockPath = [{ index: 1 }];
const NESTED_PATH: PageBlockPath = [{ index: 0 }, { slotKey: "children", index: 0 }];

const block = (id: string): PageBlockV2 =>
  createPageBlockV2("text", { id, props: { text: id, format: "plain", align: "left" } });

const section = (blocks: PageBlockV2[]): PageSectionV2 =>
  createPageSectionV2("hero", {
    id: `sec-${blocks.map((b) => b.id).join("-")}`,
    name: "Sec",
    variant: "centered",
    blocks,
  });

const target = (
  base: PageSectionV2,
  effective: PageSectionV2,
  selected: PageBlockPath | null
): ToolbarRegistryBlockTarget => resolveToolbarRegistryBlockTarget(selected, base, effective);

describe("resolveToolbarRegistryBlockTarget", () => {
  test("null selection falls back to the first root path when a root exists", () => {
    const base = section([block("a"), block("b")]);
    const result = target(base, base, null);
    expect(result.path).toEqual(ROOT_PATH);
    expect(result.base?.id).toBe("a");
    expect(result.effective?.id).toBe("a");
  });

  test("a resolvable selected path wins over the first-root fallback", () => {
    const base = section([block("a"), block("b")]);
    const result = target(base, base, SECOND_PATH);
    expect(result.path).toEqual(SECOND_PATH);
    expect(result.base?.id).toBe("b");
    expect(result.effective?.id).toBe("b");
  });

  test("a stale selected path never falls back and yields no target", () => {
    const base = section([block("a")]);
    const result = target(base, base, [{ index: 1 }]);
    expect(result.path).toBeNull();
    expect(result.base).toBeNull();
    expect(result.effective).toBeNull();
    expect(result.placement).toBe("none");
  });

  test("an empty section yields no candidate target", () => {
    const empty = section([]);
    const result = target(empty, empty, null);
    expect(result.path).toBeNull();
    expect(result.base).toBeNull();
    expect(result.effective).toBeNull();
    expect(result.placement).toBe("none");
  });

  test("a path missing from the effective section is rejected", () => {
    const base = section([block("a"), block("b")]);
    const effective = section([block("a")]);
    const result = target(base, effective, SECOND_PATH);
    expect(result.path).toBeNull();
    expect(result.base).toBeNull();
    expect(result.effective).toBeNull();
  });

  test("nested paths resolve against both sections", () => {
    const nestedBase = createPageSectionV2("content", {
      id: "sec-nested",
      name: "Nested",
      blocks: [
        createPageBlockV2("container", {
          id: "blk-root",
          slots: { children: [block("inner")] },
        }),
      ],
    });
    const result = target(nestedBase, nestedBase, NESTED_PATH);
    expect(result.path).toEqual(NESTED_PATH);
    expect(result.base?.id).toBe("inner");
    expect(result.effective?.id).toBe("inner");
    expect(result.placement).toBe("none");
  });
});
