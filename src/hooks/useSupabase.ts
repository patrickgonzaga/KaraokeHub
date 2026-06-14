import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (supabaseUrl === "https://placeholder-url.supabase.co") {
  console.warn(
    "Supabase credentials not configured in environment variables. Realtime sync will run in local demo mode."
  );
}

// Create a single supabase client instance for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
