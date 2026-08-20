(function () {
  "use strict";

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error("Supabase library is not loaded.");
    return;
  }

  if (!window.TCA_CONFIG) {
    console.error("TCA_CONFIG is not loaded.");
    return;
  }

  if (
    !window.TCA_CONFIG.SUPABASE_URL ||
    !window.TCA_CONFIG.SUPABASE_ANON_KEY
  ) {
    console.error("Supabase configuration is incomplete.");
    return;
  }

  try {
    window.tcaSupabase =
      window.supabase.createClient(
        window.https://ghgfcqdepmqqplrhncza.supabase.co,
        window.sb_publishable_hFouorpxuecQuk_xkXNwkA_rm6sJDVl,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        }
      );

    console.log(
      "TeraByte Supabase initialized successfully."
    );

  } catch (error) {
    console.error(
      "Supabase initialization failed:",
      error
    );
  }
})();
