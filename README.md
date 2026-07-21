# LashFlow — prototipo de gestión integral v2

Frontend funcional en HTML, CSS y JavaScript puro. No necesita backend para probar sus pantallas y flujos.

## Cómo abrir

1. Descomprime la carpeta.
2. Abre la carpeta con Visual Studio Code.
3. Ejecuta `index.html` con la extensión **Live Server**.
4. Usa `reservar.html` para probar la experiencia pública de la clienta.

Live Server es importante para que la carga de fotografías, enlaces y almacenamiento del navegador funcionen de forma más estable.

## Mejoras principales de esta versión

### Buscador global funcional

El buscador superior encuentra:

- Clientas por nombre, teléfono, correo o Instagram.
- Servicios por nombre o descripción.
- Citas por clienta, fecha, hora, origen, servicio o notas.
- Diseños por efecto, nombre o curvatura.

Al seleccionar una clienta abre directamente su ficha. Al seleccionar un servicio abre y resalta su tarjeta. Al seleccionar una cita muestra el día correspondiente.

También puede abrirse con `Ctrl + K`.

### Ficha completa de clienta

Cada clienta ahora tiene un resumen con:

- Foto de portada.
- Datos de contacto.
- Estado de la ficha.
- Alertas importantes.
- Servicio habitual calculado desde el historial.
- Diseño habitual.
- Curvatura, grosor, volumen y rango.
- Última visita.
- Próximo mantenimiento sugerido.
- Cantidad de visitas, gasto total y ticket promedio.
- Acciones rápidas para WhatsApp, nueva cita y repetir el último trabajo.

### Historial editable

Las visitas se pueden:

- Crear.
- Modificar.
- Eliminar.
- Repetir en una nueva cita.

Cada visita guarda fecha, servicio, precio, diseño, rango, curvatura y observaciones.

### Fotografías

Dentro de la ficha aparece una pestaña **Fotos** que permite:

- Tomar una foto desde el celular.
- Seleccionar varias imágenes desde la galería.
- Clasificarlas como antes, después, retención, inspiración, ojo izquierdo, ojo derecho y otros tipos.
- Vincularlas con una visita.
- Agregar una descripción.
- Marcar permiso para portafolio.
- Elegir una foto como portada de la clienta.
- Abrir o eliminar imágenes.

Las imágenes se comprimen antes de guardarse y se almacenan con **IndexedDB**, evitando cargar fotografías grandes en `localStorage`.

### Servicios completamente modificables

El usuario administrador puede:

- Crear nuevos servicios.
- Cambiar el nombre.
- Modificar el precio.
- Modificar la duración.
- Configurar tiempo de preparación y limpieza.
- Cambiar el color identificador.
- Agregar una descripción pública.
- Pausar o reactivar el servicio.
- Eliminarlo cuando no tiene historial.

Si un servicio ya tiene citas o visitas, se pausa en lugar de eliminarse para conservar el historial.

Los cambios guardados también aparecen en `reservar.html`.

### Citas editables y vinculadas

Las citas existentes se pueden modificar. Cuando se escribe el nombre exacto de una clienta registrada:

- Se completa su WhatsApp.
- Se muestra su servicio habitual.
- Se muestran alertas registradas.
- Se propone el último servicio.
- Se carga una nota con el diseño habitual.

El botón **Repetir último** crea una nueva cita con los datos técnicos de referencia.

### Configuración para administrador

La sección **Configuración** permite cambiar:

- Nombre del administrador.
- Correo y teléfono.
- Nombre del estudio.
- Ciudad o zona.
- Moneda.
- Seña predeterminada.
- Hora de apertura y cierre.
- Intervalo de horarios.
- Días de atención.
- Días sugeridos para mantenimiento.
- Disponibilidad de la reserva pública.
- Requisito de consentimiento.
- Color principal.
- Modo claro, oscuro o automático.

También permite exportar e importar un respaldo JSON con datos e imágenes, o restablecer el demo.

## Almacenamiento local utilizado

- `lashflow_demo_appointments`
- `lashflow_demo_clients`
- `lashflow_demo_records`
- `lashflow_demo_visits`
- `lashflow_demo_services`
- `lashflow_demo_settings`
- `lashflow_theme`
- IndexedDB: `lashflow_images_db`

## Importante para una versión real

Este prototipo funciona en un solo navegador. Para usarlo en producción con varios usuarios se necesita:

- Backend y base de datos.
- Inicio de sesión seguro.
- Roles y permisos por salón.
- Almacenamiento de fotografías en servidor o nube.
- Copias de seguridad automáticas.
- Enlaces privados con token.
- Auditoría de consentimientos.
- Política de privacidad y conservación de datos.
- Integración oficial con WhatsApp o un proveedor autorizado.
