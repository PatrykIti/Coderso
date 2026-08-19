// @vitest-environment happy-dom

import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  clickByText,
  createWidget,
  mount,
  previewRendererState,
  queryButtonsByExactText,
} from "./blockSettingsFixtures";
import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import { createBlock } from "../../../core/admin/ui/pages/builder/blockUtils";
import type { Block } from "../../../core/admin/ui/pages/builder/types";

afterEach(() => {
  vi.restoreAllMocks();
  previewRendererState.reset();
});

test("BlockSettings renders fallback copy when no block or widget is selected", () => {
  const view = mount(<BlockSettings block={null} widget={undefined} onChange={() => undefined} />);

  try {
    expect(view.container.textContent).toContain("Select a block to edit its settings.");
  } finally {
    view.cleanup();
  }
});

test("BlockSettings uses the wizard panel until completion", () => {
  const onChange = vi.fn();
  const block: Block = {
    ...createBlock("hero"),
    id: "hero-1",
    editor: { mode: "wizard", wizardCompleted: false },
  };
  const widget = createWidget();

  const view = mount(<BlockSettings block={block} widget={widget} onChange={onChange} />);

  try {
    expect(view.container.textContent).toContain("wizard:hero-1");

    clickByText(view.container, "wizard-change");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "hero-1",
        data: expect.objectContaining({ wizardTouched: true }),
      })
    );

    clickByText(view.container, "wizard-complete");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "hero-1",
        editor: { mode: "visual", wizardCompleted: true },
      })
    );
  } finally {
    view.cleanup();
  }
});

test("BlockSettings renders shared live preview in unfinished wizard mode", () => {
  const block: Block = {
    ...createBlock("hero"),
    id: "hero-1",
    data: {
      headline: "Draft wizard headline",
    },
    editor: { mode: "wizard", wizardCompleted: false },
  };
  const widget = createWidget();

  const view = mount(
    <BlockSettings
      block={block}
      widget={widget}
      onChange={() => undefined}
      editorContext={{
        surface: "page-builder",
        previewState: {
          status: "ready",
          dataPatch: {
            headline: "Preview wizard headline",
          },
        },
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("wizard:hero-1");
    expect(view.container.textContent).toContain("Preview ready");
    expect(view.container.textContent).toContain(
      "Reflects the current Wizard state through the shared widget renderer."
    );
    expect(view.container.textContent).toContain(
      "preview:hero-1:editor-preview:Preview wizard headline"
    );
  } finally {
    view.cleanup();
  }
});

test("BlockSettings hides Wizard from daily tabs after setup completion", () => {
  const onChange = vi.fn();
  const block: Block = {
    ...createBlock("hero"),
    id: "hero-complete",
    data: {
      headline: "Keep daily content",
    },
    editor: { mode: "visual", wizardCompleted: true },
  };
  const widget = createWidget();

  const view = mount(<BlockSettings block={block} widget={widget} onChange={onChange} />);

  try {
    expect(view.container.textContent).toContain("Setup complete");
    expect(view.container.textContent).toContain(
      "Daily edits live in Visual. Advanced is for technical diagnostics."
    );
    expect(view.container.textContent).toContain("visual:hero-complete");
    expect(view.container.textContent).not.toContain("wizard:hero-complete");
    expect(queryButtonsByExactText(view.container, "Wizard")).toHaveLength(0);
    expect(queryButtonsByExactText(view.container, "Visual")).toHaveLength(1);
    expect(queryButtonsByExactText(view.container, "Advanced")).toHaveLength(1);

    clickByText(view.container, "Run setup again");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "hero-complete",
        data: {
          headline: "Keep daily content",
        },
        editor: { mode: "wizard", wizardCompleted: false },
      })
    );
  } finally {
    view.cleanup();
  }
});

