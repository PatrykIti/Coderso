import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createBookingBlackout,
  createBookingReservation,
  createBookingResource,
  createBookingService,
  deleteBookingBlackout,
  deleteBookingResource,
  deleteBookingService,
  getCachedBookingBlackouts,
  getCachedBookingReservations,
  getCachedBookingResources,
  getCachedBookingServices,
  resolveBookingSubmissionAccess,
  withBookingSubmissionAccess,
  listBookingBlackoutsCached,
  listBookingReservationsCached,
  listBookingResourcesCached,
  listBookingSchedulesCached,
  listBookingServiceResourcesCached,
  listBookingServicesCached,
  previewBookingSlots,
  setBookingSchedules,
  setBookingServiceResources,
  updateBookingReservationStatus,
  updateBookingResource,
  updateBookingService,
  type BookingBlackoutRecord,
  type BookingReservationRecord,
  type BookingReservationStatus,
  type BookingResourceRecord,
  type BookingScheduleInput,
  type BookingServiceRecord,
  type BookingSlotRecord,
} from "@/services/bookingClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { BookingAvailabilityTab } from "./components/AvailabilityTab";
import { BookingReservationsTab } from "./components/ReservationsTab";
import { BookingResourcesTab } from "./components/ResourcesTab";
import { BookingServicesTab } from "./components/ServicesTab";
import { BookingSlotPreviewTab } from "./components/SlotPreviewTab";
import {
  parseNumberInRange,
  parseOptionalNumber,
  parseTimeInput,
  readClientError,
  normalizeOptionalText,
  toIsoFromLocal,
} from "./bookingHelpers";
import {
  defaultBlackoutFormState,
  defaultReservationFormState,
  defaultResourceFormState,
  defaultScheduleDraftState,
  defaultServiceFormState,
  defaultSlotPreviewFormState,
  type BlackoutFormState,
  type FeedbackState,
  type ReservationFormState,
  type ResourceFormState,
  type ScheduleDraftState,
  type ServiceFormState,
  type SlotPreviewFormState,
} from "./bookingTypes";

