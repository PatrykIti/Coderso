// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import type { PageBlockV2, PageSectionV2 } from "../../../core/services/pages/pageDocumentV2";
import type { PageLayoutSettings } from "../../../core/services/pages/layoutSettings";
import { DetailTemplateCanvas } from "../../../core/admin/ui/content-types/DetailTemplateCanvas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-badge-variant={variant}>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...(rest as Record<string, unknown>)}>
      {children}
    </button>
  ),
}));

vi.mock("@/ui/authoring", () => ({
  isAuthoringBlockSelection: (target: unknown) => (target as { kind?: string })?.kind === "block",
  isAuthoringSectionSelection: (target: unknown) =>
    (target as { kind?: string })?.kind === "section",
  AuthoringLayersPanel: ({
    nodes,
    selection,
    onSelect,
  }: {
    nodes: Array<{
      id: string;
      label: string;
      kind: string;
      target: unknown;
      children?: Array<{
        id: string;
        label: string;
        kind: string;
        target: unknown;
        children?: unknown[];
      }>;
    }>;
    selection: { id: string } | null;
    onSelect: (target: unknown) => void;
  }) => {
    const flattened: Array<{ id: string; label: string; kind: string; target: unknown }> = [];
    const visit = (items: typeof nodes) => {
      for (const node of items) {
        flattened.push(node);
        if (node.children?.length) visit(node.children as never);
      }
    };
    visit(nodes);
    return (
      <div data-testid="layers">
        {flattened.map((node) => (
          <button
            key={node.id}
            data-layer-kind={node.kind}
            data-layer-id={node.id}
            aria-selected={selection?.id === node.id ? "true" : "false"}
            onClick={() => onSelect(node.target)}
          >
            {node.label}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("../../../core/services/pages/pageRendererV2", () => ({
  PageBlockContent: ({ block }: { block: PageBlockV2 }) => (
    <div data-block-preview={block.type}>block preview</div>
  ),
  PageSectionContent: () => <div data-section-preview="true">section preview</div>,
}));

vi.mock("../../../core/services/pages/legacyWidgetPlaceholder", () => ({
  LegacyWidgetPlaceholder: ({ block }: { block: PageBlockV2 }) => (
    <div data-legacy-widget={block.type}>legacy placeholder</div>
  ),
}));

let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container?.remove();
  container = null;
  vi.clearAllMocks();
});

const text = () => container!.textContent ?? "";

const heroSection = (): PageSectionV2 =>
  createPageSectionV2("hero", {
    id: "section-hero",
    name: "Hero section",
    variant: "split",
    blocks: [
      createPageBlockV2("heading", {
        id: "block-title",
        props: { text: "Big title", level: "h1" },
      }),
      createPageBlockV2("button", { id: "block-cta", props: { label: "Go", href: "/" } }),
    ],
  });

const emptySection = (): PageSectionV2 =>
  createPageSectionV2("content", { id: "section-empty", name: "Empty section", blocks: [] });

const hiddenSection = (): PageSectionV2 =>
  createPageSectionV2("cta", {
    id: "section-hidden",
    name: "Hidden CTA",
    visibility: { visible: false, authOnly: true },
    blocks: [],
  });

const legacySection = (): PageSectionV2 =>
  createPageSectionV2("content", {
    id: "section-legacy",
    name: "Legacy section",
    blocks: [
      createPageBlockV2("legacy-widget", {
        id: "block-legacy",
        props: { legacyWidgetType: "v1-widget", data: { note: "kept" } },
      }),
    ],
  });

const nestedSection = (): PageSectionV2 => {
  const card = createPageBlockV2("card", { id: "block-card", props: { title: "Card" } });
  card.slots = {
    "panel:1": [createPageBlockV2("heading", { id: "block-nested", props: { text: "Nested" } })],
  };
  const section = createPageSectionV2("content", {
    id: "section-nested",
    name: "Nested section",
    blocks: [card],
  });
  section.blocks = [card];
  return section;
};

const layoutFixture = (
  overrides: Partial<PageLayoutSettings["wrapper"]> = {}
): PageLayoutSettings => ({
  wrapper: {
    container: "narrow",
    maxWidth: "5xl",
    padding: { top: "lg", bottom: "md" },
    background: {
      color: "#f0f0f0",
      image: null,
      media: { type: "none", source: "external", src: null },
    },
    ...overrides,
  },
  sections: {
    gap: "md",
    defaults: {
      container: "default",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "none", bottom: "none" },
    },
  },
  applyDefaultsToNewBlocks: true,
});

const mountCanvas = (
  sections: PageSectionV2[],
  onChange = vi.fn(),
  selection: { kind: "section" | "block"; id: string; sectionId?: string } | null = null,
  onSelect = vi.fn(),
  layout?: PageLayoutSettings
) => {
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <DetailTemplateCanvas
        sections={sections}
        layout={layout}
        selection={selection as never}
        onSelect={onSelect}
        onChange={onChange}
      />
    );
  });
  return { onChange, onSelect, root };
};

const buttonByLabel = (label: string) =>
  Array.from(container!.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === label
  );

const clickButton = (label: string) => {
  const button = buttonByLabel(label);
  if (!button) throw new Error(`Missing button: ${label}`);
  React.act(() => {
    button.click();
  });
};

const clickLayer = (id: string) => {
  const button = container!.querySelector<HTMLButtonElement>(`[data-layer-id="${id}"]`);
  if (!button) throw new Error(`Missing layer: ${id}`);
  React.act(() => {
    button.click();
  });
};

const setSelectValue = (select: HTMLSelectElement, value: string) => {
  React.act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

test("shows the empty state when there are no sections", () => {
  const { root } = mountCanvas([]);
  try {
    expect(text()).toContain("Empty detail template. Add a section to start.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders sections, blocks, and layer rows", () => {
  const { onSelect, root } = mountCanvas([heroSection()]);
  try {
    expect(text()).toContain("Hero section");
    expect(text()).toContain("Big title");
    expect(container!.querySelector('[data-detail-template-section="section-hero"]')).toBeTruthy();
    expect(container!.querySelector('[data-detail-template-block="block-title"]')).toBeTruthy();
    expect(container!.querySelector('[data-layer-kind="section"]')).toBeTruthy();
    expect(container!.querySelector('[data-layer-kind="block"]')).toBeTruthy();
    expect(text()).toContain("split");
    clickLayer("block-title");
    expect(onSelect).toHaveBeenCalledWith({
      kind: "block",
      sectionId: "section-hero",
      id: "block-title",
    });
  } finally {
    React.act(() => root.unmount());
  }
});

test("adds a section through the add-section button", () => {
  const { onChange, onSelect, root } = mountCanvas([heroSection()]);
  try {
    const addButton = container!.querySelector<HTMLButtonElement>(
      '[data-detail-template-add-section="cta"]'
    );
    if (!addButton) throw new Error("Missing add section button");
    React.act(() => {
      addButton.click();
    });
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next).toHaveLength(2);
    expect(next[1]?.type).toBe("cta");
    expect(next[1]?.blocks.length).toBeGreaterThan(0);
    expect(onSelect).toHaveBeenCalledWith({ kind: "section", id: next[1]?.id });
  } finally {
    React.act(() => root.unmount());
  }
});

test("removes a section and selects its neighbor", () => {
  const { onChange, onSelect, root } = mountCanvas([heroSection(), emptySection()]);
  try {
    clickButton("Delete section Hero section");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next.map((section) => section.id)).toEqual(["section-empty"]);
    expect(onSelect).toHaveBeenCalledWith({ kind: "section", id: "section-empty" });
  } finally {
    React.act(() => root.unmount());
  }
});

test("removes the only section without selecting anything", () => {
  const { onChange, onSelect, root } = mountCanvas([heroSection()]);
  try {
    clickButton("Delete section Hero section");
    expect(onChange).toHaveBeenCalledWith([]);
    expect(onSelect).not.toHaveBeenCalled();
  } finally {
    React.act(() => root.unmount());
  }
});

test("moves a section up and ignores the boundary", () => {
  const { onChange, onSelect, root } = mountCanvas([emptySection(), heroSection()]);
  try {
    clickButton("Move section Hero section up");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next.map((section) => section.id)).toEqual(["section-hero", "section-empty"]);
    expect(onSelect).toHaveBeenCalledWith({ kind: "section", id: "section-hero" });

    onChange.mockClear();
    onSelect.mockClear();
    clickButton("Move section Empty section up");
    expect(onChange).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  } finally {
    React.act(() => root.unmount());
  }
});

test("moves a section down and ignores the lower boundary", () => {
  const { onChange, root } = mountCanvas([emptySection(), heroSection()]);
  try {
    clickButton("Move section Empty section down");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next.map((section) => section.id)).toEqual(["section-hero", "section-empty"]);
    onChange.mockClear();
    clickButton("Move section Hero section down");
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    React.act(() => root.unmount());
  }
});

test("duplicates a section with fresh block ids", () => {
  const { onChange, onSelect, root } = mountCanvas([heroSection()]);
  try {
    clickButton("Duplicate section Hero section");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next).toHaveLength(2);
    expect(next[1]?.id).not.toBe(next[0]?.id);
    expect(next[1]?.variant).toBe("split");
    expect(next[1]?.blocks[0]?.id).not.toBe(next[0]?.blocks[0]?.id);
    expect(onSelect).toHaveBeenCalledWith({ kind: "section", id: next[1]?.id });
  } finally {
    React.act(() => root.unmount());
  }
});

test("adds a block through the add-block select", () => {
  const { onChange, onSelect, root } = mountCanvas([emptySection()]);
  try {
    const addBlockSelect = container!.querySelector<HTMLSelectElement>(
      "[data-detail-template-add-block]"
    );
    if (!addBlockSelect) throw new Error("Missing add block select");
    setSelectValue(addBlockSelect, "heading");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next[0]?.blocks).toHaveLength(1);
    expect(next[0]?.blocks[0]?.type).toBe("heading");
    expect(onSelect).toHaveBeenCalledWith({
      kind: "block",
      sectionId: "section-empty",
      id: next[0]?.blocks[0]?.id,
    });
  } finally {
    React.act(() => root.unmount());
  }
});

