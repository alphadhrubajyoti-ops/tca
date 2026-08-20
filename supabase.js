"use strict";

(function () {

  if (!window.supabase) {
    console.error("Supabase library was not loaded.");
    return;
  }

  if (!window.TCA_CONFIG) {
    console.error("config.js was not loaded.");
    return;
  }

  const url = window.TCA_CONFIG.SUPABASE_URL;
  const key = window.TCA_CONFIG.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Supabase configuration is missing.");
    return;
  }

  try {

    window.tcaSupabase = window.supabase.createClient(
      url,
      key
    );

    console.log("TeraByte Supabase client initialized.");

  } catch (error) {

    console.error(
      "Failed to initialize Supabase:",
      error
    );

  }

})();
