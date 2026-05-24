import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseConfigOk =
  supabaseUrl.startsWith("https://") && supabaseAnonKey.length > 20;

export const supabase = supabaseConfigOk
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseInfo = {
  url: supabaseUrl,
  temUrl: Boolean(supabaseUrl),
  temAnonKey: Boolean(supabaseAnonKey),
};
