(() => {
  "use strict";

  const DARK_LOGO =
    "/assets/images/byale-logo-dark.webp";

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

      const hour =
        parts.find(
          part => part.type === "hour"
        )?.value;

      return Number(hour);
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

    const expected =
      `${greetingText()}, ` +
      `${firstUsefulName()} ✨`;

    if (
      greeting.textContent
        .replace(/\s+/g, " ")
        .trim() === expected
    ) {
      return;
    }

    greeting.innerHTML =
      `${escapeHtml(greetingText())}, ` +
      `<span class="dashboard-user-name">` +
      `${escapeHtml(firstUsefulName())}` +
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
    const brand = $(".sidebar > .brand");

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

    if (logo) {
      logo.src = logoForCurrentTheme();
    }
  }

  function removePhysicalImport() {
    [
      "#openPhysicalRecordImportBtn",
      "#physicalRecordImportRoot",
      "#physicalImportOverlay"
    ].forEach(selector => {
      document
        .querySelectorAll(selector)
        .forEach(element => element.remove());
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

    if (title) {
      title.textContent =
        "Sugerir mantenimiento después de";
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
      // auth.js se encarga de redirigir.
    }

    /*
      app.js carga los datos compartidos de forma
      asíncrona. Esperamos brevemente para obtener
      el nombre real del perfil autenticado.
    */
    for (
      let attempt = 0;
      attempt < 40;
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

    window.setInterval(
      updateGreeting,
      60_000
    );

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

    const dashboard =
      $("#dashboardView");

    if (dashboard) {
      const greetingObserver =
        new MutationObserver(() => {
          updateGreeting();
        });

      greetingObserver.observe(
        dashboard,
        {
          childList: true,
          subtree: true,
          characterData: true
        }
      );
    }

    const settingsView =
      $("#settingsView");

    if (settingsView) {
      const settingsObserver =
        new MutationObserver(() => {
          improveMaintenanceField();
        });

      settingsObserver.observe(
        settingsView,
        {
          childList: true,
          subtree: true
        }
      );
    }

    /*
      Protección adicional: aunque quede el script
      antiguo en la caché, cualquier botón o modal
      que intente inyectar será retirado.
    */
    const bodyObserver =
      new MutationObserver(() => {
        removePhysicalImport();
      });

    bodyObserver.observe(
      document.body,
      {
        childList: true,
        subtree: true
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
