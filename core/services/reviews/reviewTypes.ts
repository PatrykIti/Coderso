export const reviewStatuses = ["pending", "approved", "rejected", "spam"] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export type Review = {
  id: string;
  entityType: string;
  entityId: string;
  status: ReviewStatus;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  authorEmail: string | null;
  metadata: Record<string, unknown>;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
