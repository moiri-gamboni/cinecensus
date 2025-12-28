// Browser-side Supabase client
// Note: For this app, we use server-side Supabase clients in +page.server.ts
// to access platform.env on Cloudflare Workers.
// This file is kept for potential future client-side features like realtime.

import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string, key: string) {
	return createClient(url, key);
}
