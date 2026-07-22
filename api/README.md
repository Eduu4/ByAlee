# Vercel Functions

- `GET /api/config`: entrega únicamente la URL y clave pública necesarias para inicializar Supabase Auth en el navegador.
- `GET /api/public-data`: entrega configuración pública, servicios activos, bloqueos y rangos ocupados.
- `POST /api/bookings`: valida y crea una solicitud pública; también guarda el comprobante cuando corresponde.

Las Functions usan `SUPABASE_SERVICE_ROLE_KEY` desde variables privadas de Vercel. Esta clave nunca se envía al navegador.
