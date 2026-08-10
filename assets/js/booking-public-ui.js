(() => {
  "use strict";

  /*
    Misma convención usada por assets/js/dashboard-ui.js:
    - byale-logo-dark.webp = letras claras para fondo oscuro.
    - byale-logo-light.webp = letras oscuras para fondo claro.
  */
  const LOGO_DARK = "/assets/images/byale-logo-dark.webp";
  const LOGO_LIGHT = "/assets/images/byale-logo-light.webp";
  const CACHE_KEY = "byalee_public_data_v2";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function logoForCurrentTheme() {
    return currentTheme() === "dark" ? LOGO_DARK : LOGO_LIGHT;
  }

  function updateLogos() {
    const source = logoForCurrentTheme();
    document.querySelectorAll(".public-brand-logo").forEach(img => {
      if (img.getAttribute("src") !== source) {
        img.setAttribute("src", source);
      }
    });
  }

  function normalizeExternalUrl(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    try {
      const url = new URL(text);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function cachedSettings() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "null")?.settings || {};
    } catch {
      return {};
    }
  }

  function applyPublicSettings(settings = {}) {
    const locationUrl = normalizeExternalUrl(settings.locationUrl);
    const city = String(settings.city || "").trim();

    const heading = document.getElementById("bookingPublicHeading");
    if (heading && settings.bookingPublicHeading) {
      heading.textContent = String(settings.bookingPublicHeading).trim();
    }

    const intro = document.getElementById("bookingPublicIntro");
    if (intro && settings.bookingPublicIntro) {
      intro.textContent = String(settings.bookingPublicIntro).trim();
    }

    const trustPanel = document.getElementById("bookingTrustPanel");
    if (trustPanel && settings.bookingShowTrustPanel === false) {
      trustPanel.hidden = true;
    }

    const desktopLink = document.getElementById("studioLocationLink");
    if (desktopLink) {
      if (locationUrl) {
        desktopLink.href = locationUrl;
        desktopLink.setAttribute("aria-disabled", "false");
        desktopLink.removeAttribute("tabindex");
      } else {
        desktopLink.href = "#";
        desktopLink.setAttribute("aria-disabled", "true");
        desktopLink.setAttribute("tabindex", "-1");
      }
    }

    const mobileLink = document.getElementById("mobileLocationLink");
    const mobileText = document.getElementById("mobileLocationText");
    if (mobileLink) {
      if (locationUrl) {
        mobileLink.href = locationUrl;
        mobileLink.hidden = false;
        if (mobileText) {
          mobileText.textContent = city ? `Ver ubicación · ${city}` : "Ver ubicación";
        }
      } else {
        mobileLink.hidden = true;
      }
    }
  }

  async function refreshPublicSettings() {
    applyPublicSettings(cachedSettings());

    try {
      const now = new Date();
      const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
      ].join("-");

      const response = await fetch(`/api/public-data?from=${today}`, {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      applyPublicSettings(payload.settings || {});
    } catch (error) {
      console.warn("No se pudieron actualizar los datos visuales de la reserva pública:", error);
    }
  }

  function blockDisabledLocationClicks() {
    const link = document.getElementById("studioLocationLink");
    link?.addEventListener("click", event => {
      if (link.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
      }
    });
  }

  function initialize() {
    updateLogos();
    blockDisabledLocationClicks();
    refreshPublicSettings();

    /* Observa SOLAMENTE el atributo de tema, igual que dashboard-ui.js. */
    const themeObserver = new MutationObserver(updateLogos);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