test("BlockSettings treats legacy completed Wizard mode as daily Visual", () => {
  const block: Block = {
    ...createBlock("hero"),
    id: "hero-legacy",
    editor: { mode: "wizard", wizardCompleted: true },
  };
  const widget = createWidget();

  const view = mount(<BlockSettings block={block} widget={widget} onChange={() => undefined} />);

  try {
    expect(view.container.textContent).toContain("Setup complete");
    expect(view.container.textContent).toContain("visual:hero-legacy");
    expect(view.container.textContent).not.toContain("wizard:hero-legacy");
    expect(queryButtonsByExactText(view.container, "Wizard")).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("BlockSettings reopens setup explicitly and returns to Visual without data loss", () => {
  const initialBlock: Block = {
    ...createBlock("hero"),
    id: "hero-rerun",
    data: {
      headline: "Preserved headline",
    },
    editor: { mode: "visual", wizardCompleted: true },
  };
  const onChangeSpy = vi.fn();
  const widget = createWidget();

  const Harness = () => {
    const [block, setBlock] = useState<Block>(initialBlock);
    return (
      <BlockSettings
        block={block}
        widget={widget}
        onChange={(next) => {
          onChangeSpy(next);
          setBlock(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    clickByText(view.container, "Run setup again");
    expect(view.container.textContent).toContain("wizard:hero-rerun");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        data: {
          headline: "Preserved headline",
        },
        editor: { mode: "wizard", wizardCompleted: false },
      })
    );

    clickByText(view.container, "wizard-change");
    clickByText(view.container, "wizard-complete");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        data: {
          headline: "Preserved headline",
          wizardTouched: true,
        },
        editor: { mode: "visual", wizardCompleted: true },
      })
    );
    expect(view.container.textContent).toContain("visual:hero-rerun");
  } finally {
    view.cleanup();
  }
});

test("BlockSettings shows nested-children guidance for child-capable widgets", () => {
  const widget = createWidget({
    type: "stack",
    title: "Stack",
    canHaveChildren: true,
  });

  const block: Block = {
    ...createBlock("stack"),
    id: "stack-1",
    editor: { mode: "visual", wizardCompleted: true },
    slots: undefined,
    children: [
      { ...createBlock("hero"), id: "child-1" },
      { ...createBlock("newsletter"), id: "child-2" },
    ],
  };

  const view = mount(<BlockSettings block={block} widget={widget} onChange={() => undefined} />);

  try {
    expect(view.container.textContent).toContain("Structure");
    expect(view.container.textContent).toContain("Nested blocks: 2.");
    expect(view.container.textContent).toContain(
      "Use the Insert dialog to add widgets inside this block."
    );
  } finally {
    view.cleanup();
  }
});

test("BlockSettings does not render the shared live preview after setup completion", () => {
  const block: Block = {
    ...createBlock("navigation"),
    id: "navigation-1",
    type: "navigation",
    data: {
      headline: "Saved headline",
    },
    editor: { mode: "visual", wizardCompleted: true },
  };
  const widget = createWidget({
    type: "navigation",
    title: "Navigation",
  });

  const view = mount(
    <BlockSettings
      block={block}
      widget={widget}
      onChange={() => undefined}
      editorContext={{
        surface: "page-builder",
        previewState: {
          status: "ready",
          dataPatch: {
            headline: "Preview headline",
          },
        },
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("visual:navigation-1");
    expect(view.container.textContent).not.toContain("Preview ready");
    expect(view.container.textContent).not.toContain(
      "Reflects the current Visual state through the shared widget renderer."
    );
    expect(view.container.textContent).not.toContain(
      "preview:navigation-1:editor-preview:Preview headline"
    );
    expect(view.container.querySelector("[data-widget-editor-live-preview]")).toBeNull();
    expect(previewRendererState.calls).toHaveLength(0);
    expect((block.data as Record<string, unknown>).headline).toBe("Saved headline");
  } finally {
    view.cleanup();
  }
});

test("BlockSettings keeps the wizard panel usable when the shared live preview render throws", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const block: Block = {
    ...createBlock("navigation"),
    id: "navigation-error",
    type: "navigation",
    data: {
      throwPreview: true,
    },
    editor: { mode: "wizard", wizardCompleted: false },
  };
  const widget = createWidget({
    type: "navigation",
    title: "Navigation",
  });

  const view = mount(
    <BlockSettings
      block={block}
      widget={widget}
      onChange={() => undefined}
      editorContext={{
        surface: "page-builder",
        previewState: {
          status: "ready",
        },
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("wizard:navigation-error");
    expect(view.container.textContent).toContain("Preview unavailable");
    expect(view.container.textContent).toContain(
      "The shared widget preview hit a render error. Keep editing and update the widget state to retry."
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
