// Tiny fetch helper for hand-written API modules. Prepends the same base the
// generated hey-api client uses and carries the session cookie, so these calls
// behave identically to the generated hooks. Throws on non-2xx.
const base = import.meta.env.VITE_API_URL || "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(base + path, {
    ...init,
    credentials: "include",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const getJSON = <T>(path: string) => request<T>(path);

export const postJSON = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });
