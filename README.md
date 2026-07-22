# ByAlee — agenda, clientas y reservas reales

Esta versión conserva la interfaz HTML/CSS/JavaScript del proyecto y reemplaza el almacenamiento aislado del navegador por una arquitectura compartida:

- **Supabase Auth** para el login del administrador.
- **Supabase PostgreSQL + RLS** para clientas, fichas, citas, servicios, inventario, bloqueos y configuración.
- **Supabase Storage privado** para comprobantes y fotografías.
- **Vercel Functions** para recibir reservas públicas sin exponer claves privadas.
- **Supabase Realtime** para mostrar nuevas solicitudes en el panel.

## Rutas en Vercel

| Dirección | Uso |
|---|---|
| `/` o `/reservar` | Reserva pública. No requiere login. |
| `/login` | Inicio de sesión de ByAlee. |
| `/admin` | Panel privado. Redirige al login cuando no existe sesión. |

## 1. Crear el proyecto de Supabase

1. Crea un proyecto nuevo en Supabase.
2. Abre **SQL Editor**.
3. Copia y ejecuta todo el contenido de `database/supabase-schema.sql`.
4. Comprueba que se crearon las tablas del esquema `public` y el bucket privado `byalee-private`.

El SQL crea el estudio **ByAlee**, las políticas RLS, servicios iniciales, configuración, inventario de prueba y el disparador que vincula usuarios de Auth con el estudio.

## 2. Crear el usuario administrador

En Supabase:

1. Abre **Authentication → Users**.
2. Crea un usuario con el correo real de la administradora y una contraseña segura.
3. Desactiva el registro público por correo si solamente ByAlee debe crear usuarios.

El trigger del SQL crea automáticamente su fila en `public.profiles` con rol `admin`. El script también vincula usuarios que hayan sido creados antes de ejecutar el SQL.

## 3. Obtener las claves

En Supabase abre la configuración de API del proyecto y copia:

- URL del proyecto.
- Publishable key; en proyectos antiguos puede llamarse `anon key`.
- Service role key o secret key de servidor.

La clave de servicio **solo** se configura en Vercel. Nunca debe escribirse en HTML, JavaScript público ni subirse al repositorio.

## 4. Configurar Vercel

En el proyecto de Vercel abre **Settings → Environment Variables** y agrega:

```text
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=TU_CLAVE_PRIVADA_DE_SERVIDOR
BYALEE_STUDIO_SLUG=byalee
```

Selecciona al menos **Production**. También conviene seleccionar **Preview** para probar ramas antes de publicarlas. Luego realiza un nuevo deployment.

`SUPABASE_ANON_KEY` también es aceptada como alternativa a `SUPABASE_PUBLISHABLE_KEY`.

## 5. Subir esta versión al repositorio

Reemplaza el contenido actual del repositorio con esta carpeta y ejecuta:

```bash
git add .
git commit -m "Conectar ByAlee con Supabase y login real"
git push origin main
```

Vercel, al estar conectado con la rama `main`, creará el deployment. Después abre:

```text
https://by-alee.vercel.app/login
```

## Qué ya guarda en la base de datos

- Administradores y profesionales.
- Configuración de ByAlee.
- Servicios editables y su disponibilidad pública.
- Clientas y fecha de cumpleaños con consentimiento.
- Fichas, alertas, preferencias y consentimientos.
- Solicitudes públicas, citas confirmadas, canceladas y reagendadas.
- Visitas e historial técnico.
- Inventario profesional y general.
- Días u horarios bloqueados.
- Comprobantes y fotografías privadas.

La reserva pública valida nuevamente el horario en el servidor y la base de datos incluye una restricción para evitar dos citas activas superpuestas.

## Flujo real de una reserva

```text
Clienta abre /reservar
        ↓
Vercel Function /api/bookings
        ↓
Supabase PostgreSQL
        ↓
Realtime avisa al panel /admin
        ↓
ByAlee confirma, cancela o reagenda
```

## Seguridad aplicada

- El dashboard consulta datos únicamente con una sesión de Supabase Auth.
- Las tablas tienen Row Level Security por estudio.
- La reserva pública escribe mediante una Function de Vercel y no recibe la clave de servicio.
- El bucket de fotos y comprobantes es privado.
- Las imágenes del panel se abren mediante enlaces firmados temporales.
- El servidor vuelve a comprobar jornada, bloqueos, duración y superposición.

## Datos anteriores del prototipo

Los datos que estaban en `localStorage` no aparecen automáticamente en Supabase. Puedes usar la exportación/importación del panel para mover datos estructurados de una versión anterior. Las fotografías antiguas almacenadas solamente en IndexedDB pueden requerir volver a cargarse.

## Desarrollo local opcional

Para probar las Functions de Vercel localmente:

```bash
npm install
vercel link
vercel env pull .env.local
vercel dev
```

No es obligatorio usar Docker para desplegar esta versión en Vercel.

## Pendiente para siguientes etapas

- Sincronización bidireccional con Google Calendar.
- Recuperación de contraseña desde la interfaz.
- Auditoría detallada de cambios y consentimientos.
- Envío automático mediante WhatsApp Business API.
- Roles más detallados para varias profesionales.
