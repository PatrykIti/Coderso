// Traffic aggregation read-side contract (TASK-483-04-L01).
//
// Single source of truth for the traffic-metrics response shapes shared by the
// aggregation queries (L02), the admin API (L03), and the admin client
// (TASK-483-05). Intentionally TypeScript-types-only: no runtime, no db/client
// import, so the browser bundle can import it — mirroring the
// dashboardClient.ts -> dashboardTypes.ts precedent.

export type TrafficTotals = {
  pageviews: number;
  visitors: number; // distinct visitor_hash
  sessions: number;
  bounceRate: number; // 0..1, sessions with pageviewCount === 1
  avgPagesPerSession: number;
};

export type TrafficBreakdownRow = { key: string; label: string; value: number };

export type TopPageRow = { path: string; views: number; visitors: number };

export type TrafficOverview = {
  rangeDays: number;
  generatedAt: string;
  totals: TrafficTotals;
  previous: TrafficTotals; // prior equal-length window for deltas
  trend: { date: string; value: number }[]; // daily pageviews
  sources: TrafficBreakdownRow[]; // by TrafficSourceKind
  devices: TrafficBreakdownRow[]; // by TrafficDeviceClass
  referrers: TrafficBreakdownRow[]; // top referrer hosts
  topPages: TopPageRow[]; // real views ranking (replaces computeScore)
};

export type TrafficOverviewQuery = { rangeDays: number; now?: Date };

export type TopPagesQuery = { rangeDays: number; limit: number; now?: Date };
