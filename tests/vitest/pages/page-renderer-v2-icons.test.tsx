import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  normalizePageDocumentV2ForWrite,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  PageDocumentRender,
  PageSectionContent,
} from "../../../core/services/pages/pageRendererV2";

import { PAGE_EFFECTS_RUNTIME_SOURCE } from "../../../core/services/pages/pageEffectsRuntime";

import {
  animatedIconGlyphs,
  AnimatedIcon,
  ANIMATED_ICON_KEYFRAMES_CSS,
} from "../../../core/services/pages/animatedIconGlyphs";

import { animatedIconNames } from "../../../core/services/pages/pageDocumentV2";

import {
  SVG_SAFE_TREE_MAX_DEPTH,
  SVG_SAFE_TREE_MAX_NODES,
  SVG_SAFE_TREE_MAX_TEXT_CHARS,
  buildSafeSvgTree,
} from "../../../core/services/pages/svgSafeTree";

const createDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

const countMarkup = (markup: string, needle: string) => markup.split(needle).length - 1;

const renderIconSection = (
  props: Record<string, unknown>,
  mutate?: (block: PageBlockV2) => void
) => {
  const block = createPageBlockV2("icon", { id: "blk-icon", props });
  mutate?.(block);
  return renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-icon",
        variant: "centered",
        blocks: [block],
      })}
    />
  );
};

test("animated-icon glyph map keys === animatedIconNames", () => {
  expect(Object.keys(animatedIconGlyphs).sort()).toEqual([...animatedIconNames].sort());
});

test("ANIMATED_ICON_KEYFRAMES_CSS is guarded by prefers-reduced-motion: no-preference", () => {
  expect(ANIMATED_ICON_KEYFRAMES_CSS).toContain("@media (prefers-reduced-motion: no-preference)");
  for (const keyframe of ["ci-spin", "ci-pulse", "ci-bounce", "ci-draw"]) {
    expect(ANIMATED_ICON_KEYFRAMES_CSS).toContain(`@keyframes ${keyframe}`);
  }
});

test("icon block renders <svg size> in [data-anim-icon=spin] with --anim-speed + color", () => {
  const html = renderIconSection({
    name: "star",
    animation: "spin",
    size: 64,
    color: "#0ea5e9",
    speed: 1200,
  });
  expect(html).toContain('<span data-anim-icon="spin"');
  expect(html).toContain("--anim-speed:1200ms");
  expect(html).toContain("color:#0ea5e9");
  expect(html).toContain('width="64"');
  expect(html).toContain("lucide-star");
});

test("icon block animation:'none' ⇒ no data-anim-icon attr (static)", () => {
  const html = renderIconSection({
    name: "sparkles",
    animation: "none",
    size: 48,
    color: "var(--primary)",
    speed: 1600,
  });
  // The span carries NO data-anim-icon attribute (the CSS <style> body still
  // references [data-anim-icon="…"] selectors, so scope the assertion to the span).
  expect(html).not.toContain("<span data-anim-icon");
  expect(html).toContain("lucide-sparkles");
});

test("icon block invalid name ⇒ sparkles fallback (render-boundary allowlist)", () => {
  // Inject a raw out-of-allowlist name AFTER normalize to prove the render
  // boundary re-resolves it (never trusts stored data).
  const html = renderIconSection(
    { name: "sparkles", animation: "pulse", size: 48, color: "var(--primary)", speed: 1600 },
    (block) => {
      (block.props as Record<string, unknown>).name = "../../etc/passwd";
    }
  );
  expect(html).toContain("lucide-sparkles");
  expect(html).not.toContain("etc/passwd");
});

test("icon block color re-sanitized at render ⇒ bad color → var(--primary)", () => {
  const html = renderIconSection(
    { name: "star", animation: "spin", size: 48, color: "var(--primary)", speed: 1600 },
    (block) => {
      (block.props as Record<string, unknown>).color = "expression(alert(1))";
    }
  );
  expect(html).not.toContain("expression");
  expect(html).toContain("color:var(--primary)");
});

