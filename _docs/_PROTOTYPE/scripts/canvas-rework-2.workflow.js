export const meta = {
  name: "coderso-proto-per-screen-and-templates",
  description: "Per-screen entry presentations + page-template editor (Opus)",
  phases: [{ title: "Rework", detail: "Opus: screen builder + entry editor (data-driven) + template editor" }],
};

const BASE = "/home/coder/project/Coderso/_docs/_PROTOTYPE";

const CONTRACT = `You are editing files in a React 19 + Tailwind v4 VISUAL PROTOTYPE of the Coderso admin (a self-hosted WordPress competitor, NOT a SaaS). Soft & friendly (Notion-like), VIOLET accent, rounded-2xl, soft shadows, warm neutrals, light+dark via CSS vars.

Base dir: ${BASE} — Write the FULL absolute path.

HARD RULES
- Overwrite the target file with ONE complete .tsx module; keep the SAME named export.
- Compose ONLY from @/components/ui/*, @/components/patterns/*, lucide-react icons, @/lib/router (Link, usePath), @/lib/cn (cn), @/lib/screensMock. No invented components.
- NEVER hardcode hex/rgb in className — semantic classes only (bg-card/muted/primary/primary-soft, text-foreground/muted-foreground/primary/primary-soft-foreground, border-border, ring-ring, bg-success-soft+text-success, text-warning/info/destructive, rounded-xl/2xl, shadow-soft/card/pop). Inline style hex ONLY for color-swatch buttons.
- Non-functional preview: static, no data fetching, no handlers needed. Must compile (TS strict off). Import only what you use.

KEY COMPONENT — CanvasEditor (interactive canvas + a single FLOATING panel; it already has a built-in show/hide toggle). READ src/components/patterns/CanvasEditor.tsx. API:
  CanvasEditor({ title, badge?, toolbar?, device?, canvas, panel, panelTitle?, panelPosition?: "right"|"bottom", panelClassName?, className? })
  BlockChip({ icon, label })
Use panelPosition="right" for builders (vertical inspector + add-block palette). Use panelPosition="bottom" for content editing (compact horizontal formatting toolbar).

ALSO READ: src/lib/screensMock.ts, src/pages/content/PageEditorPreview.tsx (the canonical CanvasEditor usage), src/components/patterns/PageHeader.tsx, src/components/patterns/StatusBadge.tsx, src/components/ui/{button,badge,input,select,switch,separator,avatar,progress,checkbox}.tsx.

screensMock API: getScreen(id), parseScreenPath(path) -> { id, entryId }. ScreenDef = { id, name, singular, contentType, icon:LucideIcon, description, views:string[], columns:{key,label,type,visible,locked?,subKey?}[], stats, rows:Record<string,unknown>[], entry:{ sections: EntrySection[] } }. column.type ∈ 'title'|'status'|'person'|'badge'|'money'|'progress'|'date'|'tags'|'text'. EntrySection = {kind:'header'} | {kind:'fields',label,fieldKeys:string[]} | {kind:'richtext',label,placeholder} | {kind:'related',label,variant:'checklist'|'activity'}. Helper you should define: const col = (k) => screen.columns.find(c => c.key === k).

Return STRICT JSON: { "written": ["<relative path>"], "notes": "<one line>" }.`;

