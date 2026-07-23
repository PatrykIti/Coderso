import { describe, expect, test } from "vitest";

import { sanitizeSvg } from "../../../core/services/pages/svgSanitizer";
import {
  SAFE_SVG_SOURCE_ATTRS,
  SAFE_SVG_TAGS,
} from "../../../core/services/pages/svgSanitizerPolicy";
import {
  SAFE_SVG_SOURCE_TO_REACT_PROP,
  SVG_SAFE_TREE_MAX_DEPTH,
  SVG_SAFE_TREE_MAX_NODES,
  SVG_SAFE_TREE_MAX_TEXT_CHARS,
  buildSafeSvgTree,
  type SafeReactSvgProp,
  type SafeSvgElement,
  type SafeSvgNode,
} from "../../../core/services/pages/svgSafeTree";

const EXPECTED_REACT_PROPS: readonly SafeReactSvgProp[] = [
  "d",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "points",
  "width",
  "height",
  "pathLength",
  "viewBox",
  "preserveAspectRatio",
  "transform",
  "gradientUnits",
  "gradientTransform",
  "patternUnits",
  "clipPathUnits",
  "maskUnits",
  "offset",
  "spreadMethod",
  "markerWidth",
  "markerHeight",
  "refX",
  "refY",
  "orient",
  "result",
  "in",
  "in2",
  "stdDeviation",
  "dx",
  "dy",
  "values",
  "mode",
  "operator",
  "type",
  "fill",
  "stroke",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "opacity",
  "fillOpacity",
  "strokeOpacity",
  "fillRule",
  "clipRule",
  "stopColor",
  "stopOpacity",
  "color",
  "id",
  "role",
  "aria-hidden",
  "href",
  "xlinkHref",
  "xmlns",
  "xmlnsXlink",
  "textAnchor",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "letterSpacing",
  "clipPath",
  "mask",
  "filter",
];

function elementChildren(element: SafeSvgElement): SafeSvgElement[] {
  return element.children.filter((child): child is SafeSvgElement => child.kind === "element");
}

function collectElements(node: SafeSvgNode): SafeSvgElement[] {
  if (node.kind === "text") return [];
  return [node, ...node.children.flatMap(collectElements)];
}

function expectDeeplyFrozen(node: SafeSvgNode): void {
  expect(Object.isFrozen(node)).toBe(true);
  if (node.kind === "text") return;
  expect(Object.isFrozen(node.props)).toBe(true);
  expect(Object.isFrozen(node.children)).toBe(true);
  for (const child of node.children) expectDeeplyFrozen(child);
}

function nestedSvgAtDepth(depth: number): string {
  const nestedCount = depth - 1;
  return `<svg>${"<g>".repeat(nestedCount)}${"</g>".repeat(nestedCount)}</svg>`;
}

describe("safe SVG source-to-React policy", () => {
  test("maps every source attribute exactly once with no extra key", () => {
    const sourceKeys = Object.keys(SAFE_SVG_SOURCE_TO_REACT_PROP).sort();
    const expectedSourceKeys = [...SAFE_SVG_SOURCE_ATTRS].sort();
    const reactProps = Object.values(SAFE_SVG_SOURCE_TO_REACT_PROP);

    expect(Object.isFrozen(SAFE_SVG_SOURCE_TO_REACT_PROP)).toBe(true);
    expect(sourceKeys).toEqual(expectedSourceKeys);
    expect(reactProps.sort()).toEqual([...EXPECTED_REACT_PROPS].sort());
    expect(new Set(reactProps).size).toBe(SAFE_SVG_SOURCE_ATTRS.length);
    expect(SAFE_SVG_SOURCE_ATTRS).toHaveLength(72);
  });

  test("uses canonical React names and grants no arbitrary prop authority", () => {
    expect(SAFE_SVG_SOURCE_TO_REACT_PROP).toMatchObject({
      viewBox: "viewBox",
      "stroke-width": "strokeWidth",
      "fill-rule": "fillRule",
      "clip-path": "clipPath",
      "xlink:href": "xlinkHref",
      "xmlns:xlink": "xmlnsXlink",
      "aria-hidden": "aria-hidden",
    });
    expect(Object.hasOwn(SAFE_SVG_SOURCE_TO_REACT_PROP, "class")).toBe(false);
    expect(Object.hasOwn(SAFE_SVG_SOURCE_TO_REACT_PROP, "style")).toBe(false);
    expect(Object.hasOwn(SAFE_SVG_SOURCE_TO_REACT_PROP, "onclick")).toBe(false);
    expect(Object.hasOwn(SAFE_SVG_SOURCE_TO_REACT_PROP, "unknown")).toBe(false);
  });
});

