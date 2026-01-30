import type {
  Block,
  LayoutValue,
  WidgetDefinition,
  WidgetEditorState,
  WidgetVisibility,
} from "./types";
import { containerTokens, spacingTokens } from "./types";
import { getRegisteredWidget } from "@/ui/widgets/registry";

const defaultLayout: LayoutValue = {
  container: "default",
  padding: { top: "xl", bottom: "xl" },
  margin: { top: "none", bottom: "none" },
  background: { color: "transparent", image: null },
};

const defaultVisibility: WidgetVisibility = {
  devices: ["desktop", "tablet", "mobile"],
  enabled: true,
};
const defaultEditor: WidgetEditorState = {
  mode: "wizard",
  wizardCompleted: false,
};

const resolveDefinition = (input: WidgetDefinition | string) =>
  typeof input === "string" ? getRegisteredWidget(input) : input;

export function createBlock(definition: WidgetDefinition | string): Block {
  const resolved = resolveDefinition(definition);
  const type = typeof definition === "string" ? definition : definition.type;
  return {
    id: crypto.randomUUID(),
    type,
    variant: resolved?.variants[0]?.id,
    data: resolved?.defaults ?? {},
    layout: { ...defaultLayout },
    visibility: { ...defaultVisibility },
    editor: { ...defaultEditor },
  };
}

export function reorderBlocks<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function duplicateBlock(blocks: Block[], id: string) {
  const target = blocks.find((block) => block.id === id);
  if (!target) return blocks;
  const editorState = target.editor ?? { mode: "visual", wizardCompleted: true };
  const clone: Block = {
    ...target,
    id: crypto.randomUUID(),
    editor: { ...editorState, mode: "visual" },
  };
  const index = blocks.findIndex((block) => block.id === id);
  const next = [...blocks];
  next.splice(index + 1, 0, clone);
  return next;
}

export function stripEditor(blocks: Block[]) {
  return blocks.map(({ editor: _editor, ...rest }) => rest);
}

export function applyWizardSelection(block: Block, variant?: string): Block {
  return {
    ...block,
    variant: variant ?? block.variant,
    editor: { mode: "visual", wizardCompleted: true },
  };
}

export function sanitizeLayout(layout?: LayoutValue | null): LayoutValue {
  const resolved = {
    ...defaultLayout,
    ...layout,
    padding: { ...defaultLayout.padding, ...(layout?.padding ?? {}) },
    margin: { ...defaultLayout.margin, ...(layout?.margin ?? {}) },
    background: { ...defaultLayout.background, ...(layout?.background ?? {}) },
  };
  return {
    ...resolved,
    container: containerTokens.includes(resolved.container)
      ? resolved.container
      : "default",
    padding: {
      top: spacingTokens.includes(resolved.padding.top)
        ? resolved.padding.top
        : "md",
      bottom: spacingTokens.includes(resolved.padding.bottom)
        ? resolved.padding.bottom
        : "md",
    },
    margin: {
      top: spacingTokens.includes(resolved.margin.top) ? resolved.margin.top : "none",
      bottom: spacingTokens.includes(resolved.margin.bottom)
        ? resolved.margin.bottom
        : "none",
    },
  };
}

export function shouldWarnOnNavigate(hasChanges: boolean) {
  return hasChanges;
}
