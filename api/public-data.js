import {
  allowMethods,
  createAdminClient,
  dateOnly,
  getStudio,
  json,
  safeError,
  todayInTimeZone
} from "../lib/supabase-server.js";

function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;
  try {
    const admin = createAdminClient();
    const studio = await getStudio(admin);
    const today = todayInTimeZone(studio.timezone || "America/Asuncion");
    const from = dateOnly(req.query?.from) || today;
    const requestedTo = dateOnly(req.query?.to) || addDays(from, 120);
    const maximumTo = addDays(from, 180);
    const to = requestedTo > maximumTo ? maximumTo : requestedTo;

    const [settingsResult, servicesResult, blocksResult, appointmentsResult] = await Promise.all([
      admin.from("studio_settings").select("data").eq("studio_id", studio.id).maybeSingle(),
      admin.from("services").select("id,data").eq("studio_id", studio.id).eq("active", true).order("id"),
      admin.from("availability_blocks").select("id,date,start_minute,end_minute,all_day,reason,data").eq("studio_id", studio.id).gte("date", from).lte("date", to),
      admin.from("appointments").select("id,date,time,start_minute,end_minute,status,service_id").eq("studio_id", studio.id).gte("date", from).lte("date", to).in("status", ["requested","pending","confirmed"])
    ]);

    const firstError = [settingsResult.error, servicesResult.error, blocksResult.error, appointmentsResult.error].find(Boolean);
    if (firstError) throw firstError;

    const rawSettings = settingsResult.data?.data || {};
    const publicSettingKeys = [
      "studioName", "city", "openingTime", "closingTime", "slotInterval", "workDays",
      "currency", "primaryColor", "appearance", "bookingEnabled", "requireConsent",
      "allowDepositProof", "requireDepositChoice", "defaultDeposit",
      "requirePoliciesAcceptance", "bookingPoliciesVersion", "bookingPoliciesText",
      "allowOptionalBookingDetails", "timezone"
    ];
    const settings = Object.fromEntries(publicSettingKeys
      .filter(key => Object.prototype.hasOwnProperty.call(rawSettings, key))
      .map(key => [key, rawSettings[key]]));
    const services = (servicesResult.data || []).map(row => ({
      id: Number(row.id),
      name: row.data?.name || "Servicio",
      category: row.data?.category || "Pestañas",
      duration: Number(row.data?.duration || 0),
      prep: Number(row.data?.prep || 0),
      cleanup: Number(row.data?.cleanup || 0),
      price: Number(row.data?.price || 0),
      color: row.data?.color || "#8f5c70",
      description: String(row.data?.description || "").slice(0, 500),
      active: true
    }));
    const availabilityBlocks = (blocksResult.data || []).map(row => ({
      id: Number(row.id),
      date: row.date,
      startMinute: row.start_minute,
      endMinute: row.end_minute,
      allDay: row.all_day
    }));
    const appointments = (appointmentsResult.data || []).map(row => ({
      id: Number(row.id),
      date: row.date,
      time: String(row.time || "").slice(0, 5),
      startMinute: row.start_minute,
      endMinute: row.end_minute,
      status: row.status,
      serviceId: Number(row.service_id)
    }));

    return json(res, 200, {
      studio: { name: studio.name, slug: studio.slug, timezone: studio.timezone },
      settings,
      services,
      availabilityBlocks,
      appointments,
      range: { from, to }
    });
  } catch (error) {
    const safe = safeError(error);
    return json(res, safe.status, { error: safe.message });
  }
}