test("each icon block emits a <style data-anim-icon-css> whose body === ANIMATED_ICON_KEYFRAMES_CSS (idempotent dup copies inert)", () => {
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-icon-multi",
        variant: "centered",
        blocks: [
          createPageBlockV2("icon", {
            id: "blk-icon-a",
            props: { name: "star", animation: "spin", size: 48, color: "#111", speed: 1600 },
          }),
          createPageBlockV2("icon", {
            id: "blk-icon-b",
            props: { name: "heart", animation: "pulse", size: 32, color: "#222", speed: 900 },
          }),
        ],
      })}
    />
  );
  // A style tag rides with EVERY icon block (block-scoped so it is present in the
  // builder canvas which bypasses PageDocumentRender). Duplicate emits are inert:
  // the payload is the static constant, identical for every icon block.
  expect(countMarkup(html, "data-anim-icon-css")).toBe(2);
  // dangerouslySetInnerHTML emits the CSS verbatim (no escaping), so the static
  // constant appears identically once per icon block.
  expect(countMarkup(html, ANIMATED_ICON_KEYFRAMES_CSS)).toBe(2);
});

test("AnimatedIcon component falls back to sparkles for an unknown key", () => {
  const html = renderToStaticMarkup(
    <AnimatedIcon
      name={"bogus" as never}
      animation="none"
      size={48}
      color="var(--primary)"
      speed={1600}
    />
  );
  expect(html).toContain("lucide-sparkles");
});

// ---------------------------------------------------------------------------
// TASK-522-02 — custom-SVG block (sanitized render + draw-in, XSS at render)
// ---------------------------------------------------------------------------

const HOUSE_LINE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor"><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>' +
  '<polyline points="9 21 9 12 15 12 15 21"/></svg>';

const renderCustomSvgSection = (
  props: Record<string, unknown>,
  mutate?: (block: PageBlockV2) => void
) => {
  const block = createPageBlockV2("customSvg", { id: "blk-svg", props });
  mutate?.(block);
  return renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-svg",
        variant: "centered",
        blocks: [block],
      })}
    />
  );
};

const getCustomSvgBoundaryTag = (html: string) =>
  html.match(/<span[^>]*data-custom-svg-boundary="true"[^>]*>/)?.[0] ?? "";

const getCustomSvgRootTag = (html: string) => html.match(/<svg[^>]*>/)?.[0] ?? "";

