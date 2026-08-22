"use strict";

(function () {

  if (!window.supabase) {

    console.error(
      "Supabase library is not loaded."
    );

    return;
  }


  if (!window.TCA_CONFIG) {

    console.error(
      "TCA_CONFIG is missing."
    );

    return;
  }


  const url =
    window.TCA_CONFIG.SUPABASE_URL;

  const key =
    window.TCA_CONFIG.SUPABASE_ANON_KEY;


  if (!url || !key) {

    console.error(
      "Supabase URL or key is missing."
    );

    return;
  }


  window.tcaSupabase =
    window.supabase.createClient(
      url,
      key,
      {
        auth: {

          persistSession: true,

          autoRefreshToken: true,

          detectSessionInUrl: false

        }
      }
    );


  console.log(
    "✅ TeraByte Supabase client initialized"
  );

})();
