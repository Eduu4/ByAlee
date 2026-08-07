(() => {
  "use strict";

  const LOGO_FOR_DARK_THEME =
  "/assets/images/byale-logo-light.webp";

const LOGO_FOR_LIGHT_THEME =
  "/assets/images/byale-logo-dark.webp";

  const $ = (
    selector,
 const LIGHT_LOGO =
    "/assets/images/byale-logo-light.webp";

  const $ = (
    selector,
    parent = document
  ) => parent.querySelector(selector);

  const wait = milliseconds =>
    new Promise(resolve =>
      window.setTimeout(resolve, milliseconds)
    );

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>'"]/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[character]
    );
  }

  function firstUsefulName() {
    const settingsName =
      window.LASHFLOW_DATA
        ?.settings
        ?.userName;

    const profileName =
      window.ByAleeDB
        ?.state
        ?.profile
        ?.full_name;

    const metadataName =
      window.ByAleeDB
        ?.state
        ?.user
        ?.user_metadata
        ?.full_name;

    const email =
      window.ByAleeDB
        ?.state
        ?.user
        ?.email;

    const candidate =
      settingsName ||
      profileName ||
      metadataName ||
      (
        email
          ? String(email).split("@")[0]
          : ""
      ) ||
      "ByAlee";

    return String(candidate)
      .trim()
      .split(/\s+/)[0] || "ByAlee";
  }

  function currentHour() {
    const timezone =
      window.LASHFLOW_DATA
        ?.settings
        ?.timezone ||
      "America/Asuncion";

    try {
      const parts =
        new Intl.DateTimeFormat(
          "es-PY",
          {
            timeZone: timezone,
            hour: "2-digit",
            hourCycle: "h23"
          }
        ).formatToParts(new Date());

      return Number(
        parts.find(
          part => part.type === "hour"
        )?.value
      );
    } catch {
      return new Date().getHours();
    }
  }

  function greetingText() {
    const hour = currentHour();

    if (hour >= 5 && hour < 12) {
      return "Buenos días";
    }

    if (hour >= 12 && hour < 19) {
      return "Buenas tardes";
    }

    return "Buenas noches";
  }

  function updateGreeting() {
    const greeting =
      $("#dashboardGreeting") ||
      $("#dashboardView h1");

    if (!greeting) {
      return;
    }

    const greetingValue =
      greetingText();

    const userName =
      firstUsefulName();

    const expected =
      `${greetingValue}, ${userName} ✨`;

    const current =
      greeting.textContent
        .replace(/\s+/g, " ")
        .trim();

    if (current === expected) {
      return;
    }

    greeting.innerHTML =
      `${escapeHtml(greetingValue)}, ` +
      `<span class="dashboard-user-name">` +
      `${escapeHtml(userName)}` +
      `</span> ` +
      `<span aria-hidden="true">✨</span>`;
  }

  function logoForCurrentTheme() {
  const theme =
    document.documentElement.getAttribute("data-theme") || "dark";

  return theme === "dark"
    ? LOGO_FOR_DARK_THEME
    : LOGO_FOR_LIGHT_THEME;
}

  function installSidebarLogo() {
    const brand =
      $(".sidebar > .brand");

    if (!brand) {
      return;
    }

    brand.classList.add(
      "sidebar-brand-logo-wrap"
    );

    let logo =
      $("#sidebarBrandLogo", brand);

    if (!logo) {
      brand.innerHTML = `
        <img
          id="sidebarBrandLogo"
          class="sidebar-brand-logo"
          src="${logoForCurrentTheme()}"
          alt="By Ale — Lash & Brown"
        >
      `;

      logo =
        $("#sidebarBrandLogo", brand);
    }

    const expectedSource =
      new URL(
        logoForCurrentTheme(),
        location.origin
      ).href;

    if (
      logo &&
      logo.src !== expectedSource
    ) {
      logo.src =
        logoForCurrentTheme();
    }
  }

  function removePhysicalImport() {
    [
      "#openPhysicalRecordImportBtn",
      "#physicalRecordImportRoot",
      "#physicalImportOverlay",
      ".physical-import-launcher",
      ".physical-import-overlay"
    ].forEach(selector => {
      document
        .querySelectorAll(selector)
        .forEach(element => {
          element.remove();
        });
    });
  }

  function improveMaintenanceField() {
    const input =
      document.querySelector(
        '#settingsForm ' +
        '[name="maintenanceDays"]'
      );

    if (!input) {
      return;
    }

    const field =
      input.closest(".field");

    if (!field) {
      return;
    }

    const title =
      field.querySelector(
        ":scope > span"
      );

    const expectedTitle =
      "Sugerir mantenimiento después de";

    if (
      title &&
      title.textContent.trim() !==
        expectedTitle
    ) {
      title.textContent =
        expectedTitle;
    }

    input.setAttribute(
      "aria-describedby",
      "maintenanceDaysHelp"
    );

    if (
      !field.querySelector(
        "#maintenanceDaysHelp"
      )
    ) {
      const help =
        document.createElement("small");

      help.id =
        "maintenanceDaysHelp";

      help.className =
        "field-help";

      help.textContent =
        "Cantidad de días que se suman " +
        "a la última visita para sugerir " +
        "la próxima fecha. No crea una " +
        "cita automáticamente.";

      field.appendChild(help);
    }
  }

  function refreshInterface() {
    removePhysicalImport();
    installSidebarLogo();
    updateGreeting();
    improveMaintenanceField();
  }

  async function initialize() {
    try {
      await window.byAleeAuthReady;
    } catch {
      return;
    }

    for (
      let attempt = 0;
      attempt < 30;
      attempt += 1
    ) {
      if (
        window.LASHFLOW_DATA
          ?.settings
          ?.userName
      ) {
        break;
      }

      await wait(100);
    }

    refreshInterface();

    /*
      Reintentos finitos por si app.js termina
      de renderizar un poco después.
      No se usan observadores sobre todo el DOM.
    */
    window.setTimeout(
      refreshInterface,
      800
    );

    window.setTimeout(
      refreshInterface,
      2500
    );

    window.setInterval(
      updateGreeting,
      60_000
    );

    /*
      Este observador solo escucha el atributo
      data-theme y no modifica ese atributo,
      por lo que no genera un ciclo.
    */
    const themeObserver =
      new MutationObserver(() => {
        installSidebarLogo();
      });

    themeObserver.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ["data-theme"]
      }
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }
})();

