// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import type {
  PageBlockV2,
  PageListItemV2,
  PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { DetailTemplateInspector } from "../../../core/admin/ui/content-types/DetailTemplateInspector";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  getCachedForms: vi.fn(() => [{ id: "form-1", name: "Contact form" }]),
  getCachedContentTypes: vi.fn(() => [{ id: "ct-1", name: "Articles" }]),
  getCachedListingQueries: vi.fn(() => [
    { id: "query-1", name: "Latest posts", query: { source: "entries" } },
    { id: "query-2", name: "Draft pages", query: { source: "pages" } },
  ]),
  getCachedListingTemplates: vi.fn(() => [{ id: "template-1", name: "Grid listing" }]),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/services/formsClient", () => ({
  getCachedForms: state.getCachedForms,
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: state.getCachedContentTypes,
}));

vi.mock("@/services/listingsClient", () => ({
  getCachedListingQueries: state.getCachedListingQueries,
  getCachedListingTemplates: state.getCachedListingTemplates,
}));

vi.mock("@/ui/pages/editorControls", () => ({
  ColorSwatchControl: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value?: unknown;
    onChange: (value: string | null) => void;
  }) => (
    <div data-control="color" data-value={String(value ?? "")}>
      <span>{label}</span>
      <button type="button" data-commit="color" onClick={() => onChange("#123456")}>
        commit color
      </button>
    </div>
  ),
  ComboboxControl: ({
    label,
    value,
    options,
    onChange,
    allowNull,
  }: {
    label: string;
    value: string | null;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string | null) => void;
    allowNull?: boolean;
  }) => (
    <div data-control="combobox" data-value={value ?? ""}>
      <span>{label}</span>
      {allowNull ? (
        <button type="button" data-commit="combobox-none" onClick={() => onChange(null)}>
          none
        </button>
      ) : null}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-commit="combobox"
          data-option={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
  FacetListControl: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: unknown;
    onChange: (facets: unknown[]) => void;
  }) => (
    <div data-control="facets" data-value={JSON.stringify(value)}>
      <span>{label}</span>
      <button
        type="button"
        data-commit="facets"
        onClick={() => onChange([{ id: "facet-1", field: "category", label: "Category" }])}
      >
        commit facets
      </button>
    </div>
  ),
  ListItemsControl: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: readonly PageListItemV2[];
    onChange: (items: PageListItemV2[]) => void;
  }) => (
    <div data-control="items" data-value={JSON.stringify(value)}>
      <span>{label}</span>
      <button type="button" data-commit="items" onClick={() => onChange(["Item one"])}>
        commit items
      </button>
    </div>
  ),
  SegmentedControl: ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
  }) => (
    <div data-control="segmented" data-value={value}>
      <span>{label}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-commit="segmented"
          data-option={option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  ),
  SliderControl: ({
    label,
    value,
    max,
    onChange,
  }: {
    label: string;
    value: number;
    max: number;
    onChange: (value: number) => void;
  }) => (
    <div data-control="slider" data-value={value}>
      <span>{label}</span>
      <button type="button" data-commit="slider" onClick={() => onChange(max)}>
        commit slider
      </button>
    </div>
  ),
  SliderStepperControl: ({
    label,
    value,
    max,
    onChange,
  }: {
    label: string;
    value: number;
    max: number;
    onChange: (value: number) => void;
  }) => (
    <div data-control="slider-stepper" data-value={value}>
      <span>{label}</span>
      <button type="button" data-commit="slider-stepper" onClick={() => onChange(max)}>
        commit stepper
      </button>
    </div>
  ),
  ToggleSwitch: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <div data-control="toggle" data-value={String(value)}>
      <span>{label}</span>
      <button type="button" data-commit="toggle" onClick={() => onChange(!value)}>
        commit toggle
      </button>
    </div>
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

const mountInspector = (section: PageSectionV2 | null, block: PageBlockV2 | null) => {
  const onSectionChange = vi.fn<(next: PageSectionV2) => void>();
  const onBlockChange = vi.fn<(next: PageBlockV2) => void>();
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <DetailTemplateInspector
        section={section}
        block={block}
        onSectionChange={onSectionChange}
        onBlockChange={onBlockChange}
      />
    );
  });
  return { onSectionChange, onBlockChange, root };
};

