import { useMemo, useState } from "react";
import { Check, MessageSquare, MoreHorizontal, Search, Star, ThumbsUp, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import { deleteReview, updateReviewStatus, type ReviewRecord } from "@/services/reviewsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { EmptyState } from "@/ui/shared/EmptyState";
import { PageHeader } from "@/ui/shared/PageHeader";
import { StatCard } from "@/ui/shared/StatCard";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import { useReviews } from "./hooks/useReviews";

type ReviewStatusFilter = "all" | ReviewRecord["status"];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={
            i < rating ? "size-4 fill-warning text-warning" : "size-4 text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

export function ReviewsModerationPage() {
  const { items, isLoading, error, refresh } = useReviews();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        item.authorName.toLowerCase().includes(needle) ||
        item.entityType.toLowerCase().includes(needle) ||
        item.entityId.toLowerCase().includes(needle) ||
        (item.title ?? "").toLowerCase().includes(needle) ||
        (item.body ?? "").toLowerCase().includes(needle)
      );
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      spam: items.filter((item) => item.status === "spam").length,
    }),
    [items]
  );

  const averageRating = useMemo(() => {
    if (items.length === 0) return null;
    const sum = items.reduce((total, item) => total + item.rating, 0);
    return (sum / items.length).toFixed(1);
  }, [items]);

  const handleModerate = async (reviewId: string, status: ReviewRecord["status"]) => {
    try {
      await updateReviewStatus(reviewId, status);
      await refresh(true);
      setActionError(null);
    } catch (error) {
      if (isApiClientError(error)) {
        setActionError(error.message);
      } else {
        setActionError("Failed to update review status.");
      }
    }
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      await refresh(true);
      setActionError(null);
    } catch (error) {
      if (isApiClientError(error)) {
        setActionError(error.message);
      } else {
        setActionError("Failed to delete review.");
      }
    }
  };

  return (
    <AdminShell activeHref="/admin/advanced/reviews" breadcrumbs={["Coderso", "Reviews"]}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Reviews"
          description="Moderate customer reviews and keep published feedback trustworthy."
          icon={<MessageSquare />}
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load reviews</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Review action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Average rating"
            value={averageRating ?? "—"}
            icon={<Star />}
            hint={`across ${counts.all} reviews`}
          />
          <StatCard label="Pending" value={counts.pending} icon={<MessageSquare />} />
          <StatCard label="Approved" value={counts.approved} icon={<ThumbsUp />} />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ReviewStatusFilter)}
            className="min-w-0 overflow-x-auto"
          >
            <TabsList variant="line">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
              <TabsTrigger value="spam">Spam ({counts.spam})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by author, entity, or text..."
              aria-label="Search reviews"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center text-sm text-muted-foreground">
            Loading reviews...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title="No reviews to moderate"
            description="Reviews matching the current filter and search will appear here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((review) => (
              <Card key={review.id} className="rounded-2xl p-5 shadow-soft">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <Avatar size="default">
                      <AvatarFallback>{review.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{review.authorName}</span>
                        <Stars rating={review.rating} />
                        <StatusBadge status={review.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {review.entityType}:{review.entityId}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {review.title || review.body || "No review text"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {review.status !== "approved" ? (
                      <Button
                        variant="soft"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleModerate(review.id, "approved")}
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                    ) : null}
                    {review.status !== "rejected" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive"
                        onClick={() => handleModerate(review.id, "rejected")}
                      >
                        <X className="size-4" /> Reject
                      </Button>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="More review actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {review.status !== "pending" ? (
                          <DropdownMenuItem onClick={() => handleModerate(review.id, "pending")}>
                            Reset to pending
                          </DropdownMenuItem>
                        ) : null}
                        {review.status !== "spam" ? (
                          <DropdownMenuItem onClick={() => handleModerate(review.id, "spam")}>
                            Mark as spam
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(review.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
