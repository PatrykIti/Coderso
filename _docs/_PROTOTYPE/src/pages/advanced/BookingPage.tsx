import { CalendarDays, Clock, Plus, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { SectionCard } from "@/components/patterns/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DAYS = [
  { label: "Mon", date: "22" },
  { label: "Tue", date: "23" },
  { label: "Wed", date: "24" },
  { label: "Thu", date: "25" },
  { label: "Fri", date: "26" },
  { label: "Sat", date: "27" },
  { label: "Sun", date: "28" },
];

const RESOURCES = [
  { name: "Studio A", dot: "bg-primary" },
  { name: "Studio B", dot: "bg-info" },
  { name: "Consultation", dot: "bg-success" },
  { name: "Coaching", dot: "bg-warning" },
];

type Booking = { day: number; time: string; name: string; tone: string };

const BOOKINGS: Booking[] = [
  { day: 0, time: "09:00", name: "Aiko Tanaka", tone: "bg-primary-soft text-primary-soft-foreground" },
  { day: 1, time: "11:30", name: "Jonas Weber", tone: "bg-info-soft text-info" },
  { day: 2, time: "14:00", name: "Maria Nowak", tone: "bg-success-soft text-success" },
  { day: 3, time: "10:00", name: "Chen Wei", tone: "bg-primary-soft text-primary-soft-foreground" },
  { day: 4, time: "16:00", name: "Sofia Rossi", tone: "bg-info-soft text-info" },
  { day: 5, time: "13:00", name: "Liam O'Brien", tone: "bg-success-soft text-success" },
];

export function BookingPage() {
  return (
    <div>
      <PageHeader
        title="Booking"
        description="A calendar view of appointments across your resources and services."
        icon={<CalendarDays />}
        actions={
          <>
            <Badge variant="soft">Beta</Badge>
            <Button className="gap-1.5">
              <Plus className="size-4" /> New booking
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Bookings today" value="7" delta="+2" trend="up" icon={<CalendarDays />} />
        <StatCard label="Upcoming" value="34" delta="+5" trend="up" icon={<Clock />} />
        <StatCard label="Utilization" value="68%" delta="+4.1%" trend="up" icon={<TrendingUp />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
        <Card className="h-fit p-5">
          <div className="font-display text-[15px] font-semibold">Resources &amp; services</div>
          <div className="mt-4 flex flex-col gap-1">
            {RESOURCES.map((resource) => (
              <div
                key={resource.name}
                className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span className={`size-2.5 rounded-full ${resource.dot}`} />
                <span className="text-foreground">{resource.name}</span>
              </div>
            ))}
          </div>
        </Card>

        <SectionCard title="This week" description="Jun 22 – Jun 28, 2026">
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day, index) => (
              <div key={day.label} className="flex flex-col">
                <div className="flex items-baseline justify-between px-1 pb-2">
                  <span className="text-xs font-medium text-muted-foreground">{day.label}</span>
                  <span className="font-display text-sm font-semibold text-foreground">{day.date}</span>
                </div>
                <div className="flex min-h-40 flex-col gap-1.5 rounded-xl bg-muted/40 p-1.5">
                  {BOOKINGS.filter((booking) => booking.day === index).map((booking) => (
                    <div
                      key={booking.name}
                      className={`rounded-lg px-2 py-1.5 ${booking.tone}`}
                    >
                      <div className="text-[11px] font-semibold tabular-nums">{booking.time}</div>
                      <div className="truncate text-xs">{booking.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
