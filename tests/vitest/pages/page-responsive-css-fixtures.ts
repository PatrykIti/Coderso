/**
 * Shared typed fixture builders for the responsive-CSS suites (TASK-539-06-L01
 * split). Every `page-responsive-css*.test.ts` suite imports from here so each
 * test file stays independently runnable while sharing one builder contract.
 *
 * The builders return RAW (un-normalized) Page V2 shapes; suites that need the
 * stored/write-normalized contract call `normalizePageDocumentV2ForWrite`
 * themselves. This file is test support, not a test file — Vitest never runs
 * it standalone.
 */

import type {
  PageBlockV2,
  PageDocumentV2,
  PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

export const buildSection = (overrides: Partial<PageSectionV2> = {}): PageSectionV2 => ({
  id: "sec_hero",
  type: "hero",
  name: "Hero",
  variant: "default",
  layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
  style: {
    background: "#ffffff",
    backgroundType: "color",
    backgroundImage: null,
    accent: "#0d9488",
    radius: 0,
    shadow: "none",
  },
  spacing: { paddingTop: 64, paddingBottom: 64, paddingLeft: 40, paddingRight: 40, gap: 24 },
  visibility: { visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null },
  responsive: {},
  blocks: [],
  ...overrides,
});

export const buildBlock = (overrides: Partial<PageBlockV2> = {}): PageBlockV2 => ({
  id: "blk_text",
  type: "text",
  props: { text: "Copy", format: "plain", align: "left" },
  visibility: { visible: true },
  responsive: {},
  ...overrides,
});

export const buildDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

/**
 * Attach an arbitrary extra key to a node's responsive style override. Used
 * ONLY by the forbidden-key matrix tests: the dedicated responsive types and
 * write schema reject those keys, so the matrix proves the normalized
 * stored-read path drops them before the builder ever sees them.
 */
export const withResponsiveStyleKey = <T extends PageSectionV2 | PageBlockV2>(
  node: T,
  key: string,
  value: unknown
): T => {
  const responsive = node.responsive as Record<string, { style?: Record<string, unknown> }>;
  const mobileStyle = { ...(responsive.mobile?.style ?? {}), [key]: value };
  return {
    ...node,
    responsive: { ...responsive, mobile: { ...(responsive.mobile ?? {}), style: mobileStyle } },
  } as T;
};

/**
 * The one shared block-frame scope every block rule uses:
 * `:is(primary canonical selector, replica styling-only alias)`. The replica
 * alias arm exists ONLY so marquee replica copies inherit the same styling;
 * it never becomes a DOM/selection hook.
 */
export const frameScope = (id: string): string =>
  `:is([data-block-id="${id}"],[data-page-marquee-replica-block-style-scope="${id}"])`;
/** Inner visual-element scope (button anchor / image img). */
export const elementScope = (id: string): string =>
  `${frameScope(id)} [data-page-block-element="true"]`;
/** Painted text-node scope. */
export const textScope = (id: string): string => `${frameScope(id)} [data-page-block-text="true"]`;
