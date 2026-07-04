export const meta = {
  name: "coderso-proto-pages",
  description: "Generate the remaining ~52 Coderso admin prototype screens from shared primitives",
  phases: [{ title: "Generate pages", detail: "one agent per batch, composing shared components" }],
};

const BASE = "/home/coder/project/Coderso/_docs/_PROTOTYPE";

const CONTRACT = `You are building page components for a React 19 + Tailwind v4 VISUAL PROTOTYPE of the Coderso admin UI.
Design language: SOFT & FRIENDLY (Notion-like), VIOLET accent, rounded-2xl cards, soft shadows, warm neutrals, light+dark already handled by CSS variables. Calm, generous spacing.

Base dir: ${BASE}  (all paths below are relative to it; use the Write tool with the FULL absolute path = base + "/" + path)

HARD RULES
- Overwrite each target file with ONE complete .tsx module whose NAMED export EXACTLY matches the given component name.
- Compose ONLY from these (+ lucide-react icons). Do NOT invent new components or pull anything from core/admin:
  UI:   @/components/ui/{button,card,badge,input,textarea,label,select,switch,checkbox,table,tabs,avatar,separator,progress,skeleton,dropdown,tooltip}
  PAT:  @/components/patterns/{PageHeader,StatCard,SectionCard,DataTable,FilterBar,Pagination,EmptyState,StatusBadge,SettingsSection,EditorPreviewFrame,charts}
  SHELL:@/components/shell/SettingsLayout   (settings pages only)
  LIB:  @/lib/router (Link), @/lib/mock (data)
- NEVER hardcode hex/rgb colors in className. Use ONLY semantic classes: bg-background, bg-card, bg-muted, bg-secondary, bg-accent, bg-primary, bg-primary-soft, text-foreground, text-muted-foreground, text-primary, text-primary-soft-foreground, border-border, ring-ring; state tones: bg-success-soft/text-success, bg-warning-soft/text-warning, bg-info-soft/text-info, text-destructive/bg-destructive. Rounding: rounded-xl / rounded-2xl. Shadow: shadow-soft / shadow-card. (Only chart props like color="var(--primary)" may use var(--...).)
- Non-functional: static mock content only, no data fetching, no real state needed. Forms: onSubmit={(e)=>e.preventDefault()}. Links use <Link to="/...">. For editor "preview" pages, the EditorPreviewFrame already shows a "Preview only" pill.
- Must compile (TS strict OFF). Import only what you use. Keep it polished and visually consistent with the exemplars.

BEFORE WRITING, READ the matching exemplar(s) to copy structure/spacing exactly:
  list/table  -> src/pages/content/PageListPage.tsx
  settings    -> src/pages/settings/GeneralSettingsPage.tsx  (uses SettingsLayout)
  editor      -> src/pages/content/PageEditorPreview.tsx     (uses EditorPreviewFrame)
  gallery     -> src/pages/store/PluginStorePage.tsx
  dashboard   -> src/pages/DashboardPage.tsx
  auth        -> src/pages/auth/LoginPage.tsx
If unsure of a prop, READ the component file under src/components/.

COMPONENT CHEATSHEET (props)
- PageHeader({title, description?, actions?, breadcrumbs?:{label,to?}[], icon?})
- StatCard({label, value, delta?, trend?:'up'|'down'|'flat', icon?, spark?:number[], hint?})
- SectionCard({title?, description?, action?, icon?, children, className?, bodyClassName?, padded?})
- DataTable({columns:{key,header,className?,align?:'left'|'right'|'center',render?(row,i)}[], rows, selectable?, onRowClick?})
- FilterBar({searchPlaceholder?, filters?, view?:'grid'|'list', onViewChange?, trailing?})  // pass view to show grid/list toggle
- Pagination({page?, pageCount?, total?, pageSize?})
- EmptyState({icon?, title, description?, action?})
- StatusBadge({status})  // 'published'|'draft'|'scheduled'|'review'|'active'|'pending'|'failed'|'approved'|'rejected'|'beta'|'paid'...
- SettingsSection({title, description?, children}) ; SettingsField({label?, hint?, htmlFor?, children})
- EditorPreviewFrame({left?, canvas, right?, title?, toolbar?, device?}) ; EditorRailGroup({label,children}) ; EditorRailItem({icon?,children,active?})
- charts: AreaChart({data:number[], tone?:'primary'|'success'|'info', height?}) ; BarChart({data:number[], labels?:string[]}) ; Sparkline({data, tone?}) ; Donut({segments:{value,color,label?}[], size?, thickness?})
- Tabs({items:{value,label,count?}[], variant?:'pill'|'underline', defaultValue?})
- Button variant: default|soft|secondary|outline|ghost|destructive|link ; size: default|sm|lg|icon|icon-sm
- Badge variant: default|soft|secondary|outline|success|warning|info|destructive
- Select(styled native <select>, put <option> children) ; Switch({defaultChecked?}) ; Checkbox({defaultChecked?}) ; Input ; Textarea ; Avatar({name, size?:'sm'|'md'|'lg'})
- SettingsLayout({title, description?, saveBar?, children}) -> settings pages MUST return <SettingsLayout title="..."> <div className="divide-y divide-border"> ...SettingsSection... </div> </SettingsLayout>
- mock: PEOPLE[{name,email,role}], PAGE_TITLES[], POST_TITLES[], DATES[], RELATIVE_TIMES[], STATUSES, spark(seed)=>number[], pick(list,i), seeded(i,max,min)

For images/thumbnails use tinted placeholders (e.g. a rounded-xl bg-muted block with a lucide icon, or bg-primary-soft), NEVER external URLs.
Return STRICT JSON only: { "written": ["<relative path>", ...], "notes": "<one short line>" }.`;

