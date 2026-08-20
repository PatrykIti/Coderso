import type { PageBlockPath } from "./pageBlockPaths";
import { getPageBlockAtPath } from "./pageBlockPaths";
import type { PageBlockGridPlacementTarget } from "./pageBlockGridPlacement";
import { resolvePageBlockGridPlacement } from "./pageBlockGridPlacement";
import type { PageBlockV2, PageSectionV2 } from "./pageDocumentV2";

export interface ToolbarRegistryBlockTarget {
  /**
   * Canonical registry block path: the selected path when present and
   * resolvable, otherwise the first root path `[{ index: 0 }]` when a root
   * exists. A stale selected path never falls back to the first root, and an
   * unresolvable path yields `null` (no registry field/control renders).
   */
  path: PageBlockPath | null;
  /** Resolved block in the BASE section (base-only controls commit here). */
  base: PageBlockV2 | null;
  /** Resolved block in the EFFECTIVE (active-device) section. */
  effective: PageBlockV2 | null;
  /**
   * Grid placement of the resolved base root block, used to gate span
   * controls. The resolver runs only for a non-null resolved path.
   */
  placement: PageBlockGridPlacementTarget;
}

/**
 * TASK-539-03-L03 canonical registry block target: the selected path when
 * present, otherwise the first root path `[{ index: 0 }]` when a root exists.
 * The exact candidate must resolve in BOTH the base and effective sections
 * before it is exposed; a stale selected path never falls back to the first
 * root, and an unresolvable path renders no block registry field/control.
 */
export const resolveToolbarRegistryBlockTarget = (
  selectedBlockPath: PageBlockPath | null,
  baseSection: PageSectionV2,
  effectiveSection: PageSectionV2
): ToolbarRegistryBlockTarget => {
  const candidate = selectedBlockPath ?? (baseSection.blocks[0] ? ([{ index: 0 }] as const) : null);
  const resolvedBase = candidate ? getPageBlockAtPath(baseSection, candidate) : null;
  const resolvedEffective = candidate ? getPageBlockAtPath(effectiveSection, candidate) : null;
  const path = candidate && resolvedBase && resolvedEffective ? candidate : null;
  return {
    path,
    base: path ? resolvedBase : null,
    effective: path ? resolvedEffective : null,
    placement: path
      ? resolvePageBlockGridPlacement(baseSection, path, { includeHiddenBlocks: true })
      : "none",
  };
};
