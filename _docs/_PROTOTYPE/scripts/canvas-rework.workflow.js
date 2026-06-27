export const meta = {
  name: "coderso-proto-canvas-rework",
  description: "Rework page/screen editors to the floating-panel canvas model + de-SaaS the sidebar",
  phases: [{ title: "Rework", detail: "Opus agents: 3 canvas editors + sidebar chrome" }],
};

const BASE = "/home/coder/project/Coderso/_docs/_PROTOTYPE";

const CONTRACT = `You are editing files in a React 19 + Tailwind v4 VISUAL PROTOTYPE of the Coderso admin (a self-hosted WordPress competitor — NOT a SaaS). Design language: soft & friendly (Notion-like), VIOLET accent, rounded-2xl cards, soft shadows, warm neutrals, light+dark via CSS vars.

Base dir: ${BASE}  — Write the FULL absolute path = base + "/" + the given path.

HARD RULES
- Overwrite the target file with ONE complete .tsx module; keep the SAME named export.
- Compose ONLY from @/components/ui/*, @/components/patterns/*, @/components/shell/*, lucide-react icons, @/lib/router (Link, usePath), @/lib/cn (cn), @/lib/screensMock. Do NOT invent components.
- NEVER hardcode hex/rgb in className — use semantic classes only (bg-card, bg-muted, bg-primary, bg-primary-soft, text-foreground, text-muted-foreground, text-primary, text-primary-soft-foreground, border-border, ring-ring, bg-success-soft/text-success, text-warning, text-info, text-destructive, rounded-xl/2xl, shadow-soft/card/pop). Inline style colors ONLY for a color-swatch picker.
- Non-functional preview: static content, no data fetching. Buttons need no handlers.
- Must compile (TS strict off). Import only what you use.

KEY COMPONENT — CanvasEditor (the Page Editor V2 model: interactive canvas + a single FLOATING control panel, NO side rails). READ src/components/patterns/CanvasEditor.tsx first. API:
  CanvasEditor({ title, badge?, toolbar?, device?, canvas, panel, panelTitle?, panelPosition?: "right"|"bottom", panelClassName?, className? })
  BlockChip({ icon, label })   // chip for an "add block" palette inside a panel
The floating panel is the sole control surface. For builders use panelPosition="right" (vertical inspector with full options + an add-block palette). For content editing use panelPosition="bottom" (a compact horizontal FORMATTING toolbar with a reduced option set).

ALSO READ for style/props: src/components/patterns/PageHeader.tsx, src/components/ui/{button,badge,input,select,switch,separator}.tsx, and the file you are replacing.

Return STRICT JSON: { "written": ["<relative path>"], "notes": "<one line>" }.`;

