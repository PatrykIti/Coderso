import { expect, test } from "vitest";

import {
  buildAssistantSiteBuilderIntakeBrowserState,
  normalizeAssistantSiteBuilderIntakeBrowserState,
  serializeAssistantSiteBuilderIntakeBrowserState,
} from "../../../core/admin/ui/setup/assistantSiteBuilderIntakeBrowserState";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

const NOW_MS = Date.parse("2026-06-05T12:00:00.000Z");

const createBrowserStateSession = (): AssistantSiteBuilderIntakeSession => ({
  version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  mode: "advanced",
  currentStepId: "review",
  answers: [
    {
      stepId: "business-profile",
      values: {
        siteName: "Browser State",
        topic: "safe local restore",
        locale: "en",
        summary: "api key: sk-or-v1-1234567890abcdef",
      },
    },
    {
      stepId: "site-goals",
      values: {
        goals: ["collect inquiries"],
        primaryGoal: "collect inquiries",
      },
    },
    {
      stepId: "site-map",
      values: {
        pageRoles: ["home", "contact"],
      },
    },
    {
      stepId: "menu",
      values: {
        menuPreset: "simple",
        primaryActionPageRole: "contact",
      },
    },
    {
      stepId: "homepage-sections",
      values: {
        sectionRoles: ["value-proposition", "lead-capture"],
      },
    },
    {
      stepId: "hero",
      values: {
        heroPreset: "copy-first",
        headline: "Safe local state",
      },
    },
    {
      stepId: "media-policy",
      values: {
        mediaPolicy: "curated",
        notes: "Do not store https://cdn.example.test/private.jpg?token=abc.",
      },
    },
    {
      stepId: "reference-intake",
      values: {
        referenceNotes: "Raw copied reference with cookie: session-id.",
        referenceIds: ["reference-1"],
      },
    },
    {
      stepId: "review",
      values: {
        confirmed: true,
      },
    },
  ],
});

test("site builder intake browser state serializes bounded redacted snapshot only", () => {
  const state = buildAssistantSiteBuilderIntakeBrowserState(createBrowserStateSession(), {
    nowMs: NOW_MS,
  });
  const serialized = serializeAssistantSiteBuilderIntakeBrowserState(state);

  expect(serialized).not.toBeNull();
  expect(serialized).not.toContain("sk-or-v1");
  expect(serialized).not.toContain("session-id");
  expect(serialized).not.toContain("token=abc");
  expect(serialized).not.toContain("referenceNotes");
  expect(serialized).not.toContain("answers");

  const restored = normalizeAssistantSiteBuilderIntakeBrowserState(serialized, {
    nowMs: NOW_MS + 1000,
  });

  expect(restored).toMatchObject({
    schemaVersion: 1,
    session: {
      mode: "advanced",
      currentStepId: "review",
      reviewState: null,
      readyForReview: false,
      readyForExecution: false,
      redactionApplied: true,
    },
  });
  expect(restored?.session.answeredStepIds).toContain("reference-intake");
  expect(restored?.session.factsHash).toMatch(/^[a-f0-9]{8,64}$/);
});

test("site builder intake browser state restore discards stale, oversized, and unknown payloads", () => {
  const state = buildAssistantSiteBuilderIntakeBrowserState(createBrowserStateSession(), {
    nowMs: NOW_MS,
  });

  expect(
    normalizeAssistantSiteBuilderIntakeBrowserState(
      {
        ...state,
        schemaVersion: 999,
      },
      { nowMs: NOW_MS + 1000 }
    )
  ).toBeNull();

  expect(
    normalizeAssistantSiteBuilderIntakeBrowserState(
      {
        ...state,
        session: {
          ...state.session,
          mode: "basic",
          answeredStepIds: ["business-profile", "reference-intake"],
        },
      },
      { nowMs: NOW_MS + 1000 }
    )
  ).toBeNull();

  const tamperedReadyState = normalizeAssistantSiteBuilderIntakeBrowserState(
    {
      ...state,
      session: {
        ...state.session,
        readyForReview: true,
        readyForExecution: true,
        reviewState: "confirmed",
      },
    },
    { nowMs: NOW_MS + 1000 }
  );
  expect(tamperedReadyState?.session).toMatchObject({
    readyForReview: false,
    readyForExecution: false,
    reviewState: null,
  });

  expect(
    normalizeAssistantSiteBuilderIntakeBrowserState(
      {
        ...state,
        providerKey: "sk-or-v1-1234567890abcdef",
      },
      { nowMs: NOW_MS + 1000 }
    )
  ).toBeNull();

  expect(
    normalizeAssistantSiteBuilderIntakeBrowserState(
      {
        ...state,
        session: {
          ...state.session,
          reviewState: "ship-it",
        },
      },
      { nowMs: NOW_MS + 1000 }
    )
  ).toBeNull();

  expect(
    normalizeAssistantSiteBuilderIntakeBrowserState(state, {
      nowMs: NOW_MS + 31 * 60 * 1000,
    })
  ).toBeNull();

  expect(
    normalizeAssistantSiteBuilderIntakeBrowserState("x".repeat(9_000), {
      nowMs: NOW_MS + 1000,
    })
  ).toBeNull();
});
