import { expect, test } from "bun:test";

import { getSolutionKitFromCatalog } from "../../../core/services/kits/solutionKitsCatalog";
import { buildTemplateSeedsForKit } from "../../../core/services/kits/kitTemplateSeeds";

test("buildTemplateSeedsForKit derives unique seeds from page templates", () => {
  const kit = getSolutionKitFromCatalog("automotive-workshop");
  expect(kit).not.toBeNull();
  if (!kit) return;

  const seeds = buildTemplateSeedsForKit(kit);

  expect(seeds.length).toBeGreaterThan(0);
  expect(new Set(seeds.map((item) => item.key.toLowerCase())).size).toBe(seeds.length);
  expect(seeds.some((item) => item.key === "service-home")).toBe(true);
});

test("buildTemplateSeedsForKit lets explicit template blueprint override page-derived seed", () => {
  const base = getSolutionKitFromCatalog("automotive-workshop");
  expect(base).not.toBeNull();
  if (!base) return;

  const definition = {
    ...base,
    resourceBlueprint: {
      ...base.resourceBlueprint,
      templates: [
        {
          key: "service-home",
          name: "Custom Service Home",
          category: "Layout",
          status: "published" as const,
        },
      ],
    },
  };

  const seeds = buildTemplateSeedsForKit(definition);
  const overridden = seeds.find((item) => item.key === "service-home");

  expect(overridden?.name).toBe("Custom Service Home");
  expect(overridden?.status).toBe("published");
});
