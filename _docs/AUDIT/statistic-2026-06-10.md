# Audit — Statistic block (Page Editor V2)

## 1. Meta
- **Target:** Statistic block (palette: "Metric value with label and caption")
- **Kind:** block · **Type:** `statistic`
- **Date:** 2026-06-10 · **Squad/session:** blkA
- **Audit HEAD:** `a06049ba` (live tree was at `1fb8604a` during run — concurrent 418 sanity fixes in progress; observations reflect that snapshot).
- **Evidence:** `/home/coder/project/Coderso/.tmp/audit/evidence/statistic.json`
- **Screenshot:** `/home/coder/project/Coderso/.tmp/audit/shots/statistic.png`
- **Note on method:** mechanical driver could not create pages (shared `auth.json` → "Invalid CSRF token" on create POST; `/admin/api/auth/csrf` intermittently 429). Drove playwright-cli directly via helpers after warming CSRF and re-authenticating. All evidence is live-browser, session `blkA`.

## 2. Insert
- **Inserted:** YES. `editorSections=1`, `editorBlocks=1`.
- **Toolbar label:** `0 tools` (the block's default Value `0` leaks into the toolbar `aria-label` — same class of cosmetic bug as the text block's `Write the section copy here. tools`; the toolbar label is derived from block content rather than the block type name).
- **Default blocks:** single statistic block in a `content` section wrapper (front: `sectionTypes=[content]`, `blockTypes=[statistic]`).

## 3. Control inventory (per panel)

### Layout panel — counts: select 2 / number 0 / text 0 / range 0 / switch 0 / swatch 0 / segmentedGroup 0
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Width | segmented (block width) | native-select[auto\|full] | .seg pills | DRIFT |
| Align | segmented (text-align) | native-select[left\|center\|right] | .seg pills | DRIFT |

### Content panel — counts: select 0 / number 0 / text 3 / range 0 / switch 0 / swatch 0 / segmentedGroup 0
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Value | text (metric value) | text-input | text input | OK |
| Label | text | text-input | text input | OK |
| Caption | text | text-input | text input | OK |

### Style panel — counts: select 1 / number 2 / text 2 / range 0 / switch 0 / swatch 0 / segmentedGroup 0
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Text color | color | text-input (raw hex) | .swatch swatches + picker | DRIFT |
| Opacity | number | native-number | text px / slider | ACCEPTABLE |
| Radius | number radius | native-number | .slider range | DRIFT |
| Shadow | select | native-select[none\|sm\|md\|lg] | .seg pills | PARTIAL DRIFT |
| Border color | color | text-input (raw hex) | .swatch swatches + picker | DRIFT |

### Background panel — counts: select 1 / number 0 / text 1 / range 0 / switch 0 / swatch 0 / segmentedGroup 0
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Background (color) | color | text-input (raw hex) | .swatch swatches + picker | DRIFT |
| Background type | select (bgType) | native-select[none\|color\|gradient\|image\|video] | .seg pills | PARTIAL DRIFT |

### Spacing panel — counts: select 0 / number 8 / text 0 / range 0 / switch 0 / swatch 0 / segmentedGroup 0
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Padding top/right/bottom/left | number padding | native-number | text px (.inp.mono) | ACCEPTABLE |
| Margin top/right/bottom/left | number margin | native-number | text px (.inp.mono) | ACCEPTABLE |

### Responsive panel — counts: all 0 (no fields). Panel renders empty.

### Visibility panel — counts: select 1 / number 0 / text 0 / range 0 / switch 0 / swatch 0 / segmentedGroup 0
| Control | registry input | rendered widget | reference control | verdict |
|---|---|---|---|---|
| Visible | switch | native-select[yes\|no] | .sw toggle | DRIFT |

**Counts summary (all panels):** `switch=0`, `swatch=0`, `range(slider)=0`, `segmentedGroup=0`. ZERO dedicated controls. The Content panel (Value/Label/Caption) is correctly all text inputs (no drift there).

## 4. Functional checks
- **Canvas WYSIWYG:** `canvasRedAfterBgSet=1`. Parent section background `#ff0000` paints red on the canvas. TASK-417 reported BROKEN → now **FIXED**.
- **Block render vs placeholder (front):** REAL render. `placeholderHits=[]`; all three fields render live ("99 Audit metric blkA live 0610 caption") as `blockTypes=[statistic]`.
- **Persistence:** Save persists across reload (`sections=1, blocks=1`, text "99 Audit metric blkA live 0610 caption"); Publish toast = `PUBLISHED`.

## 5. Public runtime
- **URL:** http://coderso-a.localhost:3000/audit-statistic-0610-blka
- **sectionTypes:** `[content]`
- **blockTypes:** `[statistic]`
- **placeholderHits:** `[]` (none)
- **bodyText:** "99 Audit metric blkA live 0610 caption"

## 6. Floating-panel drift vs reference
- **No .seg pill groups** — Width, Align, Shadow, Background type are native `<select>`.
- **No .swatch color swatches/picker** — Text color, Border color, Background color are raw hex text inputs.
- **No .slider range** — Radius is a number input.
- **No .sw toggle** — Visible is a yes/no `<select>`.
- Content panel (Value/Label/Caption) is correct as text inputs — no drift there.

## 7. Verdict
**PARTIAL** · severity **medium** — Statistic block inserts, persists, and renders all three fields (value/label/caption) live on the front (no placeholder); canvas WYSIWYG works (417 fix confirmed). Gaps: (1) zero dedicated controls in the inspector (`switch=swatch=slider=segmentedGroup=0`); (2) minor — the block's default Value `0` bleeds into the toolbar `aria-label` ("0 tools") instead of a clean "Statistic tools".
