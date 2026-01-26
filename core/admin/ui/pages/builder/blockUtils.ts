import type { Block, LayoutValue } from "./types";
import { containerTokens, spacingTokens } from "./types";

const defaultLayout: LayoutValue = {
  container: "default",
  padding: { top: "xl", bottom: "xl" },
  margin: { top: "none", bottom: "none" },
  background: { color: "white", image: null },
};

export function createBlock(type: string): Block {
  return {
    id: crypto.randomUUID(),
    type,
    variant: undefined,
    data: {},
    layout: { ...defaultLayout },
    visibility: { devices: ["desktop", "mobile"], enabled: true },
    editor: { mode: "wizard", wizardCompleted: false },
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
  const clone: Block = {
    ...target,
    id: crypto.randomUUID(),
    editor: { ...target.editor, mode: "visual" },
  };
  const index = blocks.findIndex((block) => block.id === id);
  const next = [...blocks];
  next.splice(index + 1, 0, clone);
  return next;
}

export function stripEditor(blocks: Block[]) {
  return blocks.map(({ editor: _editor, ...rest }) => rest);
}

export function applyWizardSelection(block: Block, variant: string): Block {
  return {
    ...block,
    variant,
    editor: { mode: "visual", wizardCompleted: true },
  };
}

export function sanitizeLayout(layout: LayoutValue): LayoutValue {
  return {
    ...layout,
    container: containerTokens.includes(layout.container)
      ? layout.container
      : "default",
    padding: {
      top: spacingTokens.includes(layout.padding.top) ? layout.padding.top : "md",
      bottom: spacingTokens.includes(layout.padding.bottom)
        ? layout.padding.bottom
        : "md",
    },
    margin: {
      top: spacingTokens.includes(layout.margin.top) ? layout.margin.top : "none",
      bottom: spacingTokens.includes(layout.margin.bottom)
        ? layout.margin.bottom
        : "none",
    },
  };
}

export function shouldWarnOnNavigate(hasChanges: boolean) {
  return hasChanges;
}