describe("buildSafeSvgTree — closed structure and sparse props", () => {
  test("builds nested defs, gradients, use, and text as deeply frozen plain data", () => {
    const tree = buildSafeSvgTree(
      [
        '<svg viewBox="0 0 20 10" xmlns="http://www.w3.org/2000/svg">',
        "<defs>",
        '<linearGradient id="paint" x1="0" y1="0" x2="1" y2="1">',
        '<stop offset="0" stop-color="#fff"/>',
        '<stop offset="1" stop-color="#000"/>',
        "</linearGradient>",
        '<symbol id="glyph"><path d="M0 0 L1 1"/></symbol>',
        "</defs>",
        '<use href="#glyph" fill="url(#paint)"/>',
        '<text text-anchor="middle">Hello <tspan font-weight="700">SVG</tspan></text>',
        "</svg>",
      ].join("")
    );

    expect(tree).not.toBeNull();
    expect(tree).toMatchObject({
      kind: "element",
      tag: "svg",
      props: { viewBox: "0 0 20 10", xmlns: "http://www.w3.org/2000/svg" },
    });
    expect(collectElements(tree!).map((element) => element.tag)).toEqual([
      "svg",
      "defs",
      "linearGradient",
      "stop",
      "stop",
      "symbol",
      "path",
      "use",
      "text",
      "tspan",
    ]);
    expect(collectElements(tree!).find((element) => element.tag === "use")?.props).toEqual({
      href: "#glyph",
      fill: "url(#paint)",
    });
    expectDeeplyFrozen(tree!);
  });

  test("accepts a self-closing root and self-closing shapes", () => {
    expect(buildSafeSvgTree("<svg/>")).toEqual({
      kind: "element",
      tag: "svg",
      props: {},
      children: [],
    });
    const tree = buildSafeSvgTree('<svg><circle cx="5" cy="5" r="4"/><path d="M0 0"/></svg>');
    expect(elementChildren(tree!)).toHaveLength(2);
  });

  test("keeps minimal path props sparse", () => {
    const tree = buildSafeSvgTree('<svg><path d="M0 0 L1 1"/></svg>');
    const path = elementChildren(tree!)[0]!;
    expect(path.props).toEqual({ d: "M0 0 L1 1" });
    expect(Object.keys(path.props)).toEqual(["d"]);
    expect(path.props.fill).toBeUndefined();
    expect(path.props.pathLength).toBeUndefined();
    expect(Object.hasOwn(path.props, "className")).toBe(false);
  });

  test("parses bare, single-quoted, and double-quoted values with producer whitespace", () => {
    const tree = buildSafeSvgTree(
      '<svg width\u00a0=\u00a0"10"><path fill=red stroke=\'#fff\' stroke-width = "2"/></svg>'
    );
    expect(tree?.props).toEqual({ width: "10" });
    expect(elementChildren(tree!)[0]?.props).toEqual({
      fill: "red",
      stroke: "#fff",
      strokeWidth: "2",
    });
  });

  test("keeps quoted greater-than and slash characters inside a complete value", () => {
    const tree = buildSafeSvgTree('<svg id="root>a/b"><path d="M0 0 L1/2 3"/></svg>');
    expect(tree?.props.id).toBe("root>a/b");
    expect(elementChildren(tree!)[0]?.props.d).toBe("M0 0 L1/2 3");
  });

  test("is deterministic for raw and two-pass sanitizer output", () => {
    const raw = '<SVG><G transform="translate(1 2)"><PATH d="M0 0" fill=#fff/></G></SVG>';
    const clean = sanitizeSvg(raw);
    expect(buildSafeSvgTree(raw)).toEqual(buildSafeSvgTree(clean));
    expect(buildSafeSvgTree(clean)).toEqual(buildSafeSvgTree(sanitizeSvg(clean)));
    expect(buildSafeSvgTree(raw)).toEqual(buildSafeSvgTree(raw));
  });

  test("cannot return a caller-selected tag outside the closed policy", () => {
    const tree = buildSafeSvgTree('<svg><arbitrary><path d="M0 0"/></arbitrary></svg>');
    expect(tree).not.toBeNull();
    const tags = collectElements(tree!).map((element) => element.tag);
    expect(tags).toEqual(["svg", "path"]);
    expect(tags.every((tag) => SAFE_SVG_TAGS.includes(tag))).toBe(true);
  });
});