const commit = (selector: string, option?: string) => {
  const selectorWithOption = option ? `${selector}[data-option="${option}"]` : selector;
  const button = container!.querySelector<HTMLButtonElement>(selectorWithOption);
  if (!button) throw new Error(`Missing commit target: ${selectorWithOption}`);
  React.act(() => {
    button.click();
  });
};

const controlsOf = (name: string) => container!.querySelectorAll(`[data-control="${name}"]`);

const heroSection = (): PageSectionV2 =>
  createPageSectionV2("hero", {
    id: "section-hero",
    name: "Hero section",
    variant: "centered",
    blocks: [],
  });

const collectionBlock = (): PageBlockV2 =>
  createPageBlockV2("collection", {
    id: "block-collection",
    props: { contentTypeId: "ct-1", limit: 6, paginationMode: "paged" },
  });

const filtersBlock = (): PageBlockV2 =>
  createPageBlockV2("filters", { id: "block-filters", props: {} });

const formBlock = (): PageBlockV2 =>
  createPageBlockV2("form", { id: "block-form", props: { formId: "form-1" } });

const cardBlock = (): PageBlockV2 =>
  createPageBlockV2("card", { id: "block-card", props: { title: "Card" } });

const imageBlock = (): PageBlockV2 =>
  createPageBlockV2("image", { id: "block-image", props: { src: "" } });

const videoBlock = (): PageBlockV2 =>
  createPageBlockV2("video", { id: "block-video", props: { src: "" } });

const listBlock = (): PageBlockV2 =>
  createPageBlockV2("list", { id: "block-list", props: { items: ["Alpha"] } });

/**
 * Re-injects a raw (un-normalized) `props.items` value into a real list block:
 * `createPageBlockV2` alone would run the owner stored-read normalizer first,
 * and the inspector seam is what must adapt the untyped value.
 */
const rawListBlock = (items: unknown): PageBlockV2 => {
  const block = createPageBlockV2("list", { id: "block-list-raw", props: { items: [] } });
  return { ...block, props: { ...block.props, items } };
};

const itemsValueOf = () => {
  const control = container!.querySelector('[data-control="items"]');
  if (!control) throw new Error("Missing list items control");
  return control.getAttribute("data-value") ?? "";
};

const galleryBlock = (): PageBlockV2 => createPageBlockV2("gallery", { id: "block-gallery" });

const legacyWidgetBlock = (): PageBlockV2 =>
  createPageBlockV2("legacy-widget", {
    id: "block-legacy",
    props: { legacyWidgetType: "totally-custom-widget", data: { note: "kept" } },
  });

const iconBlockFixture = (): PageBlockV2 =>
  createPageBlockV2("icon", { id: "block-icon", props: { name: "check" } });

const headingBlock = (): PageBlockV2 =>
  createPageBlockV2("heading", {
    id: "block-heading",
    props: { text: "Product heading", level: "h2" },
  });

