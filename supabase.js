(function () {
  "use strict";

  // Make sure Supabase library is loaded
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase JS library is not loaded.");
    return;
  }

  // Supabase project configuration
  const SUPABASE_URL = "https://ghgfcqdepmqqplrhncza.supabase.co";

  const SUPABASE_ANON_KEY =
    "sb_publishable_hFouorpxuecQuk_xkXNwkA_rm6sJDVl";

  try {
    // Create Supabase client
    window.tcaSupabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.sessionStorage
        }
      }
    );

    console.log("TeraByte Computer Academy: Supabase connected successfully.");

  } catch (error) {
    console.error("Supabase initialization failed:", error);
  }
})();
