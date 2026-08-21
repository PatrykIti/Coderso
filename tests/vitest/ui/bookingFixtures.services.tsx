// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

vi.mock("../../../core/admin/ui/booking/components/ServicesTab", () => ({
  BookingServicesTab: ({
    services,
    selectedServiceId,
    editingServiceId,
    serviceResourceIds,
    requiredServiceResourceIds,
    serviceResourceLoading,
    serviceResourceSaving,
    onSelectService,
    onServiceFormChange,
    onSubmitService,
    onEditService,
    onDeleteService,
    onCancelEdit,
    onToggleServiceResource,
    onToggleRequiredServiceResource,
    onSaveServiceResources,
  }: {
    services: Array<{ id: string; name: string }>;
    selectedServiceId: string;
    editingServiceId: string | null;
    serviceResourceIds: string[];
    requiredServiceResourceIds: string[];
    serviceResourceLoading: boolean;
    serviceResourceSaving: boolean;
    onSelectService: (id: string) => void;
    onServiceFormChange: (patch: Record<string, unknown>) => void;
    onSubmitService: () => void;
    onEditService: (item: { id: string; name: string }) => void;
    onDeleteService: (id: string) => void;
    onCancelEdit: () => void;
    onToggleServiceResource: (resourceId: string, enabled: boolean) => void;
    onToggleRequiredServiceResource: (resourceId: string, required: boolean) => void;
    onSaveServiceResources: () => void;
  }) => (
    <div>
      <span>{`services:${services.length}`}</span>
      <span>{`selected-service:${selectedServiceId}`}</span>
      <span>{`editing-service:${editingServiceId ?? "none"}`}</span>
      <span>{`service-resource-count:${serviceResourceIds.length}`}</span>
      <span>{`required-resource-count:${requiredServiceResourceIds.length}`}</span>
      <span>{`service-resource-loading:${String(serviceResourceLoading)}`}</span>
      <span>{`service-resource-saving:${String(serviceResourceSaving)}`}</span>
      <button type="button" onClick={() => onSelectService(services[0]?.id ?? "")}>
        select-service
      </button>
      <button
        type="button"
        onClick={() =>
          onServiceFormChange({
            name: "Workshop",
            slug: "workshop",
            status: "active",
            description: "Hands-on session",
            durationMinutes: "90",
            bufferBeforeMinutes: "15",
            bufferAfterMinutes: "15",
            priceCents: "25000",
            currency: "PLN",
            submissionAccess: "public",
          })
        }
      >
        fill-service
      </button>
      <button type="button" onClick={onSubmitService}>
        submit-service
      </button>
      <button
        type="button"
        onClick={() => onEditService(services[0]!)}
        disabled={services.length === 0}
      >
        edit-service
      </button>
      <button
        type="button"
        onClick={() =>
          onServiceFormChange({
            name: "Consultation Pro",
            slug: "consultation",
            status: "active",
            description: "Updated service",
            durationMinutes: "75",
            bufferBeforeMinutes: "5",
            bufferAfterMinutes: "10",
            priceCents: "18000",
            currency: "PLN",
            submissionAccess: "internal",
          })
        }
      >
        fill-updated-service
      </button>
      <button type="button" onClick={() => onDeleteService(services[0]?.id ?? "")}>
        delete-service
      </button>
      <button type="button" onClick={() => onDeleteService(selectedServiceId)}>
        delete-selected-service
      </button>
      <button
        type="button"
        onClick={() =>
          onServiceFormChange({
            name: "",
            slug: "",
            status: "active",
            description: "",
            durationMinutes: "60",
            bufferBeforeMinutes: "10",
            bufferAfterMinutes: "15",
            priceCents: "15000",
            currency: "PLN",
            submissionAccess: "public",
          })
        }
      >
        fill-empty-service
      </button>
      <button type="button" onClick={onCancelEdit}>
        cancel-service
      </button>
      <button type="button" onClick={() => onToggleServiceResource("resource-1", true)}>
        enable-service-resource
      </button>
      <button type="button" onClick={() => onToggleServiceResource("resource-1", false)}>
        disable-service-resource
      </button>
      <button type="button" onClick={() => onToggleRequiredServiceResource("resource-1", true)}>
        require-service-resource
      </button>
      <button type="button" onClick={() => onToggleRequiredServiceResource("resource-1", false)}>
        unrequire-service-resource
      </button>
      <button type="button" onClick={onSaveServiceResources}>
        save-service-resources
      </button>
    </div>
  ),
}));
