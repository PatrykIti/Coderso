/**
 * TASK-539-05-L01 — timeline item geometry (direct owner).
 *
 * Pure, Bun-free, import-side-effect free. The stable `pageRendererV2.tsx`
 * facade deliberately does NOT re-export `PageTimelineItemGeometry` or
 * `resolvePageTimelineItemGeometry`; the section renderer and the focused
 * direct-owner suite import this file directly.
 *
 * Contract (TASK-539-05-L01 section 8):
 * - `paddingClassName` is `"py-2"` and `markerCenterPx` is `18` only for the
 *   compact timeline variant; otherwise `"py-3"` and `22`.
 * - `rowGapPx` is exactly the normalized `toPageSectionVariantSpacing` gap
 *   (`0..120`, including the existing compact scaling/minimum behavior).
 * - `axis` is `null` for horizontal timelines and for `total <= 1`.
 * - Otherwise the first segment begins at the first marker center, interior
 *   segments begin at row top, non-final segments bleed only the negative row
 *   gap, and the final segment ends at the final marker center.
 */

import type { PageSectionV2 } from "./pageDocumentV2Types";
import type { ResolvedPageSectionTemplate } from "./pageSectionTemplates";
import { toPageSectionVariantSpacing } from "./pageSectionRenderStyles";

export type PageTimelineItemGeometry = {
  paddingClassName: "py-2" | "py-3";
  markerCenterPx: 18 | 22;
  rowGapPx: number;
  axis: {
    top: string;
    bottom: string;
  } | null;
};

export function resolvePageTimelineItemGeometry(
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate,
  index: number,
  total: number
): PageTimelineItemGeometry {
  const compact = template.variant === "compact";
  const markerCenterPx = compact ? 18 : 22;
  const rowGapPx = toPageSectionVariantSpacing(section, template).gap;
  const horizontal = template.variant === "horizontal";
  if (horizontal || total <= 1) {
    return {
      paddingClassName: compact ? "py-2" : "py-3",
      markerCenterPx,
      rowGapPx,
      axis: null,
    };
  }
  const top = index === 0 ? `${markerCenterPx}px` : "0";
  const bottom =
    index === total - 1
      ? `calc(100% - ${markerCenterPx}px)`
      : `calc(-1 * ${rowGapPx}px)`;
  return {
    paddingClassName: compact ? "py-2" : "py-3",
    markerCenterPx,
    rowGapPx,
    axis: { top, bottom },
  };
}
