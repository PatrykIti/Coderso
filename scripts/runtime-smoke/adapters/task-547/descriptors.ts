import { createHash } from "node:crypto";

import { SmokeError, type SmokeProfileId } from "../../contracts";
import type { PlainJsonValue } from "../../workers/contracts";

export type Task547AssertionKind =
  | "aria"
  | "computed-style"
  | "content"
  | "dom"
  | "geometry"
  | "lifecycle"
  | "locale"
  | "motion"
  | "network"
  | "persistence"
  | "security"
  | "seo";

export interface Task547Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Task547AssertionDescriptor {
  readonly id: string;
  readonly kind: Task547AssertionKind;
  readonly target: string;
  readonly expected: PlainJsonValue;
}

export interface Task547ScenarioDescriptor {
  readonly number: number;
  readonly id: string;
  readonly logicalGroup: "wf547smoke" | "wf547formdesign" | "wf547pageeditor";
  readonly url: string | readonly string[];
  readonly viewport: Task547Viewport;
  readonly assertions: readonly Task547AssertionDescriptor[];
}

const DESCRIPTION =
  "Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.";
const SUCCESS = "Dziękujemy! Odezwiemy się z pierwszym pomysłem na Twój dom — do usłyszenia.";
const SUPPORTING_TEXT =
  "Odpisujemy zwykle w ciągu jednego dnia roboczego. Bez zobowiązań i bez sprzedażowej presji.";

const eq = (value: PlainJsonValue): PlainJsonValue => Object.freeze({ $equals: value });
const min = (value: number): PlainJsonValue => Object.freeze({ $min: value });
const max = (value: number): PlainJsonValue => Object.freeze({ $max: value });

function assertion(
  id: string,
  kind: Task547AssertionKind,
  target: string,
  expected: PlainJsonValue
): Task547AssertionDescriptor {
  return Object.freeze({ id, kind, target, expected });
}

function scenario(
  number: number,
  id: string,
  logicalGroup: Task547ScenarioDescriptor["logicalGroup"],
  url: Task547ScenarioDescriptor["url"],
  viewport: Task547Viewport,
  assertions: readonly Task547AssertionDescriptor[]
): Task547ScenarioDescriptor {
  return Object.freeze({
    number,
    id,
    logicalGroup,
    url: Array.isArray(url) ? Object.freeze([...url]) : url,
    viewport: Object.freeze({ ...viewport }),
    assertions: Object.freeze([...assertions]),
  });
}

const ROUTES = Object.freeze([
  ["/", "Nowoczesne projekty domów — FormaDom Studio"],
  ["/oferta", "Oferta — FormaDom Studio"],
  ["/projekty", "Projekty domów — FormaDom Studio"],
  ["/proces", "Proces projektowy — FormaDom Studio"],
  ["/cennik", "Cennik — FormaDom Studio"],
  ["/o-nas", "O nas — FormaDom Studio"],
  ["/kontakt", "Kontakt — FormaDom Studio"],
  ["/projekty/aurora", "Dom Aurora — projekt pokazowy — FormaDom Studio"],
] as const);

