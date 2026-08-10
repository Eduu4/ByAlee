(() => {
  "use strict";

  const DATA = window.LASHFLOW_DATA;
  if (!DATA) return;

  const DEFAULTS = {
    bookingPublicHeading: "Reservá tu cita de forma simple",
    bookingPublicIntro: "Elegí el servicio y un horario disponible. La solicitud queda pendiente hasta que el local la confirme.",
    bookingVisualStyle: "elegant",
    bookingIconStyle: "tile",
    bookingShowTrustPanel: true
  };

  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));

  function addStyles() {
    if (document.getElementById("bookingCustomizationAdminStyles")) return;

    const style = document.createElement("style");
    style.id = "bookingCustomizationAdminStyles";
    style.textContent = `
      .booking-custom-preview {
        margin-top: 14px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--surface-2);
      }
      .booking-custom-preview-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }
      .booking-custom-preview-head strong { font-size: 12px; }
      .booking-custom-preview-head span { color: var(--muted); font-size: 10px; }
      .booking-custom-preview-areas {
        display: grid;
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 7px;
      }
      .booking-custom-preview-areas span {
        min-height: 58px;
        display: grid;
        place-items: center;
        gap: 4px;
        padding: 7px 4px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--surface);
        color: var(--muted);
        font-size: 9px;
        text-align: center;
      }
      .booking-custom-preview-areas i {
        color: var(--primary);
        font-size: 17px;
      }
      @media(max-width:760px) {
        .booking-custom-preview-areas { grid-template-columns: repeat(2,minmax(0,1fr)); }
      }
    `;
    document.head.appendChild(style);
  }

  function selected(value, expected) {
    return value === expected ? "selected" : "";
  }

  function buildPanel() {
    const settings = { ...DEFAULTS, ...(DATA.settings || {}) };
    const wrapper = document.createElement("details");
    wrapper.className = "settings-accordion";
    wrapper.dataset.bookingPublicCustomization = "true";

    wrapper.innerHTML = `
      <summary>
        <span class="settings-summary-icon"><i class="bi bi-window-sidebar"></i></span>
        <span class="settings-summary-copy">
          <strong>Reserva pública</strong>
          <small>Texto, estilo e iconos del enlace para clientas.</small>
        </span>
        <i class="bi bi-chevron-down settings-chevron"></i>
      </summary>
      <div class="settings-accordion-body">
        <div class="settings-subsection">
          <h3>Presentación del enlace</h3>
          <p class="settings-note">Estos cambios solo afectan la apariencia de reservar.html. No modifican horarios, servicios ni la lógica de las citas.</p>

          <div class="form-grid">
            <label class="field full">
              <span>Título principal</span>
              <input name="bookingPublicHeading" maxlength="80" value="${esc(settings.bookingPublicHeading)}" placeholder="Reservá tu cita de forma simple">
            </label>

            <label class="field full">
              <span>Texto introductorio</span>
              <textarea name="bookingPublicIntro" rows="3" maxlength="240" placeholder="Explicá brevemente cómo funciona la reserva.">${esc(settings.bookingPublicIntro)}</textarea>
            </label>

            <label class="field">
              <span>Estilo visual</span>
              <select name="bookingVisualStyle">
                <option value="elegant" ${selected(settings.bookingVisualStyle, "elegant")}>Elegante</option>
                <option value="soft" ${selected(settings.bookingVisualStyle, "soft")}>Suave</option>
                <option value="minimal" ${selected(settings.bookingVisualStyle, "minimal")}>Minimalista</option>
              </select>
            </label>

            <label class="field">
              <span>Estilo de iconos</span>
              <select name="bookingIconStyle">
                <option value="tile" ${selected(settings.bookingIconStyle, "tile")}>Tarjeta elegante</option>
                <option value="outline" ${selected(settings.bookingIconStyle, "outline")}>Contorno</option>
                <option value="minimal" ${selected(settings.bookingIconStyle, "minimal")}>Minimalista</option>
              </select>
            </label>
          </div>

          <label class="check-option" style="margin-top:10px">
            <input type="checkbox" name="bookingShowTrustPanel" ${settings.bookingShowTrustPanel !== false ? "checked" : ""}>
            <span>
              <strong>Mostrar información del local</strong>
              <small>Ubicación, horario, seña y seguridad en el panel lateral de la reserva.</small>
            </span>
          </label>

          <div class="booking-custom-preview">
            <div class="booking-custom-preview-head">
              <strong>Vista de categorías</strong>
              <span>Los iconos reales se aplican en reservar.html</span>
            </div>
            <div class="booking-custom-preview-areas">
              <span><i class="bi bi-eye"></i>Pestañas</span>
              <span><i class="bi bi-brush"></i>Cejas</span>
              <span><i class="bi bi-hand-index"></i>Manos</span>
              <span><i class="bi bi-stars"></i>Pies</span>
            </div>
          </div>
        </div>
      </div>
    `;

    return wrapper;
  }

  function captureSettings(form) {
    const value = name => form.elements[name]?.value?.trim?.() ?? form.elements[name]?.value ?? "";

    DATA.settings.bookingPublicHeading = value("bookingPublicHeading") || DEFAULTS.bookingPublicHeading;
    DATA.settings.bookingPublicIntro = value("bookingPublicIntro") || DEFAULTS.bookingPublicIntro;
    DATA.settings.bookingVisualStyle = value("bookingVisualStyle") || DEFAULTS.bookingVisualStyle;
    DATA.settings.bookingIconStyle = value("bookingIconStyle") || DEFAULTS.bookingIconStyle;
    DATA.settings.bookingShowTrustPanel = Boolean(form.elements.bookingShowTrustPanel?.checked);
  }

  function install() {
    const form = document.getElementById("settingsForm");
    if (!form || form.querySelector("[data-booking-public-customization]")) return;

    const panel = buildPanel();
    const groups = [...form.querySelectorAll(":scope > .settings-accordion")];
    const appearance = groups.find(group => /Apariencia/i.test(group.querySelector("summary")?.textContent || ""));

    if (appearance) form.insertBefore(panel, appearance);
    else {
      const savebar = form.querySelector(".settings-savebar");
      form.insertBefore(panel, savebar || null);
    }

    form.addEventListener("submit", () => captureSettings(form), { capture: true, once: true });
  }

  addStyles();
  install();

  const observer = new MutationObserver(() => install());
  observer.observe(document.body, { childList: true, subtree: true });
})();