test("removes a selected block and falls back to a neighbor", () => {
  const { onChange, onSelect, root } = mountCanvas([heroSection()], vi.fn(), {
    kind: "block",
    sectionId: "section-hero",
    id: "block-title",
  });
  try {
    clickButton("Delete Big title");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next[0]?.blocks.map((block) => block.id)).toEqual(["block-cta"]);
    expect(onSelect).toHaveBeenCalledWith({
      kind: "block",
      sectionId: "section-hero",
      id: "block-cta",
    });
  } finally {
    React.act(() => root.unmount());
  }
});

test("removes the last block of a selected section and selects the section", () => {
  const singleBlockSection = createPageSectionV2("content", {
    id: "section-solo",
    name: "Solo section",
    blocks: [createPageBlockV2("heading", { id: "block-solo", props: { text: "Solo" } })],
  });
  const { onSelect, root } = mountCanvas([singleBlockSection], vi.fn(), {
    kind: "block",
    sectionId: "section-solo",
    id: "block-solo",
  });
  try {
    clickButton("Delete Solo");
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "section", id: "section-solo" });
  } finally {
    React.act(() => root.unmount());
  }
});

test("removes a block that is not selected without re-selecting", () => {
  const { onSelect, root } = mountCanvas([heroSection()], vi.fn(), {
    kind: "section",
    id: "section-hero",
  });
  try {
    clickButton("Delete Go");
    expect(onSelect).not.toHaveBeenCalled();
  } finally {
    React.act(() => root.unmount());
  }
});

