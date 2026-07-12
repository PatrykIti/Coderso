import { CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH } from "../../../core/widgets/core/ctaBanner";

const freezeRows = <const Rows extends readonly Readonly<Record<PropertyKey, unknown>>[]>(
  rows: Rows
): Rows => {
  for (const row of rows) Object.freeze(row);
  return Object.freeze(rows) as Rows;
};

export const CTA_BANNER_SIMPLE_COLOR_FIELDS = Object.freeze([
  "background",
  "text",
  "border",
  "badgeBackground",
  "badgeText",
  "primaryButtonBg",
  "primaryButtonText",
  "primaryButtonBorder",
  "secondaryButtonBg",
  "secondaryButtonText",
  "secondaryButtonBorder",
] as const);

const exactCapTerminal = "linear-gradient(-1.5deg, #abcde, #ABCDEF7)";
export const CTA_BANNER_GRADIENT_EXACT_CAP = `${" ".repeat(
  CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH - exactCapTerminal.length
)}${exactCapTerminal}`;

export const CTA_BANNER_GRADIENT_CONSUMER_CASES = freezeRows([
  {
    id: "clear-sentinel",
    raw: "",
    normalized: undefined,
    schemaAccepted: true,
  },
  {
    id: "zero-hex3",
    raw: "linear-gradient(0deg, #abc, #def)",
    normalized: "linear-gradient(0deg, #abc, #def)",
    schemaAccepted: true,
  },
  {
    id: "negative-hex4-5",
    raw: "linear-gradient(-12deg, #abcd, #ABCDE)",
    normalized: "linear-gradient(-12deg, #abcd, #ABCDE)",
    schemaAccepted: true,
  },
  {
    id: "decimal-hex6-7",
    raw: "linear-gradient(1.25deg, #abcdef, #ABCDEF7)",
    normalized: "linear-gradient(1.25deg, #abcdef, #ABCDEF7)",
    schemaAccepted: true,
  },
  {
    id: "long-angle-hex8",
    raw: "linear-gradient(00000000000000000001deg, #12345678, #87654321)",
    normalized: "linear-gradient(00000000000000000001deg, #12345678, #87654321)",
    schemaAccepted: true,
  },
  {
    id: "ascii-spacing-byte-identity",
    raw: " linear-gradient(45deg , #AbCdE , #1234567 ) ",
    normalized: "linear-gradient(45deg , #AbCdE , #1234567 )",
    previewCss: "linear-gradient(45deg, #AbCdE, #1234567)",
    schemaAccepted: true,
  },
  {
    id: "exact-cap-before-trim",
    raw: CTA_BANNER_GRADIENT_EXACT_CAP,
    normalized: exactCapTerminal,
    schemaAccepted: true,
  },
  {
    id: "cap-plus-one-before-trim",
    raw: ` ${CTA_BANNER_GRADIENT_EXACT_CAP}`,
    normalized: undefined,
    schemaAccepted: false,
  },
  { id: "undefined-omitted", raw: undefined, normalized: undefined, schemaAccepted: true },
  { id: "null", raw: null, normalized: undefined, schemaAccepted: false },
  { id: "number", raw: 1, normalized: undefined, schemaAccepted: false },
  {
    id: "plus-angle",
    raw: "linear-gradient(+1deg, #abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "leading-dot-angle",
    raw: "linear-gradient(.5deg, #abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "trailing-dot-angle",
    raw: "linear-gradient(1.deg, #abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "uppercase-function",
    raw: "Linear-gradient(1deg, #abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "uppercase-unit",
    raw: "linear-gradient(1DEG, #abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "short-stop",
    raw: "linear-gradient(1deg, #ab, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "extra-stop",
    raw: "linear-gradient(1deg, #abc, #def, #fff)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "url-stop",
    raw: "linear-gradient(1deg, url(x), #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "comment",
    raw: "linear-gradient(1deg, #abc/*x*/, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "extra-layer",
    raw: "linear-gradient(1deg, #abc, #def), url(x)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "tab",
    raw: "linear-gradient(1deg,\t#abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "newline",
    raw: "linear-gradient(1deg,\n#abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "c0",
    raw: "linear-gradient(1deg,\u001f#abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "c1",
    raw: "linear-gradient(1deg,\u0085#abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "nbsp",
    raw: "linear-gradient(1deg,\u00a0#abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
  {
    id: "em-space",
    raw: "linear-gradient(1deg,\u2003#abc, #def)",
    normalized: undefined,
    schemaAccepted: false,
  },
] as const);
