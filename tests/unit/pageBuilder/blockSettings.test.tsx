import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import { heroDefaults, createHeroWidget, type HeroData } from "../../../core/widgets/core/hero";
import type { Block } from "../../../core/admin/ui/pages/builder/types";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;

const heroWidget = createHeroWidget({
  wizard: StubEditor,
  visual: StubEditor,
  advanced: StubEditor,
});

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
  const html = renderToString(
    <BlockSettings block={heroBlock} widget={heroWidget} onChange={() => undefined} />
  );

  expect(html).toMatch(/Hero Content(?:<!-- -->)? slot/);
  expect(html).toMatch(/0(?:<!-- -->)?\s*(?:<!-- -->)?items/);
  expect(html).toContain("Slot is available and currently empty.");
});
