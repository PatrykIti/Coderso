// @vitest-environment happy-dom
// TASK-539-03-L04 cross-contract proof (Bun-free pages lane).
// Owned by this leaf: the two dedicated gallery UI kinds, the base-only
// gallery/divider control contracts (base-vs-effective showWhen, base-owned
// parallax/divider gates, exact PAGE_LAYER_Z_CLAMP owner identity), and the
// gallery row/media/category component behavior through the REAL
// GalleryItemsControl. MediaUrlControl is replaced by a faithful test mirror
// of its documented contract (URL storage, generation/scope stale-write
// guards, maxLength reject, null clear) exactly like the L02 ui-lane suites;
// the real MediaUrlControl semantics are unit-proven there.

import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  GalleryCategoryTokensControl,
  GalleryItemsControl,
} from "../../../core/admin/ui/pages/editorControls";
import type { PageGalleryItemV2 } from "../../../core/services/pages/pageGalleryV2";
import {
  PAGE_GALLERY_ALT_MAX,
  PAGE_GALLERY_CAPTION_MAX,
  PAGE_GALLERY_CATEGORY_MAX,
  PAGE_GALLERY_CATEGORY_TOKEN_MAX,
  PAGE_GALLERY_CATEGORY_TOKENS_MAX,
  PAGE_GALLERY_ITEMS_MAX,
  PAGE_GALLERY_SRC_MAX,
} from "../../../core/services/pages/pageGalleryV2";
import {
  GALLERY_CATEGORY_PATTERN,
  PAGE_LAYER_Z_CLAMP,
} from "../../../core/services/pages/pageDocumentV2Types";
import { isPageEditorControlVisible } from "../../../core/services/pages/pageEditorControlDefinition";
import { pageBlockControlRegistry } from "../../../core/services/pages/pageEditorBlockControlRegistry";
import { pageUniversalBlockControls } from "../../../core/services/pages/pageEditorBlockStyleControls";
import { pageUniversalSectionControls } from "../../../core/services/pages/pageEditorSectionControls";
import {
  resolvePageEditorControlUiModel,
  type PageEditorControlUiModel,
} from "../../../core/services/pages/pageEditorControlUiModel";
import {
  createPageBlockV2,
  createPageSectionV2,
  normalizePageDocumentV2ForWrite,
  type PageBlockV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

type MockMediaRecord = { id: string; url: string; type: string; mimeType: string };

/**
 * Faithful test mirror of `MediaUrlControl`'s observable contract: stored
 * values are URL strings, selections resolve an asset id to its URL through
 * `listMediaCached`, a resolved URL above `maxLength` is rejected without a
 * callback, `null` (clear) always emits and never gets replaced by a pending
 * request, and value/scope/callback replacement plus unmount invalidate
 * in-flight requests. Live props per scope are recorded so the gallery-level
 * wiring tests can invoke a row's source callback directly ("a caller
 * invokes the callback without the picker").
 */
const mediaUrlState = vi.hoisted(() => {
  const requests: Array<{
    resolve: (items: MockMediaRecord[]) => void;
    reject: (error: unknown) => void;
  }> = [];
  const byScope = new Map<
    string,
    { value: string; maxLength?: number; onChange: (value: string | null) => void }
  >();
  return {
    items: [] as MockMediaRecord[],
    requests,
    byScope,
    listMediaCached: vi.fn(
      () =>
        new Promise<MockMediaRecord[]>((resolve, reject) => {
          requests.push({ resolve, reject });
        })
    ),
    reset() {
      requests.length = 0;
      byScope.clear();
      mediaUrlState.listMediaCached.mockClear();
    },
  };
});

vi.mock("../../../core/admin/ui/pages/editorControls/MediaUrlControl", async () => {
  const { createElement, useEffect, useRef } = await import("react");
  return {
    MediaUrlControl: (props: {
      label: string;
      value: string;
      scopeKey: string;
      maxLength?: number;
      onChange: (value: string | null) => void;
    }) => {
      const mountedRef = useRef(true);
      const generationRef = useRef(0);
      mediaUrlState.byScope.set(props.scopeKey, {
        value: props.value,
        maxLength: props.maxLength,
        onChange: props.onChange,
      });
      useEffect(() => {
        mountedRef.current = true;
        return () => {
          mountedRef.current = false;
          generationRef.current += 1;
        };
      }, []);
      // Value/scope/callback replacement and mount invalidate pending intents.
      useEffect(() => {
        generationRef.current += 1;
      }, [props.value, props.scopeKey, props.onChange]);
      const pick = (id: string) => {
        generationRef.current += 1;
        const generation = generationRef.current;
        const scope = props.scopeKey;
        void mediaUrlState.listMediaCached().then((items) => {
          if (!mountedRef.current) return;
          if (generation !== generationRef.current) return;
          const live = mediaUrlState.byScope.get(scope);
          if (!live) return;
          const match = items.find((item) => item.id === id);
          if (!match) return;
          if (typeof live.maxLength === "number" && match.url.length > live.maxLength) return;
          live.onChange(match.url);
        });
      };
      return createElement(
        "div",
        { "data-media-url-control": props.scopeKey, "data-media-url-value": props.value },
        mediaUrlState.items.map((mediaItem) =>
          createElement(
            "button",
            {
              key: mediaItem.id,
              type: "button",
              "data-media-url-option": mediaItem.id,
              onClick: () => pick(mediaItem.id),
            },
            mediaItem.id
          )
        ),
        createElement(
          "button",
          {
            type: "button",
            "data-media-url-clear": "true",
            onClick: () => {
              generationRef.current += 1;
              props.onChange(null);
            },
          },
          "Clear media"
        )
      );
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GalleryHarness = ({
  initialValue,
  categoryTokens = [],
  parentScopeKey = "parent-1",
  onChange = vi.fn(),
}: {
  initialValue: PageGalleryItemV2[];
  categoryTokens?: readonly string[];
  parentScopeKey?: string;
  onChange?: (value: PageGalleryItemV2[]) => void;
}) => {
  const [value, setValue] = useState(initialValue);
  const handleChange = useCallback(
    (next: PageGalleryItemV2[]) => {
      onChange(next);
      setValue(next);
    },
    [onChange]
  );
  return React.createElement(GalleryItemsControl, {
    label: "Gallery",
    value,
    categoryTokens,
    parentScopeKey,
    onChange: handleChange,
  });
};

const mountGallery = (props: {
  initialValue: PageGalleryItemV2[];
  categoryTokens?: readonly string[];
  parentScopeKey?: string;
  onChange?: (value: PageGalleryItemV2[]) => void;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(React.createElement(GalleryHarness, props));
  });
  return {
    container,
    rerender: (next: {
      initialValue: PageGalleryItemV2[];
      categoryTokens?: readonly string[];
      parentScopeKey?: string;
      onChange?: (value: PageGalleryItemV2[]) => void;
    }) => {
      React.act(() => {
        root.render(React.createElement(GalleryHarness, next));
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const click = (element: Element | null | undefined) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (field: HTMLInputElement, value: string) => {
  React.act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const inputByLabel = (container: ParentNode, ariaLabel: string) => {
  const field = container.querySelector(`input[aria-label="${ariaLabel}"]`);
  expect(field).toBeTruthy();
  return field as HTMLInputElement;
};

const rowScopes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-media-url-control]")).map((element) =>
    element.getAttribute("data-media-url-control")
  );

const resolveMedia = async (index: number, items: MockMediaRecord[]) => {
  await React.act(async () => {
    mediaUrlState.requests[index]?.resolve(items);
    await Promise.resolve();
    await Promise.resolve();
  });
};

const lastCommitted = (onChange: ReturnType<typeof vi.fn>): PageGalleryItemV2[] =>
  onChange.mock.calls.at(-1)?.[0] as PageGalleryItemV2[];

const item = (overrides: Partial<PageGalleryItemV2> = {}): PageGalleryItemV2 => ({
  src: "/media/item.jpg",
  alt: "Item",
  caption: "Caption",
  ...overrides,
});

const asset = (id: string, url: string): MockMediaRecord => ({
  id,
  url,
  type: "image",
  mimeType: "image/jpeg",
});

const TokensHarness = ({
  initialValue = [],
  onChange = vi.fn(),
}: {
  initialValue?: readonly string[];
  onChange?: (value: string[]) => void;
}) => {
  const [value, setValue] = useState(initialValue);
  const handleChange = (next: string[]) => {
    onChange(next);
    setValue(next);
  };
  return React.createElement(GalleryCategoryTokensControl, {
    label: "Categories",
    value,
    onChange: handleChange,
  });
};

const mountTokens = (props: {
  initialValue?: readonly string[];
  onChange?: (value: string[]) => void;
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(React.createElement(TokensHarness, props));
  });
  return {
    container,
    rerender: (next: {
      initialValue?: readonly string[];
      onChange?: (value: string[]) => void;
    }) => {
      React.act(() => {
        root.render(React.createElement(TokensHarness, next));
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const newTokenInput = (container: ParentNode) => {
  const field = container.querySelector('input[aria-label="New category token"]');
  expect(field).toBeTruthy();
  return field as HTMLInputElement;
};

const tokenAddButton = (container: ParentNode) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Add")
  ) ?? null;

const tokenChips = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-page-editor-gallery-category-token]"));

beforeEach(() => {
  mediaUrlState.items = [];
  mediaUrlState.reset();
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("TASK-539 dedicated gallery kinds, base-only gates, and z-clamp owner", () => {
  const galleryControls = () =>
    pageBlockControlRegistry.gallery.filter((definition) =>
      [
        "block.gallery.props.items",
        "block.gallery.props.layout",
        "block.gallery.props.filterable",
        "block.gallery.props.filterCategories",
      ].includes(definition.id)
    );
  const dividerControls = () =>
    pageBlockControlRegistry.divider.filter((definition) =>
      [
        "block.divider.props.tone",
        "block.divider.props.thickness",
        "block.divider.props.gradient",
        "block.divider.props.width",
        "block.divider.props.align",
      ].includes(definition.id)
    );

  test("galleryItems and galleryCategoryTokens are the two dedicated gallery UI kinds", () => {
    const byId = (id: string): PageEditorControlUiModel =>
      resolvePageEditorControlUiModel(pageBlockControlRegistry.gallery.find((d) => d.id === id)!);
    expect(byId("block.gallery.props.items")).toEqual({ kind: "galleryItems" });
    expect(byId("block.gallery.props.filterCategories")).toEqual({ kind: "galleryCategoryTokens" });
    // The dedicated kinds exist exactly once in the union; the gallery controls
    // never resolve to ListItemsControl's kind.
    const listItemsControl = {
      id: "block.list.props.items",
      panel: "content" as const,
      target: "block" as const,
      label: "Items",
      path: ["props", "items"],
      overridePath: ["props", "items"],
      input: "items" as const,
      responsive: true,
    };
    expect(resolvePageEditorControlUiModel(listItemsControl)).toEqual({ kind: "listItems" });
    expect(byId("block.gallery.props.items")).not.toEqual({ kind: "listItems" });
    expect(byId("block.gallery.props.filterCategories")).not.toEqual({ kind: "listItems" });
    // The owner token grammar stays the single source for 48-char tokens.
    expect(GALLERY_CATEGORY_PATTERN.source).toContain("1,48");
  });

  test("all four gallery controls are base-only and filterCategories carries the base filterable gate", () => {
    const controls = galleryControls();
    expect(controls).toHaveLength(4);
    const byId = (id: string) => controls.find((definition) => definition.id === id)!;
    for (const definition of controls) expect(definition.responsive).toBe(false);
    expect(byId("block.gallery.props.filterCategories").showWhen).toEqual({
      path: ["props", "filterable"],
      equals: true,
    });
    expect(byId("block.gallery.props.items").showWhen).toBeUndefined();
    expect(byId("block.gallery.props.layout").showWhen).toBeUndefined();
    expect(byId("block.gallery.props.filterable").showWhen).toBeUndefined();
  });

  test("all five divider controls are base-only; width/align gate on the base gradient rule", () => {
    const controls = dividerControls();
    expect(controls).toHaveLength(5);
    const byId = (id: string) => controls.find((definition) => definition.id === id)!;
    for (const definition of controls) expect(definition.responsive).toBe(false);
    expect(byId("block.divider.props.width").showWhen).toEqual({
      path: ["props", "gradient"],
      equals: true,
    });
    expect(byId("block.divider.props.align").showWhen).toEqual({
      path: ["props", "gradient"],
      equals: true,
    });
    expect(byId("block.divider.props.tone").showWhen).toBeUndefined();
    expect(byId("block.divider.props.thickness").showWhen).toBeUndefined();
    expect(byId("block.divider.props.gradient").showWhen).toBeUndefined();
  });

  test("base-only showWhen gates resolve on the base target, never the effective device target", () => {
    const galleryBlock = (filterable: boolean): PageBlockV2 =>
      createPageBlockV2("gallery", { props: { items: [], layout: "grid", filterable } });
    const dividerBlock = (gradient: boolean): PageBlockV2 =>
      createPageBlockV2("divider", { props: { tone: "neutral", gradient } });
    const sectionBlock = (scrollEffect: string): PageSectionV2 =>
      createPageSectionV2("hero", {
        style: {
          scrollEffect: scrollEffect as PageSectionV2["style"]["scrollEffect"],
        } as PageSectionV2["style"],
      });

    const filterCategories = pageBlockControlRegistry.gallery.find(
      (d) => d.id === "block.gallery.props.filterCategories"
    )!;
    const dividerWidth = pageBlockControlRegistry.divider.find(
      (d) => d.id === "block.divider.props.width"
    )!;
    const parallax = pageUniversalSectionControls.find(
      (d) => d.id === "section.parallaxIntensity"
    )!;
    expect(parallax.responsive).toBe(false);
    expect(parallax.showWhen).toEqual({ path: ["style", "scrollEffect"], equals: "parallax" });

    // A tablet/mobile override of the base gate can neither open nor close it.
    const baseTrue = galleryBlock(true);
    const effectiveFalse = galleryBlock(false);
    expect(
      isPageEditorControlVisible(filterCategories, {
        baseTarget: baseTrue,
        effectiveTarget: effectiveFalse,
      })
    ).toBe(true);
    const baseFalse = galleryBlock(false);
    const effectiveTrue = galleryBlock(true);
    expect(
      isPageEditorControlVisible(filterCategories, {
        baseTarget: baseFalse,
        effectiveTarget: effectiveTrue,
      })
    ).toBe(false);

    const baseGradient = dividerBlock(true);
    const effectiveNoGradient = dividerBlock(false);
    expect(
      isPageEditorControlVisible(dividerWidth, {
        baseTarget: baseGradient,
        effectiveTarget: effectiveNoGradient,
      })
    ).toBe(true);
    const baseNoGradient = dividerBlock(false);
    const effectiveGradient = dividerBlock(true);
    expect(
      isPageEditorControlVisible(dividerWidth, {
        baseTarget: baseNoGradient,
        effectiveTarget: effectiveGradient,
      })
    ).toBe(false);

    const baseParallax = sectionBlock("parallax");
    const effectivePlain = sectionBlock("none");
    expect(
      isPageEditorControlVisible(parallax, {
        baseTarget: baseParallax,
        effectiveTarget: effectivePlain,
      })
    ).toBe(true);
    const basePlain = sectionBlock("none");
    const effectiveParallax = sectionBlock("parallax");
    expect(
      isPageEditorControlVisible(parallax, {
        baseTarget: basePlain,
        effectiveTarget: effectiveParallax,
      })
    ).toBe(false);
  });

  test("PAGE_LAYER_Z_CLAMP owner identity: literal, editor control reference, and write-normalizer clamp", () => {
    expect(PAGE_LAYER_Z_CLAMP).toEqual({ min: 0, max: 20 });
    const zControl = pageUniversalBlockControls.find((d) => d.id === "block.layer.z");
    expect(zControl).toBeTruthy();
    // Reference identity: the control imports the model-owned clamp, no mirror.
    expect(zControl!.clamp).toBe(PAGE_LAYER_Z_CLAMP);

    const seed = createPageBlockV2("heading", { id: "blk-z", style: { layer: { z: 25 } } });
    const rawOver = { ...seed, style: { ...seed.style, layer: { ...seed.style?.layer, z: 25 } } };
    const rawUnder = { ...seed, style: { ...seed.style, layer: { ...seed.style?.layer, z: -5 } } };
    const normalize = (block: unknown) =>
      normalizePageDocumentV2ForWrite({
        schemaVersion: 2,
        breakpoints: ["desktop", "tablet", "mobile"],
        seo: {},
        settings: { template: "page-v2", showInNav: true, revisionRetention: 10 },
        sections: [createPageSectionV2("content", { id: "sec-z", blocks: [block as PageBlockV2] })],
      });
    expect(normalize(rawOver).sections[0]!.blocks[0]!.style?.layer?.z).toBe(PAGE_LAYER_Z_CLAMP.max);
    expect(normalize(rawUnder).sections[0]!.blocks[0]!.style?.layer?.z).toBe(
      PAGE_LAYER_Z_CLAMP.min
    );
    // The schema/normalizer and the editor control agree on the exact bounds.
    expect(PAGE_LAYER_Z_CLAMP.min).toBe(0);
    expect(PAGE_LAYER_Z_CLAMP.max).toBe(20);
  });
});

describe("TASK-539 gallery row + media control behavior (real GalleryItemsControl)", () => {
  test("renders stored rows with one-based accessible names and data attributes; mount emits nothing", () => {
    const onChange = vi.fn();
    const view = mountGallery({
      initialValue: [item(), item({ src: "/media/two.jpg" })],
      onChange,
    });
    try {
      const rows = view.container.querySelectorAll("[data-page-editor-gallery-item]");
      expect(rows).toHaveLength(2);
      expect(rows[0]?.getAttribute("data-page-editor-gallery-item")).toBe("1");
      expect(rows[1]?.getAttribute("data-page-editor-gallery-item")).toBe("2");
      expect(rowScopes(view.container)).toHaveLength(2);
      expect(inputByLabel(view.container, "Gallery item 1 alt").value).toBe("Item");
      expect(inputByLabel(view.container, "Gallery item 2 caption").value).toBe("Caption");
      // Each row's source renders through the media control with the stored URL.
      expect(view.container.querySelector('[data-media-url-value="/media/item.jpg"]')).toBeTruthy();
      expect(view.container.querySelector('[data-media-url-value="/media/two.jpg"]')).toBeTruthy();
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  });

  test("add appends exactly the canonical draft row and keeps it until removed", () => {
    const onChange = vi.fn();
    const view = mountGallery({ initialValue: [item()], onChange });
    try {
      const addButton = () =>
        Array.from(view.container.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Add item")
        );
      click(addButton());
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(lastCommitted(onChange)).toEqual([item(), { src: "", alt: "", caption: "" }]);
      expect(view.container.querySelectorAll("[data-page-editor-gallery-item]")).toHaveLength(2);
      expect(inputByLabel(view.container, "Gallery item 2 alt").value).toBe("");
      click(addButton());
      expect(lastCommitted(onChange)).toEqual([
        item(),
        { src: "", alt: "", caption: "" },
        { src: "", alt: "", caption: "" },
      ]);
    } finally {
      view.cleanup();
    }
  });

  test("add is disabled at the 120-row bound and never emits row 121", () => {
    const onChange = vi.fn();
    const rows = Array.from({ length: PAGE_GALLERY_ITEMS_MAX }, () => item());
    const view = mountGallery({ initialValue: rows, onChange });
    try {
      const addButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Add item")
      );
      expect(addButton?.hasAttribute("disabled")).toBe(true);
      click(addButton);
      expect(onChange).not.toHaveBeenCalled();
      expect(view.container.querySelectorAll("[data-page-editor-gallery-item]")).toHaveLength(
        PAGE_GALLERY_ITEMS_MAX
      );
    } finally {
      view.cleanup();
    }
  });

  test("remove deletes only the chosen row; surviving row identity survives the index shift", () => {
    const onChange = vi.fn();
    const view = mountGallery({
      initialValue: [item({ src: "/media/one.jpg" }), item({ src: "/media/two.jpg" })],
      onChange,
    });
    try {
      const scopesBefore = rowScopes(view.container);
      expect(scopesBefore).toHaveLength(2);
      expect(JSON.parse(scopesBefore[0] ?? "null")[0]).toBe("parent-1");
      expect(typeof JSON.parse(scopesBefore[1] ?? "null")[1]).toBe("number");
      expect(scopesBefore[0]).not.toBe(scopesBefore[1]);

      click(view.container.querySelector('button[aria-label="Remove gallery item 1"]'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(lastCommitted(onChange)).toEqual([item({ src: "/media/two.jpg" })]);
      const scopesAfter = rowScopes(view.container);
      expect(scopesAfter).toEqual([scopesBefore[1]]);
    } finally {
      view.cleanup();
    }
  });

  test("URL-not-ID storage: picking a library asset commits the resolved asset URL", async () => {
    mediaUrlState.items = [asset("asset-1", "/media/picked.jpg")];
    const onChange = vi.fn();
    const view = mountGallery({ initialValue: [item({ src: "" })], onChange });
    try {
      click(view.container.querySelector('[data-media-url-option="asset-1"]'));
      await resolveMedia(0, mediaUrlState.items);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(lastCommitted(onChange)).toEqual([item({ src: "/media/picked.jpg" })]);
      // Stored contract is the URL string, never the asset id.
      expect(lastCommitted(onChange)[0]!.src).not.toBe("asset-1");
    } finally {
      view.cleanup();
    }
  });

  test("null media clear commits row src '' and is never replaced by a pending request", async () => {
    mediaUrlState.items = [asset("asset-1", "/media/picked.jpg")];
    const onChange = vi.fn();
    const view = mountGallery({ initialValue: [item({ src: "/media/old.jpg" })], onChange });
    try {
      // A selection resolution is pending when the user clears: the clear
      // intent must win and the stale completion must not write over it.
      click(view.container.querySelector('[data-media-url-option="asset-1"]'));
      click(view.container.querySelector('[data-media-url-clear="true"]'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(lastCommitted(onChange)).toEqual([item({ src: "" })]);
      await resolveMedia(0, mediaUrlState.items);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(lastCommitted(onChange)).toEqual([item({ src: "" })]);
    } finally {
      view.cleanup();
    }
  });

  test("direct row source commits: null -> '', 2048 replaces, 2049 is non-mutating", () => {
    const url2048 = "a".repeat(PAGE_GALLERY_SRC_MAX);
    const url2049 = "a".repeat(PAGE_GALLERY_SRC_MAX + 1);
    const onChange = vi.fn();
    const view = mountGallery({ initialValue: [item({ src: "/media/old.jpg" })], onChange });
    try {
      const rowCallback = mediaUrlState.byScope.get(rowScopes(view.container)[0] ?? "")?.onChange;
      expect(rowCallback).toBeTruthy();
      React.act(() => rowCallback?.(null));
      expect(lastCommitted(onChange)).toEqual([item({ src: "" })]);
      React.act(() => rowCallback?.(url2048));
      expect(lastCommitted(onChange)).toEqual([item({ src: url2048 })]);
      const before = onChange.mock.calls.length;
      React.act(() => rowCallback?.(url2049));
      expect(onChange.mock.calls.length).toBe(before);
      expect(lastCommitted(onChange)).toEqual([item({ src: url2048 })]);
    } finally {
      view.cleanup();
    }
  });

  test("selected MediaRecord.url: 2048 commits, 2049 rejected non-mutating", async () => {
    const url2048 = "b".repeat(PAGE_GALLERY_SRC_MAX);
    const url2049 = "b".repeat(PAGE_GALLERY_SRC_MAX + 1);
    mediaUrlState.items = [asset("asset-2048", url2048), asset("asset-2049", url2049)];
    const onChange = vi.fn();
    const view = mountGallery({ initialValue: [item({ src: "" })], onChange });
    try {
      click(view.container.querySelector('[data-media-url-option="asset-2048"]'));
      await resolveMedia(0, mediaUrlState.items);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(lastCommitted(onChange)).toEqual([item({ src: url2048 })]);
      const before = onChange.mock.calls.length;
      click(view.container.querySelector('[data-media-url-option="asset-2049"]'));
      await resolveMedia(1, mediaUrlState.items);
      expect(onChange.mock.calls.length).toBe(before);
      expect(lastCommitted(onChange)).toEqual([item({ src: url2048 })]);
      // No render-time truncation of the committed value.
      const renderedValue = view.container
        .querySelector("[data-media-url-value]")
        ?.getAttribute("data-media-url-value");
      expect(renderedValue).toBe(url2048);
    } finally {
      view.cleanup();
    }
  });

  test("alt 500 / caption 2000 commit; 501 / 2001 / source 2049 direct attempts are non-mutating", () => {
    const alt500 = "c".repeat(PAGE_GALLERY_ALT_MAX);
    const alt501 = "c".repeat(PAGE_GALLERY_ALT_MAX + 1);
    const caption2000 = "d".repeat(PAGE_GALLERY_CAPTION_MAX);
    const caption2001 = "d".repeat(PAGE_GALLERY_CAPTION_MAX + 1);
    const url2049 = "e".repeat(PAGE_GALLERY_SRC_MAX + 1);
    const onChange = vi.fn();
    const view = mountGallery({
      initialValue: [item({ alt: "Old", caption: "Old caption" })],
      onChange,
    });
    try {
      setInputValue(inputByLabel(view.container, "Gallery item 1 alt"), alt500);
      expect(lastCommitted(onChange)).toEqual([item({ alt: alt500, caption: "Old caption" })]);
      setInputValue(inputByLabel(view.container, "Gallery item 1 caption"), caption2000);
      expect(lastCommitted(onChange)).toEqual([item({ alt: alt500, caption: caption2000 })]);
      const before = onChange.mock.calls.length;
      setInputValue(inputByLabel(view.container, "Gallery item 1 alt"), alt501);
      setInputValue(inputByLabel(view.container, "Gallery item 1 caption"), caption2001);
      const rowCallback = mediaUrlState.byScope.get(rowScopes(view.container)[0] ?? "")?.onChange;
      React.act(() => rowCallback?.(url2049));
      expect(onChange.mock.calls.length).toBe(before);
      expect(lastCommitted(onChange)).toEqual([item({ alt: alt500, caption: caption2000 })]);
    } finally {
      view.cleanup();
    }
  });

  test("incoming over-limit values render byte-for-byte and clear remains available", () => {
    const url2049 = "f".repeat(PAGE_GALLERY_SRC_MAX + 1);
    const alt501 = "g".repeat(PAGE_GALLERY_ALT_MAX + 1);
    const caption2001 = "h".repeat(PAGE_GALLERY_CAPTION_MAX + 1);
    const onChange = vi.fn();
    const view = mountGallery({
      initialValue: [item({ src: url2049, alt: alt501, caption: caption2001 })],
      onChange,
    });
    try {
      const rowValue = view.container
        .querySelector("[data-media-url-value]")
        ?.getAttribute("data-media-url-value");
      expect(rowValue).toBe(url2049);
      expect(inputByLabel(view.container, "Gallery item 1 alt").value).toBe(alt501);
      expect(inputByLabel(view.container, "Gallery item 1 caption").value).toBe(caption2001);
      click(view.container.querySelector('[data-media-url-clear="true"]'));
      expect(lastCommitted(onChange)).toEqual([
        item({ src: "", alt: alt501, caption: caption2001 }),
      ]);
    } finally {
      view.cleanup();
    }
  });

  test("category edits use ordered first-occurrence uniqueness and the 48/12/587 bounds", () => {
    const token48 = (letter: string) => letter.repeat(PAGE_GALLERY_CATEGORY_TOKEN_MAX);
    const category587 = Array.from({ length: PAGE_GALLERY_CATEGORY_TOKENS_MAX }, (_, index) =>
      token48(String.fromCharCode(97 + index))
    ).join(" ");
    const category588 = "i".repeat(PAGE_GALLERY_CATEGORY_MAX + 1);
    const thirteenTokens = Array.from(
      { length: PAGE_GALLERY_CATEGORY_TOKENS_MAX + 1 },
      (_, index) => `t${index}`
    ).join(" ");
    const onChange = vi.fn();
    const view = mountGallery({ initialValue: [item()], onChange });
    try {
      const categoryInput = inputByLabel(view.container, "Gallery item 1 categories");
      setInputValue(categoryInput, "beta alpha beta");
      expect(lastCommitted(onChange)).toEqual([item({ category: "beta alpha" })]);
      setInputValue(categoryInput, "  x  ");
      expect(lastCommitted(onChange)).toEqual([item({ category: "x" })]);
      setInputValue(categoryInput, category587);
      expect(lastCommitted(onChange)).toEqual([item({ category: category587 })]);
      setInputValue(categoryInput, "");
      const empty = lastCommitted(onChange)[0]!;
      expect(empty).toEqual({ src: "/media/item.jpg", alt: "Item", caption: "Caption" });
      expect(Object.prototype.hasOwnProperty.call(empty, "category")).toBe(false);

      const before = onChange.mock.calls.length;
      setInputValue(categoryInput, "j".repeat(PAGE_GALLERY_CATEGORY_TOKEN_MAX + 1));
      setInputValue(categoryInput, thirteenTokens);
      setInputValue(categoryInput, category588);
      expect(onChange.mock.calls.length).toBe(before);
      expect(lastCommitted(onChange)).toEqual([
        { src: "/media/item.jpg", alt: "Item", caption: "Caption" },
      ]);
    } finally {
      view.cleanup();
    }
  });

  test("unlisted category assignments stay visible and preserved on unrelated edits", () => {
    const onChange = vi.fn();
    const view = mountGallery({
      initialValue: [item({ category: "ghost" })],
      categoryTokens: ["news", "promo"],
      onChange,
    });
    try {
      expect(inputByLabel(view.container, "Gallery item 1 categories").value).toBe("ghost");
      setInputValue(inputByLabel(view.container, "Gallery item 1 alt"), "Edited");
      const committed = lastCommitted(onChange);
      expect(committed[0]).toEqual(item({ alt: "Edited", category: "ghost" }));
    } finally {
      view.cleanup();
    }
  });

  test("switching between two equal-URL parent scopes plus unmount emits neither old completion", async () => {
    mediaUrlState.items = [asset("asset-same", "/media/same.jpg")];
    const onChange = vi.fn();
    const view = mountGallery({
      initialValue: [item({ src: "/media/same.jpg" })],
      onChange,
    });
    try {
      const firstScope = rowScopes(view.container)[0];
      click(view.container.querySelector('[data-media-url-option="asset-same"]'));
      view.rerender({
        initialValue: [item({ src: "/media/same.jpg" })],
        parentScopeKey: "parent-2",
        onChange,
      });
      const secondScope = rowScopes(view.container)[0];
      expect(secondScope).not.toBe(firstScope);
      click(view.container.querySelector('[data-media-url-option="asset-same"]'));
      view.cleanup();
      // Unmount invalidated the second scope; the first scope's request was
      // invalidated by the remount. Neither completion may emit.
      await resolveMedia(0, mediaUrlState.items);
      await resolveMedia(1, mediaUrlState.items);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      document.body.innerHTML = "";
    }
  });

  test("remove row 1 while row 2 pending: the surviving non-index identity keeps the completion scoped to row 2", async () => {
    mediaUrlState.items = [asset("asset-2", "/media/resolved.jpg")];
    const onChange = vi.fn();
    const view = mountGallery({
      initialValue: [item({ src: "/media/one.jpg" }), item({ src: "/media/two.jpg" })],
      onChange,
    });
    try {
      const secondScope = rowScopes(view.container)[1];
      const secondControl = view.container.querySelectorAll("[data-media-url-control]")[1];
      click(secondControl?.querySelector('[data-media-url-option="asset-2"]'));
      click(view.container.querySelector('button[aria-label="Remove gallery item 1"]'));
      expect(view.container.querySelectorAll("[data-page-editor-gallery-item]")).toHaveLength(1);
      await resolveMedia(0, mediaUrlState.items);
      const committed = lastCommitted(onChange);
      expect(committed).toHaveLength(1);
      expect(committed[0]).toEqual(item({ src: "/media/resolved.jpg" }));
      // The surviving row kept its immutable media scope (identity, not index).
      expect(rowScopes(view.container)).toEqual([secondScope]);
    } finally {
      view.cleanup();
    }
  });
});

describe("TASK-539 category token builder (filterCategories)", () => {
  test("renders stored tokens in order with one-based names; mount emits nothing", () => {
    const onChange = vi.fn();
    const view = mountTokens({ initialValue: ["news", "promo"], onChange });
    try {
      const chips = tokenChips(view.container);
      expect(chips).toHaveLength(2);
      expect(chips[0]?.getAttribute("data-page-editor-gallery-category-token")).toBe("1");
      expect(chips[1]?.getAttribute("data-page-editor-gallery-category-token")).toBe("2");
      expect(
        view.container.querySelector('button[aria-label="Remove category token 1"]')
      ).toBeTruthy();
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  });

  test("add trims, validates, dedupes, and bounds tokens at 48/12/587; rejects non-mutating", () => {
    const onChange = vi.fn();
    const view = mountTokens({ initialValue: ["news"], onChange });
    try {
      setInputValue(newTokenInput(view.container), "  promo  ");
      click(tokenAddButton(view.container));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls.at(-1)?.[0]).toEqual(["news", "promo"]);
      expect(newTokenInput(view.container).value).toBe("");

      // Duplicate and invalid tokens are non-mutating.
      setInputValue(newTokenInput(view.container), "news");
      click(tokenAddButton(view.container));
      setInputValue(newTokenInput(view.container), "has space");
      click(tokenAddButton(view.container));
      setInputValue(newTokenInput(view.container), "k".repeat(PAGE_GALLERY_CATEGORY_TOKEN_MAX + 1));
      click(tokenAddButton(view.container));
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      view.cleanup();
    }

    // A fresh 12-token list: the 13th token is rejected and the input disables.
    const twelveOnChange = vi.fn();
    const twelve = Array.from(
      { length: PAGE_GALLERY_CATEGORY_TOKENS_MAX },
      (_, index) => `t${index}`
    );
    const view12 = mountTokens({ initialValue: twelve, onChange: twelveOnChange });
    try {
      setInputValue(newTokenInput(view12.container), "last");
      click(tokenAddButton(view12.container));
      expect(twelveOnChange).not.toHaveBeenCalled();
      expect(newTokenInput(view12.container).hasAttribute("disabled")).toBe(true);
      setInputValue(newTokenInput(view12.container), "overflow");
      click(tokenAddButton(view12.container));
      expect(twelveOnChange).not.toHaveBeenCalled();
    } finally {
      view12.cleanup();
    }
  });

  test("remove emits the rest in stored order and keeps the input usable", () => {
    const onChange = vi.fn();
    const view = mountTokens({ initialValue: ["news", "promo", "deal"], onChange });
    try {
      click(view.container.querySelector('button[aria-label="Remove category token 2"]'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls.at(-1)?.[0]).toEqual(["news", "deal"]);
      expect(tokenChips(view.container)).toHaveLength(2);
    } finally {
      view.cleanup();
    }
  });
});

// Type-level pin: the two dedicated gallery kinds are members of the ui-model
// union (kept as an explicit constant so the compiler enforces the contract).
const galleryKinds: readonly PageEditorControlUiModel["kind"][] = [
  "galleryItems",
  "galleryCategoryTokens",
];
void galleryKinds;
