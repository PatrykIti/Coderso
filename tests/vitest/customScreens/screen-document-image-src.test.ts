import { describe, expect, test } from "vitest";

import {
  buildDefaultListViewDefinition,
  CustomScreenDefinitionError,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  normalizeScreenDocumentV1,
  normalizeScreenDocumentV1ForRead,
  normalizeScreenImageSrc,
  sanitizeScreenAuthoringUrl,
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

const imageBlock = (src?: unknown) => ({
  id: "image-1",
  type: "image",
  data: { label: "Image", ...(src === undefined ? {} : { src }) },
});

const buttonBlock = (href?: unknown) => ({
  id: "button-1",
  type: "button",
  data: {
    label: "Open",
    action: "link",
    ...(href === undefined ? {} : { href }),
  },
});

const writeData = (block: unknown) =>
  normalizeCustomScreenDefinitionForWrite({
    definition: buildV4WithBlocks([block]),
  }).editorView.document.sections[0]?.blocks[0]?.data as Record<string, unknown>;

const readData = (block: unknown) =>
  normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([block]),
  }).editorView.document.sections[0]?.blocks[0]?.data as Record<string, unknown>;

describe("Custom Screen authoring URL trust boundary", () => {
  test("accepts the shared safe corpus and rejects hostile or backslash-confused values", () => {
    const safeMedia = ["/media/logo.png", "https://cdn.example.com/x.png", "http://host/x.png"];
    const safeLinks = [...safeMedia, "#details", "mailto:owner@example.com", "tel:+48123456789"];
    for (const value of safeMedia) {
      expect(sanitizeScreenAuthoringUrl(value, "media")).toBe(value);
    }
    for (const value of safeLinks) {
      expect(sanitizeScreenAuthoringUrl(value, "link")).toBe(value);
    }
    expect(sanitizeScreenAuthoringUrl("  https://cdn.example.com/x.png  ", "media")).toBe(
      "https://cdn.example.com/x.png"
    );

    const hostile: unknown[] = [
      "//evil.example/x.png",
      "/media\\..\\evil.png",
      "https:\\evil.example\\x.png",
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:image/png;base64,AAAA",
      "blob:https://evil/x",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
      "bare-token.png",
      "   ",
      42,
      null,
      {},
    ];
    for (const value of hostile) {
      expect(sanitizeScreenAuthoringUrl(value, "media"), String(value)).toBeNull();
      expect(sanitizeScreenAuthoringUrl(value, "link"), String(value)).toBeNull();
    }
    expect(sanitizeScreenAuthoringUrl("mailto:owner@example.com", "media")).toBeNull();
    expect(sanitizeScreenAuthoringUrl("#details", "media")).toBeNull();
  });

  test("normalizeScreenImageSrc remains an exact delegating compatibility alias", () => {
    const corpus: unknown[] = [
      "/media/a.jpg",
      "https://x/y.png",
      "http://host/x.png",
      "  https://x/y.png  ",
      "//evil/x.png",
      "/media\\evil.png",
      "javascript:alert(1)",
      "data:image/png;base64,x",
      "blob:x",
      "  ",
      42,
      null,
    ];
    for (const value of corpus) {
      expect(normalizeScreenImageSrc(value)).toBe(sanitizeScreenAuthoringUrl(value, "media") ?? "");
    }
    expect(normalizeScreenImageSrc(normalizeScreenImageSrc("/media/a.jpg"))).toBe("/media/a.jpg");
  });

  test("write rejects unsafe image and Button URLs with generated non-echo paths", () => {
    const rejected = "javascript:submitted-secret-value";
    for (const [block, expectedPath] of [
      [imageBlock(rejected), "definition.editorView.document.sections.0.blocks.0.data.src"],
      [buttonBlock(rejected), "definition.editorView.document.sections.0.blocks.0.data.href"],
    ] as const) {
      try {
        writeData(block);
        throw new Error("expected unsafe URL rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomScreenDefinitionError);
        const definitionError = error as CustomScreenDefinitionError;
        expect(definitionError.fields).toEqual([expectedPath]);
        expect(definitionError.fields.join(" ")).not.toContain(rejected);
        expect(definitionError.fields.length).toBeLessThanOrEqual(8);
        expect(definitionError.fields.every((field) => field.length <= 240)).toBe(true);
      }
    }
  });

  test("every present non-string URL fails on write while stored-read alone omits it", () => {
    const malformed: unknown[] = [null, 42, true, false, [], {}, ["/media/a.jpg"]];
    for (const value of malformed) {
      expect(() => writeData(imageBlock(value)), `image ${String(value)}`).toThrow(
        CustomScreenDefinitionError
      );
      expect(() => writeData(buttonBlock(value)), `button ${String(value)}`).toThrow(
        CustomScreenDefinitionError
      );
      expect(readData(imageBlock(value)).src).toBeUndefined();
      expect(readData(buttonBlock(value)).href).toBeUndefined();
    }
  });

  test("stored-read omits unsafe legacy URLs without substituting executable fallbacks", () => {
    for (const value of ["javascript:alert(1)", "//evil.example/image.png", "/media\\evil.png"]) {
      expect(readData(imageBlock(value)).src).toBeUndefined();
      expect(readData(buttonBlock(value)).href).toBeUndefined();
    }
  });

  test("safe static values are canonical, idempotent, and empty means absent", () => {
    for (const src of ["/media/logo.png", "https://cdn.example.com/x.png", "http://host/x.png"]) {
      const once = writeData(imageBlock(src));
      expect(once.src).toBe(src);
      expect(writeData(imageBlock(once.src))).toEqual(once);
    }
    expect(writeData(imageBlock("")).src).toBeUndefined();
    expect(writeData(buttonBlock("")).href).toBeUndefined();
  });

  test("image without src remains byte-stable through write and stored-read documents", () => {
    const document = {
      schemaVersion: 1,
      sections: [
        {
          id: "section-default",
          type: "section",
          data: { title: "Details" },
          blocks: [{ id: "image-1", type: "image", data: { label: "Image", ratio: "" } }],
        },
      ],
    };
    expect(normalizeScreenDocumentV1(document)).toEqual(document);
    expect(normalizeScreenDocumentV1ForRead(document)).toEqual(document);
    expect(JSON.stringify(normalizeScreenDocumentV1(document))).toBe(JSON.stringify(document));
  });

  test("direct write rejects fixed-kind coercion attempts instead of bypassing route schemas", () => {
    expect(() => writeData({ id: "image-1", type: "image", data: { fit: "not-a-fit" } })).toThrow(
      CustomScreenDefinitionError
    );
    expect(readData({ id: "image-1", type: "image", data: { fit: "not-a-fit" } }).fit).toBe(
      "cover"
    );
  });
});
