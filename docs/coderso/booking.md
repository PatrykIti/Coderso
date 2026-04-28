---
title: "Coderso Booking"
audience: "admin"
productArea: "coderso-booking"
language: "en"
keywords:
  - booking
  - reservations
  - availability
  - services
  - resources
  - slot preview
---

# Basic

Booking is the tabbed operations module for appointment and reservation
workflows. In the current UI, one screen groups together:
- `Resources`
- `Services`
- `Availability`
- `Reservations`
- `Slot Preview`

The local environment currently lands in an onboarding-style `Resources` state
with an empty resource table and a `Create resource` form, but the wider module
contract clearly includes all five operational tabs.

# Medium

Use Booking when services, resources, time slots, and availability rules are
core to the customer flow.

Use this surface when:
- appointment scheduling is required,
- availability and blackout rules drive conversion quality,
- reservations must be managed operationally after launch.

The current workflow is easiest to understand in dependency order:
- resources:
  who or what can fulfill bookings
- services:
  what can be booked and which resources can fulfill it
- availability:
  weekly schedules and blackout windows
- reservations:
  incoming booking lifecycle management
- slot preview:
  test slot output before trusting runtime behavior

# Instruction

1. Open `Coderso > Booking`.
2. Start with the top tabs and treat them as one connected system, not five
   separate mini-features.
3. Begin in `Resources`.
4. In the current onboarding state, create your first resource before trying to
   configure downstream booking behavior.
5. Fill the resource form in this order:
   - `Name`
   - `Slug (optional)`
   - `Type`
   - `Status`
   - `Timezone`
   - `Capacity`
6. Save or create the resource.
7. Move to `Services`.
   Use this tab to define bookable services and connect them to the resources
   that can fulfill them.
8. Move to `Availability`.
   Use it for:
   - weekly schedules,
   - blackout windows,
   - time-based availability control.
9. Move to `Reservations`.
   Use it to monitor incoming bookings and update their lifecycle state.
10. Move to `Slot Preview`.
    Use it to simulate slot output before relying on the runtime booking flow.
11. Use `Refresh` when you know booking data changed and the screen should pull
    the latest state.

Use this safe setup order when you want fewer booking mistakes:
1. Create resources.
2. Create services.
3. Assign services to resources.
4. Configure schedules and blackout windows.
5. Preview slots.
6. Only then trust reservations at scale.

# Advanced

- Model service/resource dependencies explicitly to avoid hidden overbooking
  paths.
- Separate policy layers: baseline availability, exceptional blackout rules, and
  campaign-specific overrides.
- Validate timezone and locale assumptions before scaling across regions.
- Capacity is not just metadata. It changes how slot allocation and reservation
  pressure behave.
- Slot preview should be part of operational QA, not just an optional demo tab.
- Booking tabs are interdependent. Debugging the wrong tab first wastes time:
  missing resources often explains service or slot issues before deeper runtime
  analysis is needed.

# Troubleshooting

- If the module feels blocked at the start:
  create a resource first. The current onboarding state is resource-first.
- If slots disappear unexpectedly:
  inspect blackout and availability overlap.
- If reservations conflict:
  verify resource assignment, capacity, and service duration constraints.
- If users report inconsistent times:
  validate timezone configuration across admin/runtime surfaces.
- If services cannot be configured meaningfully:
  confirm the necessary resources already exist.
- If slot output looks wrong:
  use `Slot Preview` before blaming reservations or frontend runtime.

# Decision Guide

- Choose Booking for appointment workflows.
- Choose Commerce for product catalog flows.
- Use Forms-only flow for lead capture when slot scheduling is not needed.
- Choose resource setup before service setup:
  services depend on fulfillers, so resources should usually be created first.
- Choose blackout logic vs service edits:
  use blackout/schedule controls for time availability problems; use service
  editing for duration/assignment problems.

# Checklist

1. Resources created and configured correctly.
2. Services created and mapped to the right resources.
3. Availability and blackout rules validated.
4. Slot Preview tested with representative values.
5. Reservations workflow reviewed.
6. Monitoring plan prepared for post-launch slot behavior.

# Security

- Keep booking write paths protected by nonce/session/RBAC requirements.
- Validate incoming reservation payloads with strict schema constraints.
- Protect integration/webhook secrets outside editable booking content.
- Treat reservation state changes and booking configuration as operationally
  sensitive admin actions, not casual content edits.
