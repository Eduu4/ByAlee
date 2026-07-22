(() => {
  "use strict";

  const TABLES = {
    services: "services",
    clients: "clients",
    records: "client_records",
    appointments: "appointments",
    visits: "visits",
    inventory: "inventory_items",
    availabilityBlocks: "availability_blocks"
  };

  const state = {
    configured: false,
    client: null,
    user: null,
    profile: null,
    studioId: null,
    syncTimers: new Map(),
    channel: null
  };

  const normalizePhone = value => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.startsWith("0") ? `595${digits.slice(1)}` : digits;
  };

  const timeToMinutes = value => {
    const [hours, minutes] = String(value || "00:00").slice(0, 5).split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const totalDuration = service => Number(service?.duration || 0) + Number(service?.prep || 0) + Number(service?.cleanup || 0);

  async function init() {
    const platform = await window.ByAleePlatform.ready;
    if (!platform.configured || !platform.client) return false;
    state.configured = true;
    state.client = platform.client;
    return true;
  }

  async function getSessionProfile() {
    if (!(await init())) return null;
    const { data: sessionData, error: sessionError } = await state.client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user) return null;
    state.user = sessionData.session.user;
    const { data: profile, error } = await state.client
      .from("profiles")
      .select("studio_id,full_name,role,active")
      .eq("id", state.user.id)
      .single();
    if (error) throw error;
    if (!profile?.active) throw new Error("Este usuario está desactivado.");
    state.profile = profile;
    state.studioId = profile.studio_id;
    return { user: state.user, profile };
  }

  function rowsToData(rows, extra = () => ({})) {
    return (rows || []).map(row => ({ ...row.data, id: Number(row.id), ...extra(row) }));
  }

  async function loadAdminData(defaultSettings = {}) {
    const session = await getSessionProfile();
    if (!session) return null;
    const studioId = state.studioId;

    const [settings, services, clients, records, appointments, visits, inventory, blocks] = await Promise.all([
      state.client.from("studio_settings").select("data").eq("studio_id", studioId).maybeSingle(),
      state.client.from("services").select("id,name,category,active,data").eq("studio_id", studioId).order("id"),
      state.client.from("clients").select("id,full_name,whatsapp,birth_date,birthday_marketing_consent,data").eq("studio_id", studioId).order("id"),
      state.client.from("client_records").select("id,client_id,data").eq("studio_id", studioId).order("id"),
      state.client.from("appointments").select("id,client_id,service_id,date,time,start_minute,end_minute,status,data").eq("studio_id", studioId).order("date", { ascending: true }).order("time", { ascending: true }),
      state.client.from("visits").select("id,client_id,service_id,appointment_id,date,data").eq("studio_id", studioId).order("date", { ascending: false }),
      state.client.from("inventory_items").select("id,name,category,priority,stock,minimum_stock,data").eq("studio_id", studioId).order("priority", { ascending: false }).order("name"),
      state.client.from("availability_blocks").select("id,date,start_minute,end_minute,all_day,reason,data").eq("studio_id", studioId).order("date")
    ]);

    const error = [settings.error, services.error, clients.error, records.error, appointments.error, visits.error, inventory.error, blocks.error].find(Boolean);
    if (error) throw error;

    return {
      settings: {
        ...defaultSettings,
        ...(settings.data?.data || {}),
        userName: state.profile.full_name || settings.data?.data?.userName || "ByAlee",
        userEmail: state.user.email || settings.data?.data?.userEmail || "",
        role: state.profile.role || "admin"
      },
      services: rowsToData(services.data, row => ({ name: row.name, category: row.category, active: row.active })),
      clients: rowsToData(clients.data, row => ({
        name: row.full_name,
        phone: row.whatsapp,
        birthDate: row.birth_date || row.data?.birthDate || "",
        birthdayMarketingConsent: row.birthday_marketing_consent
      })),
      records: rowsToData(records.data, row => ({ clientId: Number(row.client_id) })),
      appointments: rowsToData(appointments.data, row => ({
        clientId: row.client_id == null ? null : Number(row.client_id),
        serviceId: Number(row.service_id),
        date: row.date,
        time: String(row.time || "").slice(0, 5),
        status: row.status,
        startMinute: row.start_minute,
        endMinute: row.end_minute
      })),
      visits: rowsToData(visits.data, row => ({
        clientId: Number(row.client_id),
        serviceId: row.service_id == null ? null : Number(row.service_id),
        appointmentId: row.appointment_id == null ? null : Number(row.appointment_id),
        date: row.date
      })),
      inventory: rowsToData(inventory.data, row => ({
        name: row.name,
        category: row.category,
        priority: row.priority,
        stock: Number(row.stock),
        min: Number(row.minimum_stock)
      })),
      availabilityBlocks: rowsToData(blocks.data, row => ({
        date: row.date,
        allDay: row.all_day,
        startMinute: row.start_minute,
        endMinute: row.end_minute,
        reason: row.reason
      }))
    };
  }

  async function upsertSettings(settings) {
    const { error } = await state.client.from("studio_settings").upsert({
      studio_id: state.studioId,
      data: settings
    }, { onConflict: "studio_id" });
    if (error) throw error;
  }

  async function upsertServices(items) {
    if (!items.length) return;
    const rows = items.map(item => ({
      id: Number(item.id),
      studio_id: state.studioId,
      name: item.name,
      category: item.category || "Pestañas",
      active: item.active !== false,
      data: item
    }));
    const { error } = await state.client.from("services").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  async function upsertClients(items) {
    if (!items.length) return;
    const rows = items.map(item => ({
      id: Number(item.id),
      studio_id: state.studioId,
      full_name: item.name || "Clienta",
      whatsapp: item.phone || "",
      phone_key: normalizePhone(item.phone) || `sin-telefono-${item.id}`,
      birth_date: item.birthDate || null,
      birthday_marketing_consent: Boolean(item.birthdayMarketingConsent),
      data: item
    }));
    const { error } = await state.client.from("clients").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  async function upsertRecords(items) {
    if (!items.length) return;
    const rows = items.map(item => ({
      studio_id: state.studioId,
      client_id: Number(item.clientId),
      data: item
    }));
    const { error } = await state.client.from("client_records").upsert(rows, { onConflict: "studio_id,client_id" });
    if (error) throw error;
  }

  async function upsertAppointments(items, services) {
    if (!items.length) return;
    const serviceMap = new Map((services || []).map(service => [Number(service.id), service]));
    const rows = items.map(item => {
      const service = serviceMap.get(Number(item.serviceId));
      const startMinute = Number.isFinite(Number(item.startMinute)) ? Number(item.startMinute) : timeToMinutes(item.time);
      const endMinute = Number.isFinite(Number(item.endMinute)) && Number(item.endMinute) > startMinute
        ? Number(item.endMinute)
        : startMinute + totalDuration(service);
      return {
        id: Number(item.id),
        studio_id: state.studioId,
        client_id: item.clientId ? Number(item.clientId) : null,
        service_id: Number(item.serviceId),
        date: item.date,
        time: item.time,
        start_minute: startMinute,
        end_minute: endMinute,
        status: item.status || "pending",
        data: { ...item, startMinute, endMinute }
      };
    });
    const { error } = await state.client.from("appointments").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  async function upsertVisits(items) {
    if (!items.length) return;
    const rows = items.map(item => ({
      id: Number(item.id),
      studio_id: state.studioId,
      client_id: Number(item.clientId),
      service_id: item.serviceId ? Number(item.serviceId) : null,
      appointment_id: item.appointmentId ? Number(item.appointmentId) : null,
      date: item.date,
      data: item
    }));
    const { error } = await state.client.from("visits").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  async function upsertInventory(items) {
    if (!items.length) return;
    const rows = items.map(item => ({
      id: Number(item.id),
      studio_id: state.studioId,
      name: item.name,
      category: item.category || "Otros",
      priority: item.priority || "professional",
      stock: Number(item.stock || 0),
      minimum_stock: Number(item.min || 0),
      data: item
    }));
    const { error } = await state.client.from("inventory_items").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  async function upsertBlocks(items) {
    if (!items.length) return;
    const rows = items.map(item => {
      const allDay = Boolean(item.allDay);
      const startMinute = allDay ? 0 : (Number.isFinite(Number(item.startMinute)) ? Number(item.startMinute) : timeToMinutes(item.startTime));
      const endMinute = allDay ? 1440 : (Number.isFinite(Number(item.endMinute)) ? Number(item.endMinute) : timeToMinutes(item.endTime));
      return {
        id: Number(item.id),
        studio_id: state.studioId,
        date: item.date,
        start_minute: startMinute,
        end_minute: endMinute,
        all_day: allDay,
        reason: item.reason || "Horario no disponible",
        data: { ...item, startMinute, endMinute }
      };
    });
    const { error } = await state.client.from("availability_blocks").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  async function syncNow(type, DATA) {
    if (!state.configured || !state.studioId) return;
    switch (type) {
      case "settings": return upsertSettings(DATA.settings);
      case "services": return upsertServices(DATA.services || []);
      case "clients": return upsertClients(DATA.clients || []);
      case "records": return upsertRecords(DATA.records || []);
      case "appointments": return upsertAppointments(DATA.appointments || [], DATA.services || []);
      case "visits": return upsertVisits(DATA.visits || []);
      case "inventory": return upsertInventory(DATA.inventory || []);
      case "availabilityBlocks": return upsertBlocks(DATA.availabilityBlocks || []);
      default: return undefined;
    }
  }

  function scheduleSync(types, DATA) {
    if (!state.configured || !state.studioId) return;
    for (const type of types) {
      clearTimeout(state.syncTimers.get(type));
      const timer = setTimeout(async () => {
        try {
          await syncNow(type, DATA);
          window.dispatchEvent(new CustomEvent("byalee:sync", { detail: { type, ok: true } }));
        } catch (error) {
          console.error(`No se pudo sincronizar ${type}:`, error);
          window.dispatchEvent(new CustomEvent("byalee:sync", { detail: { type, ok: false, error } }));
        }
      }, 220);
      state.syncTimers.set(type, timer);
    }
  }

  async function deleteItem(type, id) {
    const table = TABLES[type];
    if (!table || !state.configured) return;
    const { error } = await state.client.from(table).delete().eq("studio_id", state.studioId).eq("id", Number(id));
    if (error) throw error;
  }

  async function reloadAppointments() {
    if (!state.configured) return [];
    const { data, error } = await state.client
      .from("appointments")
      .select("id,client_id,service_id,date,time,start_minute,end_minute,status,data")
      .eq("studio_id", state.studioId)
      .order("date")
      .order("time");
    if (error) throw error;
    return rowsToData(data, row => ({
      clientId: row.client_id == null ? null : Number(row.client_id),
      serviceId: Number(row.service_id),
      date: row.date,
      time: String(row.time || "").slice(0, 5),
      status: row.status,
      startMinute: row.start_minute,
      endMinute: row.end_minute
    }));
  }

  function subscribeAppointments(callback) {
    if (!state.configured || !state.studioId) return;
    if (state.channel) state.client.removeChannel(state.channel);
    state.channel = state.client
      .channel(`byalee-appointments-${state.studioId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `studio_id=eq.${state.studioId}`
      }, payload => callback?.(payload))
      .subscribe();
  }

  function dataUrlToBlob(dataUrl) {
    const [header, base64] = String(dataUrl).split(",");
    const mimeType = /data:([^;]+)/.exec(header)?.[1] || "image/jpeg";
    const binary = atob(base64 || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }

  async function signedMedia(row) {
    const { data, error } = await state.client.storage.from("byalee-private").createSignedUrl(row.storage_path, 3600);
    if (error) throw error;
    return {
      ...row.data,
      id: Number(row.id),
      clientId: row.client_id == null ? null : Number(row.client_id),
      visitId: row.visit_id == null ? null : Number(row.visit_id),
      appointmentId: row.appointment_id == null ? null : Number(row.appointment_id),
      dataUrl: data.signedUrl,
      storagePath: row.storage_path,
      kind: row.kind
    };
  }

  async function mediaPut(record, kind = "client_photo") {
    if (!state.configured || !record?.dataUrl) return null;
    const blob = dataUrlToBlob(record.dataUrl);
    const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const folder = kind === "booking_proof" ? "booking-proofs" : `clients/${record.clientId}`;
    const path = `${state.studioId}/${folder}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await state.client.storage.from("byalee-private").upload(path, blob, {
      contentType: blob.type,
      upsert: false,
      cacheControl: "3600"
    });
    if (uploadError) throw uploadError;
    const { data, error } = await state.client.from("media_files").insert({
      studio_id: state.studioId,
      client_id: record.clientId ? Number(record.clientId) : null,
      visit_id: record.visitId ? Number(record.visitId) : null,
      appointment_id: record.appointmentId ? Number(record.appointmentId) : null,
      kind,
      storage_path: path,
      data: { ...record, dataUrl: undefined }
    }).select("id,client_id,visit_id,appointment_id,kind,storage_path,data").single();
    if (error) throw error;
    return signedMedia(data);
  }

  async function mediaGetAll(clientId = null, kind = "client_photo") {
    if (!state.configured) return [];
    let query = state.client.from("media_files").select("id,client_id,visit_id,appointment_id,kind,storage_path,data").eq("studio_id", state.studioId).eq("kind", kind).order("created_at", { ascending: false });
    if (clientId != null) query = query.eq("client_id", Number(clientId));
    const { data, error } = await query;
    if (error) throw error;
    return Promise.all((data || []).map(signedMedia));
  }

  async function mediaGet(id) {
    if (!state.configured) return null;
    const { data, error } = await state.client.from("media_files").select("id,client_id,visit_id,appointment_id,kind,storage_path,data").eq("studio_id", state.studioId).eq("id", Number(id)).maybeSingle();
    if (error) throw error;
    return data ? signedMedia(data) : null;
  }

  async function mediaDelete(id) {
    const { data, error } = await state.client.from("media_files").select("storage_path").eq("studio_id", state.studioId).eq("id", Number(id)).maybeSingle();
    if (error) throw error;
    if (!data) return;
    await state.client.storage.from("byalee-private").remove([data.storage_path]);
    const { error: deleteError } = await state.client.from("media_files").delete().eq("studio_id", state.studioId).eq("id", Number(id));
    if (deleteError) throw deleteError;
  }

  async function bookingProofGetByAppointment(appointmentId) {
    if (!state.configured) return null;
    const { data, error } = await state.client.from("media_files").select("id,client_id,appointment_id,kind,storage_path,data").eq("studio_id", state.studioId).eq("kind", "booking_proof").eq("appointment_id", Number(appointmentId)).maybeSingle();
    if (error) throw error;
    return data ? signedMedia(data) : null;
  }

  async function bookingProofDeleteByAppointment(appointmentId) {
    const proof = await bookingProofGetByAppointment(appointmentId);
    if (proof) await mediaDelete(proof.id);
  }

  async function clearMedia(kind = null) {
    if (!state.configured) return;
    let query = state.client.from("media_files").select("id,storage_path").eq("studio_id", state.studioId);
    if (kind) query = query.eq("kind", kind);
    const { data, error } = await query;
    if (error) throw error;
    const paths = (data || []).map(row => row.storage_path);
    if (paths.length) await state.client.storage.from("byalee-private").remove(paths);
    if (data?.length) {
      const ids = data.map(row => row.id);
      await state.client.from("media_files").delete().in("id", ids).eq("studio_id", state.studioId);
    }
  }

  window.ByAleeDB = {
    state,
    init,
    getSessionProfile,
    loadAdminData,
    scheduleSync,
    syncNow,
    deleteItem,
    reloadAppointments,
    subscribeAppointments,
    isRemote: () => Boolean(state.configured && state.studioId),
    mediaPut,
    mediaGetAll,
    mediaGet,
    mediaDelete,
    clearMedia,
    bookingProofGetByAppointment,
    bookingProofDeleteByAppointment,
    bookingProofPut: record => mediaPut(record, "booking_proof"),
    bookingProofGetAll: () => mediaGetAll(null, "booking_proof")
  };
})();
