import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import { heroDefaults, createHeroWidget, type HeroData } from "../../../core/widgets/core/hero";
import {
  createSectionWidget,
  sectionDefaults,
  type SectionData,
} from "../../../core/widgets/core/section";
import type { Block } from "../../../core/admin/ui/pages/builder/types";
import type { WidgetDefinition, WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;
const StubSectionEditor: ComponentType<WidgetEditorProps<SectionData>> = () => null;

const heroWidget = createHeroWidget({
  wizard: StubEditor,
  visual: StubEditor,
  advanced: StubEditor,
});

const sectionWidget = createSectionWidget({
  wizard: StubSectionEditor,
  visual: StubSectionEditor,
  advanced: StubSectionEditor,
});

const asBlockSettingsWidget = <T,>(widget: WidgetDefinition<T>) =>
  widget as unknown as WidgetDefinition;

const heroBlock: Block = {
  id: "hero-1",
  type: "hero",
  variant: "centered",
  data: heroDefaults as unknown as Record<string, unknown>,
  editor: {
    mode: "visual",
    wizardCompleted: true,
  },
  slots: {
    content: [],
  },
};

test("BlockSettings clarifies empty slot availability", () => {
  const html = renderAdminUi(
    <BlockSettings
      block={heroBlock}
      widget={asBlockSettingsWidget(heroWidget)}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Selected widget");
  expect(html).toContain("Hero");
  expect(html).toContain('data-widget-editor-section="hero.structure"');
  expect(html).toMatch(/Hero Content(?:<!-- -->)? slot/);
  expect(html).toMatch(/0(?:<!-- -->)?\s*(?:<!-- -->)?items/);
  expect(html).toContain(
    "Slot is available and currently empty. Use the slot add action in the canvas or drag from the widgets tab."
  );
});

test("BlockSettings shows repeatable slot controls", () => {
  const html = renderAdminUi(
    <BlockSettings
      block={{
        id: "section-1",
        type: "section",
        variant: "default",
        data: sectionDefaults as unknown as Record<string, unknown>,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
        slots: {
          "region:1": [],
        },
      }}
      widget={asBlockSettingsWidget(sectionWidget)}
      onChange={() => undefined}
    />
  );

  expect(html).toMatch(/Add(?:<!-- -->)?\s*(?:<!-- -->)?Region/);
  expect(html).toContain('data-widget-editor-section="section.regions"');
  expect(html).toContain("Regions");
  expect(html).toContain("Region 1");
});
