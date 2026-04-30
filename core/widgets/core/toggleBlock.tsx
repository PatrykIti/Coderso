import type { ComponentType, CSSProperties } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type { DeviceTarget, WidgetBlock, WidgetDefinition, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type ToggleBlockVariantId = "switch" | "cards";

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

  return {
    labels: {
      primary:
        toTrimmedString(data.labels?.primary) ?? toggleBlockDefaults.labels?.primary ?? "View A",
      secondary:
        toTrimmedString(data.labels?.secondary) ??
        toggleBlockDefaults.labels?.secondary ??
        "View B",
      helper:
        toTrimmedString(data.labels?.helper) ?? toggleBlockDefaults.labels?.helper ?? undefined,
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

const toggleRuntimeClientScript = `
(() => {
  if (typeof window === "undefined") return;
  if (window.__nextlessToggleBlockBound === true) return;
  window.__nextlessToggleBlockBound = true;

  const sync = (root, state) => {
    const normalized = state === "secondary" ? "secondary" : "primary";
    root.setAttribute("data-nextless-toggle-state", normalized);

    root.querySelectorAll("[data-nextless-toggle-trigger]").forEach((button) => {
      const next = button.getAttribute("data-nextless-toggle-next");
      const active = normalized === "secondary" ? "primary" : "secondary";
      button.setAttribute("data-state", active);
      button.setAttribute("aria-pressed", active === "secondary" ? "true" : "false");
      button.setAttribute("data-nextless-toggle-next", next ?? "secondary");
    });

    root.querySelectorAll("[data-nextless-toggle-pane]").forEach((pane) => {
      const paneId = pane.getAttribute("data-nextless-toggle-pane");
      const isVisible = paneId === normalized;
      if (isVisible) {
        pane.removeAttribute("hidden");
        pane.setAttribute("data-state", "active");
      } else {
        pane.setAttribute("hidden", "");
        pane.setAttribute("data-state", "inactive");
      }
    });
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest("[data-nextless-toggle-trigger]");
    if (!(trigger instanceof HTMLElement)) return;

    const root = trigger.closest("[data-nextless-toggle-block='1']");
    if (!(root instanceof HTMLElement)) return;

    const current = root.getAttribute("data-nextless-toggle-state") === "secondary"
      ? "secondary"
      : "primary";
    const next = current === "primary" ? "secondary" : "primary";
    sync(root, next);
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
}: {
  data: ToggleBlockData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
}) {
  const normalized = normalizeToggleBlockData(data);
  const resolvedVariant = resolveVariant(variant);
  const state = normalized.options?.defaultState === "secondary" ? "secondary" : "primary";
  const style = normalized.style ?? toggleBlockDefaults.style!;
  const labels = normalized.labels ?? toggleBlockDefaults.labels!;

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
      data-nextless-toggle-block="1"
      data-nextless-toggle-variant={resolvedVariant}
      data-nextless-toggle-state={state}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={joinClasses("transition", resolveTriggerClass(resolvedVariant))}
          data-nextless-toggle-trigger
          data-nextless-toggle-next={state === "primary" ? "secondary" : "primary"}
          data-state={state === "secondary" ? "secondary" : "primary"}
          aria-pressed={state === "secondary" ? "true" : "false"}
          style={triggerStyle}
        >
          {state === "primary" ? labels.secondary : labels.primary}
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            className="rounded-full border px-2 py-1"
            style={{ borderColor: style.borderColor }}
          >
            {labels.primary}
          </span>
          <span>⇄</span>
          <span
            className="rounded-full border px-2 py-1"
            style={{ borderColor: style.borderColor }}
          >
            {labels.secondary}
          </span>
        </div>
      </div>

      {labels.helper ? (
        <p className="text-sm text-[var(--color-text)]/70">{labels.helper}</p>
      ) : null}

      <div
        className={resolvedVariant === "cards" ? "rounded-lg border p-4" : "rounded-md border p-4"}
        style={{ borderColor: style.borderColor }}
        data-nextless-toggle-pane="primary"
        data-state={state === "primary" ? "active" : "inactive"}
        hidden={state !== "primary"}
      >
        {primaryBlocks.length > 0 ? (
          primaryBlocks.map((block) => (
            <WidgetRenderer key={block.id} block={block} previewDevice={previewDevice} />
          ))
        ) : (
          <div className="rounded-md border border-dashed px-4 py-5 text-sm text-muted-foreground">
            Add widgets for the primary view.
          </div>
        )}
      </div>

      <div
        className={resolvedVariant === "cards" ? "rounded-lg border p-4" : "rounded-md border p-4"}
        style={{ borderColor: style.borderColor }}
        data-nextless-toggle-pane="secondary"
        data-state={state === "secondary" ? "active" : "inactive"}
        hidden={state !== "secondary"}
      >
        {secondaryBlocks.length > 0 ? (
          secondaryBlocks.map((block) => (
            <WidgetRenderer key={block.id} block={block} previewDevice={previewDevice} />
          ))
        ) : (
          <div className="rounded-md border border-dashed px-4 py-5 text-sm text-muted-foreground">
            Add widgets for the secondary view.
          </div>
        )}
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
