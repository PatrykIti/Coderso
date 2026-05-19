import { Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  BookingBlackoutRecord,
  BookingResourceRecord,
  BookingScheduleInput,
} from "@/services/bookingClient";

import { dayLabel, formatDateTime, toTimeInput } from "../bookingHelpers";
import { DAY_OPTIONS, type BlackoutFormState, type ScheduleDraftState } from "../bookingTypes";

type BookingAvailabilityTabProps = {
  resources: BookingResourceRecord[];
  resourcesById: Map<string, BookingResourceRecord>;
  selectedResourceId: string;
  onSelectResource: (id: string) => void;
  scheduleRows: BookingScheduleInput[];
  scheduleDraft: ScheduleDraftState;
  hasUnsavedScheduleDraft: boolean;
  scheduleDraftGuidance: string | null;
  scheduleLoading: boolean;
  scheduleSaving: boolean;
  onScheduleDraftChange: (patch: Partial<ScheduleDraftState>) => void;
  onAddScheduleRow: () => void;
  onRemoveScheduleRow: (index: number) => void;
  onResetScheduleDraft: () => void;
  onSaveSchedules: () => void;
  blackoutForm: BlackoutFormState;
  blackouts: BookingBlackoutRecord[];
  blackoutsLoading: boolean;
  saving: boolean;
  onBlackoutFormChange: (patch: Partial<BlackoutFormState>) => void;
  onCreateBlackout: () => void;
  onDeleteBlackout: (id: string) => void;
};

export function BookingAvailabilityTab({
  resources,
  resourcesById,
  selectedResourceId,
  onSelectResource,
  scheduleRows,
  scheduleDraft,
  hasUnsavedScheduleDraft,
  scheduleDraftGuidance,
  scheduleLoading,
  scheduleSaving,
  onScheduleDraftChange,
  onAddScheduleRow,
  onRemoveScheduleRow,
  onResetScheduleDraft,
  onSaveSchedules,
  blackoutForm,
  blackouts,
  blackoutsLoading,
  saving,
  onBlackoutFormChange,
  onCreateBlackout,
  onDeleteBlackout,
}: BookingAvailabilityTabProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
          <CardDescription>Weekly availability windows for selected resource.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Resource</label>
            <Select value={selectedResourceId} onValueChange={onSelectResource}>
              <SelectTrigger>
                <SelectValue placeholder="Choose resource" />
              </SelectTrigger>
              <SelectContent>
                {resources.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-md border border-dashed p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Draft row</p>
                <p className="text-xs text-muted-foreground">
                  Add the draft row to schedules before saving changes for this resource.
                </p>
              </div>
              <Badge variant={hasUnsavedScheduleDraft ? "secondary" : "outline"}>
                {hasUnsavedScheduleDraft ? "Unsaved draft" : "Ready for a new row"}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Day</label>
                <Select
                  value={scheduleDraft.dayOfWeek}
                  onValueChange={(value) => onScheduleDraftChange({ dayOfWeek: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={String(item.value)}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Start</label>
                <Input
                  type="time"
                  value={scheduleDraft.startTime}
                  onChange={(event) => onScheduleDraftChange({ startTime: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">End</label>
                <Input
                  type="time"
                  value={scheduleDraft.endTime}
                  onChange={(event) => onScheduleDraftChange({ endTime: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  Timezone
                </label>
                <Input
                  value={scheduleDraft.timezone}
                  onChange={(event) => onScheduleDraftChange({ timezone: event.target.value })}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scheduleDraft.isAvailable}
                    onCheckedChange={(value) =>
                      onScheduleDraftChange({ isAvailable: value === true })
                    }
                  />
                  Available
                </label>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={onAddScheduleRow} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add row
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={onResetScheduleDraft}>
                Reset draft
              </Button>
            </div>
          </div>

          {scheduleDraftGuidance ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {scheduleDraftGuidance}
            </div>
          ) : null}

          {scheduleLoading ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Loading schedules...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No schedule rows.
                    </TableCell>
                  </TableRow>
                ) : (
                  scheduleRows.map((row, index) => (
                    <TableRow key={`${row.dayOfWeek}-${row.startMinute}-${index}`}>
                      <TableCell>{dayLabel(row.dayOfWeek)}</TableCell>
                      <TableCell>
                        {toTimeInput(row.startMinute)} - {toTimeInput(row.endMinute)}
                      </TableCell>
                      <TableCell>{row.timezone || "UTC"}</TableCell>
                      <TableCell>
                        <Badge variant={row.isAvailable ? "default" : "secondary"}>
                          {row.isAvailable ? "available" : "blocked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => onRemoveScheduleRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          <Button onClick={onSaveSchedules} disabled={!selectedResourceId || scheduleSaving}>
            {scheduleSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save schedules
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blackout windows</CardTitle>
          <CardDescription>
            Block specific ranges globally or for selected resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Resource scope</label>
            <Select
              value={blackoutForm.resourceId}
              onValueChange={(value) => onBlackoutFormChange({ resourceId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                {resources.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start</label>
              <Input
                type="datetime-local"
                value={blackoutForm.startsAt}
                onChange={(event) => onBlackoutFormChange({ startsAt: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End</label>
              <Input
                type="datetime-local"
                value={blackoutForm.endsAt}
                onChange={(event) => onBlackoutFormChange({ endsAt: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              rows={2}
              value={blackoutForm.reason}
              onChange={(event) => onBlackoutFormChange({ reason: event.target.value })}
            />
          </div>
          <Button onClick={onCreateBlackout} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create blackout
          </Button>

          {blackoutsLoading ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Loading blackouts...
            </div>
          ) : (
            <div className="space-y-2">
              {blackouts.length === 0 ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  No blackout windows yet.
                </div>
              ) : (
                blackouts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {item.resourceId
                          ? (resourcesById.get(item.resourceId)?.name ?? item.resourceId)
                          : "All resources"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.startsAt)} - {formatDateTime(item.endsAt)}
                      </p>
                      {item.reason ? (
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      ) : null}
                    </div>
                    <Button size="icon" variant="outline" onClick={() => onDeleteBlackout(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
