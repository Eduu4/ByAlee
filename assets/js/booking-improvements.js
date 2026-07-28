(() => {
  "use strict";

  /*
   * Tiempo mínimo para permitir una reserva del mismo día.
   * Podés cambiar 30 por 0 si querés permitir turnos que
   * comiencen inmediatamente.
   */
  const MINIMUM_NOTICE_MINUTES = 30;

  const AREA_ICONS = {
    "Pestañas": "bi-eye",
    "Cejas": "bi-brush",
    "Manos": "bi-hand-index",
    "Pies": "bi-gem",
    "Servicios": "bi-stars"
  };

  const $ = selector => document.querySelector(selector);

  const localDateISO = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const timeToMinutes = value => {
    const [hours, minutes] = String(value || "00:00")
      .split(":")
      .map(Number);

    return (hours || 0) * 60 + (minutes || 0);
  };

  function polishAreaIcons() {
    document
      .querySelectorAll("#areaChoices [data-area]")
      .forEach(button => {
        const icon = button.querySelector("i");
        const area = button.dataset.area || "";
        const iconClass = AREA_ICONS[area] || "bi-stars";

        if (icon) {
          icon.className = `bi ${iconClass}`;
          icon.setAttribute("aria-hidden", "true");
        }

        button.setAttribute(
          "aria-label",
          `Seleccionar ${area || "servicio"}`
        );
      });
  }

  function ensureTimeNote(isToday, removedCount) {
    const dateField = $("#bookingDate");
    if (!dateField) return;

    let note = $("#timeStatusNote");

    if (!isToday) {
      note?.remove();
      return;
    }

    if (!note) {
      note = document.createElement("div");
      note.id = "timeStatusNote";
      note.className = "time-status-note";
      dateField.closest(".field")?.insertAdjacentElement(
        "afterend",
        note
      );
    }

    note.innerHTML = `
      <i class="bi bi-clock-history"></i>
      <span>
        Para hoy solo mostramos horarios que todavía pueden
        reservarse. Se aplica una anticipación mínima de
        ${MINIMUM_NOTICE_MINUTES} minutos.
        ${removedCount > 0
          ? `Se ocultaron ${removedCount} horario(s) anteriores.`
          : ""}
      </span>
    `;
  }

  function filterPastTimes() {
    const grid = $("#bookingTimes");
    const dateField = $("#bookingDate");

    if (!grid || !dateField?.value) return;

    const buttons = [
      ...grid.querySelectorAll("[data-time]")
    ];

    /*
     * Si booking.js todavía muestra un mensaje como
     * “Primero elegí un servicio”, no se modifica.
     */
    if (!buttons.length) {
      ensureTimeNote(
        dateField.value === localDateISO(new Date()),
        0
      );
      return;
    }

    const now = new Date();
    const isToday =
      dateField.value === localDateISO(now);

    if (!isToday) {
      ensureTimeNote(false, 0);
      return;
    }

    const minimumStart =
      now.getHours() * 60 +
      now.getMinutes() +
      MINIMUM_NOTICE_MINUTES;

    let removedCount = 0;

    buttons.forEach(button => {
      const start = timeToMinutes(
        button.dataset.time ||
        button.textContent.trim()
      );

      if (start < minimumStart) {
        button.remove();
        removedCount += 1;
      }
    });

    ensureTimeNote(true, removedCount);

    if (!grid.querySelector("[data-time]")) {
      grid.innerHTML = `
        <div class="booking-time-empty">
          <i class="bi bi-calendar-x"></i>
          <strong>Ya no quedan horarios disponibles para hoy</strong>
          <span>
            Elegí otra fecha para consultar los próximos
            horarios libres.
          </span>
        </div>
      `;
    }
  }

  let scheduled = false;

  function refreshEnhancements() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      polishAreaIcons();
      filterPastTimes();
      scheduled = false;
    });
  }

  document.addEventListener(
    "DOMContentLoaded",
    refreshEnhancements
  );

  $("#bookingDate")?.addEventListener(
    "change",
    () => requestAnimationFrame(filterPastTimes)
  );

  /*
   * Impide continuar desde el paso 2 cuando el horario
   * seleccionado ya dejó de estar disponible.
   */
  $("#nextBtn")?.addEventListener(
    "click",
    event => {
      const secondStep = document.querySelector(
        '.step[data-step="2"].active'
      );

      if (!secondStep) return;

      const selectedButton = document.querySelector(
        "#bookingTimes [data-time].active"
      );

      if (!selectedButton) {
        event.preventDefault();
        event.stopImmediatePropagation();

        alert(
          "Elegí uno de los horarios que siguen disponibles."
        );
      }
    },
    true
  );

  const observer = new MutationObserver(
    refreshEnhancements
  );

  const bookingCard = $("#bookingCard");

  if (bookingCard) {
    observer.observe(bookingCard, {
      childList: true,
      subtree: true
    });
  }

  /*
   * Actualiza los horarios si la página queda abierta
   * mientras transcurre el día.
   */
  window.setInterval(filterPastTimes, 60_000);
})();
