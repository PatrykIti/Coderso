import { AlertTriangle, CalendarDays, Layers, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AuditFiltersProps = {
  query: string;
  dateRange: string;
  eventType: string;
  severity: string;
  onQueryChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onEventTypeChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search events, resources or users..."
          className="h-10 pl-9"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="h-10 w-full">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last-7-days">Last 7 days</SelectItem>
          <SelectItem value="last-30-days">Last 30 days</SelectItem>
          <SelectItem value="this-month">This month</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      <Select value={eventType} onValueChange={onEventTypeChange}>
        <SelectTrigger className="h-10 w-full">
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
      <Select value={severity} onValueChange={onSeverityChange}>
        <SelectTrigger className="h-10 w-full">
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
