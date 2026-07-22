# Arquitectura de ByAlee en Vercel + Supabase

## Componentes

```text
Reserva pública (/reservar)
          │
          │ POST /api/bookings
          ▼
Vercel Functions ───────────────┐
          │ service role        │
          ▼                     │
Supabase PostgreSQL             │
          ▲                     │
          │ JWT + RLS           │
Panel privado (/admin)          │
          │                     │
          ├── Supabase Auth     │
          ├── Realtime          │
          └── Storage privado ◄─┘
```

## Límite de confianza

### Navegador público

No recibe la clave privada. Consulta servicios, configuración pública y ocupación mediante `/api/public-data`; envía solicitudes mediante `/api/bookings`.

### Navegador administrador

Inicia sesión con Supabase Auth. El SDK adjunta el JWT y PostgreSQL aplica las políticas RLS para el estudio asociado al usuario.

### Vercel Functions

Usan `SUPABASE_SERVICE_ROLE_KEY` únicamente en el servidor para operaciones públicas controladas. Cada entrada se valida antes de escribir.

## Tablas principales

- `studios`: estudio o negocio.
- `profiles`: usuario autenticado, rol y estudio.
- `studio_settings`: preferencias generales en JSONB.
- `services`: servicio, categoría, precio, duración y estado.
- `clients`: identidad y contacto de la clienta.
- `client_records`: ficha, alertas, preferencias y consentimiento.
- `appointments`: solicitudes y citas.
- `visits`: historial de trabajos realizados.
- `inventory_items`: stock profesional y general.
- `availability_blocks`: días y rangos no reservables.
- `media_files`: metadatos de archivos guardados en Storage.

Se mantienen columnas normalizadas para filtros y restricciones críticas, y `data jsonb` para conservar la flexibilidad del frontend existente.

## Prevención de doble reserva

La disponibilidad se comprueba en `/api/bookings` y PostgreSQL agrega una restricción de exclusión sobre el rango de minutos de citas con estado `requested`, `pending` o `confirmed`. Esa segunda barrera cubre solicitudes simultáneas.

## Fotografías y comprobantes

Los binarios se guardan en el bucket privado `byalee-private`. La tabla `media_files` conserva la relación con clienta, visita o cita. El panel usa URLs firmadas temporales; el enlace permanente del objeto no es público.

## Google Calendar — siguiente integración

La integración debe implementarse en Functions, no en el navegador público:

1. OAuth de Google para la cuenta de ByAlee.
2. Guardar el refresh token cifrado del lado servidor.
3. Consultar `freeBusy` junto con citas y bloqueos de PostgreSQL.
4. Crear o actualizar un evento cuando se confirma o reagenda una cita.
5. Cancelar o actualizar el evento al cambiar el estado.
6. Guardar `google_event_id` en la cita.

Hasta implementar esa etapa, la fuente de disponibilidad es la agenda de ByAlee en Supabase y sus bloqueos manuales.