export function BookingPage() {
  const initialResources = getCachedBookingResources();
  const initialServices = getCachedBookingServices();
  const initialReservations = getCachedBookingReservations();
  const initialBlackouts = getCachedBookingBlackouts();

  const [resources, setResources] = useState<BookingResourceRecord[]>(() => initialResources ?? []);
  const [services, setServices] = useState<BookingServiceRecord[]>(() => initialServices ?? []);
  const [reservations, setReservations] = useState<BookingReservationRecord[]>(
    () => initialReservations ?? []
  );
  const [blackouts, setBlackouts] = useState<BookingBlackoutRecord[]>(() => initialBlackouts ?? []);

  const [resourcesLoading, setResourcesLoading] = useState(() => !initialResources);
  const [servicesLoading, setServicesLoading] = useState(() => !initialServices);
  const [reservationsLoading, setReservationsLoading] = useState(() => !initialReservations);
  const [blackoutsLoading, setBlackoutsLoading] = useState(() => !initialBlackouts);

  const [selectedResourceId, setSelectedResourceId] = useState(
    () => initialResources?.[0]?.id ?? ""
  );
  const [selectedServiceId, setSelectedServiceId] = useState(() => initialServices?.[0]?.id ?? "");

  const [resourceForm, setResourceForm] = useState<ResourceFormState>(() =>
    defaultResourceFormState()
  );
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(() => defaultServiceFormState());
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [scheduleRows, setScheduleRows] = useState<BookingScheduleInput[]>([]);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraftState>(() =>
    defaultScheduleDraftState()
  );
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [serviceResourceIds, setServiceResourceIds] = useState<string[]>([]);
  const [requiredServiceResourceIds, setRequiredServiceResourceIds] = useState<string[]>([]);
  const [serviceResourceLoading, setServiceResourceLoading] = useState(false);
  const [serviceResourceSaving, setServiceResourceSaving] = useState(false);

  const [blackoutForm, setBlackoutForm] = useState<BlackoutFormState>(() =>
    defaultBlackoutFormState()
  );
  const [reservationForm, setReservationForm] = useState<ReservationFormState>(() =>
    defaultReservationFormState()
  );
  const [slotPreviewForm, setSlotPreviewForm] = useState<SlotPreviewFormState>(() =>
    defaultSlotPreviewFormState()
  );

  const [previewSlots, setPreviewSlots] = useState<BookingSlotRecord[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [reservationStatusDrafts, setReservationStatusDrafts] = useState<
    Record<string, BookingReservationStatus>
  >({});

  const patchResourceForm = useCallback((patch: Partial<ResourceFormState>) => {
    setResourceForm((current) => ({ ...current, ...patch }));
  }, []);

  const patchServiceForm = useCallback((patch: Partial<ServiceFormState>) => {
    setServiceForm((current) => ({ ...current, ...patch }));
  }, []);

  const patchScheduleDraft = useCallback((patch: Partial<ScheduleDraftState>) => {
    setScheduleDraft((current) => ({ ...current, ...patch }));
  }, []);

  const patchBlackoutForm = useCallback((patch: Partial<BlackoutFormState>) => {
    setBlackoutForm((current) => ({ ...current, ...patch }));
  }, []);

  const patchReservationForm = useCallback((patch: Partial<ReservationFormState>) => {
    setReservationForm((current) => ({ ...current, ...patch }));
  }, []);

  const patchSlotPreviewForm = useCallback((patch: Partial<SlotPreviewFormState>) => {
    setSlotPreviewForm((current) => ({ ...current, ...patch }));
  }, []);

  const resourcesById = useMemo(() => {
    const map = new Map<string, BookingResourceRecord>();
    for (const item of resources) map.set(item.id, item);
    return map;
  }, [resources]);

  const servicesById = useMemo(() => {
    const map = new Map<string, BookingServiceRecord>();
    for (const item of services) map.set(item.id, item);
    return map;
  }, [services]);

  const refreshResources = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? true;
      const background = options?.background ?? false;
      if (!background) setResourcesLoading(true);
      try {
        const items = await listBookingResourcesCached({ force });
        setResources(items);
        setSelectedResourceId((current) => {
          if (current && items.some((entry) => entry.id === current)) return current;
          return items[0]?.id ?? "";
        });
        setReservationForm((current) => ({
          ...current,
          resourceId: current.resourceId || items[0]?.id || "",
        }));
        setSlotPreviewForm((current) => ({
          ...current,
          resourceId: current.resourceId || items[0]?.id || "",
        }));
        setFeedback((current) => (current?.tone === "error" ? null : current));
      } catch (error) {
        if (!background) {
          setFeedback({
            tone: "error",
            title: "Unable to load resources",
            message: readClientError(error, "Failed to load booking resources."),
          });
        }
      } finally {
        setResourcesLoading(false);
      }
    },
    []
  );

  const refreshServices = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? true;
      const background = options?.background ?? false;
      if (!background) setServicesLoading(true);
      try {
        const items = await listBookingServicesCached({ force });
        setServices(items);
        setSelectedServiceId((current) => {
          if (current && items.some((entry) => entry.id === current)) return current;
          return items[0]?.id ?? "";
        });
        setReservationForm((current) => ({
          ...current,
          serviceId: current.serviceId || items[0]?.id || "",
        }));
        setSlotPreviewForm((current) => ({
          ...current,
          serviceId: current.serviceId || items[0]?.id || "",
        }));
        setFeedback((current) => (current?.tone === "error" ? null : current));
      } catch (error) {
        if (!background) {
          setFeedback({
            tone: "error",
            title: "Unable to load services",
            message: readClientError(error, "Failed to load booking services."),
          });
        }
      } finally {
        setServicesLoading(false);
      }
    },
    []
  );

  const refreshReservations = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? true;
      const background = options?.background ?? false;
      if (!background) setReservationsLoading(true);
      try {
        const items = await listBookingReservationsCached({ force });
        setReservations(items);
        setReservationStatusDrafts((current) => {
          const next: Record<string, BookingReservationStatus> = {};
          for (const item of items) {
            next[item.id] = current[item.id] ?? item.status;
          }
          return next;
        });
        setFeedback((current) => (current?.tone === "error" ? null : current));
      } catch (error) {
        if (!background) {
          setFeedback({
            tone: "error",
            title: "Unable to load reservations",
            message: readClientError(error, "Failed to load reservations."),
          });
        }
      } finally {
        setReservationsLoading(false);
      }
    },
    []
  );

  const refreshBlackouts = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      const force = options?.force ?? true;
      const background = options?.background ?? false;
      if (!background) setBlackoutsLoading(true);
      try {
        const items = await listBookingBlackoutsCached({ force });
        setBlackouts(items);
        setFeedback((current) => (current?.tone === "error" ? null : current));
      } catch (error) {
        if (!background) {
          setFeedback({
            tone: "error",
            title: "Unable to load blackouts",
            message: readClientError(error, "Failed to load blackout windows."),
          });
        }
      } finally {
        setBlackoutsLoading(false);
      }
    },
    []
  );

  const refreshSchedules = useCallback(
    async (resourceId: string, options?: { force?: boolean }) => {
      if (!resourceId) {
        setScheduleRows([]);
        return;
      }
      setScheduleLoading(true);
      try {
        const items = await listBookingSchedulesCached(resourceId, {
          force: options?.force,
        });
        setScheduleRows(
          items.map((item) => ({
            dayOfWeek: item.dayOfWeek,
            startMinute: item.startMinute,
            endMinute: item.endMinute,
            timezone: item.timezone,
            isAvailable: item.isAvailable,
          }))
        );
      } catch (error) {
        setFeedback({
          tone: "error",
          title: "Unable to load schedules",
          message: readClientError(error, "Failed to load resource schedules."),
        });
      } finally {
        setScheduleLoading(false);
      }
    },
    []
  );

  const refreshServiceResources = useCallback(async (serviceId: string) => {
    if (!serviceId) {
      setServiceResourceIds([]);
      setRequiredServiceResourceIds([]);
      return;
    }
    setServiceResourceLoading(true);
    try {
      const items = await listBookingServiceResourcesCached(serviceId, { force: true });
      const ids = items.map((item) => item.resourceId);
      const requiredIds = items.filter((item) => item.isRequired).map((item) => item.resourceId);
      setServiceResourceIds(ids);
      setRequiredServiceResourceIds(requiredIds);
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Unable to load service resources",
        message: readClientError(error, "Failed to load service-resource mapping."),
      });
    } finally {
      setServiceResourceLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      refreshResources({ force: true, background: true }).catch(() => undefined);
      refreshServices({ force: true, background: true }).catch(() => undefined);
      refreshReservations({ force: true, background: true }).catch(() => undefined);
      refreshBlackouts({ force: true, background: true }).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [refreshBlackouts, refreshReservations, refreshResources, refreshServices]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      refreshSchedules(selectedResourceId, { force: true }).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [refreshSchedules, selectedResourceId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      refreshServiceResources(selectedServiceId).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [refreshServiceResources, selectedServiceId]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.bookingResourcesList) {
        refreshResources({ force: true, background: true }).catch(() => undefined);
      }
      if (event.key === cacheKeys.bookingServicesList) {
        refreshServices({ force: true, background: true }).catch(() => undefined);
      }
      if (event.key === cacheKeys.bookingReservationsList) {
        refreshReservations({ force: true, background: true }).catch(() => undefined);
      }
      if (event.key === cacheKeys.bookingBlackoutsList) {
        refreshBlackouts({ force: true, background: true }).catch(() => undefined);
      }
    });
  }, [refreshBlackouts, refreshReservations, refreshResources, refreshServices]);

  const handleRefreshAll = async () => {
    await Promise.all([
      refreshResources({ force: true }),
      refreshServices({ force: true }),
      refreshReservations({ force: true }),
      refreshBlackouts({ force: true }),
    ]);
    setFeedback({
      tone: "success",
      title: "Booking data refreshed",
      message: "Resources, services, schedules, blackouts, and reservations are up to date.",
    });
  };

  const handleSubmitResource = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        name: resourceForm.name.trim(),
        slug: normalizeOptionalText(resourceForm.slug),
        type: resourceForm.type,
        status: resourceForm.status,
        timezone: resourceForm.timezone.trim() || "UTC",
        capacity: parseNumberInRange(resourceForm.capacity, "Capacity", {
          min: 1,
          max: 10000,
        }),
      };
      if (!payload.name) throw new Error("Resource name is required.");

      if (editingResourceId) {
        await updateBookingResource(editingResourceId, payload);
      } else {
        const created = await createBookingResource(payload);
        if (created?.id) setSelectedResourceId(created.id);
      }

      await refreshResources({ force: true, background: true });
      setResourceForm(defaultResourceFormState());
      setEditingResourceId(null);
      setFeedback({
        tone: "success",
        title: editingResourceId ? "Resource updated" : "Resource created",
        message: "Resource settings have been saved.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Resource save failed",
        message: readClientError(error, "Unable to save resource."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditResource = (item: BookingResourceRecord) => {
    setEditingResourceId(item.id);
    setResourceForm({
      name: item.name,
      slug: item.slug,
      type: item.type,
      status: item.status,
      timezone: item.timezone,
      capacity: String(item.capacity),
    });
  };

  const handleDeleteResource = async (id: string) => {
    setFeedback(null);
    try {
      await deleteBookingResource(id);
      await refreshResources({ force: true, background: true });
      setFeedback({
        tone: "success",
        title: "Resource removed",
        message: "Resource was deleted.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Delete failed",
        message: readClientError(error, "Unable to delete resource."),
      });
    }
  };

  const handleSubmitService = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const existingServiceSettings = editingServiceId
        ? servicesById.get(editingServiceId)?.settings
        : undefined;

      const payload = {
        name: serviceForm.name.trim(),
        slug: normalizeOptionalText(serviceForm.slug),
        status: serviceForm.status,
        description: normalizeOptionalText(serviceForm.description),
        durationMinutes: parseNumberInRange(serviceForm.durationMinutes, "Duration", {
          min: 5,
          max: 1440,
        }),
        bufferBeforeMinutes: parseNumberInRange(serviceForm.bufferBeforeMinutes, "Buffer before", {
          min: 0,
          max: 1440,
        }),
        bufferAfterMinutes: parseNumberInRange(serviceForm.bufferAfterMinutes, "Buffer after", {
          min: 0,
          max: 1440,
        }),
        priceCents: parseOptionalNumber(serviceForm.priceCents, "Price", 0, 1_000_000_000),
        currency: normalizeOptionalText(serviceForm.currency),
        settings: withBookingSubmissionAccess(
          existingServiceSettings,
          serviceForm.submissionAccess
        ),
      };
      if (!payload.name) throw new Error("Service name is required.");

      if (editingServiceId) {
        await updateBookingService(editingServiceId, payload);
      } else {
        const created = await createBookingService(payload);
        if (created?.id) setSelectedServiceId(created.id);
      }

      await refreshServices({ force: true, background: true });
      setServiceForm(defaultServiceFormState());
      setEditingServiceId(null);
      setFeedback({
        tone: "success",
        title: editingServiceId ? "Service updated" : "Service created",
        message: "Service settings have been saved.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Service save failed",
        message: readClientError(error, "Unable to save service."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditService = (item: BookingServiceRecord) => {
    setEditingServiceId(item.id);
    setServiceForm({
      name: item.name,
      slug: item.slug,
      status: item.status,
      description: item.description ?? "",
      durationMinutes: String(item.durationMinutes),
      bufferBeforeMinutes: String(item.bufferBeforeMinutes),
      bufferAfterMinutes: String(item.bufferAfterMinutes),
      priceCents: item.priceCents != null ? String(item.priceCents) : "",
      currency: item.currency ?? "",
      submissionAccess: resolveBookingSubmissionAccess(item.settings, "public"),
    });
  };

  const handleDeleteService = async (id: string) => {
    setFeedback(null);
    try {
      await deleteBookingService(id);
      await refreshServices({ force: true, background: true });
      setFeedback({
        tone: "success",
        title: "Service removed",
        message: "Service was deleted.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Delete failed",
        message: readClientError(error, "Unable to delete service."),
      });
    }
  };

  const handleToggleServiceResource = (resourceId: string, enabled: boolean) => {
    setServiceResourceIds((current) => {
      const set = new Set(current);
      if (enabled) set.add(resourceId);
      else set.delete(resourceId);
      return Array.from(set);
    });
    if (!enabled) {
      setRequiredServiceResourceIds((current) => current.filter((id) => id !== resourceId));
    }
  };

  const handleToggleRequiredServiceResource = (resourceId: string, required: boolean) => {
    setRequiredServiceResourceIds((current) => {
      const set = new Set(current);
      if (required) set.add(resourceId);
      else set.delete(resourceId);
      return Array.from(set);
    });
  };

  const handleSaveServiceResources = async () => {
    if (!selectedServiceId) return;
    setServiceResourceSaving(true);
    setFeedback(null);
    try {
      const requiredSet = new Set(requiredServiceResourceIds);
      const payload = serviceResourceIds.map((resourceId) => ({
        resourceId,
        isRequired: requiredSet.has(resourceId),
      }));
      await setBookingServiceResources(selectedServiceId, payload);
      await refreshServiceResources(selectedServiceId);
      setFeedback({
        tone: "success",
        title: "Service resources saved",
        message: "Resource assignment for selected service is updated.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Save failed",
        message: readClientError(error, "Unable to save service resources."),
      });
    } finally {
      setServiceResourceSaving(false);
    }
  };

  const handleAddScheduleRow = () => {
    try {
      const startMinute = parseTimeInput(scheduleDraft.startTime, "Start time");
      const endMinute = parseTimeInput(scheduleDraft.endTime, "End time");
      if (endMinute <= startMinute) throw new Error("End time must be later than start time.");
      const dayOfWeek = parseNumberInRange(scheduleDraft.dayOfWeek, "Day", {
        min: 0,
        max: 6,
      });
      const next: BookingScheduleInput = {
        dayOfWeek,
        startMinute,
        endMinute,
        timezone: scheduleDraft.timezone.trim() || "UTC",
        isAvailable: scheduleDraft.isAvailable,
      };
      setScheduleRows((current) => [...current, next]);
      setScheduleDraft(defaultScheduleDraftState());
      setFeedback(null);
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Schedule row is invalid",
        message: readClientError(error, "Unable to add schedule row."),
      });
    }
  };

  const handleRemoveScheduleRow = (index: number) => {
    setScheduleRows((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveSchedules = async () => {
    if (!selectedResourceId) return;
    setScheduleSaving(true);
    setFeedback(null);
    try {
      await setBookingSchedules(selectedResourceId, scheduleRows);
      await refreshSchedules(selectedResourceId, { force: true });
      setFeedback({
        tone: "success",
        title: "Schedules saved",
        message: "Availability schedule for selected resource was updated.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Schedule save failed",
        message: readClientError(error, "Unable to save schedules."),
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleCreateBlackout = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const startsAt = toIsoFromLocal(blackoutForm.startsAt, "Blackout start");
      const endsAt = toIsoFromLocal(blackoutForm.endsAt, "Blackout end");
      if (new Date(endsAt) <= new Date(startsAt)) {
        throw new Error("Blackout end must be later than start.");
      }
      await createBookingBlackout({
        resourceId:
          blackoutForm.resourceId === "all" ? null : normalizeOptionalText(blackoutForm.resourceId),
        startsAt,
        endsAt,
        reason: normalizeOptionalText(blackoutForm.reason),
      });
      await refreshBlackouts({ force: true, background: true });
      setBlackoutForm(defaultBlackoutFormState());
      setFeedback({
        tone: "success",
        title: "Blackout created",
        message: "Blackout window was saved.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Blackout save failed",
        message: readClientError(error, "Unable to save blackout."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlackout = async (id: string) => {
    setFeedback(null);
    try {
      await deleteBookingBlackout(id);
      await refreshBlackouts({ force: true, background: true });
      setFeedback({
        tone: "success",
        title: "Blackout removed",
        message: "Blackout window was deleted.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Delete failed",
        message: readClientError(error, "Unable to delete blackout."),
      });
    }
  };

  const handleCreateReservation = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      if (!reservationForm.serviceId) throw new Error("Service is required.");
      if (!reservationForm.resourceId) throw new Error("Resource is required.");
      if (!reservationForm.customerName.trim()) {
        throw new Error("Customer name is required.");
      }

      const startsAt = toIsoFromLocal(reservationForm.startsAt, "Start time");
      const endsAt = toIsoFromLocal(reservationForm.endsAt, "End time");
      if (new Date(endsAt) <= new Date(startsAt)) {
        throw new Error("End time must be later than start time.");
      }

      await createBookingReservation({
        serviceId: reservationForm.serviceId,
        resourceId: reservationForm.resourceId,
        startsAt,
        endsAt,
        timezone: reservationForm.timezone.trim() || "UTC",
        customerName: reservationForm.customerName.trim(),
        customerEmail: normalizeOptionalText(reservationForm.customerEmail),
        customerPhone: normalizeOptionalText(reservationForm.customerPhone),
        notes: normalizeOptionalText(reservationForm.notes),
      });
      await refreshReservations({ force: true, background: true });
      setReservationForm((current) => ({
        ...defaultReservationFormState(),
        serviceId: current.serviceId,
        resourceId: current.resourceId,
      }));
      setFeedback({
        tone: "success",
        title: "Reservation created",
        message: "Reservation was added successfully.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Reservation save failed",
        message: readClientError(error, "Unable to create reservation."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReservationStatus = async (id: string) => {
    const nextStatus = reservationStatusDrafts[id];
    if (!nextStatus) return;
    setFeedback(null);
    try {
      await updateBookingReservationStatus(id, nextStatus);
      await refreshReservations({ force: true, background: true });
      setFeedback({
        tone: "success",
        title: "Status updated",
        message: "Reservation status has been updated.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Status update failed",
        message: readClientError(error, "Unable to update reservation status."),
      });
    }
  };

  const handlePreviewSlots = async () => {
    setPreviewLoading(true);
    setFeedback(null);
    try {
      if (!slotPreviewForm.serviceId) throw new Error("Service is required.");
      if (!slotPreviewForm.resourceId) throw new Error("Resource is required.");
      if (!slotPreviewForm.date.trim()) throw new Error("Date is required.");
      const intervalMinutes = parseNumberInRange(slotPreviewForm.intervalMinutes, "Interval", {
        min: 5,
        max: 180,
      });
      const items = await previewBookingSlots({
        serviceId: slotPreviewForm.serviceId,
        resourceId: slotPreviewForm.resourceId,
        date: slotPreviewForm.date.trim(),
        timezone: slotPreviewForm.timezone.trim() || "UTC",
        intervalMinutes,
      });
      setPreviewSlots(items);
      setFeedback({
        tone: "success",
        title: "Slot preview completed",
        message:
          items.length > 0
            ? `Found ${items.length} available slots.`
            : "No available slots for selected date and resource.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        title: "Slot preview failed",
        message: readClientError(error, "Unable to preview slots."),
      });
      setPreviewSlots([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/advanced/booking" breadcrumbs={["Coderso", "Booking"]}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Booking"
          description="Configure resources, services, availability, blackout windows, and reservations."
          actions={
            <Button className="gap-2" variant="outline" onClick={handleRefreshAll}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          }
        />

        {feedback ? (
          <Alert variant={feedback.tone === "error" ? "destructive" : "default"}>
            <AlertTitle>{feedback.title}</AlertTitle>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="resources" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-2">
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="slot-preview">Slot Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="space-y-4">
            <BookingResourcesTab
              resources={resources}
              resourcesLoading={resourcesLoading}
              selectedResourceId={selectedResourceId}
              editingResourceId={editingResourceId}
              resourceForm={resourceForm}
              saving={saving}
              onSelectResource={setSelectedResourceId}
              onResourceFormChange={patchResourceForm}
              onSubmitResource={handleSubmitResource}
              onEditResource={handleEditResource}
              onDeleteResource={handleDeleteResource}
              onCancelEdit={() => {
                setEditingResourceId(null);
                setResourceForm(defaultResourceFormState());
              }}
            />
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <BookingServicesTab
              services={services}
              servicesLoading={servicesLoading}
              selectedServiceId={selectedServiceId}
              editingServiceId={editingServiceId}
              serviceForm={serviceForm}
              resources={resources}
              serviceResourceIds={serviceResourceIds}
              requiredServiceResourceIds={requiredServiceResourceIds}
              serviceResourceLoading={serviceResourceLoading}
              serviceResourceSaving={serviceResourceSaving}
              saving={saving}
              onSelectService={setSelectedServiceId}
              onServiceFormChange={patchServiceForm}
              onSubmitService={handleSubmitService}
              onEditService={handleEditService}
              onDeleteService={handleDeleteService}
              onCancelEdit={() => {
                setEditingServiceId(null);
                setServiceForm(defaultServiceFormState());
              }}
              onToggleServiceResource={handleToggleServiceResource}
              onToggleRequiredServiceResource={handleToggleRequiredServiceResource}
              onSaveServiceResources={handleSaveServiceResources}
            />
          </TabsContent>

          <TabsContent value="availability" className="space-y-4">
            <BookingAvailabilityTab
              resources={resources}
              resourcesById={resourcesById}
              selectedResourceId={selectedResourceId}
              onSelectResource={setSelectedResourceId}
              scheduleRows={scheduleRows}
              scheduleDraft={scheduleDraft}
              scheduleLoading={scheduleLoading}
              scheduleSaving={scheduleSaving}
              onScheduleDraftChange={patchScheduleDraft}
              onAddScheduleRow={handleAddScheduleRow}
              onRemoveScheduleRow={handleRemoveScheduleRow}
              onSaveSchedules={handleSaveSchedules}
              blackoutForm={blackoutForm}
              blackouts={blackouts}
              blackoutsLoading={blackoutsLoading}
              saving={saving}
              onBlackoutFormChange={patchBlackoutForm}
              onCreateBlackout={handleCreateBlackout}
              onDeleteBlackout={handleDeleteBlackout}
            />
          </TabsContent>

          <TabsContent value="reservations" className="space-y-4">
            <BookingReservationsTab
              reservations={reservations}
              reservationsLoading={reservationsLoading}
              services={services}
              resources={resources}
              servicesById={servicesById}
              resourcesById={resourcesById}
              reservationStatusDrafts={reservationStatusDrafts}
              reservationForm={reservationForm}
              saving={saving}
              onReservationFormChange={patchReservationForm}
              onReservationStatusDraftChange={(id, status) =>
                setReservationStatusDrafts((current) => ({ ...current, [id]: status }))
              }
              onCreateReservation={handleCreateReservation}
              onUpdateReservationStatus={handleUpdateReservationStatus}
            />
          </TabsContent>

          <TabsContent value="slot-preview" className="space-y-4">
            <BookingSlotPreviewTab
              services={services}
              resources={resources}
              slotPreviewForm={slotPreviewForm}
              previewSlots={previewSlots}
              previewLoading={previewLoading}
              onSlotPreviewFormChange={patchSlotPreviewForm}
              onPreviewSlots={handlePreviewSlots}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
