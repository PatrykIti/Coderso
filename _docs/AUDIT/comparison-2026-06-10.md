# Page Editor V2 Audit — `comparison` section

## 1. Meta
- **Target:** `comparison` section (palette needle "Compare options or service tiers")
- **Kind:** section
- **Date:** 2026-06-10
- **Audit HEAD:** `a06049ba` (worktree was at `1fb8604a` during run — another agent was concurrently applying TASK-418 sanity fixes; observations reflect that live snapshot of the editor served by the dev server)
- **Evidence JSON:** `/home/coder/project/Coderso/.tmp/audit/evidence/comparison.json`
- **Screenshot:** `/home/coder/project/Coderso/.tmp/audit/shots/comparison.png`
- **Editor URL:** `http://coderso-a.localhost:5173/admin/pages/70f14d5f-4d89-41ec-9991-3e1502ff96af`
- **Public URL:** `http://coderso-a.localhost:3000/audit-comparison-0610-secb`

## 2. Insert
- Inserted: **YES**. `editorSections=1`, `editorBlocks=2`.
- Toolbar label: **"Comparison tools"**.
- Default blocks: `heading` + `text` (front body: "comparison section / Add focused content blocks here.").

## 3. Control inventory

Registry source: `pageUniversalSectionControls` + `getPageSectionVariantControl("comparison")` in `core/services/pages/pageEditorControlRegistry.ts`. Reference dedicated controls confirmed in `coderso-editor-redesign.html` (`.seg` pills, `.swatch`, `.slider`, `.sw` toggles).

### Layout panel
| Control | registry input | rendered widget | reference control | verdict |
| --- | --- | --- | --- | --- |
| Columns | number | native-number | text px (.inp.mono) | ACCEPTABLE |
| Max width | number | native-number | text px (.inp.mono) | ACCEPTABLE |
| Align | **segmented** | native-select[start\|center\|end\|stretch] | .seg PILL BUTTONS | **DRIFT** |
| Justify | **segmented** | native-select[start\|center\|end\|between] | .seg PILL BUTTONS | **DRIFT** |
| Variant | select | native-select[default\|grid\|cards] | .seg pills | PARTIAL DRIFT |

### Content panel
| Control | registry input | rendered widget | reference control | verdict |
| --- | --- | --- | --- | --- |
| Primary text | text | text-input | text input | OK |
| Level | select | native-select[h1..h6] | .seg pills | PARTIAL DRIFT |
| Text align | **segmented** | native-select[left\|center\|right] | .seg PILL BUTTONS | **DRIFT** |

### Style panel
| Control | registry input | rendered widget | reference control | verdict |
| --- | --- | --- | --- | --- |
| Accent | **color** | text-input (raw hex) | .swatch SWATCHES + picker | **DRIFT** |
| Radius | number | native-number | .slider RANGE | **DRIFT** (reference is a slider) |
| Shadow | select | native-select[none\|sm\|md\|lg] | .seg pills | PARTIAL DRIFT |

### Background panel
| Control | registry input | rendered widget | reference control | verdict |
| --- | --- | --- | --- | --- |
| Background | **color** | text-input (raw hex) | .swatch SWATCHES + picker | **DRIFT** |
| Background type | select | native-select[none\|color\|gradient\|image\|video] | .seg pills | PARTIAL DRIFT |
| Background (image src) | media | text-input (raw URL) | media picker button | **DRIFT** |

### Spacing panel
| Control | registry input | rendered widget | reference control | verdict |
| --- | --- | --- | --- | --- |
| Top / Bottom / Left / Right | number | native-number | text px (.inp.mono) | ACCEPTABLE |
| Gap | number | native-number | .slider RANGE | **DRIFT** (reference is a slider) |

### Responsive panel
| Control | registry input | rendered widget | reference control | verdict |
| --- | --- | --- | --- | --- |
| (none) | — | empty panel | breakpoint controls | n/a (no fields rendered) |

### Visibility panel
| Control | registry input | rendered widget | reference control | verdict |
| --- | --- | --- | --- | --- |
| Visible | **switch** | native-select[yes\|no] | .sw TOGGLE | **DRIFT** |
| Auth only | **switch** | native-select[yes\|no] | .sw TOGGLE | **DRIFT** |
| Anchor | text | text-input | text input | OK |
| Starts at | text | text-input | text input | OK |
| Ends at | text | text-input | text input | OK |

**Counts summary (across all panels):** every panel reports `switch=0, swatch=0, range=0, segmentedGroup=0`. NO dedicated controls exist — segmented→native-select, switch→native-select, color→text input, slider→number input. Headline drift, identical to other sections.

## 4. Functional checks
- **Canvas WYSIWYG:** `canvasRedAfterBgSet=1`. Setting section background to `#ff0000` paints a red element on the canvas. TASK-417 reported this BROKEN; it is now **FIXED**.
- **Variant → front layout:** variant options `["default","grid","cards"]`. Switching Variant `default → grid` and re-publishing changed the front:
  - `data-page-section-template` / `data-page-variant`: `comparison/default` → `comparison/grid`.
  - Inner content class: `page-section-template-comparison-default` → `page-section-template-comparison-grid auto-rows-fr`, columns bumped to `md:grid-cols-2` (renderer special-cases `comparison` + `grid`/`cards` to 2 columns).
  - Verdict: variant switching **WORKS** end-to-end.

## 5. Public runtime
- Front URL: `http://coderso-a.localhost:3000/audit-comparison-0610-secb`
- `sectionTypes`: `["comparison"]`
- `blockTypes`: `["heading","text"]`
- `placeholderHits`: `[]` (real render, not a placeholder)
- bodyText: `"comparison section Add focused content blocks here."`

## 6. Floating-panel drift vs reference
- **Align / Justify (Layout)** and **Text align (Content):** segmented → native `<select>`. Reference uses `.seg` pill buttons.
- **Accent (Style), Background (Background):** color → raw-hex text input. Reference uses `.swatch` color swatches + picker.
- **Radius (Style), Gap (Spacing):** number → `<input type=number>`. Reference uses a `.slider` range.
- **Visible / Auth only (Visibility):** switch → native yes/no `<select>`. Reference uses `.sw` toggle switches.
- **Background image src (Background):** media → raw-URL text input. Reference uses a media picker button.
- **Variant / Level / Shadow / Background type:** functional native `<select>` but reference renders `.seg` pills (PARTIAL DRIFT).

## 7. Verdict
- **PARTIAL** — severity **medium**.
- Insert, canvas WYSIWYG (now fixed), variant→front-layout (default→grid bumps to 2 cols), and public runtime all WORK. But the floating inspector collapses every dedicated control into 3 native primitives: `switch/swatch/range/segmentedGroup` counts all 0. Same systemic control-drift as feature-grid — usable but not the designed UX.
