import { HOUSE_PROJECT_CATEGORIES, HOUSE_PROJECT_ENERGY_CLASSES } from "./constants";

export type ProjectFixture = {
  key: string;
  title: string;
  slug: string;
  summary: string;
  area: number;
  style: "minimal" | "natural" | "classic";
  storeys: number;
  rooms: number;
  energyClass: (typeof HOUSE_PROJECT_ENERGY_CLASSES)[number];
  category: (typeof HOUSE_PROJECT_CATEGORIES)[number];
  assumptions: readonly string[];
  zones: readonly string[];
  visualLabel: string;
};

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export const PROJECT_FIXTURES: readonly ProjectFixture[] = deepFreeze<ProjectFixture[]>([
  {
    key: "aurora",
    title: "Aurora",
    slug: "aurora",
    summary: "Przestronny dom dla rodziny, otwarty na ogród i naturalne światło.",
    area: 148,
    style: "natural",
    storeys: 2,
    rooms: 5,
    energyClass: "A+",
    category: "modern",
    assumptions: ["duże przeszklenia", "gabinet przy wejściu", "zadaszony taras"],
    zones: ["dzienna", "nocna", "praca"],
    visualLabel: "Ciepły gradient o świcie",
  },
  {
    key: "linea",
    title: "Linea",
    slug: "linea",
    summary: "Parterowy układ z czytelną osią i spokojnym rytmem elewacji.",
    area: 112,
    style: "minimal",
    storeys: 1,
    rooms: 4,
    energyClass: "A",
    category: "modern",
    assumptions: ["bez barier", "spiżarnia", "taras od południa"],
    zones: ["dzienna", "prywatna"],
    visualLabel: "Jasna linearna fasada",
  },
  {
    key: "nova",
    title: "Nova",
    slug: "nova",
    summary: "Zwarty dom miejski z elastycznym pokojem na parterze.",
    area: 126,
    style: "minimal",
    storeys: 2,
    rooms: 5,
    energyClass: "A+",
    category: "modern",
    assumptions: ["wąska działka", "pokój elastyczny", "pompa ciepła"],
    zones: ["wejście", "dzienna", "nocna"],
    visualLabel: "Grafitowa miejska bryła",
  },
  {
    key: "mono",
    title: "Mono",
    slug: "mono",
    summary: "Nowoczesna stodoła z wysokim salonem i prostą konstrukcją.",
    area: 134,
    style: "natural",
    storeys: 2,
    rooms: 5,
    energyClass: "A",
    category: "barn",
    assumptions: ["antresola", "prosta więźba", "widok na ogród"],
    zones: ["wspólna", "antresola", "prywatna"],
    visualLabel: "Ciemna stodoła w zieleni",
  },
  {
    key: "vista",
    title: "Vista",
    slug: "vista",
    summary: "Dom na działkę widokową z tarasami i odwróconą strefą dzienną.",
    area: 162,
    style: "classic",
    storeys: 2,
    rooms: 6,
    energyClass: "B",
    category: "traditional",
    assumptions: ["działka ze spadkiem", "panoramiczny salon", "dwa tarasy"],
    zones: ["gospodarcza", "nocna", "widokowa"],
    visualLabel: "Warstwowy dom na zboczu",
  },
  {
    key: "calm",
    title: "Calm",
    slug: "calm",
    summary: "Kameralny dom parterowy skupiony wokół osłoniętego patio.",
    area: 96,
    style: "natural",
    storeys: 1,
    rooms: 4,
    energyClass: "A+",
    category: "barn",
    assumptions: ["patio", "kompaktowa komunikacja", "zielony dach"],
    zones: ["patio", "dzienna", "cisza"],
    visualLabel: "Zielone patio i miękkie światło",
  },
]);
