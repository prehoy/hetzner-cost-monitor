// Seeds a demo database with realistic (fake) data for screenshots / trying the
// UI without a Hetzner account. Run:
//   DB_PATH=./demo.db APP_SECRET=demo DISABLE_COLLECTOR=true bun scripts/seed-demo.ts
import db from "../db/client";
import { billingHours, pricingSnapshots, projects, resources, users } from "../db/schema";
import { encrypt } from "../methods/crypto";

const ADMIN = { email: "admin@demo.hacm", password: "demodemo" };

type Def = {
  hetznerId: string;
  name: string;
  category: string;
  type?: string;
  location?: string;
  hourly: number;
  monthly: number;
};

// A believable small production estate + a staging project.
const PROD: Def[] = [
  { hetznerId: "s1", name: "web-01", category: "server", type: "cpx21", location: "fsn1", hourly: 0.013, monthly: 8.49 },
  { hetznerId: "s2", name: "web-02", category: "server", type: "cpx21", location: "fsn1", hourly: 0.013, monthly: 8.49 },
  { hetznerId: "s3", name: "api-gateway", category: "server", type: "cpx31", location: "nbg1", hourly: 0.025, monthly: 15.49 },
  { hetznerId: "s4", name: "postgres-primary", category: "server", type: "ccx23", location: "fsn1", hourly: 0.1402, monthly: 87.49 },
  { hetznerId: "s5", name: "postgres-replica", category: "server", type: "ccx23", location: "fsn1", hourly: 0.1402, monthly: 87.49 },
  { hetznerId: "s6", name: "redis-cache", category: "server", type: "cpx21", location: "fsn1", hourly: 0.013, monthly: 8.49 },
  { hetznerId: "lb1", name: "lb-public", category: "load_balancer", type: "lb11", location: "fsn1", hourly: 0.0079, monthly: 5.39 },
  { hetznerId: "v1", name: "postgres-data", category: "volume", location: "fsn1", hourly: 0.0301, monthly: 22.0 },
  { hetznerId: "v2", name: "backups-vol", category: "volume", location: "fsn1", hourly: 0.0137, monthly: 10.0 },
  { hetznerId: "backup-s4", name: "postgres-primary backups", category: "backup", type: "ccx23", location: "fsn1", hourly: 0.028, monthly: 17.5 },
  { hetznerId: "pip1", name: "203.0.113.10", category: "primary_ip", type: "ipv4", location: "fsn1", hourly: 0.0007, monthly: 0.5 },
  { hetznerId: "fip1", name: "203.0.113.42", category: "floating_ip", type: "ipv4", location: "fsn1", hourly: 0.0041, monthly: 3.0 },
  { hetznerId: "snap1", name: "nightly-2026-07-01", category: "snapshot", hourly: 0.0007, monthly: 0.52 },
];
// Autoscaled workers — appear/disappear across the timeline.
const WORKERS: Def[] = Array.from({ length: 6 }, (_, i) => ({
  hetznerId: `w${i + 1}`,
  name: `worker-0${i + 1}`,
  category: "server",
  type: "cpx11",
  location: "nbg1",
  hourly: 0.0088,
  monthly: 5.49,
}));
const STAGING: Def[] = [
  { hetznerId: "st1", name: "staging-web", category: "server", type: "cpx11", location: "hel1", hourly: 0.0088, monthly: 5.49 },
  { hetznerId: "st2", name: "staging-db", category: "server", type: "cpx21", location: "hel1", hourly: 0.013, monthly: 8.49 },
  { hetznerId: "stv", name: "staging-data", category: "volume", location: "hel1", hourly: 0.0069, monthly: 5.0 },
];

async function seed() {
  const passwordHash = await Bun.password.hash(ADMIN.password, { algorithm: "bcrypt", cost: 10 });
  await db.insert(users).values({ email: ADMIN.email, passwordHash });

  const fakeTok = encrypt("readonly-demo-token");
  const [prod] = await db
    .insert(projects)
    .values({ name: "production", tokenEncrypted: fakeTok.ciphertext, tokenIv: fakeTok.iv, lastPollAt: new Date() })
    .returning({ id: projects.id });
  const [stg] = await db
    .insert(projects)
    .values({ name: "staging", tokenEncrypted: fakeTok.ciphertext, tokenIv: fakeTok.iv, lastPollAt: new Date() })
    .returning({ id: projects.id });

  // Live inventory (current worker count = 4).
  const liveProd = [...PROD, ...WORKERS.slice(0, 4)];
  for (const r of liveProd) await insertResource(prod.id, r);
  for (const r of STAGING) await insertResource(stg.id, r);

  // Billing ledger for the last 3 days. Workers scale 2..6 by time-of-day so the
  // accrued chart shows the autoscaling wobble.
  const now = Date.now();
  const rows: (typeof billingHours.$inferInsert)[] = [];
  for (let h = 72; h >= 0; h--) {
    const t = now - h * 3_600_000;
    const hourStart = new Date(Math.floor(t / 3_600_000) * 3_600_000);
    const hod = new Date(t).getUTCHours();
    const workerCount = 2 + Math.round(4 * Math.max(0, Math.sin(((hod - 6) / 24) * Math.PI * 2)));
    const set = [...PROD, ...WORKERS.slice(0, workerCount)];
    for (const r of set)
      rows.push({ hourStart, projectId: prod.id, hetznerId: r.hetznerId, category: r.category, location: r.location, hourlyCost: r.hourly });
    for (const r of STAGING)
      rows.push({ hourStart, projectId: stg.id, hetznerId: r.hetznerId, category: r.category, location: r.location, hourlyCost: r.hourly });
  }
  // chunked insert (SQLite variable limit)
  for (let i = 0; i < rows.length; i += 200) await db.insert(billingHours).values(rows.slice(i, i + 200));

  // Minimal but realistic rate card so the Pricing page shows list prices.
  // ccx23 list is the post-hike price so the demo can show an override to a
  // grandfathered rate.
  const net = (v: number) => ({ net: v.toFixed(4), gross: (v * 1.19).toFixed(4) });
  const p = (name: string, loc: string, hr: number, mo: number) => ({
    name,
    prices: [{ location: loc, price_hourly: net(hr), price_monthly: net(mo) }],
  });
  await db.insert(pricingSnapshots).values({
    currency: "EUR",
    vatRate: "19.000000",
    dataJson: JSON.stringify({
      currency: "EUR",
      vat_rate: "19.000000",
      server_types: [
        p("cpx11", "nbg1", 0.0088, 5.49),
        p("cpx21", "hel1", 0.013, 8.49),
        p("cpx31", "nbg1", 0.025, 15.49),
        p("ccx23", "fsn1", 0.1402, 87.49),
      ],
    }),
  });

  console.log(`seeded: ${liveProd.length + STAGING.length} live resources, ${rows.length} billing hours`);
  console.log(`login: ${ADMIN.email} / ${ADMIN.password}`);
}

async function insertResource(projectId: number, r: Def) {
  await db.insert(resources).values({
    projectId,
    hetznerId: r.hetznerId,
    category: r.category,
    name: r.name,
    hetznerType: r.type,
    location: r.location,
    specJson: "{}",
    hourlyCost: r.hourly,
    monthlyCost: r.monthly,
  });
}

seed();
