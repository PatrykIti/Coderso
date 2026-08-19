// @vitest-environment happy-dom

import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  clickByText,
  clickSlotControlButton,
  createWidget,
  Dummy,
  mount,
  previewRendererState,
  setInputValue,
} from "./blockSettingsFixtures";
import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import { createBlock } from "../../../core/admin/ui/pages/builder/blockUtils";
import { createGridColumnsWidget } from "../../../core/widgets/core/gridColumns";
import { createSectionWidget } from "../../../core/widgets/core/section";
import type { Block, WidgetDefinition } from "../../../core/admin/ui/pages/builder/types";

afterEach(() => {
  vi.restoreAllMocks();
  previewRendererState.reset();
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