describe("buildSafeSvgTree — strict parsing and security rechecks", () => {
  test.each([
    ["mismatched close", "<svg><g></svg>"],
    ["unexpected close", "<svg><g></g></g></svg>"],
    ["two roots", "<svg></svg><svg></svg>"],
    ["malformed quote", '<svg><rect width="1></rect></svg>'],
    ["literal less-than in quoted attr", '<svg><path d="M0 < 1"/></svg>'],
    ["duplicate attribute", '<svg><path fill="red" fill="blue"/></svg>'],
  ])("rejects %s without recovery", (_name, source) => {
    expect(buildSafeSvgTree(source)).toBeNull();
  });

  test("drops valueless and unknown attribute gaps only through the sanitizer boundary", () => {
    const tree = buildSafeSvgTree(
      '<svg><rect fill-rule stray-token width="4" unknown="x" height="3"/></svg>'
    );
    expect(elementChildren(tree!)[0]?.props).toEqual({ width: "4", height: "3" });
  });

  test("accepts the producer-normalized separator between complete attribute tokens", () => {
    const source = '<svg><rect width="1"\u000bheight="2"/></svg>';
    const clean = sanitizeSvg(source);
    expect(clean).toContain('width="1"');
    expect(clean).toContain('height="2"');
    expect(buildSafeSvgTree(clean)).not.toBeNull();
    expect(buildSafeSvgTree(source)).not.toBeNull();
  });

  test("never exposes class, style, event, or unknown props", () => {
    const stripped = buildSafeSvgTree(
      '<svg class="root"><path class="shape" style="fill:red" unknown="x" d="M0 0"/></svg>'
    );
    expect(stripped).not.toBeNull();
    for (const element of collectElements(stripped!)) {
      expect(element.props).not.toHaveProperty("class");
      expect(element.props).not.toHaveProperty("className");
      expect(element.props).not.toHaveProperty("style");
      expect(element.props).not.toHaveProperty("unknown");
    }
    expect(buildSafeSvgTree('<svg><path onclick="alert(1)"/></svg>')).toBeNull();
  });

  test("allows local refs and rejects direct, encoded, and encoded-function remote refs", () => {
    expect(
      buildSafeSvgTree(
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use href="#a" xlink:href="#b" fill="url(#paint)"/></svg>'
      )
    ).not.toBeNull();
    expect(buildSafeSvgTree('<svg><use href="https://evil.test/#a"/></svg>')).toBeNull();
    expect(buildSafeSvgTree('<svg><use href="&#104;ttps://evil.test/#a"/></svg>')).toBeNull();
    expect(buildSafeSvgTree('<svg><path fill="&#x75;rl(https://evil.test/a)"/></svg>')).toBeNull();
    expect(buildSafeSvgTree('<svg><path fill="&#x75;rl(#paint)"/></svg>')).not.toBeNull();
    expect(
      buildSafeSvgTree("<svg><path fill=\"url(\u00a0'#paint'\u00a0)\"/></svg>")
    ).not.toBeNull();
  });

  test("rejects CSS escape syntax in URL-capable presentation values after decoding", () => {
    expect(buildSafeSvgTree('<svg><path fill="\\75 rl(#paint)"/></svg>')).toBeNull();
    expect(buildSafeSvgTree('<svg><path fill="&#92;75 rl(#paint)"/></svg>')).toBeNull();
  });

  test("retains fixed namespace membership for either namespace attribute", () => {
    expect(
      buildSafeSvgTree(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"/>'
      )
    ).not.toBeNull();
    expect(buildSafeSvgTree('<svg xmlns="http://www.w3.org/1999/xlink"/>')).not.toBeNull();
    expect(buildSafeSvgTree('<svg xmlns:xlink="http://www.w3.org/2000/svg"/>')).not.toBeNull();
    expect(buildSafeSvgTree('<svg xmlns="https://example.test/ns"/>')).toBeNull();
  });
});

