import { expect, test } from "bun:test";

import type { WidgetTemplateRecord } from "../../../core/services/widgets/widgetTemplateService";
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

const template: WidgetTemplateRecord = {
  id: "tmpl-1",
  name: "Template One",
  description: null,
  category: "layout",
  status: "draft",
  blocks: [],
  settings: { layout: { wrapper: { container: "full", padding: { top: "none", bottom: "none" }, background: { color: "transparent", image: null, media: { type: "none", source: "external", src: null } } }, sections: { gap: "none", defaults: { container: "default", padding: { top: "xl", bottom: "xl" }, margin: { top: "none", bottom: "none" } } }, applyDefaultsToNewBlocks: false } },
  createdAt: new Date(),
  updatedAt: new Date(),
};

test("buildWidgetCatalog merges core widgets and templates", () => {
  const items = buildWidgetCatalog([coreWidget], [template]);

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
    {
      id: "tmpl-1",
      source: "template",
      name: "Template One",
      description: null,
      category: "layout",
      variants: ["default"],
      complexity: "composite",
      audience: "beginner",
      module: "templates",
      presets: [],
      requires: [],
      status: "draft",
    },
  ]);
});
