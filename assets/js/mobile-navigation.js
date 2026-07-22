(() => {
  "use strict";

  const MOBILE_BREAKPOINT = 900;
  const EDGE_SWIPE_ZONE = 28;
  const DRAG_START_THRESHOLD = 7;
  const OPEN_THRESHOLD = 0.42;

  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");

  if (!sidebar || !menuToggle) {
    console.error("ByAlee: no se encontró #sidebar o #menuToggle.");
    return;
  }

  const navLinks = [
    ...document.querySelectorAll(".nav-link[data-view]")
  ];

  const views = [
    ...document.querySelectorAll(".view")
  ];

  /*
   * Fondo oscuro detrás del menú.
   * Se crea desde JavaScript para no modificar index.html.
   */
  const overlay = document.createElement("button");
  overlay.type = "button";
  overlay.className = "sidebar-overlay";
  overlay.setAttribute("aria-label", "Cerrar menú");
  document.body.appendChild(overlay);

  /*
   * Pequeño indicador visual en el borde derecho del menú.
   */
  const dragHandle = document.createElement("div");
  dragHandle.className = "sidebar-drag-handle";
  dragHandle.setAttribute("aria-hidden", "true");
  dragHandle.innerHTML = "<span></span>";
  sidebar.appendChild(dragHandle);

  let dragging = false;
  let dragActivated = false;
  let dragStartedOpen = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let currentProgress = 0;
  let sidebarWidth = 0;

  const isMobile = () =>
    window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT}px)`
    ).matches;

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

  const isOpen = () =>
    sidebar.classList.contains("open");

  function updateAccessibility(open) {
    menuToggle.setAttribute(
      "aria-expanded",
      open ? "true" : "false"
    );

    sidebar.setAttribute(
      "aria-hidden",
      open || !isMobile() ? "false" : "true"
    );
  }

  function clearDragStyles() {
    sidebar.style.removeProperty("transition");
    sidebar.style.removeProperty("transform");
    overlay.style.removeProperty("transition");
    overlay.style.removeProperty("opacity");
    overlay.style.removeProperty("pointer-events");

    document.body.classList.remove(
      "sidebar-dragging"
    );
  }

  function openSidebar() {
    clearDragStyles();

    sidebar.classList.add("open");
    document.body.classList.add(
      "sidebar-is-open"
    );

    updateAccessibility(true);
  }

  function closeSidebar() {
    clearDragStyles();

    sidebar.classList.remove("open");
    document.body.classList.remove(
      "sidebar-is-open"
    );

    updateAccessibility(false);
  }

  function toggleSidebar() {
    if (isOpen()) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  /*
   * Cambia de vista sin depender del onclick antiguo
   * que exista dentro de app.js.
   */
  function activateView(viewName) {
    const targetView = document.getElementById(
      `${viewName}View`
    );

    const targetLink = document.querySelector(
      `.nav-link[data-view="${viewName}"]`
    );

    if (!targetView) {
      console.error(
        `ByAlee: no existe la vista #${viewName}View.`
      );

      window.showToast?.(
        "No se pudo abrir esta sección."
      );

      return false;
    }

    navLinks.forEach(link => {
      const active =
        link.dataset.view === viewName;

      link.classList.toggle(
        "active",
        active
      );

      link.setAttribute(
        "aria-current",
        active ? "page" : "false"
      );
    });

    views.forEach(view => {
      const active =
        view === targetView;

      view.classList.toggle(
        "active",
        active
      );

      view.setAttribute(
        "aria-hidden",
        active ? "false" : "true"
      );
    });

    closeSidebar();

    /*
     * Primero sube el contenido al comienzo.
     * requestAnimationFrame espera a que la vista se muestre.
     */
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
      });

      targetView.focus?.({
        preventScroll: true
      });
    });

    return true;
  }

  /*
   * Reemplaza los manejadores asignados por app.js.
   * Esto también permite que target.click() siga funcionando
   * desde el buscador, configuración y accesos internos.
   */
  navLinks.forEach(link => {
    if (link.tagName === "BUTTON") {
      link.type = "button";
    }

    link.onclick = event => {
      event.preventDefault();
      event.stopPropagation();

      if (link.hidden) {
        return;
      }

      activateView(link.dataset.view);
    };
  });

  menuToggle.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    toggleSidebar();
  };

  overlay.addEventListener(
    "click",
    closeSidebar
  );

  /*
   * También cierra al presionar fuera del menú,
   * aunque el clic no haya caído exactamente en el overlay.
   */
  document.addEventListener(
    "pointerdown",
    event => {
      if (
        !isMobile() ||
        !isOpen() ||
        dragging
      ) {
        return;
      }

      const clickedInside =
        sidebar.contains(event.target);

      const clickedToggle =
        menuToggle.contains(event.target);

      if (!clickedInside && !clickedToggle) {
        closeSidebar();
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        isOpen()
      ) {
        closeSidebar();
        menuToggle.focus();
      }
    }
  );

  function applyDragProgress(progress) {
    currentProgress = clamp(progress);

    const hiddenPercentage =
      (1 - currentProgress) * 100;

    sidebar.style.transform =
      `translate3d(-${hiddenPercentage}%, 0, 0)`;

    overlay.style.opacity =
      String(currentProgress);

    overlay.style.pointerEvents =
      currentProgress > 0.02
        ? "auto"
        : "none";
  }

  function canStartOpening(event) {
    return (
      !isOpen() &&
      event.clientX <= EDGE_SWIPE_ZONE
    );
  }

  function canStartClosing(event) {
    return (
      isOpen() &&
      sidebar.contains(event.target)
    );
  }

  function startDrag(event) {
    if (
      !isMobile() ||
      event.pointerType === "mouse" ||
      (
        !canStartOpening(event) &&
        !canStartClosing(event)
      )
    ) {
      return;
    }

    dragging = true;
    dragActivated = false;
    dragStartedOpen = isOpen();
    pointerId = event.pointerId;

    startX = event.clientX;
    startY = event.clientY;
    sidebarWidth =
      sidebar.getBoundingClientRect().width ||
      320;

    currentProgress =
      dragStartedOpen ? 1 : 0;
  }

  function moveDrag(event) {
    if (
      !dragging ||
      event.pointerId !== pointerId
    ) {
      return;
    }

    const deltaX =
      event.clientX - startX;

    const deltaY =
      event.clientY - startY;

    if (!dragActivated) {
      const horizontalDistance =
        Math.abs(deltaX);

      const verticalDistance =
        Math.abs(deltaY);

      if (
        horizontalDistance <
        DRAG_START_THRESHOLD
      ) {
        return;
      }

      /*
       * Si el gesto es principalmente vertical,
       * deja que la página se desplace normalmente.
       */
      if (
        verticalDistance >
        horizontalDistance
      ) {
        dragging = false;
        pointerId = null;
        return;
      }

      dragActivated = true;

      document.body.classList.add(
        "sidebar-dragging"
      );

      sidebar.style.transition = "none";
      overlay.style.transition = "none";

      /*
       * Hace visible el overlay durante el arrastre,
       * incluso antes de confirmar que el menú quede abierto.
       */
      document.body.classList.add(
        "sidebar-is-open"
      );
    }

    event.preventDefault();

    const progress = dragStartedOpen
      ? 1 + deltaX / sidebarWidth
      : deltaX / sidebarWidth;

    applyDragProgress(progress);
  }

  function finishDrag(event) {
    if (
      !dragging ||
      (
        event.pointerId !== undefined &&
        event.pointerId !== pointerId
      )
    ) {
      return;
    }

    const wasActivated =
      dragActivated;

    dragging = false;
    dragActivated = false;
    pointerId = null;

    if (!wasActivated) {
      return;
    }

    /*
     * Se abre si se mostró al menos 42 %.
     * En caso contrario vuelve a ocultarse.
     */
    if (currentProgress >= OPEN_THRESHOLD) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  document.addEventListener(
    "pointerdown",
    startDrag,
    {
      passive: true
    }
  );

  document.addEventListener(
    "pointermove",
    moveDrag,
    {
      passive: false
    }
  );

  document.addEventListener(
    "pointerup",
    finishDrag,
    {
      passive: true
    }
  );

  document.addEventListener(
    "pointercancel",
    finishDrag,
    {
      passive: true
    }
  );

  window.addEventListener(
    "resize",
    () => {
      if (!isMobile()) {
        closeSidebar();
        sidebar.removeAttribute(
          "aria-hidden"
        );
      } else {
        updateAccessibility(isOpen());
      }
    },
    {
      passive: true
    }
  );

  /*
   * Estado inicial.
   */
  updateAccessibility(isOpen());

  /*
   * API opcional para otras partes de la app.
   */
  window.ByAleeNavigation = {
    openSidebar,
    closeSidebar,
    toggleSidebar,
    activateView
  };
})();