describe("buildSafeSvgTree — closed entity and text contract", () => {
  test("decodes XML entities once and preserves plain text nodes", () => {
    const tree = buildSafeSvgTree(
      "<svg><text>&amp;lt;|&lt;|&gt;|&quot;|&apos;|&#65;|&#x1F600;</text></svg>"
    );
    const text = elementChildren(tree!)[0]?.children[0];
    expect(text).toEqual({ kind: "text", value: "&lt;|<|>|\"|'|A|😀" });
    expect(buildSafeSvgTree(sanitizeSvg("<svg><text>&amp;lt;</text></svg>"))).toEqual(
      buildSafeSvgTree("<svg><text>&amp;lt;</text></svg>")
    );
  });

  test.each([
    ["unknown named", "&nbsp;"],
    ["missing semicolon", "&amp"],
    ["empty decimal", "&#;"],
    ["empty hexadecimal", "&#x;"],
    ["uppercase hexadecimal marker", "&#X41;"],
    ["NUL", "&#0;"],
    ["control", "&#1;"],
    ["DEL", "&#127;"],
    ["surrogate", "&#xD800;"],
    ["non-XML scalar", "&#xFFFE;"],
    ["over Unicode max", "&#x110000;"],
  ])("rejects %s entity", (_name, entity) => {
    expect(buildSafeSvgTree(`<svg><text>${entity}</text></svg>`)).toBeNull();
  });

  test("rejects malformed entities and controls in attributes too", () => {
    expect(buildSafeSvgTree('<svg><path fill="&unknown;"/></svg>')).toBeNull();
    expect(buildSafeSvgTree('<svg><path id="a\u0001b"/></svg>')).toBeNull();
    expect(buildSafeSvgTree('<svg><path id="&#92;escaped"/></svg>')).toBeNull();
  });
});

describe("buildSafeSvgTree — exact resource limits", () => {
  test("accepts exactly the node cap and rejects one element over", () => {
    const atLimit = `<svg>${"<g/>".repeat(SVG_SAFE_TREE_MAX_NODES - 1)}</svg>`;
    const overLimit = `<svg>${"<g/>".repeat(SVG_SAFE_TREE_MAX_NODES)}</svg>`;
    expect(buildSafeSvgTree(atLimit)).not.toBeNull();
    expect(buildSafeSvgTree(overLimit)).toBeNull();
  });

  test("counts the root as depth one at the exact depth boundary", () => {
    expect(buildSafeSvgTree(nestedSvgAtDepth(SVG_SAFE_TREE_MAX_DEPTH))).not.toBeNull();
    expect(buildSafeSvgTree(nestedSvgAtDepth(SVG_SAFE_TREE_MAX_DEPTH + 1))).toBeNull();
  });

  test("accepts exactly the decoded text cap and rejects one character over", () => {
    expect(
      buildSafeSvgTree(`<svg><text>${"a".repeat(SVG_SAFE_TREE_MAX_TEXT_CHARS)}</text></svg>`)
    ).not.toBeNull();
    expect(
      buildSafeSvgTree(`<svg><text>${"a".repeat(SVG_SAFE_TREE_MAX_TEXT_CHARS + 1)}</text></svg>`)
    ).toBeNull();
  });

  test("counts an astral Unicode scalar as one decoded text character", () => {
    const atLimit = `${"a".repeat(SVG_SAFE_TREE_MAX_TEXT_CHARS - 1)}😀`;
    const overLimit = `${"a".repeat(SVG_SAFE_TREE_MAX_TEXT_CHARS)}😀`;
    expect(buildSafeSvgTree(`<svg><text>${atLimit}</text></svg>`)).not.toBeNull();
    expect(buildSafeSvgTree(`<svg><text>${overLimit}</text></svg>`)).toBeNull();
  });
});
