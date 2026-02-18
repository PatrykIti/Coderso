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
import type {
  BookingResourceRecord,
  BookingResourceStatus,
  BookingResourceType,
} from "@/services/bookingClient";

import { formatResourceType } from "../bookingHelpers";
import {
  RESOURCE_STATUS_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  type ResourceFormState,
} from "../bookingTypes";

type BookingResourcesTabProps = {
  resources: BookingResourceRecord[];
  resourcesLoading: boolean;
  selectedResourceId: string;
  editingResourceId: string | null;
  resourceForm: ResourceFormState;
  saving: boolean;
  onSelectResource: (id: string) => void;
  onResourceFormChange: (patch: Partial<ResourceFormState>) => void;
  onSubmitResource: () => void;
  onEditResource: (item: BookingResourceRecord) => void;
  onDeleteResource: (id: string) => void;
  onCancelEdit: () => void;
};

export function BookingResourcesTab({
  resources,
  resourcesLoading,
  selectedResourceId,
  editingResourceId,
  resourceForm,
  saving,
  onSelectResource,
  onResourceFormChange,
  onSubmitResource,
  onEditResource,
  onDeleteResource,
  onCancelEdit,
}: BookingResourcesTabProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            Manage bookable resources like staff, bays, tools, and vehicles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {resourcesLoading ? (
            <div className="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground">
              Loading resources...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No resources yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((item) => (
                    <TableRow
                      key={item.id}
                      className={selectedResourceId === item.id ? "bg-muted/40" : undefined}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{formatResourceType(item.type)}</TableCell>
                      <TableCell>{item.timezone}</TableCell>
                      <TableCell>{item.capacity}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "active" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onSelectResource(item.id);
                              onEditResource(item);
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onDeleteResource(item.id)}>
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
          <CardTitle>{editingResourceId ? "Edit resource" : "New resource"}</CardTitle>
          <CardDescription>
            Resource settings are used by schedule and reservation checks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={resourceForm.name}
              onChange={(event) => onResourceFormChange({ name: event.target.value })}
              placeholder="Senior mechanic"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Slug (optional)</label>
            <Input
              value={resourceForm.slug}
              onChange={(event) => onResourceFormChange({ slug: event.target.value })}
              placeholder="senior-mechanic"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={resourceForm.type}
                onValueChange={(value: BookingResourceType) => onResourceFormChange({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPE_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatResourceType(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={resourceForm.status}
                onValueChange={(value: BookingResourceStatus) =>
                  onResourceFormChange({ status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <Input
                value={resourceForm.timezone}
                onChange={(event) => onResourceFormChange({ timezone: event.target.value })}
                placeholder="UTC"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity</label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={resourceForm.capacity}
                onChange={(event) => onResourceFormChange({ capacity: event.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onSubmitResource} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingResourceId ? "Save resource" : "Create resource"}
            </Button>
            {editingResourceId ? (
              <Button variant="outline" onClick={onCancelEdit}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
