import { describe, expect, it } from "vitest";

import {
  buildProjectResources,
  normalizeProjectEntryDesired,
} from "../../../scripts/projekty-domow/content/buildProjectResources";
import { HOUSE_PROJECT_RESOURCE_KEY } from "../../../scripts/projekty-domow/content/constants";
import { PROJECT_FIXTURES } from "../../../scripts/projekty-domow/content/projectFixtures";

describe("Projekty Domów project fixtures", () => {
  it("builds one published content type and six unique published entries", () => {
    const resources = buildProjectResources();
    expect(resources.contentTypes).toEqual([
      {
        key: HOUSE_PROJECT_RESOURCE_KEY,
        desired: expect.objectContaining({
          slug: HOUSE_PROJECT_RESOURCE_KEY,
          status: "published",
        }),
      },
    ]);
    expect(resources.entries).toHaveLength(6);
    expect(new Set(resources.entries.map((entry) => entry.key)).size).toBe(6);
    expect(new Set(resources.entries.map((entry) => String(entry.desired.slug))).size).toBe(6);
    for (const entry of resources.entries) {
      expect(entry.desired.status).toBe("published");
      expect(entry.desired.contentTypeId).toEqual({
        ref: "content_type",
        key: HOUSE_PROJECT_RESOURCE_KEY,
      });
    }
  });

  it("pins Aurora required values without database or media ids", () => {
    const aurora = buildProjectResources().entries.find((entry) => entry.key === "aurora");
    expect(aurora?.desired).toMatchObject({
      title: "Aurora",
      slug: "aurora",
      status: "published",
      data: {
        area: 148,
        rooms: 5,
        storeys: 2,
        energyClass: "A+",
        category: "modern",
      },
    });
    const serialized = JSON.stringify(aurora);
    expect(serialized).not.toMatch(/"(?:id|mediaId|assetId)":/);
  });

  it("round-trips the strict schema data and is deterministic", () => {
    const first = buildProjectResources();
    const roundTrip = JSON.parse(JSON.stringify(first));
    expect(roundTrip).toEqual(first);
    expect(buildProjectResources()).toEqual(first);
    expect(Object.isFrozen(PROJECT_FIXTURES)).toBe(true);
    expect(PROJECT_FIXTURES.every((fixture) => Object.isFrozen(fixture))).toBe(true);
    expect(PROJECT_FIXTURES.every((fixture) => Object.isFrozen(fixture.zones))).toBe(true);
  });

  it.each([
    undefined,
    { ref: "page", key: HOUSE_PROJECT_RESOURCE_KEY },
    { ref: "content_type", key: "wrong-project" },
    { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY, id: "forbidden" },
  ])("rejects a missing or non-exact content type reference", (contentTypeId) => {
    expect(() =>
      normalizeProjectEntryDesired({
        fixture: PROJECT_FIXTURES[0]!,
        contentTypeId,
        status: "published",
      })
    ).toThrow("house_project_content_type_ref_invalid");
  });

  it("rejects an entry target state other than published", () => {
    expect(() =>
      normalizeProjectEntryDesired({
        fixture: PROJECT_FIXTURES[0]!,
        contentTypeId: {
          ref: "content_type",
          key: HOUSE_PROJECT_RESOURCE_KEY,
        },
        status: "draft",
      })
    ).toThrow("house_project_status_invalid");
  });
});
