import { resolve } from "node:path";

import { SmokeError } from "../../contracts";
import { TASK_547_DESCRIPTOR_SHA256, type Task547ScenarioDescriptor } from "./descriptors";
import type { Task547InstallOutput } from "./worker-operations";

function boundedCredential(value: string | undefined): string | null {
  return typeof value === "string" &&
    value.length > 0 &&
    Buffer.byteLength(value) <= 8 * 1024 &&
    !value.includes("\0")
    ? value
    : null;
}

export function projectTask547AdminAuthEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const email = boundedCredential(
    source.CODERSO_PLAYWRIGHT_EMAIL ?? source.PLAYWRIGHT_ADMIN_EMAIL ?? source.ADMIN_EMAIL
  );
  const password = boundedCredential(
    source.CODERSO_PLAYWRIGHT_PASSWORD ?? source.PLAYWRIGHT_ADMIN_PASSWORD ?? source.ADMIN_PASSWORD
  );
  if (email === null || password === null) {
    throw new SmokeError("smoke_argument_invalid", "TASK-547 admin credentials are incomplete");
  }
  return Object.freeze({
    CODERSO_PLAYWRIGHT_EMAIL: email,
    CODERSO_PLAYWRIGHT_PASSWORD: password,
  });
}

const publicReferences = Object.freeze({
  description:
    "Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.",
  success: "Dziękujemy! Odezwiemy się z pierwszym pomysłem na Twój dom — do usłyszenia.",
  note: "Odpisujemy zwykle w ciągu jednego dnia roboczego. Bez zobowiązań i bez sprzedażowej presji.",
  routes: [
    ["/", "Nowoczesne projekty domów — FormaDom Studio"],
    ["/oferta", "Oferta — FormaDom Studio"],
    ["/projekty", "Projekty domów — FormaDom Studio"],
    ["/proces", "Proces projektowy — FormaDom Studio"],
    ["/cennik", "Cennik — FormaDom Studio"],
    ["/o-nas", "O nas — FormaDom Studio"],
    ["/kontakt", "Kontakt — FormaDom Studio"],
    ["/projekty/aurora", "Dom Aurora — projekt pokazowy — FormaDom Studio"],
  ],
  routeCopy: [
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
  ],
  cards: [
    ["Dom Aurora", "142 m² · stodoła · eko", "/projekty/aurora"],
    ["Dom Linea", "188 m² · miejska willa", "/projekty"],
    ["Dom Nova", "121 m² · parterowy", "/projekty"],
    ["Dom Mono", "156 m² · czarna elewacja", "/projekty"],
    ["Dom Vista", "206 m² · willa z patio", "/projekty"],
    ["Dom Calm", "98 m² · kompaktowy", "/projekty"],
  ],
});

export function buildTask547BrowserInput(
  descriptor: Task547ScenarioDescriptor,
  screenshotPath: string,
  fixture: Task547InstallOutput,
  root: string
) {
  const physicalUrl =
    typeof descriptor.url !== "string"
      ? descriptor.url
      : descriptor.url
          .replace("{formId}", fixture.publicFormId)
          .replace(
            "{pageId}",
            descriptor.id.includes("collection")
              ? fixture.projectsPageId
              : descriptor.id.includes("form-presentation")
                ? fixture.contactPageId
                : fixture.homePageId
          );
  return Object.freeze({
    scenarioId: descriptor.id,
    descriptorSha256: TASK_547_DESCRIPTOR_SHA256,
    installedDigest: fixture.installedDigest,
    canonicalUrl: descriptor.url,
    physicalUrl,
    viewport: descriptor.viewport,
    assertions: descriptor.assertions.map(({ id, kind, target }) => ({ id, kind, target })),
    screenshotPath,
    absoluteScreenshotPath: resolve(root, screenshotPath),
    fixture: {
      publicFormId: fixture.publicFormId,
      internalFormId: fixture.internalFormId,
      homePageId: fixture.homePageId,
      projectsPageId: fixture.projectsPageId,
      contactPageId: fixture.contactPageId,
      apiKeySecret: fixture.apiKeySecret,
      markers: fixture.markers,
      lifecycle: fixture.lifecycle,
    },
    references: publicReferences,
  });
}
