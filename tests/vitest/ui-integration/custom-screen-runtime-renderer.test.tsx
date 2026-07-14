// @vitest-environment happy-dom

// TASK-498-02 B-runtime: the static render branches for the data-oriented kinds
// (heading / text / stat / divider / image / button / tabs) + the related-list
// builder skeleton / entry placeholder. Asserts builder mode renders the corner tag
// + muted `{{ label }}` Token (no live value / no Editable-Read-Unbound badge) for the
// bound kinds, entry/preview render the resolved value, presentation-override className
// survives on the text-bearing kinds, and an unknown `type` still hits the legacy
// placeholder. (The related-list resolved-rows cases land in TASK-498-03.)

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ScreenRuntimeRenderer } from "../../../core/admin/ui/custom-screens/ScreenRuntimeRenderer";
import {
  screenSectionColumnPresets,
  screenSectionColumnTemplate,
} from "../../../core/services/customScreens/customScreenSchemas";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
  ScreenSectionStyleV1,
} from "../../../core/services/customScreens/customScreenSchemas";
import type { ScreenInsertTarget } from "../../../core/services/customScreens/screenDocumentOps";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value }: { value: unknown }) => (
    <div data-screen-test-media-picker="true" data-value={JSON.stringify(value)} />
  ),
}));

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
});

const fields: ContentField[] = [
  { id: "f-headline", name: "headline", type: "text", label: "Headline" },
  { id: "f-score", name: "score", type: "number", label: "Score" },
  { id: "f-cover", name: "cover", type: "media", label: "Cover" },
];

const doc = (blocks: ScreenBlockV1[]): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [{ id: "section-1", type: "section", data: { title: "Details" }, blocks }],
});

const render = (
  blocks: ScreenBlockV1[],
  mode: "builder" | "entry" | "preview",
  bindings: ScreenFieldBinding[] = [],
  values: Record<string, unknown> = {},
  extra: Record<string, unknown> = {}
) =>
  mount(
    <ScreenRuntimeRenderer
      document={doc(blocks)}
      bindings={bindings}
      values={values}
      fields={fields}
      mode={mode}
      {...extra}
    />
  );

const headingBlock: ScreenBlockV1 = {
  id: "heading-1",
  type: "heading",
  data: { label: "Title", text: "", level: 2, align: "left", field: "headline" },
};
const headingBinding: ScreenFieldBinding = {
  id: "heading-1-text",
  blockId: "heading-1",
  propPath: "text",
  source: "entry",
  field: "headline",
  mode: "read",
};

test("bound heading renders a {{ label }} Token in builder mode (no live value / no badges)", () => {
  const view = render([headingBlock], "builder", [headingBinding], { headline: "Live Headline" });
  try {
    const el = view.container.querySelector('[data-screen-block-id="heading-1"]');
    expect(el?.textContent).toContain("{{ Title }}");
    expect(el?.textContent).not.toContain("Live Headline");
    expect(el?.textContent).not.toContain("Editable");
    expect(el?.textContent).not.toContain("Unbound");
    // The builder corner tag exposes the block type.
    expect(el?.getAttribute("data-screen-block-type")).toBe("heading");
  } finally {
    view.cleanup();
  }
});

