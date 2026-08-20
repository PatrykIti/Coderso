// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { DetailTemplateCanvas } from "../../../core/admin/ui/content-types/DetailTemplateCanvas";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const createHeading = (overrides: Partial<PageBlockV2> = {}): PageBlockV2 =>
  createPageBlockV2("heading", {
    id: "block-heading",
    props: { text: "Product heading", level: "h2", align: "left" },
    ...overrides,
  });

const createTextBlock = (overrides: Partial<PageBlockV2> = {}): PageBlockV2 =>
  createPageBlockV2("text", {
    id: "block-text",
    props: { text: "Product copy", format: "paragraph", align: "left" },
    ...overrides,
  });

const createHeroSection = (overrides: Partial<PageSectionV2> = {}): PageSectionV2 =>
  createPageSectionV2("hero", {
    id: "section-hero",
    name: "Hero section",
    variant: "centered",
    blocks: [createHeading()],
    ...overrides,
  });

const createCtaSection = (overrides: Partial<PageSectionV2> = {}): PageSectionV2 =>
  createPageSectionV2("cta", {
    id: "section-cta",
    name: "CTA section",
    blocks: [createTextBlock({ id: "block-cta-copy" })],
    ...overrides,
  });

const createLegacySection = (): PageSectionV2 =>
  createPageSectionV2("custom", {
    id: "section-legacy",
    name: "Legacy section",
    blocks: [
      createPageBlockV2("legacy-widget", {
        id: "block-legacy",
        props: {
          legacyWidgetType: "totally-custom-widget",
          data: { note: "preserved verbatim" },
        },
      }),
    ],
  });

const ControlledCanvas = ({
  sections,
  onSelect,
  onChange,
}: {
  sections: PageSectionV2[];
  onSelect: (target: { kind: "section" | "block"; id: string; sectionId?: string }) => void;
  onChange: (next: PageSectionV2[]) => void;
}) => {
  const [current, setCurrent] = React.useState(sections);
  return (
    <DetailTemplateCanvas
      sections={current}
      selection={null}
      onSelect={onSelect}
      onChange={(next) => {
        setCurrent(next);
        onChange(next);
      }}
    />
  );
};