const TASKS = [
  {
    label: "page-editor-canvas",
    file: "src/pages/content/PageEditorPreview.tsx",
    component: "PageEditorPreview",
    brief: `Rebuild the PAGE BUILDER to the floating-panel canvas (CanvasEditor), replacing the old 3-pane EditorPreviewFrame. Keep the PageHeader (breadcrumbs [{label:'Pages',to:'/pages'},{label:'Home'}], title 'Home', description 'Visual page builder — edit on canvas with the floating panel.', actions: Preview(outline, Eye icon)/Save draft(ghost)/Publish(default, Rocket icon)).
CanvasEditor: title 'Page builder', badge = <Badge variant="soft"><Eye/> Preview only</Badge>, toolbar = <Badge variant="outline">Home · draft</Badge>.
- canvas: a centered max-w-2xl stack:
  (1) HERO section, SELECTED (wrap in rounded-2xl border-2 border-primary bg-card p-10 text-center shadow-soft): a small soft pill 'New · v2.0', a big font-display text-3xl font-bold heading 'Build beautiful sites, faster', a muted subline, and two buttons (Get started / Live demo outline).
  (2) a feature-grid section (rounded-2xl border border-dashed bg-card/70 p-6 with a grid-cols-3 of 3 muted placeholder cards: a small bg-primary-soft square + 2-3 muted bars each).
  (3) a dashed 'Add section' button (full width).
- panel (panelPosition="right", panelTitle 'Hero section'): inside p-3 flex-col gap-3:
  field 'Heading' (Input defaultValue 'Build beautiful sites'), 'Alignment' (Select: Left/Center/Right, default Center), 'Background' (a row of 4 color swatch buttons — inline style hex allowed here, one ring-primary selected), 'Padding' (Input defaultValue '96' + 'px' hint). Then a Separator and an 'Add block' label + a grid grid-cols-3 gap-1.5 of BlockChip: Heading(Type icon), Text(AlignLeft), Button(Square), Image(Image), Video(Play), Columns(Columns3).
- After CanvasEditor, a centered muted text-xs note: 'The floating panel is the only control surface · non-functional preview.' + a Link to '/pages' ('Back to pages').`,
  },
  {
    label: "screen-builder-canvas",
    file: "src/pages/advanced/CustomScreenEditorPreview.tsx",
    component: "CustomScreenEditorPreview",
    brief: `Rebuild the CUSTOM-SCREEN builder as the ENTRY-VIEW builder on a floating-panel canvas (CanvasEditor). This is where you DESIGN, from sections & blocks, the per-entry view that renders in "Published → Projects → entry".
PageHeader: breadcrumbs [{label:'Screens',to:'/advanced/custom-screens'},{label:'Projects'}], title 'Projects', description 'Design the entry view — the layout shown when someone opens a Project.', actions: a small segmented 'List view | Entry view' toggle (inline-flex rounded-lg border bg-card p-0.5; 'Entry view' active = bg-muted text-foreground rounded-md px-2.5 py-1 text-xs; 'List view' muted), then Save(ghost), Publish(default, Rocket).
CanvasEditor: title 'Entry-view builder', badge = Preview only soft badge, toolbar = <Badge variant="outline">Entry view</Badge>.
- canvas: a centered max-w-2xl stack of SELECTABLE SECTIONS that read as a TEMPLATE bound to fields (use muted "{{ field }}" tokens, NOT real values, to show binding). Each section is a rounded-2xl border bg-card p-5 with a tiny absolute -top-2 left-3 section tag (a Badge variant="outline" px-1.5 text-[10px] e.g. 'Header'); give the section position relative + mt-3 spacing:
  (1) Header section — SELECTED (border-2 border-primary): a big font-display text-2xl font-semibold token "{{ Project name }}", a row with a muted status chip "{{ Status }}", an owner avatar circle placeholder + "{{ Owner }}", and two meta chips "{{ Phase }}" / "{{ Due date }}".
  (2) Fields section (tag 'Fields') — a grid-cols-2 sm:grid-cols-4 of 4 field tiles, each rounded-xl bg-muted/50 p-3 with a tiny muted label and a "{{ Budget }}" / "{{ Progress }}" / "{{ Phase }}" / "{{ Due date }}" token.
  (3) Description section (tag 'Rich text') — a few muted bars hinting a rich-text block.
  (4) Related-list section (tag 'Related list') — a small 'Milestones' header + 3 placeholder rows (a square + bars + a chip).
  (5) a dashed full-width 'Add section' button.
- panel (panelPosition="right", panelTitle 'Header section'): p-3 flex-col gap-3:
  An 'Add block' label + grid grid-cols-3 gap-1.5 of BlockChip: Heading(Type), Text(AlignLeft), Field(Braces or Tag), Stat(BarChart3), Divider(Minus), Image(Image), Related list(List), Tabs(Columns3), Button(Square). Then a Separator. Then section settings: Layout (Select: 1/2/3 columns), 'Bound field' (Select: Project name/Title/Status), Spacing (Select: Comfortable/Compact), Background (4 swatch buttons, inline hex allowed, one ring-primary), and a Switch row 'Visible'.
- After CanvasEditor: centered muted text-xs: 'Build the entry view from sections & blocks — it renders in Published → Projects → entry.' + a Link to '/advanced/custom-screens/project-catalog/entries' ('See a published screen →').`,
  },
  {
    label: "entry-content-canvas",
    file: "src/pages/advanced/CustomScreenEntryEditorPreview.tsx",
    component: "CustomScreenEntryEditorPreview",
    brief: `Rebuild the PUBLISHED entry editor as a CONTENT editor on a floating-panel canvas (CanvasEditor) — same layout the builder designed, now POPULATED with the real entry, edited inline with a SMALL floating FORMATTING toolbar (content only, no layout options).
MUST stay data-driven: import { getScreen, parseScreenPath } from '@/lib/screensMock' and usePath from '@/lib/router'. const { id, entryId } = parseScreenPath(usePath()); const screen = getScreen(id); const index = Math.max(0,(Number(entryId)||1)-1) % screen.rows.length; const entry = screen.rows[index]; titleKey = screen.columns.find(c=>c.type==='title')?.key ?? 'name'; const title = String(entry[titleKey]); const owner = String(entry['owner'] ?? 'Maria Nowak').
PageHeader: breadcrumbs [{label: screen.name, to:\`/advanced/custom-screens/\${screen.id}/entries\`},{label:title}], title=title, description=\`Edit content · entry in the "\${screen.name}" screen\`, actions: Preview only soft Badge, 'Open in builder' (outline, LayoutPanelLeft) Link to \`/advanced/custom-screens/\${screen.id}\`, Save draft(ghost), Publish(default Rocket).
CanvasEditor: title 'Entry content', badge Preview only, toolbar = <Badge variant="outline">Content editing</Badge>.
- canvas: a centered max-w-2xl POLISHED, pleasant entry view populated with the entry:
  (1) Header: big font-display text-2xl font-semibold {title}; a row with <StatusBadge status={String(entry['status'] ?? 'active')}/>, an Avatar(name={owner},size='sm') + owner first name, and muted chips for phase/due if present (entry['phase'], entry['due']).
  (2) a grid-cols-2 sm:grid-cols-4 of 4 value tiles (rounded-xl bg-muted/50 p-3): Budget (entry['budget']), Progress (a Progress bar value={Number(entry['progress'])||60} + %), Phase (entry['phase']), Due (entry['due']). Guard missing values with sensible fallbacks.
  (3) Description block — the CURRENTLY EDITED block: wrap a real paragraph (2-3 sentences about {title}) in a rounded-xl ring-2 ring-primary/60 bg-card p-4 with a tiny 'Editing' soft Badge top-right; it should read as a focused inline editor.
  (4) Milestones — a small SectionCard or bordered list of 3-4 checklist rows (a Checkbox + label + a small StatusBadge), as a related-list widget.
- panel (panelPosition="bottom"): a COMPACT horizontal FORMATTING toolbar (reduced, content-only) — a flex items-center gap-1 row of icon buttons (use Button variant='ghost' size='icon-sm'): Bold, Italic, Underline, Strikethrough, then a thin divider (h-5 w-px bg-border mx-1), Heading (type/Heading icon), List (bullet), Link, then a small color swatch button (a size-5 rounded bg with ring), then AlignLeft/AlignCenter. Prepend a tiny muted 'Aa' or 'Text' label. NO layout/structure controls. Keep it small.
- After CanvasEditor: centered muted text-xs: 'Edit content inline — the layout is defined by the screen.' + a Link to \`/advanced/custom-screens/\${screen.id}\` ('Edit layout →').
Do NOT keep the old right-hand Publish/People/Properties sidebar — the canvas + floating toolbar is the whole view.`,
  },
  {
    label: "sidebar-de-saas",
    file: "src/components/shell/Sidebar.tsx",
    component: "Sidebar",
    brief: `Edit the sidebar to fit a SELF-HOSTED single-site CMS (WordPress competitor) — NO SaaS framing. Make EXACTLY TWO changes and keep EVERYTHING ELSE byte-for-byte: the NAV_TOS const, the resolveActiveTo() function, the NavLink component, the entire <nav> rendering (sections, Advanced group, Published screens block), and the footer Docs/Support links MUST remain unchanged.
1) Replace the top 'Workspace switcher' button (the one with the Hexagon brand + bold 'Coderso' + muted 'Acme Studio' + a ChevronsUpDown icon) with a SITE IDENTITY block (this is the single site being edited, like WordPress shows the site name top-left): keep the violet rounded-xl square with the Hexagon icon; PRIMARY line = site name 'Acme Studio' (font-display text-sm font-semibold, truncate); SECONDARY line = the domain 'acmestudio.com' in muted text-xs with a tiny ExternalLink icon (size-3) before/after it to imply 'Visit site'; replace the ChevronsUpDown with a small ChevronDown (size-4 text-muted-foreground) to imply a site menu (NOT a workspace switcher). Keep it a single <button> with the same outer classes/hover.
2) DELETE the entire 'Coderso Pro / 14 days left in trial' card (the div with a Sparkles icon, 'Coderso Pro', '14 days left in trial') from the footer. Do not replace it with any plan/upgrade/trial. You MAY add, in its place, a single minimal muted line: a tiny Hexagon (size-3.5) + 'Coderso 1.0' (text-xs text-muted-foreground) as a self-hosted version label — or nothing. No billing/plans.
Fix the lucide-react imports accordingly (remove Sparkles and ChevronsUpDown if now unused; add ExternalLink). It MUST compile and the nav + active-highlighting must keep working.`,
  },
];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    written: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
  required: ["written", "notes"],
};

phase("Rework");
log(`Reworking ${TASKS.length} files with Opus (3 canvas editors + sidebar de-SaaS)`);

const results = await parallel(
  TASKS.map((task) => () =>
    agent(
      `${CONTRACT}\n\n==== TARGET ====\nFile: ${task.file}\nExport: export function ${task.component}() { ... }\n\nSPEC:\n${task.brief}\n\nRead the references, then Write the file and return JSON.`,
      { label: task.label, phase: "Rework", model: "opus", schema: SCHEMA },
    ),
  ),
);

const written = results.filter(Boolean).flatMap((r) => r.written ?? []);
log(`Done — ${written.length} files written`);
return { results, written };
