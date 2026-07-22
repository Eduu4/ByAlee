(() => {
  "use strict";

  /*
   * Añade etiquetas a las celdas para que las tablas puedan
   * mostrarse como tarjetas en móviles sin cambiar la lógica
   * ni los datos de app.js.
   */
  const enhanceTables = (root = document) => {
    root.querySelectorAll(".data-table").forEach(table => {
      const headers = [...table.querySelectorAll("thead th")]
        .map(th => th.textContent.trim());

      table.querySelectorAll("tbody tr").forEach(row => {
        [...row.children].forEach((cell, index) => {
          if (cell.tagName !== "TD") return;
          if (!cell.dataset.label && headers[index]) {
            cell.dataset.label = headers[index];
          }
        });
      });
    });
  };

  let frame = null;

  const scheduleEnhancement = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      enhanceTables();
      frame = null;
    });
  };

  document.addEventListener("DOMContentLoaded", scheduleEnhancement);

  const observer = new MutationObserver(scheduleEnhancement);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("resize", scheduleEnhancement, {
    passive: true
  });
})();
