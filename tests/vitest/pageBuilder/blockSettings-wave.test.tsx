// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import { createBlock } from "../../../core/admin/ui/pages/builder/blockUtils";
import type { Block, WidgetDefinition } from "../../../core/admin/ui/pages/builder/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

const TabsContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </TabsContext.Provider>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const context = React.useContext(TabsContext);
    return (
      <button type="button" onClick={() => context.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const context = React.useContext(TabsContext);
    return context.value === value ? <div>{children}</div> : null;
  },
}));

vi.mock("../../../core/admin/ui/pages/builder/WizardPanel", () => ({
  WizardPanel: ({
    block,
    onChange,
    onComplete,
  }: {
    block: Block;
    onChange: (next: Block) => void;
    onComplete: () => void;
  }) => (
    <div>
      <span>{`wizard:${block.id}`}</span>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...block,
            data: { ...(block.data ?? {}), wizardTouched: true },
          })
        }
      >
        wizard-change
      </button>
      <button type="button" onClick={onComplete}>
        wizard-complete
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/VisualPanel", () => ({
  VisualPanel: ({
    block,
    onChange,
    slotControls,
  }: {
    block: Block;
    onChange: (next: Block) => void;
    slotControls?: {
      title: string;
      addActions: Array<{ label: string; onClick: () => void; disabled: boolean }>;
      items: Array<{ label: string; canRemove?: boolean; onRemove?: () => void }>;
      childrenHint?: string;
    };
  }) => (
    <div>
      <span>{`visual:${block.id}`}</span>
      {slotControls ? (
        <div>
          <span>{slotControls.title}</span>
          {slotControls.addActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
          {slotControls.items.map((item) => (
            <span key={item.label}>
              {item.label}
              {item.canRemove && item.onRemove ? (
                <button type="button" onClick={item.onRemove}>
                  Remove
                </button>
              ) : null}
            </span>
          ))}
          {slotControls.childrenHint ? <span>{slotControls.childrenHint}</span> : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...block,
            data: { ...(block.data ?? {}), visualTouched: true },
          })
        }
      >
        visual-change
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/AdvancedPanel", () => ({
  AdvancedPanel: ({ block, onChange }: { block: Block; onChange: (next: Block) => void }) => (
    <div>
      <span>{`advanced:${block.id}`}</span>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...block,
            data: { ...(block.data ?? {}), advancedTouched: true },
          })
        }
      >
        advanced-change
      </button>
    </div>
  ),
}));

const Dummy = () => null;

const createWidget = (
  overrides: Partial<WidgetDefinition<Record<string, unknown>>> = {}
): WidgetDefinition<Record<string, unknown>> => ({
  type: overrides.type ?? "hero",
  title: overrides.title ?? "Hero",
  description: overrides.description ?? "Hero widget",
  category: "layout",
  variants: overrides.variants ?? [{ id: "default", label: "Default" }],
  schema: overrides.schema ?? {},
  defaults: overrides.defaults ?? {},
  editor: overrides.editor ?? { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: overrides.render ?? Dummy,
  ...(overrides.canHaveChildren ? { canHaveChildren: true } : {}),
  ...(overrides.slots ? { slots: overrides.slots } : {}),
});

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  vi.restoreAllMocks();
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

test("BlockSettings manages repeatable slots and editor mode transitions", () => {
  const widget = createWidget({
    type: "section",
    title: "Section",
    slots: [
      {
        id: "region",
        label: "Region",
        kind: "repeatable",
        minItems: 1,
        maxItems: 2,
      },
    ],
  });

  const initialBlock: Block = {
    ...createBlock("section"),
    id: "section-1",
    editor: { mode: "visual", wizardCompleted: true },
    slots: {
      "region:1": [],
    },
  };

  const onChangeSpy = vi.fn();

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
    expect(view.container.textContent).toContain("Selected widget");
    expect(view.container.textContent).not.toContain(
      "Next: fine-tune layout, styling, and advanced settings for this widget."
    );
    expect(view.container.textContent).toContain("Region 1 slot");
    expect(view.container.textContent).not.toContain("Remove");

    clickByText(view.container, "Add Region");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        slots: expect.objectContaining({
          "region:1": [],
          "region:2": [],
        }),
      })
    );

    const addButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Add Region")
    ) as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
    expect(view.container.textContent).toContain("Region 2 slot");

    clickByText(view.container, "Remove");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        slots: {
          "region:2": [],
        },
      })
    );

    clickByText(view.container, "Advanced");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        editor: { mode: "advanced", wizardCompleted: true },
      })
    );
    expect(view.container.textContent).toContain("advanced:section-1");

    clickByText(view.container, "advanced-change");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ advancedTouched: true }),
      })
    );
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
