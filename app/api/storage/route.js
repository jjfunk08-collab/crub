import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Always run on the server, never cached.
export const dynamic = "force-dynamic";

function getRedis() {
  // Works whether the env vars come from the Upstash integration (UPSTASH_*)
  // or the legacy Vercel KV naming (KV_REST_API_*).
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function POST(req) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Storage is not configured. Connect an Upstash Redis database in the Vercel Storage tab." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { action, key, keys, value } = body || {};

  try {
    if (action === "get") {
      const v = await redis.get(key);
      return NextResponse.json({ value: v ?? null });
    }
    if (action === "mget") {
      if (!Array.isArray(keys) || keys.length === 0) {
        return NextResponse.json({ values: [] });
      }
      const values = await redis.mget(...keys);
      return NextResponse.json({ values });
    }
    if (action === "set") {
      await redis.set(key, value);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      await redis.del(key);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
