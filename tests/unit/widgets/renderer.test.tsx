import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import type { WidgetEditorProps, WidgetBlock } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

test("renderer shows missing widget fallback", () => {
  clearWidgets();
  const html = renderToString(
    <WidgetRenderer block={{ id: "missing-1", type: "unknown", data: {} }} />
  );
  expect(html).toContain("Missing widget");
});

test("renderer respects visibility disabled", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "hero-1",
        type: "hero",
        variant: "centered",
        data: heroDefaults,
        visibility: { enabled: false, devices: ["desktop"] },
      }}
    />
  );
  expect(html).toBe("");
});

test("renderer applies layout classes", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const block: WidgetBlock = {
    id: "hero-2",
    type: "hero",
    variant: "centered",
    data: heroDefaults,
    layout: {
      container: "narrow",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "sm", bottom: "sm" },
      background: { color: "transparent" },
    },
  };

  const html = renderToString(<WidgetRenderer block={block} />);
  expect(html).toContain("max-w-3xl");
  expect(html).toContain("pt-12");
});