const ROUTE_COPY = Object.freeze([
  [
    "/",
    "Dom, który wygląda jak przyszłość — i czuje się jak Ty.",
    "Projektujemy domy jednorodzinne z efektem „wow”: czyste bryły, światło, funkcjonalny układ i wizualizacje, które pozwalają poczuć przestrzeń zanim powstanie pierwszy fundament.",
  ],
  [
    "/oferta",
    "Od pierwszej koncepcji po dokumentację gotową do budowy.",
    "Prowadzimy Cię przez cały proces — od pierwszego szkicu po dokumentację gotową do budowy. Wybierz zakres, który pasuje do miejsca, w którym teraz jesteś.",
  ],
  [
    "/projekty",
    "Domy, w których łatwo wyobrazić sobie własne życie.",
    "Przeglądaj po klimacie, metrażu albo stylu i znajdź projekt, przy którym pomyślisz: „właśnie o czymś takim marzyłem”.",
  ],
  [
    "/proces",
    "Spokojna droga od pierwszej rozmowy do gotowego projektu.",
    "Bez chaosu i niedomówień. Na każdym etapie wiesz, co się dzieje, jaką decyzję podejmujemy i co będzie dalej.",
  ],
  [
    "/cennik",
    "Jasne zasady od pierwszej rozmowy — bez ukrytych kosztów.",
    "Poniższe kwoty to orientacyjny punkt wyjścia. Ostateczną wycenę zawsze dopasowujemy do Twojej działki, zakresu i marzeń.",
  ],
  [
    "/o-nas",
    "Łączymy architekturę, technologię i emocje pierwszego wrażenia.",
    "Jesteśmy niewielką pracownią, która projektuje z uważnością — tak, by Twój dom był piękny, wygodny i dobrze się starzał przez lata.",
  ],
  [
    "/kontakt",
    "Opowiedz nam o działce, marzeniu albo pomyśle na dom.",
    "Nie musisz mieć gotowego planu ani wiedzy technicznej. Wystarczy kilka zdań — resztę spokojnie ustalimy razem.",
  ],
  [
    "/projekty/aurora",
    "Dom Aurora",
    "Nowoczesna stodoła z wysoką strefą dzienną, dużym przeszkleniem od ogrodu i spokojną elewacją z drewna oraz grafitowej blachy.",
  ],
] as const);

const PORTFOLIO_CARDS = Object.freeze([
  ["Dom Aurora", "142 m² · stodoła · eko", "/projekty/aurora"],
  ["Dom Linea", "188 m² · miejska willa", "/projekty"],
  ["Dom Nova", "121 m² · parterowy", "/projekty"],
  ["Dom Mono", "156 m² · czarna elewacja", "/projekty"],
  ["Dom Vista", "206 m² · willa z patio", "/projekty"],
  ["Dom Calm", "98 m² · kompaktowy", "/projekty"],
] as const);

const ineligibleDetail = () => ({
  status: 404,
  resolverOutcome: "detail_not_found_before_metadata",
  resolvedDetailDocumentKeys: [],
  renderedProjectDetailRootSelectors: [],
  renderedProjectDetailBlockIds: [],
  installedProjectTitleMatches: [],
  installedProjectDetailCorpusMatches: [],
  dynamicDetailSeoTitleMatches: [],
  dynamicDetailSeoDescriptionMatches: [],
  canonicalHrefs: [],
});

const HOME_ASSERTIONS = Object.freeze([
  assertion("home-hero-geometry", "geometry", "main h1 closest section", {
    visible: eq(true),
    height: min(300),
    width: min(300),
  }),
  assertion("home-header-appearance", "computed-style", "header", {
    position: eq("sticky"),
    backgroundVisibleAfterScroll: eq(true),
  }),
  assertion(
    "home-reference-copy-and-facts",
    "content",
    "home hero",
    eq({
      heading: ROUTE_COPY[0][1],
      concept: "Concept 07 / Modern Barn",
      area: "142 m²",
      facts: [
        ["3", "warianty układu"],
        ["21 dni", "koncepcja"],
        ["96%", "światło dzienne"],
      ],
    })
  ),
  assertion(
    "home-switcher-control-order",
    "dom",
    '[role="tablist"]',
    eq(["Nowoczesna stodoła", "Miejska willa", "Dom eko"])
  ),
  assertion(
    "home-switcher-visible-states",
    "dom",
    '[role="tabpanel"]',
    eq([
      [
        "Nowoczesna stodoła",
        "Modern Barn",
        "Prosta, elegancka bryła, wysoki salon, naturalne materiały i duże przeszklenia otwierające dom na ogród.",
      ],
      [
        "Miejska willa",
        "Urban Villa",
        "Horyzontalna kompozycja, reprezentacyjne wejście, prywatne patio i wyważony luksus bez krzykliwych detali.",
      ],
      [
        "Dom eko",
        "Eco Soft",
        "Ciepła architektura, zielone rozwiązania, kompaktowa forma i materiały, które budują przyjazny mikroklimat.",
      ],
    ])
  ),
  assertion("home-interaction-effects", "computed-style", "authored interactive surface", {
    pointerTransformChanged: eq(true),
    keyboardStateVisible: eq(true),
  }),
  assertion("home-switcher-accessible-name", "aria", '[role="tablist"]', eq("Wybór stylu domu")),
  assertion("home-reduced-motion", "motion", "authored motion surface", {
    transitionDurationMs: max(1),
    transform: eq("none"),
  }),
]);

