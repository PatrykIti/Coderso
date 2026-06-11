import { expect, test } from "bun:test";

import { buildWidgetCatalog } from "../../../core/services/widgets/widgetCatalogService";
import type { WidgetDefinition } from "../../../core/widgets/types";

const NullEditor: WidgetDefinition["editor"]["wizard"] = () => null;
const NullRenderer: WidgetDefinition["render"] = () => null;

const coreWidget: WidgetDefinition = {
  type: "hero",
  title: "Hero",
  description: "Hero section",
  category: "layout",
  complexity: "composite",
  audience: "beginner",
  module: "content",
  presets: [],
  requires: [],
  variants: [{ id: "split", label: "Split" }],
  schema: {},
  defaults: {},
  editor: {
    wizard: NullEditor,
    visual: NullEditor,
    advanced: NullEditor,
  },
  render: NullRenderer,
};

test("buildWidgetCatalog is core-widget-only after the Page Templates rewrite", () => {
  const items = buildWidgetCatalog([coreWidget]);

  expect(items).toEqual([
    {
      id: "hero",
      source: "core",
      name: "Hero",
      description: "Hero section",
      category: "layout",
      variants: ["split"],
      complexity: "composite",
      audience: "beginner",
      module: "content",
      presets: [],
      requires: [],
      status: "published",
    },
  ]);
});
