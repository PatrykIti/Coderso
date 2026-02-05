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

test("hero spacing falls back to defaults when spacing is empty", () => {
  const html = renderToString(
    <HeroBlock data={{ ...heroDefaults, spacing: {} }} variant="centered" />
  );
  expect(html).toContain("padding-top:3rem");
  expect(html).toContain("padding-bottom:3rem");
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
        media: {
          type: "image",
          source: "library",
          assetId: "asset-1",
          src: "https://example.com/hero.jpg",
        },
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

test("hero shows media placeholder when type selected without url", () => {
  const html = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image" } }}
      variant="split"
    />
  );

  expect(html).toContain("Add media URL");
});

test("hero split shows placeholder when media type is none", () => {
  const html = renderToString(
    <HeroBlock data={heroDefaults} variant="split" />
  );

  expect(html).toContain("Select media type");
});

test("hero media-left places content in right column", () => {
  const html = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image", src: "/hero.jpg" } }}
      variant="media-left"
    />
  );

  expect(html).toContain("md:grid-cols-2");
  const colStartRight = html.indexOf("md:col-start-2");
  const colStartLeft = html.indexOf("md:col-start-1");
  expect(colStartRight).toBeGreaterThan(-1);
  expect(colStartLeft).toBeGreaterThan(-1);
  expect(colStartRight).toBeLessThan(colStartLeft);
});
