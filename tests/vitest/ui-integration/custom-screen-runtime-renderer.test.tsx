// @vitest-environment happy-dom

// TASK-498-02 B-runtime: the static render branches for the data-oriented kinds
// (heading / text / stat / divider / image / button / tabs) + the related-list
// builder skeleton / entry placeholder. Asserts builder mode renders the corner tag
// + muted `{{ label }}` Token (no live value / no Editable-Read-Unbound badge) for the
// bound kinds, entry/preview render the resolved value, presentation-override className
// survives on the text-bearing kinds, and an unknown `type` still hits the legacy
// placeholder. (The related-list resolved-rows cases land in TASK-498-03.)

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { ScreenRuntimeRenderer } from "../../../core/admin/ui/custom-screens/ScreenRuntimeRenderer";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

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

test("bound image renders a placeholder Token in builder and an <img> in entry", () => {
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

  const builder = render([block], "builder", [binding], { cover: "https://cdn.example/cover.png" });
  try {
    const el = builder.container.querySelector('[data-screen-block-id="image-1"]');
    expect(el?.textContent).toContain("{{ Cover }}");
    expect(el?.querySelector("img")).toBeNull();
  } finally {
    builder.cleanup();
  }

  const entry = render([block], "entry", [binding], { cover: "https://cdn.example/cover.png" });
  try {
    const img = entry.container.querySelector('[data-screen-block-id="image-1"] img');
    expect(img?.getAttribute("src")).toBe("https://cdn.example/cover.png");
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

test("per-entry media override and bound field value take precedence over the static src", () => {
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

  // Bound field value beats the authored static src.
  const boundView = render([block], "entry", [binding], { cover: "https://cdn.example/bound.png" });
  try {
    const img = boundView.container.querySelector('[data-screen-block-id="image-1"] img');
    expect(img?.getAttribute("src")).toBe("https://cdn.example/bound.png");
  } finally {
    boundView.cleanup();
  }

  // Per-entry presentation override beats BOTH the bound value and the static src.
  const overrideView = render(
    [block],
    "entry",
    [binding],
    { cover: "https://cdn.example/bound.png" },
    {
      presentationOverrides: [
        { blockId: "image-1", propPath: "image", value: "https://cdn.example/override.png" },
      ],
    }
  );
  try {
    const img = overrideView.container.querySelector('[data-screen-block-id="image-1"] img');
    expect(img?.getAttribute("src")).toBe("https://cdn.example/override.png");
  } finally {
    overrideView.cleanup();
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
    cover: "https://cdn.example/bound.png",
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

test("button renders its label as a CTA", () => {
  const block: ScreenBlockV1 = {
    id: "button-1",
    type: "button",
    data: { label: "Open", action: "link", variant: "primary", href: "https://example.com" },
  };
  const view = render([block], "entry");
  try {
    const el = view.container.querySelector('[data-screen-block-id="button-1"]');
    expect(el?.textContent).toContain("Open");
    expect(el?.querySelector('a[href="https://example.com"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("tabs renders its tab labels + slot regions with no binding", () => {
  const block: ScreenBlockV1 = {
    id: "tabs-1",
    type: "tabs",
    data: {
      label: "Tabs",
      tabs: [
        { id: "tab-1", label: "Overview" },
        { id: "tab-2", label: "Activity" },
      ],
    },
    slots: { "tab-1": [], "tab-2": [] },
  };
  const view = render([block], "preview");
  try {
    const el = view.container.querySelector('[data-screen-block-id="tabs-1"]');
    expect(el?.textContent).toContain("Overview");
    expect(el?.textContent).toContain("Activity");
    expect(el?.querySelector('[data-screen-runtime-tab="tab-1"]')).not.toBeNull();
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
  } finally {
    builder.cleanup();
  }

  const preview = render([block], "preview");
  try {
    const section = preview.container.querySelector('[data-screen-section-id="section-1"]');
    expect(section?.className).toContain("bg-background/80");
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
