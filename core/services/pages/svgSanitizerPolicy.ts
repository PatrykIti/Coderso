/**
 * Closed, dependency-free policy shared by SVG sanitization and safe-tree parsing.
 *
 * Exported collections are frozen values. Consumers must use the predicates rather
 * than create local tag, attribute, namespace, or reference mirrors.
 */

export const SAFE_SVG_TAGS = Object.freeze([
  "svg",
  "g",
  "defs",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "use",
  "symbol",
  "title",
  "desc",
  "marker",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feMerge",
  "feMergeNode",
  "feColorMatrix",
  "feBlend",
  "feFlood",
  "feComposite",
] as const);

export type SafeSvgTag = (typeof SAFE_SVG_TAGS)[number];

export const SAFE_SVG_SOURCE_ATTRS = Object.freeze([
  // geometry / structural
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
  // presentation / identity / accessibility
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",
  "clip-rule",
  "stop-color",
  "stop-opacity",
  "color",
  "id",
  "role",
  "aria-hidden",
  // local references and fixed namespaces
  "href",
  "xlink:href",
  "xmlns",
  "xmlns:xlink",
  "text-anchor",
  "font-size",
  "font-family",
  "font-weight",
  "letter-spacing",
  "clip-path",
  "mask",
  "filter",
] as const);

export type SafeSvgSourceAttr = (typeof SAFE_SVG_SOURCE_ATTRS)[number];

export const SAFE_SVG_NAMESPACES = Object.freeze({
  svg: "http://www.w3.org/2000/svg",
  xlink: "http://www.w3.org/1999/xlink",
} as const);

export type SafeSvgNamespace = (typeof SAFE_SVG_NAMESPACES)[keyof typeof SAFE_SVG_NAMESPACES];

export function canonicalizeSafeSvgTag(value: unknown): SafeSvgTag | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return SAFE_SVG_TAGS.find((tag) => tag.toLowerCase() === normalized) ?? null;
}

export function isSafeSvgTag(value: unknown): value is SafeSvgTag {
  return typeof value === "string" && canonicalizeSafeSvgTag(value) === value;
}

export function isSafeSvgSourceAttr(value: unknown): value is SafeSvgSourceAttr {
  return (
    typeof value === "string" && SAFE_SVG_SOURCE_ATTRS.some((attribute) => attribute === value)
  );
}

export function isSafeSvgNamespace(value: unknown): value is SafeSvgNamespace {
  return value === SAFE_SVG_NAMESPACES.svg || value === SAFE_SVG_NAMESPACES.xlink;
}

export function isSafeLocalSvgReference(value: unknown): boolean {
  return typeof value === "string" && value.trim().startsWith("#");
}