test("moves a block up and keeps the first block in place", () => {
  const { onChange, onSelect, root } = mountCanvas([heroSection()]);
  try {
    clickButton("Move Big title up");
    const first = onChange.mock.calls[0]?.[0] as PageSectionV2[];
    expect(first?.[0]?.blocks.map((block) => block.id)).toEqual(["block-title", "block-cta"]);

    onChange.mockClear();
    clickButton("Move Go up");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next[0]?.blocks.map((block) => block.id)).toEqual(["block-cta", "block-title"]);
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: "block",
      sectionId: "section-hero",
      id: "block-cta",
    });
  } finally {
    React.act(() => root.unmount());
  }
});

test("moves a block down", () => {
  const { onChange, root } = mountCanvas([heroSection()]);
  try {
    clickButton("Move Big title down");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next[0]?.blocks.map((block) => block.id)).toEqual(["block-cta", "block-title"]);
  } finally {
    React.act(() => root.unmount());
  }
});

test("duplicates a block with a fresh id", () => {
  const { onChange, onSelect, root } = mountCanvas([heroSection()]);
  try {
    clickButton("Duplicate Big title");
    const next = onChange.mock.calls[0][0] as PageSectionV2[];
    expect(next[0]?.blocks).toHaveLength(3);
    const copy = next[0]?.blocks[1];
    expect(copy?.id).not.toBe("block-title");
    expect(copy?.props).toMatchObject({ text: "Big title" });
    expect(onSelect).toHaveBeenCalledWith({
      kind: "block",
      sectionId: "section-hero",
      id: copy?.id,
    });
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders legacy widget blocks with a re-author note and no mutation controls", () => {
  const { root } = mountCanvas([legacySection()]);
  try {
    expect(text()).toContain("Legacy");
    expect(text()).toContain("Re-author this block as a Page V2 block");
    expect(container!.querySelector('[data-legacy-widget="legacy-widget"]')).toBeTruthy();
    expect(buttonByLabel("Duplicate v1-widget")).toBeUndefined();
    expect(container!.querySelector('[data-detail-template-block-preview="true"]')).toBeNull();
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders an empty section message without a section preview", () => {
  const { root } = mountCanvas([emptySection()]);
  try {
    expect(text()).toContain("Empty section. Add a block.");
    expect(container!.querySelector('[data-section-preview="true"]')).toBeNull();
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders section visibility badges", () => {
  const { root } = mountCanvas([hiddenSection()]);
  try {
    expect(text()).toContain("Hidden");
    expect(text()).toContain("Auth only");
  } finally {
    React.act(() => root.unmount());
  }
});

test("applies wrapper padding, container, and background classes", () => {
  const { root } = mountCanvas([heroSection()], vi.fn(), null, vi.fn(), layoutFixture());
  try {
    const wrapper = Array.from(container!.querySelectorAll("div")).find((div) =>
      div.className.includes("overflow-hidden")
    );
    expect(wrapper?.className).toContain("pt-8");
    expect(wrapper?.className).toContain("pb-6");
    expect(wrapper?.getAttribute("style") ?? "").toContain("#f0f0f0");
    const inner = Array.from(container!.querySelectorAll("div")).find((div) =>
      div.className.includes("mx-auto w-full max-w-4xl")
    );
    expect(inner?.className).toContain("max-w-5xl");
    expect(container!.querySelector("video")).toBeNull();
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders a wrapper background image from media", () => {
  const layout = layoutFixture({
    background: {
      color: "#000000",
      image: null,
      media: { type: "image", source: "external", src: "https://cdn.example.com/cover.jpg" },
    },
  });
  const { root } = mountCanvas([heroSection()], vi.fn(), null, vi.fn(), layout);
  try {
    const wrapper = Array.from(container!.querySelectorAll("div")).find(
      (div) =>
        div.className.includes("overflow-hidden") &&
        (div.getAttribute("style") ?? "").includes("cover.jpg")
    );
    expect(wrapper?.getAttribute("style")).toContain("url(");
    expect(wrapper?.getAttribute("style")).toContain("cover.jpg");
    expect(wrapper?.getAttribute("style")).toContain("cover");
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders a wrapper background video with relative content", () => {
  const layout = layoutFixture({
    background: {
      color: "#000000",
      image: null,
      media: { type: "video", source: "external", src: "https://cdn.example.com/bg.mp4" },
    },
  });
  const { root } = mountCanvas([heroSection()], vi.fn(), null, vi.fn(), layout);
  try {
    const video = container!.querySelector("video");
    expect(video?.getAttribute("src")).toBe("https://cdn.example.com/bg.mp4");
    const inner = Array.from(container!.querySelectorAll("div")).find((div) =>
      div.className.includes("mx-auto w-full max-w-4xl")
    );
    expect(inner?.className).toContain("relative z-[1]");
  } finally {
    React.act(() => root.unmount());
  }
});

test("selects sections and blocks by clicking their canvas rows", () => {
  const { onSelect, root } = mountCanvas([heroSection()]);
  try {
    const frame = container!.querySelector<HTMLElement>(
      '[data-detail-template-section="section-hero"]'
    );
    React.act(() => {
      frame?.click();
    });
    expect(onSelect).toHaveBeenCalledWith({ kind: "section", id: "section-hero" });

    onSelect.mockClear();
    const blockRow = container!.querySelector<HTMLElement>(
      '[data-detail-template-block="block-title"]'
    );
    React.act(() => {
      blockRow?.click();
    });
    expect(onSelect).toHaveBeenCalledWith({
      kind: "block",
      sectionId: "section-hero",
      id: "block-title",
    });
  } finally {
    React.act(() => root.unmount());
  }
});

test("lists nested slot blocks as layer rows", () => {
  const { root } = mountCanvas([nestedSection()]);
  try {
    expect(container!.querySelector('[data-layer-id="block-card"]')).toBeTruthy();
    expect(container!.querySelector('[data-layer-id="block-nested"]')).toBeTruthy();
  } finally {
    React.act(() => root.unmount());
  }
});

test("highlights the selected section and layer rows", () => {
  const { root } = mountCanvas([heroSection()], vi.fn(), {
    kind: "section",
    id: "section-hero",
  });
  try {
    const frame = container!.querySelector<HTMLElement>(
      '[data-detail-template-section="section-hero"]'
    );
    expect(frame?.className).toContain("border-primary/60");
    const layer = container!.querySelector<HTMLElement>('[data-layer-id="section-hero"]');
    expect(layer?.getAttribute("aria-selected")).toBe("true");
  } finally {
    React.act(() => root.unmount());
  }
});