const SHELL_ASSERTIONS = Object.freeze([
  assertion(
    "all-public-routes-status",
    "network",
    "public route matrix",
    eq(ROUTES.map(([path]) => [path, 200]))
  ),
  assertion(
    "desktop-shell-links",
    "dom",
    "header/footer navigation",
    eq(["/", "/oferta", "/projekty", "/proces", "/cennik", "/o-nas", "/kontakt"])
  ),
  assertion("public-route-headings-and-leads", "content", "route headings/leads", eq(ROUTE_COPY)),
  assertion("public-seo-titles", "seo", "document.title", eq(ROUTES)),
  assertion(
    "public-seo-description",
    "seo",
    'meta[name="description"]',
    eq(ROUTES.map(([path]) => [path, DESCRIPTION]))
  ),
  assertion(
    "public-document-language",
    "locale",
    "html[lang]",
    eq(ROUTES.map(([path]) => [path, "pl"]))
  ),
]);

const TABLET_ASSERTIONS = Object.freeze([
  assertion("tablet-no-horizontal-overflow", "geometry", "documentElement", {
    scrollWidthDelta: max(0),
  }),
  assertion("tablet-navigation-mode", "dom", "header navigation", {
    desktopVisible: eq(true),
    mobileToggleVisible: eq(false),
  }),
  assertion("tablet-asymmetric-layout", "geometry", "section grids", {
    distinctColumnWidths: eq(true),
    minimumGap: min(12),
  }),
  assertion("tablet-portfolio-columns", "geometry", "portfolio grid", { columns: eq(3) }),
  assertion("tablet-form-layout", "geometry", "contact form", {
    columns: eq(2),
    controlsWithinViewport: eq(true),
  }),
]);

const MOBILE_ASSERTIONS = Object.freeze([
  assertion("mobile-menu-collapsed", "aria", "mobile navigation", {
    disclosureOpen: eq(false),
    listVisible: eq(false),
  }),
  assertion("mobile-menu-expanded", "aria", "mobile navigation", {
    disclosureOpen: eq(true),
    listVisible: eq(true),
  }),
  assertion("mobile-navigation-geometry", "geometry", "mobile navigation", {
    withinViewport: eq(true),
    linkCount: eq(7),
  }),
  assertion("mobile-one-column-layouts", "geometry", "public section grids", {
    maximumColumns: max(1),
  }),
  assertion("mobile-no-horizontal-overflow", "geometry", "documentElement", {
    scrollWidthDelta: max(0),
  }),
]);

const PORTFOLIO_ASSERTIONS = Object.freeze([
  assertion(
    "portfolio-control-order",
    "dom",
    "portfolio filters",
    eq(["Wszystkie", "Nowoczesna stodoła", "Wille", "Parterowe", "Energooszczędne"])
  ),
  assertion("portfolio-reference-order", "content", "portfolio cards", eq(PORTFOLIO_CARDS)),
  assertion(
    "portfolio-card-destinations",
    "dom",
    "portfolio card links",
    eq(PORTFOLIO_CARDS.map(([title, , href]) => [title, href]))
  ),
  assertion("portfolio-no-visible-card-cta", "dom", "portfolio cards", {
    visibleCardCtaCount: eq(0),
  }),
  assertion("portfolio-barn-visible-set", "dom", "barn filter", eq(["Dom Aurora", "Dom Mono"])),
  assertion("portfolio-villa-visible-set", "dom", "villa filter", eq(["Dom Linea", "Dom Vista"])),
  assertion("portfolio-single-visible-set", "dom", "single filter", eq(["Dom Nova", "Dom Calm"])),
  assertion(
    "portfolio-eco-visible-set",
    "dom",
    "eco filter",
    eq(["Dom Aurora", "Dom Nova", "Dom Vista"])
  ),
  assertion("portfolio-filter-url-reset", "dom", "location/filter reset", {
    selectedPath: eq("/projekty"),
    selectedFilterValue: eq("eco"),
    selectedUsesCanonicalName: eq(true),
    resetUrl: eq("/projekty"),
  }),
  assertion("portfolio-no-js-get", "network", "canonical portfolio filter GET", {
    status: eq(200),
    visible: eq(["Dom Aurora", "Dom Nova", "Dom Vista"]),
  }),
]);

