// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const previewRendererState = vi.hoisted(() => ({
  calls: [] as Array<{
    block: Record<string, unknown>;
    renderContext: Record<string, unknown> | undefined;
  }>,
  reset() {
    previewRendererState.calls = [];
  },
}));

vi.mock("../../../core/widgets/renderers/widgetRenderer", () => ({
  WidgetRenderer: ({
    block,
    renderContext,
  }: {
    block: Record<string, unknown>;
    renderContext?: Record<string, unknown>;
  }) => {
    previewRendererState.calls.push({ block, renderContext });
    const data = (block.data as Record<string, unknown> | undefined) ?? {};
    if (data.throwPreview) {
      throw new Error("preview render failed");
    }
    return (
      <div data-widget-renderer-preview="true">
        {`preview:${String(block.id ?? "")}:${String(renderContext?.mode ?? "none")}:${String(
          data.headline ?? ""
        )}`}
      </div>
    );
  },
}));

import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import { createBlock } from "../../../core/admin/ui/pages/builder/blockUtils";
import { createGridColumnsWidget } from "../../../core/widgets/core/gridColumns";
import { createSectionWidget } from "../../../core/widgets/core/section";
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
      items: Array<{
        id?: string;
        label: string;
        labelValue?: string;
        labelPlaceholder?: string;
        canRemove?: boolean;
        canMoveUp?: boolean;
        canMoveDown?: boolean;
        onLabelChange?: (next: string) => void;
        onRemove?: () => void;
        onMoveUp?: () => void;
        onMoveDown?: () => void;
      }>;
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
            <div key={item.id ?? item.label} data-slot-item={item.label}>
              <span>{item.label}</span>
              {typeof item.canMoveUp === "boolean" ? (
                <button type="button" disabled={!item.canMoveUp} onClick={item.onMoveUp}>
                  {`Move up ${item.label}`}
                </button>
              ) : null}
              {typeof item.canMoveDown === "boolean" ? (
                <button type="button" disabled={!item.canMoveDown} onClick={item.onMoveDown}>
                  {`Move down ${item.label}`}
                </button>
              ) : null}
              {item.canRemove && item.onRemove ? (
                <button type="button" onClick={item.onRemove}>
                  Remove
                </button>
              ) : null}
              {item.onLabelChange ? (
                <input
                  aria-label={`Rename ${item.label}`}
                  placeholder={item.labelPlaceholder ?? item.label}
                  value={item.labelValue ?? ""}
                  onChange={(event) => item.onLabelChange?.(event.currentTarget.value)}
                />
              ) : null}
            </div>
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
  ...(overrides.repeatableSlotSync ? { repeatableSlotSync: overrides.repeatableSlotSync } : {}),
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

const getSlotControlItem = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("[data-slot-item]")).find(
    (candidate): candidate is HTMLDivElement =>
      candidate instanceof HTMLDivElement && candidate.getAttribute("data-slot-item") === label
  ) ?? null;

