import { expect, test } from "bun:test";
import { priceServer, priceVolume, type Pricing } from "./pricing";

// The one money path that must not silently drift.
const pricing: Pricing = {
  currency: "EUR",
  vat_rate: "19.000000",
  volume: { price_per_gb_month: { net: "0.0440", gross: "0.05236" } },
  server_backup: { percentage: "20.000000" },
  server_types: [
    {
      name: "cx22",
      prices: [
        {
          location: "fsn1",
          price_hourly: { net: "0.0060", gross: "0.00714" },
          price_monthly: { net: "3.79", gross: "4.5101" },
          included_traffic: 21990232555520, // 20 TiB
          price_per_tb_traffic: { net: "1.00", gross: "1.19" },
        },
      ],
    },
  ],
};

test("server priced at its location's hourly + monthly", () => {
  const [srv] = priceServer(pricing, {
    id: 1,
    name: "web",
    server_type: { name: "cx22" },
    datacenter: { location: { name: "fsn1" } },
    outgoing_traffic: 0,
    included_traffic: 21990232555520,
  });
  expect(srv.hourlyCost).toBeCloseTo(0.006, 6);
  expect(srv.monthlyCost).toBeCloseTo(3.79, 6);
});

test("backups add a 20% surcharge row", () => {
  const rows = priceServer(pricing, {
    id: 1,
    name: "web",
    server_type: { name: "cx22" },
    datacenter: { location: { name: "fsn1" } },
    backup_window: "22-02",
    outgoing_traffic: 0,
    included_traffic: 21990232555520,
  });
  const backup = rows.find((r) => r.category === "backup");
  expect(backup?.monthlyCost).toBeCloseTo(0.758, 6); // 3.79 * 0.20
});

test("traffic overage billed per TB above included", () => {
  const rows = priceServer(pricing, {
    id: 1,
    name: "web",
    server_type: { name: "cx22" },
    datacenter: { location: { name: "fsn1" } },
    outgoing_traffic: 21990232555520 + 2e12, // +2 TB
    included_traffic: 21990232555520,
  });
  const traffic = rows.find((r) => r.category === "traffic");
  expect(traffic?.monthlyCost).toBeCloseTo(2.0, 6);
});

test("server location read from flat server.location (real list-endpoint shape)", () => {
  const [srv] = priceServer(pricing, {
    id: 2,
    name: "web",
    server_type: { name: "cx22" },
    location: { name: "fsn1" }, // real API shape — not nested under datacenter
    outgoing_traffic: 0,
    included_traffic: 21990232555520,
  });
  expect(srv.location).toBe("fsn1");
  expect(srv.monthlyCost).toBeCloseTo(3.79, 6);
});

test("volume priced per GB-month with hourly derived", () => {
  const v = priceVolume(pricing, { id: 9, name: "data", size: 100, location: { name: "fsn1" } });
  expect(v.monthlyCost).toBeCloseTo(4.4, 6);
  expect(v.hourlyCost).toBeCloseTo(4.4 / 730, 6);
});
