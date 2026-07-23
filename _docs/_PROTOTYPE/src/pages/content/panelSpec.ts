import {
  AlignLeft,
  LayoutGrid,
  PaintBucket,
  Sparkles,
  SlidersHorizontal,
  Square,
  Type,
  Frame,
  FileText,
  Search,
  Share2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Static, representative mirror of core/services/pages/pageEditorControlRegistry.ts
 * (~52+ block/section controls after TASK-522..530 added the effect controls;
 * this mockup encodes 56 representative rows across the registry families).
 *
 * This is a MOCKUP spec — the shape intentionally mirrors the real registry
 * (`id` / `target` / `panel` / `responsive`) so the eventual core port is a
 * near 1:1 field map. Nothing here is wired to real data.
 *
 * The restructure splits the overloaded flat `style=31` bucket + the mixed
 * `layout` bucket into eight ICON-DRIVEN categories, and adds a two-tier
 * disclosure model (Essentials → All options).
 */

export type ControlKind =
  | "select"
  | "number"
  | "color"
  | "text"
  | "switch"
  | "segmented"
  | "slider";

export type CategoryId =
  | "layout"
  | "fill"
  | "border"
  | "effects"
  | "type"
  | "spacing"
  | "content"
  | "advanced";

/** Which block/section type(s) a control is relevant for. `"*"` = all. */
export type BlockType = "section" | "heading" | "text" | "button" | "image" | "marquee";

export type ControlSpec = {
  /** Real registry id (e.g. `block.style.radius`). Load-bearing for the core port. */
  id: string;
  label: string;
  /** Restructured category (replaces the flat `panel` field). */
  category: CategoryId;
  /** Original flat panel it lived in — kept so the migration is traceable. */
  legacyPanel: string;
  target: "section" | "block";
  kind: ControlKind;
  /** Per-device override support — mirrors the registry `responsive: boolean`. */
  responsive: boolean;
  /** Types whose ESSENTIALS view surfaces this control. Empty = secondary-only. */
  essentialsFor: BlockType[];
  /** Which types the control applies to at all (drives whole-category hiding). */
  appliesTo: BlockType[];
  /** Sub-group heading inside an "All options" accordion (Effects/Advanced). */
  cluster?: string;
  /** Options for select/segmented kinds. */
  options?: string[];
  /** Placeholder / representative value for the mockup. */
  value?: string;
  unit?: string;
  hint?: string;
  /** Marks a control as new in TASK-522..530 (violet "new" pip in the mockup). */
  isNew?: boolean;
};

export type Category = {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  /** Short summary shown under the rail title. */
  blurb: string;
};

const ALL: BlockType[] = ["section", "heading", "text", "button", "image", "marquee"];
const BLOCKS: BlockType[] = ["heading", "text", "button", "image", "marquee"];

// ── Category taxonomy (the icon-rail vocabulary, shared by block + section) ──
export const CATEGORIES: Category[] = [
  { id: "layout", label: "Layout", icon: LayoutGrid, blurb: "Structure, width & alignment" },
  { id: "fill", label: "Fill", icon: PaintBucket, blurb: "Background, colour & opacity" },
  { id: "border", label: "Border & Shape", icon: Square, blurb: "Radius, border & shadow" },
  { id: "effects", label: "Effects", icon: Sparkles, blurb: "Motion, tilt, hover & scroll" },
  { id: "type", label: "Type", icon: Type, blurb: "Font, size, weight & spacing" },
  { id: "spacing", label: "Spacing", icon: Frame, blurb: "Padding & margin" },
  { id: "content", label: "Content", icon: AlignLeft, blurb: "Text & item behaviour" },
  {
    id: "advanced",
    label: "Advanced",
    icon: SlidersHorizontal,
    blurb: "Position, visibility & responsive",
  },
];

// ── The full control set, real IDs, restructured into categories ─────────────
export const CONTROLS: ControlSpec[] = [
  // LAYOUT (7)
  {
    id: "section.layout.columns",
    label: "Columns",
    category: "layout",
    legacyPanel: "layout",
    target: "section",
    kind: "segmented",
    responsive: true,
    essentialsFor: ["section"],
    appliesTo: ["section"],
    options: ["1", "2", "3", "4"],
    value: "2",
  },
  {
    id: "section.layout.maxWidth",
    label: "Max width",
    category: "layout",
    legacyPanel: "layout",
    target: "section",
    kind: "select",
    responsive: true,
    essentialsFor: ["section"],
    appliesTo: ["section"],
    options: ["Narrow", "Content", "Wide", "Full"],
    value: "Content",
  },
  {
    id: "section.layout.align",
    label: "Align",
    category: "layout",
    legacyPanel: "layout",
    target: "section",
    kind: "segmented",
    responsive: true,
    essentialsFor: ["section"],
    appliesTo: ["section"],
    options: ["Start", "Center", "End"],
    value: "Center",
  },
  {
    id: "section.layout.justify",
    label: "Justify",
    category: "layout",
    legacyPanel: "layout",
    target: "section",
    kind: "segmented",
    responsive: true,
    essentialsFor: [],
    appliesTo: ["section"],
    options: ["Start", "Center", "End", "Between"],
    value: "Start",
  },
  {
    id: "section.layout.stackVertical",
    label: "Stack on mobile",
    category: "layout",
    legacyPanel: "layout",
    target: "section",
    kind: "switch",
    responsive: true,
    essentialsFor: [],
    appliesTo: ["section"],
    value: "On",
  },
  {
    id: "block.style.width",
    label: "Width",
    category: "layout",
    legacyPanel: "layout",
    target: "block",
    kind: "select",
    responsive: true,
    essentialsFor: BLOCKS,
    appliesTo: BLOCKS,
    options: ["Auto", "Fill", "Half", "Custom"],
    value: "Auto",
  },
  {
    id: "block.style.align",
    label: "Block align",
    category: "layout",
    legacyPanel: "layout",
    target: "block",
    kind: "segmented",
    responsive: true,
    essentialsFor: ["image", "button"],
    appliesTo: BLOCKS,
    options: ["Left", "Center", "Right"],
    value: "Left",
  },

  // FILL (12)
  {
    id: "section.style.background",
    label: "Background",
    category: "fill",
    legacyPanel: "background",
    target: "section",
    kind: "color",
    responsive: false,
    essentialsFor: ["section"],
    appliesTo: ["section"],
    value: "#f1ecfe",
  },
  {
    id: "section.style.backgroundType",
    label: "Fill type",
    category: "fill",
    legacyPanel: "background",
    target: "section",
    kind: "segmented",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    options: ["Solid", "Gradient", "Image"],
    value: "Solid",
  },
  {
    id: "section.style.accent",
    label: "Accent colour",
    category: "fill",
    legacyPanel: "background",
    target: "section",
    kind: "color",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    value: "#7c3aed",
  },
  {
    id: "section.style.fullBleed",
    label: "Full-bleed background",
    category: "fill",
    legacyPanel: "style",
    target: "section",
    kind: "switch",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    value: "Off",
    isNew: true,
  },
  {
    id: "block.style.background",
    label: "Background",
    category: "fill",
    legacyPanel: "background",
    target: "block",
    kind: "color",
    responsive: false,
    essentialsFor: ["button", "image"],
    appliesTo: BLOCKS,
    value: "transparent",
  },
  {
    id: "block.style.backgroundType",
    label: "Fill type",
    category: "fill",
    legacyPanel: "background",
    target: "block",
    kind: "segmented",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    options: ["Solid", "Gradient", "Image"],
    value: "Solid",
  },
  {
    id: "block.style.backgroundImage",
    label: "Background image",
    category: "fill",
    legacyPanel: "background",
    target: "block",
    kind: "text",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    value: "Pick image…",
  },
  {
    id: "block.style.textColor",
    label: "Text colour",
    category: "fill",
    legacyPanel: "style",
    target: "block",
    kind: "color",
    responsive: false,
    essentialsFor: ["heading", "text", "button"],
    appliesTo: ["heading", "text", "button"],
    value: "#1a1a2e",
  },
  {
    id: "block.style.opacity",
    label: "Opacity",
    category: "fill",
    legacyPanel: "style",
    target: "block",
    kind: "slider",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    value: "100",
    unit: "%",
  },
  {
    id: "block.surface.tint",
    label: "Surface tint",
    category: "fill",
    legacyPanel: "style",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    options: ["None", "Violet 50", "Slate 100", "Frost"],
    value: "None",
    isNew: true,
  },
  {
    id: "block.surface.preset",
    label: "Surface preset",
    category: "fill",
    legacyPanel: "style",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    options: ["Flat", "Glass", "Elevated", "Outline"],
    value: "Flat",
    isNew: true,
  },
  {
    id: "section.surface.preset",
    label: "Surface preset",
    category: "fill",
    legacyPanel: "style",
    target: "section",
    kind: "select",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    options: ["Flat", "Glass", "Elevated"],
    value: "Flat",
    isNew: true,
  },

  // BORDER & SHAPE (7)
  {
    id: "section.style.radius",
    label: "Corner radius",
    category: "border",
    legacyPanel: "style",
    target: "section",
    kind: "slider",
    responsive: false,
    essentialsFor: ["section"],
    appliesTo: ["section"],
    value: "24",
    unit: "px",
  },
  {
    id: "section.style.shadow",
    label: "Shadow",
    category: "border",
    legacyPanel: "style",
    target: "section",
    kind: "select",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    options: ["None", "Soft", "Card", "Pop"],
    value: "Soft",
  },
  {
    id: "block.style.radius",
    label: "Corner radius",
    category: "border",
    legacyPanel: "style",
    target: "block",
    kind: "slider",
    responsive: false,
    essentialsFor: ["image", "button"],
    appliesTo: BLOCKS,
    value: "16",
    unit: "px",
  },
  {
    id: "block.style.shadow",
    label: "Shadow",
    category: "border",
    legacyPanel: "style",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: ["image", "button"],
    appliesTo: BLOCKS,
    options: ["None", "Soft", "Card", "Pop", "Glow"],
    value: "Soft",
  },
  {
    id: "block.style.borderColor",
    label: "Border colour",
    category: "border",
    legacyPanel: "style",
    target: "block",
    kind: "color",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    value: "#e7e2f3",
  },
  {
    id: "block.style.borderWidth",
    label: "Border width",
    category: "border",
    legacyPanel: "style",
    target: "block",
    kind: "number",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    value: "1",
    unit: "px",
  },
  {
    id: "block.style.borderStyle",
    label: "Border style",
    category: "border",
    legacyPanel: "style",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    options: ["Solid", "Dashed", "Dotted"],
    value: "Solid",
  },

  // EFFECTS (9) — the noisy 522..530 tail, all secondary, clustered
  {
    id: "block.decoration.motion",
    label: "Reveal motion",
    category: "effects",
    legacyPanel: "style",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: BLOCKS,
    appliesTo: BLOCKS,
    cluster: "Reveal on scroll",
    options: ["None", "Fade", "Fade up", "Zoom", "Slide"],
    value: "Fade up",
    isNew: true,
  },
  {
    id: "block.decoration.delay",
    label: "Delay",
    category: "effects",
    legacyPanel: "style",
    target: "block",
    kind: "number",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "Reveal on scroll",
    value: "0",
    unit: "ms",
    isNew: true,
  },
  {
    id: "block.decoration.duration",
    label: "Duration",
    category: "effects",
    legacyPanel: "style",
    target: "block",
    kind: "number",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "Reveal on scroll",
    value: "600",
    unit: "ms",
    isNew: true,
  },
  {
    id: "block.style.revealDelay",
    label: "Stagger step",
    category: "effects",
    legacyPanel: "style",
    target: "block",
    kind: "number",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "Reveal on scroll",
    value: "80",
    unit: "ms",
    isNew: true,
  },
  {
    id: "block.tilt.strength",
    label: "Tilt strength",
    category: "effects",
    legacyPanel: "style",
    target: "block",
    kind: "slider",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "3D tilt",
    value: "0",
    unit: "°",
    isNew: true,
  },
  {
    id: "block.tilt.glare",
    label: "Glare",
    category: "effects",
    legacyPanel: "style",
    target: "block",
    kind: "switch",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "3D tilt",
    value: "Off",
    isNew: true,
  },
  {
    id: "block.hover.effect",
    label: "Hover effect",
    category: "effects",
    legacyPanel: "style",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: ["button", "image"],
    appliesTo: BLOCKS,
    cluster: "Hover",
    options: ["None", "Lift", "Grow", "Glow", "Spotlight"],
    value: "Lift",
    isNew: true,
  },
  {
    id: "section.scrollEffect",
    label: "Scroll effect",
    category: "effects",
    legacyPanel: "style",
    target: "section",
    kind: "select",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    cluster: "Scroll",
    options: ["None", "Parallax", "Sticky", "Reveal"],
    value: "None",
    isNew: true,
  },
  {
    id: "section.parallaxIntensity",
    label: "Parallax intensity",
    category: "effects",
    legacyPanel: "style",
    target: "section",
    kind: "slider",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    cluster: "Scroll",
    value: "20",
    unit: "%",
    isNew: true,
  },

  // TYPE (6)
  {
    id: "block.style.fontFamily",
    label: "Font family",
    category: "type",
    legacyPanel: "typography",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: ["heading", "text", "button"],
    appliesTo: ["heading", "text", "button"],
    options: ["Inter", "Söhne", "Playfair", "Mono"],
    value: "Inter",
  },
  {
    id: "block.style.fontSize",
    label: "Font size",
    category: "type",
    legacyPanel: "typography",
    target: "block",
    kind: "number",
    responsive: true,
    essentialsFor: ["heading", "text", "button"],
    appliesTo: ["heading", "text", "button"],
    value: "32",
    unit: "px",
  },
  {
    id: "block.style.fontWeight",
    label: "Weight",
    category: "type",
    legacyPanel: "typography",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: ["heading", "text", "button"],
    appliesTo: ["heading", "text", "button"],
    options: ["400", "500", "600", "700", "800"],
    value: "600",
  },
  {
    id: "block.style.lineHeight",
    label: "Line height",
    category: "type",
    legacyPanel: "typography",
    target: "block",
    kind: "number",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["heading", "text"],
    value: "1.4",
  },
  {
    id: "block.style.letterSpacing",
    label: "Letter spacing",
    category: "type",
    legacyPanel: "typography",
    target: "block",
    kind: "text",
    responsive: true,
    essentialsFor: [],
    appliesTo: ["heading", "text"],
    value: "0.02em",
  },
  {
    id: "block.style.align.type",
    label: "Text align",
    category: "type",
    legacyPanel: "typography",
    target: "block",
    kind: "segmented",
    responsive: true,
    essentialsFor: ["heading", "text"],
    appliesTo: ["heading", "text"],
    options: ["Left", "Center", "Right", "Justify"],
    value: "Left",
  },

  // SPACING (4) — representative padding/margin
  {
    id: "section.spacing.padding",
    label: "Padding",
    category: "spacing",
    legacyPanel: "spacing",
    target: "section",
    kind: "number",
    responsive: true,
    essentialsFor: ["section"],
    appliesTo: ["section"],
    value: "96",
    unit: "px",
  },
  {
    id: "section.spacing.gap",
    label: "Gap",
    category: "spacing",
    legacyPanel: "spacing",
    target: "section",
    kind: "number",
    responsive: true,
    essentialsFor: [],
    appliesTo: ["section"],
    value: "24",
    unit: "px",
  },
  {
    id: "block.style.padding",
    label: "Padding",
    category: "spacing",
    legacyPanel: "spacing",
    target: "block",
    kind: "number",
    responsive: true,
    essentialsFor: BLOCKS,
    appliesTo: BLOCKS,
    value: "12",
    unit: "px",
  },
  {
    id: "block.style.margin",
    label: "Margin",
    category: "spacing",
    legacyPanel: "spacing",
    target: "block",
    kind: "number",
    responsive: true,
    essentialsFor: [],
    appliesTo: BLOCKS,
    value: "0",
    unit: "px",
  },

  // CONTENT (3) — marquee / list behaviour
  {
    id: "group.marquee.speed",
    label: "Marquee speed",
    category: "content",
    legacyPanel: "content",
    target: "block",
    kind: "slider",
    responsive: false,
    essentialsFor: ["marquee"],
    appliesTo: ["marquee"],
    value: "40",
    unit: "px/s",
  },
  {
    id: "group.marquee.direction",
    label: "Direction",
    category: "content",
    legacyPanel: "content",
    target: "block",
    kind: "segmented",
    responsive: false,
    essentialsFor: ["marquee"],
    appliesTo: ["marquee"],
    options: ["Left", "Right"],
    value: "Left",
  },
  {
    id: "group.marquee.seamless",
    label: "Seamless loop",
    category: "content",
    legacyPanel: "content",
    target: "block",
    kind: "switch",
    responsive: false,
    essentialsFor: ["marquee"],
    appliesTo: ["marquee"],
    value: "On",
  },

  // ADVANCED (5+) — positioning, visibility, responsive
  {
    id: "block.layer.x",
    label: "Offset X",
    category: "advanced",
    legacyPanel: "layout",
    target: "block",
    kind: "number",
    responsive: true,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "Positioning",
    value: "0",
    unit: "px",
  },
  {
    id: "block.layer.y",
    label: "Offset Y",
    category: "advanced",
    legacyPanel: "layout",
    target: "block",
    kind: "number",
    responsive: true,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "Positioning",
    value: "0",
    unit: "px",
  },
  {
    id: "block.layer.z",
    label: "Layer (z-index)",
    category: "advanced",
    legacyPanel: "layout",
    target: "block",
    kind: "number",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "Positioning",
    value: "1",
  },
  {
    id: "block.layer.anchor",
    label: "Anchor",
    category: "advanced",
    legacyPanel: "layout",
    target: "block",
    kind: "select",
    responsive: false,
    essentialsFor: [],
    appliesTo: BLOCKS,
    cluster: "Positioning",
    options: ["Flow", "Top-left", "Center", "Bottom-right"],
    value: "Flow",
  },
  {
    id: "section.composition.mode",
    label: "Composition mode",
    category: "advanced",
    legacyPanel: "layout",
    target: "section",
    kind: "select",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    cluster: "Positioning",
    options: ["Stack", "Overlay", "Grid"],
    value: "Stack",
  },
  {
    id: "section.visibility.visible",
    label: "Visible",
    category: "advanced",
    legacyPanel: "visibility",
    target: "section",
    kind: "switch",
    responsive: true,
    essentialsFor: ["section"],
    appliesTo: ["section"],
    cluster: "Visibility",
    value: "On",
  },
  {
    id: "section.visibility.authOnly",
    label: "Signed-in only",
    category: "advanced",
    legacyPanel: "visibility",
    target: "section",
    kind: "switch",
    responsive: false,
    essentialsFor: [],
    appliesTo: ["section"],
    cluster: "Visibility",
    value: "Off",
  },
  {
    id: "block.visibility.visible",
    label: "Visible",
    category: "advanced",
    legacyPanel: "visibility",
    target: "block",
    kind: "switch",
    responsive: true,
    essentialsFor: BLOCKS,
    appliesTo: BLOCKS,
    cluster: "Visibility",
    value: "On",
  },
];

// ── Per-type Essentials curation (ordered) ───────────────────────────────────
export const ESSENTIALS_ORDER: Record<BlockType, string[]> = {
  section: [
    "section.layout.columns",
    "section.layout.maxWidth",
    "section.layout.align",
    "section.style.background",
    "section.style.radius",
    "section.spacing.padding",
    "section.visibility.visible",
  ],
  heading: [
    "block.style.fontFamily",
    "block.style.fontSize",
    "block.style.fontWeight",
    "block.style.textColor",
    "block.style.align.type",
    "block.decoration.motion",
  ],
  text: [
    "block.style.fontFamily",
    "block.style.fontSize",
    "block.style.fontWeight",
    "block.style.textColor",
    "block.style.align.type",
    "block.decoration.motion",
  ],
  button: [
    "block.style.textColor",
    "block.style.background",
    "block.style.radius",
    "block.hover.effect",
    "block.style.align",
  ],
  image: [
    "block.style.width",
    "block.style.radius",
    "block.style.shadow",
    "block.style.background",
    "block.decoration.motion",
  ],
  marquee: [
    "group.marquee.direction",
    "group.marquee.speed",
    "group.marquee.seamless",
    "block.style.background",
  ],
};

export type SelectableType = {
  type: BlockType;
  label: string;
  target: "section" | "block";
  icon: string; // lucide icon name, resolved in the page
};

export const SELECTABLE: SelectableType[] = [
  { type: "section", label: "Hero section", target: "section", icon: "LayoutGrid" },
  { type: "heading", label: "Heading block", target: "block", icon: "Type" },
  { type: "text", label: "Text block", target: "block", icon: "AlignLeft" },
  { type: "button", label: "Button block", target: "block", icon: "Square" },
  { type: "image", label: "Image block", target: "block", icon: "Image" },
  { type: "marquee", label: "Marquee group", target: "block", icon: "GalleryHorizontalEnd" },
];

export const DEVICES = [
  { id: "desktop", label: "Desktop", icon: "Monitor" },
  { id: "tablet", label: "Tablet", icon: "Tablet" },
  { id: "mobile", label: "Mobile", icon: "Smartphone" },
] as const;
export type DeviceId = (typeof DEVICES)[number]["id"];

// ── Page-Settings taxonomy (same icon-rail language, document-level fields) ──
export type PageSettingCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
};

