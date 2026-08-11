import { describe, expect, test } from "vitest";

import {
  buildPostMetadataMutationPayload,
  type PostMetadataDraft,
} from "../../../core/admin/ui/posts/editor/postMetadataMutationPayload";

const baseline = (overrides: Record<string, unknown> = {}) => ({
  status: "draft" as const,
  scheduledAt: null,
  seo: { description: "Original description" },
  ...overrides,
});

const draft = (overrides: Partial<PostMetadataDraft> = {}): PostMetadataDraft => ({
  status: "draft",
  scheduledAt: "",
  seoDescription: "Original description",
  ...overrides,
});

describe("buildPostMetadataMutationPayload", () => {
  test("emits only SEO for an SEO-only change", () => {
    expect(
      buildPostMetadataMutationPayload(baseline(), draft({ seoDescription: "Updated description" }))
    ).toEqual({
      kind: "payload",
      payload: { seo: { description: "Updated description" } },
      settleKeys: ["seoDescription"],
    });
  });

  test("emits the exact current status and normalized schedule for a schedule change", () => {
    expect(
      buildPostMetadataMutationPayload(
        baseline({ status: "scheduled", scheduledAt: "2026-05-02T10:00:00.000Z" }),
        draft({ status: "scheduled", scheduledAt: "2026-05-02T13:30:00+02:00" })
      )
    ).toEqual({
      kind: "payload",
      payload: {
        status: "scheduled",
        scheduledAt: "2026-05-02T11:30:00.000Z",
      },
      settleKeys: ["status", "scheduledAt"],
    });
  });

  test("emits a null schedule for a non-scheduled status transition", () => {
    expect(
      buildPostMetadataMutationPayload(
        baseline({ status: "scheduled", scheduledAt: "2026-05-02T10:00:00.000Z" }),
        draft({ status: "draft", scheduledAt: "2026-05-03T10:00:00Z" })
      )
    ).toEqual({
      kind: "payload",
      payload: { status: "draft", scheduledAt: null },
      settleKeys: ["status", "scheduledAt"],
    });
  });

  test("requires a schedule before a scheduled draft can be submitted", () => {
    expect(buildPostMetadataMutationPayload(baseline(), draft({ status: "scheduled" }))).toEqual({
      kind: "schedule_required",
    });
  });

  test.each([
    "2026-02-30T10:00:00Z",
    "2026-04-31T10:00:00Z",
    "2026-01-01T24:00:00Z",
    "2025-02-29T10:00:00Z",
    "2026-01-01T10:00:00+00:60",
  ])("rejects non-empty invalid schedules even for non-scheduled drafts: %s", (scheduledAt) => {
    expect(buildPostMetadataMutationPayload(baseline(), draft({ scheduledAt }))).toEqual({
      kind: "invalid_schedule",
    });
  });

  test("treats equivalent offset instants as a no-op and settles exact semantic keys", () => {
    expect(
      buildPostMetadataMutationPayload(
        baseline({ status: "scheduled", scheduledAt: "2026-05-02T11:30:00.000Z" }),
        draft({ status: "scheduled", scheduledAt: "2026-05-02T13:30:00+02:00" })
      )
    ).toEqual({
      kind: "noop",
      settleKeys: ["status", "scheduledAt", "seoDescription"],
    });
  });

  test("canonicalizes a stale non-scheduled schedule to null without a publication payload", () => {
    expect(
      buildPostMetadataMutationPayload(baseline(), draft({ scheduledAt: "2026-05-02T10:00:00Z" }))
    ).toEqual({
      kind: "noop",
      settleKeys: ["status", "scheduledAt", "seoDescription"],
    });
  });
});
