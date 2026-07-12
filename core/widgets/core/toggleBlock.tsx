import type { ComponentType, CSSProperties, ReactNode } from "react";

import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
} from "../../services/theme/cssColorContract";
import { renderEditorPlaceholder } from "../renderContext";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import { compactStyle, resolveClearableCssColorValue } from "./clearableStyle";
import { renderSharedWidgetRuntimeScript } from "../runtimeScripts";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";

export type ToggleBlockVariantId = "switch" | "cards";
export type ToggleBlockStateId = "primary" | "secondary";
export type ToggleBlockMotion = "none" | "fade" | "slide";
export type ToggleBlockPaneSurfaceToken = "default" | "soft" | "contrast";
export type ToggleBlockPanePaddingToken = "compact" | "comfortable" | "spacious";
export type ToggleBlockPaneRadiusToken = "sm" | "md" | "lg";
export type ToggleBlockPaneBorderEmphasis = "subtle" | "strong";

export type ToggleBlockPaneStyle = {
  surface?: ToggleBlockPaneSurfaceToken;
  padding?: ToggleBlockPanePaddingToken;
  radius?: ToggleBlockPaneRadiusToken;
  borderEmphasis?: ToggleBlockPaneBorderEmphasis;
};

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
    ariaLabel?: string;
    selectedSuffix?: string;
  };
  options?: {
    defaultState?: ToggleBlockStateId;
    motion?: ToggleBlockMotion;
  };
  style?: {
    surfaceColor?: string;
    borderColor?: string;
    accentColor?: string;
    accentContrastColor?: string;
    panes?: {
      primary?: ToggleBlockPaneStyle;
      secondary?: ToggleBlockPaneStyle;
    };
  };
};

type NormalizedToggleBlockPaneStyle = Required<ToggleBlockPaneStyle>;

type NormalizedToggleBlockData = {
  labels: {
    primary: string;
    secondary: string;
    helper?: string;
    ariaLabel: string;
    selectedSuffix: string;
  };
  options: {
    defaultState: ToggleBlockStateId;
    motion: ToggleBlockMotion;
  };
  style: {
    surfaceColor?: string;
    borderColor?: string;
    accentColor?: string;
    accentContrastColor?: string;
    panes: {
      primary: NormalizedToggleBlockPaneStyle;
      secondary: NormalizedToggleBlockPaneStyle;
    };
  };
};

const togglePaneSurfaceTokens = ["default", "soft", "contrast"] as const;
const togglePanePaddingTokens = ["compact", "comfortable", "spacious"] as const;
const togglePaneRadiusTokens = ["sm", "md", "lg"] as const;
const togglePaneBorderTokens = ["subtle", "strong"] as const;
const toggleBlockColorValueSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS["inherited-render"],
    },
  ],
} as const;
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
        ariaLabel: { type: "string" },
        selectedSuffix: { type: "string" },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        defaultState: { enum: ["primary", "secondary"] },
        motion: { enum: ["none", "fade", "slide"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surfaceColor: toggleBlockColorValueSchema,
        borderColor: toggleBlockColorValueSchema,
        accentColor: toggleBlockColorValueSchema,
        accentContrastColor: toggleBlockColorValueSchema,
        panes: {
          type: "object",
          additionalProperties: false,
          properties: {
            primary: {
              type: "object",
              additionalProperties: false,
              properties: {
                surface: { enum: [...togglePaneSurfaceTokens] },
                padding: { enum: [...togglePanePaddingTokens] },
                radius: { enum: [...togglePaneRadiusTokens] },
                borderEmphasis: { enum: [...togglePaneBorderTokens] },
              },
            },
            secondary: {
              type: "object",
              additionalProperties: false,
              properties: {
                surface: { enum: [...togglePaneSurfaceTokens] },
                padding: { enum: [...togglePanePaddingTokens] },
                radius: { enum: [...togglePaneRadiusTokens] },
                borderEmphasis: { enum: [...togglePaneBorderTokens] },
              },
            },
          },
        },
      },
    },
  },
};

const toggleBlockPaneStyleDefaults: NormalizedToggleBlockPaneStyle = {
  surface: "default",
  padding: "comfortable",
  radius: "md",
  borderEmphasis: "subtle",
};