const TASKS = [
  {
    label: "screen-builder-per-screen",
    file: "src/pages/advanced/CustomScreenEditorPreview.tsx",
    component: "CustomScreenEditorPreview",
    brief: `Make the custom-screen ENTRY-VIEW BUILDER fully DATA-DRIVEN so different screens (Projects vs Clients) show DIFFERENT templates. Read: const screen = getScreen(parseScreenPath(usePath()).id).
PageHeader: breadcrumbs [{label:'Screens',to:'/advanced/custom-screens'},{label:screen.name}], title=screen.name, description=\`Design the entry view — the layout shown when someone opens a \${screen.singular}.\`, actions: a small segmented 'List view | Entry view' toggle ('Entry view' active), Save(ghost), Publish(default Rocket).
CanvasEditor: title 'Entry-view builder', badge=<Badge variant="soft">Preview only</Badge>, toolbar=<Badge variant="outline">Entry view</Badge>, panelTitle 'Header section', panelPosition="right".
- canvas: a centered max-w-2xl stack rendering screen.entry.sections IN ORDER as selectable TEMPLATE sections (use muted "{{ label }}" binding tokens, NOT real values). Make a local <Section tag selected? children> helper (relative mt-3 rounded-2xl p-5; selected => border-2 border-primary else border border-border; an absolute -top-2 left-3 outline Badge px-1.5 text-[10px] = tag) and a <Token> helper (rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground). Render per section.kind:
  • header (tag 'Header', SELECTED): a big font-display text-2xl token "{{ "+ (col(screen.columns.find(c=>c.type==='title')?.key)?.label ?? 'Title') +" }}" — i.e. the title column's label; then a row of small tokens for Status / Owner and any header-ish chips (use "{{ Status }}", "{{ Owner }}").
  • fields (tag 'Fields'): a grid grid-cols-2 sm:grid-cols-4 of tiles, one per section.fieldKeys — each tile rounded-xl bg-muted/50 p-3 with the column label (col(key)?.label) on top and a Token "{{ "+label+" }}" below.
  • richtext (tag 'Rich text'): the section.label as a small heading + 4-5 muted placeholder bars.
  • related (tag 'Related list'): the section.label as a heading + 3 placeholder rows (a square + bars + a small chip).
  Then a dashed full-width 'Add section' button.
- panel: p-3 flex-col gap-3 — an 'Add block' label + grid grid-cols-3 gap-1.5 of BlockChip (Heading/Type, Text/AlignLeft, Field/Braces, Stat/BarChart3, Divider/Minus, Image/Image, Related list/List, Tabs/Columns3, Button/Square), then a Separator, then section settings: Layout (Select 1/2/3 columns), 'Bound field' (Select listing screen.columns labels), Spacing (Select), Background (4 swatch buttons, inline hex ok, one ring-primary), and a Switch row 'Visible'.
- After CanvasEditor: centered muted text-xs: \`Build the entry view — it renders in Published → \${screen.name} → entry.\` + a Link to \`/advanced/custom-screens/\${screen.id}/entries\` ('See a published screen →').`,
  },
  {
    label: "entry-editor-per-screen",
    file: "src/pages/advanced/CustomScreenEntryEditorPreview.tsx",
    component: "CustomScreenEntryEditorPreview",
    brief: `Make the PUBLISHED entry content editor DATA-DRIVEN from the screen's OWN layout (screen.entry.sections), so Projects and Clients PRESENT AN ENTRY DIFFERENTLY (e.g. Projects ends with a Milestones CHECKLIST; Clients ends with a Recent-activity FEED). Read: const { id, entryId } = parseScreenPath(usePath()); const screen = getScreen(id); const index = Math.max(0,(Number(entryId)||1)-1) % screen.rows.length; const entry = screen.rows[index]; const col=(k)=>screen.columns.find(c=>c.key===k); titleKey = screen.columns.find(c=>c.type==='title')?.key ?? 'name'; title = String(entry[titleKey]); owner = String(entry['owner'] ?? 'Maria Nowak').
PageHeader: breadcrumbs [{label:screen.name,to:\`/advanced/custom-screens/\${screen.id}/entries\`},{label:title}], title=title, description=\`Edit content · \${screen.singular} in the "\${screen.name}" screen\`, actions: Preview only soft Badge, 'Open in builder' (outline, LayoutPanelLeft) Link to \`/advanced/custom-screens/\${screen.id}\`, Save draft(ghost), Publish(default Rocket).
CanvasEditor: title 'Entry content', badge=Preview only soft Badge, toolbar=<Badge variant="outline">Content editing</Badge>, panelPosition="bottom".
- canvas: a centered max-w-2xl polished card (rounded-2xl border bg-card p-6 sm:p-8 shadow-card, flex-col gap-6) rendering screen.entry.sections IN ORDER, POPULATED with the entry. Write a renderValue(key) helper using col(key)?.type: 'money'/'text'/'badge' => plain String(value); 'progress' => <Progress value={Number(value)} className="flex-1"/> + a % label; 'date' => String(value); 'status' => <StatusBadge .../>; 'person' => Avatar + name. Render per section.kind:
  • header: big font-display text-2xl font-semibold {title}; a wrap row with <StatusBadge status={String(entry['status']??'active')}/>, an Avatar(name={owner},size='sm') + owner first name, and small muted chips for the next 1-2 non-title/non-status/non-owner header-ish fields if present.
  • fields: grid grid-cols-2 sm:grid-cols-4 of tiles (rounded-xl bg-muted/50 p-3): per fieldKey, the column label + renderValue(key).
  • richtext: a block wrapped in rounded-xl bg-card p-4 ring-2 ring-primary/60 (the CURRENTLY EDITED block) with a 'Editing' soft Badge top-right, the section.label as a heading, and a real 2-3 sentence paragraph (incorporate {title} + the section.placeholder).
  • related variant 'checklist': a bordered list titled section.label with 4 rows: a Checkbox (first 1-2 checked) + a label (Kickoff & discovery / Design review / Build & QA / Launch) + a <StatusBadge> (completed/active/pending/planned).
  • related variant 'activity': a bordered list titled section.label with 3-4 rows: an Avatar (from owner + a couple PEOPLE-like names) + '<b>Name</b> <muted>action</muted>' (e.g. 'logged a call', 'updated the plan', 'sent an invoice') + a muted time on the right.
- panel (bottom): a COMPACT horizontal formatting toolbar (content-only): a tiny muted 'Aa' label, then ghost icon-sm Buttons Bold/Italic/Underline/Strikethrough, a h-5 w-px bg-border mx-1 divider, Heading/List/Link, a small color swatch button (size-5 rounded with ring), AlignLeft/AlignCenter. No layout controls.
- After CanvasEditor: centered muted text-xs 'Edit content inline — the layout is defined by the screen.' + a Link to \`/advanced/custom-screens/\${screen.id}\` ('Edit layout →').`,
  },
  {
    label: "template-editor",
    file: "src/pages/advanced/PageTemplateEditorPreview.tsx",
    component: "PageTemplateEditorPreview",
    brief: `Build the PAGE-TEMPLATE editor as the SAME page editor experience as Pages (CanvasEditor floating right panel) — because templates are reusable/configurable (e.g. site footer, main menu) that PROPAGATE to every page using them. Mirror the structure of src/pages/content/PageEditorPreview.tsx (read it).
Derive the template from the URL: const id = usePath().split('/').filter(Boolean).pop() || 'new'; build a small name map { 'site-footer':'Site footer', 'main-menu':'Main menu', 'site-header':'Header', 'blog-sidebar':'Blog sidebar', 'new':'New template' } with a fallback that title-cases the id; const isMenu = id.includes('menu'); const isSiteWide = ['site-footer','main-menu','site-header','new'].includes(id) || id.includes('footer')||id.includes('header')||id.includes('menu'); usedOn = isSiteWide ? 24 : 8.
PageHeader: breadcrumbs [{label:'Templates',to:'/advanced/page-templates'},{label:name}], title=name, description='Reusable template — changes apply everywhere it's used.', actions: a Badge (variant={isSiteWide?'success':'outline'}) showing isSiteWide?'Site-wide':'Page', then Preview(outline, Eye), Save draft(ghost), Publish(default, Rocket).
Add a propagation note Card BEFORE the editor (bg-primary-soft/50 p-4 flex items-center gap-3): a RefreshCw icon + muted text \`Editing this template updates \${usedOn} pages that use it.\`
CanvasEditor: title 'Template editor', badge=<Badge variant="soft"><Eye/> Preview only</Badge>, toolbar=<Badge variant="outline">{name} · draft</Badge>, panelTitle = isMenu ? 'Menu' : 'Footer columns', panelPosition="right".
- canvas: a centered max-w-2xl mock of the template, SELECTED (rounded-2xl border-2 border-primary bg-card p-8):
  • if isMenu: a horizontal nav bar mock — a small brand square + a row of ~5 menu link pills + a primary 'Get started' button on the right; below it a muted note 'Appears at the top of every page'.
  • else (footer): a footer mock — a grid grid-cols-2 sm:grid-cols-4 gap-6 of 4 link columns (each: a small heading bar + 3-4 muted link lines), then a Separator, then a bottom bar row with a muted '© Acme Studio' + a row of 3 small social squares.
  Then OUTSIDE the selected block, a dashed full-width 'Add block' button.
- panel: p-3 flex-col gap-3 — if footer: Field 'Columns' (Select 2/3/4, default 4), Field 'Background' (4 swatch buttons inline hex, one ring-primary), Field 'Padding' (Input '64' + 'px'); if menu: Field 'Links' (a few rows: a small input-looking pill per link 'Home/Pricing/About/Blog/Contact'), Field 'Style' (Select Inline/Stacked). For BOTH then a Separator and an 'Add block' label + grid grid-cols-3 gap-1.5 of BlockChip (Heading/Type, Text/AlignLeft, Link/Link2, Image/Image, Button/Square, Columns/Columns3).
- After CanvasEditor: centered muted text-xs 'Templates are reusable — edit once, update everywhere.' + a Link to '/advanced/page-templates' ('Back to templates').`,
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
log(`Reworking ${TASKS.length} files with Opus (per-screen entry views + template editor)`);

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
