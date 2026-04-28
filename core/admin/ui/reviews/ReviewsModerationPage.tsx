import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  deleteReview,
  updateReviewStatus,
  type ReviewRecord,
} from "@/services/reviewsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ReviewTable } from "./ReviewTable";
import { useReviews } from "./hooks/useReviews";

type ReviewStatusFilter = "all" | ReviewRecord["status"];

const renderStars = (value: number) => "★".repeat(value).padEnd(5, "☆");

export function ReviewsModerationPage() {
  const { items, isLoading, error, refresh } = useReviews();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.find((entry) => entry.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

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
    <AdminShell
      activeHref="/admin/advanced/reviews"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span className="text-foreground">Reviews</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Reviews"
          description="Moderate customer reviews and keep published feedback trustworthy."
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

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by author, entity, or review text..."
              aria-label="Search reviews"
            />
            <Tabs
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ReviewStatusFilter)}
            >
              <TabsList className="grid w-full grid-cols-5 md:w-[38rem]">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
                <TabsTrigger value="spam">Spam ({counts.spam})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
          <ReviewTable
            items={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            onModerate={handleModerate}
            onDelete={handleDelete}
            emptyMessage={isLoading ? "Loading reviews..." : undefined}
          />

          <Card>
            <CardHeader>
              <CardTitle>Review details</CardTitle>
              <CardDescription>Inspect text and apply moderation action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selected ? (
                <p className="text-sm text-muted-foreground">Select a review from the table.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{selected.authorName}</p>
                      <p className="text-xs text-muted-foreground">{renderStars(selected.rating)}</p>
                    </div>
                    <Badge variant={selected.status === "approved" ? "default" : "outline"} className="capitalize">
                      {selected.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Entity: {selected.entityType}:{selected.entityId}
                  </div>

                  <Input value={selected.title ?? ""} readOnly aria-label="Review title" />
                  <Textarea value={selected.body ?? ""} readOnly rows={8} aria-label="Review content" />

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => handleModerate(selected.id, "approved")}>Approve</Button>
                    <Button variant="outline" onClick={() => handleModerate(selected.id, "pending")}>Pending</Button>
                    <Button variant="outline" onClick={() => handleModerate(selected.id, "rejected")}>Reject</Button>
                    <Button variant="outline" onClick={() => handleModerate(selected.id, "spam")}>Spam</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
