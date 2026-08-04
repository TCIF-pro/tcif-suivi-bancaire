import { createBrowserClient } from "@supabase/ssr";

// Client Supabase utilisé côté navigateur (composants "use client").
// Lit/écrit la session via les cookies du navigateur.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
