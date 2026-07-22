import {
  allowMethods,
  createAdminClient,
  dateOnly,
  dayOfWeek,
  getStudio,
  generateNumericId,
  json,
  normalizePhone,
  overlaps,
  parseBody,
  safeError,
  timeToMinutes,
  todayInTimeZone
} from "../lib/supabase-server.js";

const ACTIVE_STATUSES = ["requested", "pending", "confirmed"];
const MAX_PROOF_BYTES = 2_500_000;

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!match) fail("El comprobante debe ser una imagen JPG, PNG o WebP.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_PROOF_BYTES) fail("El comprobante supera el tamaño permitido de 2,5 MB.");
  return { buffer, mimeType: match[1], extension: match[1].split("/")[1].replace("jpeg", "jpg") };
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  try {
    const body = parseBody(req);
    const admin = createAdminClient();
    const studio = await getStudio(admin);

    const name = cleanText(body.name, 160);
    const phone = cleanText(body.phone, 40);
    const phoneKey = normalizePhone(phone);
    const date = dateOnly(body.date);
    const time = cleanText(body.time, 5);
    const serviceId = Number(body.serviceId);

    if (name.length < 2) fail("Ingresá tu nombre y apellido.");
    if (phoneKey.length < 7) fail("Ingresá un número de WhatsApp válido.");
    if (!date) fail("La fecha seleccionada no es válida.");
    if (!Number.isInteger(serviceId) || serviceId <= 0) fail("Seleccioná un servicio válido.");

    const today = todayInTimeZone(studio.timezone || "America/Asuncion");
    if (date < today) fail("No se puede reservar una fecha pasada.");

    const [settingsResult, serviceResult] = await Promise.all([
      admin.from("studio_settings").select("data").eq("studio_id", studio.id).single(),
      admin.from("services").select("id,data,active").eq("studio_id", studio.id).eq("id", serviceId).single()
    ]);
    if (settingsResult.error) throw settingsResult.error;
    if (serviceResult.error || !serviceResult.data?.active) fail("El servicio ya no está disponible.", 409);

    const settings = settingsResult.data?.data || {};
    const service = { ...serviceResult.data.data, id: Number(serviceResult.data.id) };
    if (settings.bookingEnabled === false) fail("Las reservas online están temporalmente pausadas.", 409);

    const startMinute = timeToMinutes(time);
    if (!Number.isFinite(startMinute)) fail("Seleccioná un horario válido.");
    const duration = Number(service.duration || 0) + Number(service.prep || 0) + Number(service.cleanup || 0);
    const endMinute = startMinute + duration;
    const opening = timeToMinutes(settings.openingTime || "08:00");
    const closing = timeToMinutes(settings.closingTime || "20:00");
    const interval = Number(settings.slotInterval || 30);
    const workDays = Array.isArray(settings.workDays) ? settings.workDays.map(Number) : [1,2,3,4,5,6];

    if (!workDays.includes(dayOfWeek(date))) fail("ByAlee no atiende el día seleccionado.", 409);
    if (startMinute < opening || endMinute > closing) fail("El horario no entra dentro de la jornada configurada.", 409);
    if ((startMinute - opening) % interval !== 0) fail("El horario no coincide con los intervalos configurados.", 409);

    if (settings.requirePoliciesAcceptance !== false && !body.policiesAccepted) fail("Debés aceptar las políticas del local.");
    if (settings.requireConsent !== false && !body.consentAccepted) fail("Debés aceptar el consentimiento informado.");
    if (settings.requireDepositChoice !== false && !["whatsapp", "proof"].includes(body.depositMethod)) fail("Elegí cómo confirmarás la seña.");
    if (body.depositMethod === "proof" && !body.proofData?.dataUrl) fail("Adjuntá el comprobante de la seña.");

    const [blocksResult, appointmentsResult] = await Promise.all([
      admin.from("availability_blocks").select("start_minute,end_minute,all_day").eq("studio_id", studio.id).eq("date", date),
      admin.from("appointments").select("start_minute,end_minute").eq("studio_id", studio.id).eq("date", date).in("status", ACTIVE_STATUSES)
    ]);
    if (blocksResult.error) throw blocksResult.error;
    if (appointmentsResult.error) throw appointmentsResult.error;

    const blocked = (blocksResult.data || []).some(block => block.all_day || overlaps(startMinute, endMinute, block.start_minute, block.end_minute));
    const occupied = (appointmentsResult.data || []).some(item => overlaps(startMinute, endMinute, item.start_minute, item.end_minute));
    if (blocked || occupied) fail("Ese horario acaba de ocuparse. Elegí otro horario disponible.", 409);

    const existingClientResult = await admin
      .from("clients")
      .select("id,data")
      .eq("studio_id", studio.id)
      .eq("phone_key", phoneKey)
      .maybeSingle();
    if (existingClientResult.error) throw existingClientResult.error;

    const clientPayload = {
      ...(existingClientResult.data?.data || {}),
      name,
      phone,
      birthDate: dateOnly(body.birthDate) || "",
      birthdayMarketingConsent: Boolean(body.birthdayConsent && body.birthDate),
      email: cleanText(body.email, 180),
      instagram: cleanText(body.instagram, 120),
      address: cleanText(body.address, 300),
      firstTime: body.firstTimeArea === "yes",
      note: existingClientResult.data?.data?.note || "Ficha creada desde la reserva pública",
      formStatus: "pending",
      updatedAt: new Date().toISOString()
    };

    let clientId;
    if (existingClientResult.data) {
      clientId = Number(existingClientResult.data.id);
      const { error } = await admin.from("clients").update({
        full_name: name,
        whatsapp: phone,
        phone_key: phoneKey,
        birth_date: clientPayload.birthDate || null,
        birthday_marketing_consent: clientPayload.birthdayMarketingConsent,
        data: clientPayload
      }).eq("id", clientId).eq("studio_id", studio.id);
      if (error) throw error;
    } else {
      clientId = generateNumericId();
      const { data, error } = await admin.from("clients").insert({
        id: clientId,
        studio_id: studio.id,
        full_name: name,
        whatsapp: phone,
        phone_key: phoneKey,
        birth_date: clientPayload.birthDate || null,
        birthday_marketing_consent: clientPayload.birthdayMarketingConsent,
        data: clientPayload
      }).select("id").single();
      if (error) throw error;
      clientId = Number(data.id);
    }

    const publicRequest = {
      preferenceStyle: cleanText(body.preferenceStyle, 80),
      firstTimeArea: cleanText(body.firstTimeArea, 20),
      sensitivity: cleanText(body.sensitivity, 20),
      clientRequest: cleanText(body.clientRequest, 1200),
      additionalAreas: Array.isArray(body.additionalAreas) ? body.additionalAreas.map(value => cleanText(value, 60)).slice(0, 8) : [],
      updatedAt: new Date().toISOString()
    };
    const consent = {
      accepted: Boolean(body.consentAccepted),
      signedName: cleanText(body.signatureName || name, 160),
      signedAt: dateOnly(body.signatureDate) || today,
      version: "1.1",
      policiesAccepted: Boolean(body.policiesAccepted),
      policiesVersion: cleanText(body.policiesVersion || settings.bookingPoliciesVersion || "1.0", 40)
    };

    const existingRecord = await admin.from("client_records").select("id,data").eq("studio_id", studio.id).eq("client_id", clientId).maybeSingle();
    if (existingRecord.error) throw existingRecord.error;
    const recordData = {
      ...(existingRecord.data?.data || {}),
      clientId,
      publicRequest,
      consent,
      medical: {
        ...(existingRecord.data?.data?.medical || {}),
        ...(body.sensitivity === "yes" ? { productAllergy: true } : {})
      },
      updatedAt: today
    };
    const recordWrite = existingRecord.data
      ? admin.from("client_records").update({ data: recordData }).eq("id", existingRecord.data.id)
      : admin.from("client_records").insert({ studio_id: studio.id, client_id: clientId, data: recordData });
    const { error: recordError } = await recordWrite;
    if (recordError) throw recordError;

    const requestedAreas = [cleanText(body.selectedArea, 60), ...publicRequest.additionalAreas].filter(Boolean);
    const appointmentData = {
      clientId,
      client: name,
      phone,
      serviceId,
      source: "Página web",
      status: "requested",
      deposit: Number(settings.defaultDeposit || 0),
      depositAmount: Number(settings.defaultDeposit || 0),
      depositMethod: body.depositMethod,
      depositStatus: body.depositMethod === "proof" ? "proof_uploaded" : "confirmed_whatsapp",
      notes: cleanText(body.notes, 1200),
      formStatus: (consent.accepted || settings.requireConsent === false) && (consent.policiesAccepted || settings.requirePoliciesAcceptance === false) ? "complete" : "pending",
      detailsProvided: Boolean(body.detailsProvided),
      requestedAreas,
      preferenceStyle: publicRequest.preferenceStyle,
      clientRequest: publicRequest.clientRequest,
      sensitivity: publicRequest.sensitivity,
      policiesAccepted: consent.policiesAccepted,
      policiesVersion: consent.policiesVersion,
      requestCreatedAt: new Date().toISOString(),
      rescheduleHistory: []
    };

    const newAppointmentId = generateNumericId();
    const { data: appointmentRow, error: appointmentError } = await admin.from("appointments").insert({
      id: newAppointmentId,
      studio_id: studio.id,
      client_id: clientId,
      service_id: serviceId,
      date,
      time,
      start_minute: startMinute,
      end_minute: endMinute,
      status: "requested",
      data: appointmentData
    }).select("id").single();

    if (appointmentError) {
      if (appointmentError.code === "23P01") fail("Ese horario acaba de ocuparse. Elegí otro horario.", 409);
      throw appointmentError;
    }

    const appointmentId = Number(appointmentRow.id);
    appointmentData.id = appointmentId;
    appointmentData.date = date;
    appointmentData.time = time;

    if (body.depositMethod === "proof" && body.proofData?.dataUrl) {
      const { buffer, mimeType, extension } = dataUrlToBuffer(body.proofData.dataUrl);
      const path = `${studio.id}/booking-proofs/${appointmentId}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage.from("byalee-private").upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
        cacheControl: "3600"
      });
      if (uploadError) throw uploadError;
      const { data: mediaRow, error: mediaError } = await admin.from("media_files").insert({
        studio_id: studio.id,
        client_id: clientId,
        appointment_id: appointmentId,
        kind: "booking_proof",
        storage_path: path,
        data: {
          name: cleanText(body.proofData.name, 180),
          mimeType,
          size: buffer.length,
          createdAt: new Date().toISOString()
        }
      }).select("id").single();
      if (mediaError) throw mediaError;
      appointmentData.depositProofId = Number(mediaRow.id);
    }

    const { error: finalUpdateError } = await admin.from("appointments").update({ data: appointmentData }).eq("id", appointmentId);
    if (finalUpdateError) throw finalUpdateError;

    return json(res, 201, {
      ok: true,
      appointment: {
        id: appointmentId,
        status: "requested",
        date,
        time,
        service: service.name,
        area: service.category || body.selectedArea || "Servicio"
      }
    });
  } catch (error) {
    const safe = safeError(error);
    return json(res, safe.status, { error: safe.message });
  }
}