const AURORA_ASSERTIONS = Object.freeze([
  assertion("aurora-route-resolution", "network", "/projekty/aurora", {
    status: eq(200),
    canonicalPath: eq("/projekty/aurora"),
  }),
  assertion("aurora-entry-bindings", "content", "detail bindings", {
    entryKey: eq("aurora"),
    detailTemplateResolved: eq(true),
  }),
  assertion(
    "aurora-six-slug-eligibility",
    "network",
    "project detail route matrix",
    eq({
      "/projekty/aurora": {
        status: 200,
        title: ROUTES[7][1],
        description: DESCRIPTION,
        capturedInstalledPublicOrigin: "http://127.0.0.1:3000",
        canonicalHref: "http://127.0.0.1:3000/projekty/aurora",
      },
      "/projekty/linea": ineligibleDetail(),
      "/projekty/nova": ineligibleDetail(),
      "/projekty/mono": ineligibleDetail(),
      "/projekty/vista": ineligibleDetail(),
      "/projekty/calm": ineligibleDetail(),
    })
  ),
  assertion("aurora-reference-lead", "content", "detail lead", eq(ROUTE_COPY[7][2])),
  assertion("aurora-hero-art-geometry", "geometry", "project hero art", {
    surfaceCount: eq(2),
    desktopLayout: eq("side-by-side"),
    tabletLayout: eq("stacked"),
    mobileLayout: eq("stacked"),
    nonZeroRectangles: eq(6),
    resolvedBackgrounds: eq(["rgb(142, 232, 255)", "rgb(199, 183, 255)"]),
  }),
  assertion(
    "aurora-reference-statistics",
    "content",
    "project statistics",
    eq([
      ["142 m²", "powierzchnia"],
      ["4", "sypialnie"],
      ["2", "łazienki"],
      ["A++", "standard energii"],
    ])
  ),
  assertion(
    "aurora-contact-cta",
    "dom",
    "project contact action",
    eq({
      label: "Chcę podobny dom",
      href: "/kontakt",
      afterStatistics: true,
      beforeAssumptions: true,
    })
  ),
  assertion(
    "aurora-reference-assumptions",
    "content",
    "project assumptions",
    eq([
      [
        "Strefa dzienna",
        "Salon z wysokim sufitem, wyjście na taras, kuchnia z wyspą i ukryta spiżarnia.",
      ],
      [
        "Strefa prywatna",
        "Sypialnia master z garderobą, trzy pokoje oraz kompaktowa strefa pracy.",
      ],
      ["Elewacja", "Drewno, grafit, ciepłe światło i proste detale bez zbędnych ozdobników."],
    ])
  ),
  assertion(
    "aurora-gallery-content",
    "content",
    "project gallery",
    eq(["tall", "default", "warm"])
  ),
  assertion("aurora-gallery-geometry", "geometry", "project gallery", {
    cardCount: eq(3),
    firstCardTaller: eq(true),
  }),
  assertion("aurora-specification-geometry", "geometry", "project statistics", {
    columns: eq(4),
    visible: eq(true),
  }),
  assertion(
    "aurora-seo",
    "seo",
    "document head",
    eq({ title: ROUTES[7][1], description: DESCRIPTION })
  ),
]);

