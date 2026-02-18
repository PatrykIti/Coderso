import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  BookingResourceRecord,
  BookingServiceRecord,
  BookingServiceStatus,
} from "@/services/bookingClient";

import {
  SERVICE_STATUS_OPTIONS,
  SERVICE_SUBMISSION_ACCESS_OPTIONS,
  type ServiceFormState,
} from "../bookingTypes";

type BookingServicesTabProps = {
  services: BookingServiceRecord[];
  servicesLoading: boolean;
  selectedServiceId: string;
  editingServiceId: string | null;
  serviceForm: ServiceFormState;
  resources: BookingResourceRecord[];
  serviceResourceIds: string[];
  requiredServiceResourceIds: string[];
  serviceResourceLoading: boolean;
  serviceResourceSaving: boolean;
  saving: boolean;
  onSelectService: (id: string) => void;
  onServiceFormChange: (patch: Partial<ServiceFormState>) => void;
  onSubmitService: () => void;
  onEditService: (item: BookingServiceRecord) => void;
  onDeleteService: (id: string) => void;
  onCancelEdit: () => void;
  onToggleServiceResource: (resourceId: string, enabled: boolean) => void;
  onToggleRequiredServiceResource: (resourceId: string, required: boolean) => void;
  onSaveServiceResources: () => void;
};

export function BookingServicesTab({
  services,
  servicesLoading,
  selectedServiceId,
  editingServiceId,
  serviceForm,
  resources,
  serviceResourceIds,
  requiredServiceResourceIds,
  serviceResourceLoading,
  serviceResourceSaving,
  saving,
  onSelectService,
  onServiceFormChange,
  onSubmitService,
  onEditService,
  onDeleteService,
  onCancelEdit,
  onToggleServiceResource,
  onToggleRequiredServiceResource,
  onSaveServiceResources,
}: BookingServicesTabProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>Configure service durations, buffers, and status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {servicesLoading ? (
              <div className="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground">
                Loading services...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Buffers</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No services yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((item) => (
                      <TableRow
                        key={item.id}
                        className={selectedServiceId === item.id ? "bg-muted/40" : undefined}
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.durationMinutes}m</TableCell>
                        <TableCell>
                          {item.bufferBeforeMinutes}m / {item.bufferAfterMinutes}m
                        </TableCell>
                        <TableCell>
                          {item.priceCents != null ? `${item.priceCents} ${item.currency ?? "cents"}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === "active" ? "default" : "secondary"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              (item.settings?.submissionAccess as string | undefined) === "internal"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {(item.settings?.submissionAccess as string | undefined) === "internal"
                              ? "internal"
                              : "public"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onSelectService(item.id);
                                onEditService(item);
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onDeleteService(item.id)}>
                              Delete
                            </Button>
                          </div>
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
            <CardTitle>{editingServiceId ? "Edit service" : "New service"}</CardTitle>
            <CardDescription>
              Service duration and buffers are used in slot calculation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={serviceForm.name}
                onChange={(event) => onServiceFormChange({ name: event.target.value })}
                placeholder="Annual inspection"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug (optional)</label>
              <Input
                value={serviceForm.slug}
                onChange={(event) => onServiceFormChange({ slug: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={serviceForm.description}
                onChange={(event) => onServiceFormChange({ description: event.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={serviceForm.status}
                  onValueChange={(value: BookingServiceStatus) => onServiceFormChange({ status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Runtime access</label>
                <Select
                  value={serviceForm.submissionAccess}
                  onValueChange={(value: "public" | "internal") =>
                    onServiceFormChange({ submissionAccess: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose access" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_SUBMISSION_ACCESS_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "public" ? "Public (nonce + bot checks)" : "Internal (session or API key)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={serviceForm.durationMinutes}
                onChange={(event) => onServiceFormChange({ durationMinutes: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Public mode requires runtime token/nonce protection. Internal mode requires authenticated
                session or API key.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buffer before (minutes)</label>
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  value={serviceForm.bufferBeforeMinutes}
                  onChange={(event) => onServiceFormChange({ bufferBeforeMinutes: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Buffer after (minutes)</label>
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  value={serviceForm.bufferAfterMinutes}
                  onChange={(event) => onServiceFormChange({ bufferAfterMinutes: event.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (cents, optional)</label>
                <Input
                  type="number"
                  min={0}
                  value={serviceForm.priceCents}
                  onChange={(event) => onServiceFormChange({ priceCents: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency (optional)</label>
                <Input
                  value={serviceForm.currency}
                  onChange={(event) => onServiceFormChange({ currency: event.target.value })}
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSubmitService} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingServiceId ? "Save service" : "Create service"}
              </Button>
              {editingServiceId ? (
                <Button variant="outline" onClick={onCancelEdit}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service resource assignment</CardTitle>
          <CardDescription>
            Select which resources can execute the current service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-sm font-medium">Service</label>
              <Select value={selectedServiceId} onValueChange={onSelectService}>
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
            <div className="rounded-md border p-3">
              {serviceResourceLoading ? (
                <p className="text-sm text-muted-foreground">Loading service resources...</p>
              ) : resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create resources first to configure mapping.
                </p>
              ) : (
                <div className="space-y-3">
                  {resources.map((item) => {
                    const checked = serviceResourceIds.includes(item.id);
                    const required = requiredServiceResourceIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.type} · {item.timezone}
                          </p>
                        </div>
                        <div className="flex items-center gap-5">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                onToggleServiceResource(item.id, value === true)
                              }
                            />
                            Enabled
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked && required}
                              disabled={!checked}
                              onCheckedChange={(value) =>
                                onToggleRequiredServiceResource(item.id, value === true)
                              }
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onSaveServiceResources}
            disabled={!selectedServiceId || serviceResourceSaving}
          >
            {serviceResourceSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save assignment
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
