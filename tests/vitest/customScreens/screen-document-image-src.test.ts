// TASK-500-04: static image `src` — optional, scheme-validated, additive to the image
// allow-list. Write-path gate: unsafe schemes normalize to "" (never throw); stored
// images WITHOUT src stay byte-stable (no schemaVersion bump, definition stays v4).
import { describe, expect, test } from "vitest";

import {
  buildDefaultListViewDefinition,
  normalizeCustomScreenDefinition,
  normalizeScreenDocumentV1,
  normalizeScreenDocumentV1ForRead,
  normalizeScreenImageSrc,
} from "../../../core/services/customScreens/customScreenSchemas";

const buildV4WithBlocks = (blocks: unknown[]) => ({
  schemaVersion: 4,
  listView: buildDefaultListViewDefinition(),
  editorView: {
    document: {
      schemaVersion: 1,
      sections: [
        {
          id: "section-default",
          type: "section",
          data: { title: "Details" },
          blocks,
        },
      ],
    },
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  },
});

const imageBlock = (data: Record<string, unknown>) => ({
  id: "image-1",
  type: "image",
  data,
});

const normalizedImageData = (blocks: unknown[]) => {
  const definition = normalizeCustomScreenDefinition({ definition: buildV4WithBlocks(blocks) });
  return definition.editorView.document.sections[0]?.blocks[0]?.data as Record<string, unknown>;
};

describe("image static src (schema-first)", () => {
  test("accepts and preserves a safe static src byte-stable / idempotent", () => {
    for (const src of ["/media/logo.png", "https://cdn.example.com/x.png", "http://host/x.png"]) {
      const data = { label: "Image", fit: "cover", ratio: "", src };
      const once = normalizedImageData([imageBlock(data)]);
      expect(once).toEqual(data);
      // Idempotent: normalizing the normalized output changes nothing.
      const twice = normalizedImageData([imageBlock(once)]);
      expect(twice).toEqual(once);
    }
  });

  test("drops unsafe or invalid src values to '' (never throws)", () => {
    const unsafe: unknown[] = [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:image/png;base64,AAAA",
      "blob:https://evil/x",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
      "bare-token.png",
      "   ",
      42,
    ];
    for (const src of unsafe) {
      const data = normalizedImageData([imageBlock({ label: "Image", src })]);
      expect(data.src).toBe("");
    }
  });

  test("unknown keys still throw custom_screen_definition_invalid; fit coercion coexists with src", () => {
    expect(() =>
      normalizedImageData([imageBlock({ label: "Image", src: "/x.png", bogus: true })])
    ).toThrow("custom_screen_definition_invalid");

    const data = normalizedImageData([
      imageBlock({ label: "Image", fit: "not-a-fit", src: "/media/x.png" }),
    ]);
    expect(data.fit).toBe("cover");
    expect(data.src).toBe("/media/x.png");
  });

  test("an image WITHOUT src round-trips byte-stable through normalizeScreenDocumentV1 / …ForRead", () => {
    const document = {
      schemaVersion: 1,
      sections: [
        {
          id: "section-default",
          type: "section",
          data: { title: "Details" },
          blocks: [imageBlock({ label: "Image", fit: "cover", ratio: "" })],
        },
      ],
    };
    // Whole-document assertion: stored-V4 images without src are untouched (no key seeded).
    expect(normalizeScreenDocumentV1(document)).toEqual(document);
    expect(normalizeScreenDocumentV1ForRead(document)).toEqual(document);
  });

  // TASK-503-01: normalizeScreenImageSrc is now exported as the single source of truth
  // for the 503-02 builder-preview gate + 503-03 inspector write filter. Behavior is
  // byte-identical to the pre-export write-path helper.
  test("normalizeScreenImageSrc (exported) filters schemes + trims, idempotent", () => {
    expect(normalizeScreenImageSrc("/media/a.jpg")).toBe("/media/a.jpg");
    expect(normalizeScreenImageSrc("https://x/y.png")).toBe("https://x/y.png");
    expect(normalizeScreenImageSrc("http://host/x.png")).toBe("http://host/x.png");
    expect(normalizeScreenImageSrc("  https://x/y.png  ")).toBe("https://x/y.png");
    for (const unsafe of ["javascript:alert(1)", "data:image/png;base64,x", "blob:x", "  ", 42]) {
      expect(normalizeScreenImageSrc(unsafe)).toBe("");
    }
    // Idempotent.
    expect(normalizeScreenImageSrc(normalizeScreenImageSrc("/media/a.jpg"))).toBe("/media/a.jpg");
  });
});
