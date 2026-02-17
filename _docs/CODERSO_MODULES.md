# Coderso Modules Map (WordPress-like, Composite-first)

## Purpose
Single source of truth for Coderso module architecture, coverage targets, and implementation phases.

## Reference Parity (Crocoblock families)
- Dynamic data/listings: JetEngine, JetGridBuilder
- Filters/search: JetSmartFilters, JetSearch
- Forms/automation: JetFormBuilder
- Booking/appointments: JetBooking, JetAppointment
- UI engagement: JetMenu, JetPopup, JetReviews
- Commerce: JetWooBuilder + related Woo tools

## Coderso Principle
- Default UX for non-technical users:
  1. Solution Kits
  2. Composite widgets
  3. Atomic widgets only in advanced mode

## Module Catalog

### Core Builder (Foundation)
- Engine
- Entries
- Posts
- Widgets
- Templates
- Forms

### Business Builder
- Listings
- Filters
- Search
- Booking
- Appointments
- Reviews

### Growth Builder
- Commerce
- Popups
- Mega Menu
- Portal/Membership
- Multilingual/i18n
- AI Builder Wizard

## Coverage Matrix (High level)
- Company website + blog: Core Builder only
- Service business lead gen: Core Builder + Forms + Listings + Filters
- Appointment websites: + Booking/Appointments
- Directory website: + Listings + Filters + Search + Reviews
- Small commerce: + Commerce + Filters + Reviews
- Client portal website: + Portal/Membership + Forms + Listings
- Multilingual company website: + Multilingual/i18n + localized templates/posts

## Readiness Gates
A module can be marked stable only if:
- Composite pack minimum is met
- Security baseline is green
- Performance budget is green
- Docs and migration notes are complete

## Links to Tasks
- `TASK-054-06`..`TASK-054-21`
- `TASK-055` posts workflow
