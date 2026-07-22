import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

export const studioSlug = process.env.BYALEE_STUDIO_SLUG || "byalee";

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
    try { return JSON.parse(req.body); } catch { return {}; }
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

export async function getStudio(admin) {
  const { data, error } = await admin
    .from("studios")
    .select("id,name,slug,timezone")
    .eq("slug", studioSlug)
    .single();
  if (error || !data) {
    const err = new Error("El estudio ByAlee todavía no está configurado en Supabase.");
    err.statusCode = 503;
    err.expose = true;
    throw err;
  }
  return data;
}
