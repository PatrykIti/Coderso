import type { ComponentType, CSSProperties, ReactNode } from "react";

import { renderEditorPlaceholder } from "../renderContext";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";

export type ToggleBlockVariantId = "switch" | "cards";
export type ToggleBlockStateId = "primary" | "secondary";

export type ToggleBlockState = {
  id: ToggleBlockStateId;
  label: string;
  slotId: ToggleBlockStateId;
};

export type ToggleBlockData = {
  labels?: {
    primary?: string;
    secondary?: string;
    helper?: string;
  };
  options?: {
    defaultState?: "primary" | "secondary";
  };
  style?: {
    surfaceColor?: string;
    borderColor?: string;
    accentColor?: string;
  };
};

export const toggleBlockSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    labels: {
      type: "object",
      additionalProperties: false,
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" },
        helper: { type: "string" },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        defaultState: { enum: ["primary", "secondary"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surfaceColor: { type: "string" },
        borderColor: { type: "string" },
        accentColor: { type: "string" },
      },
    },
  },
};

export const toggleBlockDefaults: ToggleBlockData = {
  labels: {
    primary: "View A",
    secondary: "View B",
    helper: "Switch between two content views.",
  },
  options: {
    defaultState: "primary",
  },
  style: {
    surfaceColor: "var(--color-surface)",
    borderColor: "var(--color-border)",
    accentColor: "var(--color-text)",
  },
};

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveVariant = (variant: string): ToggleBlockVariantId => {
  if (variant === "cards") return variant;
  return "switch";
};

export function normalizeToggleBlockData(data: ToggleBlockData): ToggleBlockData {
  const hasStyleObject = data.style !== undefined;
  const hasExplicitHelper =
    typeof data.labels === "object" &&
    data.labels !== null &&
    Object.prototype.hasOwnProperty.call(data.labels, "helper");

  return {
    labels: {
      primary:
        toTrimmedString(data.labels?.primary) ?? toggleBlockDefaults.labels?.primary ?? "View A",
      secondary:
        toTrimmedString(data.labels?.secondary) ??
        toggleBlockDefaults.labels?.secondary ??
        "View B",
      helper: hasExplicitHelper
        ? (toTrimmedString(data.labels?.helper) ?? "")
        : (toggleBlockDefaults.labels?.helper ?? undefined),
    },
    options: {
      defaultState: data.options?.defaultState === "secondary" ? "secondary" : "primary",
    },
    style: {
      surfaceColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.surfaceColor)
        : (toggleBlockDefaults.style?.surfaceColor ?? "var(--color-surface)"),
      borderColor:
        toTrimmedString(data.style?.borderColor) ??
        toggleBlockDefaults.style?.borderColor ??
        "var(--color-border)",
      accentColor:
        toTrimmedString(data.style?.accentColor) ??
        toggleBlockDefaults.style?.accentColor ??
        "var(--color-text)",
    },
  };
}

function resolveToggleStates(data: ToggleBlockData): ToggleBlockState[] {
  const normalized = normalizeToggleBlockData(data);
  const labels = normalized.labels ?? toggleBlockDefaults.labels!;
  return [
    {
      id: "primary",
      label: labels.primary ?? toggleBlockDefaults.labels?.primary ?? "View A",
      slotId: "primary",
    },
    {
      id: "secondary",
      label: labels.secondary ?? toggleBlockDefaults.labels?.secondary ?? "View B",
      slotId: "secondary",
    },
  ];
}