test("bound heading resolves the live value in entry mode as an h2", () => {
  const view = render([headingBlock], "entry", [headingBinding], { headline: "Live Headline" });
  try {
    const el = view.container.querySelector('[data-screen-block-id="heading-1"]');
    expect(el?.textContent).toContain("Live Headline");
    expect(el?.querySelector("h2")).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("presentation-override className survives on a text-bearing heading", () => {
  const view = render(
    [headingBlock],
    "entry",
    [headingBinding],
    { headline: "Live Headline" },
    {
      presentationOverrides: [
        { blockId: "heading-1", propPath: "tone", value: "muted" },
        { blockId: "heading-1", propPath: "textEmphasis", value: "bold" },
      ],
    }
  );
  try {
    const heading = view.container.querySelector('[data-screen-block-id="heading-1"] h2');
    expect(heading?.className).toContain("text-muted-foreground");
    expect(heading?.className).toContain("font-bold");
  } finally {
    view.cleanup();
  }
});

test("text block renders its content with the muted tone", () => {
  const block: ScreenBlockV1 = {
    id: "text-1",
    type: "text",
    data: { label: "Text", content: "Supporting copy", tone: "muted" },
  };
  const view = render([block], "preview");
  try {
    const el = view.container.querySelector('[data-screen-block-id="text-1"]');
    expect(el?.textContent).toContain("Supporting copy");
    expect(el?.querySelector("p")?.className).toContain("text-muted-foreground");
  } finally {
    view.cleanup();
  }
});

test("bound stat renders a Token in builder and a formatted value in entry", () => {
  const block: ScreenBlockV1 = {
    id: "stat-1",
    type: "stat",
    data: { label: "Score", format: "percent", trend: "up", field: "score" },
  };
  const binding: ScreenFieldBinding = {
    id: "stat-1-value",
    blockId: "stat-1",
    propPath: "value",
    source: "entry",
    field: "score",
    mode: "read",
  };

  const builder = render([block], "builder", [binding], { score: 88 });
  try {
    const el = builder.container.querySelector('[data-screen-block-id="stat-1"]');
    expect(el?.textContent).toContain("{{ Score }}");
    expect(el?.textContent).not.toContain("88%");
  } finally {
    builder.cleanup();
  }

  const entry = render([block], "entry", [binding], { score: 88 });
  try {
    const el = entry.container.querySelector('[data-screen-block-id="stat-1"]');
    expect(el?.textContent).toContain("88%");
    expect(el?.textContent).toContain("up");
  } finally {
    entry.cleanup();
  }
});

test("divider renders an <hr> and carries no binding", () => {
  const block: ScreenBlockV1 = {
    id: "divider-1",
    type: "divider",
    data: { label: "Divider", variant: "line" },
  };
  const view = render([block], "entry");
  try {
    expect(view.container.querySelector('[data-screen-block-id="divider-1"] hr')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

const mediaUuidA = "55555555-5555-4555-8555-555555555555";
const mediaUuidB = "66666666-6666-4666-8666-666666666666";
const mediaUuidC = "77777777-7777-4777-8777-777777777777";

test("bound direct image resolves a media UUID through the explicit URL map and never puts the UUID in src", () => {
  const block: ScreenBlockV1 = {
    id: "image-1",
    type: "image",
    data: { label: "Cover", fit: "cover", field: "cover" },
  };
  const binding: ScreenFieldBinding = {
    id: "image-1-src",
    blockId: "image-1",
    propPath: "src",
    source: "entry",
    field: "cover",
    mode: "read",
  };

  const builder = render([block], "builder", [binding], { cover: mediaUuidA });
  try {
    const el = builder.container.querySelector('[data-screen-block-id="image-1"]');
    expect(el?.textContent).toContain("{{ Cover }}");
    expect(el?.querySelector("img")).toBeNull();
  } finally {
    builder.cleanup();
  }

  const entry = render(
    [block],
    "entry",
    [binding],
    { cover: mediaUuidA },
    { presentationMediaUrlsById: { [mediaUuidA]: "https://cdn.example/cover.png" } }
  );
  try {
    const img = entry.container.querySelector('[data-screen-block-id="image-1"] img');
    expect(img?.getAttribute("src")).toBe("https://cdn.example/cover.png");
    expect(img?.getAttribute("src")).not.toBe(mediaUuidA);
  } finally {
    entry.cleanup();
  }
});

// TASK-500-04: static image `src` — resolution order stays override → bound → static;
// unbound image with an authored static src renders it; empty image keeps the placeholder.
const staticImageBlock: ScreenBlockV1 = {
  id: "image-static",
  type: "image",
  data: { label: "Logo", fit: "contain", src: "/media/logo.png" },
};

test("unbound image with a static src renders an <img> in entry AND preview", () => {
  for (const mode of ["entry", "preview"] as const) {
    const view = render([staticImageBlock], mode);
    try {
      const img = view.container.querySelector('[data-screen-block-id="image-static"] img');
      expect(img?.getAttribute("src")).toBe("/media/logo.png");
      expect(img?.getAttribute("alt")).toBe("Logo");
    } finally {
      view.cleanup();
    }
  }
});

test("image with NEITHER a src NOR a binding still shows the labeled placeholder", () => {
  const block: ScreenBlockV1 = {
    id: "image-empty",
    type: "image",
    data: { label: "Cover", fit: "cover" },
  };
  for (const mode of ["entry", "preview"] as const) {
    const view = render([block], mode);
    try {
      const el = view.container.querySelector('[data-screen-block-id="image-empty"]');
      expect(el?.querySelector("img")).toBeNull();
      expect(el?.textContent).toContain("Cover");
    } finally {
      view.cleanup();
    }
  }
});

test("direct image applies override then binding then static provenance without lower-precedence fallback", () => {
  const block: ScreenBlockV1 = {
    id: "image-1",
    type: "image",
    data: { label: "Cover", fit: "cover", field: "cover", src: "/media/static.png" },
  };
  const binding: ScreenFieldBinding = {
    id: "image-1-src",
    blockId: "image-1",
    propPath: "src",
    source: "entry",
    field: "cover",
    mode: "read",
  };

  const urls = {
    [mediaUuidA]: "https://cdn.example/bound.png",
    [mediaUuidB]: "https://cdn.example/override.png",
  };

  // A present binding accepts only media identity and beats the authored static src.
  const boundView = render(
    [block],
    "entry",
    [binding],
    { cover: mediaUuidA },
    { presentationMediaUrlsById: urls }
  );
  try {
    const img = boundView.container.querySelector('[data-screen-block-id="image-1"] img');
    expect(img?.getAttribute("src")).toBe("https://cdn.example/bound.png");
  } finally {
    boundView.cleanup();
  }

  // Per-entry presentation override beats BOTH the bound identity and static src.
  const overrideView = render(
    [block],
    "entry",
    [binding],
    { cover: mediaUuidA },
    {
      presentationOverrides: [{ blockId: "image-1", propPath: "image", value: mediaUuidB }],
      presentationMediaUrlsById: urls,
    }
  );
  try {
    const img = overrideView.container.querySelector('[data-screen-block-id="image-1"] img');
    expect(img?.getAttribute("src")).toBe("https://cdn.example/override.png");
  } finally {
    overrideView.cleanup();
  }

  for (const [name, overrideValue, resolvedMap] of [
    ["missing map entry", mediaUuidC, urls],
    ["unsafe resolved URL", mediaUuidC, { ...urls, [mediaUuidC]: "javascript:alert(1)" }],
    ["malformed override identity", "https://cdn.example/not-an-id.png", urls],
  ] as const) {
    const view = render(
      [block],
      "entry",
      [binding],
      { cover: mediaUuidA },
      {
        presentationOverrides: [
          { blockId: "image-1", propPath: "mediaAssetId", value: overrideValue },
        ],
        presentationMediaUrlsById: resolvedMap,
      }
    );
    try {
      const el = view.container.querySelector('[data-screen-block-id="image-1"]');
      expect(el?.querySelector("img"), name).toBeNull();
      expect(el?.querySelector('[data-image-disabled="true"]'), name).not.toBeNull();
      expect(el?.textContent, name).not.toContain("static.png");
    } finally {
      view.cleanup();
    }
  }
});

test("bound direct image uses the first valid UUID in an array and fails closed for malformed, empty, missing, and unsafe values", () => {
  const block: ScreenBlockV1 = {
    id: "image-1",
    type: "image",
    data: { label: "Cover", fit: "cover", field: "cover", src: "/media/static.png" },
  };
  const binding: ScreenFieldBinding = {
    id: "image-1-src",
    blockId: "image-1",
    propPath: "src",
    source: "entry",
    field: "cover",
    mode: "read",
  };
  const arrayView = render(
    [block],
    "entry",
    [binding],
    { cover: ["https://cdn.example/not-identity.png", mediaUuidB, mediaUuidA] },
    { presentationMediaUrlsById: { [mediaUuidB]: "https://cdn.example/array.png" } }
  );
  try {
    expect(
      arrayView.container.querySelector('[data-screen-block-id="image-1"] img')?.getAttribute("src")
    ).toBe("https://cdn.example/array.png");
  } finally {
    arrayView.cleanup();
  }

  for (const [name, value, resolvedMap] of [
    ["URL-shaped scalar", "https://cdn.example/bound.png", {}],
    ["empty scalar", "", {}],
    ["array without a UUID", [null, "https://cdn.example/bound.png"], {}],
    ["valid UUID missing from the map", mediaUuidC, {}],
    ["unsafe resolved URL", mediaUuidC, { [mediaUuidC]: "data:image/png;base64,AAAA" }],
  ] as const) {
    const view = render(
      [block],
      "entry",
      [binding],
      { cover: value },
      { presentationMediaUrlsById: resolvedMap }
    );
    try {
      const el = view.container.querySelector('[data-screen-block-id="image-1"]');
      expect(el?.querySelector("img"), name).toBeNull();
      expect(el?.querySelector('[data-image-disabled="true"]'), name).not.toBeNull();
    } finally {
      view.cleanup();
    }
  }
});

test("builder: bound image keeps the {{ label }} token; static-src image previews the <img>; empty image keeps the icon placeholder", () => {
  const boundBlock: ScreenBlockV1 = {
    id: "image-bound",
    type: "image",
    data: { label: "Cover", fit: "cover", field: "cover", src: "/media/static.png" },
  };
  const binding: ScreenFieldBinding = {
    id: "image-bound-src",
    blockId: "image-bound",
    propPath: "src",
    source: "entry",
    field: "cover",
    mode: "read",
  };
  const emptyBlock: ScreenBlockV1 = {
    id: "image-empty",
    type: "image",
    data: { label: "Cover", fit: "cover" },
  };

  const view = render([boundBlock, staticImageBlock, emptyBlock], "builder", [binding], {
    cover: mediaUuidA,
  });
  try {
    const bound = view.container.querySelector('[data-screen-block-id="image-bound"]');
    expect(bound?.textContent).toContain("{{ Cover }}");
    expect(bound?.querySelector("img")).toBeNull();

    const staticEl = view.container.querySelector('[data-screen-block-id="image-static"]');
    expect(staticEl?.querySelector("img")?.getAttribute("src")).toBe("/media/logo.png");

    const empty = view.container.querySelector('[data-screen-block-id="image-empty"]');
    expect(empty?.querySelector("img")).toBeNull();
    expect(empty?.textContent).toContain("Cover");
    expect(empty?.textContent).not.toContain("{{");
  } finally {
    view.cleanup();
  }
});

test("bound media FieldRenderer receives exact scalar/array UUID identity rather than resolved URLs", () => {
  const block: ScreenBlockV1 = {
    id: "field-media",
    type: "field",
    data: { label: "Cover", field: "cover" },
  };
  const binding: ScreenFieldBinding = {
    id: "field-media-value",
    blockId: "field-media",
    propPath: "value",
    source: "entry",
    field: "cover",
    mode: "readwrite",
  };

  for (const value of [mediaUuidA, [mediaUuidA, mediaUuidB]] as const) {
    const view = render(
      [block],
      "entry",
      [binding],
      { cover: value },
      {
        enableInlineFieldEditing: true,
        presentationMediaUrlsById: {
          [mediaUuidA]: "https://cdn.example/a.png",
          [mediaUuidB]: "https://cdn.example/b.png",
        },
      }
    );
    try {
      const picker = view.container.querySelector('[data-screen-test-media-picker="true"]');
      expect(picker?.getAttribute("data-value")).toBe(JSON.stringify(value));
      expect(picker?.getAttribute("data-value")).not.toContain("https://");
    } finally {
      view.cleanup();
    }
  }

  const overrideView = render(
    [block],
    "entry",
    [binding],
    { cover: [mediaUuidA, mediaUuidB] },
    {
      enableInlineFieldEditing: true,
      presentationOverrides: [
        { blockId: "field-media", propPath: "mediaAssetId", value: mediaUuidC },
      ],
      presentationMediaUrlsById: { [mediaUuidC]: "https://cdn.example/override.png" },
    }
  );
  try {
    const picker = overrideView.container.querySelector('[data-screen-test-media-picker="true"]');
    expect(picker?.getAttribute("data-value")).toBe(JSON.stringify(mediaUuidC));
    expect(picker?.getAttribute("data-value")).not.toContain("https://");
  } finally {
    overrideView.cleanup();
  }
});

// TASK-500-04 static-kind regression annotation: unbound heading / text / divider / button
// still render their authored static content on entry (locks in that only `image` changed).
test("unbound heading/text/divider/button still render authored content in entry mode", () => {
  const blocks: ScreenBlockV1[] = [
    { id: "h-static", type: "heading", data: { label: "H", text: "Static Title", level: 2 } },
    { id: "t-static", type: "text", data: { label: "T", content: "Static copy", tone: "default" } },
    { id: "d-static", type: "divider", data: { label: "Or", variant: "label" } },
    {
      id: "b-static",
      type: "button",
      data: { label: "Go", action: "link", variant: "primary", href: "https://example.com" },
    },
  ];
  const view = render(blocks, "entry");
  try {
    expect(
      view.container.querySelector('[data-screen-block-id="h-static"]')?.textContent
    ).toContain("Static Title");
    expect(
      view.container.querySelector('[data-screen-block-id="t-static"]')?.textContent
    ).toContain("Static copy");
    expect(
      view.container.querySelector('[data-screen-block-id="d-static"]')?.textContent
    ).toContain("Or");
    expect(
      view.container.querySelector(
        '[data-screen-block-id="b-static"] a[href="https://example.com"]'
      )
    ).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("safe Button is non-navigating in builder and becomes a link only in preview/entry", () => {
  const block: ScreenBlockV1 = {
    id: "button-1",
    type: "button",
    data: { label: "Open", action: "link", variant: "primary", href: "https://example.com" },
  };

  const builder = render([block], "builder");
  try {
    const el = builder.container.querySelector('[data-screen-block-id="button-1"]');
    expect(el?.textContent).toContain("Open");
    expect(el?.querySelector("a")).toBeNull();
    expect(el?.querySelector('[data-screen-button-affordance="true"]')?.tagName).toBe("SPAN");
  } finally {
    builder.cleanup();
  }

  for (const mode of ["preview", "entry"] as const) {
    const view = render([block], mode);
    try {
      const link = view.container.querySelector('[data-screen-block-id="button-1"] a');
      expect(link?.getAttribute("href")).toBe("https://example.com");
      expect(link?.getAttribute("aria-disabled")).toBeNull();
    } finally {
      view.cleanup();
    }
  }
});

test("unsafe, absent, and legacy-disabled Button hrefs render disabled non-anchors at the final DOM sink", () => {
  const cases: Array<{
    name: string;
    data: Record<string, unknown>;
    values?: Record<string, unknown>;
  }> = [
    {
      name: "unsafe static",
      data: { label: "Unsafe", action: "link", variant: "primary", href: "javascript:alert(1)" },
    },
    {
      name: "absent href",
      data: { label: "Missing", action: "link", variant: "primary" },
    },
    {
      name: "legacy unsupported action",
      data: { label: "Legacy", action: "publish", variant: "primary", href: "/should-not-run" },
    },
  ];

  for (const mode of ["builder", "preview", "entry"] as const) {
    for (const item of cases) {
      const view = render(
        [{ id: "button-1", type: "button", data: item.data }],
        mode,
        [],
        item.values
      );
      try {
        const el = view.container.querySelector('[data-screen-block-id="button-1"]');
        expect(el?.querySelector("a"), `${mode}: ${item.name}`).toBeNull();
        expect(
          el
            ?.querySelector('[data-screen-button-affordance="true"]')
            ?.getAttribute("aria-disabled"),
          `${mode}: ${item.name}`
        ).toBe("true");
      } finally {
        view.cleanup();
      }
    }
  }
});

test("Button binding is re-sanitized and an unsafe bound value cannot fall back to a safe static href", () => {
  const block: ScreenBlockV1 = {
    id: "button-1",
    type: "button",
    data: { label: "Open", action: "link", variant: "primary", href: "/safe-static" },
  };
  const binding: ScreenFieldBinding = {
    id: "button-1-href",
    blockId: "button-1",
    propPath: "href",
    source: "entry",
    field: "headline",
    mode: "read",
  };
  const view = render([block], "entry", [binding], { headline: "//evil.example/path" });
  try {
    const el = view.container.querySelector('[data-screen-block-id="button-1"]');
    expect(el?.querySelector("a")).toBeNull();
    expect(el?.querySelector('[aria-disabled="true"]')).not.toBeNull();
    expect(el?.innerHTML).not.toContain("/safe-static");
  } finally {
    view.cleanup();
  }
});

test("block and section roots stay passive while sibling selection handles remain keyboard-clickable", () => {
  const onSelectBlock = vi.fn();
  const onSelectSection = vi.fn();
  const view = render(
    [{ id: "text-select", type: "text", data: { label: "Text", content: "Select me" } }],
    "builder",
    [],
    {},
    {
      onSelectBlock,
      onSelectSection,
      renderBuilderActions: () => <input aria-label="Nested builder input" />,
    }
  );
  try {
    const block = view.container.querySelector<HTMLElement>(
      '[data-screen-block-id="text-select"]'
    )!;
    const section = view.container.querySelector<HTMLElement>(
      '[data-screen-section-id="section-1"]'
    )!;
    const blockHandle = block.querySelector<HTMLButtonElement>(
      '[data-screen-select-block="text-select"]'
    )!;
    const sectionHandle = section.querySelector<HTMLButtonElement>(
      '[data-screen-select-section="section-1"]'
    )!;

    expect(block.getAttribute("role")).toBeNull();
    expect(block.getAttribute("tabindex")).toBeNull();
    expect(section.getAttribute("role")).toBeNull();
    expect(section.getAttribute("tabindex")).toBeNull();
    expect(section.className).toContain("group/section");
    expect(blockHandle.tagName).toBe("BUTTON");
    expect(blockHandle.parentElement).toBe(block);
    expect(sectionHandle.tagName).toBe("BUTTON");
    expect(sectionHandle.parentElement).toBe(section);

    React.act(() => {
      blockHandle.focus();
      blockHandle.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    });
    expect(onSelectBlock).toHaveBeenLastCalledWith("text-select");

    React.act(() => {
      sectionHandle.focus();
      sectionHandle.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    });
    expect(onSelectSection).toHaveBeenLastCalledWith("section-1");

    onSelectBlock.mockClear();
    React.act(() =>
      block
        .querySelector<HTMLInputElement>('[aria-label="Nested builder input"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    );
    expect(onSelectBlock).not.toHaveBeenCalled();

    React.act(() =>
      block
        .querySelector("p")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    );
    expect(onSelectBlock).toHaveBeenLastCalledWith("text-select");
  } finally {
    view.cleanup();
  }
});

test("entry link activation performs only the link action and never selects its passive wrapper", () => {
  const onSelectBlock = vi.fn();
  const view = render(
    [
      {
        id: "button-link",
        type: "button",
        data: { label: "Open", action: "link", variant: "primary", href: "/details" },
      },
    ],
    "entry",
    [],
    {},
    { onSelectBlock }
  );
  try {
    const block = view.container.querySelector<HTMLElement>(
      '[data-screen-block-id="button-link"]'
    )!;
    const link = block.querySelector<HTMLAnchorElement>('a[href="/details"]')!;
    expect(block.getAttribute("role")).toBeNull();
    expect(block.getAttribute("tabindex")).toBeNull();
    React.act(() =>
      link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    );
    expect(onSelectBlock).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

const tabsBlock = (id = "tabs-1"): ScreenBlockV1 => ({
  id,
  type: "tabs",
  data: {
    label: "Project tabs",
    tabs: [
      { id: "tab-1", label: "Overview" },
      { id: "tab-2", label: "Activity" },
    ],
  },
  slots: {
    "tab-1": [
      { id: `${id}-overview`, type: "text", data: { label: "", content: "Overview panel" } },
    ],
    "tab-2": [
      { id: `${id}-activity`, type: "text", data: { label: "", content: "Activity panel" } },
    ],
  },
});

const getTabs = (container: ParentNode, blockId = "tabs-1") => {
  const block = container.querySelector(`[data-screen-block-id="${blockId}"]`)!;
  const tablist = block.querySelector('[role="tablist"]')!;
  return {
    block,
    tablist,
    tabs: Array.from(tablist.querySelectorAll<HTMLButtonElement>(':scope > [role="tab"]')),
    panels: Array.from(block.querySelectorAll<HTMLElement>(':scope > div > [role="tabpanel"]')),
  };
};

test("Tabs expose unique ARIA relationships, roving tabIndex, and exactly one visible panel", () => {
  const view = render([tabsBlock()], "preview");
  try {
    const { tablist, tabs, panels } = getTabs(view.container);
    expect(tablist.getAttribute("aria-label")).toBe("Project tabs");
    expect(tabs).toHaveLength(2);
    expect(panels).toHaveLength(2);
    expect(new Set([...tabs, ...panels].map((item) => item.id)).size).toBe(4);
    for (let index = 0; index < tabs.length; index += 1) {
      expect(tabs[index]?.getAttribute("aria-controls")).toBe(panels[index]?.id);
      expect(panels[index]?.getAttribute("aria-labelledby")).toBe(tabs[index]?.id);
    }
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]?.tabIndex).toBe(0);
    expect(panels[0]?.hidden).toBe(false);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    expect(tabs[1]?.tabIndex).toBe(-1);
    expect(panels[1]?.hidden).toBe(true);

    React.act(() => tabs[1]?.click());
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
    expect(panels[0]?.hidden).toBe(true);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[1]?.hidden).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("Tabs Arrow/Home/End navigation wraps, activates, and transfers focus inside its renderer root", async () => {
  const view = render([tabsBlock()], "entry");
  try {
    const { tabs } = getTabs(view.container);
    const press = async (tab: HTMLButtonElement, key: string) => {
      await React.act(async () => {
        tab.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
    };

    await press(tabs[0]!, "ArrowRight");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);

    await press(tabs[1]!, "Home");
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[0]);

    await press(tabs[0]!, "End");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");

    await press(tabs[1]!, "ArrowRight");
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");

    await press(tabs[0]!, "ArrowLeft");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
  } finally {
    view.cleanup();
  }
});

function BuilderTabsHarness() {
  const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>({
    kind: "slot-index",
    sectionId: "section-1",
    parentId: "tabs-1",
    slotId: "tab-2",
    index: 0,
  });
  return (
    <>
      <output data-builder-insert-point="true">{JSON.stringify(insertPoint)}</output>
      <ScreenRuntimeRenderer
        document={doc([tabsBlock()])}
        bindings={[]}
        values={{}}
        fields={fields}
        mode="builder"
        insertPoint={insertPoint}
        onSetInsertPoint={setInsertPoint}
      />
    </>
  );
}

test("builder Tabs derive visibility from slot-index/slot-end host state and activation arms slot-end", () => {
  const view = mount(<BuilderTabsHarness />);
  try {
    const { tabs, panels } = getTabs(view.container);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[1]?.hidden).toBe(false);

    React.act(() => tabs[0]?.click());
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[0]?.hidden).toBe(false);
    expect(view.container.querySelector('[data-builder-insert-point="true"]')?.textContent).toBe(
      JSON.stringify({
        kind: "slot-end",
        sectionId: "section-1",
        parentId: "tabs-1",
        slotId: "tab-1",
      })
    );
  } finally {
    view.cleanup();
  }
});

function NestedBuilderTabsHarness() {
  const nested = tabsBlock("tabs-nested");
  const outer = tabsBlock();
  outer.slots = {
    ...outer.slots,
    "tab-2": [nested],
  };
  const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>({
    kind: "slot-end",
    sectionId: "section-1",
    parentId: "tabs-1",
    slotId: "tab-2",
  });
  return (
    <ScreenRuntimeRenderer
      document={doc([outer])}
      bindings={[]}
      values={{}}
      fields={fields}
      mode="builder"
      insertPoint={insertPoint}
      onSetInsertPoint={setInsertPoint}
    />
  );
}

test("nested builder Tabs keep every ancestor non-first panel visible for click and keyboard activation", async () => {
  const view = mount(<NestedBuilderTabsHarness />);
  try {
    const outer = getTabs(view.container, "tabs-1");
    const nested = getTabs(view.container, "tabs-nested");
    expect(outer.tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(outer.panels[1]?.hidden).toBe(false);
    expect(nested.tabs[0]?.getAttribute("aria-selected")).toBe("true");

    React.act(() => nested.tabs[1]?.click());
    expect(outer.tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(outer.panels[1]?.hidden).toBe(false);
    expect(nested.tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(nested.panels[1]?.hidden).toBe(false);

    await React.act(async () => {
      nested.tabs[1]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });
    expect(outer.tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(outer.panels[1]?.hidden).toBe(false);
    expect(nested.tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(nested.panels[0]?.hidden).toBe(false);
    expect(document.activeElement).toBe(nested.tabs[0]);
  } finally {
    view.cleanup();
  }
});

test("nested Tabs keep active state independent from their parent", () => {
  const nested = tabsBlock("tabs-nested");
  const outer = tabsBlock();
  outer.slots = {
    ...outer.slots,
    "tab-1": [nested],
  };
  const view = render([outer], "entry");
  try {
    const outerTabs = getTabs(view.container, "tabs-1").tabs;
    const nestedTabs = getTabs(view.container, "tabs-nested").tabs;
    React.act(() => nestedTabs[1]?.click());
    expect(nestedTabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(outerTabs[0]?.getAttribute("aria-selected")).toBe("true");

    React.act(() => outerTabs[1]?.click());
    expect(outerTabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(nestedTabs[1]?.getAttribute("aria-selected")).toBe("true");
  } finally {
    view.cleanup();
  }
});

function TabModeSwitchHarness({
  initialMode,
  initialInsertPoint,
}: {
  initialMode: "preview" | "entry";
  initialInsertPoint: ScreenInsertTarget | null;
}) {
  const [mode, setMode] = useState<"builder" | "preview" | "entry">(initialMode);
  const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>(initialInsertPoint);
  return (
    <>
      <button type="button" data-switch-tabs-to-builder="true" onClick={() => setMode("builder")}>
        Switch to builder
      </button>
      <ScreenRuntimeRenderer
        document={doc([tabsBlock()])}
        bindings={[]}
        values={{}}
        fields={fields}
        mode={mode}
        insertPoint={insertPoint}
        onSetInsertPoint={setInsertPoint}
      />
    </>
  );
}

for (const scenario of [
  { name: "preview with no insert point", mode: "preview" as const, insertPoint: null },
  {
    name: "entry with an unrelated insert point",
    mode: "entry" as const,
    insertPoint: {
      kind: "slot-end" as const,
      sectionId: "section-1",
      parentId: "other-container",
      slotId: "other-slot",
    },
  },
]) {
  test(`${scenario.name} cannot leak local tab state into builder mode`, () => {
    const view = mount(
      <TabModeSwitchHarness initialMode={scenario.mode} initialInsertPoint={scenario.insertPoint} />
    );
    try {
      let tabs = getTabs(view.container).tabs;
      React.act(() => tabs[1]?.click());
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");

      React.act(() =>
        view.container
          .querySelector<HTMLButtonElement>('[data-switch-tabs-to-builder="true"]')
          ?.click()
      );
      tabs = getTabs(view.container).tabs;
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    } finally {
      view.cleanup();
    }
  });
}

function RemovableTabsHarness() {
  const [block, setBlock] = useState(tabsBlock());
  return (
    <>
      <button
        type="button"
        data-remove-active-tab="true"
        onClick={() =>
          setBlock((current) => ({
            ...current,
            data: { ...current.data, tabs: [{ id: "tab-1", label: "Overview" }] },
            slots: { "tab-1": current.slots?.["tab-1"] ?? [] },
          }))
        }
      >
        Remove active tab
      </button>
      <ScreenRuntimeRenderer
        document={doc([block])}
        bindings={[]}
        values={{}}
        fields={fields}
        mode="preview"
      />
    </>
  );
}

test("removed active Tab derives to the first remaining tab without an effect reset", () => {
  const view = mount(<RemovableTabsHarness />);
  try {
    let tabs = getTabs(view.container).tabs;
    React.act(() => tabs[1]?.click());
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    React.act(() =>
      view.container.querySelector<HTMLButtonElement>('[data-remove-active-tab="true"]')?.click()
    );
    tabs = getTabs(view.container).tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]?.tabIndex).toBe(0);
  } finally {
    view.cleanup();
  }
});

test("two concurrent renderer instances namespace identical tab IDs and keep focus/state scoped", async () => {
  const view = mount(
    <div>
      <div data-renderer-host="one">
        <ScreenRuntimeRenderer
          document={doc([tabsBlock()])}
          bindings={[]}
          values={{}}
          mode="entry"
        />
      </div>
      <div data-renderer-host="two">
        <ScreenRuntimeRenderer
          document={doc([tabsBlock()])}
          bindings={[]}
          values={{}}
          mode="entry"
        />
      </div>
    </div>
  );
  try {
    const one = view.container.querySelector('[data-renderer-host="one"]')!;
    const two = view.container.querySelector('[data-renderer-host="two"]')!;
    const first = getTabs(one).tabs;
    const second = getTabs(two).tabs;
    expect(new Set([...first, ...second].map((tab) => tab.id)).size).toBe(4);
    expect(view.container.querySelector("[data-screen-runtime-root]")).toBeNull();

    await React.act(async () => {
      first[0]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });
    expect(first[1]?.getAttribute("aria-selected")).toBe("true");
    expect(second[0]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(first[1]);
  } finally {
    view.cleanup();
  }
});

test("zero Tabs fails safe without emitting a selected tab or panel", () => {
  const view = render(
    [{ id: "tabs-1", type: "tabs", data: { label: "Empty tabs", tabs: [] }, slots: {} }],
    "preview"
  );
  try {
    const block = view.container.querySelector('[data-screen-block-id="tabs-1"]');
    expect(block?.querySelector('[role="tablist"]')).not.toBeNull();
    expect(block?.querySelector('[role="tab"]')).toBeNull();
    expect(block?.querySelector('[role="tabpanel"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

const relatedBlock = (variant: string): ScreenBlockV1 => ({
  id: "related-1",
  type: "related-list",
  data: { label: "Tasks", target: "task", displayField: "", variant, limit: 5 },
});

const relatedRows = [
  {
    id: "task-1",
    title: "Draft spec",
    status: "draft",
    displayValue: "opened",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "task-2",
    title: "Review PR",
    status: "scheduled",
    displayValue: "commented",
    updatedAt: "2026-06-02T00:00:00.000Z",
  },
];

test("related-list renders a builder skeleton (no fetch, no resolved rows)", () => {
  const builder = render(
    [relatedBlock("checklist")],
    "builder",
    [],
    {},
    {
      relatedEntries: { "related-1": relatedRows },
    }
  );
  try {
    const el = builder.container.querySelector('[data-screen-block-id="related-1"]');
    expect(el?.textContent).toContain("Tasks");
    expect(el?.textContent).toContain("Chip");
    // Builder mode ignores relatedEntries → the resolved titles never appear.
    expect(el?.textContent).not.toContain("Draft spec");
  } finally {
    builder.cleanup();
  }
});

test("related-list renders the skeleton when relatedEntries[blockId] is undefined (unresolved)", () => {
  const view = render([relatedBlock("checklist")], "entry", [], {}, { relatedEntries: {} });
  try {
    const el = view.container.querySelector('[data-screen-block-id="related-1"]');
    expect(el?.textContent).toContain("Chip");
    expect(el?.textContent).not.toContain("Draft spec");
  } finally {
    view.cleanup();
  }
});

test("related-list renders an empty state when the resolved rows are []", () => {
  const view = render(
    [relatedBlock("checklist")],
    "entry",
    [],
    {},
    {
      relatedEntries: { "related-1": [] },
    }
  );
  try {
    const el = view.container.querySelector('[data-screen-block-id="related-1"]');
    expect(el?.textContent).toContain("No related task");
    expect(el?.textContent).not.toContain("Chip");
  } finally {
    view.cleanup();
  }
});

test("related-list checklist variant renders resolved rows with a checkbox + status", () => {
  const view = render(
    [relatedBlock("checklist")],
    "entry",
    [],
    {},
    {
      relatedEntries: { "related-1": relatedRows },
    }
  );
  try {
    const el = view.container.querySelector('[data-screen-block-id="related-1"]');
    expect(el?.textContent).toContain("Draft spec");
    expect(el?.textContent).toContain("Review PR");
    expect(el?.querySelector('[data-screen-related-entry="task-1"]')).not.toBeNull();
    expect(el?.querySelector('[data-slot="checkbox"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("related-list activity variant renders name=title, action=displayValue and time=updatedAt", () => {
  const view = render(
    [relatedBlock("activity")],
    "entry",
    [],
    {},
    {
      relatedEntries: { "related-1": relatedRows },
    }
  );
  try {
    const el = view.container.querySelector('[data-screen-block-id="related-1"]');
    expect(el?.textContent).toContain("Draft spec"); // name
    expect(el?.textContent).toContain("opened"); // action = displayValue
    expect(el?.textContent).toContain("Jun 1"); // time = formatted updatedAt
  } finally {
    view.cleanup();
  }
});

test("related-list activity variant omits the time column when updatedAt is absent", () => {
  const view = render(
    [relatedBlock("activity")],
    "entry",
    [],
    {},
    {
      relatedEntries: {
        "related-1": [{ id: "task-9", title: "No time", displayValue: "did a thing" }],
      },
    }
  );
  try {
    const el = view.container.querySelector('[data-screen-block-id="related-1"]');
    expect(el?.textContent).toContain("No time");
    expect(el?.textContent).toContain("did a thing");
    // No fabricated time — nothing matching a formatted date is present.
    expect(el?.textContent).not.toMatch(/[A-Z][a-z]{2}\s\d/);
  } finally {
    view.cleanup();
  }
});

test("related-list cards variant renders a grid of title + status + displayValue", () => {
  const view = render(
    [relatedBlock("cards")],
    "entry",
    [],
    {},
    {
      relatedEntries: { "related-1": relatedRows },
    }
  );
  try {
    const el = view.container.querySelector('[data-screen-block-id="related-1"]');
    expect(el?.querySelector('[data-screen-related-entry="task-2"]')).not.toBeNull();
    expect(el?.textContent).toContain("Review PR");
    expect(el?.textContent).toContain("commented");
  } finally {
    view.cleanup();
  }
});

// TASK-498-01 A2/A3 — builder-mode corner-tag card + `{{ label }}` tokens for the
// legacy bound kinds (field / record-header). The graphical-schema look must cover the
// first-class `Field` chip and the seeded `record-header`, not just the new kinds.

test("builder corner tag renders the human block label (screenBlockLabels), not the raw type", () => {
  const view = render([headingBlock], "builder", [headingBinding], { headline: "Live Headline" });
  try {
    const el = view.container.querySelector('[data-screen-block-id="heading-1"]');
    // Human label from screenBlockLabels ("Heading"), never the uppercase raw `type`.
    expect(el?.textContent).toContain("Heading");
    expect(el?.textContent).not.toContain("HEADING");
  } finally {
    view.cleanup();
  }
});

test("bound field renders a {{ label }} Token in builder (no live value, no Editable/Read/Unbound badge)", () => {
  const block: ScreenBlockV1 = {
    id: "field-1",
    type: "field",
    data: { label: "Headline", field: "headline" },
  };
  const binding: ScreenFieldBinding = {
    id: "field-1-value",
    blockId: "field-1",
    propPath: "value",
    source: "entry",
    field: "headline",
    mode: "readwrite",
  };
  const view = render([block], "builder", [binding], { headline: "Live Headline" });
  try {
    const el = view.container.querySelector('[data-screen-block-id="field-1"]');
    expect(el?.textContent).toContain("{{ Headline }}");
    expect(el?.textContent).not.toContain("Live Headline");
    expect(el?.textContent).not.toContain("Editable");
    expect(el?.textContent).not.toContain("Unbound");
  } finally {
    view.cleanup();
  }
});

test("bound field resolves the live value (no token) in entry mode", () => {
  const block: ScreenBlockV1 = {
    id: "field-1",
    type: "field",
    data: { label: "Headline", field: "headline" },
  };
  const binding: ScreenFieldBinding = {
    id: "field-1-value",
    blockId: "field-1",
    propPath: "value",
    source: "entry",
    field: "headline",
    mode: "readwrite",
  };
  const view = render([block], "entry", [binding], { headline: "Live Headline" });
  try {
    const el = view.container.querySelector('[data-screen-block-id="field-1"]');
    expect(el?.textContent).toContain("Live Headline");
    expect(el?.textContent).not.toContain("{{ Headline }}");
  } finally {
    view.cleanup();
  }
});

test("bound record-header renders {{ label }} Tokens in builder (no live value, no inline edit)", () => {
  const block: ScreenBlockV1 = {
    id: "rh-1",
    type: "record-header",
    data: { eyebrow: "", title: "Record", subtitle: "" },
  };
  const binding: ScreenFieldBinding = {
    id: "rh-1-title",
    blockId: "rh-1",
    propPath: "title",
    source: "entry",
    field: "headline",
    mode: "read",
  };
  const view = render([block], "builder", [binding], { headline: "Live Headline" });
  try {
    const el = view.container.querySelector('[data-screen-block-id="rh-1"]');
    expect(el?.textContent).toContain("{{ Headline }}");
    expect(el?.textContent).not.toContain("Live Headline");
    expect(el?.querySelector('[role="textbox"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("bound record-header resolves the live value in entry mode as an h2", () => {
  const block: ScreenBlockV1 = {
    id: "rh-1",
    type: "record-header",
    data: { eyebrow: "", title: "Record", subtitle: "" },
  };
  const binding: ScreenFieldBinding = {
    id: "rh-1-title",
    blockId: "rh-1",
    propPath: "title",
    source: "entry",
    field: "headline",
    mode: "read",
  };
  const view = render([block], "entry", [binding], { headline: "Live Headline" });
  try {
    const el = view.container.querySelector('[data-screen-block-id="rh-1"]');
    expect(el?.textContent).toContain("Live Headline");
    expect(el?.textContent).not.toContain("{{ Headline }}");
  } finally {
    view.cleanup();
  }
});

test("an unknown block type still hits the legacy placeholder", () => {
  const block = {
    id: "mystery-1",
    type: "mystery-widget",
    data: { label: "Mystery" },
  } as unknown as ScreenBlockV1;
  const view = render([block], "entry");
  try {
    const el = view.container.querySelector('[data-screen-block-id="mystery-1"]');
    expect(el?.textContent).toContain("Legacy block placeholder");
  } finally {
    view.cleanup();
  }
});

// ── TASK-503-02 A: block STYLE emission ─────────────────────────────────────

test("TASK-503-02 A: block.style emits width/align classes + inline box CSS identically in builder/preview/entry", () => {
  const block: ScreenBlockV1 = {
    id: "field-styled",
    type: "field",
    data: { label: "Headline", field: "headline" },
    style: { width: "half", align: "center", margin: { top: 24 }, padding: { top: 16 } },
  };
  for (const mode of ["builder", "preview", "entry"] as const) {
    const view = render([block], mode);
    try {
      const el = view.container.querySelector<HTMLElement>('[data-screen-block-id="field-styled"]');
      expect(el?.className).toContain("w-1/2");
      expect(el?.className).toContain("mx-auto");
      expect(el?.style.marginTop).toBe("24px");
      expect(el?.style.paddingTop).toBe("16px");
    } finally {
      view.cleanup();
    }
  }
});

test("TASK-503-02 A: determinism — horizontal margin wins over align; width preset wins over stretch; width:auto still emits the align class (documented no-op)", () => {
  // Explicit horizontal margin suppresses the align preset entirely.
  const marginWins = render(
    [
      {
        id: "b-margin",
        type: "field",
        data: { label: "Headline", field: "headline" },
        style: { align: "center", margin: { left: 8 } },
      },
    ],
    "entry"
  );
  try {
    const el = marginWins.container.querySelector<HTMLElement>('[data-screen-block-id="b-margin"]');
    expect(el?.className).not.toContain("mx-auto");
    expect(el?.style.marginLeft).toBe("8px");
  } finally {
    marginWins.cleanup();
  }

  // A width preset wins over align:"stretch" — no second w-full is added.
  const stretchWithWidth = render(
    [
      {
        id: "b-stretch",
        type: "field",
        data: { label: "Headline", field: "headline" },
        style: { width: "half", align: "stretch" },
      },
    ],
    "entry"
  );
  try {
    const el = stretchWithWidth.container.querySelector<HTMLElement>(
      '[data-screen-block-id="b-stretch"]'
    );
    expect(el?.className).toContain("w-1/2");
    expect(el?.className).not.toContain("w-full");
  } finally {
    stretchWithWidth.cleanup();
  }

  // Coupling decision (a): align:"center" with width:"auto" STILL emits mx-auto
  // (a documented visible no-op — the renderer must not silently drop it) and
  // carries no width class.
  const alignAutoWidth = render(
    [
      {
        id: "b-auto",
        type: "field",
        data: { label: "Headline", field: "headline" },
        style: { width: "auto", align: "center" },
      },
    ],
    "entry"
  );
  try {
    const el = alignAutoWidth.container.querySelector<HTMLElement>(
      '[data-screen-block-id="b-auto"]'
    );
    expect(el?.className).toContain("mx-auto");
    expect(el?.className).not.toContain("w-1/2");
    expect(el?.className).not.toContain("w-full");
  } finally {
    alignAutoWidth.cleanup();
  }
});

test("TASK-503-02 A: absent-style DOM identity — a style-less block adds no width/align class and no style attribute", () => {
  const block: ScreenBlockV1 = {
    id: "field-plain",
    type: "field",
    data: { label: "Headline", field: "headline" },
  };
  // Builder + preview must carry their pre-task base wrapper tokens; entry
  // carries the post-C(ii) card surface (never a pre-task baseline). cn() may
  // reorder tokens, so assert each token individually rather than a substring.
  const expectedTokens: Record<string, string[]> = {
    builder: ["rounded-2xl", "bg-card"],
    preview: ["rounded-xl", "border", "bg-background"],
    entry: ["rounded-xl", "bg-card"],
  };
  for (const mode of ["builder", "preview", "entry"] as const) {
    const view = render([block], mode);
    try {
      const el = view.container.querySelector<HTMLElement>('[data-screen-block-id="field-plain"]');
      expect(el?.getAttribute("style")).toBeNull();
      const tokens = (el?.className ?? "").split(/\s+/);
      for (const token of expectedTokens[mode]) {
        expect(tokens).toContain(token);
      }
      for (const util of ["w-1/2", "w-1/3", "w-2/3", "mx-auto", "mr-auto", "ml-auto"]) {
        expect(tokens).not.toContain(util);
      }
    } finally {
      view.cleanup();
    }
  }
});

// ── TASK-503-02 B: clearable labels ─────────────────────────────────────────

test("TASK-503-02 B: an explicitly cleared field label renders no label <p> in entry but keeps the value; absent key keeps the default; whitespace behaves as cleared", () => {
  const binding: ScreenFieldBinding = {
    id: "field-1-value",
    blockId: "field-1",
    propPath: "value",
    source: "entry",
    field: "headline",
    mode: "read",
  };
  const labelText = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  // Cleared "" → no label <p>, value still renders.
  const cleared = render(
    [{ id: "field-1", type: "field", data: { label: "", field: "headline" } }],
    "entry",
    [binding],
    { headline: "Live Headline" }
  );
  try {
    const el = cleared.container.querySelector('[data-screen-block-id="field-1"]');
    const paras = Array.from(el?.querySelectorAll("p") ?? []);
    // The uppercase label <p> is gone; the value paragraph still renders.
    expect(paras.some((p) => p.className.includes(labelText))).toBe(false);
    expect(el?.textContent).toContain("Live Headline");
  } finally {
    cleared.cleanup();
  }

  // Whitespace-only behaves as cleared.
  const whitespace = render(
    [{ id: "field-1", type: "field", data: { label: "   ", field: "headline" } }],
    "entry",
    [binding],
    { headline: "Live Headline" }
  );
  try {
    const el = whitespace.container.querySelector('[data-screen-block-id="field-1"]');
    const paras = Array.from(el?.querySelectorAll("p") ?? []);
    expect(paras.some((p) => p.className.includes(labelText))).toBe(false);
  } finally {
    whitespace.cleanup();
  }

  // Absent label key → today's default chain (field.label "Headline").
  const absent = render(
    [{ id: "field-1", type: "field", data: { field: "headline" } }],
    "entry",
    [binding],
    { headline: "Live Headline" }
  );
  try {
    const el = absent.container.querySelector('[data-screen-block-id="field-1"]');
    const paras = Array.from(el?.querySelectorAll("p") ?? []);
    expect(paras.some((p) => p.className.includes(labelText) && p.textContent === "Headline")).toBe(
      true
    );
  } finally {
    absent.cleanup();
  }
});

test("TASK-503-02 B: a cleared field label keeps the {{ field-name }} stand-in token in builder", () => {
  const binding: ScreenFieldBinding = {
    id: "field-1-value",
    blockId: "field-1",
    propPath: "value",
    source: "entry",
    field: "headline",
    mode: "read",
  };
  const view = render(
    [{ id: "field-1", type: "field", data: { label: "", field: "headline" } }],
    "builder",
    [binding],
    { headline: "Live Headline" }
  );
  try {
    const el = view.container.querySelector('[data-screen-block-id="field-1"]');
    // Stand-in reuses the default chain (field.label) so the binding stays visible.
    expect(el?.textContent).toContain("{{ Headline }}");
  } finally {
    view.cleanup();
  }
});

test("TASK-503-02 B: a cleared stat label renders no label <p>; an absent key keeps the 'Stat' default", () => {
  const binding: ScreenFieldBinding = {
    id: "stat-1-value",
    blockId: "stat-1",
    propPath: "value",
    source: "entry",
    field: "score",
    mode: "read",
  };
  const labelText = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  const cleared = render(
    [{ id: "stat-1", type: "stat", data: { label: "", format: "number", field: "score" } }],
    "entry",
    [binding],
    { score: 88 }
  );
  try {
    const el = cleared.container.querySelector('[data-screen-block-id="stat-1"]');
    const paras = Array.from(el?.querySelectorAll("p") ?? []);
    expect(paras.some((p) => p.className.includes(labelText))).toBe(false);
    expect(el?.textContent).toContain("88");
  } finally {
    cleared.cleanup();
  }

  const absent = render(
    [{ id: "stat-1", type: "stat", data: { format: "number", field: "score" } }],
    "entry",
    [binding],
    { score: 88 }
  );
  try {
    const el = absent.container.querySelector('[data-screen-block-id="stat-1"]');
    const paras = Array.from(el?.querySelectorAll("p") ?? []);
    expect(paras.some((p) => p.className.includes(labelText) && p.textContent === "Stat")).toBe(
      true
    );
  } finally {
    absent.cleanup();
  }
});

// ── TASK-503-02 C(i): showFieldMetadata gating (2-vs-1 divergence) ───────────

test("TASK-503-02 C(i): entry hides BOTH badges by default, showFieldMetadata brings both back, preview always shows both, builder keeps its type badge but never the binding badge", () => {
  const block: ScreenBlockV1 = {
    id: "field-1",
    type: "field",
    data: { label: "Headline", field: "headline" },
  };
  const binding: ScreenFieldBinding = {
    id: "field-1-value",
    blockId: "field-1",
    propPath: "value",
    source: "entry",
    field: "headline",
    mode: "readwrite",
  };
  const sel = '[data-screen-block-id="field-1"]';

  // Entry default OFF → zero badges (binding "Editable" AND the "TEXT" type badge).
  const entryDefault = render([block], "entry", [binding], { headline: "Live" });
  try {
    const el = entryDefault.container.querySelector(sel);
    expect(el?.textContent).not.toContain("Editable");
    expect(el?.textContent).not.toContain("Text");
  } finally {
    entryDefault.cleanup();
  }

  // Entry + showFieldMetadata → both badges back.
  const entryOn = render(
    [block],
    "entry",
    [binding],
    { headline: "Live" },
    {
      showFieldMetadata: true,
    }
  );
  try {
    const el = entryOn.container.querySelector(sel);
    expect(el?.textContent).toContain("Editable");
    expect(el?.textContent).toContain("Text");
  } finally {
    entryOn.cleanup();
  }

  // Preview always shows both regardless of the prop.
  const preview = render([block], "preview", [binding], { headline: "Live" });
  try {
    const el = preview.container.querySelector(sel);
    expect(el?.textContent).toContain("Editable");
    expect(el?.textContent).toContain("Text");
  } finally {
    preview.cleanup();
  }

  // Builder keeps its field-type badge (it had NO mode gate today) but never the
  // binding badge — pins the 2-vs-1 divergence.
  const builder = render([block], "builder", [binding], { headline: "Live" });
  try {
    const el = builder.container.querySelector(sel);
    expect(el?.textContent).toContain("Text");
    expect(el?.textContent).not.toContain("Editable");
    expect(el?.textContent).not.toContain("Unbound");
  } finally {
    builder.cleanup();
  }
});

// ── TASK-503-02 C(ii): entry surface flatten (builder/preview byte-identical) ─

test("TASK-503-02 C(ii): entry block wrapper = rounded-xl bg-card, entry section = bg-transparent; builder/preview class strings unchanged", () => {
  const block: ScreenBlockV1 = {
    id: "field-1",
    type: "field",
    data: { label: "Headline", field: "headline" },
  };

  const entry = render([block], "entry");
  try {
    const wrapper = entry.container.querySelector('[data-screen-block-id="field-1"]');
    expect(wrapper?.className).toContain("rounded-xl");
    expect(wrapper?.className).toContain("bg-card");
    expect(wrapper?.className).not.toContain("bg-background/90");
    const section = entry.container.querySelector('[data-screen-section-id="section-1"]');
    expect(section?.className).toContain("bg-transparent");
    expect(section?.className).not.toContain("bg-background/60");
    expect(section?.className).not.toContain("group/section");
  } finally {
    entry.cleanup();
  }

  const builder = render([block], "builder");
  try {
    const wrapper = builder.container.querySelector('[data-screen-block-id="field-1"]');
    expect(wrapper?.className).toContain("rounded-2xl");
    expect(wrapper?.className).toContain("bg-card");
    const section = builder.container.querySelector('[data-screen-section-id="section-1"]');
    // Pin the builder section bg explicitly so the 2→3 fork cannot regress it.
    expect(section?.className).toContain("bg-background/60");
    expect(section?.className).not.toContain("bg-transparent");
    expect(section?.className).not.toContain("group/section");
  } finally {
    builder.cleanup();
  }

  const preview = render([block], "preview");
  try {
    const section = preview.container.querySelector('[data-screen-section-id="section-1"]');
    expect(section?.className).toContain("bg-background/80");
    expect(section?.className).not.toContain("group/section");
  } finally {
    preview.cleanup();
  }
});

test("TASK-503-02 C(iii): entry-mode selected block keeps the selection ring (TASK-498 no-regress) — the bg-card recolor must not strip the ring the presentation-override panel is scoped to", () => {
  const block: ScreenBlockV1 = {
    id: "field-1",
    type: "field",
    data: { label: "Headline", field: "headline" },
  };

  const entry = render(
    [block],
    "entry",
    [],
    {},
    { selectedBlockId: "field-1", onSelectBlock: () => {} }
  );
  try {
    const wrapper = entry.container.querySelector('[data-screen-block-id="field-1"]');
    // The opaque surface recolor stays…
    expect(wrapper?.className).toContain("bg-card");
    // …AND the selection ring the 498 override UX depends on is intact.
    expect(wrapper?.getAttribute("data-selected")).toBe("true");
    expect(wrapper?.className).toContain("ring-2");
    expect(wrapper?.className).toContain("ring-primary/45");
  } finally {
    entry.cleanup();
  }

  // An unselected sibling in the same mode carries no active ring (control case).
  const unselected = render(
    [block],
    "entry",
    [],
    {},
    { selectedBlockId: null, onSelectBlock: () => {} }
  );
  try {
    const wrapper = unselected.container.querySelector('[data-screen-block-id="field-1"]');
    expect(wrapper?.getAttribute("data-selected")).toBe("false");
    expect(wrapper?.className).not.toContain("ring-primary/45");
  } finally {
    unselected.cleanup();
  }
});

// ── TASK-503-02 D: drag source on the corner badge ──────────────────────────

test("TASK-503-02 D: the card wrapper is not draggable; the corner badge is the drag handle and its dragstart carries the block id", () => {
  const block: ScreenBlockV1 = {
    id: "field-1",
    type: "field",
    data: { label: "Headline", field: "headline" },
  };
  // onDragMove enables canDrag (builder-only), so the badge becomes the source.
  const view = render([block], "builder", [], {}, { onDragMove: () => {} });
  try {
    const wrapper = view.container.querySelector('[data-screen-block-id="field-1"]');
    expect(wrapper?.getAttribute("draggable")).toBeNull();

    const handle = view.container.querySelector('[data-screen-drag-handle="field-1"]');
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute("draggable")).toBe("true");

    const store: Record<string, string> = {};
    const dataTransfer = {
      setData: (k: string, v: string) => {
        store[k] = v;
      },
      getData: (k: string) => store[k] ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    React.act(() => {
      const event = new Event("dragstart", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
      handle?.dispatchEvent(event);
    });
    expect(store["text/plain"]).toBe("field-1");
  } finally {
    view.cleanup();
  }
});

// ── TASK-503-02 E: image ratio wiring + static-src read gate ─────────────────

test("TASK-503-02 E: ratio '16/9' wraps the img in an aspect-video box (builder + entry); absent/legacy ratio keeps today's exact <img> markup", () => {
  const ratioBlock: ScreenBlockV1 = {
    id: "image-ratio",
    type: "image",
    data: { label: "Logo", fit: "cover", src: "/media/logo.png", ratio: "16/9" },
  };
  for (const mode of ["builder", "entry"] as const) {
    const view = render([ratioBlock], mode);
    try {
      const wrapper = view.container.querySelector(
        '[data-screen-block-id="image-ratio"] .aspect-video'
      );
      expect(wrapper).not.toBeNull();
      const img = wrapper?.querySelector("img");
      expect(img?.getAttribute("src")).toBe("/media/logo.png");
      expect(img?.className).toContain("h-full");
      expect(img?.className).toContain("w-full");
    } finally {
      view.cleanup();
    }
  }

  // Legacy free-text ratio → no class → today's flat <img> (no aspect wrapper).
  const legacy: ScreenBlockV1 = {
    id: "image-legacy",
    type: "image",
    data: { label: "Logo", fit: "cover", src: "/media/logo.png", ratio: "16:9" },
  };
  const view = render([legacy], "entry");
  try {
    const el = view.container.querySelector('[data-screen-block-id="image-legacy"]');
    expect(el?.querySelector(".aspect-video")).toBeNull();
    const img = el?.querySelector("img");
    expect(img?.className).toContain("w-full");
    expect(img?.className).toContain("rounded-lg");
    expect(img?.className).not.toContain("h-full");
  } finally {
    view.cleanup();
  }
});

// ── TASK-505-02: section grid renderer ──────────────────────────────────────
//
// The one shared block-list container becomes display:grid with a preset-derived
// grid-template-columns + gap WHEN section.style.columns is set; absent columns
// stays the exact space-y-4 vertical stack (byte-identical). Auto-flow places each
// block in one cell (DOM order); in the builder the inter-block insert-gaps are
// suppressed when gridded (they'd steal a cell + stack the blocks) — only the
// section-start/end gaps remain, each full-row grid-column:1/-1.

const gridDoc = (
  blocks: ScreenBlockV1[],
  style: ScreenSectionStyleV1 | undefined
): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [
    {
      id: "section-1",
      type: "section",
      data: { title: "Details" },
      blocks,
      ...(style ? { style } : {}),
    },
  ],
});

const gridRender = (
  blocks: ScreenBlockV1[],
  style: ScreenSectionStyleV1 | undefined,
  mode: "builder" | "entry" | "preview",
  extra: Record<string, unknown> = {}
) =>
  mount(
    <ScreenRuntimeRenderer
      document={gridDoc(blocks, style)}
      bindings={[]}
      values={{}}
      fields={fields}
      mode={mode}
      {...extra}
    />
  );

// The block-list container: builder tags it with data-screen-section-dropzone;
// preview/entry emit only the container div as the section's sole child.
const blockListContainer = (container: HTMLElement, mode: string): HTMLElement => {
  if (mode === "builder") {
    return container.querySelector<HTMLElement>("[data-screen-section-dropzone]")!;
  }
  return container
    .querySelector('[data-screen-section-id="section-1"]')!
    .querySelector<HTMLElement>("div")!;
};

const cell = (id: string): ScreenBlockV1 => ({
  id,
  type: "text",
  data: { label: "", content: id },
});

// The builder-mode prop that flips `canInsert` true (mode==="builder" && onSetInsertPoint).
const builderExtra = { onSetInsertPoint: () => {} };

test("TASK-505-02: grid class + inline grid-template-columns per preset (all 13, preview path)", () => {
  for (const preset of screenSectionColumnPresets) {
    const view = gridRender([cell("a"), cell("b")], { columns: preset }, "preview");
    try {
      const el = blockListContainer(view.container, "preview");
      const tokens = el.className.split(/\s+/);
      expect(tokens).toContain("grid");
      expect(tokens).not.toContain("space-y-4");
      // Assert the INLINE attribute (browsers resolve fr → px, so getComputedStyle
      // would false-fail against the fr-string).
      expect(el.style.gridTemplateColumns).toBe(screenSectionColumnTemplate[preset]);
    } finally {
      view.cleanup();
    }
  }
});

test("TASK-505-02: gap wiring — explicit columnGap emits gap:Npx; absent columnGap defaults to 16px", () => {
  const withGap = gridRender([cell("a")], { columns: "2", columnGap: 24 }, "preview");
  try {
    const el = blockListContainer(withGap.container, "preview");
    expect(el.style.gap).toBe("24px");
  } finally {
    withGap.cleanup();
  }

  const zeroGap = gridRender([cell("a")], { columns: "2", columnGap: 0 }, "preview");
  try {
    const el = blockListContainer(zeroGap.container, "preview");
    // React omits the px unit for 0; the point is the default 16 is overridden.
    expect(el.style.gap).toBe("0");
  } finally {
    zeroGap.cleanup();
  }

  const defaultGap = gridRender([cell("a")], { columns: "2" }, "preview");
  try {
    const el = blockListContainer(defaultGap.container, "preview");
    expect(el.style.gap).toBe("16px");
  } finally {
    defaultGap.cleanup();
  }
});

test("TASK-505-02: absent-style DOM identity — no columns keeps space-y-4 and no inline grid style (byte-stable)", () => {
  for (const mode of ["builder", "preview", "entry"] as const) {
    const view = gridRender([cell("a"), cell("b")], undefined, mode, builderExtra);
    try {
      const el = blockListContainer(view.container, mode);
      const tokens = el.className.split(/\s+/);
      expect(tokens).toContain("space-y-4");
      expect(tokens).not.toContain("grid");
      expect(el.style.gridTemplateColumns).toBe("");
      expect(el.style.gap).toBe("");
    } finally {
      view.cleanup();
    }
  }
});

test("TASK-505-02: gridded builder gaps = section-start + section-end only, each full-row; no inter-block gap", () => {
  const view = gridRender(
    [cell("a"), cell("b"), cell("c")],
    { columns: "3" },
    "builder",
    builderExtra
  );
  try {
    const el = blockListContainer(view.container, "builder");
    const gaps = Array.from(
      el.querySelectorAll<HTMLElement>(
        '[data-screen-insert-gap="true"][data-insert-kind="section-index"]'
      )
    );
    // Exactly two: index 0 (start) and index 3 (end == N).
    expect(gaps.map((g) => g.getAttribute("data-insert-index")).sort()).toEqual(["0", "3"]);
    for (const gap of gaps) {
      expect(gap.style.gridColumn).toBe("1 / -1");
    }
    // No inter-block gap at index 1 or 2.
    for (const idx of ["1", "2"]) {
      expect(
        el.querySelector(`[data-screen-insert-gap="true"][data-insert-index="${idx}"]`)
      ).toBeNull();
    }
  } finally {
    view.cleanup();
  }
});

test("TASK-505-02: non-gridded builder keeps a gap at every index (N+1) with no inline style (byte-identical)", () => {
  const view = gridRender([cell("a"), cell("b"), cell("c")], undefined, "builder", builderExtra);
  try {
    const el = blockListContainer(view.container, "builder");
    const gaps = Array.from(
      el.querySelectorAll<HTMLElement>(
        '[data-screen-insert-gap="true"][data-insert-kind="section-index"]'
      )
    );
    expect(gaps.length).toBe(4); // indices 0..3
    for (const gap of gaps) {
      expect(gap.getAttribute("style")).toBeNull();
    }
  } finally {
    view.cleanup();
  }
});

test("TASK-505-02: builder side-by-side — block cards are direct consecutive grid children, no full-row sibling between them", () => {
  for (const preset of ["2", "3-1"] as const) {
    const view = gridRender([cell("a"), cell("b")], { columns: preset }, "builder", builderExtra);
    try {
      const el = blockListContainer(view.container, "builder");
      const children = Array.from(el.children) as HTMLElement[];
      // Expected order: [gap(full-row), block-a, block-b, gap(full-row)].
      const blockA = children.findIndex((c) => c.getAttribute("data-screen-block-id") === "a");
      const blockB = children.findIndex((c) => c.getAttribute("data-screen-block-id") === "b");
      expect(blockA).toBeGreaterThanOrEqual(0);
      expect(blockB).toBe(blockA + 1); // adjacent — nothing interleaved
      // The block between the two cells must NOT carry a full-row span.
      expect(children[blockA].style.gridColumn).toBe("");
      expect(children[blockB].style.gridColumn).toBe("");
    } finally {
      view.cleanup();
    }
  }
});

test("TASK-505-02: auto-flow / DOM order — preview & entry emit exactly N direct grid children in source order", () => {
  for (const mode of ["preview", "entry"] as const) {
    const view = gridRender([cell("a"), cell("b"), cell("c")], { columns: "3" }, mode);
    try {
      const el = blockListContainer(view.container, mode);
      const children = Array.from(el.children) as HTMLElement[];
      expect(children.length).toBe(3);
      expect(children.map((c) => c.getAttribute("data-screen-block-id"))).toEqual(["a", "b", "c"]);
    } finally {
      view.cleanup();
    }
  }
});

test("TASK-505-02: 503 per-block width stays within-cell — w-1/2 on the block wrap, no grid-column on the block", () => {
  const styledCell: ScreenBlockV1 = {
    id: "half",
    type: "text",
    data: { label: "", content: "half" },
    style: { width: "half" },
  };
  const view = gridRender([styledCell, cell("b")], { columns: "2" }, "preview");
  try {
    const el = view.container.querySelector<HTMLElement>('[data-screen-block-id="half"]');
    expect(el?.className).toContain("w-1/2");
    expect(el?.style.gridColumn).toBe("");
  } finally {
    view.cleanup();
  }
});

test("TASK-505-02: drop-zones intact in a gridded section — container keeps data-screen-section-dropzone + card before/after targets", () => {
  const view = gridRender([cell("a"), cell("b")], { columns: "2" }, "builder", {
    ...builderExtra,
    onDragMove: () => {},
  });
  try {
    const el = blockListContainer(view.container, "builder");
    expect(el.getAttribute("data-screen-section-dropzone")).toBe("section-1");
    // The per-card midpoint drop surface exists only when the render passes
    // dropTargets — the drag handle is the tell that cardDropTargets is defined.
    expect(view.container.querySelector('[data-screen-drag-handle="a"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("TASK-505-02: empty gridded section — the message spans the full row; non-gridded empty carries no inline style", () => {
  // The per-section "Empty section" message renders in builder mode (preview/entry
  // fall through to the whole-document empty placeholder when no section has blocks).
  const gridded = gridRender([], { columns: "2" }, "builder", builderExtra);
  try {
    const el = blockListContainer(gridded.container, "builder");
    const message = el.querySelector<HTMLElement>("div");
    expect(message?.textContent).toContain("Empty section");
    expect(message?.style.gridColumn).toBe("1 / -1");
  } finally {
    gridded.cleanup();
  }

  const plain = gridRender([], undefined, "builder", builderExtra);
  try {
    const el = blockListContainer(plain.container, "builder");
    const message = el.querySelector<HTMLElement>("div");
    expect(message?.textContent).toContain("Empty section");
    expect(message?.getAttribute("style")).toBeNull();
  } finally {
    plain.cleanup();
  }
});

test("TASK-505-02: preview + entry parity — the same columns emits the same grid + template (single code path)", () => {
  const preview = gridRender([cell("a"), cell("b")], { columns: "3-1" }, "preview");
  const entry = gridRender([cell("a"), cell("b")], { columns: "3-1" }, "entry");
  try {
    const p = blockListContainer(preview.container, "preview");
    const e = blockListContainer(entry.container, "entry");
    expect(p.className.split(/\s+/)).toContain("grid");
    expect(e.className.split(/\s+/)).toContain("grid");
    expect(p.style.gridTemplateColumns).toBe("3fr 1fr");
    expect(e.style.gridTemplateColumns).toBe("3fr 1fr");
  } finally {
    preview.cleanup();
    entry.cleanup();
  }
});

test("TASK-503-02 E: the placeholder honors the ratio class when there is no src", () => {
  const block: ScreenBlockV1 = {
    id: "image-ph",
    type: "image",
    data: { label: "Cover", fit: "cover", ratio: "1/1" },
  };
  const view = render([block], "entry");
  try {
    const el = view.container.querySelector('[data-screen-block-id="image-ph"]');
    expect(el?.querySelector("img")).toBeNull();
    expect(el?.querySelector(".aspect-square")).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("TASK-503-02 E: a javascript: static src never reaches <img> in builder (read gate) while a /media src renders", () => {
  const unsafe: ScreenBlockV1 = {
    id: "image-unsafe",
    type: "image",
    data: { label: "Cover", fit: "cover", src: "javascript:alert(1)" },
  };
  const unsafeView = render([unsafe], "builder");
  try {
    const el = unsafeView.container.querySelector('[data-screen-block-id="image-unsafe"]');
    expect(el?.querySelector("img")).toBeNull();
    expect(el?.textContent).toContain("Cover");
  } finally {
    unsafeView.cleanup();
  }

  const safe: ScreenBlockV1 = {
    id: "image-safe",
    type: "image",
    data: { label: "Cover", fit: "cover", src: "/media/x.jpg" },
  };
  const safeView = render([safe], "builder");
  try {
    const img = safeView.container.querySelector('[data-screen-block-id="image-safe"] img');
    expect(img?.getAttribute("src")).toBe("/media/x.jpg");
  } finally {
    safeView.cleanup();
  }
});