const CONTACT_ASSERTIONS = Object.freeze([
  assertion(
    "contact-reference-fields-and-options",
    "content",
    "public contact form",
    eq({
      fields: [
        ["Imię i nazwisko", "Jan Kowalski"],
        ["E-mail", "jan@email.pl"],
        ["Na jakim jesteś etapie?", null],
        ["Krótki opis", "Napisz, jaki dom Ci się marzy, gdzie jest działka i jaki styl lubisz."],
        ["Zgoda na kontakt w sprawie zapytania", false],
      ],
      stageOptions: [
        "Mam działkę",
        "Szukam działki",
        "Mam gotowy projekt do adaptacji",
        "Chcę tylko konsultację",
      ],
    })
  ),
  assertion(
    "contact-reference-native-presentation",
    "dom",
    "public contact form",
    eq({
      firstOption: "Mam działkę",
      defaultValue: "Mam działkę",
      hasBlankPrompt: false,
      textareaRows: 5,
      pendingLabel: "Wysyłanie...",
    })
  ),
  assertion(
    "contact-reference-submit-note-success",
    "content",
    "form submit region",
    eq({
      submit: "Wyślij brief",
      note: SUPPORTING_TEXT,
      success: SUCCESS,
    })
  ),
  assertion("contact-invalid-rejected", "dom", "public form validation", {
    invalidStatus: eq(400),
    fieldErrorsVisible: eq(true),
  }),
  assertion("contact-nonce-contract", "security", "public form nonce", {
    missingStatus: eq(400),
    alteredStatus: eq(403),
    validStatus: eq(200),
  }),
  assertion("contact-captcha-policy", "security", "public_write CAPTCHA", {
    action: eq("public_write"),
    configuredFailureStatus: eq(400),
    disabledStatus: eq(200),
  }),
  assertion(
    "contact-internal-session-contract",
    "security",
    "scoped internal form",
    eq({
      mount: "/admin/api/forms/:id/submissions",
      principal: "coherent-session",
      formSource: "scoped-internal-fixture",
      submissionAccess: "internal",
      permission: "forms:write",
      csrf: "valid",
      rateLimit: "admin_write",
      outcome: "accepted",
    })
  ),
  assertion(
    "contact-internal-api-key-contract",
    "security",
    "scoped internal form",
    eq({
      mount: "/admin/api/forms/:id/submissions",
      principal: "api-key",
      formSource: "scoped-internal-fixture",
      submissionAccess: "internal",
      scope: "forms.submit",
      cookieCsrf: "not-applicable",
      rateLimit: "admin_write",
      outcome: "accepted",
    })
  ),
  assertion(
    "contact-internal-anonymous-rejected",
    "security",
    "scoped internal form",
    eq({
      mount: "/admin/api/forms/:id/submissions",
      principal: "anonymous",
      status: 401,
      formSource: "scoped-internal-fixture",
      submissionAccess: "internal",
      createdSubmissionIds: [],
    })
  ),
  assertion("contact-scoped-submission", "persistence", "registered submission", {
    createdCount: eq(3),
    markerMatched: eq(true),
  }),
  assertion("contact-success-action", "dom", "public form success", {
    message: eq(SUCCESS),
    supportingTextVisible: eq(false),
  }),
  assertion("contact-controls-remain-visible", "dom", "public form body", {
    visibleControlCount: min(5),
    bodyVisible: eq(true),
  }),
]);

const PUBLISH_ASSERTIONS = Object.freeze([
  assertion("publish-front-parity", "content", "installed public resources", {
    pageStatus: eq(200),
    projectStatus: eq(200),
    contactStatus: eq(200),
  }),
  assertion(
    "publish-lifecycle-order",
    "lifecycle",
    "native install state",
    eq({
      stagedThenPublished: ["page", "entry", "detail_page", "menu"],
      directPublished: ["form"],
      statusless: ["listing_template"],
      enabledOnlyOnAction: true,
    })
  ),
  assertion(
    "installed-fixture-continuity",
    "lifecycle",
    "installed resource identities",
    eq({
      formResource: "project-brief",
      pageResources: ["home", "projects", "contact"],
      available: true,
    })
  ),
]);

