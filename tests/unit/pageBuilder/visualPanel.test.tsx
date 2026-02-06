import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { VisualPanel } from "../../../core/admin/ui/pages/builder/VisualPanel";
import type { Block } from "../../../core/admin/ui/pages/builder/types";
import type {
  WidgetDefinition,
  WidgetEditorProps,
} from "../../../core/widgets/types";

const StubVisual: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => (
  <div>Hero visual editor body</div>
);
const StubEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

const baseBlock: Block = {
  id: "hero-1",
  type: "hero",
  variant: "centered",
  data: { headline: "Headline" },
  editor: {
    mode: "visual",
    wizardCompleted: true,
  },
};

function createWidget(
  capabilities?: WidgetDefinition["editorCapabilities"]
): WidgetDefinition {
  return {
    type: "hero",
    title: "Hero",
    category: "layout",
    variants: [
      { id: "centered", label: "Centered" },
      { id: "split", label: "Split" },
    ],
    schema: {},
    defaults: {},
    editor: {
      wizard: StubEditor,
      visual: StubVisual,
      advanced: StubEditor,
    },
    editorCapabilities: capabilities,
    render: () => null,
  };
}

test("VisualPanel keeps generic variant controls by default", () => {
  const html = renderToString(
    <VisualPanel
      widget={createWidget()}
      block={baseBlock}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Choose a visual style for this widget.");
  expect(html).toContain("Add variant preset");
  expect(html).toContain("Hero visual editor body");
});

test("VisualPanel hides generic variant controls when widget owns visual variants", () => {
  const html = renderToString(
    <VisualPanel
      widget={createWidget({ visualOwnsVariantSelection: true })}
      block={baseBlock}
      onChange={() => undefined}
    />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
  expect(html).toContain("Hero visual editor body");
});
