import { createClient } from "@supabase/supabase-js";

import {
  allowMethods,
  createAdminClient,
  json,
  parseBody,
  publicConfig,
  safeError
} from "../lib/supabase-server.js";

function invalidCredentials(res) {
  return json(res, 401, {
    error: "Usuario, correo o contraseña incorrectos."
  });
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) {
    return;
  }

  try {
    const body = parseBody(req);

    const identifier = String(body.identifier || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    if (!identifier || !password) {
      return json(res, 400, {
        error: "Ingresá tu usuario o correo y contraseña."
      });
    }

    const admin = createAdminClient();

    let email = identifier;

    /*
     * Si no contiene @, consideramos que se ingresó
     * un nombre de usuario.
     */
    if (!identifier.includes("@")) {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id, username, active")
        .eq("username", identifier)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.active === false
      ) {
        return invalidCredentials(res);
      }

      /*
       * Obtener el correo desde auth.users solo puede hacerse
       * desde el servidor con la clave privada.
       */
      const {
        data: userData,
        error: userError
      } = await admin.auth.admin.getUserById(profile.id);

      if (
        userError ||
        !userData?.user ||
        !userData.user.email
      ) {
        return invalidCredentials(res);
      }

      email = userData.user.email.toLowerCase();
    }

    const {
      supabaseUrl,
      publishableKey
    } = publicConfig();

    /*
     * La contraseña se valida mediante Supabase Auth.
     * La service role no se usa para validar contraseñas.
     */
    const authClient = createClient(
      supabaseUrl,
      publishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const {
      data,
      error
    } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      return invalidCredentials(res);
    }

    return json(res, 200, {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type
      },
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    const result = safeError(error);

    return json(res, result.status, {
      error: result.message
    });
  }
}