const adminForm = (id: string, assertions: readonly Task547AssertionDescriptor[]) =>
  scenario(
    0,
    id,
    "wf547formdesign",
    "http://127.0.0.1:5173/admin/advanced/forms/{formId}",
    {
      width: id === "form-design-reset-mobile" ? 390 : 1440,
      height: id === "form-design-reset-mobile" ? 844 : 1000,
    },
    assertions
  );

const adminPage = (id: string, assertions: readonly Task547AssertionDescriptor[]) =>
  scenario(
    0,
    id,
    "wf547pageeditor",
    "http://127.0.0.1:5173/admin/pages/{pageId}",
    {
      width: id === "page-editor-switcher-tablet-reset" ? 1024 : 1440,
      height: id === "page-editor-switcher-tablet-reset" ? 1366 : 1000,
    },
    assertions
  );

const FORM_DESIGN = Object.freeze([
  adminForm("form-design-author-light", [
    assertion(
      "form-design-light-control-value",
      "dom",
      "supporting-text control",
      eq("TASK-547 light supporting text")
    ),
    assertion(
      "form-design-light-canvas-text",
      "dom",
      "form canvas",
      eq("TASK-547 light supporting text")
    ),
    assertion(
      "form-design-light-preview-text",
      "dom",
      "runtime preview",
      eq("TASK-547 light supporting text")
    ),
    assertion("form-design-light-placement", "geometry", "runtime preview", {
      afterSubmit: eq(true),
      occurrenceCount: eq(1),
      gapPx: min(0),
    }),
  ]),
  adminForm("form-design-author-dark", [
    assertion(
      "form-design-dark-control-value",
      "dom",
      "supporting-text control",
      eq("TASK-547 dark supporting text")
    ),
    assertion(
      "form-design-dark-preview-text",
      "dom",
      "runtime preview",
      eq("TASK-547 dark supporting text")
    ),
    assertion("form-design-dark-computed-contrast", "computed-style", "runtime preview text", {
      theme: eq("dark"),
      color: Object.freeze({ $nonEmptyString: true }),
      backgroundColor: Object.freeze({ $nonEmptyString: true }),
      contrastRatio: min(4.5),
    }),
    assertion("form-design-dark-placement", "geometry", "runtime preview", {
      afterSubmit: eq(true),
      occurrenceCount: eq(1),
      gapPx: min(0),
    }),
  ]),
  adminForm("form-design-reset-mobile", [
    assertion("form-design-reset-control-empty", "dom", "supporting-text control", eq("")),
    assertion(
      "form-design-reset-persisted-key-absent",
      "persistence",
      "form settings",
      eq({ ownKey: false })
    ),
    assertion("form-design-reset-preview-node-absent", "dom", "runtime preview", eq({ count: 0 })),
    assertion(
      "form-design-reset-public-bytes-absent",
      "content",
      "public form HTML",
      eq({ markerCount: 0 })
    ),
    assertion("form-design-reset-mobile-geometry", "geometry", "runtime preview", {
      overflowX: max(0),
      withinViewport: eq(true),
      width: max(390),
    }),
  ]),
  adminForm("form-design-save-reload", [
    assertion(
      "form-design-save-persisted-value",
      "persistence",
      "form settings",
      eq("TASK-547 persisted supporting text")
    ),
    assertion(
      "form-design-save-navigation-roundtrip",
      "dom",
      "supporting-text control",
      eq("TASK-547 persisted supporting text")
    ),
    assertion(
      "form-design-save-reload-roundtrip",
      "dom",
      "supporting-text control",
      eq("TASK-547 persisted supporting text")
    ),
    assertion(
      "form-design-dirty-state-protection",
      "persistence",
      "form editor cache",
      eq({
        dirtyValuePreserved: true,
        backgroundOverwriteCount: 0,
      })
    ),
  ]),
  scenario(
    13,
    "form-design-publish-front",
    "wf547formdesign",
    "http://127.0.0.1:3000/kontakt",
    { width: 1440, height: 1000 },
    [
      assertion("form-design-front-initial-note", "dom", "public form note", eq(SUPPORTING_TEXT)),
      assertion("form-design-front-success-message", "dom", "public form alert", eq(SUCCESS)),
      assertion("form-design-front-controls-visible", "geometry", "public form body", {
        visible: eq(true),
        controlCount: min(5),
        height: min(1),
      }),
      assertion(
        "form-design-front-admin-public-parity",
        "content",
        "admin/public note",
        eq({
          equal: true,
          value: SUPPORTING_TEXT,
        })
      ),
      assertion(
        "form-design-front-submission-registered",
        "persistence",
        "registered submission",
        eq({
          attached: true,
          markerRegisteredBeforeDispatch: true,
        })
      ),
    ]
  ),
]);

