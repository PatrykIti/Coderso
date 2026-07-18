// @vitest-environment happy-dom

import { afterEach, expect, test } from "vitest";

import { ScreenRuntimeRenderer } from "../../../core/admin/ui/custom-screens/ScreenRuntimeRenderer";
import {
  screenSectionColumnPresets,
  screenSectionColumnTemplate,
} from "../../../core/services/customScreens/customScreenSchemas";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenSectionStyleV1,
} from "../../../core/services/customScreens/customScreenSchemas";
import { fields, mount, render } from "./support/customScreenRuntimeRendererHarness";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
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
