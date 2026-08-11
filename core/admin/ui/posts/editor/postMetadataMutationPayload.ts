import {
  parseExactRfc3339DateTime,
  type PostMetadataMutationV1,
  type PostMetadataStatus,
} from "../../../../services/posts/postMetadataContract";

export type PostMetadataDraft = Readonly<{
  status: PostMetadataStatus;
  scheduledAt: string;
  seoDescription: string;
}>;

export type PostMetadataDraftKey = keyof PostMetadataDraft;

type PostMetadataBaseline = Readonly<{
  status: PostMetadataStatus;
  scheduledAt?: string | null;
  seo?: Readonly<{
    description?: string | null;
  }> | null;
}>;

type EffectivePublicationPair = Readonly<{
  status: PostMetadataStatus;
  scheduledAt: string | null;
}>;

export type PostMetadataPayloadBuildResult =
  | { kind: "noop"; settleKeys: readonly PostMetadataDraftKey[] }
  | { kind: "schedule_required" }
  | { kind: "invalid_schedule" }
  | {
      kind: "payload";
      payload: PostMetadataMutationV1;
      settleKeys: readonly PostMetadataDraftKey[];
    };

const METADATA_DRAFT_KEYS = [
  "status",
  "scheduledAt",
  "seoDescription",
] as const satisfies readonly PostMetadataDraftKey[];

const toEffectivePublicationPair = (
  status: PostMetadataStatus,
  scheduledAt: string | null | undefined
): EffectivePublicationPair => {
  if (status !== "scheduled") return { status, scheduledAt: null };
  if (typeof scheduledAt !== "string") return { status, scheduledAt: null };

  return {
    status,
    scheduledAt: parseExactRfc3339DateTime(scheduledAt)?.toISOString() ?? scheduledAt,
  };
};

const sameEffectivePublicationPair = (
  left: EffectivePublicationPair,
  right: EffectivePublicationPair
): boolean => left.status === right.status && left.scheduledAt === right.scheduledAt;

const exactStatusAndSchedule = (
  status: PostMetadataStatus,
  parsedSchedule: Date | null
): Pick<PostMetadataMutationV1, "status" | "scheduledAt"> => ({
  status,
  scheduledAt: status === "scheduled" ? parsedSchedule!.toISOString() : null,
});

/**
 * Creates the smallest metadata PATCH that changes the effective Classic editor
 * draft. The structural baseline keeps this pure helper independent of client
 * cache and runtime modules.
 */
export const buildPostMetadataMutationPayload = (
  baseline: PostMetadataBaseline,
  draft: PostMetadataDraft
): PostMetadataPayloadBuildResult => {
  const scheduleText = draft.scheduledAt.trim();
  const parsedSchedule = scheduleText === "" ? null : parseExactRfc3339DateTime(draft.scheduledAt);

  if (draft.status === "scheduled" && scheduleText === "") {
    return { kind: "schedule_required" };
  }
  if (scheduleText !== "" && !parsedSchedule) {
    return { kind: "invalid_schedule" };
  }

  const publicationChanged = !sameEffectivePublicationPair(
    toEffectivePublicationPair(baseline.status, baseline.scheduledAt),
    toEffectivePublicationPair(draft.status, parsedSchedule?.toISOString() ?? null)
  );
  const seoChanged = draft.seoDescription !== (baseline.seo?.description ?? "");

  if (!publicationChanged && !seoChanged) {
    return { kind: "noop", settleKeys: METADATA_DRAFT_KEYS };
  }

  const payload: PostMetadataMutationV1 = {
    ...(seoChanged ? { seo: { description: draft.seoDescription } } : {}),
    ...(publicationChanged ? exactStatusAndSchedule(draft.status, parsedSchedule ?? null) : {}),
  };
  const settleKeys = [
    ...(publicationChanged ? (["status", "scheduledAt"] as const) : []),
    ...(seoChanged ? (["seoDescription"] as const) : []),
  ];

  return { kind: "payload", payload, settleKeys };
};
