(() => {
  "use strict";

  const DARK_LOGO =
    "/assets/images/byale-logo-dark.webp";

  const LIGHT_LOGO =
    "/assets/images/byale-logo-light.webp";

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
    return (
      document.documentElement
        .dataset
        .theme === "dark"
        ? DARK_LOGO
        : LIGHT_LOGO
    );
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