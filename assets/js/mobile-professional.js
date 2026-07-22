(() => {
  "use strict";

  /*
   * ByAlee — organización profesional de solicitudes móviles.
   * Se ejecuta después de app.js.
   * No crea ni modifica datos; únicamente reorganiza botones existentes.
   */

  const cleanText = element =>
    String(element?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const isActionElement = element =>
    element instanceof HTMLElement &&
    (
      element.matches("button, a, [role='button'], .btn, .icon-btn") ||
      element.closest("button, a, [role='button'], .btn, .icon-btn")
    );

  const actionNode = element =>
    element.matches("button, a, [role='button'], .btn, .icon-btn")
      ? element
      : element.closest("button, a, [role='button'], .btn, .icon-btn");

  function organizeRequestCard(card) {
    if (!(card instanceof HTMLElement)) return;
    if (card.dataset.professionalRequestReady === "true") return;

    card.querySelectorAll("details").forEach(details => details.remove());

    const candidates = [...card.querySelectorAll(
      "button, a, [role='button'], .btn, .icon-btn"
    )]
      .map(actionNode)
      .filter(Boolean)
      .filter((node, index, array) => array.indexOf(node) === index)
      .filter(node => !node.closest(".professional-request-actions"));

    const classify = label => {
      if (/confirmar/.test(label)) return "confirm";
      if (/editar/.test(label)) return "edit";
      if (/ficha/.test(label)) return "record";
      if (/comprobante/.test(label)) return "proof";
      if (/rechazar|cancelar/.test(label)) return "reject";
      return "other";
    };

    const groups = {
      confirm: [],
      edit: [],
      record: [],
      proof: [],
      reject: [],
      other: []
    };

    candidates.forEach(node => {
      groups[classify(cleanText(node))].push(node);
    });

    if (!candidates.length) {
      card.dataset.professionalRequestReady = "true";
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "professional-request-actions";

    const primary = document.createElement("div");
    primary.className = "professional-request-primary";

    const secondary = document.createElement("div");
    secondary.className = "professional-request-secondary";

    [...groups.confirm, ...groups.edit].forEach(node => {
      node.classList.add("request-primary-action");
      primary.appendChild(node);
    });

    [...groups.record, ...groups.proof, ...groups.reject, ...groups.other]
      .forEach(node => {
        node.classList.add("request-secondary-action");

        const label = cleanText(node);

        if (/rechazar|cancelar/.test(label)) {
          node.classList.add("request-danger-action");
        }

        if (/comprobante/.test(label)) {
          node.classList.add("request-proof-action");
        }

        secondary.appendChild(node);
      });

    if (primary.children.length) wrapper.appendChild(primary);
    if (secondary.children.length) wrapper.appendChild(secondary);

    card.appendChild(wrapper);
    card.dataset.professionalRequestReady = "true";
  }

  function professionalizeRequests() {
    const list = document.getElementById("bookingRequestList");
    if (!list) return;

    [...list.children].forEach(organizeRequestCard);
  }

  function simplifyDashboardCopy() {
    const panel =
      document.getElementById("bookingRequestsPanel") ||
      document.querySelector(".booking-requests-panel");

    if (!panel) return;

    const description = panel.querySelector(".panel-header p");

    if (description) {
      description.textContent =
        "Confirmá, editá o rechazá las solicitudes pendientes.";
    }
  }

  let queued = false;

  function refresh() {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      professionalizeRequests();
      simplifyDashboardCopy();
      queued = false;
    });
  }

  document.addEventListener("DOMContentLoaded", refresh);

  const observer = new MutationObserver(refresh);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();