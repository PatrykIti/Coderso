import { Check, MessageSquare, Star, ThumbsUp, X } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { PEOPLE, pick } from "@/lib/mock";

const REVIEWS = [
  {
    rating: 5,
    subject: "Studio A · Photography session",
    text: "Booking was effortless and the space was exactly as described. Will absolutely return for our next shoot.",
    status: "pending",
  },
  {
    rating: 4,
    subject: "Coaching · 1:1 strategy call",
    text: "Really helpful and well structured. Lost a star only because the session started a few minutes late.",
    status: "pending",
  },
  {
    rating: 5,
    subject: "Consultation · Onboarding",
    text: "Clear, friendly, and genuinely useful advice. The follow-up notes were a lovely touch.",
    status: "approved",
  },
  {
    rating: 3,
    subject: "Studio B · Recording slot",
    text: "Good gear and a calm room, but the temperature controls were tricky to figure out on arrival.",
    status: "pending",
  },
  {
    rating: 2,
    subject: "Coaching · Group workshop",
    text: "Content was fine but it felt rushed and a little overbooked for the size of the room.",
    status: "rejected",
  },
];

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

export function ReviewsPage() {
  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Moderate customer reviews before they appear on your listings."
        icon={<MessageSquare />}
        actions={<Badge variant="soft">Beta</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Average rating" value="4.6" icon={<Star />} hint="across 218 reviews" />
        <StatCard label="Pending" value="12" delta="+3" trend="up" icon={<MessageSquare />} />
        <StatCard label="This week" value="27" delta="+9.2%" trend="up" icon={<ThumbsUp />} />
      </div>

      <div className="mb-4 mt-6">
        <Tabs
          variant="underline"
          items={[
            { value: "pending", label: "Pending", count: 12 },
            { value: "approved", label: "Approved", count: 194 },
            { value: "rejected", label: "Rejected", count: 12 },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        {REVIEWS.map((review, index) => {
          const person = pick(PEOPLE, index + 1);
          return (
            <Card key={index} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Avatar name={person.name} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{person.name}</span>
                      <Stars rating={review.rating} />
                      <StatusBadge status={review.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{review.subject}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="soft" size="sm" className="gap-1.5">
                    <Check className="size-4" /> Approve
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-destructive">
                    <X className="size-4" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
