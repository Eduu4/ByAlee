(() => {
  "use strict";

  const DATA = window.LASHFLOW_DATA;
  if (!DATA) return;

  const DEFAULTS = {
    bookingPublicHeading: "Reservá tu cita de forma simple",
    bookingPublicIntro: "Elegí el servicio y un horario disponible. La solicitud queda pendiente hasta que el local la confirme.",
    bookingShowTrustPanel: true,
    locationUrl: ""
  };

  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));

  function addStyles() {
    if (document.getElementById("publicBookingAdminStyles")) return;

    const style = document.createElement("style");
    style.id = "publicBookingAdminStyles";
    style.textContent = `
      .public-booking-location-help {
        margin-top: 7px;
        display: flex;
        align-items: flex-start;
        gap: 6px;
        color: var(--muted);
        font-size: 10px;
        line-height: 1.45;
      }
      .public-booking-location-help i {
        flex: 0 0 auto;
        margin-top: 1px;
        color: var(--primary);
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const settings = { ...DEFAULTS, ...(DATA.settings || {}) };
    const wrapper = document.createElement("details");
    wrapper.className = "settings-accordion";
    wrapper.dataset.publicBookingSettings = "true";

    wrapper.innerHTML = `
      <summary>
        <span class="settings-summary-icon"><i class="bi bi-link-45deg"></i></span>
        <span class="settings-summary-copy">
          <strong>Reserva pública</strong>
          <small>Presentación y ubicación que ve la clienta.</small>
        </span>
        <i class="bi bi-chevron-down settings-chevron"></i>
      </summary>
      <div class="settings-accordion-body">
        <div class="settings-subsection">
          <h3>Enlace público</h3>

          <div class="form-grid">
            <label class="field full">
              <span>Título principal</span>
              <input
                name="bookingPublicHeading"
                maxlength="80"
                value="${esc(settings.bookingPublicHeading)}"
                placeholder="Reservá tu cita de forma simple"
              >
            </label>

            <label class="field full">
              <span>Texto introductorio</span>
              <textarea
                name="bookingPublicIntro"
                rows="3"
                maxlength="240"
                placeholder="Explicá brevemente cómo funciona la reserva."
              >${esc(settings.bookingPublicIntro)}</textarea>
            </label>

            <label class="field full">
              <span>Link de ubicación del local</span>
              <input
                name="locationUrl"
                type="url"
                inputmode="url"
                value="${esc(settings.locationUrl)}"
                placeholder="https://maps.google.com/..."
              >
              <small class="public-booking-location-help">
                <i class="bi bi-geo-alt"></i>
                Pegá el enlace de Google Maps u otro mapa. La ciudad o zona sigue configurándose arriba en Datos del local.
              </small>
            </label>
          </div>

          <label class="check-option" style="margin-top:10px">
            <input
              type="checkbox"
              name="bookingShowTrustPanel"
              ${settings.bookingShowTrustPanel !== false ? "checked" : ""}
            >
            <span>
              <strong>Mostrar información del local</strong>
              <small>Ubicación, horario, seña y seguridad en la reserva pública.</small>
            </span>
          </label>
        </div>
      </div>
    `;

    return wrapper;
  }

  function capture(form) {
    const heading = form.elements.bookingPublicHeading?.value?.trim() || DEFAULTS.bookingPublicHeading;
    const intro = form.elements.bookingPublicIntro?.value?.trim() || DEFAULTS.bookingPublicIntro;
    const locationUrl = form.elements.locationUrl?.value?.trim() || "";

    DATA.settings.bookingPublicHeading = heading;
    DATA.settings.bookingPublicIntro = intro;
    DATA.settings.locationUrl = locationUrl;
    DATA.settings.bookingShowTrustPanel = Boolean(form.elements.bookingShowTrustPanel?.checked);
  }

  function install() {
    const form = document.getElementById("settingsForm");
    if (!form || form.querySelector("[data-public-booking-settings]")) return;

    const panel = buildPanel();
    const groups = [...form.querySelectorAll(":scope > .settings-accordion")];
    const appearance = groups.find(group => /Apariencia/i.test(group.querySelector("summary")?.textContent || ""));

    if (appearance) {
      form.insertBefore(panel, appearance);
    } else {
      const savebar = form.querySelector(".settings-savebar");
      form.insertBefore(panel, savebar || null);
    }

    /*
      Capture se ejecuta antes del submit de app.js.
      Solo agrega campos a DATA.settings; no reemplaza el guardado existente.
    */
    form.addEventListener("submit", () => capture(form), { capture: true });
  }

  addStyles();
  install();

  const settingsView = document.getElementById("settingsView");
  if (settingsView) {
    const observer = new MutationObserver(install);
    observer.observe(settingsView, { childList: true, subtree: true });
  }
})();
