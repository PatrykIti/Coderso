import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import {
  createNavigationWidget,
  navigationDefaults,
  type NavigationData,
} from "../../../core/widgets/core/navigation";
import {
  createFooterWidget,
  footerDefaults,
  type FooterData,
} from "../../../core/widgets/core/footer";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import type { WidgetEditorProps, WidgetBlock } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;
const StubNavigationEditor: ComponentType<WidgetEditorProps<NavigationData>> = () => null;
const StubFooterEditor: ComponentType<WidgetEditorProps<FooterData>> = () => null;
const StubUnknownEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

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

test("renderer respects visibility devices in runtime preview", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const block: WidgetBlock = {
    id: "hero-visible-mobile-only",
    type: "hero",
    variant: "centered",
    data: heroDefaults,
    visibility: { enabled: true, devices: ["mobile"] },
  };

  const desktopHtml = renderToString(
    <WidgetRenderer block={block} previewDevice="desktop" />
  );
  const mobileHtml = renderToString(
    <WidgetRenderer block={block} previewDevice="mobile" />
  );

  expect(desktopHtml).toBe("");
  expect(mobileHtml).toContain("Build faster with Nextless");
});

test("renderer hides widget when visibility devices are empty", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const block: WidgetBlock = {
    id: "hero-visible-no-devices",
    type: "hero",
    variant: "centered",
    data: heroDefaults,
    visibility: { enabled: true, devices: [] },
  };

  const html = renderToString(
    <WidgetRenderer block={block} previewDevice="desktop" />
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
  expect(html).toContain("mt-4");
});

test("renderer resolves inherit layout tokens from page defaults", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const block: WidgetBlock = {
    id: "hero-inherit",
    type: "hero",
    variant: "centered",
    data: heroDefaults,
    layout: {
      container: "inherit",
      padding: { top: "inherit", bottom: "inherit" },
      margin: { top: "inherit", bottom: "inherit" },
      background: { color: "transparent" },
    },
  };

  const html = renderToString(
    <WidgetRenderer
      block={block}
      pageDefaults={{
        container: "narrow",
        padding: { top: "sm", bottom: "lg" },
        margin: { top: "xs", bottom: "sm" },
      }}
    />
  );

  expect(html).toContain("max-w-3xl");
  expect(html).toContain("pt-4");
  expect(html).toContain("pb-8");
  expect(html).toContain("mt-2");
  expect(html).toContain("mb-4");
});

test("renderer renders nested blocks", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );
  registerWidget({
    type: "container",
    title: "Container",
    description: "Container widget",
    category: "layout",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: {},
    editor: { wizard: StubEditor, visual: StubEditor, advanced: StubEditor },
    render: () => <div>Container</div>,
  });

  const block: WidgetBlock = {
    id: "container-parent",
    type: "container",
    variant: "default",
    data: {},
    children: [
      {
        id: "hero-child",
        type: "hero",
        variant: "centered",
        data: { ...heroDefaults, headline: "Child hero" },
      },
    ],
  };

  const html = renderToString(<WidgetRenderer block={block} />);
  expect(html).toContain("Container");
  expect(html).toContain("Child hero");
});

test("renderer passes slots to widget render", () => {
  clearWidgets();
  registerWidget({
    type: "slot-layout",
    title: "Slot Layout",
    description: "Slot Layout",
    category: "layout",
    slots: [{ id: "main", label: "Main" }],
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: {},
    editor: { wizard: StubEditor, visual: StubEditor, advanced: StubEditor },
    render: ({ slots }) => (
      <div>Slots:{slots?.main?.length ?? 0}</div>
    ),
  });

  const block: WidgetBlock = {
    id: "slot-1",
    type: "slot-layout",
    data: {},
    slots: {
      main: [{ id: "child-1", type: "hero", data: heroDefaults }],
    },
  };

  const html = renderToString(<WidgetRenderer block={block} />);
  const normalizedHtml = html.replace(/<!--.*?-->/g, "");
  expect(normalizedHtml).toContain("Slots:1");
});

test("renderer renders navigation right slot content", () => {
  clearWidgets();
  registerWidget(
    createNavigationWidget({
      wizard: StubNavigationEditor,
      visual: StubNavigationEditor,
      advanced: StubNavigationEditor,
    })
  );
  registerWidget({
    type: "login-chip",
    title: "Login Chip",
    description: "Simple auth action",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: { label: "Log in" },
    editor: {
      wizard: StubUnknownEditor,
      visual: StubUnknownEditor,
      advanced: StubUnknownEditor,
    },
    render: ({ data }) => <span>{String((data as { label?: string }).label ?? "Log in")}</span>,
  });

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "nav-1",
        type: "navigation",
        variant: "split",
        data: navigationDefaults,
        slots: {
          right: [
            {
              id: "right-1",
              type: "login-chip",
              variant: "default",
              data: { label: "Sign in" },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Sign in");
  expect(html).toContain(navigationDefaults.cta?.label ?? "Get started");
});

test("renderer applies preview device visibility to slot widgets", () => {
  clearWidgets();
  registerWidget(
    createNavigationWidget({
      wizard: StubNavigationEditor,
      visual: StubNavigationEditor,
      advanced: StubNavigationEditor,
    })
  );
  registerWidget({
    type: "login-chip",
    title: "Login Chip",
    description: "Simple auth action",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: { label: "Log in" },
    editor: {
      wizard: StubUnknownEditor,
      visual: StubUnknownEditor,
      advanced: StubUnknownEditor,
    },
    render: ({ data }) => <span>{String((data as { label?: string }).label ?? "Log in")}</span>,
  });

  const html = renderToString(
    <WidgetRenderer
      previewDevice="desktop"
      block={{
        id: "nav-with-mobile-slot",
        type: "navigation",
        variant: "split",
        data: {
          ...navigationDefaults,
          cta: undefined,
        },
        slots: {
          right: [
            {
              id: "slot-mobile-only",
              type: "login-chip",
              variant: "default",
              data: { label: "Mobile only action" },
              visibility: { enabled: true, devices: ["mobile"] },
            },
          ],
        },
      }}
    />
  );

  expect(html).not.toContain("Mobile only action");
});

test("renderer renders footer column and bottom slot content", () => {
  clearWidgets();
  registerWidget(
    createFooterWidget({
      wizard: StubFooterEditor,
      visual: StubFooterEditor,
      advanced: StubFooterEditor,
    })
  );
  registerWidget({
    type: "badge",
    title: "Badge",
    description: "Simple marker",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: { label: "Badge" },
    editor: {
      wizard: StubUnknownEditor,
      visual: StubUnknownEditor,
      advanced: StubUnknownEditor,
    },
    render: ({ data }) => <span>{String((data as { label?: string }).label ?? "Badge")}</span>,
  });

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "footer-1",
        type: "footer",
        variant: "columns-2",
        data: footerDefaults,
        slots: {
          "column-1": [
            {
              id: "footer-column-slot",
              type: "badge",
              data: { label: "Column slot item" },
            },
          ],
          bottom: [
            {
              id: "footer-bottom-slot",
              type: "badge",
              data: { label: "Bottom slot item" },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Column slot item");
  expect(html).toContain("Bottom slot item");
});