const getCustomSvgAspectRatio = (html: string) =>
  /(?:^|;)aspect-ratio:([^;"]+)/.exec(getCustomSvgRootTag(html))?.[1] ?? "";

test("customSvg survives the complete write, safe-tree, and React SSR pipeline", () => {
  const rawSvg =
    '<svg class="task538-write-root" style="display:block" x = -500 y\t=\t400 width\n=\n\'320px\' ' +
    'height = "160" transform = \'translate(900 900)\' viewBox = "0 0 32 16" ' +
    "xmlns='http://www.w3.org/2000/svg' xmlns:xlink = \"http://www.w3.org/1999/xlink\">" +
    "<defs><linearGradient id=paint gradientUnits = 'userSpaceOnUse' x1=\"0\" y1 = \"0\" x2='1' y2 = 1>" +
    '<stop offset=0 stop-color = "#112233"/><stop offset = "1" stop-color=\'#445566\'/>' +
    "</linearGradient><path id=shape d='M0 0h4v4z'/></defs>" +
    "<g class='task538-write-nested' style=\"opacity:.5\" transform = 'translate(2 3)' fill = \"url(#paint)\">" +
    "<rect x=1 y = '2' width = \"12\" height=4/><use xlink:href = '#shape' x = \"5\" " +
    "transform='translate(1 1)'/><text x = 2 y='9'>Pipeline &amp; parity &#x26; safe</text>" +
    "</g></svg>";
  const section = createPageSectionV2("hero", {
    id: "sec-task538-full-pipeline",
    name: "Custom SVG pipeline",
    variant: "centered",
  });
  section.blocks = [
    {
      id: "blk-task538-full-pipeline",
      type: "customSvg",
      props: { svg: rawSvg, drawIn: false, label: "Pipeline SVG" },
      visibility: { visible: true },
    },
  ];
  const input = createDocument([section]);

  const written = normalizePageDocumentV2ForWrite(input);
  const storedSvg = String(written.sections[0]!.blocks[0]!.props.svg);
  expect(storedSvg).not.toContain("task538-write-root");
  expect(storedSvg).not.toContain("task538-write-nested");
  expect(storedSvg).not.toMatch(/\b(?:class|style)\s*=/);
  expect(storedSvg).toContain("width\n=\n'320px'");
  expect(storedSvg).toContain("xlink:href = '#shape'");

  const tree = buildSafeSvgTree(storedSvg);
  expect(tree).not.toBeNull();
  if (!tree) throw new Error("missing_task538_safe_svg_tree");
  expect(tree.tag).toBe("svg");
  expect(Object.isFrozen(tree)).toBe(true);
  expect(Object.isFrozen(tree.props)).toBe(true);
  expect(Object.isFrozen(tree.children)).toBe(true);
  expect(tree.props.x).toBe("-500");
  expect(tree.props.y).toBe("400");
  expect(tree.props.width).toBe("320px");
  expect(tree.props.height).toBe("160");
  expect(tree.props.transform).toBe("translate(900 900)");
  expect(tree.props.viewBox).toBe("0 0 32 16");
  expect(JSON.stringify(tree)).not.toMatch(/task538-write-root|task538-write-nested|class|style/);

  const html = renderToStaticMarkup(<PageDocumentRender document={written} />);
  const boundary = getCustomSvgBoundaryTag(html);
  const root = getCustomSvgRootTag(html);
  expect(boundary).toContain(
    'style="display:block;inline-size:100%;max-inline-size:100%;max-block-size:1024px;overflow:hidden;contain:layout paint;pointer-events:none"'
  );
  expect(root).toContain('width="100%"');
  expect(root).not.toContain(' x="');
  expect(root).not.toContain(' y="');
  expect(root).not.toContain(' height="');
  expect(root).not.toContain(' transform="');
  expect(root).toContain(
    'style="display:block;inline-size:100%;max-inline-size:100%;block-size:auto;max-block-size:1024px;aspect-ratio:2;overflow:hidden;pointer-events:none"'
  );
  expect(html).toContain("<defs>");
  const gradient = html.match(/<linearGradient[^>]*>/)?.[0] ?? "";
  expect(gradient).toContain('id="paint"');
  expect(gradient).toContain('gradientUnits="userSpaceOnUse"');
  expect(html).toContain('fill="url(#paint)"');
  expect(html).toContain('transform="translate(2 3)"');
  expect(html).toContain('xlink:href="#shape"');
  expect(html).toContain('transform="translate(1 1)"');
  expect(html).toContain('<text x="2" y="9">Pipeline &amp; parity &amp; safe</text>');
  expect(html).not.toContain("&amp;amp;");
  expect(html).not.toContain("task538-write-root");
  expect(html).not.toContain("task538-write-nested");
});

test("customSvg block renders the sanitized inline <svg> + <path>", () => {
  const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG, label: "House" });
  expect(html).toContain("<svg");
  expect(html).toContain("<path");
  expect(html).toContain('role="img"');
  expect(html).toContain('aria-label="House"');
  expect(html).toContain('data-custom-svg-boundary="true"');
});

test("customSvg keeps unlabeled output hidden from accessibility while preserving the labeled role", () => {
  const unlabeled = getCustomSvgBoundaryTag(renderCustomSvgSection({ svg: HOUSE_LINE_SVG }));
  expect(unlabeled).toContain('role="img"');
  expect(unlabeled).toContain('aria-hidden="true"');
  expect(unlabeled).not.toContain("aria-label=");

  const labeled = getCustomSvgBoundaryTag(
    renderCustomSvgSection({ svg: HOUSE_LINE_SVG, label: "House & garden" })
  );
  expect(labeled).toContain('role="img"');
  expect(labeled).toContain('aria-label="House &amp; garden"');
  expect(labeled).not.toContain("aria-hidden=");
});

