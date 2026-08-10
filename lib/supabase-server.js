import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

export const studioSlug = process.env.BYALE_STUDIO_SLUG || process.env.BYALEE_STUDIO_SLUG || "byale";
const studioIdFromEnv = process.env.BYALE_STUDIO_ID || process.env.BYALEE_STUDIO_ID || "";

// ID numérico seguro para convivir con el frontend existente sin depender
// del valor actual de las secuencias de PostgreSQL.
export function generateNumericId() {
  return Date.now() * 1000 + randomInt(0, 1000);
}

export function assertServerConfig() {
  if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
    const error = new Error("Faltan variables de entorno de Supabase en Vercel.");
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }
}

export function createAdminClient() {
  assertServerConfig();
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "byalee-vercel-api" } }
  });
}

export function publicConfig() {
  assertServerConfig();
  return { supabaseUrl, publishableKey, studioSlug };
}

export function json(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(body));
}

export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  json(res, 405, { error: "Método no permitido" });
  return false;
}

export function safeError(error) {
  console.error(error);
  return {
    status: Number(error?.statusCode || 500),
    message: Number(error?.statusCode || 500) >= 500 && !error?.expose
      ? "No se pudo completar la operación. Intentá nuevamente."
      : String(error?.message || "Solicitud inválida")
  };
}

export function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `595${digits.slice(1)}`;
  return digits;
}

export function timeToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return NaN;
  return hours * 60 + minutes;
}

export function dateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
}

export function todayInTimeZone(timeZone = "America/Asuncion") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dayOfWeek(date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

/*
  El panel privado conoce el estudio por profiles.studio_id.
  La API pública no tiene una sesión de usuario, por eso antes dependía
  únicamente de BYALEE_STUDIO_SLUG="byalee". Si el slug real era "byale"
  o distinto, /api/public-data y /api/bookings fallaban aunque el panel
  privado funcionara.

  Orden seguro de resolución:
  1) BYALEE_STUDIO_ID si se configuró.
  2) BYALEE_STUDIO_SLUG.
  3) Alias históricos byale / byalee.
  4) Si existe UN SOLO estudio en la base, usarlo.

  Nunca elige arbitrariamente entre varios estudios.
*/
export async function getStudio(admin) {
  const fields = "id,name,slug,timezone";

  // 1) Si existe un ID configurado, es la opción más precisa.
  if (studioIdFromEnv) {
    const { data, error } = await admin
      .from("studios")
      .select(fields)
      .eq("id", studioIdFromEnv)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  // 2) ByAle es el nombre actual. Se prueba primero "byale" y
  //    se conserva "byalee" únicamente como compatibilidad histórica.
  const slugCandidates = [...new Set([
    "byale",
    String(studioSlug || "").trim(),
    "byalee"
  ].filter(Boolean))];

  for (const slug of slugCandidates) {
    const { data, error } = await admin
      .from("studios")
      .select(fields)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  // 3) Si el slug no coincide, intentar por el nombre visible del estudio.
  for (const name of ["ByAle", "ByAlee"]) {
    const { data, error } = await admin
      .from("studios")
      .select(fields)
      .ilike("name", name)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  // 4) Para una instalación con un único estudio, no tiene sentido bloquear
  //    la reserva pública solo porque el slug no fue cargado exactamente.
  const { data: studios, error: studiosError } = await admin
    .from("studios")
    .select(fields)
    .limit(2);

  if (studiosError) throw studiosError;

  if (Array.isArray(studios) && studios.length === 1) {
    return studios[0];
  }

  const err = new Error(
    "No se encontró el estudio ByAle para la reserva pública. Revisá el registro de studios o configurá BYALE_STUDIO_ID en Vercel."
  );
  err.statusCode = 503;
  err.expose = true;
  throw err;
}
