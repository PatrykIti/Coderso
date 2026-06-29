import { AlertTriangle, CalendarDays, Layers, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditCategory, AuditDateRange, AuditSeverity } from "./types";

export type AuditFiltersProps = {
  query: string;
  dateRange: AuditDateRange;
  eventType: "all" | AuditCategory;
  severity: "all" | AuditSeverity;
  onQueryChange: (value: string) => void;
  onDateRangeChange: (value: AuditDateRange) => void;
  onEventTypeChange: (value: "all" | AuditCategory) => void;
  onSeverityChange: (value: "all" | AuditSeverity) => void;
};

export function AuditFilters({
  query,
  dateRange,
  eventType,
  severity,
  onQueryChange,
  onDateRangeChange,
  onEventTypeChange,
  onSeverityChange,
}: AuditFiltersProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-soft lg:flex-row lg:items-center">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search events, resources or users..."
          className="h-10 pl-9"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <Select
        value={dateRange}
        onValueChange={(value) => onDateRangeChange(value as AuditDateRange)}
      >
        <SelectTrigger className="h-10 w-full lg:w-[170px]" aria-label="Audit date range">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last-7-days">Last 7 days</SelectItem>
          <SelectItem value="last-30-days">Last 30 days</SelectItem>
          <SelectItem value="this-month">This month</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={eventType}
        onValueChange={(value) => onEventTypeChange(value as "all" | AuditCategory)}
      >
        <SelectTrigger className="h-10 w-full lg:w-[170px]">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Event type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All event types</SelectItem>
          <SelectItem value="authentication">Authentication</SelectItem>
          <SelectItem value="content">Content</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={severity}
        onValueChange={(value) => onSeverityChange(value as "all" | AuditSeverity)}
      >
        <SelectTrigger className="h-10 w-full lg:w-[170px]">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          <SelectItem value="info">Info</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="error">Error</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
