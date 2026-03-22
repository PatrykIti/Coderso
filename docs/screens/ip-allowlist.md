---
title: "IP Allowlist"
audience: "admin"
productArea: "security"
language: "en"
keywords:
  - ip allowlist
  - cidr
  - trusted networks
  - admin access
  - allowlist
---

# Basic

IP Allowlist is the network-restriction surface for limiting admin access to
trusted IP ranges. It is where you review currently allowed CIDR blocks and add
new ranges when the admin interface should be reachable only from known
networks.

In the current UI, this route includes:
- `Add IP Range`,
- an `Active Restrictions` table,
- a propagation notice,
- a dedicated `Add New IP Range` form surface.

# Medium

Use IP Allowlist when the admin panel should not be reachable from the open
internet and only specific offices, VPN ranges, or trusted operators should
have access. The current route is designed for:
- reviewing existing allowlist entries,
- understanding whether access is currently restricted,
- adding CIDR ranges with labels and notes,
- removing ranges that no longer belong in the trusted set.

The current local walkthrough shows an empty allowlist state, which is still an
important operational state because it tells you no trusted ranges are yet
enforced by entries on this route.

# Instruction

1. Open `Settings > Security > IP Allowlist`.
2. Start with `Active Restrictions`.
3. Review whether the table already contains trusted ranges.
4. Read the page note carefully:
   only traffic from the listed ranges will be able to access the admin panel.
5. Use `Add IP Range` when you need a new trusted network.
6. In `Add New IP Range`, fill:
   - identifier label,
   - IP address or range in CIDR,
   - notes.
7. Use the CIDR field intentionally.
   Examples shown in the current UI include:
   - `192.168.1.1`
   - `192.168.1.0/24`
8. Review the security note before saving.
9. Use `Add to Allowlist` only when the range is truly trusted.
10. Use the remove action in the table when a range should no longer keep admin
    access.
11. Remember that changes can take up to 2 minutes to propagate globally.

Use this safe allowlist workflow when you want fewer lockout mistakes:
1. Confirm the trusted network exactly.
2. Add a clear label.
3. Enter the narrowest valid CIDR possible.
4. Save intentionally.
5. Wait for propagation before judging the result.

# Advanced

- CIDR width matters. A narrow range is usually safer than a broad range that
  happens to be convenient.
- The route is security-sensitive even when the table is empty because adding a
  wrong range can affect who can reach the admin panel at all.
- Labels and notes are operationally useful because future admins may need to
  understand why a range was trusted in the first place.
- The propagation delay note is important: immediate lock/unlock assumptions can
  be misleading right after a change.
- The presence of both an inline panel and a drawer trigger means the route is
  optimized for quick entry creation without leaving the screen.

# Troubleshooting

- No ranges are listed:
  that means no current allowlist entries are present on this route.
- Access still behaves unexpectedly right after a change:
  wait for the noted propagation window before concluding the change failed.
- You are unsure whether a range is too broad:
  prefer the narrowest CIDR that still covers the trusted network.
- A range should be removed:
  use the table remove action instead of leaving stale trusted networks in place.

# Decision Guide

- Choose single IP vs CIDR range:
  use a single IP when one workstation is enough; use CIDR only when a real
  network range is intentionally trusted.
- Choose add vs remove:
  add when onboarding a trusted network; remove when that trust should end.
- Choose broad vs narrow range:
  choose the narrowest practical range to reduce unnecessary exposure.

# Checklist

1. Confirm the network is truly trusted.
2. Confirm the CIDR is correct.
3. Confirm the label and notes are useful.
4. Confirm the change should affect admin access.
5. Wait for propagation and recheck intentionally.

# Security

- IP Allowlist is an authenticated admin surface and should only be used by
  high-trust administrators responsible for admin access controls.
- A bad allowlist entry can either expose the admin interface too broadly or
  lock out legitimate operators.
- Broad CIDR ranges such as `/0` or `/8` should be treated as high-risk
  configuration unless there is a very explicit reason.
