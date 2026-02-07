import { expect, test } from "bun:test";
import type { ComponentType } from "react";

import { renderPublicPageHtml } from "../../../core/site/renderPublicPage";
import {
  createHeroWidget,
  heroDefaults,
  type HeroData,
} from "../../../core/widgets/core/hero";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

test("renderPublicPageHtml renders title and preview banner", () => {
  const html = renderPublicPageHtml({
    title: "About Us",
    blocks: [],
    cssHref: "/site/assets/site.css",
    inlineCss: ":root{--color-bg:#ffffff;}",
    isPreview: true,
  });

  expect(html).toContain("<title>About Us</title>");
  expect(html).toContain("Preview mode");
  expect(html).toContain("/site/assets/site.css");
  expect(html).toContain("--color-bg:#ffffff");
});

test("renderPublicPageHtml includes dev module scripts when provided", () => {
  const html = renderPublicPageHtml({
    title: "Dev preview",
    blocks: [],
    inlineCss: ":root{--color-bg:#fff;}",
    devModuleScripts: [
      "http://localhost:5174/site/@vite/client",
      "http://localhost:5174/site/main.ts",
    ],
  });

  expect(html).toContain("http://localhost:5174/site/@vite/client");
  expect(html).toContain("http://localhost:5174/site/main.ts");
  expect(html).toContain("type=\"module\"");
});

test("renderPublicPageHtml applies wrapper settings and inherited block defaults", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Home",
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        variant: "centered",
        data: heroDefaults,
        layout: {
          container: "inherit",
          padding: { top: "inherit", bottom: "inherit" },
          margin: { top: "none", bottom: "none" },
          background: { color: "transparent", image: null },
        },
      },
    ],
    layoutSettings: {
      wrapper: {
        container: "default",
        maxWidth: "5xl",
        padding: { top: "md", bottom: "lg" },
        background: {
          color: "#fafafa",
          image: null,
          media: {
            type: "none",
            source: "external",
            src: null,
          },
        },
      },
      sections: {
        gap: "xl",
        defaults: {
          container: "narrow",
          padding: { top: "sm", bottom: "sm" },
          margin: { top: "none", bottom: "none" },
        },
      },
      applyDefaultsToNewBlocks: false,
    },
  });

  expect(html).toContain("max-w-5xl");
  expect(html).toContain("gap-12");
  expect(html).toContain("pt-6");
  expect(html).toContain("pb-8");
  expect(html).toContain("background-color:#fafafa");
  expect(html).toContain("max-w-3xl");
  expect(html).toContain("pt-4");
});

test("renderPublicPageHtml renders wrapper background video when configured", () => {
  const html = renderPublicPageHtml({
    title: "Home",
    blocks: [],
    layoutSettings: {
      wrapper: {
        container: "full",
        padding: { top: "none", bottom: "none" },
        background: {
          color: "transparent",
          image: null,
          media: {
            type: "video",
            source: "external",
            src: "https://cdn.example.com/background.mp4",
          },
        },
      },
      sections: {
        gap: "none",
        defaults: {
          container: "default",
          padding: { top: "xl", bottom: "xl" },
          margin: { top: "none", bottom: "none" },
        },
      },
      applyDefaultsToNewBlocks: false,
    },
  });

  expect(html).toContain("<video");
  expect(html).toContain("https://cdn.example.com/background.mp4");
  expect(html).toContain("absolute inset-0 h-full w-full object-cover");
});

test("renderPublicPageHtml filters blocks by preview device visibility", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Home",
    previewDevice: "tablet",
    blocks: [
      {
        id: "hero-desktop",
        type: "hero",
        variant: "centered",
        data: { ...heroDefaults, headline: "Desktop Hero" },
        visibility: { enabled: true, devices: ["desktop"] },
      },
      {
        id: "hero-tablet",
        type: "hero",
        variant: "centered",
        data: { ...heroDefaults, headline: "Tablet Hero" },
        visibility: { enabled: true, devices: ["tablet"] },
      },
    ],
  });

  expect(html).not.toContain("Desktop Hero");
  expect(html).toContain("Tablet Hero");
});
