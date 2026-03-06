import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
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
  const widget = createHeroWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBeTrue();

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
        background: {
          color: "#fff",
          gradient: "linear-gradient(#fff,#eee)",
          media: {
            type: "image",
            source: "library",
            assetId: "bg-asset-1",
            src: "https://example.com/bg.jpg",
          },
        },
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

test("hero media-left uses reversed layout", () => {
  const html = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image", src: "/hero.jpg" } }}
      variant="media-left"
    />
  );

  expect(html).toContain("md:flex-row-reverse");
});

test("hero centered uses selected image as background", () => {
  const html = renderToString(
    <HeroBlock
      data={{ ...heroDefaults, media: { type: "image", src: "/hero.jpg" } }}
      variant="centered"
    />
  );

  expect(html).toContain("background-image:url(/hero.jpg)");
});

test("hero applies style tokens to runtime output", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        media: { type: "image", src: "/hero.jpg" },
        style: {
          headlineSize: "5xl",
          textColor: "#112233",
          borderColor: "#445566",
          borderWidth: "2",
          borderRadius: "xl",
          mediaRadius: "lg",
          mediaBorderWidth: "3",
          primaryButtonBg: "#224466",
          primaryButtonText: "#ffffff",
          secondaryButtonBorder: "#123456",
        },
      }}
      variant="split"
    />
  );

  expect(html).toContain("text-5xl");
  expect(html).toContain("rounded-xl");
  expect(html).toContain("rounded-lg");
  expect(html).toContain("color:#112233");
  expect(html).toContain("border-width:2px");
  expect(html).toContain("border-width:3px");
  expect(html).toContain("border-color:#445566");
  expect(html).toContain("background:#224466");
});

test("hero renders background video when configured", () => {
  const html = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        background: {
          color: "#000000",
          gradient: "linear-gradient(120deg, #000000, #111111)",
          media: {
            type: "video",
            source: "external",
            src: "https://example.com/bg.mp4",
          },
        },
      }}
      variant="centered"
    />
  );

  expect(html).toContain("src=\"https://example.com/bg.mp4\"");
  expect(html).toContain("autoPlay");
  expect(html).toContain("object-cover");
});
