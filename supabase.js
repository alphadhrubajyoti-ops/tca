(function () {
  "use strict";

  const SUPABASE_URL = "https://ghgfcqdepmqqplrhncza.supabase.co";
  const SUPABASE_KEY = "sb_publishable_hFouorpxuecQuk_xkXNwkA_rm6sJDVl";

  if (!window.supabase) {
    console.error("❌ Supabase library NOT loaded");
    alert("Supabase library is not loaded.");
    return;
  }

  window.tcaSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  console.log("✅ Supabase client created");

  window.tcaSupabase.auth.getSession()
    .then(({ data, error }) => {
      if (error) {
        console.error("❌ Supabase Auth Error:", error);
        alert("Supabase Auth Error: " + error.message);
        return;
      }

      console.log("✅ Supabase Auth connected");
      console.log("Session:", data.session);
    })
    .catch(error => {
      console.error("❌ Connection Error:", error);
      alert("Connection Error: " + error.message);
    });
})();
