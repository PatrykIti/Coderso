import { createHash } from "node:crypto";

import { SmokeError } from "../../contracts";
import type { PlainJsonObject } from "../../workers/contracts";
export const TASK517_FIXTURE_KINDS = Object.freeze([
  "public",
  "private",
  "password-a",
  "password-b",
] as const);

export type Task517FixtureKind = (typeof TASK517_FIXTURE_KINDS)[number];

export interface Task517FixtureSpec extends PlainJsonObject {
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
  readonly slug: string;
  readonly title: string;
  readonly bodyMarker: string;
  readonly accessPassword: string | null;
}
/** Static fixture identity matrix (marker-independent); the marker-derived
 * slug/title/marker/password are produced by deriveTask517FixtureSpec. */
export function buildTask517FixtureSpecs(): readonly Readonly<{
  readonly fixtureId: string;
  readonly kind: Task517FixtureKind;
}>[] {
  return Object.freeze([
    Object.freeze({ fixtureId: "task-517-fixture-1", kind: "public" as const }),
    Object.freeze({ fixtureId: "task-517-fixture-2", kind: "private" as const }),
    Object.freeze({ fixtureId: "task-517-fixture-3", kind: "password-a" as const }),
    Object.freeze({ fixtureId: "task-517-fixture-4", kind: "password-b" as const }),
  ]);
}

const KIND_SLUG = Object.freeze({
  public: "public",
  private: "private",
  "password-a": "pass-a",
  "password-b": "pass-b",
} as const);

const KIND_LABEL = Object.freeze({
  public: "public",
  private: "private",
  "password-a": "pass-a",
  "password-b": "pass-b",
} as const);

function markerFor(runMarker: string, fixtureId: string): string {
  return createHash("sha256")
    .update(`task-517:${runMarker}:${fixtureId}`)
    .digest("hex")
    .slice(0, 20);
}

export function deriveTask517FixtureSpec(runMarker: string, fixtureId: string): Task517FixtureSpec {
  const fixture = buildTask517FixtureSpecs().find((entry) => entry.fixtureId === fixtureId);
  if (fixture === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-517 fixture is not registered");
  }
  const kindSlug = KIND_SLUG[fixture.kind];
  const kindLabel = KIND_LABEL[fixture.kind];
  const slug = `task517-${kindSlug}-${runMarker}`;
  const bodyMarker = markerFor(runMarker, fixtureId);
  return Object.freeze({
    fixtureId,
    kind: fixture.kind,
    slug,
    title: `TASK-517 ${kindLabel} ${runMarker}`,
    bodyMarker,
    accessPassword:
      fixture.kind === "password-a" || fixture.kind === "password-b"
        ? `task517-${kindSlug}-${runMarker}`
        : null,
  });
}
