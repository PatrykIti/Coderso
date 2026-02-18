import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BookingResourceRecord,
  BookingServiceRecord,
  BookingSlotRecord,
} from "@/services/bookingClient";

import { formatDateTime } from "../bookingHelpers";
import type { SlotPreviewFormState } from "../bookingTypes";

type BookingSlotPreviewTabProps = {
  services: BookingServiceRecord[];
  resources: BookingResourceRecord[];
  slotPreviewForm: SlotPreviewFormState;
  previewSlots: BookingSlotRecord[];
  previewLoading: boolean;
  onSlotPreviewFormChange: (patch: Partial<SlotPreviewFormState>) => void;
  onPreviewSlots: () => void;
};

export function BookingSlotPreviewTab({
  services,
  resources,
  slotPreviewForm,
  previewSlots,
  previewLoading,
  onSlotPreviewFormChange,
  onPreviewSlots,
}: BookingSlotPreviewTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Slot preview</CardTitle>
        <CardDescription>
          Preview generated slots for selected service/resource/day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Service</label>
            <Select
              value={slotPreviewForm.serviceId}
              onValueChange={(value) => onSlotPreviewFormChange({ serviceId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Resource</label>
            <Select
              value={slotPreviewForm.resourceId}
              onValueChange={(value) => onSlotPreviewFormChange({ resourceId: value })}
            >
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={slotPreviewForm.date}
              onChange={(event) => onSlotPreviewFormChange({ date: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Timezone</label>
            <Input
              value={slotPreviewForm.timezone}
              onChange={(event) => onSlotPreviewFormChange({ timezone: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Interval (minutes)</label>
            <Input
              type="number"
              min={5}
              max={180}
              value={slotPreviewForm.intervalMinutes}
              onChange={(event) =>
                onSlotPreviewFormChange({ intervalMinutes: event.target.value })
              }
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onPreviewSlots} disabled={previewLoading} className="w-full">
              {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run preview
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">Available slots</p>
            <p className="text-xs text-muted-foreground">Result count: {previewSlots.length}</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {previewSlots.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No preview slots yet. Run preview to load slots.
              </div>
            ) : (
              <div className="divide-y">
                {previewSlots.map((slot) => (
                  <div key={`${slot.startsAt}-${slot.endsAt}`} className="px-4 py-3">
                    <p className="text-sm font-medium">
                      {formatDateTime(slot.startsAt, slot.timezone)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ends: {formatDateTime(slot.endsAt, slot.timezone)} ({slot.timezone})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
