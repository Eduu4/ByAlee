# LashFlow — prototipo de gestión integral v4

Frontend funcional en HTML, CSS y JavaScript puro. Esta versión sigue sin backend y está pensada para probar el flujo completo antes de conectar una base de datos.

## Cómo abrirlo

1. Descomprime la carpeta.
2. Ábrela con Visual Studio Code.
3. Ejecuta `index.html` mediante **Live Server**.
4. Abre `reservar.html` desde el mismo Live Server para simular la reserva de una clienta.

Es importante que ambas páginas utilicen la misma dirección y el mismo puerto. Por ejemplo:

- `http://127.0.0.1:5500/index.html`
- `http://127.0.0.1:5500/reservar.html`

Así comparten `localStorage`, IndexedDB y las notificaciones entre pestañas.

## Cambios de la versión 4

### Notificaciones funcionales

- La campana permanece visible también en dispositivos móviles.
- Muestra la cantidad de solicitudes online pendientes.
- Al presionarla se abre un panel con las solicitudes recientes.
- El dashboard verifica cambios entre pestañas mediante `BroadcastChannel`, eventos de almacenamiento, foco de ventana y una comprobación periódica liviana.
- El título de la pestaña muestra la cantidad pendiente, por ejemplo: `(2) LashFlow`.

### Agenda con filtro por fecha

La sección **Agenda** ahora permite:

- Elegir una fecha específica.
- Filtrar por estado de cita.
- Mostrar solamente las citas de hoy.
- Limpiar los filtros.
- Ver cuántos resultados coinciden.
- Consultar el estado de la seña y abrir un comprobante adjunto.

Se eliminó la repetición de botones globales para crear citas. La acción principal queda en la barra superior, además de las acciones contextuales dentro de la ficha de una clienta.

### Reserva pública más flexible

En `reservar.html`:

- Solo son obligatorios el nombre y el WhatsApp para identificar a la clienta.
- Cumpleaños, correo, Instagram y domicilio están dentro de una sección opcional.
- La consulta previa explica claramente qué información se debe marcar.
- La clienta puede agregar detalles o dejarlos para el día de la atención.
- Puede indicar que la seña fue coordinada por WhatsApp.
- Puede subir una imagen del comprobante.
- La imagen se comprime y se guarda en IndexedDB.
- La solicitud aparece en el dashboard como pendiente de confirmación.
- El consentimiento tiene una casilla grande y visible con una indicación explícita.

### Ficha de clienta mejorada

- La ficha abre primero en **Resumen**.
- Las alertas, servicio habitual, diseño, última visita y mantenimiento aparecen antes que la información secundaria.
- Los accesos rápidos llevan correctamente a Alertas, Historial, Diseño y Fotos.
- Se corrigió el problema que hacía que las pestañas no ocultaran las demás secciones.
- En celulares, la ficha utiliza una vista de pantalla completa, pestañas desplazables y tarjetas más compactas.

### Servicios realmente editables

El administrador puede presionar el lápiz o **Editar servicio** para cambiar:

- Nombre.
- Precio.
- Duración.
- Preparación.
- Limpieza.
- Color.
- Descripción pública.
- Disponibilidad para reservas.

Los controles usan una vinculación directa con el servicio seleccionado para evitar que la pantalla se comporte solamente como alta de servicios.

### Preferencias del administrador

En **Configuración → Horarios y automatización** se puede decidir:

- Si se permiten reservas públicas.
- Si el consentimiento es obligatorio.
- Si WhatsApp se abre al confirmar.
- Si la clienta puede omitir los detalles opcionales.
- Si se permite subir comprobante de seña.
- Si se exige elegir una forma de confirmación de la seña.

## Confirmación por WhatsApp

Cuando la lashista confirma una solicitud, el prototipo puede abrir WhatsApp con el mensaje preparado. La lashista debe presionar **Enviar**.

El envío completamente automático requiere un backend, WhatsApp Business Cloud API y, según el caso, plantillas aprobadas por Meta.

## Almacenamiento utilizado

### LocalStorage

- `lashflow_demo_appointments`
- `lashflow_demo_clients`
- `lashflow_demo_records`
- `lashflow_demo_visits`
- `lashflow_demo_services`
- `lashflow_demo_settings`
- `lashflow_demo_sync`
- `lashflow_theme`

### IndexedDB

Base: `lashflow_images_db`

- `images`: fotografías de las fichas.
- `bookingProofs`: comprobantes de señas.

## Limitaciones del prototipo

Los datos solo están disponibles en el navegador y dispositivo donde fueron guardados. Para una versión real hacen falta:

- Backend y base de datos.
- Usuarios, contraseñas y permisos.
- Almacenamiento privado de imágenes.
- Enlaces públicos seguros.
- Copias de seguridad.
- Registro de auditoría de consentimientos.
- Política de privacidad y conservación de datos.
- Integración oficial con WhatsApp.
