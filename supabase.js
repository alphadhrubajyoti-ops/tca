(function () {
  "use strict";

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error("Supabase library is not loaded.");
    return;
  }

  try {
    window.tcaSupabase = window.supabase.createClient(
      "https://ghgfcqdepmqqplrhncza.supabase.co",
      "sb_publishable_hFouorpxuecQuk_xkXNwkA_rm6sJDVl",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      }
    );

    console.log("TeraByte Supabase initialized successfully.");

  } catch (error) {
    console.error("Supabase initialization failed:", error);
  }
})();