test("customSvg wrapper and root enforce the exact trusted containment boundary", () => {
  const html = renderCustomSvgSection({
    svg:
      '<svg x="-9000" y="7000" width="160px" height="80" transform="translate(999 999)" ' +
      'viewBox="0 0 16 8" preserveAspectRatio="xMidYMid meet">' +
      '<g transform="translate(2 3)"><rect x="1" y="2" width="12" height="4"/>' +
      '<svg x="4" y="5" width="6" height="7" viewBox="0 0 6 7"><path d="M0 0"/></svg>' +
      "</g></svg>",
  });
  const boundary = getCustomSvgBoundaryTag(html);
  const root = getCustomSvgRootTag(html);
  const group = html.match(/<g[^>]*>/)?.[0] ?? "";
  const rect = html.match(/<rect[^>]*>/)?.[0] ?? "";
  const nestedSvg = Array.from(html.matchAll(/<svg[^>]*>/g), (match) => match[0])[1] ?? "";

  expect(boundary).toContain("display:block");
  expect(boundary).toContain("inline-size:100%");
  expect(boundary).toContain("max-inline-size:100%");
  expect(boundary).toContain("max-block-size:1024px");
  expect(boundary).toContain("overflow:hidden");
  expect(boundary).toContain("contain:layout paint");
  expect(boundary).toContain("pointer-events:none");

  expect(root).toContain('width="100%"');
  expect(root).toContain('viewBox="0 0 16 8"');
  expect(root).toContain('preserveAspectRatio="xMidYMid meet"');
  expect(root).not.toContain(' x="');
  expect(root).not.toContain(' y="');
  expect(root).not.toContain(' height="');
  expect(root).not.toContain(' transform="');
  expect(root).toContain("display:block");
  expect(root).toContain("inline-size:100%");
  expect(root).toContain("max-inline-size:100%");
  expect(root).toContain("block-size:auto");
  expect(root).toContain("max-block-size:1024px");
  expect(root).toContain("aspect-ratio:2");
  expect(root).toContain("overflow:hidden");
  expect(root).toContain("pointer-events:none");

  // Root layout authority is removed, while safe descendant drawing geometry remains.
  expect(group).toContain('transform="translate(2 3)"');
  expect(rect).toContain('x="1"');
  expect(rect).toContain('y="2"');
  expect(rect).toContain('width="12"');
  expect(rect).toContain('height="4"');
  expect(nestedSvg).toContain('x="4"');
  expect(nestedSvg).toContain('y="5"');
  expect(nestedSvg).toContain('width="6"');
  expect(nestedSvg).toContain('height="7"');
  expect(nestedSvg).toContain('viewBox="0 0 6 7"');
});

test("customSvg accepts only the exact finite four-number viewBox grammar and clamps its ratio", () => {
  const cases: ReadonlyArray<{ viewBox: string; expected: string }> = [
    { viewBox: "0 0 16 8", expected: "2" },
    { viewBox: " -1e2,\t+2E1 8e2,4e2 ", expected: "2" },
    { viewBox: "0,0,10000,1", expected: "8" },
    { viewBox: "0 0 1 10000", expected: "0.125" },
    { viewBox: "0 0 1e308 1e-308", expected: "8" },
    { viewBox: "0 0 1e-308 1e308", expected: "0.125" },
    { viewBox: "0 0 16 8 1", expected: "1" },
    { viewBox: "0 0 16", expected: "1" },
    { viewBox: "0,,0,16,8", expected: "1" },
    { viewBox: ",0 0 16 8", expected: "1" },
    { viewBox: "0 0 16 8,", expected: "1" },
    { viewBox: "0\u00a00 16 8", expected: "1" },
    { viewBox: "0 0 16px 8", expected: "1" },
    { viewBox: "0 0 16junk 8", expected: "1" },
    { viewBox: "NaN 0 16 8", expected: "1" },
    { viewBox: "Infinity 0 16 8", expected: "1" },
    { viewBox: "1e309 0 16 8", expected: "1" },
    { viewBox: "0 0 0 8", expected: "1" },
    { viewBox: "0 0 -16 8", expected: "1" },
    { viewBox: "0 0 16 0", expected: "1" },
  ];

  for (const { viewBox, expected } of cases) {
    const html = renderCustomSvgSection({
      svg: `<svg viewBox="${viewBox}"><path d="M0 0"/></svg>`,
    });
    expect(getCustomSvgAspectRatio(html), viewBox).toBe(expected);
    expect(getCustomSvgRootTag(html)).toContain("max-block-size:1024px");
  }
});

