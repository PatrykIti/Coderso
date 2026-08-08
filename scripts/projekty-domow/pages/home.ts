import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import {
  FORMA_DOM_PAGE_GRADIENTS,
  FORMA_DOM_PAGE_PALETTE,
  FORMA_DOM_PAGE_SEO_DESCRIPTION,
  badge,
  buildPageSeed,
  button,
  group,
  heroHeading,
  list,
  section,
  sectionHeading,
  statistic,
  surface,
  text,
} from "./shared";

const safeHouseSvg = (id: string, label: string) =>
  createPageBlockV2("customSvg", {
    id,
    props: {
      svg: '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><path d="M24 142h272L246 62l-74 48-52-72-96 104Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M92 142V98h54v44m44 0V96h42v46" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
      drawIn: true,
      drawSpeed: 1800,
      label,
    },
    style: { textColor: FORMA_DOM_PAGE_PALETTE.aqua },
  });

const serviceCard = (
  id: string,
  number: string,
  title: string,
  copy: string,
  cta: string,
  href: string
) =>
  surface(id, [
    badge(`${id}-number`, number),
    sectionHeading(`${id}-title`, title),
    text(`${id}-copy`, copy),
    button(`${id}-cta`, cta, href, { variant: "link" }),
  ]);

const projectCard = (id: string, title: string, copy: string, href: string) =>
  createPageBlockV2("card", {
    id,
    props: { title, text: copy, image: null, href },
    style: {
      textColor: FORMA_DOM_PAGE_PALETTE.text,
      background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary,
      backgroundType: "color",
      borderColor: FORMA_DOM_PAGE_PALETTE.line,
      borderWidth: 1,
      borderStyle: "solid",
      radius: 24,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      hoverEffect: "lift",
    },
  });

const processCard = (id: string, number: string, title: string, copy: string) =>
  surface(id, [
    badge(`${id}-number`, number),
    sectionHeading(`${id}-title`, title),
    text(`${id}-copy`, copy),
  ]);