/* =========================================================
   AJUSTE DE LOGO Y CONTRASTE DEL SIDEBAR
========================================================= */

/* Logo del sidebar */
.sidebar-brand-logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 14px 12px;
}

.sidebar-brand-logo {
  display: block;
  width: 100%;
  max-width: 124px;
  height: auto;
  object-fit: contain;
  opacity: 1 !important;
  filter: none !important;
}

/* ---------- MODO OSCURO ---------- */
[data-theme="dark"] .sidebar .brand,
[data-theme="dark"] .sidebar-brand-logo-wrap {
  background: transparent;
}

[data-theme="dark"] .sidebar .nav-link,
[data-theme="dark"] .sidebar .sidebar-link,
[data-theme="dark"] .sidebar a,
[data-theme="dark"] .sidebar button {
  color: rgba(255, 244, 248, 0.88) !important;
  opacity: 1 !important;
}

[data-theme="dark"] .sidebar .nav-link:hover,
[data-theme="dark"] .sidebar .sidebar-link:hover {
  color: #ffffff !important;
}

[data-theme="dark"] .sidebar .nav-link.active,
[data-theme="dark"] .sidebar .sidebar-link.active {
  color: #ffffff !important;
}

[data-theme="dark"] .sidebar .section-title,
[data-theme="dark"] .sidebar .section-label,
[data-theme="dark"] .sidebar small,
[data-theme="dark"] .sidebar .muted {
  color: rgba(255, 244, 248, 0.54) !important;
  opacity: 1 !important;
}

/* ---------- MODO CLARO ---------- */
[data-theme="light"] .sidebar {
  background: #f7f3f6 !important;
  border-right: 1px solid rgba(80, 40, 70, 0.08);
}

[data-theme="light"] .sidebar .brand,
[data-theme="light"] .sidebar-brand-logo-wrap {
  background: transparent;
}

[data-theme="light"] .sidebar .nav-link,
[data-theme="light"] .sidebar .sidebar-link,
[data-theme="light"] .sidebar a,
[data-theme="light"] .sidebar button {
  color: #544152 !important;
  opacity: 1 !important;
}

[data-theme="light"] .sidebar .nav-link:hover,
[data-theme="light"] .sidebar .sidebar-link:hover {
  color: #241926 !important;
  background: rgba(230, 112, 198, 0.10) !important;
}

[data-theme="light"] .sidebar .nav-link.active,
[data-theme="light"] .sidebar .sidebar-link.active {
  color: #6e146b !important;
  background: rgba(236, 176, 226, 0.78) !important;
  font-weight: 700;
}

[data-theme="light"] .sidebar .nav-link.active i,
[data-theme="light"] .sidebar .sidebar-link.active i {
  color: #6e146b !important;
}

[data-theme="light"] .sidebar .section-title,
[data-theme="light"] .sidebar .section-label,
[data-theme="light"] .sidebar small,
[data-theme="light"] .sidebar .muted {
  color: #8b7686 !important;
  opacity: 1 !important;
}

[data-theme="light"] .sidebar .brand-title,
[data-theme="light"] .sidebar .brand-name,
[data-theme="light"] .sidebar .profile-name {
  color: #241926 !important;
  opacity: 1 !important;
}

[data-theme="light"] .sidebar .brand-subtitle,
[data-theme="light"] .sidebar .profile-role {
  color: #7a6576 !important;
  opacity: 1 !important;
}

/* Íconos del sidebar */
[data-theme="light"] .sidebar i,
[data-theme="light"] .sidebar svg {
  opacity: 1 !important;
}

[data-theme="dark"] .sidebar i,
[data-theme="dark"] .sidebar svg {
  opacity: 1 !important;
}