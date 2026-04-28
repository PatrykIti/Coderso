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
  BookingReservationRecord,
  BookingReservationStatus,
  BookingResourceRecord,
  BookingServiceRecord,
} from "@/services/bookingClient";

import { formatDateTime, formatReservationStatus } from "../bookingHelpers";
import {
  RESERVATION_STATUS_OPTIONS,
  type ReservationFormState,
} from "../bookingTypes";

type BookingReservationsTabProps = {
  reservations: BookingReservationRecord[];
  reservationsLoading: boolean;
  services: BookingServiceRecord[];
  resources: BookingResourceRecord[];
  servicesById: Map<string, BookingServiceRecord>;
  resourcesById: Map<string, BookingResourceRecord>;
  reservationStatusDrafts: Record<string, BookingReservationStatus>;
  reservationForm: ReservationFormState;
  saving: boolean;
  onReservationFormChange: (patch: Partial<ReservationFormState>) => void;
  onReservationStatusDraftChange: (
    id: string,
    status: BookingReservationStatus
  ) => void;
  onCreateReservation: () => void;
  onUpdateReservationStatus: (id: string) => void;
};

export function BookingReservationsTab({
  reservations,
  reservationsLoading,
  services,
  resources,
  servicesById,
  resourcesById,
  reservationStatusDrafts,
  reservationForm,
  saving,
  onReservationFormChange,
  onReservationStatusDraftChange,
  onCreateReservation,
  onUpdateReservationStatus,
}: BookingReservationsTabProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
          <CardDescription>
            Monitor incoming bookings and update lifecycle status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reservationsLoading ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Loading reservations...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No reservations yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.customerName}</TableCell>
                      <TableCell>{servicesById.get(item.serviceId)?.name ?? item.serviceId}</TableCell>
                      <TableCell>{resourcesById.get(item.resourceId)?.name ?? item.resourceId}</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(item.startsAt, item.timezone)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(item.endsAt, item.timezone)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={reservationStatusDrafts[item.id] ?? item.status}
                          onValueChange={(value: BookingReservationStatus) =>
                            onReservationStatusDraftChange(item.id, value)
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESERVATION_STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {formatReservationStatus(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateReservationStatus(item.id)}
                        >
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New reservation</CardTitle>
          <CardDescription>
            Manual reservation creation for phone/email requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Service</label>
            <Select
              value={reservationForm.serviceId}
              onValueChange={(value) => onReservationFormChange({ serviceId: value })}
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
              value={reservationForm.resourceId}
              onValueChange={(value) => onReservationFormChange({ resourceId: value })}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start</label>
              <Input
                type="datetime-local"
                value={reservationForm.startsAt}
                onChange={(event) => onReservationFormChange({ startsAt: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End</label>
              <Input
                type="datetime-local"
                value={reservationForm.endsAt}
                onChange={(event) => onReservationFormChange({ endsAt: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Timezone</label>
            <Input
              value={reservationForm.timezone}
              onChange={(event) => onReservationFormChange({ timezone: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer name</label>
            <Input
              value={reservationForm.customerName}
              onChange={(event) => onReservationFormChange({ customerName: event.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={reservationForm.customerEmail}
                onChange={(event) => onReservationFormChange({ customerEmail: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={reservationForm.customerPhone}
                onChange={(event) => onReservationFormChange({ customerPhone: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              rows={3}
              value={reservationForm.notes}
              onChange={(event) => onReservationFormChange({ notes: event.target.value })}
            />
          </div>
          <Button onClick={onCreateReservation} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create reservation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
