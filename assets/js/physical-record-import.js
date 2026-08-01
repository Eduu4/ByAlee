(() => {
  "use strict";

  const CONFIG = {
    maxImageSide: 1600,
    jpegQuality: 0.82
  };

  const STORAGE_KEYS = {
    clients: "lashflow_demo_clients",
    records: "lashflow_demo_records",
    visits: "lashflow_demo_visits"
  };

  const state = {
    imageDataUrl: "",
    imageName: "",
    analysis: null
  };

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const normalize = value =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const digits = value =>
    String(value ?? "").replace(/\D/g, "");

  const uid = () =>
    Date.now() * 1000 + Math.floor(Math.random() * 1000);

  const todayISO = () => {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  };

  const escapeHtml = value =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[character]
    );

  function getData() {
    const data = window.LASHFLOW_DATA;

    if (!data) {
      throw new Error(
        "Los datos de ByAlee todavía no están disponibles."
      );
    }

    data.clients = Array.isArray(data.clients)
      ? data.clients
      : [];

    data.records = Array.isArray(data.records)
      ? data.records
      : [];

    data.visits = Array.isArray(data.visits)
      ? data.visits
      : [];

    data.services = Array.isArray(data.services)
      ? data.services
      : [];

    return data;
  }

  function loadLocalArray(key) {
    try {
      const value = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function persistArrays(data, types) {
    types.forEach(type => {
      const key = STORAGE_KEYS[type];

      if (key) {
        localStorage.setItem(
          key,
          JSON.stringify(data[type] || [])
        );
      }
    });

    if (
      window.ByAleeDB?.isRemote?.() &&
      typeof window.ByAleeDB.scheduleSync === "function"
    ) {
      window.ByAleeDB.scheduleSync(types, data);
    }
  }

  function findClient(data, name, phone) {
    const phoneKey = digits(phone);

    if (phoneKey) {
      const byPhone = data.clients.find(
        client => digits(client.phone) === phoneKey
      );

      if (byPhone) {
        return byPhone;
      }
    }

    const nameKey = normalize(name);

    return data.clients.find(
      client => normalize(client.name) === nameKey
    ) || null;
  }

  function emptyRecord(clientId) {
    return {
      clientId: Number(clientId),
      updatedAt: "",
      medical: {
        canLieDown: true
      },
      preferences: {},
      anatomy: {},
      consent: {
        accepted: false,
        signedName: "",
        signedAt: "",
        version: "1.0"
      },
      design: {
        left: [8, 9, 10, 11, 10, 9],
        right: [9, 10, 11, 10, 9, 8]
      }
    };
  }

  function createClient(name, phone) {
    return {
      id: uid(),
      name: String(name || "").trim(),
      phone: String(phone || "").trim(),
      birthDate: "",
      address: "",
      email: "",
      instagram: "",
      firstTime: true,
      last: "Primera cita",
      favorite: "Sin definir",
      visits: 0,
      spent: 0,
      note: "Ficha migrada desde agenda física",
      formStatus: "pending"
    };
  }

  function injectInterface() {
    if ($("#physicalRecordImportRoot")) {
      return;
    }

    const root = document.createElement("div");
    root.id = "physicalRecordImportRoot";
    root.innerHTML = modalTemplate();
    document.body.appendChild(root);

    injectLauncher();
    bindEvents();
    populateServices();
    restorePendingOpen();
  }

  function injectLauncher() {
    if ($("#openPhysicalRecordImportBtn")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.id = "openPhysicalRecordImportBtn";
    button.className = "btn ghost-btn physical-import-launcher";
    button.innerHTML = `
      <i class="bi bi-file-earmark-image"></i>
      Migrar ficha
    `;

    const target =
      $(".topbar-actions") ||
      $(".header-actions") ||
      $(".page-actions") ||
      $("header");

    if (target) {
      target.appendChild(button);
    } else {
      button.classList.add("physical-import-launcher--floating");
      document.body.appendChild(button);
    }

    button.addEventListener("click", openModal);
  }

  function modalTemplate() {
    return `
      <div
        class="physical-import-overlay"
        id="physicalImportOverlay"
        aria-hidden="true"
      >
        <section
          class="physical-import-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="physicalImportTitle"
        >
          <header class="physical-import-header">
            <div>
              <span class="eyebrow">MIGRACIÓN ASISTIDA</span>
              <h2 id="physicalImportTitle">
                Pasar una ficha física a ByAlee
              </h2>
              <p>
                Colocá la foto al lado del formulario y transcribí únicamente los datos importantes.
              </p>
            </div>

            <button
              type="button"
              class="icon-btn"
              id="closePhysicalImportBtn"
              aria-label="Cerrar"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </header>

          <div class="physical-import-body">
            <aside class="physical-import-photo-column">
              <div
                class="physical-import-dropzone"
                id="physicalImportDropzone"
              >
                <img
                  id="physicalImportPreview"
                  alt="Vista previa de la ficha física"
                  hidden
                >

                <div id="physicalImportEmptyPreview">
                  <i class="bi bi-camera"></i>
                  <strong>Fotografiá la hoja completa</strong>
                  <span>
                    Intentá evitar sombras, reflejos y cortes.
                  </span>
                </div>
              </div>

              <div class="physical-import-photo-actions">
                <label class="btn primary-btn">
                  <i class="bi bi-camera"></i>
                  Usar cámara
                  <input
                    type="file"
                    id="physicalImportCamera"
                    accept="image/*"
                    capture="environment"
                    hidden
                  >
                </label>

                <label class="btn ghost-btn">
                  <i class="bi bi-images"></i>
                  Elegir foto
                  <input
                    type="file"
                    id="physicalImportGallery"
                    accept="image/*"
                    hidden
                  >
                </label>
              </div>

              <div
                class="physical-import-status"
                id="physicalImportStatus"
                hidden
              ></div>

              <div
                class="physical-import-warning-list"
                id="physicalImportWarnings"
                hidden
              ></div>
            </aside>

            <form
              class="physical-import-form"
              id="physicalImportForm"
            >
              <section class="physical-import-section">
                <div class="physical-import-section-heading">
                  <div>
                    <span class="eyebrow">CLIENTA</span>
                    <h3>Datos detectados</h3>
                  </div>

                  <span
                    class="badge"
                    id="physicalImportMatch"
                    hidden
                  ></span>
                </div>

                <div class="form-grid">
                  ${field("Nombre y apellido", "name", true)}
                  ${field("WhatsApp", "phone")}
                  ${field("Fecha de atención", "date", false, "date")}
                  ${field("Fecha de nacimiento", "birthDate", false, "date")}
                </div>

                <div class="physical-import-contact-channels">
                  <span>Medio anotado en la ficha</span>

                  <label>
                    <input
                      type="checkbox"
                      name="contactChannels"
                      value="WhatsApp"
                    >
                    WhatsApp
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="contactChannels"
                      value="Instagram"
                    >
                    Instagram
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="contactChannels"
                      value="TikTok"
                    >
                    TikTok
                  </label>
                </div>
              </section>

              <section class="physical-import-section">
                <span class="eyebrow">DISEÑO</span>
                <h3>Configuración técnica</h3>

                <div class="form-grid">
                  ${field("Técnica", "technique")}
                  ${field("Efecto", "effect")}
                  ${field("Diseño", "design")}
                  ${field("Rango de medidas", "lengthRange")}
                  ${field("Grosor", "thickness")}
                  ${field("Curvatura", "curvature")}
                  ${field("Volumen", "volume")}
                  ${serviceField()}
                </div>

                <label class="field full">
                  <span>Notas de la hoja</span>
                  <textarea
                    name="notes"
                    rows="3"
                    data-import-field="notes"
                  ></textarea>
                </label>
              </section>

              <section class="physical-import-section">
                <div class="physical-import-section-heading">
                  <div>
                    <span class="eyebrow">MAPEO</span>
                    <h3>Medidas por zona</h3>
                  </div>

                  <button
                    type="button"
                    class="text-btn"
                    id="copyPhysicalMapBtn"
                  >
                    Copiar e invertir
                  </button>
                </div>

                ${mapFields("leftMap", "Ojo izquierdo")}
                ${mapFields("rightMap", "Ojo derecho")}

                <p class="field-help">
                  Los valores poco claros pueden dejarse vacíos.
                  La fotografía original quedará disponible para
                  revisarla.
                </p>
              </section>

              <section class="physical-import-section">
                <span class="eyebrow">GUARDADO</span>
                <h3>Qué se va a crear</h3>

                <label class="physical-import-check">
                  <input
                    type="checkbox"
                    name="saveVisit"
                    checked
                  >
                  <span>
                    <strong>Guardar como visita histórica</strong>
                    <small>
                      Usa la fecha, servicio y diseño detectados.
                    </small>
                  </span>
                </label>

                <label class="physical-import-check">
                  <input
                    type="checkbox"
                    name="saveImage"
                    checked
                  >
                  <span>
                    <strong>Guardar la foto original</strong>
                    <small>
                      Se almacena como imagen privada de la clienta.
                    </small>
                  </span>
                </label>
              </section>

              <footer class="physical-import-footer">
                <button
                  type="button"
                  class="btn ghost-btn"
                  id="cancelPhysicalImportBtn"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  class="btn primary-btn"
                  id="savePhysicalImportBtn"
                >
                  <i class="bi bi-check2-circle"></i>
                  Guardar ficha revisada
                </button>
              </footer>
            </form>
          </div>
        </section>
      </div>
    `;
  }

  function field(
    label,
    name,
    required = false,
    type = "text"
  ) {
    return `
      <label class="field" data-import-container="${name}">
        <span>
          ${escapeHtml(label)}
          ${required ? '<b class="required-mark">*</b>' : ""}
        </span>

        <input
          type="${escapeHtml(type)}"
          name="${escapeHtml(name)}"
          data-import-field="${escapeHtml(name)}"
          ${required ? "required" : ""}
        >

        <small
          class="physical-import-field-warning"
          data-warning-for="${escapeHtml(name)}"
          hidden
        >
          <i class="bi bi-exclamation-triangle"></i>
          Revisar este dato
        </small>
      </label>
    `;
  }

  function serviceField() {
    return `
      <label class="field">
        <span>Servicio para el historial</span>
        <select
          name="serviceId"
          id="physicalImportService"
        ></select>
      </label>
    `;
  }

  function mapFields(name, title) {
    return `
      <div class="physical-import-map">
        <strong>${escapeHtml(title)}</strong>

        <div class="physical-import-map-grid">
          ${Array.from(
            { length: 6 },
            (_, index) => `
              <label>
                <span>${index + 1}</span>
                <input
                  type="number"
                  min="5"
                  max="20"
                  step="1"
                  name="${name}_${index}"
                  data-import-field="${name}"
                  inputmode="numeric"
                >
              </label>
            `
          ).join("")}
        </div>
      </div>
    `;
  }

  function bindEvents() {
    $("#closePhysicalImportBtn")
      ?.addEventListener("click", closeModal);

    $("#cancelPhysicalImportBtn")
      ?.addEventListener("click", closeModal);

    $("#physicalImportOverlay")
      ?.addEventListener("click", event => {
        if (event.target.id === "physicalImportOverlay") {
          closeModal();
        }
      });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        $("#physicalImportOverlay")?.classList.contains("open")
      ) {
        closeModal();
      }
    });

    $("#physicalImportCamera")
      ?.addEventListener("change", handleImageSelection);

    $("#physicalImportGallery")
      ?.addEventListener("change", handleImageSelection);

    $("#copyPhysicalMapBtn")
      ?.addEventListener("click", copyMap);

    $("#physicalImportForm")
      ?.addEventListener("submit", saveMigration);

    ["name", "phone"].forEach(name => {
      $(`[name="${name}"]`)
        ?.addEventListener("input", updateClientMatch);
    });
  }

  function openModal() {
    const overlay = $("#physicalImportOverlay");

    if (!overlay) {
      return;
    }

    resetForm();
    populateServices();

    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("physical-import-open");
  }

  function closeModal() {
    const overlay = $("#physicalImportOverlay");

    if (!overlay) {
      return;
    }

    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("physical-import-open");
  }

  function resetForm() {
    const form = $("#physicalImportForm");

    form?.reset();

    state.imageDataUrl = "";
    state.imageName = "";
    state.analysis = null;

    const preview = $("#physicalImportPreview");
    const empty = $("#physicalImportEmptyPreview");
    const status = $("#physicalImportStatus");
    const warnings = $("#physicalImportWarnings");
    const match = $("#physicalImportMatch");

    if (preview) {
      preview.hidden = true;
      preview.removeAttribute("src");
    }

    if (empty) {
      empty.hidden = false;
    }

    if (status) {
      status.hidden = true;
      status.className = "physical-import-status";
      status.textContent = "";
    }

    if (warnings) {
      warnings.hidden = true;
      warnings.innerHTML = "";
    }

    if (match) {
      match.hidden = true;
      match.textContent = "";
    }

    clearFieldWarnings();

    const dateInput = form?.elements.date;

    if (dateInput) {
      dateInput.value = todayISO();
    }
  }

  function populateServices() {
    const select = $("#physicalImportService");

    if (!select) {
      return;
    }

    let services = [];

    try {
      services = getData().services;
    } catch {
      services = [];
    }

    const activeServices = services.filter(
      service => service.active !== false
    );

    select.innerHTML = activeServices.length
      ? activeServices.map(service => `
          <option value="${Number(service.id)}">
            ${escapeHtml(service.name)}
          </option>
        `).join("")
      : '<option value="">Sin servicios disponibles</option>';

    const lashesService = activeServices.find(
      service =>
        normalize(service.category).includes("pestana") ||
        normalize(service.name).includes("pestana") ||
        normalize(service.name).includes("clasica")
    );

    if (lashesService) {
      select.value = String(lashesService.id);
    }
  }

  async function handleImageSelection(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showStatus(
        "Seleccioná una fotografía válida.",
        "error"
      );
      return;
    }

    try {
      showStatus("Preparando fotografía…", "loading");

      state.imageDataUrl = await compressImage(file);
      state.imageName = file.name || "ficha-fisica.jpg";

      const preview = $("#physicalImportPreview");
      const empty = $("#physicalImportEmptyPreview");
  
      preview.src = state.imageDataUrl;
      preview.hidden = false;
      empty.hidden = true;

      showStatus(
        "Fotografía lista. Completá el formulario mirando la imagen.",
        "success"
      );
    } catch (error) {
      console.error(error);

      showStatus(
        error.message ||
        "No se pudo preparar la fotografía.",
        "error"
      );
    } finally {
      event.target.value = "";
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(
        reader.error ||
        new Error("No se pudo leer la imagen.")
      );

      reader.readAsDataURL(file);
    });
  }

  async function compressImage(file) {
    const original = await fileToDataUrl(file);

    const image = await new Promise((resolve, reject) => {
      const element = new Image();

      element.onload = () => resolve(element);
      element.onerror = () => reject(
        new Error("No se pudo abrir la imagen.")
      );
      element.src = original;
    });

    const ratio = Math.min(
      1,
      CONFIG.maxImageSide /
      Math.max(image.naturalWidth, image.naturalHeight)
    );

    const canvas = document.createElement("canvas");

    canvas.width = Math.max(
      1,
      Math.round(image.naturalWidth * ratio)
    );

    canvas.height = Math.max(
      1,
      Math.round(image.naturalHeight * ratio)
    );

    const context = canvas.getContext("2d", {
      alpha: false
    });

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL(
      "image/jpeg",
      CONFIG.jpegQuality
    );
  }

  function fillForm(data = {}) {
    const form = $("#physicalImportForm");

    if (!form) {
      return;
    }

    const values = {
      name: data.name,
      phone: data.phone,
      date: data.date,
      birthDate: data.birthDate,
      technique: data.technique,
      effect: data.effect,
      design: data.design,
      lengthRange: data.lengthRange,
      thickness: data.thickness,
      curvature: data.curvature,
      volume: data.volume,
      notes: data.notes
    };

    Object.entries(values).forEach(([name, value]) => {
      if (
        form.elements[name] &&
        String(value ?? "").trim()
      ) {
        form.elements[name].value = value;
      }
    });

    $$('[name="contactChannels"]', form)
      .forEach(input => {
        input.checked = Array.isArray(data.contactChannels) &&
          data.contactChannels.includes(input.value);
      });

    setMapValues(
      form,
      "leftMap",
      data.leftMap
    );

    setMapValues(
      form,
      "rightMap",
      data.rightMap
    );

    markUncertainFields(
      data.uncertainFields || []
    );

    updateClientMatch();
  }

  function setMapValues(form, name, values) {
    const safeValues = Array.isArray(values)
      ? values
      : [];

    for (let index = 0; index < 6; index += 1) {
      const input = form.elements[`${name}_${index}`];
      const value = Number(safeValues[index] || 0);

      if (input) {
        input.value = value >= 5 && value <= 20
          ? String(value)
          : "";
      }
    }
  }

  function clearFieldWarnings() {
    $$(".physical-import-field-warning")
      .forEach(warning => {
        warning.hidden = true;
      });

    $$("[data-import-container]")
      .forEach(container => {
        container.classList.remove(
          "physical-import-needs-review"
        );
      });
  }

  function markUncertainFields(fields) {
    clearFieldWarnings();

    const safeFields = Array.isArray(fields)
      ? fields
      : [];

    safeFields.forEach(fieldName => {
      const warning = $(
        `[data-warning-for="${CSS.escape(fieldName)}"]`
      );

      const container = $(
        `[data-import-container="${CSS.escape(fieldName)}"]`
      );

      if (warning) {
        warning.hidden = false;
      }

      if (container) {
        container.classList.add(
          "physical-import-needs-review"
        );
      }
    });

    const warnings = $("#physicalImportWarnings");

    if (!safeFields.length) {
      warnings.hidden = true;
      warnings.innerHTML = "";
      return;
    }

    warnings.hidden = false;
    warnings.innerHTML = `
      <strong>
        <i class="bi bi-exclamation-triangle"></i>
        Revisar antes de guardar
      </strong>
      <p>${escapeHtml(safeFields.join(", "))}</p>
    `;
  }

  function updateClientMatch() {
    const form = $("#physicalImportForm");
    const match = $("#physicalImportMatch");

    if (!form || !match) {
      return;
    }

    try {
      const data = getData();

      const client = findClient(
        data,
        form.elements.name.value,
        form.elements.phone.value
      );

      if (client) {
        match.hidden = false;
        match.className = "badge status-complete";
        match.textContent = "Se actualizará una clienta existente";
      } else if (form.elements.name.value.trim()) {
        match.hidden = false;
        match.className = "badge";
        match.textContent = "Se creará una clienta nueva";
      } else {
        match.hidden = true;
        match.textContent = "";
      }
    } catch {
      match.hidden = true;
    }
  }

  function copyMap() {
    const form = $("#physicalImportForm");

    if (!form) {
      return;
    }

    for (let index = 0; index < 6; index += 1) {
      const source = form.elements[`leftMap_${index}`];
      const target = form.elements[`rightMap_${5 - index}`];

      if (source && target) {
        target.value = source.value;
      }
    }
  }

  function readMap(form, name) {
    return Array.from(
      { length: 6 },
      (_, index) => {
        const value = Number(
          form.elements[`${name}_${index}`]?.value || 0
        );

        return value >= 5 && value <= 20
          ? value
          : 0;
      }
    );
  }

  function mergeNote(currentNote, importedNote) {
    const current = String(currentNote || "").trim();
    const imported = String(importedNote || "").trim();

    if (!imported) {
      return current;
    }

    if (!current) {
      return imported;
    }

    if (normalize(current).includes(normalize(imported))) {
      return current;
    }

    return `${current}\n\nFicha física: ${imported}`;
  }

  async function saveMigration(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const saveButton = $("#savePhysicalImportBtn");

    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const visitDate =
      form.elements.date.value || todayISO();

    if (!name) {
      alert("Ingresá el nombre de la clienta.");
      form.elements.name.focus();
      return;
    }

    try {
      saveButton.disabled = true;
      saveButton.innerHTML = `
        <i class="bi bi-hourglass-split"></i>
        Guardando…
      `;

      const data = getData();

      let client = findClient(
        data,
        name,
        phone
      );

      if (!client) {
        client = createClient(name, phone);
        data.clients.push(client);
      } else {
        client.name = name || client.name;

        if (phone) {
          client.phone = phone;
        }
      }

      if (form.elements.birthDate.value) {
        client.birthDate =
          form.elements.birthDate.value;
      }

      const importedNotes =
        form.elements.notes.value.trim();

      client.note = mergeNote(
        client.note,
        importedNotes
      );

      let record = data.records.find(
        item => Number(item.clientId) === Number(client.id)
      );

      if (!record) {
        record = emptyRecord(client.id);
        data.records.push(record);
      }

      const leftMap = readMap(form, "leftMap");
      const rightMap = readMap(form, "rightMap");

      const hasLeftMap = leftMap.some(Boolean);
      const hasRightMap = rightMap.some(Boolean);

      record.design = {
        ...(record.design || {}),
        technique:
          form.elements.technique.value.trim(),
        effect:
          form.elements.effect.value.trim(),
        design:
          form.elements.design.value.trim(),
        thickness:
          form.elements.thickness.value.trim(),
        curvature:
          form.elements.curvature.value.trim(),
        volume:
          form.elements.volume.value.trim(),
        range:
          form.elements.lengthRange.value.trim(),
        notes: mergeNote(
          record.design?.notes,
          importedNotes
        ),
        left: hasLeftMap
          ? leftMap
          : (
              record.design?.left ||
              [8, 9, 10, 11, 10, 9]
            ),
        right: hasRightMap
          ? rightMap
          : (
              record.design?.right ||
              [9, 10, 11, 10, 9, 8]
            )
      };

      record.updatedAt = visitDate;

      record.migration = {
        source: "physical_record_manual",
        importedAt: new Date().toISOString(),
        sourceDate: visitDate,
        uncertainFields:
          state.analysis?.uncertainFields || [],
        confidence:
          Number(state.analysis?.overallConfidence || 0)
      };

      let visitId = null;

      if (
        form.elements.saveVisit.checked &&
        form.elements.serviceId.value
      ) {
        const serviceId = Number(
          form.elements.serviceId.value
        );

        const service = data.services.find(
          item => Number(item.id) === serviceId
        );

        visitId = uid();

        data.visits.push({
          id: visitId,
          clientId: Number(client.id),
          date: visitDate,
          serviceId,
          professional:
            data.settings?.userName || "ByAlee",
          source: "Migración manual de ficha física",
          price: Number(service?.price || 0),
          design: [
            form.elements.effect.value.trim(),
            form.elements.design.value.trim()
          ].filter(Boolean).join(" · "),
          range:
            form.elements.lengthRange.value.trim(),
          curvature:
            form.elements.curvature.value.trim(),
          notes: importedNotes
        });

        const clientVisits = data.visits
          .filter(
            visit =>
              Number(visit.clientId) === Number(client.id)
          )
          .sort(
            (first, second) =>
              String(second.date).localeCompare(
                String(first.date)
              )
          );

        client.visits = clientVisits.length;
        client.spent = clientVisits.reduce(
          (total, visit) =>
            total + Number(visit.price || 0),
          0
        );

        client.last = clientVisits[0]?.date
          ? new Date(
              `${clientVisits[0].date}T12:00:00`
            ).toLocaleDateString("es-PY")
          : client.last;

        if (service?.name) {
          client.favorite = service.name;
        }
      }

      let imageId = null;

      if (
        form.elements.saveImage.checked &&
        state.imageDataUrl
      ) {
        imageId = uid();

        await savePrivateImage({
          id: imageId,
          clientId: Number(client.id),
          visitId,
          type: "Ficha física migrada",
          date: visitDate,
          note: "Imagen original de la ficha física migrada",
          portfolio: false,
          name:
            state.imageName ||
            `ficha-fisica-${visitDate}.jpg`,
          size: Math.round(
            state.imageDataUrl.length * 0.75
          ),
          createdAt: new Date().toISOString(),
          dataUrl: state.imageDataUrl
        });

        record.migration.sourceImageId = imageId;
      }

      persistArrays(
        data,
        ["clients", "records", "visits"]
      );

      showAppToast(
        client
          ? "Ficha física migrada correctamente"
          : "Ficha guardada"
      );

      closeModal();

      setTimeout(() => {
        if (
          typeof window.openClientRecord === "function"
        ) {
          window.openClientRecord(client.id);
        }
      }, 180);
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
        "No se pudo guardar la ficha migrada."
      );
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = `
        <i class="bi bi-check2-circle"></i>
        Guardar ficha revisada
      `;
    }
  }

  async function savePrivateImage(record) {
    if (
      window.ByAleeDB?.isRemote?.() &&
      typeof window.ByAleeDB.mediaPut === "function"
    ) {
      await window.byAleeAuthReady;
      return window.ByAleeDB.mediaPut(
        record,
        "client_photo"
      );
    }

    return saveImageLocally(record);
  }

  function openImageDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(
          new Error(
            "Este navegador no permite guardar la fotografía."
          )
        );
        return;
      }

      const request = indexedDB.open(
        "lashflow_images_db",
        2
      );

      request.onupgradeneeded = () => {
        const database = request.result;

        if (
          !database.objectStoreNames.contains("images")
        ) {
          const store = database.createObjectStore(
            "images",
            {
              keyPath: "id"
            }
          );

          store.createIndex(
            "clientId",
            "clientId",
            {
              unique: false
            }
          );
        }
      };

      request.onsuccess = () =>
        resolve(request.result);

      request.onerror = () =>
        reject(
          request.error ||
          new Error(
            "No se pudo abrir el almacenamiento local."
          )
        );
    });
  }

  async function saveImageLocally(record) {
    const database = await openImageDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        "images",
        "readwrite"
      );

      transaction
        .objectStore("images")
        .put(record);

      transaction.oncomplete = () => {
        database.close();
        resolve(record);
      };

      transaction.onerror = () => {
        database.close();
        reject(
          transaction.error ||
          new Error(
            "No se pudo guardar la fotografía."
          )
        );
      };
    });
  }

  function showStatus(message, type = "loading") {
    const status = $("#physicalImportStatus");

    if (!status) {
      return;
    }

    status.hidden = false;
    status.className =
      `physical-import-status is-${type}`;

    status.innerHTML = `
      <i class="bi ${
        type === "loading"
          ? "bi-hourglass-split"
          : type === "error"
            ? "bi-exclamation-circle"
            : "bi-check2-circle"
      }"></i>
      <span>${escapeHtml(message)}</span>
    `;
  }

  function showAppToast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }

    console.info(message);
  }

  function restorePendingOpen() {
    // Reservado para futuras mejoras sin servicios de pago.
  }

  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        injectInterface,
        {
          once: true
        }
      );

      return;
    }

    injectInterface();
  }

  window.openPhysicalRecordImport = openModal;

  boot();
})();
