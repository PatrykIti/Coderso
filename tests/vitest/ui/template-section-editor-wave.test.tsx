// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  TemplateSectionAdvancedEditor,
  TemplateSectionVisualEditor,
  TemplateSectionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TemplateSectionEditors";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("TemplateSection wizard editor is read-only and announces the retired selection surface", () => {
  const onChange = vi.fn();
  const view = mount(
    <TemplateSectionWizardEditor
      value={
        {
          templateId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
          templateName: "Hero cluster",
          resolved: undefined,
        } as never
      }
      onChange={onChange}
      variant="default"
    />
  );

  try {
    expect(view.container.textContent).toContain("Hero cluster");
    expect(view.container.textContent).toContain("Widget-template selection retired");
    expect(view.container.textContent).toContain("Page Templates");
    // No selection control remains: legacy widget-template picking is gone.
    expect(view.container.querySelector("select")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("TemplateSection visual editor keeps stored metadata editable without a template picker", () => {
  const onChange = vi.fn();
  const view = mount(
    <TemplateSectionVisualEditor
      value={
        {
          templateId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
          templateName: "Hero cluster",
          metadata: { previewLabel: "Promo", category: "Marketing", version: "1" },
          resolved: undefined,
        } as never
      }
      onChange={onChange}
      variant="default"
    />
  );

  try {
    expect(view.container.textContent).toContain("Active template");
    expect(view.container.textContent).toContain("Hero cluster");
    const inputs = Array.from(view.container.querySelectorAll("input"));
    expect(inputs.length).toBeGreaterThan(0);
  } finally {
    view.cleanup();
  }
});

test("TemplateSection advanced editor reports resolution diagnostics for stored blocks", () => {
  const onChange = vi.fn();
  const view = mount(
    <TemplateSectionAdvancedEditor
      value={
        {
          templateId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
          templateName: "Hero cluster",
          resolved: { blocks: [{ id: "block-1", type: "hero" }] },
        } as never
      }
      onChange={onChange}
      variant="default"
    />
  );

  try {
    expect(view.container.textContent).toContain("Resolved template");
    expect(view.container.textContent).toContain("Resolved content is ready.");
    expect(view.container.textContent).toContain("Runtime behavior");
  } finally {
    view.cleanup();
  }
});