const PAGE_EDITOR = Object.freeze([
  adminPage("page-editor-switcher-author-light", [
    assertion(
      "page-editor-switcher-control-value",
      "dom",
      "Tab list label control",
      eq("Wybór stylu domu")
    ),
    assertion(
      "page-editor-switcher-base-prop",
      "persistence",
      "switcher base prop",
      eq("Wybór stylu domu")
    ),
    assertion("page-editor-switcher-canvas-aria", "aria", "canvas tablist", eq("Wybór stylu domu")),
    assertion("page-editor-switcher-light-geometry", "geometry", "page canvas", {
      visible: eq(true),
      withinViewport: eq(true),
      width: min(1),
      height: min(1),
    }),
  ]),
  adminPage("page-editor-switcher-tablet-reset", [
    assertion(
      "page-editor-tablet-base-prop-updated",
      "persistence",
      "switcher base prop",
      eq("Wybór stylu domu — tablet")
    ),
    assertion(
      "page-editor-tablet-responsive-override-absent",
      "persistence",
      "tablet override",
      eq({ ownKey: false, deviceContext: "tablet" })
    ),
    assertion(
      "page-editor-tablet-reset-key-absent",
      "persistence",
      "switcher base prop",
      eq({ ownKey: false })
    ),
    assertion(
      "page-editor-tablet-reset-fallback-aria",
      "aria",
      "canvas tablist",
      eq("Content tabs")
    ),
  ]),
  adminPage("page-editor-collection-cta-dark", [
    assertion("page-editor-collection-control-value", "dom", "Show card action control", eq(false)),
    assertion(
      "page-editor-collection-card-link-preserved",
      "dom",
      "collection cards",
      eq({ allCardsLinked: true, linkCount: 6 })
    ),
    assertion(
      "page-editor-collection-cta-visibly-absent",
      "dom",
      "collection cards",
      eq({ visibleCtaCount: 0 })
    ),
    assertion(
      "page-editor-collection-dark-computed-contrast",
      "computed-style",
      "collection canvas",
      {
        theme: eq("dark"),
        color: Object.freeze({ $nonEmptyString: true }),
        backgroundColor: Object.freeze({ $nonEmptyString: true }),
        contrastRatio: min(4.5),
      }
    ),
  ]),
  adminPage("page-editor-form-presentation-save-reload", [
    assertion(
      "page-editor-form-controls-values",
      "dom",
      "form presentation controls",
      eq({
        textareaRows: 5,
        showSelectPrompt: false,
        loadingLabel: "Wysyłanie...",
        successBehavior: "show-message-keep-form",
      })
    ),
    assertion(
      "page-editor-form-visible-preview",
      "dom",
      "form canvas",
      eq({
        textareaRows: 5,
        firstSelectOption: "Mam działkę",
        loadingLabel: "Wysyłanie...",
        controlsVisible: true,
      })
    ),
    assertion(
      "page-editor-form-save-reload-roundtrip",
      "persistence",
      "reloaded form block",
      eq({
        textareaRows: 6,
        showSelectPrompt: false,
        loadingLabel: "Wysyłanie...",
        successBehavior: "show-message-keep-form",
      })
    ),
    assertion(
      "page-editor-form-runtime-contract",
      "dom",
      "public-form contract",
      eq({
        successMessage: SUCCESS,
        formBodyVisible: true,
      })
    ),
  ]),
  scenario(
    18,
    "page-editor-publish-front-parity",
    "wf547pageeditor",
    Object.freeze([
      "http://127.0.0.1:3000/",
      "http://127.0.0.1:3000/projekty",
      "http://127.0.0.1:3000/kontakt",
    ]),
    { width: 390, height: 844 },
    [
      assertion("page-editor-front-switcher-aria", "aria", "home tablist", eq("Wybór stylu domu")),
      assertion(
        "page-editor-front-project-card-links-without-cta",
        "dom",
        "project cards",
        eq({
          allCardsLinked: true,
          linkCount: 6,
          visibleCtaCount: 0,
        })
      ),
      assertion(
        "page-editor-front-contact-presentation-and-success",
        "dom",
        "contact form",
        eq({
          publishStatus: 200,
          textareaRows: 6,
          firstSelectOption: "Mam działkę",
          loadingLabel: "Wysyłanie...",
          successMessage: SUCCESS,
        })
      ),
      assertion("page-editor-front-controls-visible", "geometry", "contact form body", {
        visible: eq(true),
        controlCount: min(5),
        height: min(1),
      }),
      assertion("page-editor-front-mobile-geometry", "geometry", "public documents", {
        overflowX: max(0),
        maximumColumns: max(1),
      }),
      assertion(
        "page-editor-front-submission-registered",
        "persistence",
        "registered submission",
        eq({
          attached: true,
          markerRegisteredBeforeDispatch: true,
        })
      ),
    ]
  ),
]);

