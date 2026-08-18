import { SmokeError } from "../../contracts";
import type { PlainJsonObject } from "../../workers/contracts";
import type { Task517FixtureSpec } from "./fixtures";
import { TASK517_SCENARIO_VARIANTS, type Task517ScenarioId } from "./scenarios";

export interface Task517BrowserActionConfig extends PlainJsonObject {
  readonly scenarioId: Task517ScenarioId;
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: number; readonly height: number }>;
  readonly frontOrigin: string;
  readonly adminOrigin: string;
  readonly adminPath: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly contentTypeName: string;
  readonly editorLabel: string;
  readonly titles: Readonly<{
    readonly public: string;
    readonly private: string;
    readonly passA: string;
    readonly passB: string;
  }>;
  readonly markers: Readonly<{
    readonly passA: string;
    readonly passB: string;
  }>;
  readonly slugs: Readonly<{
    readonly private: string;
  }>;
  readonly passwords: Readonly<{
    readonly passA: string;
    readonly passB: string;
    readonly wrong: string;
  }>;
  readonly urls: Readonly<{
    readonly public: string;
    readonly private: string;
    readonly passA: string;
    readonly passB: string;
    readonly missing: string;
    readonly list: string;
    readonly search: string;
    readonly editor: string;
  }>;
  readonly screenshotPath: string | null;
}

const WRONG_PASSWORD = "task517-0000-wrong-password";

/** Builds the full marker-derived browser config for one scenario. */
export function buildTask517BrowserActionConfig(input: {
  readonly scenarioId: Task517ScenarioId;
  readonly theme: "light" | "dark";
  readonly runMarker: string;
  readonly fixtures: Readonly<{
    readonly public: Task517FixtureSpec;
    readonly private: Task517FixtureSpec;
    readonly passA: Task517FixtureSpec;
    readonly passB: Task517FixtureSpec;
  }>;
  readonly contentTypeSlug: string;
  readonly contentTypeName: string;
  readonly entryIds: Readonly<{
    readonly public: string;
    readonly private: string;
    readonly passA: string;
    readonly passB: string;
  }>;
  readonly adminPath: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly screenshotPath: string | null;
}): Task517BrowserActionConfig {
  const { fixtures, entryIds } = input;
  const frontOrigin = "http://127.0.0.1:3000";
  const adminOrigin = "http://127.0.0.1:5173";
  const detail = (slug: string) => `${frontOrigin}/content/${input.contentTypeSlug}/${slug}`;
  const editorLabel = `Edit ${input.contentTypeName.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()}`;
  const variant = TASK517_SCENARIO_VARIANTS[input.scenarioId].find(
    (entry) => entry.theme === input.theme
  );
  if (variant === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 scenario variant is unregistered");
  }
  return Object.freeze({
    scenarioId: input.scenarioId,
    theme: input.theme,
    viewport: variant.viewport,
    frontOrigin,
    adminOrigin,
    adminPath: input.adminPath,
    adminEmail: input.adminEmail,
    adminPassword: input.adminPassword,
    contentTypeName: input.contentTypeName,
    editorLabel,
    fixtures: Object.freeze({
      public: fixtures.public,
      private: fixtures.private,
      passA: fixtures.passA,
      passB: fixtures.passB,
    }),
    titles: Object.freeze({
      public: fixtures.public.title,
      private: fixtures.private.title,
      passA: fixtures.passA.title,
      passB: fixtures.passB.title,
    }),
    markers: Object.freeze({
      passA: fixtures.passA.bodyMarker,
      passB: fixtures.passB.bodyMarker,
    }),
    slugs: Object.freeze({ private: fixtures.private.slug }),
    passwords: Object.freeze({
      passA: fixtures.passA.accessPassword ?? "",
      passB: fixtures.passB.accessPassword ?? "",
      wrong: WRONG_PASSWORD,
    }),
    urls: Object.freeze({
      public: detail(fixtures.public.slug),
      private: detail(fixtures.private.slug),
      passA: detail(fixtures.passA.slug),
      passB: detail(fixtures.passB.slug),
      missing: detail(`task517-missing-${input.runMarker}`),
      list: `${frontOrigin}/content/${input.contentTypeSlug}`,
      search: `${adminOrigin}${input.adminPath}/api/search/public-preview?q=task+public+${input.runMarker}`,
      editor: `${adminOrigin}${input.adminPath}/advanced/entries/${input.contentTypeSlug}/${entryIds.private}`,
    }),
    screenshotPath: input.screenshotPath,
  });
}