export const PAGE_SETTING_CATEGORIES: PageSettingCategory[] = [
  { id: "general", label: "General", icon: FileText, blurb: "Title, slug, status & parent" },
  { id: "seo", label: "SEO", icon: Search, blurb: "Meta title, description & canonical" },
  { id: "social", label: "Social", icon: Share2, blurb: "Open Graph & Twitter cards" },
  {
    id: "advanced",
    label: "Advanced",
    icon: ShieldCheck,
    blurb: "Visibility, auth-gate & custom head",
  },
];

export type PageSettingControl = {
  id: string;
  label: string;
  category: string;
  kind: ControlKind;
  essential?: boolean;
  options?: string[];
  value?: string;
  hint?: string;
};

export const PAGE_SETTINGS: PageSettingControl[] = [
  // General
  {
    id: "page.title",
    label: "Page title",
    category: "general",
    kind: "text",
    essential: true,
    value: "Home",
  },
  {
    id: "page.slug",
    label: "URL slug",
    category: "general",
    kind: "text",
    essential: true,
    value: "/",
    hint: "coderso.dev/",
  },
  {
    id: "page.status",
    label: "Status",
    category: "general",
    kind: "select",
    essential: true,
    options: ["Draft", "Published", "Scheduled"],
    value: "Published",
  },
  {
    id: "page.parent",
    label: "Parent page",
    category: "general",
    kind: "select",
    options: ["None", "About", "Products"],
    value: "None",
  },
  // SEO
  {
    id: "page.seo.metaTitle",
    label: "Meta title",
    category: "seo",
    kind: "text",
    value: "Coderso — modern CMS",
  },
  {
    id: "page.seo.description",
    label: "Meta description",
    category: "seo",
    kind: "text",
    essential: true,
    value: "Build beautiful sites, faster.",
  },
  {
    id: "page.seo.canonical",
    label: "Canonical URL",
    category: "seo",
    kind: "text",
    value: "https://coderso.dev/",
  },
  {
    id: "page.seo.noindex",
    label: "Hide from search (noindex)",
    category: "seo",
    kind: "switch",
    value: "Off",
  },
  // Social
  {
    id: "page.social.ogTitle",
    label: "OG title",
    category: "social",
    kind: "text",
    value: "Coderso",
  },
  {
    id: "page.social.ogImage",
    label: "OG image",
    category: "social",
    kind: "text",
    value: "Pick image…",
  },
  {
    id: "page.social.twitterCard",
    label: "Twitter card",
    category: "social",
    kind: "select",
    options: ["Summary", "Large image"],
    value: "Large image",
  },
  // Advanced
  {
    id: "page.adv.visibility",
    label: "Visibility",
    category: "advanced",
    kind: "select",
    options: ["Public", "Signed-in", "Private"],
    value: "Public",
  },
  {
    id: "page.adv.authGate",
    label: "Require login",
    category: "advanced",
    kind: "switch",
    value: "Off",
  },
  {
    id: "page.adv.customHead",
    label: "Custom <head>",
    category: "advanced",
    kind: "text",
    value: "Add snippet…",
  },
  {
    id: "page.adv.customCss",
    label: "Custom CSS",
    category: "advanced",
    kind: "text",
    value: "Add rules…",
  },
];

export const PAGE_SETTINGS_ESSENTIALS = [
  "page.title",
  "page.slug",
  "page.status",
  "page.seo.description",
];

/** Total control count — asserted in the mockup header so it stays honest. */
export const TOTAL_CONTROLS = CONTROLS.length;
export { ALL, BLOCKS };
