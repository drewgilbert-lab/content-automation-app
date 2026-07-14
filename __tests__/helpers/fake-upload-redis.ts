import { vi } from "vitest";
import type { Redis } from "@upstash/redis";

/**
 * In-memory fake Redis with string keys + LIST ops used by upload-session
 * (get/set/del/ttl/scan/rpush/llen/lrange/expire).
 */
export function createFakeUploadRedis(): {
  store: Map<string, string>;
  lists: Map<string, string[]>;
  redis: Redis;
  mocks: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
    scan: ReturnType<typeof vi.fn>;
    rpush: ReturnType<typeof vi.fn>;
    llen: ReturnType<typeof vi.fn>;
    lrange: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
  };
  clear: () => void;
} {
  const store = new Map<string, string>();
  const lists = new Map<string, string[]>();

  const get = vi.fn(async (key: string) => {
    const raw = store.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  });

  const set = vi.fn(
    async (
      key: string,
      value: unknown,
      opts?: { ex?: number; nx?: boolean; px?: number }
    ) => {
      if (opts?.nx && store.has(key)) return null;
      store.set(key, JSON.stringify(value));
      return "OK";
    }
  );

  const del = vi.fn(async (...keys: string[]) => {
    let count = 0;
    for (const k of keys) {
      const hadStore = store.delete(k);
      const hadList = lists.delete(k);
      if (hadStore || hadList) count++;
    }
    return count;
  });

  const ttl = vi.fn(async () => 80000);

  const scan = vi.fn(
    async (
      _cursor: string | number,
      opts?: { match?: string; count?: number }
    ) => {
      const prefix = (opts?.match ?? "").replace("*", "");
      const keys = [
        ...Array.from(store.keys()),
        ...Array.from(lists.keys()),
      ].filter((k, i, arr) => arr.indexOf(k) === i && k.startsWith(prefix));
      return ["0", keys];
    }
  );

  const rpush = vi.fn(async (key: string, ...values: unknown[]) => {
    const list = lists.get(key) ?? [];
    for (const v of values) {
      list.push(typeof v === "string" ? v : JSON.stringify(v));
    }
    lists.set(key, list);
    return list.length;
  });

  const llen = vi.fn(async (key: string) => lists.get(key)?.length ?? 0);

  const lrange = vi.fn(async (key: string, start: number, stop: number) => {
    const list = lists.get(key) ?? [];
    const end = stop < 0 ? list.length : stop + 1;
    return list.slice(start, end);
  });

  const expire = vi.fn(async () => 1);

  const redis = {
    get,
    set,
    del,
    ttl,
    scan,
    rpush,
    llen,
    lrange,
    expire,
  } as unknown as Redis;

  return {
    store,
    lists,
    redis,
    mocks: { get, set, del, ttl, scan, rpush, llen, lrange, expire },
    clear: () => {
      store.clear();
      lists.clear();
    },
  };
}
