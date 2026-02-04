import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  createHeroWidget,
  heroDefaults,
  HeroBlock,
  type HeroData,
} from "../../../core/widgets/core/hero";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
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

test("hero validator accepts extended schema", () => {
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
      id: "hero-2",
      type: "hero",
      variant: "split",
      data: {
        ...heroDefaults,
        background: { color: "#fff", gradient: "linear-gradient(#fff,#eee)" },
        spacing: { paddingTop: "lg", paddingBottom: "xl" },
        layout: { align: "left", maxWidth: "2xl", contentWidth: "md" },
      },
    })
  ).not.toThrow();
});

test("hero renders slot content blocks", () => {
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
        id: "hero-parent",
        type: "hero",
        variant: "centered",
        data: { ...heroDefaults, headline: "Parent" },
        slots: {
          content: [
            {
              id: "hero-child",
              type: "hero",
              variant: "centered",
              data: { ...heroDefaults, headline: "Child" },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Parent");
  expect(html).toContain("Child");
});