test("shows an empty-state hint when no section or block is selected", () => {
  const { root } = mountInspector(null, null);
  try {
    expect(text()).toContain("Select a section or block to configure it.");
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders the hero section variant and layout controls", () => {
  const { onSectionChange, root } = mountInspector(heroSection(), null);
  try {
    expect(text()).toContain("Hero section");
    expect(text()).toContain("Variant");
    expect(controlsOf("segmented").length).toBeGreaterThan(0);
    expect(controlsOf("slider").length).toBeGreaterThan(0);
    expect(controlsOf("slider-stepper").length).toBeGreaterThan(0);
    expect(controlsOf("color").length).toBeGreaterThan(0);
    expect(controlsOf("toggle").length).toBeGreaterThan(0);

    commit('[data-commit="segmented"]', "split");
    expect(onSectionChange).toHaveBeenCalledWith(expect.objectContaining({ variant: "split" }));

    commit('[data-commit="color"]');
    expect(
      onSectionChange.mock.calls.some(([section]) => typeof section.style.background === "string")
    ).toBe(true);
  } finally {
    React.act(() => root.unmount());
  }
});

test("edits a heading block text and level", () => {
  const { onBlockChange, root } = mountInspector(null, headingBlock());
  try {
    expect(text()).toContain("Product heading");
    const textInput = Array.from(container!.querySelectorAll("input")).find(
      (input) => input.value === "Product heading"
    );
    React.act(() => {
      if (!textInput) throw new Error("Missing heading text input");
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        textInput,
        "Renamed heading"
      );
      textInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onBlockChange).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ text: "Renamed heading" }),
      })
    );

    commit('[data-commit="segmented"]', "h3");
    expect(onBlockChange).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ level: "h3" }),
      })
    );
  } finally {
    React.act(() => root.unmount());
  }
});

test("commits collection block controls through every control kind", () => {
  const { onBlockChange, root } = mountInspector(heroSection(), collectionBlock());
  try {
    expect(controlsOf("combobox").length).toBeGreaterThanOrEqual(3);

    commit('[data-commit="combobox"][data-option="ct-1"]');
    expect(onBlockChange).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ contentTypeId: "ct-1" }) })
    );

    commit('[data-commit="slider"]');
    expect(onBlockChange.mock.calls.some(([block]) => typeof block.props.limit === "number")).toBe(
      true
    );

    commit('[data-commit="segmented"]', "paged");
    expect(onBlockChange.mock.calls.some(([block]) => block.props.paginationMode === "paged")).toBe(
      true
    );

    const toggles = controlsOf("toggle");
    expect(toggles.length).toBeGreaterThanOrEqual(1);
  } finally {
    React.act(() => root.unmount());
  }
});

test("commits filters block controls including the facet list", () => {
  const { onBlockChange, root } = mountInspector(heroSection(), filtersBlock());
  try {
    expect(controlsOf("facets").length).toBe(1);
    commit('[data-commit="facets"]');
    expect(onBlockChange.mock.calls.some(([block]) => Array.isArray(block.props.facets))).toBe(
      true
    );
    expect(controlsOf("toggle").length).toBeGreaterThanOrEqual(3);
    expect(controlsOf("segmented").length).toBeGreaterThanOrEqual(1);
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders a section without a variant control without crashing", () => {
  const section = createPageSectionV2("collection", {
    id: "section-collection",
    name: "Collection section",
    variant: "default",
    blocks: [],
  });
  const { root } = mountInspector(section, null);
  try {
    expect(text()).toContain("Collection section");
    expect(container!.querySelector('[data-inspector-group="variant"]')).toBeNull();
  } finally {
    React.act(() => root.unmount());
  }
});

test("commits an icon block through the native name select", () => {
  const { onBlockChange, root } = mountInspector(null, iconBlockFixture());
  try {
    const nameSelect = Array.from(container!.querySelectorAll("select")).find(
      (select) => select.options.length >= 6
    );
    if (!nameSelect) throw new Error("Missing icon name select");
    const selectedName = nameSelect.options[1]?.value ?? "";
    React.act(() => {
      nameSelect.value = selectedName;
      nameSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onBlockChange).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ name: selectedName }) })
    );
  } finally {
    React.act(() => root.unmount());
  }
});