test("customSvg derives a ratio from positive finite unitless/px dimensions before stripping them", () => {
  const cases: ReadonlyArray<{
    width?: string;
    height?: string;
    viewBox?: string;
    expected: string;
  }> = [
    { width: "160px", height: "80", expected: "2" },
    { width: "10000", height: "1px", expected: "8" },
    { width: "1px", height: "10000px", expected: "0.125" },
    { width: "300", height: "100", viewBox: "0 0 0 8", expected: "3" },
    { width: "100%", height: "20", expected: "1" },
    { width: "160PX", height: "80", expected: "1" },
    { width: " 160px", height: "80", expected: "1" },
    { width: "Infinity", height: "20", expected: "1" },
    { width: "1e309", height: "20", expected: "1" },
    { width: "0", height: "20", expected: "1" },
    { width: "20", expected: "1" },
    { height: "20px", expected: "1" },
    { width: "20px junk", height: "10", expected: "1" },
  ];

  for (const { width, height, viewBox, expected } of cases) {
    const attrs = [
      width === undefined ? "" : `width="${width}"`,
      height === undefined ? "" : `height="${height}"`,
      viewBox === undefined ? "" : `viewBox="${viewBox}"`,
    ]
      .filter(Boolean)
      .join(" ");
    const html = renderCustomSvgSection({ svg: `<svg ${attrs}><path d="M0 0"/></svg>` });
    const root = getCustomSvgRootTag(html);
    expect(getCustomSvgAspectRatio(html), attrs).toBe(expected);
    expect(root).toContain('width="100%"');
    expect(root).not.toContain(' height="');
    if (width !== undefined && width !== "100%") {
      expect(root).not.toContain(`width="${width}"`);
    }
  }
});

test("customSvg preserves closed semantic React SVG attribute mappings", () => {
  const html = renderCustomSvgSection({
    svg:
      '<svg viewBox="0 0 10 10" role="presentation" aria-hidden="true" ' +
      'xmlns:xlink="http://www.w3.org/1999/xlink">' +
      '<defs><clipPath id="clip"><path id="shape" d="M0 0h10v10z" fill-rule="evenodd"/></clipPath></defs>' +
      '<g clip-path="url(#clip)" stroke-width="2" stroke-linecap="round" font-size="12">' +
      '<use xlink:href="#shape"/></g></svg>',
  });

  expect(html).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
  expect(getCustomSvgRootTag(html)).toContain('role="presentation"');
  expect(getCustomSvgRootTag(html)).toContain('aria-hidden="true"');
  expect(html).toContain('fill-rule="evenodd"');
  expect(html).toContain('clip-path="url(#clip)"');
  expect(html).toContain('stroke-width="2"');
  expect(html).toContain('stroke-linecap="round"');
  expect(html).toContain('font-size="12"');
  expect(html).toContain('xlink:href="#shape"');
});

