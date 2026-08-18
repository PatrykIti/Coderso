import type { Task517FixtureKind } from "./fixtures";
export const TASK517_SCENARIO_IDS = Object.freeze([
  "anon-public-cached-render",
  "private-anon-uniform-404",
  "password-unlock-cycle",
  "cross-entry-unlock-isolation",
  "no-shared-cache-leak",
  "publish-front-admin-parity",
] as const);

export type Task517ScenarioId = (typeof TASK517_SCENARIO_IDS)[number];

export interface Task517ScenarioDescriptor {
  readonly id: Task517ScenarioId;
  readonly title: string;
  readonly fixtureKind: Task517FixtureKind;
}

export interface Task517Variant {
  readonly id: string;
  readonly surface: "admin" | "public";
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: number; readonly height: number }>;
}

export const TASK517_SCENARIOS: readonly Task517ScenarioDescriptor[] = Object.freeze([
  Object.freeze({
    id: "anon-public-cached-render",
    title: "Anonymous public entry renders from the shared HTML cache",
    fixtureKind: "public",
  }),
  Object.freeze({
    id: "private-anon-uniform-404",
    title: "Private entry is a uniform anonymous 404 that admin sessions bypass",
    fixtureKind: "private",
  }),
  Object.freeze({
    id: "password-unlock-cycle",
    title: "Password unlock cycle (wrong then correct) for one entry",
    fixtureKind: "password-a",
  }),
  Object.freeze({
    id: "cross-entry-unlock-isolation",
    title: "Unlock cookie does not cross entries",
    fixtureKind: "password-b",
  }),
  Object.freeze({
    id: "no-shared-cache-leak",
    title: "Gated and private bodies never leak through shared caches",
    fixtureKind: "password-a",
  }),
  Object.freeze({
    id: "publish-front-admin-parity",
    title: "Publish, front listing, search and admin editor parity",
    fixtureKind: "private",
  }),
]);

const DESKTOP = Object.freeze({ width: 1440, height: 900 });

export const TASK517_SCENARIO_VARIANTS: Readonly<
  Record<Task517ScenarioId, readonly Task517Variant[]>
> = Object.freeze({
  "anon-public-cached-render": Object.freeze([
    Object.freeze({
      id: "anon-public-cached-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
  ]),
  "private-anon-uniform-404": Object.freeze([
    Object.freeze({ id: "anon-404-light", surface: "public", theme: "light", viewport: DESKTOP }),
    Object.freeze({
      id: "admin-bypass-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
    Object.freeze({ id: "admin-bypass-dark", surface: "public", theme: "dark", viewport: DESKTOP }),
  ]),
  "password-unlock-cycle": Object.freeze([
    Object.freeze({
      id: "password-unlock-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
  ]),
  "cross-entry-unlock-isolation": Object.freeze([
    Object.freeze({
      id: "cross-entry-isolation-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
  ]),
  "no-shared-cache-leak": Object.freeze([
    Object.freeze({
      id: "cache-proof-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
    Object.freeze({
      id: "private-404-light",
      surface: "public",
      theme: "light",
      viewport: DESKTOP,
    }),
  ]),
  "publish-front-admin-parity": Object.freeze([
    Object.freeze({ id: "front-list-light", surface: "public", theme: "light", viewport: DESKTOP }),
    Object.freeze({
      id: "admin-editor-light",
      surface: "admin",
      theme: "light",
      viewport: DESKTOP,
    }),
    Object.freeze({ id: "admin-editor-dark", surface: "admin", theme: "dark", viewport: DESKTOP }),
  ]),
});