const click = (element: HTMLElement) => {
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const changeAddBlockSelect = (container: HTMLElement, blockType: string) => {
  const select = container.querySelector<HTMLSelectElement>("[data-detail-template-add-block]");
  if (!select) throw new Error("Missing add-block select");
  React.act(() => {
    select.value = blockType;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

test("canvas renders sections, blocks, layers, and runtime previews with selection chrome", () => {
  const onChange = vi.fn();
  const onSelect = vi.fn();
  const view = mount(
    <DetailTemplateCanvas
      sections={[createHeroSection(), createCtaSection()]}
      selection={{ kind: "block", sectionId: "section-hero", id: "block-heading" }}
      onSelect={onSelect}
      onChange={onChange}
    />
  );

  try {
    expect(view.container.querySelectorAll("[data-detail-template-section]")).toHaveLength(2);
    expect(
      view.container.querySelector('[data-detail-template-section-type="hero"]')
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-detail-template-block="block-heading"]')
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-detail-template-block-type="heading"]')
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-detail-template-block-preview="true"]')
    ).not.toBeNull();
    expect(view.container.textContent).toContain("Product heading");
    expect(view.container.textContent).toContain("Product copy");
    expect(
      view.container.querySelector('[data-authoring-layer-node="block-heading"]')
    ).not.toBeNull();
    expect(
      view.container
        .querySelector('[data-authoring-layer-node="block-heading"]')
        ?.getAttribute("aria-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("canvas emits empty and per-section empty states", () => {
  const view = mount(
    <DetailTemplateCanvas sections={[]} selection={null} onSelect={vi.fn()} onChange={vi.fn()} />
  );

  try {
    expect(view.container.textContent).toContain("Empty detail template. Add a section to start.");
  } finally {
    view.cleanup();
  }
});

test("canvas adds sections through the section palette", () => {
  const onChange = vi.fn();
  const view = mount(
    <DetailTemplateCanvas
      sections={[createHeroSection()]}
      selection={null}
      onSelect={vi.fn()}
      onChange={onChange}
    />
  );

  try {
    const addCta = view.container.querySelector<HTMLElement>(
      '[data-detail-template-add-section="cta"]'
    );
    expect(addCta).not.toBeNull();
    click(addCta!);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls.at(-1)?.[0] as PageSectionV2[];
    expect(next).toHaveLength(2);
    expect(next[1]?.type).toBe("cta");
    expect(next[1]?.blocks[0]?.type).toBe("heading");
  } finally {
    view.cleanup();
  }
});

test("canvas adds blocks through the add-block select", () => {
  const onChange = vi.fn();
  const view = mount(
    <DetailTemplateCanvas
      sections={[createHeroSection()]}
      selection={null}
      onSelect={vi.fn()}
      onChange={onChange}
    />
  );

  try {
    changeAddBlockSelect(view.container, "text");
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls.at(-1)?.[0] as PageSectionV2[];
    expect(next[0]?.blocks).toHaveLength(2);
    expect(next[0]?.blocks[1]?.type).toBe("text");
  } finally {
    view.cleanup();
  }
});

test("canvas moves, duplicates, and deletes sections", () => {
  const onChange = vi.fn();
  const view = mount(
    <ControlledCanvas
      sections={[createHeroSection(), createCtaSection()]}
      onSelect={vi.fn()}
      onChange={onChange}
    />
  );

  try {
    click(
      view.container.querySelector<HTMLElement>('[aria-label="Move section Hero section down"]')!
    );
    let next = onChange.mock.calls.at(-1)?.[0] as PageSectionV2[];
    expect(next.map((section) => section.id)).toEqual(["section-cta", "section-hero"]);

    click(
      view.container.querySelector<HTMLElement>('[aria-label="Duplicate section Hero section"]')!
    );
    next = onChange.mock.calls.at(-1)?.[0] as PageSectionV2[];
    expect(next).toHaveLength(3);
    expect(next[2]?.type).toBe("hero");
    expect(next[2]?.id).not.toBe("section-hero");

    click(view.container.querySelector<HTMLElement>('[aria-label="Delete section CTA section"]')!);
    next = onChange.mock.calls.at(-1)?.[0] as PageSectionV2[];
    expect(next).toHaveLength(2);
    expect(next.map((section) => section.type)).toEqual(["hero", "hero"]);
    expect(next[0]?.id).toBe("section-hero");
    expect(next[1]?.id).not.toBe("section-hero");
  } finally {
    view.cleanup();
  }
});

test("canvas moves, duplicates, and deletes blocks", () => {
  const onChange = vi.fn();
  const view = mount(
    <ControlledCanvas
      sections={[
        createHeroSection({ blocks: [createHeading(), createTextBlock({ id: "block-cta" })] }),
      ]}
      onSelect={vi.fn()}
      onChange={onChange}
    />
  );

  try {
    click(view.container.querySelector<HTMLElement>('[aria-label="Move Product copy up"]')!);
    let next = onChange.mock.calls.at(-1)?.[0] as PageSectionV2[];
    expect(next[0]?.blocks.map((block) => block.id)).toEqual(["block-cta", "block-heading"]);

    click(view.container.querySelector<HTMLElement>('[aria-label="Duplicate Product heading"]')!);
    next = onChange.mock.calls.at(-1)?.[0] as PageSectionV2[];
    expect(next[0]?.blocks).toHaveLength(3);

    click(view.container.querySelector<HTMLElement>('[aria-label="Delete Product copy"]')!);
    next = onChange.mock.calls.at(-1)?.[0] as PageSectionV2[];
    expect(next[0]?.blocks.map((block) => block.type)).toEqual(["heading", "heading"]);
  } finally {
    view.cleanup();
  }
});

test("canvas reports section and block selection targets", () => {
  const onSelect = vi.fn();
  const view = mount(
    <DetailTemplateCanvas
      sections={[createHeroSection()]}
      selection={null}
      onSelect={onSelect}
      onChange={vi.fn()}
    />
  );

  try {
    click(
      view.container.querySelector<HTMLElement>('[data-detail-template-section="section-hero"]')!
    );
    expect(onSelect).toHaveBeenLastCalledWith({ kind: "section", id: "section-hero" });

    click(
      view.container.querySelector<HTMLElement>('[data-detail-template-block="block-heading"]')!
    );
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: "block",
      sectionId: "section-hero",
      id: "block-heading",
    });
  } finally {
    view.cleanup();
  }
});

test("canvas renders legacy widgets read-only without mutation controls", () => {
  const onChange = vi.fn();
  const view = mount(
    <DetailTemplateCanvas
      sections={[createLegacySection()]}
      selection={null}
      onSelect={vi.fn()}
      onChange={onChange}
    />
  );

  try {
    expect(
      view.container.querySelector('[data-legacy-widget="totally-custom-widget"]')
    ).not.toBeNull();
    expect(view.container.querySelector('[data-legacy-reauthor-note="true"]')).not.toBeNull();
    const legacyBlock = view.container.querySelector('[data-detail-template-block="block-legacy"]');
    expect(legacyBlock?.querySelector('[aria-label^="Delete"]')).toBeNull();
    expect(legacyBlock?.querySelector('[aria-label^="Duplicate"]')).toBeNull();
    expect(legacyBlock?.querySelector('[aria-label^="Move"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