test("customSvg decodes XML entities once and lets React escape the text exactly once", () => {
  const html = renderCustomSvgSection({
    svg: '<svg viewBox="0 0 20 10"><text>Fish &amp; chips &lt;3 &#x26; tea</text></svg>',
  });
  expect(html).toContain("<text>Fish &amp; chips &lt;3 &amp; tea</text>");
  expect(html).not.toContain("&amp;amp;");
  expect(html).not.toContain("&amp;lt;");
});

test("customSvg drawIn:true adds data-draw-in + --draw-speed + pathLength=1 (length-independent)", () => {
  const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG, drawIn: true, drawSpeed: 2400 });
  expect(html).toContain("data-draw-in");
  expect(html).toContain("--draw-speed:2400ms");
  // Every stroke shape stamped with pathLength="1" so the fixed-dash CSS completes.
  expect(html).toContain('pathLength="1"');
});

test("customSvg drawIn stamps pathLength=1 even on a SHORT path (length-independent draw)", () => {
  const html = renderCustomSvgSection({
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><path d="M0 0h1"/></svg>',
    drawIn: true,
    drawSpeed: 800,
  });
  expect(html).toContain('pathLength="1"');
  expect(html).toContain("--draw-speed:800ms");
});

test("customSvg drawIn stamps only absent pathLength values without mutating the frozen safe tree", () => {
  const svg =
    '<svg viewBox="0 0 10 10"><path d="M0 0" pathLength="7"/><line x1="0" y1="0" x2="1" y2="1"/>' +
    '<polyline points="0,0 1,1"/><rect width="1" height="1"/></svg>';
  const tree = buildSafeSvgTree(svg);
  expect(tree).not.toBeNull();
  expect(Object.isFrozen(tree)).toBe(true);
  const before = JSON.stringify(tree);

  const drawn = renderCustomSvgSection({ svg, drawIn: true });
  expect(drawn).toContain('pathLength="7"');
  expect(countMarkup(drawn, 'pathLength="1"')).toBe(2);
  expect(countMarkup(drawn, "pathLength=")).toBe(3);
  expect(drawn.match(/<rect[^>]*>/)?.[0] ?? "").not.toContain("pathLength");
  expect(JSON.stringify(tree)).toBe(before);

  const staticHtml = renderCustomSvgSection({ svg, drawIn: false });
  expect(countMarkup(staticHtml, "pathLength=")).toBe(1);
});

test("customSvg empty / whitespace svg ⇒ neutral fallback (no <svg>, no crash)", () => {
  for (const svg of ["", "   ", "\n\t"]) {
    const html = renderCustomSvgSection({ svg });
    expect(html).not.toContain("<svg");
    expect(html).toContain("▢");
  }
});

test("customSvg safe-tree node/depth/text cap overflows fail closed to the neutral placeholder", () => {
  const overDepthCap =
    `<svg>${"<g>".repeat(SVG_SAFE_TREE_MAX_DEPTH)}` +
    `${"</g>".repeat(SVG_SAFE_TREE_MAX_DEPTH)}</svg>`;
  const overTextCap = `<svg><text>${"x".repeat(SVG_SAFE_TREE_MAX_TEXT_CHARS + 1)}</text></svg>`;
  const overCaps = [
    `<svg>${"<g/>".repeat(SVG_SAFE_TREE_MAX_NODES)}</svg>`,
    overDepthCap,
    overTextCap,
  ];

  for (const svg of overCaps) {
    const html = renderCustomSvgSection({ svg });
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("data-custom-svg-boundary");
    expect(html).toContain("▢");
  }
});

test("customSvg strips root and descendant class/style while retaining trusted renderer styles", () => {
  const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG }, (block) => {
    (block.props as Record<string, unknown>).svg =
      '<svg class="task538-render-root-marker" style="--task538-render-root-style:1" pointer-events="auto" viewBox="0 0 10 10">' +
      '<g class="task538-render-nested-marker" style="--task538-render-nested-style:1" pointer-events="auto">' +
      '<path d="M0 0h1"/></g></svg>';
  });
  const root = getCustomSvgRootTag(html);
  const group = html.match(/<g[^>]*>/)?.[0] ?? "";
  expect(root).not.toContain("class=");
  expect(group).not.toContain("class=");
  expect(html).not.toContain("task538-render-root-marker");
  expect(html).not.toContain("task538-render-nested-marker");
  expect(html).not.toContain("--task538-render-root-style");
  expect(html).not.toContain("--task538-render-nested-style");
  expect(html).not.toContain('pointer-events="auto"');
  expect(getCustomSvgBoundaryTag(html)).toContain("contain:layout paint");
  expect(root).toContain("pointer-events:none");
});

