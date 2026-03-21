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
---

# Basic

Booking is the scheduling module for appointment and reservation workflows.

# Medium

Use Booking when services, resources, time slots, and availability rules are
core to the customer flow.

Use this surface when:
- appointment scheduling is required,
- availability and blackout rules drive conversion quality,
- reservations must be managed operationally after launch.

# Instruction

1. Define services and assign resources that can fulfill each service.
2. Configure availability windows, blackout periods, and slot logic.
3. Review preview behavior from reservation-user perspective.
4. Go live and monitor reservation load patterns.
5. Tune service duration and slot policies as real usage data arrives.

# Advanced

- Model service/resource dependencies explicitly to avoid hidden overbooking
  paths.
- Separate policy layers: baseline availability, exceptional blackout rules, and
  campaign-specific overrides.
- Validate timezone and locale assumptions before scaling across regions.

# Troubleshooting

- If slots disappear unexpectedly, inspect blackout and availability overlap.
- If reservations conflict, verify resource assignment and service duration
  constraints.
- If users report inconsistent times, validate timezone configuration across
  admin/runtime surfaces.

# Decision Guide

- Choose Booking for appointment workflows.
- Choose Commerce for product catalog flows.
- Use Forms-only flow for lead capture when slot scheduling is not needed.

# Checklist

1. Services and resources mapped correctly.
2. Availability and blackout rules validated.
3. Preview flow tested end-to-end.
4. Notification/dependent integrations verified.
5. Monitoring plan prepared for post-launch slot behavior.

# Security

- Keep booking write paths protected by nonce/session/RBAC requirements.
- Validate incoming reservation payloads with strict schema constraints.
- Protect integration/webhook secrets outside editable booking content.
