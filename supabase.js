(function () {
  if (!window.supabase || !window.TCA_CONFIG) return;
  const { createClient } = window.supabase;
  window.tcaSupabase = createClient(
    window.TCA_CONFIG.SUPABASE_URL,
    window.TCA_CONFIG.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.sessionStorage
      }
    }
  );
})();