test("commits a form block through the forms combobox and success select", () => {
  const { onBlockChange, root } = mountInspector(heroSection(), formBlock());
  try {
    commit('[data-commit="combobox"][data-option="form-1"]');
    expect(onBlockChange).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ formId: "form-1" }) })
    );
    commit('[data-commit="segmented"]', "show-message-reset-form");
    expect(onBlockChange).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ successBehavior: "show-message-reset-form" }),
      })
    );
  } finally {
    React.act(() => root.unmount());
  }
});

test("commits card and image media controls", () => {
  const card = mountInspector(null, cardBlock());
  try {
    expect(text()).toContain("Image");
    const cardMediaInput = Array.from(container!.querySelectorAll("input")).find(
      (input) => input.getAttribute("placeholder") === "Media URL or asset id"
    );
    React.act(() => {
      if (!cardMediaInput) throw new Error("Missing card media input");
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        cardMediaInput,
        "https://cdn.example.com/card.jpg"
      );
      cardMediaInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(card.onBlockChange).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ image: "https://cdn.example.com/card.jpg" }),
      })
    );
  } finally {
    React.act(() => card.root.unmount());
  }

  const image = mountInspector(null, imageBlock());
  try {
    const mediaInput = Array.from(container!.querySelectorAll("input")).find(
      (input) => input.getAttribute("placeholder") === "Media URL or asset id"
    );
    React.act(() => {
      if (!mediaInput) throw new Error("Missing media input");
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        mediaInput,
        "https://cdn.example.com/a.jpg"
      );
      mediaInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(image.onBlockChange).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ src: "https://cdn.example.com/a.jpg" }),
      })
    );
  } finally {
    React.act(() => image.root.unmount());
  }
});

test("commits video media and autoplay toggle", () => {
  const { onBlockChange, root } = mountInspector(null, videoBlock());
  try {
    commit('[data-commit="toggle"]');
    expect(onBlockChange.mock.calls.some(([block]) => block.props.autoplay === true)).toBe(true);
  } finally {
    React.act(() => root.unmount());
  }
});

test("commits list block items and ordered toggle", () => {
  const { onBlockChange, root } = mountInspector(null, listBlock());
  try {
    commit('[data-commit="items"]');
    expect(onBlockChange.mock.calls.some(([block]) => Array.isArray(block.props.items))).toBe(true);
    expect(controlsOf("toggle").length).toBeGreaterThanOrEqual(1);
  } finally {
    React.act(() => root.unmount());
  }
});

test("forwards the stored owner list-item shapes through the inspector seam", () => {
  const { root } = mountInspector(
    null,
    rawListBlock(["Alpha", { label: "Privacy", href: "/privacy" }])
  );
  try {
    expect(itemsValueOf()).toBe('["Alpha",{"label":"Privacy","href":"/privacy"}]');
  } finally {
    React.act(() => root.unmount());
  }
});

test("adapts raw scalar and malformed list entries with the owner read semantics", () => {
  const { root } = mountInspector(
    null,
    rawListBlock([42, true, null, { label: 3, href: "/privacy" }])
  );
  try {
    expect(itemsValueOf()).toBe('["42","true","",{"label":"","href":"/privacy"}]');
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders an empty list instead of crashing when the raw list value is not an array", () => {
  const { root } = mountInspector(null, rawListBlock("not-a-list"));
  try {
    expect(itemsValueOf()).toBe("[]");
    expect(text()).toContain("Items");
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders the visible unsupported fallback for the gallery items control", () => {
  const { root } = mountInspector(heroSection(), galleryBlock());
  try {
    expect(text()).toContain("Gallery items: unsupported control (galleryItems).");
  } finally {
    React.act(() => root.unmount());
  }
});

test("shows a read-only note for legacy widgets", () => {
  const { root } = mountInspector(heroSection(), legacyWidgetBlock());
  try {
    expect(text()).toContain("read-only legacy widget");
    expect(container!.querySelector('[data-legacy-inspector-note="true"]')).toBeTruthy();
  } finally {
    React.act(() => root.unmount());
  }
});