const clickSlotControlButton = (container: HTMLElement, label: string, text: string) => {
  const slotItem = getSlotControlItem(container, label);
  const button = Array.from(slotItem?.querySelectorAll("button") ?? []).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text} for slot ${label}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (container: HTMLElement, placeholder: string, value: string) => {
  const input = Array.from(container.querySelectorAll("input")).find(
    (candidate): candidate is HTMLInputElement =>
      candidate instanceof HTMLInputElement && candidate.placeholder === placeholder
  );
  if (!input) {
    throw new Error(`Missing input with placeholder: ${placeholder}`);
  }
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

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

test("BlockSettings keeps section region labels stable across rename reorder and remove", () => {
  const widget = createSectionWidget({
    wizard: Dummy,
    visual: Dummy,
    advanced: Dummy,
  }) as unknown as WidgetDefinition<Record<string, unknown>>;
  const initialBlock: Block = {
    ...createBlock("section"),
    id: "section-structured-1",
    editor: { mode: "visual", wizardCompleted: true },
    data: {
      regions: [{ id: "1", label: "Primary hero" }],
    },
    slots: {
      "region:1": [],
      "region:2": [],
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
    expect(view.container.textContent).toContain("Primary hero slot");
    const firstInput = view.container.querySelector(
      'input[placeholder="Region 1"]'
    ) as HTMLInputElement | null;
    const secondInput = view.container.querySelector(
      'input[placeholder="Region 2"]'
    ) as HTMLInputElement | null;
    expect(firstInput?.value).toBe("Primary hero");
    expect(secondInput?.value).toBe("");

    setInputValue(view.container, "Region 2", "Supporting proof");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        data: {
          regions: [
            { id: "1", label: "Primary hero" },
            { id: "2", label: "Supporting proof" },
          ],
        },
      })
    );
    expect(view.container.textContent).toContain("Supporting proof slot");

    clickSlotControlButton(view.container, "Primary hero slot", "Move down");
    const reordered = onChangeSpy.mock.lastCall?.[0] as Block;
    expect(Object.keys(reordered.slots ?? {})).toEqual(["region:2", "region:1"]);
    expect(reordered.data).toEqual({
      regions: [
        { id: "1", label: "Primary hero" },
        { id: "2", label: "Supporting proof" },
      ],
    });
    expect(
      Array.from(view.container.querySelectorAll("[data-slot-item]")).map((element) =>
        element.getAttribute("data-slot-item")
      )
    ).toEqual(["Supporting proof slot", "Primary hero slot"]);

    clickSlotControlButton(view.container, "Supporting proof slot", "Remove");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        slots: {
          "region:1": [],
        },
        data: {
          regions: [{ id: "1", label: "Primary hero" }],
        },
      })
    );
    expect(view.container.textContent).not.toContain("Supporting proof slot");
  } finally {
    view.cleanup();
  }
});

test("BlockSettings keeps repeatable slot metadata in sync across add remove and reorder", () => {
  const widget = createWidget({
    type: "accordion",
    title: "Accordion",
    slots: [
      {
        id: "item",
        label: "Item",
        kind: "repeatable",
        minItems: 1,
        maxItems: 3,
      },
    ],
    repeatableSlotSync: [
      {
        definitionId: "item",
        buildDefaultItem: (instanceId, nextIndex) => ({
          id: instanceId,
          title: `Item ${nextIndex + 1}`,
        }),
        appendItem: (data, nextItem) => ({
          ...data,
          items: [
            ...(((data.items as unknown[]) ?? []) as Array<Record<string, unknown>>),
            nextItem,
          ],
        }),
        removeItemByInstanceId: (data, instanceId) => ({
          ...data,
          items: (((data.items as unknown[]) ?? []) as Array<Record<string, unknown>>).filter(
            (item) => item.id !== instanceId
          ),
        }),
        reorderItemsByInstanceIds: (data, orderedInstanceIds) => {
          const items = (((data.items as unknown[]) ?? []) as Array<Record<string, unknown>>).map(
            (item) => [String(item.id ?? ""), item] as const
          );
          const byId = new Map(items);
          return {
            ...data,
            items: orderedInstanceIds
              .map((instanceId) => byId.get(instanceId))
              .filter((item): item is Record<string, unknown> => Boolean(item)),
          };
        },
      },
    ],
  });

  const nestedOne = { ...createBlock("hero"), id: "nested-1" };
  const nestedTwo = { ...createBlock("newsletter"), id: "nested-2" };
  const initialBlock: Block = {
    ...createBlock("accordion"),
    id: "accordion-1",
    editor: { mode: "visual", wizardCompleted: true },
    data: {
      items: [
        { id: "1", title: "First" },
        { id: "2", title: "Second" },
      ],
    },
    slots: {
      "item:1": [nestedOne],
      "item:2": [nestedTwo],
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
    const moveUpFirst = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Move up Item 1 slot")
    ) as HTMLButtonElement | undefined;
    expect(moveUpFirst?.disabled).toBe(true);

    clickByText(view.container, "Add Item");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        slots: expect.objectContaining({
          "item:1": [nestedOne],
          "item:2": [nestedTwo],
          "item:3": [],
        }),
        data: {
          items: [
            { id: "1", title: "First" },
            { id: "2", title: "Second" },
            { id: "3", title: "Item 3" },
          ],
        },
      })
    );

    clickByText(view.container, "Move down Item 1 slot");
    const reordered = onChangeSpy.mock.lastCall?.[0] as Block;
    expect(Object.keys(reordered.slots ?? {})).toEqual(["item:2", "item:1", "item:3"]);
    expect(reordered.data).toEqual({
      items: [
        { id: "2", title: "Second" },
        { id: "1", title: "First" },
        { id: "3", title: "Item 3" },
      ],
    });
    expect(reordered.slots?.["item:2"]).toEqual([nestedTwo]);
    expect(reordered.slots?.["item:1"]).toEqual([nestedOne]);

    clickByText(view.container, "Remove");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        slots: {
          "item:1": [nestedOne],
          "item:3": [],
        },
        data: {
          items: [
            { id: "1", title: "First" },
            { id: "3", title: "Item 3" },
          ],
        },
      })
    );
  } finally {
    view.cleanup();
  }
});

