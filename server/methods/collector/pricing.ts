// Pure cost math: turn Hetzner resources + the /v1/pricing rate card into
// NET hourly/monthly euro figures. No I/O here so it stays unit-testable.

const MONTH_HOURS = 730; // Hetzner's hourly<->monthly divisor for flat-rate items

export type HetznerPrice = { net: string; gross: string };
export type LocationPrice = {
  location?: string;
  datacenter?: string;
  price_hourly?: HetznerPrice;
  price_monthly?: HetznerPrice;
  included_traffic?: number;
  price_per_tb_traffic?: HetznerPrice;
};
export type TypePricing = { name: string; prices: LocationPrice[] };

export type Pricing = {
  currency: string;
  vat_rate: string;
  image?: { price_per_gb_month: HetznerPrice };
  volume?: { price_per_gb_month: HetznerPrice };
  server_backup?: { percentage: string };
  server_types?: TypePricing[];
  load_balancer_types?: TypePricing[];
  primary_ips?: { type: string; prices: LocationPrice[] }[];
  floating_ips?: { type: string; prices: LocationPrice[] }[];
};

export type Priced = {
  hetznerId: string;
  category: string;
  name?: string;
  hetznerType?: string;
  location?: string;
  hourlyCost: number;
  monthlyCost: number;
  spec: Record<string, any>;
};

const net = (p?: HetznerPrice) => (p ? parseFloat(p.net) : 0);

function pickPrice(prices: LocationPrice[] | undefined, location?: string) {
  if (!prices?.length) return undefined;
  return (
    prices.find((p) => p.location === location) ??
    prices.find((p) => p.datacenter === location) ??
    prices[0]
  );
}

export type Override = { hourlyCost: number; monthlyCost: number };

export function priceServer(
  pricing: Pricing,
  server: any,
  overrides?: Map<string, Override>,
): Priced[] {
  // The list endpoint exposes location at `server.location`; some responses
  // nest it under `server.datacenter.location`. Support both — and it must be
  // right, since server_type prices vary by location (US costs more than DE).
  const location = server.location?.name ?? server.datacenter?.location?.name;
  const type = server.server_type?.name;
  const st = pricing.server_types?.find((s) => s.name === type);
  const lp = pickPrice(st?.prices, location);
  // A manual override (grandfathered/legacy price) wins over the list rate card.
  const ov = type ? overrides?.get(type) : undefined;
  const hourly = ov ? ov.hourlyCost : net(lp?.price_hourly);
  const monthly = ov ? ov.monthlyCost : net(lp?.price_monthly); // Hetzner caps monthly at this rate
  const rows: Priced[] = [
    {
      hetznerId: String(server.id),
      category: "server",
      name: server.name,
      hetznerType: type,
      location,
      hourlyCost: hourly,
      monthlyCost: monthly,
      spec: { cores: server.server_type?.cores, memory: server.server_type?.memory },
    },
  ];

  // Backups: flat % surcharge on the server price when a backup window is set.
  if (server.backup_window) {
    const pct = parseFloat(pricing.server_backup?.percentage ?? "0") / 100;
    rows.push({
      hetznerId: `backup-${server.id}`,
      category: "backup",
      name: `${server.name} backups`,
      hetznerType: type,
      location,
      hourlyCost: hourly * pct,
      monthlyCost: monthly * pct,
      spec: { percentage: pricing.server_backup?.percentage },
    });
  }

  // Traffic overage (usually 0 — included traffic is large). Billed on usage,
  // so it carries a monthly figure only, not an hourly rate.
  const overageBytes = Math.max(0, (server.outgoing_traffic ?? 0) - (server.included_traffic ?? 0));
  if (overageBytes > 0 && lp?.price_per_tb_traffic) {
    const cost = (overageBytes / 1e12) * net(lp.price_per_tb_traffic);
    rows.push({
      hetznerId: `traffic-${server.id}`,
      category: "traffic",
      name: `${server.name} traffic overage`,
      location,
      hourlyCost: 0,
      monthlyCost: cost,
      spec: { overageBytes },
    });
  }
  return rows;
}

export function priceVolume(pricing: Pricing, volume: any): Priced {
  const monthly = (volume.size ?? 0) * net(pricing.volume?.price_per_gb_month);
  return {
    hetznerId: String(volume.id),
    category: "volume",
    name: volume.name,
    location: volume.location?.name,
    hourlyCost: monthly / MONTH_HOURS,
    monthlyCost: monthly,
    spec: { sizeGb: volume.size },
  };
}

export function priceLoadBalancer(pricing: Pricing, lb: any): Priced {
  const location = lb.location?.name;
  const type = lb.load_balancer_type?.name;
  const lp = pickPrice(pricing.load_balancer_types?.find((t) => t.name === type)?.prices, location);
  return {
    hetznerId: String(lb.id),
    category: "load_balancer",
    name: lb.name,
    hetznerType: type,
    location,
    hourlyCost: net(lp?.price_hourly),
    monthlyCost: net(lp?.price_monthly),
    spec: {},
  };
}

export function pricePrimaryIp(pricing: Pricing, ip: any): Priced {
  const dc = ip.datacenter?.name;
  const location = ip.datacenter?.location?.name ?? dc;
  const lp = pickPrice(pricing.primary_ips?.find((p) => p.type === ip.type)?.prices, dc);
  const monthly = net(lp?.price_monthly);
  return {
    hetznerId: String(ip.id),
    category: "primary_ip",
    name: ip.name ?? ip.ip,
    hetznerType: ip.type,
    location,
    hourlyCost: lp?.price_hourly ? net(lp.price_hourly) : monthly / MONTH_HOURS,
    monthlyCost: monthly,
    spec: { assignee: ip.assignee_id },
  };
}

export function priceFloatingIp(pricing: Pricing, ip: any): Priced {
  const location = ip.home_location?.name;
  const lp = pickPrice(pricing.floating_ips?.find((p) => p.type === ip.type)?.prices, location);
  const monthly = net(lp?.price_monthly);
  return {
    hetznerId: String(ip.id),
    category: "floating_ip",
    name: ip.name ?? ip.ip,
    hetznerType: ip.type,
    location,
    hourlyCost: monthly / MONTH_HOURS,
    monthlyCost: monthly,
    spec: {},
  };
}

export function priceSnapshot(pricing: Pricing, image: any): Priced {
  const monthly = (image.image_size ?? 0) * net(pricing.image?.price_per_gb_month);
  return {
    hetznerId: String(image.id),
    category: "snapshot",
    name: image.description ?? `snapshot-${image.id}`,
    hourlyCost: monthly / MONTH_HOURS,
    monthlyCost: monthly,
    spec: { sizeGb: image.image_size },
  };
}
