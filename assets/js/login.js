(() => {
  "use strict";

  const DEFAULTS = {
    studioName: "ByAlee",
    primaryColor: "#8f5c70",
    appearance: "dark"
  };

  const CACHE_KEY = "byalee_login_branding_v2";
  const IDENTIFIER_KEY = "byalee_login_identifier_v1";

  const form = document.getElementById("loginForm");
  const card = document.getElementById("loginCard");
  const message = document.getElementById("loginMessage");
  const submit = document.getElementById("loginSubmit");
  const identifierInput =
    document.getElementById("loginIdentifier");
  const passwordInput =
    document.getElementById("loginPassword");
  const rememberInput =
    document.getElementById("rememberIdentifier");
  const passwordToggle =
    document.getElementById("passwordToggle");
  const helpButton =
    document.getElementById("loginHelp");
  const studioNameElement =
    document.getElementById("loginStudioName");
  const brandLogo =
    document.getElementById("brandLogo");
  const mobileBrandLogo =
    document.getElementById("mobileBrandLogo");

  let currentSettings = {
    ...DEFAULTS
  };

  function readObject(key) {
    try {
      const value = JSON.parse(
        localStorage.getItem(key) || "null"
      );

      return value &&
        typeof value === "object" &&
        !Array.isArray(value)
          ? value
          : {};
    } catch {
      return {};
    }
  }

  function normalizeHex(value) {
    const candidate = String(value || "").trim();

    if (/^#[0-9a-f]{6}$/i.test(candidate)) {
      return candidate.toLowerCase();
    }

    if (/^#[0-9a-f]{3}$/i.test(candidate)) {
      return `#${candidate
        .slice(1)
        .split("")
        .map(character => character + character)
        .join("")
        .toLowerCase()}`;
    }

    return DEFAULTS.primaryColor;
  }

  function hexToRgb(value) {
    const hex = normalizeHex(value).slice(1);

    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16)
    };
  }

  function mixColor(value, target, ratio) {
    const sourceRgb = hexToRgb(value);
    const targetRgb = hexToRgb(target);

    const channel = key =>
      Math.round(
        sourceRgb[key] +
        (targetRgb[key] - sourceRgb[key]) * ratio
      )
        .toString(16)
        .padStart(2, "0");

    return `#${channel("r")}${channel("g")}${channel("b")}`;
  }

  function resolveTheme(appearance) {
    if (appearance === "system") {
      return matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";
    }

    return appearance === "light"
      ? "light"
      : "dark";
  }

  function updateLogo(theme) {
    const source =
      theme === "dark"
        ? "/assets/images/byale-logo-dark.webp"
        : "/assets/images/byale-logo-light.webp";

    brandLogo.src = source;
    mobileBrandLogo.src = source;
  }

  function applyBranding(settings = {}) {
    currentSettings = {
      ...DEFAULTS,
      ...settings
    };

    const theme = resolveTheme(
      currentSettings.appearance
    );

    const originalColor = normalizeHex(
      currentSettings.primaryColor
    );

    const displayColor =
      theme === "dark"
        ? mixColor(originalColor, "#ffffff", 0.2)
        : originalColor;

    const deepColor =
      theme === "dark"
        ? mixColor(originalColor, "#000000", 0.12)
        : mixColor(originalColor, "#000000", 0.22);

    const rgb = hexToRgb(originalColor);

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty(
      "--login-primary",
      displayColor
    );
    document.documentElement.style.setProperty(
      "--login-primary-deep",
      deepColor
    );
    document.documentElement.style.setProperty(
      "--login-primary-rgb",
      `${rgb.r}, ${rgb.g}, ${rgb.b}`
    );

    const studioName =
      String(
        currentSettings.studioName ||
        DEFAULTS.studioName
      ).trim() ||
      DEFAULTS.studioName;

    studioNameElement.textContent = studioName;
    document.title = `Acceso — ${studioName}`;

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", originalColor);

    updateLogo(theme);
  }

  function loadCachedBranding() {
    const publicSettings =
      readObject("byalee_public_data_v2")
        .settings || {};

    applyBranding({
      ...DEFAULTS,
      ...readObject(CACHE_KEY),
      ...publicSettings,
      ...readObject("lashflow_demo_settings")
    });
  }

  function todayISO() {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  }

  async function refreshBranding() {
    try {
      const today = todayISO();

      const response = await fetch(
        `/api/public-data?from=${today}&to=${today}`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        return;
      }

      const remoteSettings = {
        ...DEFAULTS,
        ...(payload.settings || {})
      };

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify(remoteSettings)
      );

      applyBranding(remoteSettings);
    } catch (error) {
      console.warn(
        "No se pudo actualizar la apariencia del login:",
        error
      );
    }
  }

  function setMessage(text, type = "error") {
    message.textContent = text;
    message.className =
      `login-message ${type}`;
  }

  function clearMessage() {
    message.textContent = "";
    message.className = "login-message";
  }

  function safeNext() {
    const value =
      new URLSearchParams(location.search)
        .get("next") ||
      "/admin";

    return value.startsWith("/") &&
      !value.startsWith("//")
        ? value
        : "/admin";
  }

  function setLoading(loading) {
    card.classList.toggle(
      "login-loading",
      loading
    );

    submit.disabled = loading;

    submit.querySelector("span").textContent =
      loading
        ? "Verificando acceso…"
        : "Iniciar sesión";
  }

  function restoreIdentifier() {
    const savedIdentifier =
      localStorage.getItem(IDENTIFIER_KEY) || "";

    if (savedIdentifier) {
      identifierInput.value = savedIdentifier;
      rememberInput.checked = true;
    }
  }

  function persistIdentifier() {
    if (rememberInput.checked) {
      localStorage.setItem(
        IDENTIFIER_KEY,
        identifierInput.value.trim()
      );
    } else {
      localStorage.removeItem(IDENTIFIER_KEY);
    }
  }

  passwordToggle.addEventListener(
    "click",
    () => {
      const show =
        passwordInput.type === "password";

      passwordInput.type =
        show
          ? "text"
          : "password";

      passwordToggle.setAttribute(
        "aria-pressed",
        String(show)
      );

      passwordToggle.setAttribute(
        "aria-label",
        show
          ? "Ocultar contraseña"
          : "Mostrar contraseña"
      );

      passwordInput.focus({
        preventScroll: true
      });
    }
  );

  helpButton.addEventListener(
    "click",
    () => {
      setMessage(
        "La recuperación de acceso debe realizarla la persona administradora desde Supabase Authentication.",
        "info"
      );
    }
  );

  async function initialize() {
    const setupMessage =
      new URLSearchParams(location.search)
        .get("setup");

    if (setupMessage) {
      setMessage(
        setupMessage,
        "error"
      );
    }

    const platform =
      await window.ByAleePlatform.ready;

    if (
      !platform.configured ||
      !platform.client
    ) {
      setMessage(
        platform.error?.message ||
        "Supabase todavía no está configurado en Vercel.",
        "error"
      );

      submit.disabled = true;
      return;
    }

    const {
      data,
      error
    } =
      await platform.client.auth.getSession();

    if (error) {
      console.warn(
        "No se pudo comprobar la sesión:",
        error
      );
      return;
    }

    if (data.session) {
      location.replace(safeNext());
    }
  }

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      clearMessage();

      const identifier =
        identifierInput.value
          .trim()
          .toLowerCase();

      const password =
        passwordInput.value;

      if (!identifier) {
        setMessage(
          "Ingresá tu usuario o correo.",
          "error"
        );

        identifierInput.focus();
        return;
      }

      if (!password) {
        setMessage(
          "Ingresá tu contraseña.",
          "error"
        );

        passwordInput.focus();
        return;
      }

      persistIdentifier();
      setLoading(true);

      try {
        const platform =
          await window.ByAleePlatform.ready;

        if (
          !platform.configured ||
          !platform.client
        ) {
          throw (
            platform.error ||
            new Error(
              "Supabase no está configurado."
            )
          );
        }

        const response = await fetch(
          "/api/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              identifier,
              password
            })
          }
        );

        const result = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
            "No se pudo iniciar sesión."
          );
        }

        const {
          error: sessionError
        } =
          await platform.client.auth.setSession({
            access_token:
              result.session.access_token,
            refresh_token:
              result.session.refresh_token
          });

        if (sessionError) {
          throw sessionError;
        }

        setMessage(
          "Acceso correcto. Abriendo el panel…",
          "success"
        );

        location.replace(safeNext());
      } catch (error) {
        console.error(error);

        const text =
          /incorrectos|invalid login credentials/i
            .test(error.message || "")
              ? "Usuario, correo o contraseña incorrectos."
              : (
                  error.message ||
                  "No se pudo iniciar sesión."
                );

        setMessage(text, "error");
      } finally {
        setLoading(false);
      }
    }
  );

  form.addEventListener(
    "input",
    clearMessage
  );

  window.addEventListener(
    "storage",
    event => {
      if (
        [
          CACHE_KEY,
          "lashflow_demo_settings",
          "byalee_public_data_v2"
        ].includes(event.key)
      ) {
        loadCachedBranding();
      }
    }
  );

  matchMedia(
    "(prefers-color-scheme: dark)"
  ).addEventListener?.(
    "change",
    () => {
      if (
        currentSettings.appearance === "system"
      ) {
        applyBranding(currentSettings);
      }
    }
  );

  loadCachedBranding();
  restoreIdentifier();
  refreshBranding();
  initialize();
})();