test("BlockSettings reorders grid columns data through repeatable slot sync", () => {
  const gridWidget = createGridColumnsWidget({
    wizard: Dummy,
    visual: Dummy,
    advanced: Dummy,
  }) as unknown as WidgetDefinition<Record<string, unknown>>;
  const nestedOne = { ...createBlock("hero"), id: "grid-nested-1" };
  const nestedTwo = { ...createBlock("newsletter"), id: "grid-nested-2" };
  const initialBlock: Block = {
    id: "grid-columns-1",
    type: "grid-columns",
    variant: "equal",
    editor: { mode: "visual", wizardCompleted: true },
    data: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    slots: {
      "column:1": [nestedOne],
      "column:2": [nestedTwo],
    },
  };
  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [block, setBlock] = useState<Block>(initialBlock);
    return (
      <BlockSettings
        block={block}
        widget={gridWidget}
        onChange={(next) => {
          onChangeSpy(next);
          setBlock(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    clickByText(view.container, "Move down Column 1 slot");
    const reordered = onChangeSpy.mock.lastCall?.[0] as Block;

    expect(reordered.data).toEqual(
      expect.objectContaining({
        columns: [
          expect.objectContaining({
            id: "2",
            label: "Side",
            desktopSpan: "4",
            tabletSpan: "6",
            mobileSpan: "12",
          }),
          expect.objectContaining({
            id: "1",
            label: "Lead",
            desktopSpan: "8",
            tabletSpan: "6",
            mobileSpan: "12",
          }),
        ],
      })
    );
    expect(Object.keys(reordered.slots ?? {})).toEqual(["column:2", "column:1"]);
    expect(reordered.slots?.["column:2"]).toEqual([nestedTwo]);
    expect(reordered.slots?.["column:1"]).toEqual([nestedOne]);
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

test("BlockSettings renders shared live preview through WidgetRenderer with previewState dataPatch", () => {
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
    expect(view.container.textContent).toContain("Preview ready");
    expect(view.container.textContent).toContain(
      "Reflects the current Visual state through the shared widget renderer."
    );
    expect(view.container.textContent).toContain(
      "preview:navigation-1:editor-preview:Preview headline"
    );
    expect(previewRendererState.calls.at(-1)?.renderContext).toEqual({
      mode: "editor-preview",
      previewState: {
        status: "ready",
        dataPatch: {
          headline: "Preview headline",
        },
      },
    });
    expect(
      ((previewRendererState.calls.at(-1)?.block.data as Record<string, unknown> | undefined)
        ?.headline as string) ?? ""
    ).toBe("Preview headline");
    expect((block.data as Record<string, unknown>).headline).toBe("Saved headline");
  } finally {
    view.cleanup();
  }
});

test("BlockSettings keeps the panel usable when the shared live preview render throws", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const block: Block = {
    ...createBlock("navigation"),
    id: "navigation-error",
    type: "navigation",
    data: {
      throwPreview: true,
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
        },
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("visual:navigation-error");
    expect(view.container.textContent).toContain("Preview unavailable");
    expect(view.container.textContent).toContain(
      "The shared widget preview hit a render error. Keep editing and update the widget state to retry."
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