const toggleRuntimeClientScript = `
(() => {
  if (typeof document === "undefined") return;

  const getTriggers = (root) =>
    Array.from(root.querySelectorAll("[data-coderso-toggle-trigger]")).filter(
      (node) => node instanceof HTMLElement,
    );

  const sync = (root, state, options = {}) => {
    const normalized = state === "secondary" ? "secondary" : "primary";
    root.setAttribute("data-coderso-toggle-state", normalized);

    getTriggers(root).forEach((button) => {
      const stateId = button.getAttribute("data-coderso-toggle-state-id");
      const isActive = stateId === normalized;
      button.setAttribute("data-state", isActive ? "active" : "inactive");
      button.setAttribute("aria-checked", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
      if (isActive && options.focus === true) {
        button.focus();
      }
    });

    root.querySelectorAll("[data-coderso-toggle-pane]").forEach((pane) => {
      const paneId = pane.getAttribute("data-coderso-toggle-pane");
      const isVisible = paneId === normalized;
      if (isVisible) {
        pane.removeAttribute("hidden");
        pane.setAttribute("data-state", "active");
      } else {
        pane.setAttribute("hidden", "");
        pane.setAttribute("data-state", "inactive");
      }
    });

    const statusTarget = root.querySelector("[data-coderso-toggle-status]");
    const activeTrigger = getTriggers(root).find(
      (button) => button.getAttribute("data-coderso-toggle-state-id") === normalized,
    );
    if (statusTarget instanceof HTMLElement && activeTrigger instanceof HTMLElement) {
      statusTarget.textContent = (activeTrigger.textContent || normalized) + " selected";
    }
  };

  const resolveNextState = (root, current, key) => {
    const triggers = getTriggers(root);
    const states = triggers
      .map((trigger) => trigger.getAttribute("data-coderso-toggle-state-id"))
      .filter((value) => value === "primary" || value === "secondary");
    const currentIndex = states.indexOf(current);
    if (currentIndex < 0 || states.length === 0) return current;
    if (key === "Home") return states[0];
    if (key === "End") return states[states.length - 1];
    if (key === "ArrowRight" || key === "ArrowDown") {
      return states[(currentIndex + 1) % states.length];
    }
    if (key === "ArrowLeft" || key === "ArrowUp") {
      return states[(currentIndex - 1 + states.length) % states.length];
    }
    return current;
  };

  const handleClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest("[data-coderso-toggle-trigger]");
    if (!(trigger instanceof HTMLElement)) return;

    const root = trigger.closest("[data-coderso-toggle-block='1']");
    if (!(root instanceof HTMLElement)) return;

    const next =
      trigger.getAttribute("data-coderso-toggle-state-id") === "secondary"
        ? "secondary"
        : "primary";
    sync(root, next, { focus: true });
  };

  const handleKeydown = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const trigger = target.closest("[data-coderso-toggle-trigger]");
    if (!(trigger instanceof HTMLElement)) return;

    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const root = trigger.closest("[data-coderso-toggle-block='1']");
    if (!(root instanceof HTMLElement)) return;

    const current =
      trigger.getAttribute("data-coderso-toggle-state-id") === "secondary"
        ? "secondary"
        : "primary";
    const next = resolveNextState(root, current, event.key);
    event.preventDefault();
    sync(root, next, { focus: true });
  };

  document.querySelectorAll("[data-coderso-toggle-block='1']").forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.codersoToggleBound === "true") return;
    root.dataset.codersoToggleBound = "true";
    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", handleKeydown);
    sync(root, root.getAttribute("data-coderso-toggle-state") || "primary");
  });
})();
`;

const getToggleRuntimeClientScript = () => toggleRuntimeClientScript;

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const resolveTriggerClass = (variant: ToggleBlockVariantId) => {
  if (variant === "cards") {
    return "rounded-md border px-3 py-2 text-sm font-semibold data-[state=secondary]:bg-[var(--nextless-toggle-accent)] data-[state=secondary]:text-[var(--nextless-toggle-accent-contrast)] data-[state=secondary]:border-transparent";
  }
  return "rounded-full border px-3 py-1.5 text-sm font-semibold data-[state=secondary]:bg-[var(--nextless-toggle-accent)] data-[state=secondary]:text-[var(--nextless-toggle-accent-contrast)] data-[state=secondary]:border-transparent";
};

