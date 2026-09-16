function base() {
  return `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}`;
}

function authHeader() {
  return { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };
}

export async function kvGet(key: string): Promise<string | null> {
  const res = await fetch(`${base()}/values/${encodeURIComponent(key)}`, {
    headers: authHeader(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`KV get failed: ${res.status}`);
  return await res.text();
}

export async function kvPut(key: string, value: string): Promise<void> {
  const res = await fetch(`${base()}/values/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "text/plain" },
    body: value,
  });
  if (!res.ok) throw new Error(`KV put failed: ${res.status}`);
}
