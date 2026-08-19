// Shared fixtures for the BlockSettings wizard and repeatable-slots wave suites.
// This module must be imported BEFORE BlockSettings in every test file so the
// WidgetRenderer mock is registered before the production module is loaded
// (the same import order the original single file used).
import React from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import type { Block, WidgetDefinition } from "../../../core/admin/ui/pages/builder/types";

const previewRendererState = vi.hoisted(() => ({
  calls: [] as Array<{
    block: Record<string, unknown>;
    renderContext: Record<string, unknown> | undefined;
  }>,
  reset() {
    previewRendererState.calls = [];
  },
}));
export { previewRendererState };

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

export const Dummy = () => null;

export const createWidget = (
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

export const mount = (node: React.ReactNode) => {
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

export const clickByText = (container: HTMLElement, text: string) => {
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

export const queryButtonsByExactText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).filter(
    (candidate) => candidate.textContent?.trim() === text
  );

export const getSlotControlItem = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("[data-slot-item]")).find(
    (candidate): candidate is HTMLDivElement =>
      candidate instanceof HTMLDivElement && candidate.getAttribute("data-slot-item") === label
  ) ?? null;

export const clickSlotControlButton = (container: HTMLElement, label: string, text: string) => {
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

export const setInputValue = (container: HTMLElement, placeholder: string, value: string) => {
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