export const toggleBlockDefaults: ToggleBlockData = {
  labels: {
    primary: "View A",
    secondary: "View B",
    helper: "Switch between two content views.",
    ariaLabel: "Toggle content view",
    selectedSuffix: "selected",
  },
  options: {
    defaultState: "primary",
    motion: "none",
  },
  style: {
    panes: {
      primary: { ...toggleBlockPaneStyleDefaults },
      secondary: { ...toggleBlockPaneStyleDefaults },
    },
  },
};

export const toggleBlockEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "toggle-block.wizard.variant",
      title: "Step 1: Variant",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["variant"],
    },
    {
      mode: "visual",
      id: "toggle-block.visual.variant",
      title: "Variant",
      role: "visual",
      writablePaths: ["variant"],
    },
    {
      mode: "visual",
      id: "toggle-block.visual.labels",
      title: "Labels",
      role: "content",
      writablePaths: ["labels.primary", "labels.secondary", "labels.helper"],
    },
    {
      mode: "visual",
      id: "toggle-block.visual.experience",
      title: "Experience",
      role: "visual",
      writablePaths: ["options.defaultState", "options.motion"],
    },
    {
      mode: "visual",
      id: "toggle-block.visual.accessibility",
      title: "Accessibility",
      role: "content",
      writablePaths: ["labels.ariaLabel", "labels.selectedSuffix"],
    },
    {
      mode: "visual",
      id: "toggle-block.visual.theme",
      title: "Theme",
      role: "visual",
      writablePaths: [
        "style.surfaceColor",
        "style.borderColor",
        "style.accentColor",
        "style.accentContrastColor",
      ],
    },
    {
      mode: "visual",
      id: "toggle-block.visual.pane-style",
      title: "Pane cards",
      role: "visual",
      writablePaths: [
        "style.panes.primary.surface",
        "style.panes.primary.padding",
        "style.panes.primary.radius",
        "style.panes.primary.borderEmphasis",
        "style.panes.secondary.surface",
        "style.panes.secondary.padding",
        "style.panes.secondary.radius",
        "style.panes.secondary.borderEmphasis",
      ],
    },
    {
      mode: "visual",
      id: "toggle-block.visual.authoring",
      title: "Pane authoring",
      role: "summary",
      writablePaths: [],
    },
    {
      mode: "advanced",
      id: "toggle-block.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "labels", "options", "slots.primary", "slots.secondary"],
    },
    {
      mode: "advanced",
      id: "toggle-block.advanced.style-summary",
      title: "Style diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["style"],
    },
    {
      mode: "advanced",
      id: "toggle-block.advanced.contract-summary",
      title: "Support summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["editorContract"],
    },
  ],
};

const panePaddingClassMap: Record<ToggleBlockPanePaddingToken, string> = {
  compact: "p-3",
  comfortable: "p-4",
  spacious: "p-6",
};

const paneRadiusClassMap: Record<ToggleBlockPaneRadiusToken, string> = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
};

const paneSurfaceClassMap: Record<ToggleBlockPaneSurfaceToken, string | undefined> = {
  default: undefined,
  soft: "bg-[var(--color-bg)]",
  contrast: "bg-[var(--color-surface)] shadow-sm",
};

const paneBorderClassMap: Record<ToggleBlockPaneBorderEmphasis, string | undefined> = {
  subtle: undefined,
  strong: "shadow-sm",
};

const paneBorderWidthMap: Record<ToggleBlockPaneBorderEmphasis, string> = {
  subtle: "1px",
  strong: "2px",
};