export function ToggleBlock({
  data,
  variant,
  slots,
  previewDevice,
  renderContext,
  renderBlock,
  blockId,
}: {
  data: ToggleBlockData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
  renderBlock?: (block: WidgetBlock, context?: WidgetRenderContext) => ReactNode;
  blockId?: string;
}) {
  const normalized = normalizeToggleBlockData(data);
  const resolvedVariant = resolveVariant(variant);
  const state = normalized.options?.defaultState === "secondary" ? "secondary" : "primary";
  const style = normalized.style ?? toggleBlockDefaults.style!;
  const labels = normalized.labels ?? toggleBlockDefaults.labels!;
  const states = resolveToggleStates(normalized);
  const rootInstanceId = createWidgetInstanceId("toggle-block", blockId, state);
  const primaryTriggerId = scopedId(rootInstanceId, "trigger-primary");
  const secondaryTriggerId = scopedId(rootInstanceId, "trigger-secondary");
  const primaryPaneId = scopedId(rootInstanceId, "pane-primary");
  const secondaryPaneId = scopedId(rootInstanceId, "pane-secondary");

  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const primaryBlocks = Array.isArray(slotMap.primary) ? slotMap.primary : [];
  const secondaryBlocks = Array.isArray(slotMap.secondary) ? slotMap.secondary : [];

  const containerStyle: CSSProperties =
    compactStyle({
      borderColor: style.borderColor,
      backgroundColor: resolveClearableStyleValue(style.surfaceColor),
    }) ?? {};

  const triggerStyle: CSSProperties = {
    borderColor: style.borderColor,
    color: style.accentColor,
  };

  return (
    <div
      className="space-y-4 rounded-xl border p-4"
      style={{
        ...containerStyle,
        ["--nextless-toggle-accent" as string]: style.accentColor,
        ["--nextless-toggle-accent-contrast" as string]: "var(--color-background)",
      }}
      data-coderso-toggle-block="1"
      data-coderso-toggle-variant={resolvedVariant}
      data-coderso-toggle-state={state}
    >
      <div className="flex flex-col gap-3">
        <div
          role="radiogroup"
          aria-label="Toggle content view"
          className="flex flex-wrap items-center gap-2"
        >
          {states.map((toggleState) => {
            const isActive = toggleState.id === state;
            return (
              <button
                key={toggleState.id}
                id={toggleState.id === "secondary" ? secondaryTriggerId : primaryTriggerId}
                type="button"
                role="radio"
                className={joinClasses("transition", resolveTriggerClass(resolvedVariant))}
                data-coderso-toggle-trigger
                data-coderso-toggle-state-id={toggleState.id}
                data-state={isActive ? "active" : "inactive"}
                aria-checked={isActive ? "true" : "false"}
                aria-controls={toggleState.id === "secondary" ? secondaryPaneId : primaryPaneId}
                tabIndex={isActive ? 0 : -1}
                style={triggerStyle}
              >
                {toggleState.label}
              </button>
            );
          })}
        </div>
        <span className="sr-only" aria-live="polite" data-coderso-toggle-status>
          {state === "primary" ? labels.primary : labels.secondary} selected
        </span>
      </div>

      {labels.helper ? (
        <p className="text-sm text-[var(--color-text)]/70">{labels.helper}</p>
      ) : null}

      <div
        id={primaryPaneId}
        role="region"
        aria-labelledby={primaryTriggerId}
        className={resolvedVariant === "cards" ? "rounded-lg border p-4" : "rounded-md border p-4"}
        style={{ borderColor: style.borderColor }}
        data-coderso-toggle-pane="primary"
        data-state={state === "primary" ? "active" : "inactive"}
        hidden={state !== "primary"}
      >
        {primaryBlocks.length > 0
          ? primaryBlocks.map((block) =>
              renderBlock ? (
                <div key={block.id}>{renderBlock(block, renderContext)}</div>
              ) : (
                <WidgetRenderer
                  key={block.id}
                  block={block}
                  previewDevice={previewDevice}
                  renderContext={renderContext}
                />
              )
            )
          : renderEditorPlaceholder("Add widgets for the primary view.", renderContext)}
      </div>

      <div
        id={secondaryPaneId}
        role="region"
        aria-labelledby={secondaryTriggerId}
        className={resolvedVariant === "cards" ? "rounded-lg border p-4" : "rounded-md border p-4"}
        style={{ borderColor: style.borderColor }}
        data-coderso-toggle-pane="secondary"
        data-state={state === "secondary" ? "active" : "inactive"}
        hidden={state !== "secondary"}
      >
        {secondaryBlocks.length > 0
          ? secondaryBlocks.map((block) =>
              renderBlock ? (
                <div key={block.id}>{renderBlock(block, renderContext)}</div>
              ) : (
                <WidgetRenderer
                  key={block.id}
                  block={block}
                  previewDevice={previewDevice}
                  renderContext={renderContext}
                />
              )
            )
          : renderEditorPlaceholder("Add widgets for the secondary view.", renderContext)}
      </div>

      <script dangerouslySetInnerHTML={{ __html: getToggleRuntimeClientScript() }} />
    </div>
  );
}

export function createToggleBlockWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ToggleBlockData>>;
  visual: ComponentType<WidgetEditorProps<ToggleBlockData>>;
  advanced: ComponentType<WidgetEditorProps<ToggleBlockData>>;
}): WidgetDefinition<ToggleBlockData> {
  return {
    type: "toggle-block",
    title: "Toggle Block",
    description: "Switch between two alternate content panes.",
    category: "layout",
    variants: [
      {
        id: "switch",
        label: "Switch",
        description: "Compact toggle button with pane switching.",
      },
      {
        id: "cards",
        label: "Cards",
        description: "Larger card-like panes for richer content swaps.",
      },
    ],
    schema: toggleBlockSchema,
    defaults: toggleBlockDefaults,
    slots: [
      {
        id: "primary",
        label: "Primary Pane",
      },
      {
        id: "secondary",
        label: "Secondary Pane",
      },
    ],
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: ToggleBlock,
  };
}
