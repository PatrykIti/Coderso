// TASK-539-05-L01 — `pageRendererTimelineGeometry.ts` direct-owner suite.
// Imports the type/function directly (never through the stable facade) and pins
// the exact contract from TASK-539-05-L01 section 8: default/compact geometry,
// `0..120`/compact-scaled row gaps, every first/interior/final/singleton/
// horizontal axis result, and the facade-not-widened guarantee.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { resolvePageSectionTemplate } from "../../../core/services/pages/pageSectionTemplates";
import {
  resolvePageTimelineItemGeometry,
  type PageTimelineItemGeometry,
} from "../../../core/services/pages/pageRendererTimelineGeometry";

const timelineSection = (variant: string, gap = 24) =>
  createPageSectionV2("timeline", {
    id: `sec-geo-${variant}`,
    variant: variant as "default" | "compact" | "horizontal",
    layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
    spacing: {
      gap,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: `geo-a-${variant}`,
        props: { text: "A", level: "h3", align: "left" },
      }),
    ],
  });

const geometry = (
  variant: string,
  gap: number,
  index: number,
  total: number
): PageTimelineItemGeometry => {
  const section = timelineSection(variant, gap);
  return resolvePageTimelineItemGeometry(
    section,
    resolvePageSectionTemplate(section),
    index,
    total
  );
};

describe("pageRendererTimelineGeometry (TASK-539-05-L01)", () => {
  test("default variant: first/interior/final axis around the 22px marker center", () => {
    const first = geometry("default", 24, 0, 3);
    expect(first.paddingClassName).toBe("py-3");
    expect(first.markerCenterPx).toBe(22);
    expect(first.rowGapPx).toBe(24);
    expect(first.axis).toEqual({ top: "22px", bottom: "calc(-1 * 24px)" });

    const interior = geometry("default", 24, 1, 3);
    expect(interior.axis).toEqual({ top: "0", bottom: "calc(-1 * 24px)" });

    const last = geometry("default", 24, 2, 3);
    expect(last.axis).toEqual({ top: "0", bottom: "calc(100% - 22px)" });
  });

  test("compact variant: 18px center + py-2 + compact-scaled gap (24 -> 14)", () => {
    const g = geometry("compact", 24, 0, 3);
    expect(g.paddingClassName).toBe("py-2");
    expect(g.markerCenterPx).toBe(18);
    // toPageSectionVariantSpacing scales the timeline compact gap by 0.6
    // (max(8, round(24 * 0.6)) = 14), never the unscaled 24.
    expect(g.rowGapPx).toBe(14);
    expect(g.axis).toEqual({ top: "18px", bottom: "calc(-1 * 14px)" });
  });

  test("compact small gap floors at the 8px minimum", () => {
    // max(8, round(4 * 0.6)) = max(8, 2) = 8 — the compact minimum floor.
    const g = geometry("compact", 4, 0, 2);
    expect(g.rowGapPx).toBe(8);
    expect(g.axis).toEqual({ top: "18px", bottom: "calc(-1 * 8px)" });
  });

  test("zero gap yields a zero bleed (no negative overshoot)", () => {
    const g = geometry("default", 0, 0, 2);
    expect(g.rowGapPx).toBe(0);
    expect(g.axis).toEqual({ top: "22px", bottom: "calc(-1 * 0px)" });
  });

  test("row gap is the normalized helper's 0..120 clamp (never raw input)", () => {
    // The model normalizer clamps spacing.gap into 0..120; the geometry helper
    // consumes exactly that normalized gap and never re-clamps or re-reads raw.
    const g = geometry("default", 240, 0, 2);
    expect(g.rowGapPx).toBe(120);
    expect(g.axis).toEqual({ top: "22px", bottom: "calc(-1 * 120px)" });
  });

  test("singleton timeline (total <= 1) draws no axis in both vertical variants", () => {
    for (const variant of ["default", "compact"] as const) {
      const g = geometry(variant, 24, 0, 1);
      expect(g.axis).toBeNull();
      expect(g.paddingClassName).toBe(variant === "compact" ? "py-2" : "py-3");
      expect(g.markerCenterPx).toBe(variant === "compact" ? 18 : 22);
      // row gap is still the resolved, non-nullable geometry input.
      expect(g.rowGapPx).toBe(variant === "compact" ? 14 : 24);
    }
  });

  test("horizontal variant always draws no axis", () => {
    const g = geometry("horizontal", 24, 0, 3);
    expect(g.axis).toBeNull();
    expect(g.paddingClassName).toBe("py-3");
    expect(g.markerCenterPx).toBe(22);
    expect(g.rowGapPx).toBe(24);
  });

  test("unknown variant falls back to default geometry (resolver fallback)", () => {
    // An invalid authored variant resolves to the timeline fallback "default",
    // so geometry must NOT assume the raw section variant.
    const g = geometry("weird", 24, 1, 3);
    expect(g.paddingClassName).toBe("py-3");
    expect(g.markerCenterPx).toBe(22);
    expect(g.axis).toEqual({ top: "0", bottom: "calc(-1 * 24px)" });
  });

  test("stable facade does not widen with the task-added geometry symbols", () => {
    const facade = readFileSync("core/services/pages/pageRendererV2.tsx", "utf8");
    expect(facade).not.toContain("resolvePageTimelineItemGeometry");
    expect(facade).not.toContain("PageTimelineItemGeometry");
  });
});
