---
title: "Analytics"
audience: "admin"
productArea: "analytics"
language: "en"
keywords:
  - analytics
  - kpi
  - top content
  - content activity
  - reporting
---

# Basic

Analytics is the reporting surface for high-level content activity and recent
performance signals across the admin workspace. It is where you review KPI
cards, compare content activity over time, and inspect the current top content
ranking for the selected date range.

In the current UI, this screen includes:
- a date-range selector in the topbar,
- KPI cards for:
  `Published Pages`, `Content Entries`, `Media Items`,
- a `Content Activity` chart,
- a `Top Performing Content` summary panel,
- a `Top Content` table,
- a `Top Content` drawer opened by `View all`.

# Medium

Use Analytics when you need an operational snapshot of recent publishing and
content activity instead of page-by-page inspection. The current route is
designed for:
- scanning growth or decline through KPI deltas,
- checking activity trends for the selected period,
- seeing which content items are currently strongest,
- moving from summary ranking into the full top-content list.

This is not a deep BI workspace. It is a focused admin overview that helps you:
- understand recent content movement,
- compare current vs previous period at a glance,
- spot strong and weak content items quickly,
- decide where deeper follow-up work should happen next.

# Instruction

1. Open `Analytics`.
2. Start with the date-range selector in the topbar.
3. Choose the reporting window you need:
   - `Last 7 days`
   - `Last 30 days`
   - `Last 90 days`
   - `Year to date`
4. Review the KPI cards first:
   - `Published Pages`
   - `Content Entries`
   - `Media Items`
5. Use the delta badges on the KPI cards to understand whether the selected
   period is trending up or down against the previous one.
6. Move to `Content Activity`.
7. Read the chart as a period-over-period activity view:
   - `Current period`
   - `Previous period`
8. Use `Top Performing Content` to scan the strongest paths quickly without
   opening the full ranking yet.
9. Move to the `Top Content` table for the fuller list.
10. In the table, review:
    - content title and path,
    - activity score,
    - updated date,
    - content type,
    - trend badge.
11. Use `View all` when you want the full ranking in the drawer.
12. In `Top Content`, review the full ordered list for the selected date range.
13. Use `Close` when the ranking review is finished.
14. Use `Export` when the ranking needs to be handed off or reviewed outside the
    drawer.

Use this safe analytics-reading order when you want faster signal extraction:
1. Set the date range.
2. Review KPI cards.
3. Review the activity chart.
4. Scan top-performing content.
5. Open the full ranking only when needed.

# Advanced

- The date-range selector changes the meaning of every card and ranking on the
  page, so it should be treated as the first interpretive step, not a cosmetic
  control.
- KPI deltas are most useful for trend direction, not only for celebrating large
  numbers.
- `Top Performing Content` and `Top Content` are related but not redundant: one
  is a quick summary, the other is the fuller ranking workspace.
- A high activity score is a prioritization signal, not a guarantee of content
  quality or business impact by itself.
- The page is optimized for directional decisions and operational follow-up, not
  exhaustive analytics modeling.

# Troubleshooting

- The numbers look surprising:
  check the active date range first before comparing against earlier decisions or
  screenshots.
- The table feels too short:
  open `View all` to inspect the full ranking in the drawer.
- One content item looks important but is missing:
  confirm that it falls inside the selected range and that you are reviewing the
  full ranking rather than only the top summary cards.
- Analytics seems static:
  review whether the current period simply had little recent publishing activity.

# Decision Guide

- Choose short range vs long range:
  use short ranges for recent operational checks; use longer ranges for broader
  trend reading.
- Choose summary cards vs full ranking:
  use summaries for quick prioritization; open the drawer when order and full
  context matter.
- Choose analytics vs content editor follow-up:
  use Analytics to identify where to look; use the editor or content screens to
  make actual changes.

# Checklist

1. Confirm the selected date range.
2. Confirm the KPI trends are read in period context.
3. Review both chart and ranking before drawing conclusions.
4. Open the full ranking when the summary is not enough.
5. Export only when the ranking needs external review or handoff.

# Security

- Analytics is an authenticated admin surface and should only be used by users
  with reporting or content-visibility permissions appropriate for workspace
  metrics.
- Exporting rankings should be treated as a data-sharing action, not just a UI
  convenience.
- Analytics summaries can shape operational decisions, so they should be read in
  context rather than forwarded without range and source awareness.
