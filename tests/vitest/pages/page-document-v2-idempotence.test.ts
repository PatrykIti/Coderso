import { describe, expect, test } from "vitest";

import {
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  resolvePageBlockForBreakpoint,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import { buildDocument } from "./page-document-v2-test-helpers";

// ── TASK-539-01-L01 ── idempotence and byte identity for no-repair documents ──
describe("TASK-539 idempotence and byte identity", () => {
  test("normalize->normalize is byte-identical for an authored gallery + responsive doc", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0] = {
      id: "blk_g5",
      type: "gallery",
      props: {
        layout: "grid",
        items: [
          { src: "/a.jpg", alt: "A", caption: "Alpha", category: "modern eco" },
          { src: "/b.jpg", alt: "B", caption: "Beta" },
        ],
      },
      visibility: { visible: true },
    };
    const written = normalizePageDocumentV2ForWrite(document);
    const second = normalizePageDocumentV2ForWrite(written);
    expect(JSON.stringify(second)).toBe(JSON.stringify(written));
    const read = normalizeStoredPageDocumentV2ForRead(written);
    const readAgain = normalizeStoredPageDocumentV2ForRead(read);
    expect(JSON.stringify(readAgain)).toBe(JSON.stringify(read));
  });

  test("a no-override document is byte-identical across write->write and write->read", () => {
    const document = buildDocument();
    const written = normalizePageDocumentV2ForWrite(document);
    // The write pass seeds the TASK-425 explicit `stackVertical:false` default,
    // so the second write (and the stored read) must preserve that exact form.
    const writtenAgain = normalizePageDocumentV2ForWrite(written);
    expect(JSON.stringify(writtenAgain)).toBe(JSON.stringify(written));
    const read = normalizeStoredPageDocumentV2ForRead(written);
    expect(JSON.stringify(read)).toBe(JSON.stringify(written));
  });

  test("responsive textTransform:none reset survives breakpoint resolution", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.responsive = {
      tablet: { style: { textTransform: "none" } },
    } as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    const written = normalizePageDocumentV2ForWrite(document);
    const resolved = resolvePageBlockForBreakpoint(written.sections[0]!.blocks[0]!, "tablet");
    expect(resolved.style?.textTransform).toBe("none");
  });

  test("stored-read pruning removes empty layer/style/breakpoint records but keeps siblings", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.responsive = {
      tablet: { style: { layer: { x: 1, anchor: "center" } }, visibility: { visible: false } },
      mobile: { style: { layer: {} }, visibility: { visible: true } },
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    const read = normalizeStoredPageDocumentV2ForRead(document);
    const tablet = read.sections[0]!.blocks[0]!.responsive?.tablet;
    expect(tablet?.style).toBeUndefined();
    expect(tablet?.visibility).toEqual({ visible: false });
    const mobile = read.sections[0]!.blocks[0]!.responsive?.mobile;
    expect(mobile?.style).toBeUndefined();
    expect(mobile?.visibility).toEqual({ visible: true });
  });
});
