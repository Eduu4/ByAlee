(function () {
  "use strict";

  const LOGO_DARK =
    "/assets/images/byale-logo-dark.webp";

  const LOGO_LIGHT =
    "/assets/images/byale-logo-light.webp";

  const BRANDING_CACHE =
    "byalee_dashboard_branding_v1";

  function getElement(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function wait(milliseconds) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function getNestedValue(object, path) {
    let current = object;

    for (let index = 0; index < path.length; index += 1) {
      if (
        current === null ||
        current === undefined
      ) {
        return undefined;
      }

      current = current[path[index]];
    }

    return current;
  }

  function escapeHtml(value) {
    return String(value || "").replace(
      /[&<>'"]/g,
      function (character) {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;"
        };

        return entities[character];
      }
    );
  }

  function currentTheme() {
    return (
      document.documentElement.getAttribute(
        "data-theme"
      ) || "light"
    );
  }

  function logoForCurrentTheme() {
    /*
      byale-logo-dark.webp:
      letras claras para fondo oscuro.

      byale-logo-light.webp:
      letras oscuras para fondo claro.
    */
    return currentTheme() === "dark"
      ? LOGO_DARK
      : LOGO_LIGHT;
  }

  function updateSidebarLogo() {
    const brand =
      getElement(".sidebar > .brand");

    if (!brand) {
      return;
    }

    brand.classList.add(
      "sidebar-brand-logo-wrap"
    );

    let logo =
      getElement(
        "#sidebarBrandLogo",
        brand
      );

    if (!logo) {
      brand.innerHTML =
        '<img ' +
        'id="sidebarBrandLogo" ' +
        'class="sidebar-brand-logo" ' +
        'alt="By Ale — Lash & Brown"' +
        ">";

      logo =
        getElement(
          "#sidebarBrandLogo",
          brand
        );
    }

    if (!logo) {
      return;
    }

    const expectedSource =
      logoForCurrentTheme();

    if (
      logo.getAttribute("src") !==
      expectedSource
    ) {
      logo.setAttribute(
        "src",
        expectedSource
      );
    }
  }

  function getUserName() {
    const possibleNames = [
      getNestedValue(
        window.LASHFLOW_DATA,
        ["settings", "userName"]
      ),

      getNestedValue(
        window.ByAleeDB,
        ["state", "profile", "full_name"]
      ),

      getNestedValue(
        window.ByAleeDB,
        [
          "state",
          "user",
          "user_metadata",
          "full_name"
        ]
      )
    ];

    for (
      let index = 0;
      index < possibleNames.length;
      index += 1
    ) {
      const value =
        possibleNames[index];

      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value
          .trim()
          .split(/\s+/)[0];
      }
    }

    const email =
      getNestedValue(
        window.ByAleeDB,
        ["state", "user", "email"]
      );

    if (
      typeof email === "string" &&
      email.includes("@")
    ) {
      return email
        .split("@")[0]
        .trim();
    }

    return "ByAlee";
  }

  function getCurrentHour() {
    try {
      const parts =
        new Intl.DateTimeFormat(
          "es-PY",
          {
            timeZone: "America/Asuncion",
            hour: "2-digit",
            hourCycle: "h23"
          }
        ).formatToParts(new Date());

      for (
        let index = 0;
        index < parts.length;
        index += 1
      ) {
        if (
          parts[index].type === "hour"
        ) {
          return Number(
            parts[index].value
          );
        }
      }
    } catch (error) {
      console.warn(
        "No se pudo obtener la hora de Paraguay:",
        error
      );
    }

    return new Date().getHours();
  }

  function getGreeting() {
    const hour =
      getCurrentHour();

    if (
      hour >= 5 &&
      hour < 12
    ) {
      return "Buenos días";
    }

    if (
      hour >= 12 &&
      hour < 19
    ) {
      return "Buenas tardes";
    }

    return "Buenas noches";
  }

  function updateGreeting() {
    const heading =
      getElement("#dashboardGreeting") ||
      getElement("#dashboardView h1");

    if (!heading) {
      return;
    }

    const greeting =
      getGreeting();

    const userName =
      getUserName();

    const expectedText =
      greeting +
      ", " +
      userName +
      " ✨";

    const currentText =
      heading.textContent
        .replace(/\s+/g, " ")
        .trim();

    if (
      currentText === expectedText
    ) {
      return;
    }

    heading.innerHTML =
      escapeHtml(greeting) +
      ", " +
      '<span class="dashboard-user-name">' +
      escapeHtml(userName) +
      "</span> " +
      '<span aria-hidden="true">✨</span>';
  }

  function removePhysicalImport() {
    const selectors = [
      "#openPhysicalRecordImportBtn",
      "#physicalRecordImportRoot",
      "#physicalImportOverlay",
      ".physical-import-launcher",
      ".physical-import-overlay"
    ];

    selectors.forEach(
      function (selector) {
        document
          .querySelectorAll(selector)
          .forEach(function (element) {
            element.remove();
          });
      }
    );
  }

  function improveMaintenanceField() {
    const input =
      getElement(
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
      getElement(
        ":scope > span",
        field
      );

    if (
      title &&
      title.textContent.trim() !==
        "Sugerir mantenimiento después de"
    ) {
      title.textContent =
        "Sugerir mantenimiento después de";
    }

    if (
      !getElement(
        "#maintenanceDaysHelp",
        field
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
        "la próxima fecha. No crea una cita.";

      field.appendChild(help);
    }
  }

  function refreshInterface() {
    updateSidebarLogo();
    updateGreeting();
    removePhysicalImport();
    improveMaintenanceField();
  }

  async function initialize() {
    try {
      if (window.byAleeAuthReady) {
        await window.byAleeAuthReady;
      }
    } catch (error) {
      console.warn(
        "No se pudo esperar la autenticación:",
        error
      );
    }

    /*
      Reintentos limitados mientras app.js
      termina de cargar el perfil.
    */
    for (
      let attempt = 0;
      attempt < 20;
      attempt += 1
    ) {
      refreshInterface();

      if (
        getUserName() !== "ByAlee"
      ) {
        break;
      }

      await wait(150);
    }

    window.setTimeout(
      refreshInterface,
      1000
    );

    window.setTimeout(
      refreshInterface,
      2500
    );

    window.setInterval(
      updateGreeting,
      60000
    );

    /*
      Solo observa el cambio de tema.
      No observa todo el documento.
    */
    const themeObserver =
      new MutationObserver(
        function () {
          updateSidebarLogo();
        }
      );

    themeObserver.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "data-theme"
        ]
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