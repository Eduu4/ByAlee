(() => {
  "use strict";

  document.documentElement.classList.add("auth-pending");

  const nextUrl = () => `${location.pathname}${location.search || ""}${location.hash || ""}`;

  async function requireAuthentication() {
    const platform = await window.ByAleePlatform.ready;
    if (!platform.configured || !platform.client) {
      const message = encodeURIComponent(platform.error?.message || "Supabase no está configurado.");
      location.replace(`/login?setup=${message}`);
      return null;
    }

    const { data, error } = await platform.client.auth.getSession();
    if (error) {
      console.error(error);
      await platform.client.auth.signOut().catch(() => {});
    }

    const session = data?.session || null;
    if (!session) {
      location.replace(`/login?next=${encodeURIComponent(nextUrl())}`);
      return null;
    }

    platform.client.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT" || (!nextSession && event !== "INITIAL_SESSION")) {
        location.replace("/login");
      }
    });

    document.documentElement.classList.remove("auth-pending");
    document.documentElement.classList.add("auth-ready");
    return session;
  }

  window.lashflowLogout = async () => {
    try {
      const client = await window.ByAleePlatform.getClient();
      await client?.auth.signOut();
    } finally {
      location.replace("/login");
    }
  };

  window.byAleeAuthReady = requireAuthentication();
})();
