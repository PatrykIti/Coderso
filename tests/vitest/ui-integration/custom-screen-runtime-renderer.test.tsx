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
