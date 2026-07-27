/**
 * Scheduling: bookable resources and services, the resources a service needs,
 * weekly availability, blackout windows and the bookings themselves.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { formSubmissions } from "./forms";

export const bookingResources = pgTable(
  "booking_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull().default("staff"),
    status: text("status").notNull().default("active"),
    timezone: text("timezone").notNull().default("UTC"),
    capacity: integer("capacity").notNull().default(1),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("booking_resources_slug_idx").on(t.slug),
    typeIdx: index("booking_resources_type_idx").on(t.type),
    statusIdx: index("booking_resources_status_idx").on(t.status),
    updatedAtIdx: index("booking_resources_updated_at_idx").on(t.updatedAt),
  })
);

export const bookingServices = pgTable(
  "booking_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    priceCents: integer("price_cents"),
    currency: text("currency"),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("booking_services_slug_idx").on(t.slug),
    statusIdx: index("booking_services_status_idx").on(t.status),
    updatedAtIdx: index("booking_services_updated_at_idx").on(t.updatedAt),
  })
);

export const bookingServiceResources = pgTable(
  "booking_service_resources",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => bookingServices.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => bookingResources.id, { onDelete: "cascade" }),
    isRequired: boolean("is_required").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.serviceId, t.resourceId] }),
    serviceIdx: index("booking_service_resources_service_idx").on(t.serviceId),
    resourceIdx: index("booking_service_resources_resource_idx").on(t.resourceId),
  })
);

export const bookingSchedules = pgTable(
  "booking_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => bookingResources.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    resourceDayIdx: index("booking_schedules_resource_day_idx").on(t.resourceId, t.dayOfWeek),
    resourceTimeIdx: index("booking_schedules_resource_time_idx").on(
      t.resourceId,
      t.startMinute,
      t.endMinute
    ),
  })
);

export const bookingBlackouts = pgTable(
  "booking_blackouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id").references(() => bookingResources.id, {
      onDelete: "cascade",
    }),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    resourceTimeIdx: index("booking_blackouts_resource_time_idx").on(
      t.resourceId,
      t.startsAt,
      t.endsAt
    ),
    startsIdx: index("booking_blackouts_starts_idx").on(t.startsAt),
  })
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => bookingServices.id, { onDelete: "restrict" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => bookingResources.id, { onDelete: "restrict" }),
    formSubmissionId: uuid("form_submission_id").references(() => formSubmissions.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    notes: text("notes"),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    serviceIdx: index("bookings_service_idx").on(t.serviceId),
    resourceIdx: index("bookings_resource_idx").on(t.resourceId),
    statusIdx: index("bookings_status_idx").on(t.status),
    startsIdx: index("bookings_starts_idx").on(t.startsAt),
    resourceWindowIdx: index("bookings_resource_window_idx").on(t.resourceId, t.startsAt, t.endsAt),
  })
);