export const buildHomePage = () =>
  buildPageSeed({
    key: "home",
    route: "/",
    seo: {
      title: "Nowoczesne projekty domów — FormaDom Studio",
      description: FORMA_DOM_PAGE_SEO_DESCRIPTION,
    },
    sections: [
      section(
        "home-hero",
        "Hero",
        [
          group("home-hero-copy", [
            badge("home-eyebrow", "Pracownia projektów domów przyszłości"),
            heroHeading("home-title", "Dom, który wygląda jak przyszłość — i czuje się jak Ty."),
            text(
              "home-lead",
              "Projektujemy domy jednorodzinne z efektem „wow”: czyste bryły, światło, funkcjonalny układ i wizualizacje, które pozwalają poczuć przestrzeń zanim powstanie pierwszy fundament."
            ),
            group(
              "home-actions",
              [
                button("home-contact-cta", "Zaprojektujmy Twój dom", "/kontakt", {
                  magnetic: true,
                  size: "lg",
                }),
                button("home-projects-cta", "Zobacz projekty", "/projekty", {
                  variant: "ghost",
                  size: "lg",
                }),
              ],
              { direction: "row", wrap: true, gap: 14 }
            ),
            list("home-trust", ["Projekty indywidualne", "Wizualizacje 3D", "Proces online"]),
          ]),
          surface(
            "home-blueprint",
            [
              group(
                "home-blueprint-top",
                [
                  text("home-blueprint-concept", "Concept 07 / Modern Barn"),
                  text("home-blueprint-area", "142 m²"),
                ],
                { direction: "row", wrap: true }
              ),
              safeHouseSvg("home-blueprint-art", "Szkic domu Modern Barn"),
              group(
                "home-blueprint-chips",
                [
                  badge("home-chip-glass", "+ duże przeszklenia"),
                  badge("home-chip-energy", "A++ ready"),
                  badge("home-chip-vr", "VR / 3D"),
                ],
                { direction: "row", wrap: true, gap: 10 }
              ),
              group(
                "home-blueprint-metrics",
                [
                  statistic("home-metric-variants", "3", "warianty układu"),
                  statistic("home-metric-days", "21 dni", "koncepcja"),
                  statistic("home-metric-light", "96%", "światło dzienne"),
                ],
                { direction: "row", wrap: true, gap: 10 }
              ),
              button("home-scroll-link", "Przewiń do treści", "#intro", { variant: "link" }),
            ],
            {
              background: FORMA_DOM_PAGE_GRADIENTS.highlight,
              backgroundType: "gradient",
              composition: "layered",
              glow: { color: "rgba(142,232,255,.28)", blur: 48, spread: 2 },
            }
          ),
        ],
        {
          type: "hero",
          variant: "split",
          layout: { columns: 2, align: "center", maxWidth: 1240 },
          style: {
            background: FORMA_DOM_PAGE_GRADIENTS.hero,
            backgroundType: "gradient",
            columnTemplate: "minmax(0,1fr) minmax(420px,.9fr)",
            surfacePreset: "ambient-orbs",
            noiseOverlay: true,
          },
          spacing: { paddingTop: 112, paddingBottom: 96, gap: 50 },
        }
      ),
      section(
        "home-intro",
        "Intro",
        [
          sectionHeading(
            "home-intro-copy",
            "Nie robimy katalogowych „pudełek”. Tworzymy domy, które dobrze wyglądają, dobrze działają i dobrze się starzeją."
          ),
          group(
            "home-intro-ticker",
            ["minimalizm", "światło", "komfort", "technologia", "natura"].map((item, index) =>
              badge(`home-intro-ticker-${index + 1}`, item)
            ),
            {
              direction: "row",
              wrap: true,
              gap: 16,
              style: { marquee: { direction: "left", speed: 24 } },
            }
          ),
        ],
        {
          anchor: "intro",
          variant: "centered",
          layout: { columns: 1, align: "center", maxWidth: 980 },
          style: { background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary },
        }
      ),
      section(
        "home-services",
        "Co projektujemy",
        [
          badge("home-services-eyebrow", "Co projektujemy"),
          sectionHeading(
            "home-services-title",
            "Architektura, która od pierwszego spojrzenia mówi: to mój dom.",
            3
          ),
          text(
            "home-services-lead",
            "Prowadzimy Cię spokojnie, krok po kroku — od pierwszego zachwytu, przez poczucie, że jesteś w dobrych rękach, aż po jasny plan działania.",
            { colSpan: 3 }
          ),
          serviceCard(
            "home-service-individual",
            "01",
            "Projekty indywidualne",
            "Dom od zera dopasowany do działki, światła, stylu życia i budżetu inwestora.",
            "Poznaj zakres",
            "/oferta#indywidualne"
          ),
          serviceCard(
            "home-service-adaptation",
            "02",
            "Adaptacje gotowych projektów",
            "Modernizacja gotowego projektu tak, żeby nie wyglądał jak kompromis.",
            "Sprawdź adaptacje",
            "/oferta#adaptacje"
          ),
          serviceCard(
            "home-service-visualization",
            "03",
            "Wizualizacje 3D",
            "Fotorealistyczne ujęcia, animacje bryły i materiały, które budują emocje.",
            "Zobacz możliwości",
            "/oferta#wizualizacje"
          ),
        ],
        {
          type: "feature-grid",
          variant: "cards",
          layout: { columns: 3 },
          style: { background: FORMA_DOM_PAGE_PALETTE.background },
        }
      ),
      section(
        "home-switcher",
        "Style domów",
        [
          group("home-switcher-intro", [
            badge("home-switcher-eyebrow", "Interaktywne doświadczenie"),
            sectionHeading(
              "home-switcher-title",
              "Wybierz klimat, w którym czujesz się jak u siebie."
            ),
            text(
              "home-switcher-copy",
              "Dotknij stylu, a bryła i nastrój zmienią się w rytm Twoich upodobań. To mały test wyobraźni, zanim zaczniemy projektować naprawdę."
            ),
          ]),
          createPageBlockV2("switcher", {
            id: "home-style-switcher",
            props: {
              tabs: [
                { label: "Nowoczesna stodoła" },
                { label: "Miejska willa" },
                { label: "Dom eko" },
              ],
              activeIndex: 0,
              variant: "pill",
              ariaLabel: "Wybór stylu domu",
            },
            style: {
              background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary,
              backgroundType: "color",
              borderColor: FORMA_DOM_PAGE_PALETTE.line,
              borderWidth: 1,
              borderStyle: "solid",
              radius: 24,
              padding: { top: 24, right: 24, bottom: 24, left: 24 },
            },
            slots: {
              "panel:1": [
                text("home-style-barn-label", "Modern Barn", { fontWeight: "bold" }),
                text(
                  "home-style-barn-copy",
                  "Prosta, elegancka bryła, wysoki salon, naturalne materiały i duże przeszklenia otwierające dom na ogród."
                ),
                safeHouseSvg("home-style-barn-art", "Modern Barn"),
              ],
              "panel:2": [
                text("home-style-villa-label", "Urban Villa", { fontWeight: "bold" }),
                text(
                  "home-style-villa-copy",
                  "Horyzontalna kompozycja, reprezentacyjne wejście, prywatne patio i wyważony luksus bez krzykliwych detali."
                ),
                safeHouseSvg("home-style-villa-art", "Urban Villa"),
              ],
              "panel:3": [
                text("home-style-eco-label", "Eco Soft", { fontWeight: "bold" }),
                text(
                  "home-style-eco-copy",
                  "Ciepła architektura, zielone rozwiązania, kompaktowa forma i materiały, które budują przyjazny mikroklimat."
                ),
                safeHouseSvg("home-style-eco-art", "Eco Soft"),
              ],
            },
          }),
        ],
        {
          variant: "split",
          layout: { columns: 2, align: "center" },
          style: {
            background: FORMA_DOM_PAGE_GRADIENTS.aqua,
            backgroundType: "gradient",
            columnTemplate: "1fr 1.2fr",
          },
        }
      ),
      section(
        "home-projects",
        "Wybrane realizacje",
        [
          badge("home-projects-eyebrow", "Wybrane realizacje"),
          sectionHeading(
            "home-projects-title",
            "Domy, które chce się oglądać jak ulubiony album z architekturą.",
            3
          ),
          button("home-projects-all", "Pełne portfolio", "/projekty", { variant: "ghost" }),
          projectCard(
            "home-project-aurora",
            "Dom Aurora",
            "Nowoczesna stodoła · 142 m² · ogród południowy",
            "/projekty/aurora"
          ),
          projectCard(
            "home-project-linea",
            "Dom Linea",
            "Minimalistyczna willa · 188 m²",
            "/projekty"
          ),
          projectCard("home-project-nova", "Dom Nova", "Parterowy premium · 121 m²", "/projekty"),
        ],
        {
          type: "gallery",
          variant: "grid",
          layout: { columns: 3 },
          style: { background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary },
        }
      ),
      section(
        "home-process",
        "Proces bez chaosu",
        [
          badge("home-process-eyebrow", "Proces bez chaosu"),
          sectionHeading("home-process-title", "Od pierwszej rozmowy do gotowego projektu.", 4),
          text(
            "home-process-lead",
            "Każdy etap ma prosty cel, jasne decyzje i materiały wizualne, które ułatwiają wybór.",
            { colSpan: 4 }
          ),
          processCard(
            "home-process-brief",
            "01",
            "Brief i działka",
            "Analiza potrzeb, ograniczeń, stron świata i potencjału widokowego."
          ),
          processCard(
            "home-process-concept",
            "02",
            "Koncepcja wow",
            "Układ funkcjonalny, bryła, nastrój i pierwsze wizualizacje."
          ),
          processCard(
            "home-process-project",
            "03",
            "Projekt budowlany",
            "Dokumentacja techniczna i koordynacja branżowa."
          ),
          processCard(
            "home-process-support",
            "04",
            "Wsparcie",
            "Konsultacje materiałowe, zmiany i przygotowanie do budowy."
          ),
        ],
        {
          type: "timeline",
          variant: "grid",
          layout: { columns: 4 },
          style: { background: FORMA_DOM_PAGE_PALETTE.background },
        }
      ),
      section(
        "home-cta",
        "Final CTA",
        [
          badge("home-cta-eyebrow", "Gotowy na własny dom?"),
          sectionHeading(
            "home-cta-title",
            "Zaprojektujmy dom, do którego codziennie chce się wracać."
          ),
          text(
            "home-cta-copy",
            "Napisz kilka słów o działce i stylu, który lubisz — odezwiemy się z pierwszym pomysłem na Twój dom.",
            { align: "center" }
          ),
          button("home-cta-button", "Umów konsultację", "/kontakt", {
            magnetic: true,
            size: "lg",
            style: { align: "center" },
          }),
        ],
        {
          type: "cta",
          variant: "centered",
          layout: { columns: 1, align: "center", justify: "center", maxWidth: 920 },
          style: {
            background: FORMA_DOM_PAGE_GRADIENTS.highlight,
            backgroundType: "gradient",
            surfacePreset: "radial-glow",
          },
        }
      ),
    ],
  });
