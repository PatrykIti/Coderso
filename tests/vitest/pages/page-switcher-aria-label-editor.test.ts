import { describe, expect, it } from "vitest";

import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import { pageBlockControlRegistry } from "../../../core/services/pages/pageEditorControlRegistry";
import { patchBlockControlForDevice } from "../../../core/services/pages/pageEditorMutationActions";

const ariaControls = () =>
  pageBlockControlRegistry.switcher.filter(
    (control) => control.id === "block.switcher.props.ariaLabel"
  );

describe("Page switcher ariaLabel editor control", () => {
  it("registers exactly one base-only text control with no stored fallback", () => {
    expect(ariaControls()).toHaveLength(1);
    expect(ariaControls()[0]).toEqual({
      id: "block.switcher.props.ariaLabel",
      panel: "content",
      target: "block",
      label: "Tab list label",
      path: ["props", "ariaLabel"],
      overridePath: ["props", "ariaLabel"],
      input: "text",
      responsive: false,
    });
  });

  it.each(["tablet", "mobile"] as const)(
    "writes the base value while previewing %s and creates no responsive override",
    (device) => {
      const block = createPageBlockV2("switcher", { id: "switcher" });
      const patched = patchBlockControlForDevice(
        block,
        device,
        ariaControls()[0]!,
        "Wybór stylu domu"
      );
      expect(patched.props.ariaLabel).toBe("Wybór stylu domu");
      expect(patched.responsive).toBeUndefined();
    }
  );

  it("clears the authored leaf and compacts empty responsive parents", () => {
    const block = createPageBlockV2("switcher", { id: "switcher" });
    block.props.ariaLabel = "Wybór stylu domu";
    const patched = patchBlockControlForDevice(block, "mobile", ariaControls()[0]!, "   ");
    expect(patched.props).not.toHaveProperty("ariaLabel");
    expect(patched.responsive).toBeUndefined();
  });
});
