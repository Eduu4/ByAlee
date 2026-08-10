(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const DEFAULTS = {
    studioName: "ByAle",
    bookingPublicHeading: "Reservá tu cita de forma simple",
    bookingPublicIntro: "Elegí el servicio y un horario disponible. La solicitud queda pendiente hasta que el local la confirme.",
    bookingVisualStyle: "elegant",
    bookingIconStyle: "tile",
    bookingShowTrustPanel: true
  };

  const ICONS = {
    "Pestañas": `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M3.5 16s4.8-6.1 12.5-6.1S28.5 16 28.5 16 23.7 22.1 16 22.1 3.5 16 3.5 16Z"/>
        <circle cx="16" cy="16" r="3.2"/>
        <path d="M8.2 11.5 6.8 8.8M12 10.2l-.5-3M19.8 10.2l.5-3M23.7 11.5l1.5-2.7"/>
      </svg>`,
    "Cejas": `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 18.2c4.6-6 10.3-8.3 17-6.7 2.1.5 3.8 1.2 5 2"/>
        <path d="M6.2 21.5c4.7-3.7 10.3-5.1 16.7-4.1"/>
        <path d="m22.9 22.7 4.8-4.8M24.5 24.4l4.8-4.8"/>
      </svg>`,
    "Manos": `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M10.2 15V8.4a2 2 0 0 1 4 0V14"/>
        <path d="M14.2 14V6.6a2 2 0 0 1 4 0v7"/>
        <path d="M18.2 13.5V8a2 2 0 0 1 4 0v7"/>
        <path d="M22.2 15v-3.6a2 2 0 0 1 4 0v7.2c0 5.1-3.9 8.9-9.3 8.9h-1.5c-3.3 0-5.5-1.4-7.2-3.7L5.5 20a2.2 2.2 0 0 1 3.4-2.8l1.3 1.3"/>
      </svg>`,
    "Pies": `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M11.5 13.2c-2.2 1.2-3.7 4-3.7 7.2 0 3.4 1.7 6.3 4.2 7.1 2 .6 3.7-.9 3.7-3 0-2.6-1.1-4.6-2.2-6.4-.9-1.5-1.6-3.2-2-4.9Z"/>
        <circle cx="8.4" cy="9.2" r="1.5"/>
        <circle cx="11.2" cy="7.2" r="1.4"/>
        <circle cx="14.2" cy="6.7" r="1.25"/>
        <circle cx="16.8" cy="8" r="1.1"/>
        <path d="M21 15.5c1.8 1.1 3.1 3.4 3.1 6 0 2.8-1.5 5.2-3.5 5.9-1.7.5-3.1-.8-3.1-2.5 0-2.2.9-3.8 1.8-5.3.8-1.3 1.3-2.7 1.7-4.1Z"/>
        <circle cx="23.6" cy="12.2" r="1.25"/>
        <circle cx="21.3" cy="10.6" r="1.15"/>
      </svg>`
  };

  function enhanceAreaButtons() {
    $$("#areaChoices .area-btn").forEach(button => {
      const area = button.dataset.area || button.textContent.trim();
      let holder = button.querySelector(".pro-area-icon");

      if (!holder) {
        holder = document.createElement("span");
        holder.className = "pro-area-icon";
        const label = button.querySelector("span:not(.pro-area-icon)");
        if (label) button.insertBefore(holder, label);
        else button.prepend(holder);
      }

      holder.innerHTML = ICONS[area] || ICONS["Pestañas"];
    });
  }

  function applySettings(raw = {}) {
    const settings = { ...DEFAULTS, ...raw };
    const style = ["elegant", "soft", "minimal"].includes(settings.bookingVisualStyle)
      ? settings.bookingVisualStyle
      : "elegant";
    const iconStyle = ["tile", "outline", "minimal"].includes(settings.bookingIconStyle)
      ? settings.bookingIconStyle
      : "tile";

    document.body.classList.remove(
      "booking-style-elegant",
      "booking-style-soft",
      "booking-style-minimal",
      "booking-icons-tile",
      "booking-icons-outline",
      "booking-icons-minimal",
      "booking-hide-trust"
    );

    document.body.classList.add(`booking-style-${style}`, `booking-icons-${iconStyle}`);
    document.body.classList.toggle("booking-hide-trust", settings.bookingShowTrustPanel === false);

    const heading = $("#bookingPublicHeading");
    const intro = $("#bookingPublicIntro");
    const mobileName = $("#bookingMobileStudioName");

    if (heading) heading.textContent = settings.bookingPublicHeading || DEFAULTS.bookingPublicHeading;
    if (intro) intro.textContent = settings.bookingPublicIntro || DEFAULTS.bookingPublicIntro;
    if (mobileName) mobileName.textContent = settings.studioName || DEFAULTS.studioName;

    document.title = `Reservar cita — ${settings.studioName || DEFAULTS.studioName}`;
  }

  async function loadVisualSettings() {
    try {
      if (window.ByAleBookingVisualSettingsPromise) {
        const settings = await window.ByAleBookingVisualSettingsPromise;
        applySettings(settings || {});
        return;
      }
    } catch (error) {
      console.warn("No se pudo aplicar la personalización pública:", error);
    }

    try {
      const cached = JSON.parse(localStorage.getItem("byalee_public_data_v2") || "null");
      applySettings(cached?.settings || {});
    } catch {
      applySettings({});
    }
  }

  function observeDynamicAreas() {
    const target = $("#areaChoices");
    if (!target) return;

    const observer = new MutationObserver(() => enhanceAreaButtons());
    observer.observe(target, { childList: true, subtree: true });
    enhanceAreaButtons();
  }

  function start() {
    applySettings({});
    observeDynamicAreas();
    loadVisualSettings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