const motionClassMap: Record<ToggleBlockMotion, string | undefined> = {
  none: undefined,
  fade: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:animate-none",
  slide:
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const joinClasses = (...classes: Array<string | false | undefined>) => {
  const tokens: string[] = [];
  const seen = new Set<string>();

  classes.forEach((entry) => {
    if (!entry) return;
    entry.split(/\s+/).forEach((token) => {
      if (!token || seen.has(token)) return;
      seen.add(token);
      tokens.push(token);
    });
  });

  return tokens.join(" ");
};

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function normalizeToggleBlockColorValue(value: unknown): string | undefined {
  return resolveClearableCssColorValue(value, "inherited-render");
}

const resolveVariant = (variant: string): ToggleBlockVariantId => {
  if (variant === "cards") return variant;
  return "switch";
};

const resolveToggleMotion = (value: unknown): ToggleBlockMotion => {
  if (value === "fade" || value === "slide") return value;
  return "none";
};

const resolvePaneSurfaceToken = (value: unknown): ToggleBlockPaneSurfaceToken => {
  if (value === "soft" || value === "contrast") return value;
  return "default";
};

const resolvePanePaddingToken = (value: unknown): ToggleBlockPanePaddingToken => {
  if (value === "compact" || value === "spacious") return value;
  return "comfortable";
};

const resolvePaneRadiusToken = (value: unknown): ToggleBlockPaneRadiusToken => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolvePaneBorderToken = (value: unknown): ToggleBlockPaneBorderEmphasis => {
  if (value === "strong") return value;
  return "subtle";
};

function normalizeToggleBlockPaneStyle(value: unknown): NormalizedToggleBlockPaneStyle {
  const current = isRecord(value) ? value : {};
  return {
    surface: resolvePaneSurfaceToken(current.surface),
    padding: resolvePanePaddingToken(current.padding),
    radius: resolvePaneRadiusToken(current.radius),
    borderEmphasis: resolvePaneBorderToken(current.borderEmphasis),
  };
}

function normalizeToggleBlockStyle(style: unknown): NormalizedToggleBlockData["style"] {
  const current = isRecord(style) ? style : {};
  const panes = isRecord(current.panes) ? current.panes : {};
  const hasStyleObject = style !== undefined;

  return {
    surfaceColor: hasStyleObject ? normalizeToggleBlockColorValue(current.surfaceColor) : undefined,
    borderColor: hasStyleObject ? normalizeToggleBlockColorValue(current.borderColor) : undefined,
    accentColor: hasStyleObject ? normalizeToggleBlockColorValue(current.accentColor) : undefined,
    accentContrastColor: hasStyleObject
      ? normalizeToggleBlockColorValue(current.accentContrastColor)
      : undefined,
    panes: {
      primary: normalizeToggleBlockPaneStyle(panes.primary),
      secondary: normalizeToggleBlockPaneStyle(panes.secondary),
    },
  };
}

export function normalizeToggleBlockData(data: ToggleBlockData): NormalizedToggleBlockData {
  const labels = isRecord(data.labels) ? data.labels : {};
  const hasExplicitHelper = Object.prototype.hasOwnProperty.call(labels, "helper");

  return {
    labels: {
      primary: toTrimmedString(labels.primary) ?? toggleBlockDefaults.labels?.primary ?? "View A",
      secondary:
        toTrimmedString(labels.secondary) ?? toggleBlockDefaults.labels?.secondary ?? "View B",
      helper: hasExplicitHelper
        ? (toTrimmedString(labels.helper) ?? "")
        : (toggleBlockDefaults.labels?.helper ?? undefined),
      ariaLabel:
        toTrimmedString(labels.ariaLabel) ??
        toggleBlockDefaults.labels?.ariaLabel ??
        "Toggle content view",
      selectedSuffix:
        toTrimmedString(labels.selectedSuffix) ??
        toggleBlockDefaults.labels?.selectedSuffix ??
        "selected",
    },
    options: {
      defaultState: data.options?.defaultState === "secondary" ? "secondary" : "primary",
      motion: resolveToggleMotion(data.options?.motion),
    },
    style: normalizeToggleBlockStyle(data.style),
  };
}

export function resetToggleBlockData(): NormalizedToggleBlockData {
  return normalizeToggleBlockData(toggleBlockDefaults);
}

function resolveToggleStates(data: NormalizedToggleBlockData): ToggleBlockState[] {
  return [
    {
      id: "primary",
      label: data.labels.primary,
      slotId: "primary",
    },
    {
      id: "secondary",
      label: data.labels.secondary,
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

  const buildSelectedMessage = (label, suffix) => {
    const normalizedLabel = typeof label === "string" ? label.trim() : "";
    const normalizedSuffix = typeof suffix === "string" ? suffix.trim() : "";
    if (!normalizedSuffix) return normalizedLabel;
    return normalizedLabel ? normalizedLabel + " " + normalizedSuffix : normalizedSuffix;
  };

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
      const activeLabel =
        activeTrigger.getAttribute("data-coderso-toggle-status-label") ||
        activeTrigger.textContent ||
        normalized;
      const suffix = root.getAttribute("data-coderso-toggle-selected-suffix") || "";
      statusTarget.textContent = buildSelectedMessage(activeLabel, suffix);
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

const resolveTriggerGroupClass = (variant: ToggleBlockVariantId) =>
  variant === "cards"
    ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
    : "flex flex-wrap items-center gap-2";

const resolveTriggerClass = (variant: ToggleBlockVariantId) => {
  if (variant === "cards") {
    return "min-h-14 rounded-xl border bg-[var(--color-bg)] px-4 py-3 text-left shadow-sm transition data-[state=active]:border-transparent data-[state=active]:bg-[var(--nextless-toggle-accent)] data-[state=active]:text-[var(--nextless-toggle-accent-contrast)] data-[state=active]:shadow-md";
  }
  return "rounded-full border px-3 py-1.5 text-sm font-semibold transition data-[state=active]:bg-[var(--nextless-toggle-accent)] data-[state=active]:text-[var(--nextless-toggle-accent-contrast)] data-[state=active]:border-transparent";
};

function resolveTriggerStyle(
  style: NormalizedToggleBlockData["style"],
  isActive: boolean
): CSSProperties | undefined {
  return compactStyle({
    borderColor: normalizeToggleBlockColorValue(style.borderColor),
    color: isActive ? undefined : normalizeToggleBlockColorValue(style.accentColor),
  });
}

const resolvePaneClass = (
  variant: ToggleBlockVariantId,
  motion: ToggleBlockMotion,
  paneStyle: NormalizedToggleBlockPaneStyle
) =>
  joinClasses(
    "min-w-0 border",
    panePaddingClassMap[paneStyle.padding],
    paneRadiusClassMap[paneStyle.radius],
    paneSurfaceClassMap[paneStyle.surface],
    paneBorderClassMap[paneStyle.borderEmphasis],
    motionClassMap[motion],
    variant === "cards" ? "shadow-sm" : undefined
  );

const resolveSelectedAnnouncement = (label: string, suffix: string) =>
  suffix.trim().length > 0 ? `${label} ${suffix}`.trim() : label;

const resolvePanePlaceholder = (paneLabel: string) =>
  `Use the page builder to add widgets to the ${paneLabel.toLowerCase()} pane.`;

const resolvePaneMetaLabel = (state: ToggleBlockStateId) =>
  state === "primary" ? "Primary pane" : "Secondary pane";

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
  const state = normalized.options.defaultState;
  const motion = normalized.options.motion;
  const style = normalized.style;
  const borderColor = normalizeToggleBlockColorValue(style.borderColor);
  const accentColor = normalizeToggleBlockColorValue(style.accentColor);
  const accentContrastColor = normalizeToggleBlockColorValue(style.accentContrastColor);
  const labels = normalized.labels;
  const states = resolveToggleStates(normalized);
  const rootInstanceId = createWidgetInstanceId("toggle-block", blockId, state);
  const primaryTriggerId = scopedId(rootInstanceId, "trigger-primary");
  const secondaryTriggerId = scopedId(rootInstanceId, "trigger-secondary");
  const primaryPaneId = scopedId(rootInstanceId, "pane-primary");
  const secondaryPaneId = scopedId(rootInstanceId, "pane-secondary");

  const previewMode =
    renderContext?.mode === "editor-preview" || renderContext?.mode === "admin-preview";
  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const primaryBlocks = Array.isArray(slotMap.primary) ? slotMap.primary : [];
  const secondaryBlocks = Array.isArray(slotMap.secondary) ? slotMap.secondary : [];
  const runtimeScript = !previewMode
    ? renderSharedWidgetRuntimeScript({
        renderContext,
        id: "toggle-block",
        source: getToggleRuntimeClientScript(),
      })
    : null;

  const containerStyle: CSSProperties =
    compactStyle({
      borderColor,
      backgroundColor: normalizeToggleBlockColorValue(style.surfaceColor),
    }) ?? {};

  const primaryPaneStyle: CSSProperties =
    compactStyle({
      borderColor,
      borderWidth: paneBorderWidthMap[style.panes.primary.borderEmphasis],
    }) ?? {};
  const secondaryPaneStyle: CSSProperties =
    compactStyle({
      borderColor,
      borderWidth: paneBorderWidthMap[style.panes.secondary.borderEmphasis],
    }) ?? {};

  return (
    <div
      className={joinClasses(
        "space-y-4 border",
        resolvedVariant === "cards" ? "rounded-2xl p-5 shadow-sm" : "rounded-xl p-4"
      )}
      style={{
        ...containerStyle,
        ["--nextless-toggle-accent" as string]: accentColor ?? "var(--color-text)",
        ["--nextless-toggle-accent-contrast" as string]:
          accentContrastColor ?? "var(--color-background)",
      }}
      data-coderso-toggle-block="1"
      data-coderso-toggle-variant={resolvedVariant}
      data-coderso-toggle-state={state}
      data-coderso-toggle-motion={motion}
      data-coderso-toggle-selected-suffix={labels.selectedSuffix}
    >
      <div className="space-y-3">
        <div
          role="radiogroup"
          aria-label={labels.ariaLabel}
          className={resolveTriggerGroupClass(resolvedVariant)}
        >
          {states.map((toggleState) => {
            const isActive = toggleState.id === state;
            return (
              <button
                key={toggleState.id}
                id={toggleState.id === "secondary" ? secondaryTriggerId : primaryTriggerId}
                type="button"
                role="radio"
                className={resolveTriggerClass(resolvedVariant)}
                data-coderso-toggle-trigger
                data-coderso-toggle-state-id={toggleState.id}
                data-coderso-toggle-status-label={toggleState.label}
                data-state={isActive ? "active" : "inactive"}
                aria-checked={isActive ? "true" : "false"}
                aria-controls={toggleState.id === "secondary" ? secondaryPaneId : primaryPaneId}
                tabIndex={isActive ? 0 : -1}
                style={resolveTriggerStyle(style, isActive)}
              >
                {resolvedVariant === "cards" ? (
                  <span className="flex flex-col items-start gap-1">
                    <span className="text-sm font-semibold">{toggleState.label}</span>
                    <span className="text-xs font-medium opacity-75">
                      {resolvePaneMetaLabel(toggleState.id)}
                    </span>
                  </span>
                ) : (
                  toggleState.label
                )}
              </button>
            );
          })}
        </div>
        <span className="sr-only" aria-live="polite" data-coderso-toggle-status>
          {resolveSelectedAnnouncement(
            state === "primary" ? labels.primary : labels.secondary,
            labels.selectedSuffix
          )}
        </span>
      </div>

      {labels.helper ? (
        <p className="text-sm text-[var(--color-text)]/70">{labels.helper}</p>
      ) : null}

      <div
        id={primaryPaneId}
        role="region"
        aria-labelledby={primaryTriggerId}
        className={resolvePaneClass(resolvedVariant, motion, style.panes.primary)}
        style={primaryPaneStyle}
        data-coderso-toggle-pane="primary"
        data-coderso-toggle-motion={motion}
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
          : renderEditorPlaceholder(resolvePanePlaceholder(labels.primary), renderContext)}
      </div>

      <div
        id={secondaryPaneId}
        role="region"
        aria-labelledby={secondaryTriggerId}
        className={resolvePaneClass(resolvedVariant, motion, style.panes.secondary)}
        style={secondaryPaneStyle}
        data-coderso-toggle-pane="secondary"
        data-coderso-toggle-motion={motion}
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
          : renderEditorPlaceholder(resolvePanePlaceholder(labels.secondary), renderContext)}
      </div>

      {runtimeScript}
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
    editorContract: toggleBlockEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: ToggleBlock,
  };
}
