import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WizardPanel } from "../../../core/admin/ui/pages/builder/WizardPanel";
import type { Block } from "../../../core/admin/ui/pages/builder/types";
import type { WidgetDefinition, WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = ({
  variant,
}) => <div>Wizard editor variant: {variant}</div>;

const widget: WidgetDefinition = {
  type: "dummy",
  title: "Dummy Widget",
  description: "Test widget",
  category: "content",
  variants: [{ id: "alpha", label: "Alpha" }],
  schema: { type: "object" },
  defaults: {},
  editor: {
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  },
  render: () => null,
};

const block: Block = {
  id: "block-1",
  type: "dummy",
  variant: "alpha",
  data: {},
  layout: {
    container: "default",
    padding: { top: "md", bottom: "md" },
    margin: { top: "none", bottom: "none" },
    background: { color: "transparent" },
  },
  visibility: { enabled: true, devices: ["desktop"] },
  editor: { mode: "wizard", wizardCompleted: false },
};

test("WizardPanel renders widget editor", () => {
  const html = renderToString(
    <WizardPanel widget={widget} block={block} onChange={() => {}} onComplete={() => {}} />
  );
  expect(html).toContain("Wizard editor variant");
  expect(html).toContain("Dummy Widget");
});
