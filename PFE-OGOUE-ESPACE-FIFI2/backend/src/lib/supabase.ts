import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const supabase = createClient(config.supabase.url, config.supabase.serviceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabasePublic = createClient(config.supabase.url, config.supabase.anonKey);
