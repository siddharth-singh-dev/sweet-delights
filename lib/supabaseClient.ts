"use client";

import { createBrowserClient } from "@supabase/ssr";

// This client runs in the browser and only ever holds the public
// "anon" key. It can never see or use the service-role key.
// Every read/write it makes is checked by Postgres Row Level
// Security policies (see supabase/schema.sql) — the anon key alone
// grants no special access.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
