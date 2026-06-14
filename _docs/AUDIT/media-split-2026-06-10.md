# Page Editor V2 Live Audit — `media-split` section

## 1. Meta
- **Target:** `media-split` section (palette: "Copy next to image or video")
- **Kind:** section
- **Date:** 2026-06-10
- **Audit HEAD:** `a06049ba` (orchestrator-declared). NOTE: a concurrent agent was editing the tree during this run; live working-tree HEAD observed as `1fb8604a`. All observations reflect that running snapshot.
- **Evidence:** `/home/coder/project/Coderso/.tmp/audit/evidence/media-split.json`
- **Screenshot:** `/home/coder/project/Coderso/.tmp/audit/shots/media-split.png`
- **Editor URL:** `http://coderso-a.localhost:5173/admin/pages/be8525ac-8609-4047-b3b2-f30445e94aa2`
- **Front URL:** `http://coderso-a.localhost:3000/audit-media-split-0610-secc`

## 2. Insert
- Inserted: **YES**. `editorSections=1`, `editorBlocks=2`.
- Toolbar label: **"Media Split tools"** (floating toolbar shows `Media Split` + variant chip).
- Default blocks: `heading`, `text` (confirmed both in editor canvas and on published front).

## 3. Control inventory

### Layout panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Columns | segmented (1/2/3/4) | native-number | .seg pills | DRIFT |
| Max width | number | native-number | .inp.mono text | ACCEPTABLE |
| Align | segmented | native-select[start\|center\|end\|stretch] | .seg pills | DRIFT |
| Justify | segmented | native-select[start\|center\|end\|between] | .seg pills | DRIFT |
| Variant | select | native-select[split\|horizontal\|default] | .seg pills | PARTIAL DRIFT |

### Content panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Primary text | text | text-input | .inp text | OK |
| Level | select (heading level) | native-select[h1..h6] | .seg pills | PARTIAL DRIFT |
| Text align | segmented | native-select[left\|center\|right] | .seg pills | DRIFT |

### Style panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Accent | color | text-input (raw hex) | .swatch swatches | DRIFT |
| Radius | number (radius) | native-number | .slider range | DRIFT |
| Shadow | select | native-select[none\|sm\|md\|lg] | .seg pills | PARTIAL DRIFT |

### Background panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Background type | select (bgType) | native-select[none\|color\|gradient\|image\|video] | .seg pills | PARTIAL DRIFT |
| Background (color) | color | text-input (raw hex) | .swatch swatches | DRIFT |
| Background (image/url) | media | text-input (raw URL) | media picker button | DRIFT |

### Spacing panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Top / Bottom / Left / Right | number padding | native-number | .inp.mono text | ACCEPTABLE |
| Gap | number gap | native-number | .slider range | DRIFT |

### Responsive panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| (none) | breakpoint cascade + hide switch + size override | **NO controls rendered** (empty) | .sw toggles + .inp.mono | MISSING |

### Visibility panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Visible | switch | native-select[yes\|no] | .sw toggle | DRIFT |
| Auth only | switch | native-select[yes\|no] | .sw toggle | DRIFT |
| Anchor | text | text-input | .inp.mono text | OK |
| Starts at / Ends at | text (date) | text-input | .inp.mono text | OK |

**Counts summary (all panels):** `switch=0`, `swatch=0`, `range=0`, `segmentedGroup=0` across every panel. ZERO dedicated controls exist — exactly the user's complaint. Every intended segmented/switch/color/slider control is collapsed into a native `<select>`, `text` input, or `number` input.

## 4. Functional checks
- **Canvas WYSIWYG:** `canvasRedAfterBgSet=1`. Setting Background type=color + `#ff0000` paints the section red on the editor canvas (screenshot confirms a fully red section). The TASK-417 report flagged this as BROKEN; it is now **FIXED**.
- **Variant options:** `["split","horizontal","default"]`.
- **Variant → front layout:** Switched Variant `default → horizontal`, saved + published. The published front section attribute changed: baseline had no `data-page-variant`; after the switch it shows `data-page-variant="horizontal"`. HOWEVER `data-page-section-template` stayed `media-split` and the section classes stayed `w-full px-4 py-6` — i.e. the variant is **persisted as a data attribute but produces NO actual layout/markup difference** on the rendered front. Variant switching is cosmetic-only at the data layer.

## 5. Public runtime
- **Front URL:** `http://coderso-a.localhost:3000/audit-media-split-0610-secc`
- **sectionTypes:** `["media-split"]`
- **blockTypes:** `["heading","text"]`
- **placeholderHits:** `[]` (no placeholder/pending/unavailable markers — real render)
- **bodyText:** `"media split section Add focused content blocks here."`

## 6. Floating-panel drift vs reference
- **Layout:** Columns + Align + Justify should be `.seg` pill groups → all native selects/number. Variant should be `.seg` pills → native select.
- **Style:** Accent should be `.swatch` color swatches → raw hex text input; Radius should be a `.slider` → number; Shadow should be `.seg` → select.
- **Background:** Type should be `.seg` pills → select; color should be `.swatch` → raw hex; image should be a media picker → raw URL text.
- **Spacing:** Gap should be a `.slider` → number.
- **Responsive:** entire breakpoint-cascade subpanel (hide switch, layout-to-vertical switch, per-breakpoint size override) is **absent** — no controls at all.
- **Visibility:** Visible + Auth only should be `.sw` toggles → native yes/no selects.

## 7. Verdict
**PARTIAL** — severity **medium**. Insert, default blocks, canvas WYSIWYG (TASK-417 fix confirmed) and public render all work; but every dedicated control from the reference (pills/switches/swatches/sliders) is collapsed to plain native inputs (`switch/swatch/range/segmentedGroup` counts all 0), the Responsive panel is empty, and Variant switching writes a data attribute that has no layout effect on the front.
