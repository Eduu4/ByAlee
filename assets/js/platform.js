(() => {
  "use strict";

  let client = null;
  let config = null;
  let initError = null;

  async function init() {
    try {
      const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.configured) {
        throw new Error(payload.error || "Supabase todavía no está configurado.");
      }
      if (!window.supabase?.createClient) {
        throw new Error("No se pudo cargar el cliente de Supabase.");
      }
      config = payload;
      client = window.supabase.createClient(payload.supabaseUrl, payload.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "byalee-auth"
        },
        realtime: { params: { eventsPerSecond: 5 } }
      });
      return { configured: true, client, config };
    } catch (error) {
      initError = error;
      console.error("ByAlee platform:", error);
      return { configured: false, client: null, config: null, error };
    }
  }

  const ready = init();

  window.ByAleePlatform = {
    ready,
    async getClient() {
      const state = await ready;
      return state.client;
    },
    async getConfig() {
      const state = await ready;
      return state.config;
    },
    async isConfigured() {
      return Boolean((await ready).configured);
    },
    get error() { return initError; },
    get client() { return client; },
    get config() { return config; }
  };
  window.byAleePlatformReady = ready;
})();
