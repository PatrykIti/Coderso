import { describe, expect, test } from "vitest";

import {
  blockOptions,
  canvasDeviceFrameClassMap,
  deviceScopeReadout,
  resolveToolbarTargetLabel,
  sectionOptions,
  toolbarPanelOptions,
} from "../../../core/admin/ui/pages/editor/pageEditorOptions";
import { pageBlockTypes, pageSectionTypes } from "../../../core/services/pages/pageDocumentV2";

describe("pageEditorOptions", () => {
  test("sectionOptions only include insertable section types with curated copy", () => {
    expect(sectionOptions.length).toBeGreaterThan(0);
    for (const option of sectionOptions) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
      expect(pageSectionTypes).toContain(option.type);
    }
    const types = new Set(sectionOptions.map((option) => option.type));
    expect(types.size).toBe(sectionOptions.length);
  });

  test("blockOptions only include editor-insertable block types with curated copy", () => {
    expect(blockOptions.length).toBeGreaterThan(0);
    for (const option of blockOptions) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
      expect(pageBlockTypes).toContain(option.type);
    }
    const types = new Set(blockOptions.map((option) => option.type));
    expect(types.size).toBe(blockOptions.length);
  });

  test("toolbarPanelOptions expose the static panel set with stable metadata", () => {
    expect(toolbarPanelOptions.some((option) => option.panel === "layout")).toBe(true);
    expect(toolbarPanelOptions.some((option) => option.panel === "visibility")).toBe(true);
    expect(toolbarPanelOptions.some((option) => option.panel === "host-appearance")).toBe(false);
    for (const option of toolbarPanelOptions) {
      expect(option.Icon).toBeTruthy();
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    }
  });

  test("device frame classes and scope readouts match the device metadata widths", () => {
    expect(canvasDeviceFrameClassMap.desktop).toBe("max-w-[1080px]");
    expect(canvasDeviceFrameClassMap.tablet).toBe("max-w-[744px]");
    expect(canvasDeviceFrameClassMap.mobile).toBe("max-w-[390px]");
    expect(deviceScopeReadout("desktop")).toBe("Desktop · 1080px");
    expect(deviceScopeReadout("tablet")).toBe("Tablet · 744px");
    expect(deviceScopeReadout("mobile")).toBe("Mobile · 390px");
  });

  test("resolveToolbarTargetLabel returns Page for null targets", () => {
    expect(resolveToolbarTargetLabel(null)).toBe("Page");
  });

  test("resolveToolbarTargetLabel resolves curated copy for block and section targets", () => {
    expect(resolveToolbarTargetLabel({ kind: "block", type: "heading" })).toBe("Heading");
    expect(resolveToolbarTargetLabel({ kind: "section", type: "hero" })).toBe("Hero");
  });

  test("resolveToolbarTargetLabel humanizes unknown types unless the fallback is disabled", () => {
    expect(resolveToolbarTargetLabel({ kind: "block", type: "unknown-type" as never })).toBe(
      "Unknown type"
    );
    expect(
      resolveToolbarTargetLabel(
        { kind: "block", type: "unknown-type" as never },
        { fallbackToTypeName: false }
      )
    ).toBe("Selection");
  });
});
