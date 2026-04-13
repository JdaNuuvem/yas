const store = new Map<string, { data: unknown; expires: number }>();

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = store.get(key);
  if (entry && entry.expires > Date.now()) return Promise.resolve(entry.data as T);
  return fn().then((data) => {
    store.set(key, { data, expires: Date.now() + ttlMs });
    return data;
  });
}

export function invalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