export const TASK_547_SCENARIOS: readonly Task547ScenarioDescriptor[] = Object.freeze([
  scenario(
    1,
    "home-desktop-effects",
    "wf547smoke",
    "http://127.0.0.1:3000/",
    { width: 1440, height: 1000 },
    HOME_ASSERTIONS
  ),
  scenario(
    2,
    "all-routes-desktop-shell",
    "wf547smoke",
    "http://127.0.0.1:3000/",
    { width: 1440, height: 1000 },
    SHELL_ASSERTIONS
  ),
  scenario(
    3,
    "tablet-responsive",
    "wf547smoke",
    "http://127.0.0.1:3000/",
    { width: 1024, height: 1366 },
    TABLET_ASSERTIONS
  ),
  scenario(
    4,
    "mobile-navigation",
    "wf547smoke",
    "http://127.0.0.1:3000/",
    { width: 390, height: 844 },
    MOBILE_ASSERTIONS
  ),
  scenario(
    5,
    "portfolio-facets",
    "wf547smoke",
    "http://127.0.0.1:3000/projekty",
    { width: 1440, height: 1000 },
    PORTFOLIO_ASSERTIONS
  ),
  scenario(
    6,
    "aurora-detail",
    "wf547smoke",
    "http://127.0.0.1:3000/projekty/aurora",
    { width: 1440, height: 1000 },
    AURORA_ASSERTIONS
  ),
  scenario(
    7,
    "contact-form",
    "wf547smoke",
    "http://127.0.0.1:3000/kontakt",
    { width: 1440, height: 1000 },
    CONTACT_ASSERTIONS
  ),
  scenario(
    8,
    "publish-lifecycle-parity",
    "wf547smoke",
    "http://127.0.0.1:3000/",
    { width: 1440, height: 1000 },
    PUBLISH_ASSERTIONS
  ),
  ...FORM_DESIGN.map((item, index) => Object.freeze({ ...item, number: index + 9 })),
  ...PAGE_EDITOR.map((item, index) => Object.freeze({ ...item, number: index + 14 })),
]);

export const TASK_547_DESCRIPTOR_SHA256 = createHash("sha256")
  .update(JSON.stringify(TASK_547_SCENARIOS))
  .digest("hex");

export function task547ScenarioDescriptors(
  profile: SmokeProfileId
): readonly Task547ScenarioDescriptor[] {
  if (profile !== "fast" && profile !== "certification") {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 profile is unsupported");
  }
  return TASK_547_SCENARIOS;
}

export function requireTask547Descriptor(id: string): Task547ScenarioDescriptor {
  const found = TASK_547_SCENARIOS.find((item) => item.id === id);
  if (found === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-547 scenario is unregistered");
  }
  return found;
}
