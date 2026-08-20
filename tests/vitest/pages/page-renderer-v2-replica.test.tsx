// TASK-539-05-L01 — marquee replica identity render stamps (contract §408-421).
// The approved seamless replica's styling frames swap `data-block-id` for the
// block style-scope alias and the tilt/layer wrapper swaps `data-tilt-parent-for`
// for the tilt-layer style-scope alias; primary / seamless:false / unsafe
// fallback output emits NEITHER alias, and replica descendants never carry the
// grid hook/span. Focused renderer companion to the
// `page-renderer-replica-identity.test.ts` direct-owner suite.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
} from "../../../core/services/pages/pageDocumentV2";
import { PageSectionContent } from "../../../core/services/pages/pageRendererV2";
import { countMarkup } from "./pageRendererV2TestFixtures";

const marqueeGroup = (
  marquee: NonNullable<NonNullable<PageBlockV2["style"]>["marquee"]>
): PageBlockV2 =>
  createPageBlockV2("group", {
    id: "blk-marquee",
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee },
    slots: {
      children: [
        createPageBlockV2("text", {
          id: "blk-m1",
          props: { text: "One", format: "plain", align: "left" },
        }),
        createPageBlockV2("text", {
          id: "blk-m2",
          props: { text: "Two", format: "plain", align: "left" },
        }),
      ],
    },
  });

const tiltLayerBlock = (): PageBlockV2 =>
  createPageBlockV2("heading", {
    id: "blk-comp",
    props: { text: "Composed", level: "h2", align: "left" },
    style: {
      tilt: "subtle",
      layer: { x: 8, y: 12, z: 3, anchor: "bottom-right" },
    },
  });

test("approved replica segment frames carry the block style-scope alias, never data-block-id", () => {
  const group = marqueeGroup({ speed: 18, direction: "left", seamless: true });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-mq-scope", blocks: [group] })}
    />
  );
  // Each block renders once as the canonical [data-block-id] frame (primary
  // segment) and once as the styling frame carrying the scope alias (replica).
  expect(countMarkup(html, 'data-page-marquee-replica-block-style-scope="blk-m1"')).toBe(1);
  expect(countMarkup(html, 'data-page-marquee-replica-block-style-scope="blk-m2"')).toBe(1);
  expect(countMarkup(html, 'data-block-id="blk-m1"')).toBe(1);
  expect(countMarkup(html, 'data-block-id="blk-m2"')).toBe(1);
  // The alias value is the CANONICAL original block id (never namespaced).
  expect(html).not.toContain('data-page-marquee-replica-block-style-scope="cx-mrq-');
});

test("replica tilt/layer wrapper swaps data-tilt-parent-for for the tilt-layer style-scope alias", () => {
  const group = createPageBlockV2("group", {
    id: "blk-marquee-tl",
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee: { speed: 18, direction: "left", seamless: true } },
    slots: { children: [tiltLayerBlock()] },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-mq-tl", blocks: [group] })}
    />
  );
  // The primary wrapper keeps the per-device layer hook; the replica wrapper
  // carries the style-scope alias (same canonical id value) instead.
  expect(countMarkup(html, 'data-tilt-parent-for="blk-comp"')).toBe(1);
  expect(countMarkup(html, 'data-page-marquee-replica-tilt-layer-style-scope="blk-comp"')).toBe(1);
  // No wrapper carries both hooks, and no new wrapper is introduced.
  expect(html).not.toMatch(
    /data-tilt-parent-for="blk-comp"[^>]*data-page-marquee-replica-tilt-layer-style-scope=/
  );
  expect(countMarkup(html, 'data-tilt-parent=""')).toBe(2);
});

test("zero replica alias leakage on canonical, non-seamless, and unsafe fallback output", () => {
  const noAlias = (html: string): void => {
    expect(html).not.toContain("data-page-marquee-replica-block-style-scope");
    expect(html).not.toContain("data-page-marquee-replica-tilt-layer-style-scope");
    expect(html).not.toContain("data-page-marquee-replica");
  };
  // Canonical: plain group flow, no marquee at all.
  noAlias(
    renderToStaticMarkup(
      <PageSectionContent
        section={createPageSectionV2("content", {
          id: "sec-canon",
          blocks: [
            createPageBlockV2("group", {
              id: "blk-plain",
              props: { direction: "row", wrap: false, gap: 16 },
              slots: {
                children: [
                  createPageBlockV2("text", {
                    id: "blk-p1",
                    props: { text: "Flow", format: "plain", align: "left" },
                  }),
                ],
              },
            }),
          ],
        })}
      />
    )
  );
  // seamless:false → one canonical segment, no replica surface.
  const nonSeamless = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-ns",
        blocks: [marqueeGroup({ speed: 18, direction: "right", seamless: false })],
      })}
    />
  );
  noAlias(nonSeamless);
  expect(countMarkup(nonSeamless, "cx-marquee-segment")).toBe(1);
  // Unsafe subtree (live form block) → one-segment fail-closed fallback with
  // no replica surface (a nested authored marquee would clone its own safe
  // replica, polluting the leakage assertion).
  const unsafeGroup = createPageBlockV2("group", {
    id: "blk-marquee-unsafe",
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee: { speed: 18, direction: "left", seamless: true } },
    slots: {
      children: [
        createPageBlockV2("form", {
          id: "blk-form",
          props: { formId: null, title: "" },
        }),
      ],
    },
  });
  const unsafe = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-unsafe", blocks: [unsafeGroup] })}
    />
  );
  noAlias(unsafe);
  expect(countMarkup(unsafe, "cx-marquee-segment")).toBe(1);
});

test("replica descendants never carry the grid hook/span (placement none)", () => {
  const group = marqueeGroup({ speed: 18, direction: "left", seamless: true });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-mq-grid", blocks: [group] })}
    />
  );
  // Both segments' frames are nested descendants: no grid item hook anywhere.
  expect(html).not.toContain("data-page-block-grid-item");
  expect(countMarkup(html, "cx-marquee-segment")).toBe(2);
});
