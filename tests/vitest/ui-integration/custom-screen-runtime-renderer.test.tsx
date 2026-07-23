// @vitest-environment happy-dom

// TASK-498-02 B-runtime: basic leaf rendering, media and Button provenance,
// and the final ASCII-control URL sink contract.

import { afterEach, expect, test, vi } from "vitest";

import type {
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";
import {
  headingBinding,
  headingBlock,
  mediaUuidA,
  mediaUuidB,
  mediaUuidC,
  render,
  staticImageBlock,
} from "./support/customScreenRuntimeRendererHarness";

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value }: { value: unknown }) => (
    <div data-screen-test-media-picker="true" data-value={JSON.stringify(value)} />
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

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

test.each([
  ["TAB", "/\t/evil.example/x"],
  ["LF", "/\n/evil.example/x"],
  ["CR", "/\r/evil.example/x"],
  ["NUL", "/\u0000/evil.example/x"],
  ["DEL", "/\u007F/evil.example/x"],
] as const)(
  "ASCII-control %s URL stays disabled at the final Button and Image DOM sinks",
  (controlName, value) => {
    const buttonView = render(
      [
        {
          id: "button-control",
          type: "button",
          data: { label: "Open", action: "link", variant: "primary", href: value },
        },
      ],
      "entry"
    );
    try {
      const buttonRoot = buttonView.container.querySelector(
        '[data-screen-block-id="button-control"]'
      );
      expect(buttonRoot?.querySelector("a"), controlName).toBeNull();
      expect(
        buttonRoot
          ?.querySelector('[data-screen-button-affordance="true"]')
          ?.getAttribute("aria-disabled"),
        controlName
      ).toBe("true");
    } finally {
      buttonView.cleanup();
    }

    const imageView = render(
      [
        {
          id: "image-control",
          type: "image",
          data: { label: "Cover", fit: "cover", src: value },
        },
      ],
      "entry"
    );
    try {
      const imageRoot = imageView.container.querySelector('[data-screen-block-id="image-control"]');
      expect(imageRoot?.querySelector("img"), controlName).toBeNull();
      expect(imageRoot?.querySelector('[data-image-disabled="true"]'), controlName).not.toBeNull();
    } finally {
      imageView.cleanup();
    }
  }
);

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
