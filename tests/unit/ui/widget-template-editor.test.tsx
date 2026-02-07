import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import {
  NavigationAdvancedEditor,
  NavigationVisualEditor,
  NavigationWizardEditor,
} from "../../../core/admin/ui/widgets/editors/NavigationEditors";
import { WidgetTemplateEditorPage } from "../../../core/admin/ui/widgets/WidgetTemplateEditorPage";
import {
  createNavigationWidget,
  navigationDefaults,
} from "../../../core/widgets/core/navigation";

test("WidgetTemplateEditorPage renders canvas placeholder", () => {
  const html = renderToString(<WidgetTemplateEditorPage />);

  expect(html).toContain("Build your template");
  expect(html).toContain("Save Template");
  expect(html).toContain("Runtime Preview");
  expect(html).toContain("Template Details");
  expect(html).toMatch(
    /<div(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*border-b border-border bg-card px-6 py-4)[^>]*>/
  );
  expect(html).toMatch(
    /<aside(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*hidden w-72 min-h-0 flex-col border-r border-border bg-card lg:flex)[^>]*>/
  );
  expect(html).toMatch(
    /<aside(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*hidden w-80 min-h-0 flex-col border-l border-border bg-card lg:flex)[^>]*>/
  );
});

test("widget template block settings render navigation visual sections", () => {
  const widget = createNavigationWidget({
    wizard: NavigationWizardEditor,
    visual: NavigationVisualEditor,
    advanced: NavigationAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "nav-1",
        type: "navigation",
        variant: "split",
        data: navigationDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and Structure");
  expect(html).toContain("Navigation Links");
  expect(html).toContain("CTA and Right Actions");
});
