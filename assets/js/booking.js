(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  function browserDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const today = browserDate();
  const defaultSettings = {
    studioName: "ByAlee",
    city: "Luque",
    openingTime: "08:00",
    closingTime: "20:00",
    slotInterval: 30,
    workDays: [1,2,3,4,5,6],
    currency: "Gs.",
    primaryColor: "#8f5c70",
    appearance: "light",
    bookingEnabled: true,
    requireConsent: true,
    requirePoliciesAcceptance: true,
    bookingPoliciesVersion: "1.0",
    bookingPoliciesText: "La cita queda confirmada únicamente cuando ByAlee la acepta. Si necesitás cancelar o reagendar, avisá con la mayor anticipación posible.",
    defaultDeposit: 50000,
    allowDepositProof: true,
    requireDepositChoice: true
  };

  let settings = { ...defaultSettings };
  let services = [];
  let appointments = [];
  let availabilityBlocks = [];
  let selectedArea = "";
  let serviceId = null;
  let selectedTime = "";
  let step = 1;
  let detailsExpanded = false;
  let proofData = null;
  let saving = false;

  const areas = [
    { name: "Pestañas", icon: "eye" },
    { name: "Cejas", icon: "emoji-sunglasses" },
    { name: "Manos", icon: "hand-index-thumb" },
    { name: "Pies", icon: "flower2" }
  ];

  function formatMoney(value) {
    return `${settings.currency || "Gs."} ${new Intl.NumberFormat("es-PY").format(Number(value) || 0)}`;
  }

  function timeToMinutes(value) {
    const [hours, minutes] = String(value || "00:00").split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  function toTime(total) {
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function totalDuration(service) {
    return Number(service?.duration || 0) + Number(service?.prep || 0) + Number(service?.cleanup || 0);
  }

  function overlaps(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
  }

  function dayOfWeek(date) {
    return new Date(`${date}T12:00:00Z`).getUTCDay();
  }

  function applyAppearance() {
    const theme = settings.appearance === "system"
      ? (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light")
      : (settings.appearance || "light");
    document.documentElement.dataset.theme = theme;
    const base = settings.primaryColor || "#8f5c70";
    document.documentElement.style.setProperty("--primary", base);
    document.documentElement.style.setProperty("--primary-dark", base);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", base);
  }

  async function fetchPublicData(from = today, to = "") {
    const query = new URLSearchParams({ from });
    if (to) query.set("to", to);
    const response = await fetch(`/api/public-data?${query}`, { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo consultar la disponibilidad.");
    settings = { ...defaultSettings, ...(payload.settings || {}) };
    services = Array.isArray(payload.services) ? payload.services : [];
    appointments = Array.isArray(payload.appointments) ? payload.appointments : [];
    availabilityBlocks = Array.isArray(payload.availabilityBlocks) ? payload.availabilityBlocks : [];
    return payload;
  }

  function renderBrand() {
    const name = settings.studioName || "ByAlee";
    $("#studioCover").textContent = name;
    $("#studioEyebrow").textContent = name.toUpperCase();
    $("#studioCity").textContent = settings.city || "Luque";
    $("#studioHours").textContent = `${settings.openingTime || "08:00"} a ${settings.closingTime || "20:00"}`;
    $("#depositAmountLabel").textContent = formatMoney(settings.defaultDeposit || 0);
    $("#policyText").textContent = settings.bookingPoliciesText || defaultSettings.bookingPoliciesText;
  }

  function renderAreas() {
    const available = new Set(services.filter(service => service.active !== false).map(service => service.category || "Pestañas"));
    const visibleAreas = areas.filter(area => available.has(area.name));
    if (!visibleAreas.length) visibleAreas.push({ name: "Servicios", icon: "stars" });
    if (!selectedArea || !visibleAreas.some(area => area.name === selectedArea)) selectedArea = visibleAreas[0].name;
    $("#areaChoices").innerHTML = visibleAreas.map(area => `
      <button type="button" class="area-btn ${area.name === selectedArea ? "active" : ""}" data-area="${esc(area.name)}">
        <i class="bi bi-${area.icon}"></i><span>${esc(area.name)}</span>
      </button>`).join("");
    $$("[data-area]").forEach(button => button.onclick = () => {
      selectedArea = button.dataset.area;
      serviceId = null;
      selectedTime = "";
      renderAreas();
      renderServices();
      renderTimes();
    });
    renderAdditionalAreas(visibleAreas);
  }

  function renderAdditionalAreas(visibleAreas = areas) {
    $("#additionalAreas").innerHTML = visibleAreas
      .filter(area => area.name !== selectedArea)
      .map(area => `<label class="simple-option"><input type="checkbox" name="additionalArea" value="${esc(area.name)}"><span>${esc(area.name)}</span></label>`)
      .join("") || '<span class="field-help">Sin otras áreas disponibles.</span>';
  }

  function renderServices() {
    const filtered = services.filter(service => service.active !== false && (service.category || "Pestañas") === selectedArea);
    $("#serviceChoices").innerHTML = filtered.map(service => `
      <button type="button" class="choice ${Number(service.id) === Number(serviceId) ? "active" : ""}" data-service-id="${service.id}">
        <strong>${esc(service.name)}</strong>
        <small>${totalDuration(service)} min · ${formatMoney(service.price)}</small>
        ${service.description ? `<small>${esc(service.description)}</small>` : ""}
      </button>`).join("") || '<div class="step-help"><i class="bi bi-info-circle"></i><div><strong>Sin servicios activos</strong>ByAlee todavía no configuró servicios para esta categoría.</div></div>';
    $$("[data-service-id]").forEach(button => button.onclick = () => {
      serviceId = Number(button.dataset.serviceId);
      selectedTime = "";
      renderServices();
      renderTimes();
    });
  }

  function isBlocked(date, startMinute, endMinute) {
    return availabilityBlocks.some(block => {
      if (block.date !== date) return false;
      if (block.allDay) return true;
      const start = Number.isFinite(Number(block.startMinute)) ? Number(block.startMinute) : timeToMinutes(block.startTime);
      const end = Number.isFinite(Number(block.endMinute)) ? Number(block.endMinute) : timeToMinutes(block.endTime);
      return overlaps(startMinute, endMinute, start, end);
    });
  }

  function isOccupied(date, startMinute, endMinute) {
    return appointments.some(appointment => {
      if (appointment.date !== date || !["requested","pending","confirmed"].includes(appointment.status)) return false;
      const start = Number.isFinite(Number(appointment.startMinute)) ? Number(appointment.startMinute) : timeToMinutes(appointment.time);
      const service = services.find(item => Number(item.id) === Number(appointment.serviceId));
      const end = Number.isFinite(Number(appointment.endMinute)) ? Number(appointment.endMinute) : start + totalDuration(service);
      return overlaps(startMinute, endMinute, start, end);
    });
  }

  function renderTimes() {
    const target = $("#bookingTimes");
    const date = $("#bookingDate").value;
    const service = services.find(item => Number(item.id) === Number(serviceId));
    if (!date || !service) {
      target.innerHTML = '<div class="step-help"><i class="bi bi-arrow-left-circle"></i><div><strong>Primero elegí un servicio</strong>Luego aparecerán los horarios donde entra la duración completa.</div></div>';
      return;
    }
    const workDays = (settings.workDays || [1,2,3,4,5,6]).map(Number);
    if (!workDays.includes(dayOfWeek(date))) {
      target.innerHTML = '<div class="step-help"><i class="bi bi-calendar-x"></i><div><strong>Día no disponible</strong>Elegí otra fecha de atención.</div></div>';
      return;
    }
    const opening = timeToMinutes(settings.openingTime || "08:00");
    const closing = timeToMinutes(settings.closingTime || "20:00");
    const interval = Number(settings.slotInterval || 30);
    const duration = totalDuration(service);
    const times = [];
    for (let start = opening; start + duration <= closing; start += interval) {
      const end = start + duration;
      if (!isBlocked(date, start, end) && !isOccupied(date, start, end)) times.push(toTime(start));
    }
    target.innerHTML = times.length
      ? times.map(time => `<button type="button" class="time-btn ${time === selectedTime ? "active" : ""}" data-time="${time}">${time}</button>`).join("")
      : '<div class="step-help"><i class="bi bi-calendar2-x"></i><div><strong>Sin horarios libres</strong>Probá con otra fecha.</div></div>';
    $$("[data-time]").forEach(button => button.onclick = () => {
      selectedTime = button.dataset.time;
      renderTimes();
    });
  }

  function go(nextStep) {
    step = Math.max(1, Math.min(6, Number(nextStep)));
    $$(".step").forEach(section => section.classList.toggle("active", Number(section.dataset.step) === step));
    $$(".booking-steps span").forEach((bar, index) => bar.classList.toggle("active", index < step));
    $("#backBtn").style.visibility = step === 1 || step === 6 ? "hidden" : "visible";
    $("#nextBtn").style.display = step === 6 ? "none" : "inline-flex";
    $("#bookingFooter").style.display = step === 6 ? "none" : "flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (step === 2) renderTimes();
  }

  function setDetails(show) {
    detailsExpanded = Boolean(show);
    $("#detailsContent").hidden = !detailsExpanded;
    $("#toggleDetailsBtn").innerHTML = detailsExpanded
      ? '<i class="bi bi-eye-slash"></i>Ocultar detalles'
      : '<i class="bi bi-pencil-square"></i>Agregar detalles';
  }

  function selectedDeposit() {
    return $("[name='depositMethod']:checked")?.value || "whatsapp";
  }

  function updateDeposit() {
    $("#proofUploader").hidden = selectedDeposit() !== "proof";
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function compressProof(file) {
    const original = await fileToDataURL(file);
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = original;
    });
    const max = 1280;
    const ratio = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * ratio);
    canvas.height = Math.round(image.naturalHeight * ratio);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", .78);
  }

  async function refreshDateAvailability() {
    const date = $("#bookingDate").value;
    if (!date) return;
    try {
      const payload = await fetchPublicData(date, date);
      appointments = payload.appointments || [];
      availabilityBlocks = payload.availabilityBlocks || [];
      renderTimes();
    } catch (error) {
      console.error(error);
      renderTimes();
    }
  }

  async function complete() {
    if (saving) return;
    saving = true;
    $("#bookingCard").classList.add("saving-state");
    $("#nextBtn").textContent = "Enviando…";
    try {
      const additionalAreas = $$("[name='additionalArea']:checked").map(input => input.value);
      const payload = {
        selectedArea,
        serviceId,
        date: $("#bookingDate").value,
        time: selectedTime,
        name: $("#bookingName").value.trim(),
        phone: $("#bookingPhone").value.trim(),
        birthDate: $("#bookingBirthDate").value,
        birthdayConsent: $("#birthdayConsent").checked,
        email: $("#bookingEmail").value.trim(),
        instagram: $("#bookingInstagram").value.trim(),
        address: $("#bookingAddress").value.trim(),
        depositMethod: selectedDeposit(),
        proofData,
        detailsProvided: detailsExpanded,
        preferenceStyle: $("#preferenceStyle").value,
        firstTimeArea: $("#firstTimeArea").value,
        sensitivity: $("#sensitivity").value,
        additionalAreas,
        clientRequest: $("#clientRequest").value.trim(),
        notes: $("#bookingNotes").value.trim(),
        policiesAccepted: $("#policiesAccepted").checked,
        policiesVersion: settings.bookingPoliciesVersion || "1.0",
        consentAccepted: $("#consentAccepted").checked,
        signatureName: $("#signatureName").value.trim(),
        signatureDate: $("#signatureDate").value
      };

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo enviar la solicitud.");

      const service = services.find(item => Number(item.id) === Number(serviceId));
      $("#successTitle").textContent = "¡Solicitud enviada!";
      $("#confirmationText").textContent = `${payload.name}, tu cita todavía no está confirmada. ByAlee revisará el horario y te escribirá al WhatsApp ${payload.phone}.`;
      $("#successSummary").innerHTML = `
        <div><span>Área y servicio</span><strong>${esc(selectedArea)} · ${esc(service?.name || result.appointment?.service)}</strong></div>
        <div><span>Fecha y hora</span><strong>${esc(payload.date)} · ${esc(payload.time)}</strong></div>
        <div><span>Seña</span><strong>${payload.depositMethod === "proof" ? "Comprobante adjunto" : "Coordinada por WhatsApp"}</strong></div>
        <div><span>Estado</span><strong>Pendiente de confirmación</strong></div>`;
      go(6);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar la solicitud. Intentá nuevamente.");
      if (/ocup/.test(String(error.message).toLowerCase())) await refreshDateAvailability();
    } finally {
      saving = false;
      $("#bookingCard").classList.remove("saving-state");
      $("#nextBtn").innerHTML = 'Continuar<i class="bi bi-arrow-right"></i>';
    }
  }

  function validateCurrentStep() {
    if (step === 1 && !serviceId) return alert("Elegí un servicio."), false;
    if (step === 2 && !selectedTime) return alert("Elegí un horario disponible."), false;
    if (step === 3) {
      if (!$("#bookingName").value.trim()) return alert("Ingresá tu nombre y apellido."), false;
      if (!$("#bookingPhone").value.trim()) return alert("Ingresá tu WhatsApp."), false;
      if (settings.requireDepositChoice !== false && selectedDeposit() === "proof" && !proofData) return alert("Subí el comprobante o elegí la opción de WhatsApp."), false;
      $("#signatureName").value ||= $("#bookingName").value.trim();
    }
    if (step === 5) {
      if (settings.requirePoliciesAcceptance !== false && !$("#policiesAccepted").checked) return alert("Marcá la aceptación de las políticas del local."), false;
      if (settings.requireConsent !== false && !$("#consentAccepted").checked) return alert("Marcá la aceptación del consentimiento informado."), false;
      if (!$("#signatureName").value.trim()) return alert("Ingresá tu nombre como firma."), false;
    }
    return true;
  }

  function showConfigurationError(message) {
    $("#bookingCard").innerHTML = `
      <div class="booking-disabled">
        <i class="bi bi-cloud-slash"></i>
        <h2>La reserva online todavía no está configurada</h2>
        <p>${esc(message || "ByAlee está terminando de conectar la agenda.")}</p>
      </div>`;
  }

  async function init() {
    try {
      const platform = await window.ByAleePlatform.ready;
      if (!platform.configured) throw platform.error || new Error("Faltan las variables de Supabase.");
      await fetchPublicData(today);
      if (settings.bookingEnabled === false) {
        $("#bookingCard").innerHTML = '<div class="booking-disabled"><i class="bi bi-calendar-x"></i><h2>Reservas temporalmente pausadas</h2><p>Escribí a ByAlee por WhatsApp para consultar disponibilidad.</p></div>';
        return;
      }

      applyAppearance();
      renderBrand();
      renderAreas();
      renderServices();
      $("#bookingDate").min = today;
      $("#bookingDate").value = today;
      $("#signatureDate").value = today;
      $("#bookingDate").onchange = async () => {
        selectedTime = "";
        await refreshDateAvailability();
      };
      $("#toggleDetailsBtn").onclick = () => setDetails(!detailsExpanded);
      $$("[name='depositMethod']").forEach(input => input.onchange = updateDeposit);
      $("#depositProofInput").onchange = async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return alert("Seleccioná una imagen válida.");
        $("#depositProofPreview").innerHTML = '<i class="bi bi-hourglass-split"></i><span>Procesando…</span>';
        try {
          const dataUrl = await compressProof(file);
          if (dataUrl.length > 3_400_000) throw new Error("La imagen sigue siendo demasiado grande.");
          proofData = { name: file.name, size: file.size, type: file.type, dataUrl };
          $("#depositProofPreview").innerHTML = `<img src="${dataUrl}" alt="Comprobante">`;
        } catch (error) {
          proofData = null;
          $("#depositProofPreview").textContent = error.message || "No se pudo leer";
        }
      };
      $("#policiesAccepted").onchange = () => $("#policiesRequiredNote").style.display = $("#policiesAccepted").checked ? "none" : "flex";
      $("#consentAccepted").onchange = () => $("#consentRequiredNote").style.display = $("#consentAccepted").checked ? "none" : "flex";
      $("#nextBtn").onclick = async () => {
        if (!validateCurrentStep()) return;
        if (step === 5) return complete();
        go(step + 1);
      };
      $("#backBtn").onclick = () => go(step - 1);
      $("#newBookingBtn").onclick = () => location.href = "/reservar";
      if (settings.allowDepositProof === false) $("#proofMethodOption").hidden = true;
      if (settings.requirePoliciesAcceptance === false) {
        $("#policiesRequiredNote").style.display = "none";
        $("#policiesAccepted").checked = true;
      }
      if (settings.requireConsent === false) {
        $("#consentRequiredNote").style.display = "none";
        $("#consentAccepted").checked = true;
      }
      go(1);
    } catch (error) {
      console.error(error);
      showConfigurationError(error.message);
    }
  }

  init();
})();
