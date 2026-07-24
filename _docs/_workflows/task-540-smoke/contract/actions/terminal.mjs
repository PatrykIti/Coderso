// Canonical raw action rows for the TASK-540 terminal flow.
// The composition root deep-freezes and validates the complete ordered manifest.
export const TERMINAL_ACTION_ROWS = [
  [
    "end-001-release-unroute",
    "p1/0",
    "cleanup-release-unroute",
    'all flow routes terminal -> `true` only after every latch is released, `await page.unrouteAll({behavior:"wait"})` settles, and the authoritative context active-route registry is exact `[]` -> raw `page.route()` registry empty',
    "ru-115 / all terminal -> absent",
  ],
  [
    "end-002-route-list",
    "p1/0",
    "cleanup-route-list",
    "authoritative context registry empty -> `[]` -> CLI-wrapper route registry independently empty",
    "end-001 / absent -> absent",
  ],
  [
    "end-003-console-errors",
    "p1/0",
    "cleanup-console-errors",
    "route list empty -> exact aggregate/pages -> all error arrays empty",
    "end-002 / absent -> absent",
  ],
  [
    "end-004-console-warnings",
    "p1/0",
    "cleanup-console-warnings",
    "errors clean -> exact aggregate/pages -> all warning arrays empty",
    "end-003 / absent -> absent",
  ],
  [
    "end-005-page-errors",
    "p1/0",
    "cleanup-page-errors",
    "warnings clean -> exact aggregate/pages -> all page-error arrays empty",
    "end-004 / absent -> absent",
  ],
  [
    "end-006-close",
    "p1/0",
    "cleanup-close",
    "logs clean -> `closed` -> named session closed",
    "end-005 / absent -> absent",
  ],
  [
    "end-007-session-absence",
    "global",
    "cleanup-session-absence",
    "close receipt -> global list bytes -> `wf540smoke` absent/terminal",
    "end-006 / absent -> absent",
  ]
];
