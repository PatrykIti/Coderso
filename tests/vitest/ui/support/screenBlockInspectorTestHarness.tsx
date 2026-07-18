import React from "react";
import { createRoot } from "react-dom/client";

import { ScreenBlockInspector } from "../../../../core/admin/ui/custom-screens/ScreenBlockInspector";
import type { ScreenBlockV1 } from "../../../../core/services/customScreens/customScreenSchemas";

type InspectorProps = React.ComponentProps<typeof ScreenBlockInspector>;

export type InspectorMountProps = Readonly<{
  selectedBlock: InspectorProps["selectedBlock"];
  bindings?: InspectorProps["bindings"];
  fields?: InspectorProps["fields"];
  onPatchBlock?: InspectorProps["onPatchBlock"];
  onPatchBlockData?: InspectorProps["onPatchBlockData"];
  onPatchBinding?: InspectorProps["onPatchBinding"];
  onArmSlotInsert?: InspectorProps["onArmSlotInsert"];
  armedInsertSlotId?: InspectorProps["armedInsertSlotId"];
}>;

const noop = () => undefined;

export const mountReactNode = (node: React.ReactNode) => {
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

export const mountScreenBlockInspector = (props: InspectorMountProps) =>
  mountReactNode(
    <ScreenBlockInspector
      selectedBlock={props.selectedBlock}
      bindings={props.bindings ?? []}
      fields={props.fields ?? []}
      panel="all"
      showBlockActions={false}
      onPatchBlock={props.onPatchBlock ?? noop}
      onPatchBlockData={props.onPatchBlockData ?? noop}
      onPatchBinding={props.onPatchBinding ?? noop}
      onArmSlotInsert={props.onArmSlotInsert}
      armedInsertSlotId={props.armedInsertSlotId}
      onMove={noop}
      onDuplicate={noop}
      onDelete={noop}
    />
  );

type StatefulInspectorHarnessProps = Omit<InspectorMountProps, "selectedBlock"> &
  Readonly<{
    initialBlock: ScreenBlockV1;
  }>;

class StatefulInspectorHarness extends React.Component<
  StatefulInspectorHarnessProps,
  { block: ScreenBlockV1 }
> {
  state = { block: this.props.initialBlock };

  refresh = (block: ScreenBlockV1) => this.setState({ block });
  currentBlock = () => this.state.block;

  render() {
    return (
      <ScreenBlockInspector
        selectedBlock={this.state.block}
        bindings={this.props.bindings ?? []}
        fields={this.props.fields ?? []}
        panel="all"
        showBlockActions={false}
        onPatchBlock={(blockId, patch) => {
          this.props.onPatchBlock?.(blockId, patch);
          this.setState((current) =>
            current.block.id === blockId ? { block: { ...current.block, ...patch } } : current
          );
        }}
        onPatchBlockData={(blockId, patch) => {
          this.props.onPatchBlockData?.(blockId, patch);
          this.setState((current) =>
            current.block.id === blockId
              ? { block: { ...current.block, data: { ...current.block.data, ...patch } } }
              : current
          );
        }}
        onPatchBinding={this.props.onPatchBinding ?? noop}
        onArmSlotInsert={this.props.onArmSlotInsert}
        armedInsertSlotId={this.props.armedInsertSlotId}
        onMove={noop}
        onDuplicate={noop}
        onDelete={noop}
      />
    );
  }
}

export const mountStatefulScreenBlockInspector = (props: StatefulInspectorHarnessProps) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const controller = React.createRef<StatefulInspectorHarness>();

  React.act(() => {
    root.render(<StatefulInspectorHarness ref={controller} {...props} />);
  });
  return {
    container,
    currentBlock: () => controller.current?.currentBlock() ?? props.initialBlock,
    refresh: (nextBlock: ScreenBlockV1) => {
      React.act(() => controller.current?.refresh(nextBlock));
    },
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

export const setInputValue = (input: HTMLInputElement, next: string) => {
  React.act(() => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

export const clickButton = (container: ParentNode, accessibleName: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === accessibleName ||
      candidate.textContent?.trim() === accessibleName
  ) as HTMLButtonElement | undefined;
  if (!button) throw new Error(`Button not found: ${accessibleName}`);
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return button;
};

export const openSelectForLabel = (container: ParentNode, label: string) => {
  const trigger = (Array.from(container.querySelectorAll("span"))
    .find((span) => span.textContent === label)
    ?.parentElement?.querySelector('[role="combobox"]') ?? null) as HTMLElement | null;
  if (!trigger) throw new Error(`Select not found for Inspector label: ${label}`);
  React.act(() => {
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return trigger;
};

export const chooseOption = (trigger: HTMLElement, optionText: string) => {
  React.act(() => {
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const option = Array.from(document.body.querySelectorAll('[role="option"]')).find(
    (item) => item.textContent === optionText
  ) as HTMLElement | undefined;
  if (!option) throw new Error(`Select option not found: ${optionText}`);
  React.act(() => {
    option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

export const selectBoundField = (container: ParentNode, optionText: string) => {
  const trigger = container.querySelector('[data-screen-bound-field="true"]') as HTMLElement | null;
  if (!trigger) throw new Error("Bound-field Select not found");
  React.act(() => {
    trigger.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((item) =>
    item.textContent?.includes(optionText)
  ) as HTMLElement | undefined;
  if (!option) throw new Error(`Bound-field option not found: ${optionText}`);
  React.act(() => {
    option.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    option.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
    option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};