test("customSvg author data has no HTML sink", () => {
  const source = readFileSync("core/services/pages/pageRendererV2.tsx", "utf8");
  const customSvgStart = source.indexOf('case "customSvg"');
  const customSvgEnd = source.indexOf('case "switcher"', customSvgStart);
  const customSvgBranch = source.slice(customSvgStart, customSvgEnd);

  expect(customSvgStart).toBeGreaterThan(-1);
  expect(customSvgEnd).toBeGreaterThan(customSvgStart);
  expect(customSvgBranch).toContain("buildSafeSvgTree");
  expect(customSvgBranch).toContain("renderSafeSvgNode");
  expect(customSvgBranch).not.toMatch(
    /dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|\.replace\s*\(/
  );
});

test("trusted static renderer DSIH sites remain separate from the customSvg author branch", () => {
  const source = readFileSync("core/services/pages/pageRendererV2.tsx", "utf8");
  // Trusted, module-owned static CSS/runtime constants retain their distinct sinks.
  expect(source).toMatch(/dangerouslySetInnerHTML=\{\{ __html: ANIMATED_ICON_KEYFRAMES_CSS \}\}/);
  expect(source).toMatch(/dangerouslySetInnerHTML=\{\{ __html: PAGE_EFFECTS_RUNTIME_SOURCE \}\}/);
});

// XSS corpus asserted at the RENDER boundary — the values are injected AFTER
// write-normalization (via `mutate`) to prove the render-time re-sanitize catches
// a value that somehow bypassed write validation (older row, direct DB edit).
const CUSTOM_SVG_XSS_VECTORS: readonly string[] = [
  "<script>alert(1)</script>",
  '<svg onload="alert(1)"><path d="M0 0h1"/></svg>',
  '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)<\/script></body></foreignObject></svg>',
  '<svg><a href="javascript:alert(1)"><path d="M0 0h1"/></a></svg>',
  '<svg><use href="http://evil#x"/></svg>',
  "<svg><use href=http://evil#x/></svg>",
  "<svg><use href=//evil/x#y/></svg>",
  "<svg><image href=data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=/></svg>",
  "<svg><!--<script>--><script>alert(1)<\/script></svg>",
  "<svg><![CDATA[<script>alert(1)</script>]]></svg>",
  '<svg><path onclick="alert(1)"/></svg>',
];

test("customSvg RE-sanitizes at render ⇒ XSS vectors neutralized (defence in depth)", () => {
  const dangerous = [
    "<script",
    "onload=",
    "onclick=",
    "javascript:",
    "<foreignObject",
    "<image",
    "http://evil",
    "//evil",
    "data:image/svg",
  ];
  for (const svg of CUSTOM_SVG_XSS_VECTORS) {
    const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG }, (block) => {
      (block.props as Record<string, unknown>).svg = svg;
    });
    for (const token of dangerous) {
      expect(html.includes(token), `vector "${svg}" leaked "${token}"`).toBe(false);
    }
  }
});

test("customSvg render is isomorphic — no Node Buffer ReferenceError (browser builder canvas)", () => {
  const original = (globalThis as { Buffer?: unknown }).Buffer;
  delete (globalThis as { Buffer?: unknown }).Buffer;
  try {
    const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG });
    expect(html).toContain("<svg");
  } finally {
    (globalThis as { Buffer?: unknown }).Buffer = original;
  }
});

// ── TASK-522-03-L02 — floating-drift decoration + block-frame composition seam ──
