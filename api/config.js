import { allowMethods, json, publicConfig, safeError } from "../lib/supabase-server.js";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;
  try {
    const { supabaseUrl, publishableKey, studioSlug } = publicConfig();
    return json(res, 200, { configured: true, supabaseUrl, publishableKey, studioSlug });
  } catch (error) {
    const safe = safeError(error);
    return json(res, safe.status, { configured: false, error: safe.message });
  }
}
