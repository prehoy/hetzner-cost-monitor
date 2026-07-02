const BASE = "https://api.hetzner.cloud/v1";

export async function hetznerGet<T = any>(token: string, path: string): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Hetzner GET ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Follows meta.pagination.next_page and concatenates the given collection key.
export async function hetznerList<T = any>(
  token: string,
  path: string,
  key: string,
): Promise<T[]> {
  const out: T[] = [];
  let page: number | null = 1;
  while (page) {
    const sep = path.includes("?") ? "&" : "?";
    const data: any = await hetznerGet(token, `${path}${sep}page=${page}&per_page=50`);
    out.push(...((data[key] as T[]) ?? []));
    page = data.meta?.pagination?.next_page ?? null;
  }
  return out;
}
