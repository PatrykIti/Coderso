import { expect, test } from "vitest";

import { resolveBlueprintCandidates } from "../../../core/services/assistant/blueprints/blueprintCandidateResolver";

test("resolveBlueprintCandidates returns product catalog primary with inquiry and editorial adjuncts", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Create a product catalog with inquiry form and a blog hub for guides.",
    context: {
      page: "/admin/advanced/entries",
      locale: "en-US",
    },
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["product-catalog", "primary"],
    ["product-inquiry-catalog", "adjunct"],
    ["editorial-content-hub", "adjunct"],
  ]);
});

test("resolveBlueprintCandidates keeps booking gated and adds lead capture for mixed house-project prompts", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Build a Mabudo-like house projects catalog with contact form and appointment booking.",
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["house-projects-catalog", "primary"],
    ["lead-capture-site", "adjunct"],
    ["booking-service", "gated"],
  ]);
});

test("resolveBlueprintCandidates returns gated-only booking setup when no executable primary exists", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "I need booking setup with reservations and a calendar.",
  });

  expect(candidates).toEqual([
    expect.objectContaining({
      capabilityId: "booking-service",
      role: "gated",
    }),
  ]);
});

test("resolveBlueprintCandidates uses route context to recover the primary capability", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Need an inquiry form here.",
    context: {
      page: "/admin/advanced/entries/products",
      locale: "en-US",
    },
  });

  expect(candidates.map((candidate) => [candidate.capabilityId, candidate.role])).toEqual([
    ["product-catalog", "primary"],
    ["product-inquiry-catalog", "adjunct"],
  ]);
});

test("resolveBlueprintCandidates falls back to exact capability aliases when prompt classification stays unknown", () => {
  const candidates = resolveBlueprintCandidates({
    prompt: "Mabudo",
  });

  expect(candidates).toEqual([
    expect.objectContaining({
      capabilityId: "house-projects-catalog",
      role: "primary",
      matchedSignals: ["alias-match"],
    }),
  ]);
});
