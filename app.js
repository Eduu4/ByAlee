(() => {
  "use strict";

  const DATA = window.LASHFLOW_DATA;
  const KEYS = {
    appointments: "lashflow_demo_appointments",
    clients: "lashflow_demo_clients",
    records: "lashflow_demo_records",
    visits: "lashflow_demo_visits",
    services: "lashflow_demo_services",
    settings: "lashflow_demo_settings"
  };

  const DEFAULT_SETTINGS = {
    role: "admin",
    userName: "Camila Méndez",
    userEmail: "camila@lashflow.local",
    studioName: "Camila Beauty Studio",
    studioPhone: "0981 000 000",
    city: "San Lorenzo",
    openingTime: "08:00",
    closingTime: "20:00",
    slotInterval: 30,
    maintenanceDays: 18,
    defaultDeposit: 50000,
    currency: "Gs.",
    primaryColor: "#8f5c70",
    appearance: "light",
    bookingEnabled: true,
    requireConsent: true,
    autoOpenConfirmationWhatsApp: false,
    allowOptionalBookingDetails: true,
    allowDepositProof: true,
    requireDepositChoice: true,
    confirmationMessageTemplate: "Hola {nombre} 😊 Tu cita de {servicio} fue confirmada para el {fecha} a las {hora}. Te esperamos en {estudio}.",
    workDays: [1, 2, 3, 4, 5, 6]
  };

  const loadArray = (key, fallback) => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(saved) ? saved : fallback;
    } catch {
      return fallback;
    }
  };

  const loadObject = (key, fallback) => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      return saved && typeof saved === "object" && !Array.isArray(saved) ? {...fallback, ...saved} : {...fallback};
    } catch {
      return {...fallback};
    }
  };

  DATA.appointments = loadArray(KEYS.appointments, DATA.appointments);
  DATA.clients = loadArray(KEYS.clients, DATA.clients);
  DATA.records = loadArray(KEYS.records, DATA.records);
  DATA.visits = loadArray(KEYS.visits, DATA.visits);
  DATA.services = loadArray(KEYS.services, DATA.services);
  DATA.settings = loadObject(KEYS.settings, DEFAULT_SETTINGS);

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const fmt = number => new Intl.NumberFormat("es-PY").format(Number(number) || 0);
  const money = number => `${DATA.settings.currency || "Gs."} ${fmt(number)}`;
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const minutes = time => {
    const [hours, mins] = String(time || "00:00").split(":").map(Number);
    return hours * 60 + mins;
  };
  const toTime = total => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  const initials = name => String(name || "CL").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const todayISO = DATA.today || new Date().toISOString().slice(0, 10);
  const addDays = (isoDate, amount) => {
    const date = new Date(`${isoDate}T12:00:00`);
    date.setDate(date.getDate() + Number(amount || 0));
    return date.toISOString().slice(0, 10);
  };
  const uid = () => Date.now() + Math.floor(Math.random() * 10000);

  const serviceById = id => DATA.services.find(service => service.id === Number(id)) || DATA.services[0] || {id:0,name:"Servicio eliminado",duration:0,prep:0,cleanup:0,price:0,color:"#8f5c70",active:false};
  const totalDuration = service => Number(service?.duration || 0) + Number(service?.prep || 0) + Number(service?.cleanup || 0);
  const clientById = id => DATA.clients.find(client => client.id === Number(id));
  const recordByClient = id => DATA.records.find(record => record.clientId === Number(id));
  const appointmentStatusLabel = status => ({confirmed:"Confirmada",requested:"Solicitud online",pending:"Pendiente",rejected:"Rechazada",completed:"Finalizada"}[status] || "Pendiente");
  const appointmentStatusClass = status => ({confirmed:"confirmed",requested:"requested",pending:"pending",rejected:"rejected",completed:"complete"}[status] || "pending");
  const depositStatusLabel = appointment => {
    if (appointment.depositStatus === "proof_uploaded") return "Comprobante adjunto";
    if (appointment.depositStatus === "confirmed_whatsapp") return "Seña confirmada por WhatsApp";
    if (Number(appointment.deposit || 0) > 0) return "Seña registrada";
    return "Seña pendiente";
  };
  const phoneDigits = phone => {
    let digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = `595${digits.slice(1)}`;
    return digits;
  };

  let selectedDate = todayISO;
  let activeFilter = "all";
  let agendaDateFilter = "";
  let agendaStatusFilter = "all";
  let currentRecordClientId = null;
  let editingAppointmentId = null;
  let editingVisitId = null;
  let sharedAppointmentsSnapshot = localStorage.getItem(KEYS.appointments) || JSON.stringify(DATA.appointments);

  const medicalLabels = {
    eyeSurgery: "Cirugía o láser en ojos/rostro",
    dryEyes: "Ojos secos",
    cosmeticProcedures: "Procedimientos cosméticos recientes",
    seasonalAllergies: "Alergias estacionales",
    alopecia: "Alopecia",
    trichotillomania: "Tricotilomanía",
    thyroid: "Alteraciones de tiroides",
    ironDeficiency: "Deficiencia de hierro",
    lowDefenses: "Defensas bajas",
    medications: "Uso de medicamentos",
    oilySkin: "Piel o cabello graso",
    frequentMakeup: "Maquillaje frecuente",
    facialCreams: "Cremas en el rostro",
    extremeStress: "Estrés intenso",
    eyeMedication: "Medicación para los ojos",
    productAllergy: "Alergia a producto o sustancia",
    contactLenses: "Usa lentes de contacto",
    glasses: "Usa anteojos",
    rubsEyes: "Suele frotarse los ojos",
    pregnant: "Embarazo o lactancia",
    canLieDown: "Puede permanecer acostada durante el servicio"
  };

  function persist(...types) {
    const requested = types.length ? types : Object.keys(KEYS);
    requested.forEach(type => {
      if (type === "settings") localStorage.setItem(KEYS.settings, JSON.stringify(DATA.settings));
      else if (KEYS[type]) {
        const serialized = JSON.stringify(DATA[type]);
        localStorage.setItem(KEYS[type], serialized);
        if (type === "appointments") sharedAppointmentsSnapshot = serialized;
      }
    });
  }

  function normalizeData() {
    DATA.services.forEach((service, index) => {
      service.id = Number(service.id || index + 1);
      service.duration = Number(service.duration || 60);
      service.prep = Number(service.prep || 0);
      service.cleanup = Number(service.cleanup || 0);
      service.price = Number(service.price || 0);
      if (typeof service.active !== "boolean") service.active = true;
      service.description ||= "";
      service.color ||= "#8f5c70";
    });
    DATA.clients.forEach((client, index) => {
      client.id = Number(client.id || index + 1);
      if (!client.formStatus) client.formStatus = recordByClient(client.id)?.consent?.accepted ? "complete" : "pending";
      client.visits = Number(client.visits || 0);
      client.spent = Number(client.spent || 0);
    });
    DATA.appointments.forEach(appointment => {
      if (!appointment.clientId) {
        const client = DATA.clients.find(item => normalize(item.name) === normalize(appointment.client));
        if (client) appointment.clientId = client.id;
      }
      const client = clientById(appointment.clientId);
      appointment.formStatus = client?.formStatus || appointment.formStatus || "pending";
      appointment.status ||= appointment.source === "Página web" ? "requested" : "pending";
    });
    if (!Array.isArray(DATA.settings.workDays)) DATA.settings.workDays = [1,2,3,4,5,6];
  }
  normalizeData();

  function dateLabel(isoDate, options = {day:"numeric", month:"short"}) {
    if (!isoDate) return "Sin fecha";
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString("es-PY", options);
  }

  function hexToRgb(hex) {
    const clean = String(hex || "#8f5c70").replace("#", "");
    const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean.padEnd(6, "0").slice(0, 6);
    return {r: parseInt(full.slice(0,2),16), g: parseInt(full.slice(2,4),16), b: parseInt(full.slice(4,6),16)};
  }

  function mixColor(hex, amount) {
    const {r,g,b} = hexToRgb(hex);
    const target = amount >= 0 ? 255 : 0;
    const ratio = Math.abs(amount);
    const mix = value => Math.round(value + (target - value) * ratio).toString(16).padStart(2,"0");
    return `#${mix(r)}${mix(g)}${mix(b)}`;
  }

  function applyAppearance() {
    const savedTheme = localStorage.getItem("lashflow_theme") || DATA.settings.appearance || "light";
    const theme = savedTheme === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : savedTheme;
    document.documentElement.dataset.theme = theme;
    const base = DATA.settings.primaryColor || "#8f5c70";
    const rgb = hexToRgb(base);
    if (theme === "dark") {
      document.documentElement.style.setProperty("--primary", mixColor(base, .28));
      document.documentElement.style.setProperty("--primary-dark", mixColor(base, .42));
      document.documentElement.style.setProperty("--primary-soft", `rgba(${rgb.r},${rgb.g},${rgb.b},.22)`);
    } else {
      document.documentElement.style.setProperty("--primary", base);
      document.documentElement.style.setProperty("--primary-dark", mixColor(base, -.18));
      document.documentElement.style.setProperty("--primary-soft", `rgba(${rgb.r},${rgb.g},${rgb.b},.16)`);
    }
    const themeIcon = $("#themeToggle i");
    if (themeIcon) themeIcon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
    const themeMeta = $('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = base;
  }

  function applyUserProfile() {
    const firstName = String(DATA.settings.userName || "Camila").split(" ")[0];
    const profileName = $(".profile-copy strong");
    const profileRole = $(".profile-copy span");
    const avatar = $(".sidebar-profile .avatar");
    const brandStudio = $(".brand span");
    const greeting = $("#dashboardView h1");
    if (profileName) profileName.textContent = DATA.settings.userName;
    if (profileRole) profileRole.textContent = DATA.settings.role === "admin" ? "Administradora" : "Profesional";
    if (avatar) avatar.textContent = initials(DATA.settings.userName);
    if (brandStudio) brandStudio.textContent = DATA.settings.studioName;
    if (greeting) greeting.innerHTML = `Buenos días, ${esc(firstName)} <span>✨</span>`;
    $$(".admin-only").forEach(element => element.hidden = DATA.settings.role !== "admin");
  }

  function getRiskFlags(record) {
    if (!record?.medical) return [];
    const keys = ["eyeSurgery", "dryEyes", "seasonalAllergies", "eyeMedication", "productAllergy", "contactLenses", "rubsEyes", "pregnant"];
    const flags = keys.filter(key => record.medical[key]).map(key => medicalLabels[key]);
    if (record.medical.canLieDown === false) flags.push("No puede permanecer acostada durante el servicio");
    return flags;
  }

  function clientInsights(clientId) {
    const client = clientById(clientId);
    const record = recordByClient(clientId);
    const visits = DATA.visits.filter(visit => visit.clientId === Number(clientId)).sort((a,b) => b.date.localeCompare(a.date));
    const appointments = DATA.appointments.filter(appointment => appointment.clientId === Number(clientId)).sort((a,b) => b.date.localeCompare(a.date) || minutes(b.time)-minutes(a.time));
    const counts = new Map();
    visits.forEach(visit => counts.set(Number(visit.serviceId), (counts.get(Number(visit.serviceId)) || 0) + 1));
    appointments.forEach(appointment => counts.set(Number(appointment.serviceId), (counts.get(Number(appointment.serviceId)) || 0) + .25));
    let usualServiceId = null;
    let best = -1;
    counts.forEach((count, id) => { if (count > best) { best = count; usualServiceId = id; } });
    if (!usualServiceId && client?.favorite) usualServiceId = DATA.services.find(service => normalize(service.name) === normalize(client.favorite))?.id || null;
    const lastVisit = visits[0] || null;
    const lastServiceId = lastVisit?.serviceId || appointments[0]?.serviceId || usualServiceId;
    const usualService = usualServiceId ? serviceById(usualServiceId) : null;
    const lastService = lastServiceId ? serviceById(lastServiceId) : null;
    const averagePrice = visits.length ? Math.round(visits.reduce((sum, visit) => sum + Number(visit.price || 0), 0) / visits.length) : 0;
    const maintenanceDate = lastVisit ? addDays(lastVisit.date, DATA.settings.maintenanceDays) : null;
    return {client, record, visits, appointments, usualService, lastService, lastVisit, averagePrice, maintenanceDate, risks:getRiskFlags(record)};
  }

  function selectedAppointments() {
    return DATA.appointments
      .filter(appointment => appointment.date === selectedDate && appointment.status !== "rejected" && (activeFilter === "all" || appointment.status === activeFilter))
      .sort((a, b) => minutes(a.time) - minutes(b.time));
  }

  function formStatusForAppointment(appointment) {
    const client = clientById(appointment.clientId);
    return client?.formStatus || appointment.formStatus || "pending";
  }

  function navigate(viewName) {
    const target = $(`.nav-link[data-view="${viewName}"]`);
    if (target) target.click();
  }

  function renderDashboard() {
    const all = DATA.appointments
      .filter(appointment => appointment.date === selectedDate && appointment.status !== "rejected")
      .sort((a, b) => minutes(a.time) - minutes(b.time));
    const shown = selectedAppointments();
    const requests = DATA.appointments
      .filter(appointment => appointment.status === "requested")
      .sort((a, b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time));
    const revenue = all.reduce((sum, appointment) => sum + Number(serviceById(appointment.serviceId).price || 0), 0);
    const occupied = all.reduce((sum, appointment) => sum + totalDuration(serviceById(appointment.serviceId)), 0);
    const workday = Math.max(0, minutes(DATA.settings.closingTime) - minutes(DATA.settings.openingTime));

    $("#statAppointments").textContent = all.length;
    $("#statConfirmed").textContent = `${all.filter(appointment => appointment.status === "confirmed").length} confirmadas`;
    $("#statRevenue").textContent = money(revenue);
    $("#statHours").textContent = `${(occupied / 60).toFixed(1)} h`;
    $("#statFree").textContent = `${Math.max(0, (workday - occupied) / 60).toFixed(1)} h disponibles`;
    const upcomingMaintenance = DATA.visits.filter(visit => {
      const due = addDays(visit.date, DATA.settings.maintenanceDays);
      return due >= todayISO && due <= addDays(todayISO, 7);
    }).length;
    $("#statMaintenance").textContent = upcomingMaintenance || DATA.maintenance.filter(item => item.date >= todayISO).length;
    const dayRequests = all.filter(a => a.status === "requested").length;
    const dayPending = all.filter(a => a.status === "pending").length;
    $("#summaryText").textContent = all.length
      ? `Tienes ${all.length} citas, ${dayRequests} solicitud(es) online, ${dayPending} pendiente(s) y ${all.filter(a => formStatusForAppointment(a) !== "complete").length} ficha(s) por completar.`
      : requests.length
        ? `No hay citas cargadas para este día, pero tienes ${requests.length} solicitud(es) online por revisar.`
        : "No tienes citas programadas para este día.";

    const dateObj = new Date(`${selectedDate}T12:00:00`);
    $("#selectedDateLabel").textContent = selectedDate === todayISO ? "Hoy" : dateObj.toLocaleDateString("es-PY", {weekday:"short", day:"numeric", month:"short"});
    $("#todayLabel").textContent = dateObj.toLocaleDateString("es-PY", {weekday:"long", day:"numeric", month:"long"}).toUpperCase();

    const requestPanel = $("#bookingRequestsPanel");
    const requestList = $("#bookingRequestList");
    const requestCount = $("#bookingRequestCount");
    if (requestPanel && requestList && requestCount) {
      requestCount.textContent = requests.length;
      requestList.innerHTML = requests.length ? requests.map(appointment => {
        const service = serviceById(appointment.serviceId);
        const client = clientById(appointment.clientId);
        const formStatus = formStatusForAppointment(appointment);
        const isPast = appointment.date < todayISO;
        return `<article class="booking-request-card" id="request-${appointment.id}">
          <div class="request-main">
            <div class="client-avatar">${initials(appointment.client)}</div>
            <div class="request-copy">
              <div class="meta-row">
                <span class="badge status-requested"><i class="bi bi-globe2"></i> Solicitud online</span>
                ${isPast ? '<span class="badge status-rejected">Fecha vencida</span>' : ""}
                <span class="badge ${formStatus === "complete" ? "status-complete" : "status-incomplete"}">${formStatus === "complete" ? "Ficha lista" : "Ficha pendiente"}</span>
                <span class="badge ${appointment.depositStatus === "proof_uploaded" || appointment.depositStatus === "confirmed_whatsapp" ? "status-complete" : "status-incomplete"}"><i class="bi bi-cash-coin"></i> ${esc(depositStatusLabel(appointment))}</span>
              </div>
              <h3>${esc(appointment.client)} · ${esc(service.name)}</h3>
              <p>${dateLabel(appointment.date,{weekday:"long",day:"numeric",month:"long"})} a las ${esc(appointment.time)} · ${esc(appointment.phone || client?.phone || "Sin WhatsApp")}${appointment.notes ? ` · ${esc(appointment.notes)}` : ""}</p>
            </div>
          </div>
          <div class="request-actions">
            <button class="btn primary-btn" onclick="window.confirmAppointment(${Number(appointment.id)})"><i class="bi bi-check2"></i>${DATA.settings.autoOpenConfirmationWhatsApp ? "Confirmar + WhatsApp" : "Confirmar"}</button>
            <button class="btn ghost-btn" onclick="window.editAppointment(${Number(appointment.id)})"><i class="bi bi-pencil"></i>Editar</button>
            ${appointment.depositProofId ? `<button class="btn ghost-btn" onclick="window.openDepositProof(${Number(appointment.id)})"><i class="bi bi-image"></i>Comprobante</button>` : ""}
            <button class="icon-btn" title="Abrir ficha" onclick="window.openClientRecord(${Number(appointment.clientId)})"><i class="bi bi-clipboard2-heart"></i></button>
            <button class="icon-btn" title="Rechazar solicitud" onclick="window.rejectAppointment(${Number(appointment.id)})"><i class="bi bi-x-lg"></i></button>
          </div>
        </article>`;
      }).join("") : `<div class="empty-state compact-empty"><i class="bi bi-check2-circle"></i><strong>No hay solicitudes por revisar</strong><p>Las nuevas reservas enviadas desde el enlace público aparecerán aquí.</p></div>`;
    }

    const notification = $("#notificationBtn");
    const notificationDot = $("#notificationDot");
    if (notification && notificationDot) {
      notification.classList.toggle("has-requests", requests.length > 0);
      notificationDot.textContent = requests.length ? String(Math.min(requests.length, 99)) : "";
      notificationDot.hidden = requests.length === 0;
      notification.title = requests.length ? `${requests.length} solicitud(es) de cita` : "Sin solicitudes nuevas";
    }
    document.title = requests.length ? `(${requests.length}) LashFlow — Solicitudes pendientes` : "LashFlow — Mi jornada";
    const popoverList = $("#notificationPopoverList");
    if (popoverList) {
      popoverList.innerHTML = requests.length ? requests.slice(0, 8).map(appointment => {
        const service = serviceById(appointment.serviceId);
        return `<article class="notification-mini-item"><span class="notification-mini-icon"><i class="bi bi-calendar-plus"></i></span><div><strong>${esc(appointment.client)}</strong><small>${esc(service.name)} · ${dateLabel(appointment.date,{day:"2-digit",month:"short"})} ${esc(appointment.time)} · ${esc(depositStatusLabel(appointment))}</small></div><button class="icon-btn" title="Revisar" onclick="window.focusBookingRequest(${Number(appointment.id)})"><i class="bi bi-chevron-right"></i></button></article>`;
      }).join("") : `<div class="search-empty"><i class="bi bi-check2-circle"></i><strong>Todo al día</strong><span>No hay solicitudes pendientes.</span></div>`;
    }

    $("#timeline").innerHTML = shown.length ? shown.map(appointment => {
      const service = serviceById(appointment.serviceId);
      const end = toTime(minutes(appointment.time) + totalDuration(service));
      const formStatus = formStatusForAppointment(appointment);
      const insight = clientInsights(appointment.clientId);
      return `<div class="timeline-item" id="appointment-${appointment.id}" data-search="${esc(normalize(`${appointment.client} ${service.name} ${appointment.source} ${appointment.notes}`))}">
        <div class="timeline-time">${esc(appointment.time)}</div>
        <div class="timeline-axis"><span class="timeline-dot"></span></div>
        <article class="appointment-card" style="--appt-color:${esc(service.color)}">
          <div class="appointment-main">
            <div class="client-avatar">${initials(appointment.client)}</div>
            <div>
              <h3>${esc(appointment.client)}</h3>
              <p>${esc(service.name)} · ${esc(appointment.time)} a ${end} · bloque total ${totalDuration(service)} min</p>
              <div class="meta-row">
                <span class="badge status-${appointmentStatusClass(appointment.status)}">${appointmentStatusLabel(appointment.status)}</span>
                <span class="badge"><i class="bi bi-${appointment.source === "WhatsApp" ? "whatsapp" : "globe2"}"></i> ${esc(appointment.source)}</span>
                <span class="badge">Seña: ${money(appointment.deposit)}</span>
                <span class="badge ${formStatus === "complete" ? "status-complete" : "status-incomplete"}"><i class="bi bi-clipboard2-${formStatus === "complete" ? "check" : "pulse"}"></i> ${formStatus === "complete" ? "Ficha lista" : "Falta ficha"}</span>
                ${appointment.confirmationMessageOpenedAt ? '<span class="badge status-complete message-status"><i class="bi bi-whatsapp"></i> Mensaje preparado</span>' : ""}
                ${insight.record?.design?.effect ? `<span class="badge"><i class="bi bi-eye"></i> Habitual: ${esc(insight.record.design.effect)}</span>` : ""}
                ${appointment.notes ? `<span class="badge"><i class="bi bi-sticky"></i> ${esc(appointment.notes)}</span>` : ""}
              </div>
            </div>
          </div>
          <div class="appointment-actions">
            <button class="icon-btn" title="Editar cita" onclick="window.editAppointment(${Number(appointment.id)})"><i class="bi bi-pencil"></i></button>
            <button class="icon-btn" title="Abrir ficha" onclick="window.openClientRecord(${Number(appointment.clientId)})"><i class="bi bi-clipboard2-heart"></i></button>
            <button class="icon-btn" title="WhatsApp" onclick="window.openWhatsApp(${Number(appointment.clientId)})"><i class="bi bi-whatsapp"></i></button>
            ${appointment.status !== "confirmed" ? `<button class="icon-btn" title="Confirmar" onclick="window.confirmAppointment(${Number(appointment.id)})"><i class="bi bi-check2"></i></button>` : `<button class="icon-btn" title="Enviar confirmación por WhatsApp" onclick="window.openConfirmationWhatsApp(${Number(appointment.id)})"><i class="bi bi-send-check"></i></button>`}
            <button class="icon-btn" title="Eliminar" onclick="window.deleteAppointment(${Number(appointment.id)})"><i class="bi bi-trash3"></i></button>
          </div>
        </article>
      </div>`;
    }).join("") : `<div class="empty-state"><i class="bi bi-calendar2-heart"></i><strong>Agenda libre</strong><p>No hay citas para este filtro.</p></div>`;

    const next = all.find(appointment => appointment.status !== "completed") || all[0];
    $("#nextAppointment").innerHTML = next ? (() => {
      const service = serviceById(next.serviceId);
      const complete = formStatusForAppointment(next) === "complete";
      return `<div class="next-card">
        <span class="muted">${appointmentStatusLabel(next.status).toUpperCase()}</span>
        <div class="next-time">${esc(next.time)}</div>
        <h3>${esc(next.client)}</h3>
        <div class="muted">${esc(service.name)} · ${service.duration} min · ${complete ? "ficha completa" : "ficha pendiente"}</div>
        <div class="next-actions">
          <button class="light" onclick="window.openClientRecord(${Number(next.clientId)})">Ver ficha</button>
          <button class="soft" onclick="window.openWhatsApp(${Number(next.clientId)})">WhatsApp</button>
        </div>
      </div>`;
    })() : `<div class="empty-state"><i class="bi bi-check2-circle"></i>Sin citas</div>`;

    const lowStock = DATA.inventory.filter(item => item.stock <= item.min);
    $("#stockAlerts").innerHTML = lowStock.map(item => `<div class="mini-item">
      <div class="mini-icon"><i class="bi bi-exclamation-triangle"></i></div>
      <div><strong>${esc(item.name)}</strong><span>${item.stock} ${esc(item.unit)} · mínimo ${item.min}</span></div>
    </div>`).join("") || `<span class="muted">Sin alertas</span>`;

    const sources = {};
    all.forEach(appointment => sources[appointment.source] = (sources[appointment.source] || 0) + 1);
    $("#sourceSummary").innerHTML = Object.entries(sources).map(([name, count]) => {
      const percentage = Math.round(count / all.length * 100);
      return `<div class="source-row"><span>${esc(name)}</span><div class="source-bar"><span style="width:${percentage}%"></span></div><strong>${percentage}%</strong></div>`;
    }).join("") || `<span class="muted">Sin datos</span>`;
  }

  function renderAgenda() {
    const visibleAppointments = DATA.appointments
      .filter(appointment => !agendaDateFilter || appointment.date === agendaDateFilter)
      .filter(appointment => agendaStatusFilter === "all" || appointment.status === agendaStatusFilter)
      .sort((a, b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time));

    const rows = visibleAppointments.map(appointment => {
      const service = serviceById(appointment.serviceId);
      const formStatus = formStatusForAppointment(appointment);
      const statusActions = appointment.status === "requested"
        ? `<button class="icon-btn" title="Confirmar solicitud" onclick="window.confirmAppointment(${Number(appointment.id)})"><i class="bi bi-check2"></i></button><button class="icon-btn" title="Rechazar solicitud" onclick="window.rejectAppointment(${Number(appointment.id)})"><i class="bi bi-x-lg"></i></button>`
        : appointment.status === "confirmed"
          ? `<button class="icon-btn" title="Enviar confirmación por WhatsApp" onclick="window.openConfirmationWhatsApp(${Number(appointment.id)})"><i class="bi bi-send-check"></i></button>`
          : appointment.status !== "rejected"
            ? `<button class="icon-btn" title="Confirmar cita" onclick="window.confirmAppointment(${Number(appointment.id)})"><i class="bi bi-check2"></i></button>`
            : "";
      const proofAction = appointment.depositProofId
        ? `<button class="deposit-proof-link" onclick="window.openDepositProof(${Number(appointment.id)})"><i class="bi bi-image"></i>Ver comprobante</button>`
        : "";
      return `<tr data-search="${esc(normalize(`${appointment.client} ${service.name} ${appointment.source} ${appointment.date} ${appointmentStatusLabel(appointment.status)}`))}">
        <td>${dateLabel(appointment.date, {day:"2-digit", month:"2-digit", year:"numeric"})}</td>
        <td>${esc(appointment.time)}</td>
        <td><button class="text-btn" onclick="window.openClientRecord(${Number(appointment.clientId)})">${esc(appointment.client)}</button></td>
        <td>${esc(service.name)}</td><td>${totalDuration(service)} min</td><td>${esc(appointment.source)}</td>
        <td><span class="badge status-${appointmentStatusClass(appointment.status)}">${appointmentStatusLabel(appointment.status)}</span>${appointment.confirmationMessageOpenedAt ? '<div class="muted message-status">WhatsApp preparado</div>' : ""}</td>
        <td><span class="badge ${formStatus === "complete" ? "status-complete" : "status-incomplete"}">${formStatus === "complete" ? "Completa" : "Pendiente"}</span></td>
        <td><span class="badge ${appointment.depositStatus === "proof_uploaded" || appointment.depositStatus === "confirmed_whatsapp" ? "status-complete" : "status-incomplete"}">${esc(depositStatusLabel(appointment))}</span>${proofAction}</td>
        <td class="table-actions">${statusActions}<button class="icon-btn" title="Editar" onclick="window.editAppointment(${Number(appointment.id)})"><i class="bi bi-pencil"></i></button><button class="icon-btn" title="Eliminar" onclick="window.deleteAppointment(${Number(appointment.id)})"><i class="bi bi-trash3"></i></button></td>
      </tr>`;
    }).join("");

    const statusOptions = [["all","Todos los estados"],["requested","Solicitudes online"],["confirmed","Confirmadas"],["pending","Pendientes"],["completed","Finalizadas"],["rejected","Rechazadas"]];
    $("#agendaView").innerHTML = `<div class="grid-page">
      <div class="page-heading"><div><span class="eyebrow">AGENDA</span><h1>Todos los agendamientos</h1><p>Filtra por una fecha específica y revisa solicitudes, citas confirmadas o pendientes.</p></div></div>
      <div class="agenda-filter-bar">
        <label class="field"><span>Filtrar por fecha</span><input type="date" id="agendaDateFilter" value="${esc(agendaDateFilter)}"></label>
        <label class="field"><span>Estado de la cita</span><select id="agendaStatusFilter">${statusOptions.map(([value,label]) => `<option value="${value}" ${agendaStatusFilter === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <div class="agenda-filter-actions"><button class="btn ghost-btn" id="agendaTodayFilter"><i class="bi bi-calendar-day"></i>Hoy</button><button class="btn ghost-btn" id="agendaClearFilter"><i class="bi bi-x-circle"></i>Limpiar</button></div>
        <div class="agenda-filter-summary">Mostrando ${visibleAppointments.length} de ${DATA.appointments.length} citas</div>
      </div>
      <div class="panel table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Hora</th><th>Clienta</th><th>Servicio</th><th>Bloque</th><th>Origen</th><th>Cita</th><th>Ficha</th><th>Seña</th><th>Acciones</th></tr></thead><tbody>${rows || '<tr class="agenda-empty-row"><td colspan="10">No hay citas que coincidan con este filtro.</td></tr>'}</tbody></table></div>
    </div>`;

    $("#agendaDateFilter").onchange = event => { agendaDateFilter = event.target.value; renderAgenda(); };
    $("#agendaStatusFilter").onchange = event => { agendaStatusFilter = event.target.value; renderAgenda(); };
    $("#agendaTodayFilter").onclick = () => { agendaDateFilter = todayISO; renderAgenda(); };
    $("#agendaClearFilter").onclick = () => { agendaDateFilter = ""; agendaStatusFilter = "all"; renderAgenda(); };
  }

  function renderClients() {
    $("#clientsView").innerHTML = `<div class="grid-page">
      <div class="page-heading"><div><span class="eyebrow">CLIENTAS</span><h1>Perfiles e historial</h1><p>Busca una clienta y abre toda su ficha: trabajo habitual, alertas, visitas, diseños y fotografías.</p></div><button class="btn primary-btn" id="newClientBtn"><i class="bi bi-person-plus"></i>Nueva clienta</button></div>
      <div class="cards-grid">${DATA.clients.map(client => {
        const insight = clientInsights(client.id);
        const design = insight.record?.design || {};
        return `<article class="client-card" data-client-card="${client.id}" data-search="${esc(normalize(`${client.name} ${client.phone} ${client.instagram} ${insight.usualService?.name} ${design.effect} ${design.design}`))}">
          <div class="client-head"><div class="client-avatar client-card-photo" data-client-photo="${client.id}">${initials(client.name)}</div><div><h3>${esc(client.name)}</h3><span class="badge">${esc(client.phone || "Sin teléfono")}</span></div></div>
          <p><strong>Servicio habitual:</strong> ${esc(insight.usualService?.name || client.favorite || "Sin definir")}</p>
          <p><strong>Diseño habitual:</strong> ${esc(design.effect || design.design || "Sin registrar")}${design.curvature ? ` · ${esc(design.curvature)}` : ""}</p>
          <p><strong>Última visita:</strong> ${insight.lastVisit ? dateLabel(insight.lastVisit.date, {day:"numeric",month:"short",year:"numeric"}) : esc(client.last || "Primera visita")}</p>
          <p><strong>Próximo mantenimiento:</strong> ${insight.maintenanceDate ? dateLabel(insight.maintenanceDate, {day:"numeric",month:"short"}) : "Sin calcular"}</p>
          <div class="meta-row">
            <span class="badge">${Number(client.visits || insight.visits.length)} visitas</span>
            <span class="badge">${money(client.spent)}</span>
            <span class="badge ${client.formStatus === "complete" ? "status-complete" : "status-incomplete"}">${client.formStatus === "complete" ? "Ficha completa" : "Falta completar"}</span>
            ${insight.risks.length ? `<span class="badge status-incomplete">${insight.risks.length} alerta(s)</span>` : ""}
          </div>
          <div class="client-card-actions">
            <button class="btn ghost-btn" onclick="window.repeatClientService(${Number(client.id)})"><i class="bi bi-arrow-repeat"></i>Repetir</button>
            <button class="btn primary-btn" onclick="window.openClientRecord(${Number(client.id)})"><i class="bi bi-clipboard2-heart"></i>Abrir ficha</button>
          </div>
        </article>`;
      }).join("")}</div>
    </div>`;
    $("#newClientBtn").onclick = createNewClient;
    hydrateClientCardPhotos();
  }

  function renderRecords() {
    const complete = DATA.clients.filter(client => client.formStatus === "complete").length;
    const pending = DATA.clients.length - complete;
    const warnings = DATA.clients.reduce((sum, client) => sum + (getRiskFlags(recordByClient(client.id)).length ? 1 : 0), 0);

    $("#recordsView").innerHTML = `<div class="grid-page">
      <div class="page-heading"><div><span class="eyebrow">FICHAS DIGITALES</span><h1>Consulta, consentimiento y diseño</h1><p>La información de las hojas impresas organizada en un flujo cómodo para clienta y profesional.</p></div><a class="btn primary-btn" href="reservar.html" target="_blank"><i class="bi bi-box-arrow-up-right"></i>Ver formulario cliente</a></div>
      <div class="records-summary">
        <article class="info-card"><span>Fichas completas</span><strong>${complete}</strong></article>
        <article class="info-card"><span>Pendientes</span><strong>${pending}</strong></article>
        <article class="info-card"><span>Con datos a revisar</span><strong>${warnings}</strong></article>
      </div>
      <section class="panel">
        <div class="panel-header"><div><span class="eyebrow">CLIENTAS</span><h2>Estado de documentación</h2></div></div>
        <div class="record-list">${DATA.clients.map(client => {
          const insight = clientInsights(client.id);
          const record = insight.record;
          return `<article class="record-row" data-search="${esc(normalize(`${client.name} ${client.phone} ${client.instagram} ${record?.design?.effect}`))}">
            <div class="record-client"><div class="client-avatar">${initials(client.name)}</div><div><h3>${esc(client.name)}</h3><p>${esc(client.phone || "Sin WhatsApp")} · ${esc(client.instagram || "Sin Instagram")}</p></div></div>
            <div class="record-metric"><span>Ficha</span><strong class="badge ${client.formStatus === "complete" ? "status-complete" : "status-incomplete"}">${client.formStatus === "complete" ? "Completa" : "Pendiente"}</strong></div>
            <div class="record-metric"><span>Trabajo habitual</span><strong>${esc(insight.usualService?.name || "Sin definir")}</strong></div>
            <div class="record-metric"><span>Último diseño</span><strong>${esc(record?.design?.effect || record?.design?.design || "Sin diseño")}</strong></div>
            <div class="record-row-actions">
              ${insight.risks.length ? `<span class="badge status-incomplete" title="${esc(insight.risks.join(", "))}"><i class="bi bi-exclamation-triangle"></i> ${insight.risks.length}</span>` : ""}
              <button class="icon-btn" title="WhatsApp" onclick="window.openWhatsApp(${Number(client.id)})"><i class="bi bi-whatsapp"></i></button>
              <button class="btn primary-btn" onclick="window.openClientRecord(${Number(client.id)})"><i class="bi bi-pencil-square"></i>Gestionar</button>
            </div>
          </article>`;
        }).join("")}</div>
      </section>
    </div>`;
  }

  function renderServices() {
    const activeCount = DATA.services.filter(service => service.active).length;
    $("#servicesView").innerHTML = `<div class="grid-page"><div class="page-heading"><div><span class="eyebrow">SERVICIOS</span><h1>Servicios editables</h1><p>Modifica precio, duración, preparación, limpieza y disponibilidad. Los cambios también aparecen en la reserva online.</p></div>${DATA.settings.role === "admin" ? '<button class="btn primary-btn" id="addServiceBtn"><i class="bi bi-plus-lg"></i>Nuevo servicio</button>' : ""}</div>
      <div class="records-summary">
        <article class="info-card"><span>Servicios activos</span><strong>${activeCount}</strong></article>
        <article class="info-card"><span>Servicios pausados</span><strong>${DATA.services.length-activeCount}</strong></article>
        <article class="info-card"><span>Duración promedio</span><strong>${DATA.services.length ? Math.round(DATA.services.reduce((s,x)=>s+totalDuration(x),0)/DATA.services.length) : 0} min</strong></article>
      </div>
      <div class="cards-grid">${DATA.services.map(service => `<article class="service-card ${service.active ? "" : "service-disabled"}" id="service-${service.id}" data-search="${esc(normalize(`${service.name} ${service.description}`))}" style="border-top:4px solid ${esc(service.color)}">
        <div class="service-card-top"><div><span class="badge ${service.active ? "status-complete" : "status-incomplete"}">${service.active ? "Disponible" : "Pausado"}</span><h3>${esc(service.name)}</h3></div>${DATA.settings.role === "admin" ? `<button class="icon-btn" type="button" title="Modificar servicio" data-edit-service="${service.id}"><i class="bi bi-pencil-square"></i></button>` : ""}</div>
        <div class="service-price">${money(service.price)}</div>
        <p>${esc(service.description || "Sin descripción pública.")}</p>
        <p>Servicio: ${service.duration} min</p><p>Preparación: ${service.prep} min · Limpieza: ${service.cleanup} min</p>
        <div class="service-actions"><span class="badge">Bloque total: ${totalDuration(service)} min</span>${DATA.settings.role === "admin" ? `<button class="text-btn" type="button" data-edit-service="${service.id}"><i class="bi bi-pencil"></i> Editar servicio</button>` : ""}</div>
      </article>`).join("")}</div></div>`;
    const add = $("#addServiceBtn");
    if (add) add.onclick = () => openServiceModal();
    $$('[data-edit-service]', $("#servicesView")).forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        openServiceModal(Number(button.dataset.editService));
      };
    });
  }

  function renderInventory() {
    $("#inventoryView").innerHTML = `<div class="grid-page"><div class="page-heading"><div><span class="eyebrow">INVENTARIO</span><h1>Control de productos</h1><p>Alertas según stock mínimo configurado.</p></div></div>
      <div class="cards-grid">${DATA.inventory.map(item => {
        const percentage = Math.min(100, Math.round(item.stock / Math.max(item.min * 2, 1) * 100));
        const low = item.stock <= item.min;
        return `<article class="inventory-card"><div class="meta-row"><span class="badge">${esc(item.category)}</span>${low ? '<span class="badge status-pending">Stock bajo</span>' : ""}</div>
          <h3>${esc(item.name)}</h3><p><strong>${item.stock}</strong> ${esc(item.unit)} disponibles · mínimo ${item.min}</p><div class="progress"><span style="width:${percentage}%"></span></div></article>`;
      }).join("")}</div></div>`;
  }

  function renderFinance() {
    const activeAppointments = DATA.appointments.filter(appointment => appointment.status !== "rejected");
    const total = activeAppointments.reduce((sum, appointment) => sum + Number(serviceById(appointment.serviceId).price || 0), 0);
    const deposits = activeAppointments.reduce((sum, appointment) => sum + Number(appointment.deposit || 0), 0);
    const average = activeAppointments.length ? Math.round(total / activeAppointments.length) : 0;
    $("#financeView").innerHTML = `<div class="grid-page"><div class="page-heading"><div><span class="eyebrow">FINANZAS</span><h1>Resumen de prueba</h1><p>Valores calculados desde los agendamientos.</p></div></div>
      <div class="stats-grid">
        <article class="stat-card"><div class="stat-icon gold"><i class="bi bi-cash-stack"></i></div><div><span>Ventas previstas</span><strong>${money(total)}</strong></div><small>Según citas cargadas</small></article>
        <article class="stat-card"><div class="stat-icon mint"><i class="bi bi-check-circle"></i></div><div><span>Señas recibidas</span><strong>${money(deposits)}</strong></div><small>Pagos anticipados</small></article>
        <article class="stat-card"><div class="stat-icon rose"><i class="bi bi-receipt"></i></div><div><span>Ticket promedio</span><strong>${money(average)}</strong></div><small>Por cita</small></article>
        <article class="stat-card"><div class="stat-icon lavender"><i class="bi bi-calendar-month"></i></div><div><span>Citas registradas</span><strong>${activeAppointments.length}</strong></div><small>Sin contar solicitudes rechazadas</small></article>
      </div></div>`;
  }

  function renderSettings() {
    if (DATA.settings.role !== "admin") {
      $("#settingsView").innerHTML = `<div class="empty-state"><i class="bi bi-lock"></i><strong>Acceso restringido</strong><p>Solo el usuario administrador puede modificar estas preferencias.</p></div>`;
      return;
    }
    const workDayLabels = [[1,"Lunes"],[2,"Martes"],[3,"Miércoles"],[4,"Jueves"],[5,"Viernes"],[6,"Sábado"],[0,"Domingo"]];
    $("#settingsView").innerHTML = `<div class="grid-page">
      <div class="page-heading"><div><span class="eyebrow">ADMINISTRACIÓN</span><h1>Configuración y preferencias</h1><p>Estos cambios controlan el panel, los horarios disponibles y la reserva pública.</p></div><span class="badge status-complete"><i class="bi bi-shield-check"></i> Administrador</span></div>
      <form id="settingsForm" class="settings-layout">
        <section class="panel settings-section"><div class="panel-header compact"><div><span class="eyebrow">USUARIO</span><h2>Perfil administrador</h2></div></div>
          <div class="form-grid">
            ${field("Nombre", "userName", DATA.settings.userName, "text", "required")}
            ${field("Correo", "userEmail", DATA.settings.userEmail, "email")}
            <label class="field"><span>Rol</span><input value="Administrador" disabled><input type="hidden" name="role" value="admin"></label>
            ${field("Teléfono del estudio", "studioPhone", DATA.settings.studioPhone)}
          </div>
        </section>
        <section class="panel settings-section"><div class="panel-header compact"><div><span class="eyebrow">NEGOCIO</span><h2>Datos del estudio</h2></div></div>
          <div class="form-grid">
            ${field("Nombre del estudio", "studioName", DATA.settings.studioName, "text", "required")}
            ${field("Ciudad o zona", "city", DATA.settings.city)}
            <label class="field"><span>Moneda</span><select name="currency"><option value="Gs." ${DATA.settings.currency === "Gs." ? "selected" : ""}>Guaraníes (Gs.)</option><option value="$" ${DATA.settings.currency === "$" ? "selected" : ""}>Dólares ($)</option></select></label>
            ${field("Seña predeterminada", "defaultDeposit", DATA.settings.defaultDeposit, "number", 'min="0" step="5000"')}
          </div>
        </section>
        <section class="panel settings-section"><div class="panel-header compact"><div><span class="eyebrow">AGENDA</span><h2>Horarios y automatización</h2></div></div>
          <div class="form-grid three">
            ${field("Apertura", "openingTime", DATA.settings.openingTime, "time")}
            ${field("Cierre", "closingTime", DATA.settings.closingTime, "time")}
            <label class="field"><span>Intervalo entre horarios</span><select name="slotInterval">${[15,20,30,45,60].map(value => `<option value="${value}" ${Number(DATA.settings.slotInterval) === value ? "selected" : ""}>${value} minutos</option>`).join("")}</select></label>
            ${field("Mantenimiento sugerido (días)", "maintenanceDays", DATA.settings.maintenanceDays, "number", 'min="1" max="90"')}
          </div>
          <div class="preference-group settings-days"><span>Días de atención</span><div class="preference-options">${workDayLabels.map(([value,label]) => `<label class="check-option"><input type="checkbox" name="workDays" value="${value}" ${DATA.settings.workDays.includes(value) ? "checked" : ""}><span>${label}</span></label>`).join("")}</div></div>
          <div class="settings-switches">
            <label class="check-option"><input type="checkbox" name="bookingEnabled" ${DATA.settings.bookingEnabled ? "checked" : ""}><span>Permitir reservas desde el enlace público</span></label>
            <label class="check-option"><input type="checkbox" name="requireConsent" ${DATA.settings.requireConsent ? "checked" : ""}><span>Solicitar consentimiento antes de confirmar ficha</span></label>
            <label class="check-option"><input type="checkbox" name="autoOpenConfirmationWhatsApp" ${DATA.settings.autoOpenConfirmationWhatsApp ? "checked" : ""}><span>Abrir WhatsApp automáticamente al confirmar una solicitud</span></label>
            <label class="check-option"><input type="checkbox" name="allowOptionalBookingDetails" ${DATA.settings.allowOptionalBookingDetails !== false ? "checked" : ""}><span>Permitir que la clienta omita los detalles opcionales</span></label>
            <label class="check-option"><input type="checkbox" name="allowDepositProof" ${DATA.settings.allowDepositProof !== false ? "checked" : ""}><span>Permitir subir comprobante de seña</span></label>
            <label class="check-option"><input type="checkbox" name="requireDepositChoice" ${DATA.settings.requireDepositChoice !== false ? "checked" : ""}><span>Exigir elegir cómo se confirmó la seña</span></label>
          </div>
          <label class="field full settings-message"><span>Mensaje de confirmación</span><textarea name="confirmationMessageTemplate" rows="4">${esc(DATA.settings.confirmationMessageTemplate || DEFAULT_SETTINGS.confirmationMessageTemplate)}</textarea></label>
          <p class="settings-note"><strong>Variables disponibles:</strong> {nombre}, {servicio}, {fecha}, {hora}, {estudio} y {ciudad}. En este prototipo se abre WhatsApp con el mensaje listo; el envío totalmente automático requiere WhatsApp Business API y un backend.</p>
        </section>
        <section class="panel settings-section"><div class="panel-header compact"><div><span class="eyebrow">APARIENCIA</span><h2>Color y tema</h2></div></div>
          <div class="form-grid">
            <label class="field"><span>Color principal</span><input type="color" name="primaryColor" value="${esc(DATA.settings.primaryColor)}"></label>
            <label class="field"><span>Modo</span><select name="appearance"><option value="light" ${DATA.settings.appearance === "light" ? "selected" : ""}>Claro</option><option value="dark" ${DATA.settings.appearance === "dark" ? "selected" : ""}>Oscuro</option><option value="system" ${DATA.settings.appearance === "system" ? "selected" : ""}>Usar el del sistema</option></select></label>
          </div>
          <div class="theme-preview"><span></span><strong>Vista previa de la identidad del estudio</strong><small>Los botones, indicadores y fondos suaves se adaptan al color elegido.</small></div>
        </section>
        <section class="panel settings-section"><div class="panel-header compact"><div><span class="eyebrow">DATOS</span><h2>Respaldo del prototipo</h2></div></div>
          <p class="muted settings-copy">Exporta clientas, citas, servicios, fichas, visitas, preferencias e imágenes. En una versión con backend esto se reemplazará por copias de seguridad automáticas.</p>
          <div class="settings-data-actions"><button type="button" class="btn ghost-btn" id="exportDataBtn"><i class="bi bi-download"></i>Exportar datos</button><label class="btn ghost-btn file-label"><i class="bi bi-upload"></i>Importar datos<input type="file" id="importDataInput" accept="application/json" hidden></label><button type="button" class="btn danger-btn" id="resetDemoBtn"><i class="bi bi-arrow-counterclockwise"></i>Restablecer demo</button></div>
        </section>
        <div class="settings-savebar"><span>Los cambios quedan guardados en este navegador.</span><button type="submit" class="btn primary-btn"><i class="bi bi-check2"></i>Guardar configuración</button></div>
      </form>
    </div>`;
    $("#settingsForm").addEventListener("submit", saveSettings);
    $("#settingsForm [name='primaryColor']").addEventListener("input", event => {
      DATA.settings.primaryColor = event.target.value;
      applyAppearance();
    });
    $("#settingsForm [name='appearance']").addEventListener("change", event => {
      DATA.settings.appearance = event.target.value;
      localStorage.setItem("lashflow_theme", event.target.value);
      applyAppearance();
    });
    $("#exportDataBtn").onclick = exportAllData;
    $("#importDataInput").onchange = importAllData;
    $("#resetDemoBtn").onclick = resetDemoData;
  }

  function renderStaticViews() {
    renderAgenda();
    renderClients();
    renderRecords();
    renderServices();
    renderInventory();
    renderFinance();
    renderSettings();
    populateClientNames();
  }

  function populateServices() {
    const activeServices = DATA.services.filter(service => service.active !== false);
    $("#serviceSelect").innerHTML = activeServices.map(service => `<option value="${service.id}">${esc(service.name)} · ${service.duration} min · ${money(service.price)}</option>`).join("");
  }

  function populateClientNames() {
    $("#clientNames").innerHTML = DATA.clients.map(client => `<option value="${esc(client.name)}">${esc(client.phone || "")}</option>`).join("");
  }

  function getAvailableTimes(date, serviceId, ignoredAppointmentId = editingAppointmentId) {
    const service = serviceById(serviceId);
    const block = totalDuration(service);
    const dateObj = new Date(`${date}T12:00:00`);
    if (!DATA.settings.workDays.includes(dateObj.getDay())) return [];
    const start = minutes(DATA.settings.openingTime);
    const end = minutes(DATA.settings.closingTime);
    const interval = Number(DATA.settings.slotInterval || 30);
    const existing = DATA.appointments.filter(appointment => appointment.date === date && appointment.status !== "rejected" && Number(appointment.id) !== Number(ignoredAppointmentId)).map(appointment => {
      const bookedService = serviceById(appointment.serviceId);
      return [minutes(appointment.time), minutes(appointment.time) + totalDuration(bookedService)];
    });
    const slots = [];
    for (let time = start; time + block <= end; time += interval) {
      if (!existing.some(([from, to]) => time < to && time + block > from)) slots.push(toTime(time));
    }
    return slots;
  }

  function updateAvailableTimes(preferredTime = "") {
    const date = $("#appointmentDate").value;
    const serviceId = $("#serviceSelect").value;
    if (!serviceId || !date) return;
    const service = serviceById(serviceId);
    const slots = getAvailableTimes(date, serviceId);
    if (preferredTime && !slots.includes(preferredTime)) slots.unshift(preferredTime);
    $("#availableTimes").innerHTML = slots.length ? slots.map(time => `<option ${time === preferredTime ? "selected" : ""}>${time}</option>`).join("") : `<option value="">Sin horarios disponibles</option>`;
    $("#durationPreview").innerHTML = `<strong>${esc(service.name)}</strong>: ${service.duration} min de servicio + ${service.prep} min de preparación + ${service.cleanup} min de cierre. <strong>Bloque total: ${totalDuration(service)} min.</strong>`;
  }

  function showAppointmentClientHint(client) {
    const hint = $("#appointmentClientHint");
    if (!client) {
      hint.hidden = true;
      hint.innerHTML = "";
      return;
    }
    const insight = clientInsights(client.id);
    const design = insight.record?.design || {};
    hint.hidden = false;
    hint.innerHTML = `<div class="client-hint-avatar">${initials(client.name)}</div><div><strong>Clienta registrada</strong><span>Habitual: ${esc(insight.usualService?.name || "sin definir")} · ${esc(design.effect || design.design || "sin diseño")}${insight.risks.length ? ` · ⚠ ${insight.risks.length} alerta(s)` : ""}</span></div><button type="button" class="text-btn" onclick="window.openClientRecord(${client.id})">Ver ficha</button>`;
  }

  function fillAppointmentForClient(clientId, serviceId = null) {
    const client = clientById(clientId);
    if (!client) return;
    const insight = clientInsights(client.id);
    $("#appointmentClientInput").value = client.name;
    $("#appointmentPhoneInput").value = client.phone || "";
    const suggested = serviceId || insight.lastService?.id || insight.usualService?.id;
    if (suggested && $(`#serviceSelect option[value="${suggested}"]`)) $("#serviceSelect").value = String(suggested);
    $("#appointmentForm [name='notes']").value = insight.record?.design?.effect ? `Repetir diseño habitual: ${insight.record.design.effect}${insight.record.design.range ? ` · ${insight.record.design.range}` : ""}${insight.record.design.curvature ? ` · curva ${insight.record.design.curvature}` : ""}` : "";
    showAppointmentClientHint(client);
    updateAvailableTimes();
  }

  function openAppointmentModal(options = {}) {
    editingAppointmentId = options.appointmentId || null;
    const form = $("#appointmentForm");
    form.reset();
    populateServices();
    $("#appointmentModal h2").textContent = editingAppointmentId ? "Editar cita" : "Agendar cita";
    $("#appointmentDate").value = options.date || selectedDate || todayISO;
    form.elements.deposit.value = DATA.settings.defaultDeposit;
    showAppointmentClientHint(null);

    if (editingAppointmentId) {
      const appointment = DATA.appointments.find(item => item.id === Number(editingAppointmentId));
      if (!appointment) return;
      form.elements.client.value = appointment.client;
      form.elements.phone.value = appointment.phone || clientById(appointment.clientId)?.phone || "";
      if (!$(`#serviceSelect option[value="${appointment.serviceId}"]`)) {
        const service = serviceById(appointment.serviceId);
        $("#serviceSelect").insertAdjacentHTML("beforeend", `<option value="${service.id}">${esc(service.name)} (pausado)</option>`);
      }
      form.elements.service.value = String(appointment.serviceId);
      form.elements.source.value = appointment.source;
      form.elements.date.value = appointment.date;
      form.elements.status.value = appointment.status;
      form.elements.deposit.value = appointment.deposit || 0;
      form.elements.notes.value = appointment.notes || "";
      showAppointmentClientHint(clientById(appointment.clientId));
      updateAvailableTimes(appointment.time);
    } else {
      if (options.clientId) fillAppointmentForClient(options.clientId, options.serviceId);
      else updateAvailableTimes();
    }

    $("#appointmentModal").classList.add("open");
    $("#appointmentModal").setAttribute("aria-hidden", "false");
    setTimeout(() => $("#appointmentClientInput").focus(), 50);
  }

  function closeAppointmentModal() {
    $("#appointmentModal").classList.remove("open");
    $("#appointmentModal").setAttribute("aria-hidden", "true");
    editingAppointmentId = null;
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function upsertClient(name, phone) {
    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "").trim();
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    let client = DATA.clients.find(item => phoneDigits && String(item.phone || "").replace(/\D/g, "") === phoneDigits)
      || DATA.clients.find(item => normalize(item.name) === normalize(cleanName));
    if (!client) {
      client = {
        id: Math.max(0, ...DATA.clients.map(item => Number(item.id) || 0)) + 1,
        name: cleanName, phone: cleanPhone, birthDate:"", address:"", email:"", instagram:"", firstTime:true,
        last:"Primera cita", favorite:"Sin definir", visits:0, spent:0, note:"Ficha pendiente", formStatus:"pending"
      };
      DATA.clients.push(client);
    } else {
      if (cleanName) client.name = cleanName;
      if (cleanPhone) client.phone = cleanPhone;
    }
    return client;
  }

  function createNewClient() {
    const client = {
      id: Math.max(0, ...DATA.clients.map(item => Number(item.id) || 0)) + 1,
      name:"Nueva clienta", phone:"", birthDate:"", address:"", email:"", instagram:"", firstTime:true,
      last:"Primera cita", favorite:"Sin definir", visits:0, spent:0, note:"", formStatus:"pending"
    };
    DATA.clients.push(client);
    DATA.records.push(emptyRecord(client.id));
    persist("clients", "records");
    renderStaticViews();
    openClientRecord(client.id);
  }

  function emptyRecord(clientId) {
    return {
      clientId: Number(clientId),
      updatedAt: "",
      medical: {canLieDown:true},
      preferences: {},
      anatomy: {},
      consent: {accepted:false, signedName:"", signedAt:"", version:"1.0"},
      design: {left:[8,9,10,11,10,9], right:[9,10,11,10,9,8]}
    };
  }

  function optionGroup(name, label, values, selected) {
    return `<div class="preference-group"><span>${esc(label)}</span><div class="preference-options">${values.map(value => `<label class="radio-option"><input type="radio" name="${esc(name)}" value="${esc(value)}" ${selected === value ? "checked" : ""}>${esc(value)}</label>`).join("")}</div></div>`;
  }

  function field(label, name, value = "", type = "text", extra = "") {
    return `<label class="field"><span>${esc(label)}</span><input type="${esc(type)}" name="${esc(name)}" value="${esc(value)}" ${extra}></label>`;
  }

  function checkOption(key, checked, label = medicalLabels[key]) {
    return `<label class="check-option"><input type="checkbox" name="medical_${esc(key)}" ${checked ? "checked" : ""}><span>${esc(label)}</span></label>`;
  }

  function eyeMap(side, values = []) {
    const zones = ["Interior", "2", "3", "4", "5", "Exterior"];
    return `<div class="lash-map-card"><div class="lash-map-heading"><div><h4>Ojo ${side === "left" ? "izquierdo" : "derecho"}</h4><p>Longitud en milímetros para cada zona.</p></div>${side === "left" ? '<button type="button" class="text-btn" id="copyLeftMapBtn">Copiar al derecho</button>' : ""}</div><div class="eye-map">${zones.map((zone, index) => {
      const value = Number(values[index] || 8);
      return `<label class="map-zone"><span class="map-lashes"><i style="--lash:${value}"></i></span><input type="number" min="5" max="20" step="1" name="${side}_${index}" value="${value}" aria-label="${zone}"><span>${zone}</span></label>`;
    }).join("")}</div></div>`;
  }

  function summaryPane(client, insight) {
    const record = insight.record || emptyRecord(client.id);
    const design = record.design || {};
    return `<section class="record-pane record-section" data-pane="summary">
      <div class="client-profile-hero">
        <div class="profile-photo" id="clientProfilePhoto"><span>${initials(client.name)}</span></div>
        <div class="profile-main"><span class="eyebrow">FICHA DE CLIENTA</span><h3>${esc(client.name)}</h3><p>${esc(client.phone || "Sin WhatsApp")} · ${esc(client.instagram || "Sin Instagram")} · ${esc(client.address || "Sin domicilio")}</p><div class="meta-row"><span class="badge ${client.formStatus === "complete" ? "status-complete" : "status-incomplete"}">${client.formStatus === "complete" ? "Ficha completa" : "Ficha pendiente"}</span>${insight.risks.length ? `<span class="badge status-incomplete"><i class="bi bi-exclamation-triangle"></i> ${insight.risks.length} alerta(s)</span>` : '<span class="badge status-complete">Sin alertas marcadas</span>'}<span class="badge" id="clientPhotoCount">0 fotos</span></div></div>
        <div class="profile-actions"><button type="button" class="btn primary-btn" onclick="window.repeatClientService(${client.id})"><i class="bi bi-arrow-repeat"></i>Repetir último</button><button type="button" class="btn ghost-btn" onclick="window.newAppointmentForClient(${client.id})"><i class="bi bi-calendar-plus"></i>Nueva cita</button></div>
      </div>
      ${insight.risks.length ? `<div class="alert-card danger"><i class="bi bi-exclamation-triangle"></i><div><strong>Revisar antes del servicio</strong><div class="risk-list">${insight.risks.map(flag => `<span class="badge status-incomplete">${esc(flag)}</span>`).join("")}</div></div></div>` : ""}
      <div class="client-summary-grid">
        <article class="summary-metric"><span>Servicio habitual</span><strong>${esc(insight.usualService?.name || client.favorite || "Sin definir")}</strong><small>${insight.usualService ? `${insight.usualService.duration} min · ${money(insight.usualService.price)}` : "Se calcula con el historial"}</small></article>
        <article class="summary-metric"><span>Diseño habitual</span><strong>${esc(design.effect || design.design || "Sin diseño")}</strong><small>${esc([design.curvature,design.thickness,design.range].filter(Boolean).join(" · ") || "Sin detalles técnicos")}</small></article>
        <article class="summary-metric"><span>Última visita</span><strong>${insight.lastVisit ? dateLabel(insight.lastVisit.date,{day:"numeric",month:"long",year:"numeric"}) : "Sin visitas"}</strong><small>${insight.lastVisit ? esc(serviceById(insight.lastVisit.serviceId).name) : "Primera atención"}</small></article>
        <article class="summary-metric"><span>Mantenimiento sugerido</span><strong>${insight.maintenanceDate ? dateLabel(insight.maintenanceDate,{day:"numeric",month:"long"}) : "Sin calcular"}</strong><small>Cada ${DATA.settings.maintenanceDays} días</small></article>
      </div>
      <div class="record-grid">
        <div class="info-card"><h4>Detalles para repetir rápidamente</h4><dl class="detail-list"><div><dt>Técnica</dt><dd>${esc(design.technique || "-")}</dd></div><div><dt>Efecto</dt><dd>${esc(design.effect || "-")}</dd></div><div><dt>Diseño</dt><dd>${esc(design.design || "-")}</dd></div><div><dt>Volumen</dt><dd>${esc(design.volume || "-")}</dd></div><div><dt>Curvatura</dt><dd>${esc(design.curvature || "-")}</dd></div><div><dt>Rango</dt><dd>${esc(design.range || "-")}</dd></div></dl></div>
        <div class="info-card"><h4>Actividad de la clienta</h4><dl class="detail-list"><div><dt>Visitas registradas</dt><dd>${insight.visits.length}</dd></div><div><dt>Gasto acumulado</dt><dd>${money(client.spent)}</dd></div><div><dt>Ticket promedio</dt><dd>${money(insight.averagePrice)}</dd></div><div><dt>Nota general</dt><dd>${esc(client.note || "Sin notas")}</dd></div></dl></div>
      </div>
      <div class="quick-actions-grid four">
        <button type="button" class="quick-action" data-record-go="consultation"><i class="bi bi-exclamation-triangle"></i><strong>Alertas y consulta</strong><span>Alergias, sensibilidad y datos a revisar.</span></button>
        <button type="button" class="quick-action" data-record-go="history"><i class="bi bi-clock-history"></i><strong>Historial completo</strong><span>Servicios, precios y observaciones.</span></button>
        <button type="button" class="quick-action" data-record-go="design"><i class="bi bi-eye"></i><strong>Diseño técnico</strong><span>Curvatura, grosor, efecto y mapeo.</span></button>
        <button type="button" class="quick-action" data-record-go="gallery"><i class="bi bi-camera"></i><strong>Fotografías</strong><span>Antes, después, retención o inspiración.</span></button>
      </div>
    </section>`;
  }

  function renderRecordForm(client, record) {
    const insight = clientInsights(client.id);
    insight.record = record;
    const risks = getRiskFlags(record);
    const visits = insight.visits;
    const design = record.design || {};
    const medical = record.medical || {};
    const preferences = record.preferences || {};
    const anatomy = record.anatomy || {};
    const consent = record.consent || {};

    $("#recordFormContent").innerHTML = `
      ${summaryPane(client, insight)}
      <section class="record-pane record-section" data-pane="personal" hidden>
        <div class="record-section-heading"><div><h3>Información de la clienta</h3><p>Estos datos se guardan una sola vez y se reutilizan en las próximas reservas.</p></div><span class="badge ${client.formStatus === "complete" ? "status-complete" : "status-incomplete"}">${client.formStatus === "complete" ? "Ficha completa" : "Pendiente"}</span></div>
        <div class="record-grid three">
          ${field("Nombre y apellido", "name", client.name, "text", "required")}
          ${field("Fecha de nacimiento", "birthDate", client.birthDate, "date")}
          ${field("WhatsApp", "phone", client.phone)}
          ${field("Email", "email", client.email, "email")}
          ${field("Instagram", "instagram", client.instagram)}
          ${field("Domicilio", "address", client.address)}
        </div>
        <div class="record-grid">
          ${optionGroup("firstTime", "¿Es la primera vez que se realiza extensiones?", ["Sí", "No"], client.firstTime ? "Sí" : "No")}
          <label class="field"><span>Nota general</span><textarea name="note" rows="4" placeholder="Preferencias o información importante...">${esc(client.note || "")}</textarea></label>
        </div>
        <div class="quick-actions-grid">
          <button type="button" class="quick-action" onclick="window.openWhatsApp(${client.id})"><i class="bi bi-whatsapp"></i><strong>Escribir por WhatsApp</strong><span>Confirmación, recordatorio o cuidados.</span></button>
          <button type="button" class="quick-action" id="copyFormLinkInline"><i class="bi bi-link-45deg"></i><strong>Enviar formulario</strong><span>La clienta completa datos y consentimiento.</span></button>
          <button type="button" class="quick-action" data-record-go="history"><i class="bi bi-clock-history"></i><strong>Ver historial</strong><span>Diseños y notas de visitas anteriores.</span></button>
        </div>
      </section>

      <section class="record-pane record-section" data-pane="consultation" hidden>
        <div class="record-section-heading"><div><h3>Consulta previa y preferencias</h3><p>La aplicación solo organiza las respuestas. La profesional debe revisarlas antes del procedimiento.</p></div></div>
        ${risks.length ? `<div class="alert-card danger"><i class="bi bi-exclamation-triangle"></i><div><strong>Revisar antes de iniciar</strong><div class="risk-list">${risks.map(flag => `<span class="badge status-incomplete">${esc(flag)}</span>`).join("")}</div></div></div>` : `<div class="alert-card success"><i class="bi bi-check-circle"></i><div><strong>Sin alertas marcadas</strong><div>Confirma verbalmente que la información sigue vigente.</div></div></div>`}
        <div class="info-card"><h4>Antecedentes y hábitos</h4><div class="check-grid">
          ${["eyeSurgery","dryEyes","cosmeticProcedures","seasonalAllergies","alopecia","trichotillomania","thyroid","ironDeficiency","lowDefenses","medications","oilySkin","frequentMakeup","facialCreams","extremeStress","eyeMedication","productAllergy","contactLenses","glasses","rubsEyes","pregnant"].map(key => checkOption(key, medical[key])).join("")}
          ${checkOption("canLieDown", medical.canLieDown !== false)}
        </div></div>
        <label class="field"><span>Observaciones de salud, alergias o cuidados</span><textarea name="medical_notes" rows="4" placeholder="Detalle cualquier respuesta que deba revisar la profesional...">${esc(medical.notes || "")}</textarea></label>
        <div class="record-grid">
          <div class="info-card"><h4>Preferencias de la clienta</h4><div class="record-section">
            ${optionGroup("pref_length", "Largo", ["Largas", "Cortas", "Sin preferencia"], preferences.length)}
            ${optionGroup("pref_thickness", "Apariencia", ["Gruesas", "Finas", "Natural"], preferences.thickness)}
            ${optionGroup("pref_use", "Uso", ["Uso a largo plazo", "Ocasión especial"], preferences.use)}
            ${optionGroup("pref_color", "Color", ["Negras", "De colores", "Mixtas"], preferences.color)}
          </div></div>
          <label class="field"><span>Notas de preferencia</span><textarea name="pref_notes" rows="10" placeholder="Qué le llama la atención: largo, volumen, diseño, referencias...">${esc(preferences.notes || "")}</textarea></label>
        </div>
      </section>

      <section class="record-pane record-section" data-pane="design" hidden>
        <div class="record-section-heading"><div><h3>Diseño técnico habitual</h3><p>La lashista guarda aquí la configuración que normalmente se reutiliza y ajusta en futuras visitas.</p></div><span class="badge">Última actualización: ${record.updatedAt ? dateLabel(record.updatedAt, {day:"numeric", month:"long", year:"numeric"}) : "Sin guardar"}</span></div>
        <div class="record-grid three">
          ${field("Tipo de técnica", "design_technique", design.technique || "")}
          ${field("Efecto", "design_effect", design.effect || "")}
          ${field("Diseño", "design_name", design.design || "")}
          ${field("Grosor", "design_thickness", design.thickness || "")}
          ${field("Curvatura/s", "design_curvature", design.curvature || "")}
          ${field("Tipo de volumen", "design_volume", design.volume || "")}
          ${field("Rango de medidas", "design_range", design.range || "")}
        </div>
        <div class="info-card"><h4>Detalles anatómicos</h4><div class="record-grid">
          ${optionGroup("anatomy_eyeShape", "Forma del ojo", ["Redondo", "Estrecho", "Ascendente", "Descendente"], anatomy.eyeShape)}
          ${optionGroup("anatomy_naturalThickness", "Grosor natural", ["Fino", "Estándar", "Grueso"], anatomy.naturalThickness)}
          ${optionGroup("anatomy_naturalCurve", "Curva natural", ["Recta", "Curva", "Mixta"], anatomy.naturalCurve)}
          ${optionGroup("anatomy_direction", "Dirección", ["Ascendente", "Recta", "Descendente"], anatomy.direction)}
          ${optionGroup("anatomy_density", "Densidad", ["Poca", "Estándar", "Mucha"], anatomy.density)}
        </div></div>
        <div class="design-layout">${eyeMap("left", design.left)}${eyeMap("right", design.right)}</div>
        <label class="field"><span>Notas de diseño adicionales</span><textarea name="design_notes" rows="4" placeholder="Adhesivo, tiempos, zonas delicadas, cambios para el próximo retoque...">${esc(design.notes || "")}</textarea></label>
      </section>

      <section class="record-pane record-section" data-pane="consent" hidden>
        <div class="record-section-heading"><div><h3>Consentimiento informado</h3><p>Guarda la aceptación, nombre y fecha. En producción conviene registrar también la versión del texto y evidencia de aceptación.</p></div></div>
        <div class="consent-box">
          <strong>Consentimiento para extensiones de pestañas</strong>
          <p>La clienta declara que informó alergias, sensibilidades, medicaciones, condiciones o procedimientos recientes que puedan ser relevantes. Comprende que durante la aplicación deberá mantener los ojos cerrados y seguir las indicaciones de la profesional.</p>
          <p>También comprende que pueden presentarse molestias o reacciones y que debe comunicar inmediatamente cualquier incomodidad. Acepta seguir las recomendaciones de higiene, mantenimiento y retiro profesional, y autoriza el procedimiento descrito en su ficha.</p>
          <p>La aceptación no reemplaza una evaluación médica. Ante síntomas importantes o dudas de salud, el servicio debe suspenderse y recomendarse una consulta profesional.</p>
        </div>
        <label class="check-option"><input type="checkbox" name="consent_accepted" ${consent.accepted ? "checked" : ""}><span>Confirmo que leí, comprendí y acepto el consentimiento informado.</span></label>
        <div class="signature-row">
          ${field("Nombre usado como firma", "consent_signedName", consent.signedName || client.name)}
          ${field("Fecha de aceptación", "consent_signedAt", consent.signedAt || todayISO, "date")}
        </div>
        <div class="photo-consent-box info-card"><h4>Autorización de fotografías</h4><div class="check-grid"><label class="check-option"><input type="checkbox" name="photo_private" ${consent.photoPrivate !== false ? "checked" : ""}><span>Guardar fotos en historial privado</span></label><label class="check-option"><input type="checkbox" name="photo_portfolio" ${consent.photoPortfolio ? "checked" : ""}><span>Permitir uso en portafolio</span></label><label class="check-option"><input type="checkbox" name="photo_social" ${consent.photoSocial ? "checked" : ""}><span>Permitir publicación en redes</span></label><label class="check-option"><input type="checkbox" name="photo_hideFace" ${consent.photoHideFace ? "checked" : ""}><span>Publicar solo sin identificar el rostro</span></label></div></div>
        <div class="alert-card"><i class="bi bi-shield-lock"></i><div><strong>Privacidad</strong><div>Los datos personales, de salud y fotografías deben almacenarse con acceso restringido y una política clara de conservación.</div></div></div>
      </section>

      <section class="record-pane record-section" data-pane="history" hidden>
        <div class="record-section-heading"><div><h3>Historial de visitas</h3><p>Cada atención conserva servicio, técnica, medidas, curvatura, precio y notas.</p></div><button type="button" class="btn primary-btn" id="addVisitBtn"><i class="bi bi-plus-lg"></i>Registrar visita</button></div>
        <div class="history-list">${visits.length ? visits.map(visit => {
          const service = serviceById(visit.serviceId);
          return `<article class="history-item"><div class="history-date">${dateLabel(visit.date, {day:"numeric", month:"short", year:"numeric"})}</div><div><h4>${esc(service.name)} · ${esc(visit.design || "Sin diseño")}</h4><p>${esc(visit.range || "Sin medidas")} · Curvatura ${esc(visit.curvature || "-")} · ${esc(visit.notes || "Sin notas")}</p></div><div class="history-price">${money(visit.price)}</div><div class="history-actions"><button type="button" class="icon-btn" title="Repetir esta visita" onclick="window.repeatVisit(${visit.id})"><i class="bi bi-arrow-repeat"></i></button><button type="button" class="icon-btn" title="Editar visita" onclick="window.editVisit(${visit.id})"><i class="bi bi-pencil"></i></button><button type="button" class="icon-btn" title="Eliminar visita" onclick="window.deleteVisit(${visit.id})"><i class="bi bi-trash3"></i></button></div></article>`;
        }).join("") : `<div class="empty-inline">Todavía no hay visitas registradas.</div>`}</div>
        <div class="info-card" id="visitEditor" hidden>
          <h4 id="visitEditorTitle">Nueva visita</h4>
          <div class="record-grid three">
            ${field("Fecha", "visit_date", todayISO, "date")}
            <label class="field"><span>Servicio</span><select name="visit_service">${DATA.services.map(service => `<option value="${service.id}">${esc(service.name)}</option>`).join("")}</select></label>
            ${field("Precio", "visit_price", "", "number")}
            ${field("Efecto o diseño", "visit_design", design.effect || design.design || "")}
            ${field("Rango", "visit_range", design.range || "")}
            ${field("Curvatura", "visit_curvature", design.curvature || "")}
          </div>
          <label class="field"><span>Notas de la visita</span><textarea name="visit_notes" rows="3"></textarea></label>
          <div class="modal-actions"><button type="button" class="btn ghost-btn" id="cancelVisitBtn">Cancelar</button><button type="button" class="btn primary-btn" id="saveVisitBtn"><i class="bi bi-check2"></i>Guardar visita</button></div>
        </div>
      </section>

      <section class="record-pane record-section" data-pane="gallery" hidden>
        <div class="record-section-heading"><div><h3>Fotografías de la clienta</h3><p>Guarda imágenes del antes, después, retención, ojo izquierdo/derecho o referencias. Las fotos se comprimen y almacenan en el navegador mediante IndexedDB.</p></div><span class="badge"><i class="bi bi-shield-lock"></i> Historial privado</span></div>
        <div class="photo-upload-panel">
          <div class="record-grid three">
            <label class="field"><span>Tipo de fotografía</span><select id="photoType"><option>Antes</option><option>Después</option><option>Ojo izquierdo</option><option>Ojo derecho</option><option>Retención</option><option>Inspiración</option><option>Reacción o sensibilidad</option><option>Consentimiento</option><option>Otro</option></select></label>
            <label class="field"><span>Fecha</span><input id="photoDate" type="date" value="${todayISO}"></label>
            <label class="field"><span>Vincular a visita</span><select id="photoVisit"><option value="">Sin visita específica</option>${visits.map(visit => `<option value="${visit.id}">${dateLabel(visit.date,{day:"2-digit",month:"2-digit",year:"numeric"})} · ${esc(serviceById(visit.serviceId).name)}</option>`).join("")}</select></label>
          </div>
          <label class="field"><span>Descripción</span><input id="photoNote" placeholder="Ej. resultado final, retención a los 18 días..."></label>
          <label class="check-option compact-check"><input type="checkbox" id="photoPortfolio"><span>Esta imagen puede utilizarse en el portafolio según el consentimiento registrado.</span></label>
          <div class="photo-upload-actions"><label class="btn primary-btn file-label"><i class="bi bi-camera"></i>Tomar foto<input type="file" id="cameraPhotoInput" accept="image/*" capture="environment" hidden></label><label class="btn ghost-btn file-label"><i class="bi bi-images"></i>Elegir imágenes<input type="file" id="galleryPhotoInput" accept="image/*" multiple hidden></label></div>
          <div class="upload-progress" id="photoUploadProgress" hidden><span></span><strong>Procesando imágenes…</strong></div>
        </div>
        <div class="photo-gallery" id="clientPhotoGallery"><div class="empty-inline">Cargando fotografías…</div></div>
      </section>`;

    $$(".map-zone input", $("#recordFormContent")).forEach(input => input.addEventListener("input", event => {
      const lash = event.currentTarget.parentElement.querySelector(".map-lashes i");
      lash.style.setProperty("--lash", event.currentTarget.value || 8);
    }));

    $$('[data-record-go]', $("#recordFormContent")).forEach(button => button.onclick = () => activateRecordTab(button.dataset.recordGo));
    const inline = $("#copyFormLinkInline");
    if (inline) inline.onclick = copyCurrentFormLink;
    const addVisit = $("#addVisitBtn");
    if (addVisit) addVisit.onclick = () => openVisitEditor();
    const saveVisit = $("#saveVisitBtn");
    if (saveVisit) saveVisit.onclick = saveVisitFromEditor;
    const cancelVisit = $("#cancelVisitBtn");
    if (cancelVisit) cancelVisit.onclick = closeVisitEditor;
    const copyMap = $("#copyLeftMapBtn");
    if (copyMap) copyMap.onclick = copyLeftMapToRight;
    const cameraInput = $("#cameraPhotoInput");
    const galleryInput = $("#galleryPhotoInput");
    if (cameraInput) cameraInput.onchange = event => uploadClientImages(event.target.files);
    if (galleryInput) galleryInput.onchange = event => uploadClientImages(event.target.files);

    hydrateClientProfilePhoto(client.id);
    refreshGallery(client.id);
  }

  function activateRecordTab(tabName) {
    const validTabs = ["summary","personal","consultation","design","consent","history","gallery"];
    const targetTab = validTabs.includes(tabName) ? tabName : "summary";
    $$('[data-record-tab]', $("#recordTabs")).forEach(button => {
      const active = button.dataset.recordTab === targetTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      if (active) button.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
    });
    $$(".record-pane", $("#recordFormContent")).forEach(section => {
      section.hidden = section.dataset.pane !== targetTab;
      section.setAttribute("aria-hidden", String(section.hidden));
    });
    const modal = $("#recordModal .record-modal-card");
    if (modal) modal.scrollTo({top:0,behavior:"smooth"});
    if (targetTab === "gallery" && currentRecordClientId) refreshGallery(currentRecordClientId);
  }

  function openClientRecord(clientId) {
    const client = clientById(clientId);
    if (!client) {
      showToast("No se encontró la clienta");
      return;
    }
    currentRecordClientId = client.id;
    const record = recordByClient(client.id) || emptyRecord(client.id);
    if (!recordByClient(client.id)) DATA.records.push(record);
    $("#recordClientId").value = client.id;
    $("#recordModalTitle").textContent = client.name;
    $("#recordModalSubtitle").textContent = `${client.phone || "Sin WhatsApp"} · ${client.formStatus === "complete" ? "Ficha completa" : "Información pendiente"}`;
    renderRecordForm(client, record);
    activateRecordTab("summary");
    $("#recordModal").classList.add("open");
    $("#recordModal").setAttribute("aria-hidden", "false");
  }

  function closeRecordModal() {
    $("#recordModal").classList.remove("open");
    $("#recordModal").setAttribute("aria-hidden", "true");
    currentRecordClientId = null;
    editingVisitId = null;
  }

  function readRadio(form, name, fallback = "") {
    return form.querySelector(`[name="${name}"]:checked`)?.value || fallback;
  }

  function saveRecord(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const clientId = Number($("#recordClientId").value);
    const client = clientById(clientId);
    if (!client) return;
    let record = recordByClient(clientId);
    if (!record) {
      record = emptyRecord(clientId);
      DATA.records.push(record);
    }

    const value = name => form.elements[name]?.value?.trim?.() ?? form.elements[name]?.value ?? "";
    client.name = value("name") || client.name;
    client.birthDate = value("birthDate");
    client.phone = value("phone");
    client.email = value("email");
    client.instagram = value("instagram");
    client.address = value("address");
    client.note = value("note");
    client.firstTime = readRadio(form, "firstTime", client.firstTime ? "Sí" : "No") === "Sí";

    const medical = {};
    Object.keys(medicalLabels).forEach(key => medical[key] = Boolean(form.elements[`medical_${key}`]?.checked));
    medical.notes = value("medical_notes");
    record.medical = medical;
    record.preferences = {
      length: readRadio(form, "pref_length"),
      thickness: readRadio(form, "pref_thickness"),
      use: readRadio(form, "pref_use"),
      color: readRadio(form, "pref_color"),
      notes: value("pref_notes")
    };
    record.anatomy = {
      eyeShape: readRadio(form, "anatomy_eyeShape"),
      naturalThickness: readRadio(form, "anatomy_naturalThickness"),
      naturalCurve: readRadio(form, "anatomy_naturalCurve"),
      direction: readRadio(form, "anatomy_direction"),
      density: readRadio(form, "anatomy_density")
    };
    record.design = {
      technique: value("design_technique"), effect: value("design_effect"), design: value("design_name"),
      thickness: value("design_thickness"), curvature: value("design_curvature"), volume: value("design_volume"),
      range: value("design_range"), notes: value("design_notes"),
      left: Array.from({length:6}, (_, index) => Number(value(`left_${index}`) || 0)),
      right: Array.from({length:6}, (_, index) => Number(value(`right_${index}`) || 0))
    };
    record.consent = {
      accepted: Boolean(form.elements.consent_accepted?.checked),
      signedName: value("consent_signedName"),
      signedAt: value("consent_signedAt"),
      version: "1.1",
      photoPrivate: Boolean(form.elements.photo_private?.checked),
      photoPortfolio: Boolean(form.elements.photo_portfolio?.checked),
      photoSocial: Boolean(form.elements.photo_social?.checked),
      photoHideFace: Boolean(form.elements.photo_hideFace?.checked)
    };
    record.updatedAt = todayISO;
    client.formStatus = (!DATA.settings.requireConsent || record.consent.accepted) && client.phone && client.name ? "complete" : "pending";
    if (record.design?.technique) client.favorite = record.design.technique;
    DATA.appointments.filter(appointment => appointment.clientId === client.id).forEach(appointment => {
      appointment.client = client.name;
      appointment.phone = client.phone;
      appointment.formStatus = client.formStatus;
    });

    persist("clients", "records", "appointments");
    applyUserProfile();
    renderDashboard();
    renderStaticViews();
    closeRecordModal();
    showToast("Ficha guardada correctamente");
  }

  function copyLeftMapToRight() {
    const form = $("#recordForm");
    for (let i = 0; i < 6; i++) {
      const left = form.elements[`left_${i}`];
      const right = form.elements[`right_${5-i}`];
      if (left && right) {
        right.value = left.value;
        right.dispatchEvent(new Event("input", {bubbles:true}));
      }
    }
    showToast("Mapeo copiado e invertido al ojo derecho");
  }

  function openVisitEditor(visitId = null) {
    editingVisitId = visitId ? Number(visitId) : null;
    const editor = $("#visitEditor");
    const form = $("#recordForm");
    editor.hidden = false;
    $("#visitEditorTitle").textContent = editingVisitId ? "Editar visita" : "Nueva visita";
    if (editingVisitId) {
      const visit = DATA.visits.find(item => item.id === editingVisitId);
      if (!visit) return;
      form.elements.visit_date.value = visit.date;
      form.elements.visit_service.value = String(visit.serviceId);
      form.elements.visit_price.value = visit.price;
      form.elements.visit_design.value = visit.design || "";
      form.elements.visit_range.value = visit.range || "";
      form.elements.visit_curvature.value = visit.curvature || "";
      form.elements.visit_notes.value = visit.notes || "";
    } else {
      const record = recordByClient(currentRecordClientId);
      const insight = clientInsights(currentRecordClientId);
      form.elements.visit_date.value = todayISO;
      form.elements.visit_service.value = String(insight.lastService?.id || insight.usualService?.id || DATA.services[0].id);
      form.elements.visit_price.value = serviceById(form.elements.visit_service.value).price;
      form.elements.visit_design.value = record?.design?.effect || record?.design?.design || "";
      form.elements.visit_range.value = record?.design?.range || "";
      form.elements.visit_curvature.value = record?.design?.curvature || "";
      form.elements.visit_notes.value = "";
    }
    editor.scrollIntoView({behavior:"smooth", block:"nearest"});
  }

  function closeVisitEditor() {
    const editor = $("#visitEditor");
    if (editor) editor.hidden = true;
    editingVisitId = null;
  }

  function saveVisitFromEditor() {
    const form = $("#recordForm");
    const clientId = Number($("#recordClientId").value);
    const value = name => form.elements[name]?.value?.trim?.() ?? "";
    const serviceId = Number(value("visit_service") || DATA.services[0].id);
    const service = serviceById(serviceId);
    const payload = {
      clientId, date: value("visit_date") || todayISO, serviceId,
      professional: DATA.settings.userName, source: "Manual", price: Number(value("visit_price") || service.price),
      design: value("visit_design"), range: value("visit_range"), curvature: value("visit_curvature"), notes: value("visit_notes")
    };
    if (editingVisitId) {
      const visit = DATA.visits.find(item => item.id === editingVisitId);
      if (visit) Object.assign(visit, payload);
    } else {
      DATA.visits.push({id:uid(), ...payload});
    }
    recalculateClientStats(clientId);
    persist("visits", "clients");
    const client = clientById(clientId);
    renderRecordForm(client, recordByClient(clientId) || emptyRecord(clientId));
    activateRecordTab("history");
    renderStaticViews();
    editingVisitId = null;
    showToast("Visita guardada en el historial");
  }

  function recalculateClientStats(clientId) {
    const client = clientById(clientId);
    const visits = DATA.visits.filter(visit => visit.clientId === Number(clientId)).sort((a,b) => b.date.localeCompare(a.date));
    if (!client) return;
    client.visits = visits.length;
    client.spent = visits.reduce((sum, visit) => sum + Number(visit.price || 0), 0);
    client.last = visits[0] ? dateLabel(visits[0].date) : "Primera cita";
    if (visits.length) client.favorite = serviceById(visits[0].serviceId).name;
  }

  function editVisit(visitId) {
    activateRecordTab("history");
    openVisitEditor(visitId);
  }

  function deleteVisit(visitId) {
    if (!confirm("¿Eliminar esta visita del historial?")) return;
    const visit = DATA.visits.find(item => item.id === Number(visitId));
    if (!visit) return;
    DATA.visits = DATA.visits.filter(item => item.id !== Number(visitId));
    recalculateClientStats(visit.clientId);
    persist("visits", "clients");
    renderRecordForm(clientById(visit.clientId), recordByClient(visit.clientId) || emptyRecord(visit.clientId));
    activateRecordTab("history");
    renderStaticViews();
    showToast("Visita eliminada");
  }

  function repeatVisit(visitId) {
    const visit = DATA.visits.find(item => item.id === Number(visitId));
    if (!visit) return;
    closeRecordModal();
    openAppointmentModal({clientId:visit.clientId, serviceId:visit.serviceId, date:selectedDate});
    $("#appointmentForm [name='notes']").value = `Repetir visita del ${dateLabel(visit.date)}: ${visit.design || "mismo diseño"}${visit.range ? ` · ${visit.range}` : ""}${visit.curvature ? ` · curva ${visit.curvature}` : ""}`;
  }

  function repeatClientService(clientId) {
    const insight = clientInsights(clientId);
    closeRecordModal();
    openAppointmentModal({clientId, serviceId:insight.lastService?.id || insight.usualService?.id, date:selectedDate});
  }

  function copyCurrentFormLink() {
    if (!currentRecordClientId) return;
    const url = new URL("reservar.html", window.location.href);
    url.searchParams.set("client", currentRecordClientId);
    url.searchParams.set("mode", "form");
    const text = url.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast("Enlace copiado")).catch(() => window.prompt("Copia este enlace:", text));
    } else {
      window.prompt("Copia este enlace:", text);
    }
  }

  function openWhatsApp(clientId) {
    const client = clientById(clientId);
    if (!client?.phone) {
      showToast("La clienta no tiene WhatsApp cargado");
      return;
    }
    const digits = phoneDigits(client.phone);
    const nextAppointment = DATA.appointments.filter(appointment => appointment.clientId === client.id && appointment.date >= todayISO && appointment.status !== "rejected").sort((a, b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time))[0];
    const insight = clientInsights(client.id);
    const message = nextAppointment
      ? nextAppointment.status === "requested"
        ? `Hola ${client.name}, recibimos tu solicitud para ${serviceById(nextAppointment.serviceId).name} el ${dateLabel(nextAppointment.date, {day:"numeric", month:"long"})} a las ${nextAppointment.time}. Aún está pendiente de confirmación.`
        : `Hola ${client.name}, te recordamos tu cita de ${serviceById(nextAppointment.serviceId).name} el ${dateLabel(nextAppointment.date, {day:"numeric", month:"long"})} a las ${nextAppointment.time}. ¿Podrías confirmarnos tu asistencia?`
      : insight.maintenanceDate && insight.maintenanceDate <= addDays(todayISO, 7)
        ? `Hola ${client.name} 😊 Ya se acerca la fecha sugerida para el mantenimiento de tus pestañas. ¿Te gustaría reservar un horario?`
        : `Hola ${client.name}, ¿cómo estás? Te escribimos desde ${DATA.settings.studioName}.`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }

  function buildConfirmationMessage(appointment) {
    const client = clientById(appointment.clientId) || {name: appointment.client};
    const service = serviceById(appointment.serviceId);
    const values = {
      nombre: client.name || appointment.client || "",
      servicio: service.name || "tu servicio",
      fecha: dateLabel(appointment.date, {weekday:"long", day:"numeric", month:"long", year:"numeric"}),
      hora: appointment.time || "",
      estudio: DATA.settings.studioName || "el estudio",
      ciudad: DATA.settings.city || ""
    };
    return String(DATA.settings.confirmationMessageTemplate || DEFAULT_SETTINGS.confirmationMessageTemplate)
      .replace(/\{(nombre|servicio|fecha|hora|estudio|ciudad)\}/g, (_, key) => values[key] || "");
  }

  function openConfirmationWhatsApp(appointmentId, automatic = false) {
    const appointment = DATA.appointments.find(item => item.id === Number(appointmentId));
    if (!appointment) return showToast("No se encontró la cita");
    const client = clientById(appointment.clientId);
    const phone = appointment.phone || client?.phone || "";
    const digits = phoneDigits(phone);
    if (!digits) return showToast("La solicitud no tiene un número de WhatsApp válido");
    const message = buildConfirmationMessage(appointment);
    appointment.confirmationMessageOpenedAt = new Date().toISOString();
    appointment.confirmationMessageMode = automatic ? "automatic-open" : "manual-open";
    persist("appointments");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    renderDashboard();
    renderAgenda();
    showToast(automatic ? "Cita confirmada y WhatsApp preparado" : "Mensaje de confirmación preparado");
  }

  // Servicios editables
  function openServiceModal(serviceId = null) {
    if (DATA.settings.role !== "admin") return showToast("Solo la administradora puede modificar servicios");
    const form = $("#serviceForm");
    const control = name => form.elements.namedItem(name);
    form.reset();
    control("serviceId").value = serviceId || "";
    $("#serviceModalTitle").textContent = serviceId ? "Modificar servicio" : "Nuevo servicio";
    $("#deleteServiceBtn").hidden = !serviceId;
    if (serviceId) {
      const service = DATA.services.find(item => Number(item.id) === Number(serviceId));
      if (!service) return showToast("No se encontró el servicio");
      control("name").value = service.name || "";
      control("duration").value = Number(service.duration || 0);
      control("price").value = Number(service.price || 0);
      control("prep").value = Number(service.prep || 0);
      control("cleanup").value = Number(service.cleanup || 0);
      control("color").value = service.color || DATA.settings.primaryColor;
      control("active").checked = service.active !== false;
      control("description").value = service.description || "";
    } else {
      control("duration").value = 120;
      control("price").value = 150000;
      control("prep").value = 10;
      control("cleanup").value = 10;
      control("color").value = DATA.settings.primaryColor;
      control("active").checked = true;
    }
    updateServicePreview();
    $("#serviceModal").classList.add("open");
    $("#serviceModal").setAttribute("aria-hidden", "false");
    setTimeout(() => control("name").focus(), 60);
  }

  function closeServiceModal() {
    $("#serviceModal").classList.remove("open");
    $("#serviceModal").setAttribute("aria-hidden", "true");
  }

  function updateServicePreview() {
    const form = $("#serviceForm");
    const get = name => form.elements.namedItem(name);
    const total = Number(get("duration").value || 0) + Number(get("prep").value || 0) + Number(get("cleanup").value || 0);
    $("#serviceBlockPreview").innerHTML = `La agenda bloqueará <strong>${total} minutos</strong> por cada reserva de este servicio.`;
  }

  function saveService(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const get = name => form.elements.namedItem(name);
    const id = Number(get("serviceId").value || 0);
    const payload = {
      name: get("name").value.trim(),
      duration: Number(get("duration").value),
      price: Number(get("price").value),
      prep: Number(get("prep").value),
      cleanup: Number(get("cleanup").value),
      color: get("color").value,
      active: get("active").checked,
      description: get("description").value.trim()
    };
    if (!payload.name) return alert("Escribe el nombre del servicio.");
    if (!Number.isFinite(payload.duration) || payload.duration < 5) return alert("La duración debe ser de al menos 5 minutos.");
    if (id) {
      const service = DATA.services.find(item => Number(item.id) === id);
      if (!service) return showToast("No se encontró el servicio a modificar");
      Object.assign(service, payload);
    } else {
      DATA.services.push({id:Math.max(0,...DATA.services.map(item=>Number(item.id)||0))+1, ...payload});
    }
    persist("services");
    closeServiceModal();
    populateServices();
    renderStaticViews();
    renderDashboard();
    showToast(id ? "Servicio modificado correctamente" : "Servicio creado");
  }

  function deleteService() {
    const id = Number($("#editingServiceId").value);
    if (!id) return;
    const hasHistory = DATA.appointments.some(item => item.serviceId === id) || DATA.visits.some(item => item.serviceId === id);
    if (hasHistory) {
      const service = serviceById(id);
      service.active = false;
      persist("services");
      closeServiceModal();
      renderStaticViews();
      populateServices();
      showToast("El servicio tiene historial: quedó pausado en vez de eliminarse");
      return;
    }
    if (!confirm("¿Eliminar definitivamente este servicio?")) return;
    DATA.services = DATA.services.filter(item => item.id !== id);
    persist("services");
    closeServiceModal();
    renderStaticViews();
    populateServices();
    showToast("Servicio eliminado");
  }

  // Búsqueda global
  function buildSearchResults(query) {
    const q = normalize(query);
    if (!q) return [];
    const results = [];
    DATA.clients.forEach(client => {
      const insight = clientInsights(client.id);
      const record = insight.record || {};
      const haystack = normalize([client.name,client.phone,client.instagram,client.email,client.favorite,client.note,insight.usualService?.name,record.design?.effect,record.design?.design,record.design?.curvature].join(" "));
      if (haystack.includes(q)) results.push({type:"client",id:client.id,title:client.name,subtitle:`${client.phone || "Sin teléfono"} · Habitual: ${insight.usualService?.name || "sin definir"}`,icon:"person-vcard"});
    });
    DATA.services.forEach(service => {
      if (normalize(`${service.name} ${service.description} ${service.price}`).includes(q)) results.push({type:"service",id:service.id,title:service.name,subtitle:`${money(service.price)} · bloque ${totalDuration(service)} min · ${service.active ? "disponible" : "pausado"}`,icon:"stars"});
    });
    DATA.appointments.forEach(appointment => {
      const service = serviceById(appointment.serviceId);
      if (normalize(`${appointment.client} ${service.name} ${appointment.source} ${appointment.notes} ${appointment.date} ${appointment.time}`).includes(q)) results.push({type:"appointment",id:appointment.id,title:`${appointment.client} · ${appointment.time}`,subtitle:`${dateLabel(appointment.date,{day:"2-digit",month:"2-digit",year:"numeric"})} · ${service.name}`,icon:"calendar-event"});
    });
    return results.slice(0, 12);
  }

  function renderSearchResults(query) {
    const box = $("#globalSearchResults");
    const results = buildSearchResults(query);
    if (!normalize(query)) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.innerHTML = results.length ? results.map(result => `<button type="button" class="search-result" data-result-type="${result.type}" data-result-id="${result.id}"><span class="search-result-icon"><i class="bi bi-${result.icon}"></i></span><span><strong>${esc(result.title)}</strong><small>${esc(result.subtitle)}</small></span><i class="bi bi-chevron-right"></i></button>`).join("") : `<div class="search-empty"><i class="bi bi-search"></i><strong>Sin resultados</strong><span>Prueba con nombre, teléfono, servicio, efecto o fecha.</span></div>`;
    $$('[data-result-type]', box).forEach(button => button.onclick = () => selectSearchResult(button.dataset.resultType, Number(button.dataset.resultId)));
  }

  function selectSearchResult(type, id) {
    $("#globalSearchResults").hidden = true;
    $("#globalSearch").value = "";
    if (type === "client") openClientRecord(id);
    if (type === "service") {
      navigate("services");
      requestAnimationFrame(() => {
        const card = $(`#service-${id}`);
        if (card) { card.classList.add("flash-highlight"); card.scrollIntoView({behavior:"smooth",block:"center"}); setTimeout(()=>card.classList.remove("flash-highlight"),1800); }
      });
    }
    if (type === "appointment") {
      const appointment = DATA.appointments.find(item => item.id === id);
      if (!appointment) return;
      selectedDate = appointment.date;
      activeFilter = "all";
      renderDashboard();
      navigate("dashboard");
      requestAnimationFrame(() => {
        const item = $(`#appointment-${id}`);
        if (item) { item.classList.add("flash-highlight"); item.scrollIntoView({behavior:"smooth",block:"center"}); setTimeout(()=>item.classList.remove("flash-highlight"),1800); }
      });
    }
  }

  // Configuración
  function saveSettings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedDays = $$('[name="workDays"]:checked', form).map(input => Number(input.value));
    Object.assign(DATA.settings, {
      userName: form.elements.userName.value.trim(),
      userEmail: form.elements.userEmail.value.trim(),
      role: "admin",
      studioPhone: form.elements.studioPhone.value.trim(),
      studioName: form.elements.studioName.value.trim(),
      city: form.elements.city.value.trim(),
      currency: form.elements.currency.value,
      defaultDeposit: Number(form.elements.defaultDeposit.value || 0),
      openingTime: form.elements.openingTime.value,
      closingTime: form.elements.closingTime.value,
      slotInterval: Number(form.elements.slotInterval.value),
      maintenanceDays: Number(form.elements.maintenanceDays.value),
      workDays: selectedDays,
      bookingEnabled: form.elements.bookingEnabled.checked,
      requireConsent: form.elements.requireConsent.checked,
      autoOpenConfirmationWhatsApp: form.elements.autoOpenConfirmationWhatsApp.checked,
      allowOptionalBookingDetails: form.elements.allowOptionalBookingDetails.checked,
      allowDepositProof: form.elements.allowDepositProof.checked,
      requireDepositChoice: form.elements.requireDepositChoice.checked,
      confirmationMessageTemplate: form.elements.confirmationMessageTemplate.value.trim() || DEFAULT_SETTINGS.confirmationMessageTemplate,
      primaryColor: form.elements.primaryColor.value,
      appearance: form.elements.appearance.value
    });
    localStorage.setItem("lashflow_theme", DATA.settings.appearance);
    persist("settings");
    applyAppearance();
    applyUserProfile();
    renderDashboard();
    renderStaticViews();
    showToast("Configuración guardada");
  }

  async function exportAllData() {
    const images = await imageDBGetAll();
    const bookingProofs = await bookingProofGetAll();
    const payload = {
      version: "4.0",
      exportedAt: new Date().toISOString(),
      settings: DATA.settings,
      services: DATA.services,
      clients: DATA.clients,
      records: DATA.records,
      visits: DATA.visits,
      appointments: DATA.appointments,
      images,
      bookingProofs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lashflow-respaldo-${todayISO}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Respaldo exportado");
  }

  async function importAllData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.clients) || !Array.isArray(payload.services)) throw new Error("Formato inválido");
      DATA.settings = {...DEFAULT_SETTINGS, ...(payload.settings || {})};
      ["services","clients","records","visits","appointments"].forEach(key => { if (Array.isArray(payload[key])) DATA[key] = payload[key]; });
      persist();
      if (Array.isArray(payload.images)) {
        await imageDBClear();
        for (const image of payload.images) await imageDBPut(image);
      }
      if (Array.isArray(payload.bookingProofs)) {
        await bookingProofClear();
        for (const proof of payload.bookingProofs) await bookingProofPut(proof);
      }
      normalizeData();
      applyAppearance();
      applyUserProfile();
      populateServices();
      renderDashboard();
      renderStaticViews();
      showToast("Datos importados correctamente");
    } catch (error) {
      console.error(error);
      alert("No se pudo importar el archivo. Verifica que sea un respaldo válido de LashFlow.");
    } finally {
      event.target.value = "";
    }
  }

  async function resetDemoData() {
    if (!confirm("Esto eliminará todos los cambios, clientas, fotos y servicios guardados en este navegador. ¿Continuar?")) return;
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem("lashflow_theme");
    await imageDBClear();
    await bookingProofClear();
    location.reload();
  }

  // IndexedDB para fotografías
  const IMAGE_DB = "lashflow_images_db";
  const IMAGE_STORE = "images";
  const BOOKING_PROOF_STORE = "bookingProofs";

  function openImageDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB no disponible"));
      const request = indexedDB.open(IMAGE_DB, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          const store = db.createObjectStore(IMAGE_STORE, {keyPath:"id"});
          store.createIndex("clientId", "clientId", {unique:false});
        }
        if (!db.objectStoreNames.contains(BOOKING_PROOF_STORE)) {
          const proofStore = db.createObjectStore(BOOKING_PROOF_STORE, {keyPath:"id"});
          proofStore.createIndex("appointmentId", "appointmentId", {unique:true});
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function imageDBPut(record) {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, "readwrite");
      tx.objectStore(IMAGE_STORE).put(record);
      tx.oncomplete = () => { db.close(); resolve(record); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function imageDBGet(id) {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, "readonly");
      const request = tx.objectStore(IMAGE_STORE).get(Number(id));
      request.onsuccess = () => { db.close(); resolve(request.result || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  }

  async function imageDBGetAll(clientId = null) {
    try {
      const db = await openImageDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IMAGE_STORE, "readonly");
        const store = tx.objectStore(IMAGE_STORE);
        const request = clientId == null ? store.getAll() : store.index("clientId").getAll(Number(clientId));
        request.onsuccess = () => { db.close(); resolve(request.result || []); };
        request.onerror = () => { db.close(); reject(request.error); };
      });
    } catch {
      return [];
    }
  }

  async function imageDBDelete(id) {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, "readwrite");
      tx.objectStore(IMAGE_STORE).delete(Number(id));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function imageDBClear() {
    try {
      const db = await openImageDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IMAGE_STORE, "readwrite");
        tx.objectStore(IMAGE_STORE).clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    } catch { /* sin datos */ }
  }

  async function bookingProofGetByAppointment(appointmentId) {
    try {
      const db = await openImageDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(BOOKING_PROOF_STORE, "readonly");
        const request = tx.objectStore(BOOKING_PROOF_STORE).index("appointmentId").get(Number(appointmentId));
        request.onsuccess = () => { db.close(); resolve(request.result || null); };
        request.onerror = () => { db.close(); reject(request.error); };
      });
    } catch { return null; }
  }

  async function bookingProofGetAll() {
    try {
      const db = await openImageDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(BOOKING_PROOF_STORE, "readonly");
        const request = tx.objectStore(BOOKING_PROOF_STORE).getAll();
        request.onsuccess = () => { db.close(); resolve(request.result || []); };
        request.onerror = () => { db.close(); reject(request.error); };
      });
    } catch { return []; }
  }

  async function bookingProofPut(record) {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BOOKING_PROOF_STORE, "readwrite");
      tx.objectStore(BOOKING_PROOF_STORE).put(record);
      tx.oncomplete = () => { db.close(); resolve(record); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function bookingProofDeleteByAppointment(appointmentId) {
    const proof = await bookingProofGetByAppointment(appointmentId);
    if (!proof) return;
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BOOKING_PROOF_STORE, "readwrite");
      tx.objectStore(BOOKING_PROOF_STORE).delete(proof.id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function bookingProofClear() {
    try {
      const db = await openImageDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(BOOKING_PROOF_STORE, "readwrite");
        tx.objectStore(BOOKING_PROOF_STORE).clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      });
    } catch { /* sin datos */ }
  }

  async function openDepositProof(appointmentId) {
    const proof = await bookingProofGetByAppointment(appointmentId);
    if (!proof?.dataUrl) return showToast("No se encontró el comprobante en este navegador");
    const appointment = DATA.appointments.find(item => Number(item.id) === Number(appointmentId));
    const win = window.open("", "_blank");
    if (win) win.document.write(`<title>Comprobante de ${esc(appointment?.client || "reserva")}</title><style>body{margin:0;background:#111;color:#fff;font-family:Arial;display:grid;place-items:center;min-height:100vh}main{text-align:center;padding:16px}img{max-width:100%;max-height:88vh;border-radius:12px}p{opacity:.75}</style><main><img src="${proof.dataUrl}" alt="Comprobante de seña"><p>${esc(appointment?.client || "Clienta")} · ${esc(proof.name || "Comprobante")}</p></main>`);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function compressImage(file) {
    const original = await fileToDataURL(file);
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = original;
    });
    const max = 1400;
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    const ratio = Math.min(1, max / Math.max(width, height));
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", .82);
  }

  async function uploadClientImages(fileList) {
    const files = [...(fileList || [])].filter(file => file.type.startsWith("image/"));
    if (!files.length || !currentRecordClientId) return;
    const progress = $("#photoUploadProgress");
    progress.hidden = false;
    const type = $("#photoType").value;
    const date = $("#photoDate").value || todayISO;
    const visitId = Number($("#photoVisit").value || 0) || null;
    const note = $("#photoNote").value.trim();
    const portfolio = $("#photoPortfolio").checked;
    try {
      for (const file of files) {
        const dataUrl = await compressImage(file);
        await imageDBPut({
          id: uid(), clientId: currentRecordClientId, visitId, type, date, note, portfolio,
          name:file.name, size:file.size, createdAt:new Date().toISOString(), dataUrl
        });
      }
      $("#photoNote").value = "";
      $("#cameraPhotoInput").value = "";
      $("#galleryPhotoInput").value = "";
      await refreshGallery(currentRecordClientId);
      await hydrateClientProfilePhoto(currentRecordClientId);
      showToast(`${files.length} fotografía(s) guardada(s)`);
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la imagen. Puede que el navegador no tenga espacio disponible.");
    } finally {
      progress.hidden = true;
    }
  }

  async function refreshGallery(clientId) {
    const gallery = $("#clientPhotoGallery");
    if (!gallery) return;
    const images = (await imageDBGetAll(clientId)).sort((a,b) => String(b.date || b.createdAt).localeCompare(String(a.date || a.createdAt)));
    const count = $("#clientPhotoCount");
    if (count) count.textContent = `${images.length} foto${images.length === 1 ? "" : "s"}`;
    gallery.innerHTML = images.length ? images.map(image => `<article class="photo-card">
      <button type="button" class="photo-open" onclick="window.openPhoto(${image.id})"><img src="${image.dataUrl}" alt="${esc(image.type)} de ${esc(clientById(clientId)?.name)}"></button>
      <div class="photo-card-body"><div class="photo-card-heading"><span class="badge">${esc(image.type)}</span><span>${dateLabel(image.date,{day:"2-digit",month:"2-digit",year:"numeric"})}</span></div><p>${esc(image.note || "Sin descripción")}</p><div class="meta-row">${image.portfolio ? '<span class="badge status-complete">Portafolio</span>' : '<span class="badge">Privada</span>'}${clientById(clientId)?.coverPhotoId === image.id ? '<span class="badge status-complete">Portada</span>' : ""}</div><div class="photo-card-actions"><button type="button" class="text-btn" onclick="window.setCoverPhoto(${image.id})">Usar como portada</button><button type="button" class="icon-btn" onclick="window.removePhoto(${image.id})"><i class="bi bi-trash3"></i></button></div></div>
    </article>`).join("") : `<div class="empty-photo-state"><i class="bi bi-camera"></i><strong>Aún no hay fotografías</strong><p>Toma una foto desde el celular o elige imágenes de la galería.</p></div>`;
  }

  async function hydrateClientProfilePhoto(clientId) {
    const target = $("#clientProfilePhoto");
    if (!target) return;
    const client = clientById(clientId);
    const images = await imageDBGetAll(clientId);
    const cover = client?.coverPhotoId ? images.find(image => image.id === client.coverPhotoId) : images[0];
    if (cover) target.innerHTML = `<img src="${cover.dataUrl}" alt="Foto de ${esc(client.name)}"><button type="button" onclick="window.activateGallery()"><i class="bi bi-camera"></i></button>`;
  }

  async function hydrateClientCardPhotos() {
    const elements = $$('[data-client-photo]');
    for (const element of elements) {
      const clientId = Number(element.dataset.clientPhoto);
      const client = clientById(clientId);
      if (!client?.coverPhotoId) continue;
      try {
        const image = await imageDBGet(client.coverPhotoId);
        if (image) element.innerHTML = `<img src="${image.dataUrl}" alt="Foto de ${esc(client.name)}">`;
      } catch {
        // La ficha sigue funcionando aunque el navegador bloquee IndexedDB.
      }
    }
  }

  async function setCoverPhoto(imageId) {
    const image = await imageDBGet(imageId);
    if (!image) return;
    const client = clientById(image.clientId);
    client.coverPhotoId = image.id;
    persist("clients");
    await refreshGallery(image.clientId);
    await hydrateClientProfilePhoto(image.clientId);
    renderClients();
    showToast("Foto de portada actualizada");
  }

  async function removePhoto(imageId) {
    const image = await imageDBGet(imageId);
    if (!image || !confirm("¿Eliminar esta fotografía?")) return;
    await imageDBDelete(imageId);
    const client = clientById(image.clientId);
    if (client?.coverPhotoId === imageId) delete client.coverPhotoId;
    persist("clients");
    await refreshGallery(image.clientId);
    await hydrateClientProfilePhoto(image.clientId);
    renderClients();
    showToast("Fotografía eliminada");
  }

  async function openPhoto(imageId) {
    const image = await imageDBGet(imageId);
    if (!image) return;
    const win = window.open("", "_blank");
    if (win) win.document.write(`<title>${esc(image.type)}</title><style>body{margin:0;background:#111;display:grid;place-items:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style><img src="${image.dataUrl}" alt="${esc(image.type)}">`);
  }

  // Exponer acciones usadas por HTML dinámico
  window.showToast = showToast;
  window.openClientRecord = openClientRecord;
  window.openWhatsApp = openWhatsApp;
  window.repeatClientService = repeatClientService;
  window.newAppointmentForClient = clientId => { closeRecordModal(); openAppointmentModal({clientId}); };
  window.editAppointment = id => openAppointmentModal({appointmentId:id});
  window.editService = openServiceModal;
  window.editVisit = editVisit;
  window.deleteVisit = deleteVisit;
  window.repeatVisit = repeatVisit;
  window.setCoverPhoto = setCoverPhoto;
  window.removePhoto = removePhoto;
  window.openPhoto = openPhoto;
  window.activateGallery = () => activateRecordTab("gallery");
  window.openConfirmationWhatsApp = openConfirmationWhatsApp;
  window.openDepositProof = openDepositProof;
  window.focusBookingRequest = id => {
    const popover = $("#notificationPopover");
    if (popover) popover.hidden = true;
    navigate("dashboard");
    requestAnimationFrame(() => {
      const card = $(`#request-${Number(id)}`);
      if (card) {
        card.scrollIntoView({behavior:"smooth",block:"center"});
        card.classList.add("flash-highlight");
        setTimeout(() => card.classList.remove("flash-highlight"), 1900);
      }
    });
  };
  window.confirmAppointment = id => {
    const appointment = DATA.appointments.find(item => item.id === Number(id));
    if (!appointment) return showToast("No se encontró la cita");
    appointment.status = "confirmed";
    appointment.confirmedAt = new Date().toISOString();
    appointment.confirmedBy = DATA.settings.userName;
    persist("appointments");
    if (DATA.settings.autoOpenConfirmationWhatsApp) {
      openConfirmationWhatsApp(id, true);
      renderStaticViews();
    } else {
      renderDashboard();
      renderStaticViews();
      showToast("Cita confirmada");
    }
  };
  window.rejectAppointment = id => {
    const appointment = DATA.appointments.find(item => item.id === Number(id));
    if (!appointment || !confirm(`¿Rechazar la solicitud de ${appointment.client}? El horario volverá a quedar disponible.`)) return;
    appointment.status = "rejected";
    appointment.rejectedAt = new Date().toISOString();
    appointment.rejectedBy = DATA.settings.userName;
    persist("appointments");
    renderDashboard();
    renderStaticViews();
    showToast("Solicitud rechazada");
  };
  window.deleteAppointment = async id => {
    if (confirm("¿Eliminar esta cita?")) {
      DATA.appointments = DATA.appointments.filter(item => item.id !== Number(id));
      persist("appointments");
      await bookingProofDeleteByAppointment(id);
      renderDashboard();
      renderStaticViews();
      showToast("Cita eliminada");
    }
  };

  // Eventos fijos
  $("#appointmentForm").addEventListener("submit", event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const client = upsertClient(String(formData.get("client") || "").trim(), String(formData.get("phone") || "").trim());
    const payload = {
      clientId:client.id, client:client.name, phone:client.phone,
      serviceId:Number(formData.get("service")), source:formData.get("source"), date:formData.get("date"),
      time:formData.get("time"), status:formData.get("status"), deposit:Number(formData.get("deposit") || 0),
      notes:formData.get("notes"), formStatus:client.formStatus
    };
    const edited = Boolean(editingAppointmentId);
    let savedAppointment = null;
    let confirmedFromRequest = false;
    if (editingAppointmentId) {
      const appointment = DATA.appointments.find(item => item.id === Number(editingAppointmentId));
      if (appointment) {
        confirmedFromRequest = appointment.status === "requested" && payload.status === "confirmed";
        Object.assign(appointment, payload);
        if (confirmedFromRequest) {
          appointment.confirmedAt = new Date().toISOString();
          appointment.confirmedBy = DATA.settings.userName;
        }
        savedAppointment = appointment;
      }
    } else {
      savedAppointment = {id:uid(), ...payload};
      DATA.appointments.push(savedAppointment);
    }
    persist("appointments", "clients");
    selectedDate = String(formData.get("date"));
    closeAppointmentModal();
    event.currentTarget.reset();
    populateServices();
    if (confirmedFromRequest && DATA.settings.autoOpenConfirmationWhatsApp && savedAppointment) {
      openConfirmationWhatsApp(savedAppointment.id, true);
      renderStaticViews();
    } else {
      renderDashboard();
      renderStaticViews();
      showToast(edited ? "Cita modificada" : "Cita guardada y vinculada a la ficha");
    }
  });

  $("#recordForm").addEventListener("submit", saveRecord);
  $("#serviceForm").addEventListener("submit", saveService);
  $("#recordTabs").addEventListener("click", event => {
    const button = event.target.closest("[data-record-tab]");
    if (button) activateRecordTab(button.dataset.recordTab);
  });
  $$('[data-close-record]').forEach(button => button.onclick = closeRecordModal);
  $("#recordModal").onclick = event => { if (event.target === event.currentTarget) closeRecordModal(); };
  $("#printRecordBtn").onclick = () => window.print();
  $("#copyFormLinkBtn").onclick = copyCurrentFormLink;
  $$('[data-close-service]').forEach(button => button.onclick = closeServiceModal);
  $("#serviceModal").onclick = event => { if (event.target === event.currentTarget) closeServiceModal(); };
  $("#deleteServiceBtn").onclick = deleteService;
  $$('[name="duration"],[name="prep"],[name="cleanup"]', $("#serviceForm")).forEach(input => input.addEventListener("input", updateServicePreview));

  $$(".nav-link[data-view]").forEach(button => button.onclick = () => {
    if (button.hidden) return;
    $$(".nav-link").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    $$(".view").forEach(view => view.classList.remove("active"));
    $(`#${button.dataset.view}View`).classList.add("active");
    $("#sidebar").classList.remove("open");
    if (button.dataset.view === "settings") renderSettings();
  });

  $$('[data-jump]').forEach(button => button.onclick = () => navigate(button.dataset.jump));
  $$(".segmented button").forEach(button => button.onclick = () => {
    $$(".segmented button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderDashboard();
  });

  $("#prevDay").onclick = () => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() - 1);
    selectedDate = date.toISOString().slice(0, 10);
    renderDashboard();
  };
  $("#nextDay").onclick = () => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + 1);
    selectedDate = date.toISOString().slice(0, 10);
    renderDashboard();
  };
  $("#themeToggle").onclick = () => {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    DATA.settings.appearance = next;
    localStorage.setItem("lashflow_theme", next);
    persist("settings");
    applyAppearance();
    renderSettings();
  };
  $("#adminSettingsBtn").onclick = () => navigate("settings");
  $("#menuToggle").onclick = () => $("#sidebar").classList.toggle("open");
  $("#newAppointmentBtn").onclick = () => openAppointmentModal();
  $$('[data-close-modal]').forEach(button => button.onclick = closeAppointmentModal);
  $("#appointmentModal").onclick = event => { if (event.target === event.currentTarget) closeAppointmentModal(); };
  $("#serviceSelect").onchange = () => updateAvailableTimes();
  $("#appointmentDate").onchange = () => updateAvailableTimes();
  $("#appointmentClientInput").addEventListener("input", event => {
    const value = normalize(event.target.value);
    const client = DATA.clients.find(item => normalize(item.name) === value || normalize(item.phone) === value);
    if (client) {
      $("#appointmentPhoneInput").value = client.phone || "";
      fillAppointmentForClient(client.id);
    } else showAppointmentClientHint(null);
  });

  $("#globalSearch").addEventListener("input", event => renderSearchResults(event.target.value));
  $("#globalSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      const first = $("#globalSearchResults [data-result-type]");
      if (first) first.click();
    }
    if (event.key === "Escape") $("#globalSearchResults").hidden = true;
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("#globalSearch").focus();
    }
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrap")) $("#globalSearchResults").hidden = true;
    if (notificationPopover && !event.target.closest("#notificationPopover") && !event.target.closest("#notificationBtn")) notificationPopover.hidden = true;
  });

  const notificationBtn = $("#notificationBtn");
  const notificationPopover = $("#notificationPopover");
  if (notificationBtn && notificationPopover) notificationBtn.onclick = event => {
    event.stopPropagation();
    notificationPopover.hidden = !notificationPopover.hidden;
  };
  $("#closeNotificationPopover")?.addEventListener("click", () => { notificationPopover.hidden = true; });
  $("#viewAllRequestsBtn")?.addEventListener("click", () => {
    notificationPopover.hidden = true;
    navigate("dashboard");
    $("#bookingRequestsPanel")?.scrollIntoView({behavior:"smooth", block:"start"});
  });

  let syncTimer = null;
  function reloadSharedData(notify = false) {
    const previousRequests = DATA.appointments.filter(item => item.status === "requested").length;
    DATA.appointments = loadArray(KEYS.appointments, DATA.appointments);
    sharedAppointmentsSnapshot = localStorage.getItem(KEYS.appointments) || JSON.stringify(DATA.appointments);
    DATA.clients = loadArray(KEYS.clients, DATA.clients);
    DATA.records = loadArray(KEYS.records, DATA.records);
    DATA.visits = loadArray(KEYS.visits, DATA.visits);
    DATA.services = loadArray(KEYS.services, DATA.services);
    DATA.settings = loadObject(KEYS.settings, DEFAULT_SETTINGS);
    normalizeData();
    applyAppearance();
    applyUserProfile();
    populateServices();
    renderDashboard();
    renderStaticViews();
    const currentRequests = DATA.appointments.filter(item => item.status === "requested").length;
    if (notify && currentRequests > previousRequests) showToast("Nueva solicitud de cita recibida");
  }

  function scheduleSharedReload(notify = false) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => reloadSharedData(notify), 80);
  }

  window.addEventListener("storage", event => {
    if (Object.values(KEYS).includes(event.key) || event.key === "lashflow_demo_sync") scheduleSharedReload(event.key === KEYS.appointments || event.key === "lashflow_demo_sync");
  });
  if ("BroadcastChannel" in window) {
    const syncChannel = new BroadcastChannel("lashflow-sync");
    syncChannel.onmessage = event => scheduleSharedReload(event.data?.type === "appointment-requested");
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleSharedReload(false);
  });
  window.addEventListener("focus", () => scheduleSharedReload(false));
  window.addEventListener("pageshow", () => scheduleSharedReload(false));
  setInterval(() => {
    if (document.hidden) return;
    const currentSnapshot = localStorage.getItem(KEYS.appointments) || "";
    if (currentSnapshot !== sharedAppointmentsSnapshot) reloadSharedData(true);
  }, 2500);

  applyAppearance();
  applyUserProfile();
  populateServices();
  renderDashboard();
  renderStaticViews();
})();
