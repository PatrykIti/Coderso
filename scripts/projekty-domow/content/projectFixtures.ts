import type { HouseProjectCategory } from "./constants";

export type ProjectDetailStat = {
  id: string;
  value: string;
  label: string;
};

export type ProjectAssumption = {
  id: string;
  title: string;
  description: string;
};

export type ProjectFixture = {
  key: string;
  title: string;
  slug: string;
  cardDescription: string;
  cardHref: "/projekty/aurora" | "/projekty";
  area: number;
  categories: readonly HouseProjectCategory[];
  referenceOrder: number;
  seoDescription: string;
  detailEyebrow?: string;
  detailLead?: string;
  detailStats?: readonly ProjectDetailStat[];
  assumptionsEyebrow?: string;
  assumptionsTitle?: string;
  assumptionsLead?: string;
  assumptions?: readonly ProjectAssumption[];
};

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export const PROJECT_SEO_DESCRIPTION =
  "Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.";

export const PROJECT_FIXTURES: readonly ProjectFixture[] = deepFreeze<ProjectFixture[]>([
  {
    key: "aurora",
    title: "Dom Aurora",
    slug: "aurora",
    cardDescription: "142 m² · stodoła · eko",
    cardHref: "/projekty/aurora",
    area: 142,
    categories: ["barn", "eco"],
    referenceOrder: 0,
    seoDescription: PROJECT_SEO_DESCRIPTION,
    detailEyebrow: "Projekt pokazowy",
    detailLead:
      "Nowoczesna stodoła z wysoką strefą dzienną, dużym przeszkleniem od ogrodu i spokojną elewacją z drewna oraz grafitowej blachy.",
    detailStats: [
      { id: "area", value: "142 m²", label: "powierzchnia" },
      { id: "bedrooms", value: "4", label: "sypialnie" },
      { id: "bathrooms", value: "2", label: "łazienki" },
      { id: "energy", value: "A++", label: "standard energii" },
    ],
    assumptionsEyebrow: "Założenia",
    assumptionsTitle: "Dom ma być efektowny, ale bardzo prosty w codziennym życiu.",
    assumptionsLead:
      "Układ rozdziela prywatną strefę sypialni od otwartego salonu, kuchni i jadalni. Główne przeszklenie kieruje uwagę na ogród.",
    assumptions: [
      {
        id: "living-zone",
        title: "Strefa dzienna",
        description:
          "Salon z wysokim sufitem, wyjście na taras, kuchnia z wyspą i ukryta spiżarnia.",
      },
      {
        id: "private-zone",
        title: "Strefa prywatna",
        description: "Sypialnia master z garderobą, trzy pokoje oraz kompaktowa strefa pracy.",
      },
      {
        id: "facade",
        title: "Elewacja",
        description: "Drewno, grafit, ciepłe światło i proste detale bez zbędnych ozdobników.",
      },
    ],
  },
  {
    key: "linea",
    title: "Dom Linea",
    slug: "linea",
    cardDescription: "188 m² · miejska willa",
    cardHref: "/projekty",
    area: 188,
    categories: ["villa"],
    referenceOrder: 1,
    seoDescription: PROJECT_SEO_DESCRIPTION,
  },
  {
    key: "nova",
    title: "Dom Nova",
    slug: "nova",
    cardDescription: "121 m² · parterowy",
    cardHref: "/projekty",
    area: 121,
    categories: ["single", "eco"],
    referenceOrder: 2,
    seoDescription: PROJECT_SEO_DESCRIPTION,
  },
  {
    key: "mono",
    title: "Dom Mono",
    slug: "mono",
    cardDescription: "156 m² · czarna elewacja",
    cardHref: "/projekty",
    area: 156,
    categories: ["barn"],
    referenceOrder: 3,
    seoDescription: PROJECT_SEO_DESCRIPTION,
  },
  {
    key: "vista",
    title: "Dom Vista",
    slug: "vista",
    cardDescription: "206 m² · willa z patio",
    cardHref: "/projekty",
    area: 206,
    categories: ["villa", "eco"],
    referenceOrder: 4,
    seoDescription: PROJECT_SEO_DESCRIPTION,
  },
  {
    key: "calm",
    title: "Dom Calm",
    slug: "calm",
    cardDescription: "98 m² · kompaktowy",
    cardHref: "/projekty",
    area: 98,
    categories: ["single"],
    referenceOrder: 5,
    seoDescription: PROJECT_SEO_DESCRIPTION,
  },
]);
