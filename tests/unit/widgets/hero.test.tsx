import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { createHeroWidget, heroDefaults, HeroBlock, type HeroData } from "../../../core/widgets/core/hero";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

test("hero renders defaults", () => {
  const html = renderToString(<HeroBlock data={heroDefaults} variant="centered" />);
  expect(html).toContain(heroDefaults.headline);
});

test("hero validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "hero-1",
      type: "hero",
      variant: "invalid",
      data: heroDefaults,
    })
  ).toThrow("widget_invalid_variant");
});
