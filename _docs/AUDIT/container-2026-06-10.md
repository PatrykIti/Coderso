# Page Editor V2 audit — block `container`

## 1. Meta
- **Target:** block `container` (palette needle "Nested layout container")
- **Kind:** block
- **Date:** 2026-06-10
- **Audit HEAD:** a06049ba (working tree was at 1fb8604a during run — concurrent 418 sanity fixes; observations reflect that snapshot)
- **Evidence:** `/home/coder/project/Coderso/.tmp/audit/evidence/container.json`
- **Screenshot:** `/home/coder/project/Coderso/.tmp/audit/shots/container.png`
- **Editor page:** `/admin/pages/a2163ab6-0fc6-4ada-962d-5a5402fc52ee`

## 2. Insert
- Inserted: **YES**. `editorSections=1`, `editorBlocks=1`.
- Toolbar label: **`container tools`**.
- Default blocks: a single `container` block in one auto-created `content` section.
- Persisted after reopen: **YES** (`s=1/b=1`) — published front renders the block (control case for the columns bug below).

## 3. Control inventory

### Layout panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Width | segmented (block width) | native-select[auto\|full] | `.seg` pills | DRIFT |
| Align | segmented | native-select[left\|center\|right] | `.seg` pills | DRIFT |

### Content panel
Empty (no fields) — container has no content props.

### Style panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Text color | color | text-input (raw hex) | `.swatch` + picker | DRIFT |
| Opacity | number | native-number | text px (`.inp.mono`) | ACCEPTABLE |
| Radius | number radius | native-number | `.slider` range | DRIFT |
| Shadow | select | native-select[none\|sm\|md\|lg] | `.seg` pills | PARTIAL DRIFT |
| Border color | color | text-input (raw hex) | `.swatch` + picker | DRIFT |

### Background panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Background | color | text-input (raw hex) | `.swatch` + picker | DRIFT |
| Background type | select (bgType) | native-select[none\|color\|gradient\|image\|video] | `.seg` pills | PARTIAL DRIFT |

### Spacing panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Padding top/right/bottom/left (×4) | number padding | native-number | text px input | ACCEPTABLE |
| Margin top/right/bottom/left (×4) | number margin | native-number | text px input | ACCEPTABLE |

### Responsive panel
Empty (no fields).

### Visibility panel
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Visible | switch | native-select[yes\|no] | `.sw` toggle | DRIFT |

### Counts summary (across all panels)
`select` present, `number` present, `text` present, but **`range=0`, `switch=0`, `swatch=0`, `segmentedGroup=0` in EVERY panel** → no dedicated controls exist; every intended pill/switch/swatch/slider collapsed to a native primitive.

## 4. Functional checks
- **Canvas WYSIWYG:** `canvasRedAfterBgSet=1` → setting section background `#ff0000` now paints a red element on the canvas. The TASK-417 report flagged this as BROKEN; it is now **FIXED**.
- **Block render vs placeholder:** real render. Front shows `data-page-block="container"` with **no placeholderHits** — the container is rendered by the public runtime, not a placeholder stub.

## 5. Public runtime
- **Front URL:** `http://coderso-a.localhost:3000/audit-container-0610-blkd`
- **sectionTypes:** `["content"]`
- **blockTypes:** `["container"]`
- **placeholderHits:** `[]`
- **bodyText:** empty (container has no inner content authored, but the structural element renders — confirmed via curl `data-page-block="container"`).

## 6. Floating-panel drift vs reference
- Width / Align → should be `.seg` pill segmented controls, rendered as native `<select>`.
- Background / Text color / Border color → should be `.swatch` color swatches + picker, rendered as raw-hex text inputs.
- Radius → should be a `.slider` range, rendered as a number input.
- Background type / Shadow → should be `.seg` pills, rendered as native `<select>` (partial — functional).
- Visible → should be a `.sw` toggle switch, rendered as a yes/no `<select>`.

## 7. Verdict
**PARTIAL** — severity **medium**. The container inserts, persists, renders on the front, and canvas WYSIWYG works; but the entire floating inspector is collapsed to native text/number/select primitives — none of the reference's dedicated swatch/switch/slider/segmented controls exist (`swatch=switch=range=segmentedGroup=0`).