const BATCHES = [
  {
    label: "content-lists",
    pages: [
      { file: "src/pages/content/PostsListPage.tsx", component: "PostsListPage", brief: "Blog posts list. Like PageListPage. PageHeader 'Posts' + 'New post' button (Link /posts/sample). Underline Tabs (All/Published/Drafts/Scheduled with counts). FilterBar (view='list'). DataTable selectable: columns Title (Newspaper icon + POST_TITLES[i] + category subtitle), Status (StatusBadge), Author (Avatar+first name from PEOPLE), Published (DATES[i]), Comments (number, right). Rows Link to /posts/sample. Pagination total~48." },
      { file: "src/pages/content/MenuListPage.tsx", component: "MenuListPage", brief: "Site menus. PageHeader 'Menus' + 'New menu'. 2-col card grid of menus: Header navigation, Footer, Mobile, Legal. Each Card: name, a location Badge (e.g. 'Header'), item count, last updated, and two buttons: 'Edit' (Link /menus/sample) and 'Design' (outline, Link /menus/sample/design). Use List icon accent." },
      { file: "src/pages/media/MediaLibraryPage.tsx", component: "MediaLibraryPage", brief: "Media gallery. PageHeader 'Media library' + 'Upload' button (Upload icon). Top: a storage usage SectionCard with Progress (e.g. 6.2 GB of 10 GB). Layout: left narrow column of folders (All files, Images, Videos, Documents, Audio) as a vertical nav list (active first); right: FilterBar(view='grid') then a responsive grid (grid-cols-2 sm:3 lg:4 xl:5) of ~15 media Cards: a square rounded-xl bg-muted thumbnail with an Image/FileVideo/FileText icon (vary), filename, size, type Badge. Hover lift." },
    ],
  },
  {
    label: "advanced-lists-1",
    pages: [
      { file: "src/pages/advanced/EnginePage.tsx", component: "EnginePage", brief: "Content model builder ('Engine'). PageHeader 'Content types' description 'Define the structure of your content.' + 'New type'. Stat row (Types, Entries, Fields). Responsive card grid of content types: Article, Product, Event, Author, Category, FAQ, Testimonial, Service. Each Card: a tinted rounded-xl icon (Database/Box/etc), name, field count, entry count, and links 'Edit schema' (Link /advanced/engine/sample/schema) + 'Entries' (Link /advanced/engine/sample/collection)." },
      { file: "src/pages/advanced/EntriesPage.tsx", component: "EntriesPage", brief: "All content entries. PageHeader 'Entries' + a type Select filter (All types/Article/Product/Event) in actions + 'New entry'. Underline Tabs by status. FilterBar(view='list'). DataTable selectable: Title (FileText icon + title from PAGE_TITLES/POST_TITLES), Type (Badge soft), Status (StatusBadge), Author (Avatar), Updated (DATES). Rows Link /advanced/entries/article/sample. Pagination total~124." },
      { file: "src/pages/advanced/CustomScreensPage.tsx", component: "CustomScreensPage", brief: "Custom admin screens. PageHeader 'Screens' + Badge soft 'Beta' near title via actions, + 'New screen'. Card grid: screens like 'Support tickets','Inventory','Leads','Projects','Events calendar','Team directory'. Each Card: LayoutGrid tinted icon, name, a status StatusBadge (active/draft), small stats (blocks count, bindings count), buttons 'Open' (Link /advanced/custom-screens/sample) + 'Entries' (outline, Link /advanced/custom-screens/sample/entries)." },
      { file: "src/pages/advanced/FormsPage.tsx", component: "FormsPage", brief: "Forms manager. PageHeader 'Forms' + 'New form'. Stat row (Total forms, Submissions this month, Avg conversion). DataTable selectable: Name (ClipboardList icon + form name e.g. Contact/Newsletter/Demo request/Support), Fields (number), Submissions (number), Status (StatusBadge active/draft), Last submission (RELATIVE_TIMES). Row actions: a ghost MoreHorizontal button; rows Link /advanced/forms/sample. Below, a small 'Recent submissions' link to /advanced/forms/sample/submissions." },
      { file: "src/pages/advanced/ListingsPage.tsx", component: "ListingsPage", brief: "Dynamic listings. PageHeader 'Listings' + Beta + 'New listing'. Card grid: listings like 'Latest articles','Featured products','Team members','Upcoming events','Case studies'. Each Card: LayoutGrid icon, name, a muted query summary line (e.g. 'Article where status = published, sort by date'), badges for bound type + layout (Grid/List), item count, 'Edit' Link /advanced/listings/sample." },
    ],
  },
  {
    label: "advanced-lists-2",
    pages: [
      { file: "src/pages/advanced/FiltersPage.tsx", component: "FiltersPage", brief: "Faceted filters. PageHeader 'Filters' + Beta + 'New filter set'. List/grid of filter-set Cards: name, bound dataset Badge, a row of facet chips (Category, Price range, Brand, Rating, Availability) as small Badges, an active Switch on the right, and an 'Edit' ghost button. Include a short helper note card at top explaining filters bind to listings." },
      { file: "src/pages/advanced/SearchModulePage.tsx", component: "SearchModulePage", brief: "Scoped search modules. PageHeader 'Search modules' + Beta + 'New module'. Top: a disabled-looking styled search Input preview inside a Card ('Search products…'). Card grid of modules: 'Site search','Product search','Docs search','Blog search'. Each: Search icon, name, scope Badge, ranking preset (muted text), presets count, Edit link." },
      { file: "src/pages/advanced/BookingPage.tsx", component: "BookingPage", brief: "Booking calendar (visual mock). PageHeader 'Booking' + Beta + 'New booking'. Stat row (Bookings today, Upcoming, Utilization %). Main: a SectionCard 'This week' containing a 7-column calendar grid (Mon–Sun headers) with ~6 colored booking blocks placed in cells (rounded-lg, use bg-primary-soft text-primary-soft-foreground, bg-info-soft text-info, bg-success-soft text-success; each block shows a time + name). Left small column: Resources/Services list (Studio A, Studio B, Consultation, Coaching) with colored dots." },
      { file: "src/pages/advanced/ReviewsPage.tsx", component: "ReviewsPage", brief: "Reviews moderation. PageHeader 'Reviews' + Beta. Stat row (Avg rating with Star, Pending, This week). Underline Tabs (Pending/Approved/Rejected with counts). A vertical list of review Cards: Avatar + reviewer name + a 5-Star rating row (filled Star icons with text-warning fill), product/service line, the review text (muted), a StatusBadge, and on the right Approve (soft) + Reject (ghost) buttons. ~5 reviews using PEOPLE." },
      { file: "src/pages/advanced/CommercePage.tsx", component: "CommercePage", brief: "Products (commerce). PageHeader 'Products' + Beta + 'Add product'. Stat row (Revenue, Orders, Avg order value, with deltas/sparks). FilterBar(view='grid'). DataTable selectable OR product grid — choose DataTable: Product (square bg-muted thumb w/ ShoppingBag icon + name + SKU subtitle), Price (right, e.g. $49.00), Stock (Badge: in stock=success-soft, low=warning-soft, out=destructive), Status (StatusBadge), Sales (number). Rows Link /advanced/commerce/sample. Pagination." },
    ],
  },
  {
    label: "advanced-misc",
    pages: [
      { file: "src/pages/advanced/PopupsPage.tsx", component: "PopupsPage", brief: "Engagement popups. PageHeader 'Popups' + Beta + 'New popup'. Stat row (Active, Impressions, Avg conversion). Card grid: popups like 'Newsletter signup','Exit discount','Cookie consent','Welcome offer'. Each Card: Megaphone tinted icon, name, trigger Badge (Exit intent/Timed/Scroll/On load), impressions, conversion %, an active Switch, Edit link /advanced/popups/sample." },
      { file: "src/pages/advanced/SolutionKitsPage.tsx", component: "SolutionKitsPage", brief: "AI solution kits (gallery, like PluginStore). PageHeader 'Solution kits' + Beta. A featured primary banner Card (bg-primary text-primary-foreground) 'Launch a full site in minutes'. Card grid of kits: Restaurant, SaaS Landing, Portfolio, Agency, Online Store, Blog, Events, Nonprofit. Each Card: tinted icon, name, short description, a row of includes Badges (e.g. '8 pages','12 widgets','5 types'), and 'Apply kit' (soft) button. Mark one kit as 'Active' with a success Badge." },
      { file: "src/pages/advanced/WidgetLibraryPage.tsx", component: "WidgetLibraryPage", brief: "Widget library (gallery). PageHeader 'Widgets'. Pill Tabs categories (All/Layout/Content/Marketing/Media/Forms). Card grid of widgets: Hero, Feature grid, Pricing table, Testimonials, FAQ, Call to action, Gallery, Logo cloud, Stats, Newsletter, Team, Steps. Each Card: a small ABSTRACT visual preview (a rounded-xl bg-muted area with a few thin bg-muted-foreground/20 bars / blocks arranged to hint the widget), name, category Badge, and 'Insert' (soft) + 'Preview' (ghost) buttons." },
      { file: "src/pages/advanced/PageTemplatesPage.tsx", component: "PageTemplatesPage", brief: "Page templates gallery. PageHeader 'Page templates' + 'New template'. Card grid: Landing, About, Pricing, Contact, Blog post, Product, Portfolio, Coming soon. Each Card: a thumbnail mock (rounded-xl bg-muted with stacked block lines hinting a page layout), name, sections count Badge, 'Use template' (soft) Link /advanced/page-templates/sample + 'Preview' ghost." },
      { file: "src/pages/advanced/CollectionWorkspacePage.tsx", component: "CollectionWorkspacePage", brief: "Collection workspace for one content type. PageHeader breadcrumbs [Engine /advanced/engine, Article] title 'Articles' + 'New entry'. Underline Tabs (Entries/Detail template/Settings). Body for Entries tab: FilterBar(view='list') + DataTable selectable (Title, Status StatusBadge, Author Avatar, Updated DATES) using POST_TITLES, rows Link /advanced/entries/article/sample. Pagination. A right-aligned small note linking to the Detail template editor (Link /advanced/engine/sample/collection/detail-template/1)." },
      { file: "src/pages/advanced/CustomScreenEntriesPage.tsx", component: "CustomScreenEntriesPage", brief: "Records for a custom screen. PageHeader breadcrumbs [Screens /advanced/custom-screens, Support tickets] title 'Support tickets' + 'New record'. Stat row (Open, In progress, Resolved). FilterBar(view='list'). DataTable selectable: Subject (+ requester subtitle), Priority (Badge: high=destructive,med=warning-soft,low=secondary), Status (StatusBadge), Assignee (Avatar), Updated (RELATIVE_TIMES). Rows Link /advanced/custom-screens/sample/entries/1. Pagination." },
      { file: "src/pages/advanced/FormSubmissionsPage.tsx", component: "FormSubmissionsPage", brief: "Form submissions. PageHeader breadcrumbs [Forms /advanced/forms, Contact form] title 'Submissions' + an 'Export' outline button (Download icon). Stat row (Total, This week, Spam blocked). FilterBar(view='list'). DataTable selectable: Name (Avatar+name from PEOPLE), Email, Message (truncated muted snippet), Submitted (RELATIVE_TIMES), Status (StatusBadge new/read/spam). Pagination total~210." },
    ],
  },
  {
    label: "editors-1",
    pages: [
      { file: "src/pages/content/PostEditorPreview.tsx", component: "PostEditorPreview", brief: "Post editor preview. PageHeader breadcrumbs [Posts /posts, 'Introducing Coderso 2.0'] title 'Introducing Coderso 2.0' + actions Preview(outline)/Save draft(ghost)/Publish(default Rocket). EditorPreviewFrame title 'Post editor': left = EditorRailGroup 'Blocks' with EditorRailItem rows (Paragraph/Heading/Image/Quote/Code/List/Embed icons); canvas = a max-w-2xl 'paper' Card with a large bold title line, a muted byline, a couple of paragraphs (use bars or real lorem text), a rounded-xl bg-muted image placeholder with Image icon, a subheading, more text; right = post settings: Status Select, Slug Input, Category Select, Tags (a few Badges + input), Featured image (bg-muted box + Upload), an SEO mini section (title/description inputs). Footer note + Link back to /posts." },
      { file: "src/pages/content/MenuEditorPreview.tsx", component: "MenuEditorPreview", brief: "Menu editor preview. PageHeader breadcrumbs [Menus /menus, 'Header navigation'] + Save/Publish actions. EditorPreviewFrame title 'Menu editor': left = EditorRailGroup 'Add items' with EditorRailItem (Pages/Posts/Custom link/Categories/Button); canvas = a vertical list of menu item rows in a Card — each row has a GripVertical icon, a label, a muted URL, a chevron; show 2 nested children indented under one item (Products > Plans, Products > Features). Right = selected item settings: Label Input, URL Input, 'Open in new tab' Switch row, Visibility Select. Use rounded-xl rows with hover." },
      { file: "src/pages/advanced/ContentTypeEditorPreview.tsx", component: "ContentTypeEditorPreview", brief: "Content type editor. PageHeader breadcrumbs [Engine /advanced/engine, 'Article'] title 'Article' + actions ('Open schema' outline Link /advanced/engine/sample/schema, Save). Underline Tabs (Fields/Relations/Settings/Permissions). Body: two-column grid lg:[1fr_300px]. Left SectionCard 'Fields' (action '+ Add field' soft button): a list of field rows (GripVertical + field name + a type Badge soft (Text/Slug/Rich text/Media/Relation/Date/Boolean) + a MoreHorizontal). Fields: Title, Slug, Body, Cover image, Author (relation), Category (relation), Published at, Featured (boolean). Right: a settings Card (API ID input, singular/plural names, an 'Enable drafts' Switch row, 'Versioning' Switch)." },
      { file: "src/pages/advanced/SchemaBuilderPreview.tsx", component: "SchemaBuilderPreview", brief: "Schema builder (visual). PageHeader breadcrumbs [Engine /advanced/engine, 'Article', 'Schema'] + Save. EditorPreviewFrame title 'Schema builder': left = EditorRailGroup 'Field types' with EditorRailItem (Text/Number/Boolean/Date/Rich text/Media/Relation/Select icons); canvas = a centered max-w-xl vertical stack of field 'node' Cards (each: a small type icon, field name, type label, a handle dot), connected feel; mark one selected (border-primary). Right = inspector for selected field: Label Input, Field type Select, 'Required' Switch, 'Unique' Switch, Default value Input, Help text Input." },
    ],
  },
  {
    label: "editors-2",
    pages: [
      { file: "src/pages/advanced/EntryEditorPreview.tsx", component: "EntryEditorPreview", brief: "Entry editor (content form, NOT EditorPreviewFrame). PageHeader breadcrumbs [Entries /advanced/entries, 'Article'] title 'Edit entry' + Save draft(ghost)/Publish. Add a small Badge soft 'Preview only' in actions. Two-column grid lg:[1fr_320px]: left = stacked SectionCards: 'Content' (Title Input, Slug Input, a Body area = a tall rounded-xl border bg-muted/40 placeholder with a few text bars labeled 'Rich text'), 'Media' (cover image bg-muted box + Upload). Right = stacked Cards: 'Publish' (Status Select, Visibility Select, a Schedule row, Save/Publish buttons), 'Taxonomy' (Category Select, Tags Badges), 'Metadata' (created/updated muted rows)." },
      { file: "src/pages/advanced/CustomScreenEditorPreview.tsx", component: "CustomScreenEditorPreview", brief: "Custom screen builder. PageHeader breadcrumbs [Screens /advanced/custom-screens, 'Support tickets'] + Save/Publish. EditorPreviewFrame title 'Screen builder': left = two EditorRailGroups: 'Widgets' (Stat card/Table/Chart/Filters/Form icons) and 'Fields' (Text/Status/Assignee/Date); canvas = a composed admin screen mock inside a Card: a row of 3 mini stat tiles, then a fake data table (header + 4 rows of bars) — hint it's a generated screen; right = block bindings inspector: 'Data source' Select (Support tickets), 'Columns' list with Checkboxes (Subject/Status/Assignee/Priority/Updated), 'Mode' Select (Read / Read & write)." },
      { file: "src/pages/advanced/FormBuilderPreview.tsx", component: "FormBuilderPreview", brief: "Form builder. PageHeader breadcrumbs [Forms /advanced/forms, 'Contact form'] + Save/Publish. EditorPreviewFrame title 'Form builder': left = EditorRailGroup 'Fields' EditorRailItems (Text/Email/Textarea/Select/Checkbox/Radio/Date/File/Phone); canvas = a max-w-lg Card form PREVIEW with real-looking fields: Full name (Input), Email (Input), Subject (Select), Message (Textarea), a consent Checkbox row, and a Submit Button — each field wrapped so it reads as the live form; right = selected field settings: Label Input, Placeholder Input, 'Required' Switch, 'Help text' Input, Width Select (Full/Half)." },
      { file: "src/pages/advanced/ListingEditorPreview.tsx", component: "ListingEditorPreview", brief: "Listing editor. PageHeader breadcrumbs [Listings /advanced/listings, 'Latest articles'] + Save/Publish. EditorPreviewFrame title 'Listing editor': left = EditorRailGroup 'Data' (Source select hint) + 'Filters' EditorRailItems (Status/Category/Date/Author); canvas = a preview grid (grid-cols-2) of ~6 repeatable result Cards (each: a bg-muted thumb bar, a title bar, two muted lines, a small Badge) to show the bound query output; right = layout settings: Layout Select (Grid/List/Carousel), Columns Select, 'Items per page' Input, a 'Fields shown' checklist (Image/Title/Excerpt/Date/Author Checkboxes), Sort Select." },
      { file: "src/pages/advanced/CommerceEditorPreview.tsx", component: "CommerceEditorPreview", brief: "Product editor (form). PageHeader breadcrumbs [Products /advanced/commerce, 'Wireless headphones'] + Save draft/Publish, Badge soft 'Preview only'. Two-column lg:[1fr_320px]: left SectionCards: 'Details' (Title Input, Description Textarea), 'Media' (a row of 4 square bg-muted image boxes, first is cover), 'Pricing' (Price Input, Compare-at Input, SKU Input in a grid), 'Inventory' (Stock Input, a 'Track inventory' Switch). Right Cards: 'Status' (Status Select, Visibility Select, Publish button), 'Organization' (Category Select, Tags Badges, Vendor Input), a small price summary card." },
      { file: "src/pages/advanced/PopupEditorPreview.tsx", component: "PopupEditorPreview", brief: "Popup editor. PageHeader breadcrumbs [Popups /advanced/popups, 'Newsletter signup'] + Save/Publish. EditorPreviewFrame title 'Popup editor': left = EditorRailGroup 'Content' (Heading/Text/Input/Button/Image); canvas = a dimmed page backdrop (a rounded-2xl bg-muted area) with a CENTERED popup Card mock on top (max-w-sm: a headline, a line of muted text, an email Input, a primary Button, a small 'no thanks' link); right = settings: Trigger Select (Exit intent/Timed/Scroll depth/On load), Delay Input, Frequency Select (Once/Every visit/Weekly), Audience Select (All/New/Returning), 'Show on mobile' Switch." },
    ],
  },
  {
    label: "store-visual",
    pages: [
      { file: "src/pages/store/PluginDetailsPage.tsx", component: "PluginDetailsPage", brief: "Plugin details. PageHeader breadcrumbs [Plugin store /store, 'Analytics Pro']. A header Card: big tinted rounded-2xl icon (BarChart3), name 'Analytics Pro', 'by Coderso', a Star rating row + installs, a primary 'Install' button + 'outline' Visit site. Underline Tabs (Overview/Reviews/Changelog). Two-column lg:[1fr_300px]: left = description paragraphs, a 'What's included' feature list with Check icons (text-success), a row of 3 screenshot placeholders (bg-muted 16:9 rounded-xl). Right sidebar Cards: 'Information' key/value rows (Version 2.4.1, Updated, Downloads 12k, Category, License), 'Permissions' list with small icons, 'Support' links." },
      { file: "src/pages/themes/ThemesPage.tsx", component: "ThemesPage", brief: "Admin UI theme editor (design tokens). PageHeader 'Admin UI theme' description 'Customize the look of your admin.' + 'Save theme'. Top: a row of preset theme Cards (Default(active, success Badge), Midnight, Forest, Sunset, Mono) each a small swatch preview. Then two-column lg:[1fr_360px]: LEFT = a 'Live preview' SectionCard containing a MINI admin mock (a small rounded-xl border: a tiny sidebar column with 3 nav lines, a topbar bar, and 2 mini stat cards + a button) so changes feel previewable. RIGHT = controls SettingsSection-style Cards: Accent color (row of color swatch buttons, violet selected w/ ring — these MAY use style background hexes since it's a color picker), Base palette Select (Warm/Cool/Neutral), Radius (a Select Small/Medium/Large), Font Select (Inter/System/Geist), Density Select, 'Dark mode' Switch row. (Color swatches are the ONLY place inline style colors are allowed.)" },
    ],
  },
  {
    label: "tools",
    pages: [
      { file: "src/pages/tools/SearchPage.tsx", component: "SearchPage", brief: "Global search. Centered max-w-2xl layout: a large search Input (Search icon, big h-12, placeholder 'Search pages, posts, media, users…') with a ⌘K kbd. Below: 'Recent' chips (a few Badge outline). Then a results SectionCard grouped by type: Pages, Posts, Media, Users — each group has 2–3 result rows (icon tile + title + a muted breadcrumb/path + a type Badge on right), hover bg-muted. Keep it elegant and spacious." },
      { file: "src/pages/tools/SeoManagerPage.tsx", component: "SeoManagerPage", brief: "SEO manager. PageHeader 'SEO manager' + 'Run audit' button. Stat row (Avg score with a number/100, Issues, Indexed pages, Warnings). FilterBar(view='list'). DataTable: Page (FileText + title + slug from PAGE_TITLES), Score (a small inline Progress or a colored number e.g. 92 text-success / 64 text-warning), Title length (Badge ok/warning), Meta description (Badge: 'Missing' destructive / 'Good' success-soft), Issues (number). Rows clickable. Pagination." },
      { file: "src/pages/tools/AnalyticsPage.tsx", component: "AnalyticsPage", brief: "Analytics (chart-heavy, like a deeper dashboard). PageHeader 'Analytics' + a date-range Select + Export. Stat row of 4 StatCards with sparks (Visitors/Pageviews/Avg time/Bounce). Then grid lg:3: a 2-col SectionCard 'Traffic' with a big AreaChart + small legend; a 1-col SectionCard 'Sources' with a Donut + legend (Organic/Direct/Social/Referral). Then grid lg:2: SectionCard 'Top pages' with a BarChart (labels) OR a small table of pages+views; SectionCard 'Devices' with a Donut or three Progress bars (Desktop/Mobile/Tablet). Finish with a 'Top pages' DataTable (Page, Views, Unique, Bounce, Avg time)." },
      { file: "src/pages/tools/BackupsPage.tsx", component: "BackupsPage", brief: "Backups. PageHeader 'Backups' + 'Create backup' (Plus). A SectionCard 'Automatic backups': a Switch row (enabled) + Frequency Select (Daily) + Retention Select + a muted 'next backup' line. A storage usage SectionCard with Progress. DataTable: Backup (Calendar icon + 'Jun 27, 2026 · 03:00'), Size (e.g. 248 MB), Type (Badge: Auto secondary / Manual soft), Status (StatusBadge completed/failed), Actions (Restore ghost, Download ghost, a Trash ghost). ~6 rows." },
      { file: "src/pages/tools/ImportExportPage.tsx", component: "ImportExportPage", brief: "Import / Export. PageHeader 'Import / Export'. Two-column grid md:2: LEFT SectionCard 'Import' = a dashed dropzone (border-dashed rounded-2xl bg-muted/40, Upload icon, 'Drag a file or browse', supported formats muted) + a 'What to import' checklist (Checkbox rows: Pages, Posts, Media, Users, Settings) + an Import button. RIGHT SectionCard 'Export' = a 'What to export' checklist (same items, some checked) + Format Select (JSON/CSV/ZIP) + Export button. Below full-width: a 'Recent jobs' DataTable (Job, Type Badge import/export, Items, Status StatusBadge, Date)." },
      { file: "src/pages/tools/RedirectsPage.tsx", component: "RedirectsPage", brief: "Redirects. PageHeader 'Redirects' + 'Add redirect'. Stat row (Total, 301 permanent, 302 temporary, 404s caught). An inline 'add' Card row: Source Input + an arrow + Destination Input + a Type Select (301/302) + Add button. DataTable selectable: Source (mono /old-path), arrow icon, Destination (mono /new-path), Type (Badge 301=success-soft/302=info-soft), Hits (number), Status (StatusBadge active), actions. ~8 rows. Pagination." },
    ],
  },
  {
    label: "admin",
    pages: [
      { file: "src/pages/admin/UsersRolesPage.tsx", component: "UsersRolesPage", brief: "Users & roles. PageHeader 'Users' + 'Invite user' (UserPlus). Underline Tabs (Members/Invitations with counts). Stat row (Total users, Active, Pending invites). FilterBar(view='list'). DataTable selectable using PEOPLE: User (Avatar + name + email), Role (Badge soft from role), Status (StatusBadge active/pending), Last active (RELATIVE_TIMES), 2FA (Badge: Enabled success-soft / Off secondary), actions (MoreHorizontal). Pagination." },
      { file: "src/pages/admin/PermissionsMatrixPage.tsx", component: "PermissionsMatrixPage", brief: "Roles permission matrix. PageHeader 'Roles matrix' + 'New role'. A SectionCard containing a matrix Table: first column = permission groups/rows (Content: read/create/publish/delete; Media: read/upload/delete; Users: read/invite/manage; Settings: read/write; Billing). Columns = roles (Owner, Admin, Editor, Author, Viewer). Cells = a centered Check icon (text-primary) when allowed or a Minus (text-muted-foreground/40) when not. Owner all checked. Sticky-ish first column (font-medium). Add a legend + role member counts as small Badges in the header cells." },
      { file: "src/pages/admin/AuditLogsPage.tsx", component: "AuditLogsPage", brief: "Audit logs. PageHeader 'Audit logs' + 'Export' outline. FilterBar(view='list') with a couple filter hints. A SectionCard with a vertical timeline list: each event row = an Avatar (actor from PEOPLE) + a sentence ('<b>name</b> <muted>action</muted> <primary>target</primary>'), a category Badge (Created success-soft / Updated info-soft / Deleted destructive / Login secondary), an IP (mono muted) and timestamp (RELATIVE_TIMES) on the right. ~10 events. Pagination." },
      { file: "src/pages/admin/AccessLogsPage.tsx", component: "AccessLogsPage", brief: "Access logs (security). PageHeader 'Access logs'. Stat row (Requests 24h, Blocked, Unique IPs, Failed logins). FilterBar(view='list'). DataTable: Time (RELATIVE_TIMES), IP (mono), Location (e.g. Warsaw, PL), Request (method Badge GET/POST + mono path), Status (a colored code: 200 text-success, 302 text-info, 401/403 text-warning, 404/500 text-destructive), User agent (truncated muted). ~10 rows. Pagination." },
    ],
  },
  {
    label: "settings-1",
    pages: [
      { file: "src/pages/settings/SiteSettingsPage.tsx", component: "SiteSettingsPage", brief: "Settings > Site. Return <SettingsLayout title='Site' description='Public site configuration.'> with <div className='divide-y divide-border'> of SettingsSections: 'Identity' (Site name Input, Site URL Input, Favicon = bg-muted box + Upload), 'Homepage' (Homepage Select, Posts page Select), 'Reading' (Posts per page Input, Default category Select), 'Comments' (a few Switch rows: Enable comments, Require approval, Allow guests)." },
      { file: "src/pages/settings/AssistantSettingsPage.tsx", component: "AssistantSettingsPage", brief: "Settings > Assistant (AI). Return <SettingsLayout title='Assistant' description='AI writing assistant configuration.'>. SettingsSections: 'Provider' (Provider Select with options Anthropic/OpenAI/OpenRouter [Anthropic first/default], Model Select — Anthropic models MUST be the latest Claude: options value 'claude-opus-4-8' label 'Claude Opus 4.8', 'claude-sonnet-4-6' label 'Claude Sonnet 4.6', 'claude-haiku-4-5' label 'Claude Haiku 4.5', default opus; API key Input type=password), 'Behavior' (Temperature — use a styled range Input type=range OR a Select Low/Balanced/Creative; System prompt Textarea), 'Features' (Switch rows: Content suggestions, Auto alt-text, Translation, Summaries), 'Usage' (a muted 'This month' line + a Progress bar e.g. 62%)." },
      { file: "src/pages/settings/SecuritySettingsPage.tsx", component: "SecuritySettingsPage", brief: "Settings > Security. Return <SettingsLayout title='Security' description='Authentication and protection.'>. SettingsSections: 'Authentication' (Switch row 'Require 2FA for all users', Password policy Select, Session timeout Select), 'Login protection' (Rate limit Select, Failed-attempt lockout Select, 'Block Tor exit nodes' Switch). Then a 'More' SettingsSection with three quick-link Cards (Link): IP allowlist (/settings/security/ip-allowlist), Active sessions (/settings/security/sessions), Login alerts (/settings/security/login-alerts) — each a Card with icon, title, short desc, ChevronRight." },
      { file: "src/pages/settings/EmailSettingsPage.tsx", component: "EmailSettingsPage", brief: "Settings > Email. Return <SettingsLayout title='Email' description='Transactional email / SMTP.'>. SettingsSections: 'Sender' (From name Input, From email Input), 'SMTP' (Host Input, Port Input, Username Input, Password Input type=password, Encryption Select TLS/SSL/None — use a 2-col grid), 'Test' (a muted line + a 'Send test email' outline Button + a small success Badge 'Last test passed')." },
    ],
  },
  {
    label: "settings-2",
    pages: [
      { file: "src/pages/settings/StorageSettingsPage.tsx", component: "StorageSettingsPage", brief: "Settings > Storage. Return <SettingsLayout title='Storage' description='Where uploaded media is stored.'>. SettingsSections: 'Provider' (three selectable provider Cards in a grid — Local disk(selected, ring-primary), Amazon S3, Azure Blob — each a Card with icon, name, small desc, clickable look), 'Credentials' (Bucket Input, Region Select, Access key Input, Secret key Input type=password in a 2-col grid), 'CDN' (CDN base URL Input, 'Serve media via CDN' Switch), 'Usage' (a Progress bar + muted '6.2 GB of 50 GB used')." },
      { file: "src/pages/settings/IntegrationsPage.tsx", component: "IntegrationsPage", brief: "Settings > Integrations. Return <SettingsLayout title='Integrations' description='Connect third-party services.' saveBar={false}>. A responsive Card grid of integrations: Google Analytics, Stripe, Slack, Mailchimp, Zapier, GitHub, Sentry, Discord. Each Card: a tinted rounded-xl icon, name, one-line desc, and a button — Connected ones show a success Badge + 'Manage' outline + a Switch; others show a 'Connect' soft button. Mark Google Analytics + Stripe as connected." },
      { file: "src/pages/settings/ApiKeysPage.tsx", component: "ApiKeysPage", brief: "Settings > API keys. Return <SettingsLayout title='API keys' description='Programmatic access to your workspace.' saveBar={false}>. A right-aligned 'Create key' Button above a DataTable: Name (KeyRound icon + name e.g. 'Production','CI deploy','Mobile app'), Key (mono masked 'sk_live_••••4f9a' + a Copy ghost icon button), Scopes (a couple Badges read/write), Created (DATES), Last used (RELATIVE_TIMES), actions (a 'Revoke' ghost destructive). Add an info callout Card (bg-warning-soft text-warning-ish) about keeping keys secret. ~4 rows." },
      { file: "src/pages/settings/WebhooksPage.tsx", component: "WebhooksPage", brief: "Settings > Webhooks. Return <SettingsLayout title='Webhooks' description='Notify external services on events.' saveBar={false}>. A 'Add endpoint' Button. A list of webhook Cards: each = a Webhook icon, the endpoint URL (mono), a row of event Badges (page.published, post.created, form.submitted), a StatusBadge active, last delivery line (success/failed with time), and Edit/Delete ghost actions + a Switch. ~3 endpoints. Then a small 'Recent deliveries' table (Event, Endpoint, Status code colored, Time)." },
    ],
  },
  {
    label: "settings-3-auth",
    pages: [
      { file: "src/pages/settings/IpAllowlistPage.tsx", component: "IpAllowlistPage", brief: "Settings > Security > IP allowlist. Return <SettingsLayout title='IP allowlist' description='Restrict admin access to trusted IPs.' saveBar={false}>. An 'Enable allowlist' Switch row Card at top + a warning callout (bg-warning-soft) that enabling may lock you out. An add row: IP/CIDR Input + Label Input + 'Add' Button. DataTable: IP/CIDR (mono), Label, Added by (PEOPLE), Added on (DATES), action ('Remove' ghost destructive). ~5 rows." },
      { file: "src/pages/settings/SessionsPage.tsx", component: "SessionsPage", brief: "Settings > Security > Sessions. Return <SettingsLayout title='Active sessions' description='Devices currently signed in.' saveBar={false}>. A 'Sign out all other sessions' destructive-outline Button. A list of session Cards: each = a device icon (Monitor/Smartphone/Tablet), browser+OS line ('Chrome on macOS'), location + IP (mono) muted, last active (RELATIVE_TIMES); the first one shows a success Badge 'This device', others show a 'Revoke' ghost button. ~4 sessions." },
      { file: "src/pages/settings/LoginAlertsPage.tsx", component: "LoginAlertsPage", brief: "Settings > Security > Login alerts. Return <SettingsLayout title='Login alerts' description='Get notified about account activity.'>. SettingsSections: 'Alerts' (Switch rows: New device sign-in, New location, Failed attempts, Password changed), 'Channels' (Email Switch + the email shown, Webhook Switch + a URL Input), then a 'Recent alerts' SettingsSection with a small list (icon + 'New device sign-in' + location + time + a Badge)." },
      { file: "src/pages/auth/TwoFactorPage.tsx", component: "TwoFactorPage", brief: "Auth 2FA. Return a Card (p-7 shadow-card) like LoginPage content (it renders inside AuthShell). Heading 'Two-factor authentication', muted 'Enter the 6-digit code from your authenticator app.'. A row of 6 single-character code Inputs (w-12 h-14 text-center text-lg, the first looks focused). A full-width 'Verify' Button (Link to '/'). A muted 'Didn't get a code? Resend' and a 'Use a backup code' link (Link /2fa). A back-to-sign-in link (Link /login)." },
      { file: "src/pages/auth/ResetPasswordPage.tsx", component: "ResetPasswordPage", brief: "Auth reset request. Return a Card (p-7 shadow-card). Heading 'Reset your password', muted 'Enter your email and we'll send a reset link.'. A Label+Input email field. A full-width 'Send reset link' Button (Link /reset/confirm). A centered 'Back to sign in' link (Link /login) with an ArrowLeft icon." },
      { file: "src/pages/auth/SetPasswordPage.tsx", component: "SetPasswordPage", brief: "Auth set new password. Return a Card (p-7 shadow-card). Heading 'Create a new password'. New password Input (type=password) + Confirm password Input. A password strength row: a Progress (value 70, tone success) + a muted 'Strong' label. A requirements checklist (Check icons text-success / muted): 8+ characters, one number, one symbol. A full-width 'Set password' Button (Link /login)." },
    ],
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

const buildPrompt = (batch) =>
  CONTRACT +
  "\n\n==== BUILD THESE PAGES (one .tsx file each) ====\n" +
  batch.pages
    .map(
      (p, i) =>
        `\n--- PAGE ${i + 1} ---\nFile: ${p.file}\nExport: export function ${p.component}() { ... }\nSpec: ${p.brief}`,
    )
    .join("\n") +
  "\n\nWrite every file, then return the JSON.";

phase("Generate pages");
log(`Generating ${BATCHES.reduce((n, b) => n + b.pages.length, 0)} pages across ${BATCHES.length} batches`);

const results = await parallel(
  BATCHES.map((batch) => () =>
    agent(buildPrompt(batch), { label: batch.label, phase: "Generate pages", schema: SCHEMA }),
  ),
);

const written = results.filter(Boolean).flatMap((r) => r.written ?? []);
log(`Done — ${written.length} files reported written`);
return { batches: results.map((r, i) => ({ label: BATCHES[i].label, result: r })), written };
