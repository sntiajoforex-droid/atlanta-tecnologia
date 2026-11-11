# Atlanta Tecnología — tienda web

Tienda de equipos Apple nuevos y seminuevos. Cada seminuevo se puede revisar **en 3D**, con sus rayones o golpes marcados en el lugar exacto donde están.

## Arrancar

```bash
npm install      # también copia three.js a public/vendor
npm run build    # compila la tienda (React) a dist/
npm start        # http://localhost:3000
npm test         # compila y corre las pruebas de servidor y seguridad
npm run dev:tienda   # tienda con recarga en vivo (con npm start corriendo aparte)
```

Configuración: copia `.env.example` como `.env`. Lo más importante es `WHATSAPP` (número con indicativo, ej. `573001234567`): sin él, los pedidos abren el enlace corto del perfil y el mensaje no llega escrito.

## Cómo está armada

| Parte | Archivo |
|---|---|
| Servidor (Express, Helmet, límites por IP) | `server.js` |
| Catálogo | `data/productos.json` (se recarga solo al guardar) |
| Tienda (React + Vite) | `tienda/` → se compila a `dist/` con `npm run build` |
| Animaciones de [React Bits](https://reactbits.dev) | `tienda/src/bits/` (SplitText, SpotlightCard, CountUp, Stepper, Magnet) |
| Panel, páginas legales y estilos del panel | `public/admin.html`, `public/css/` |
| Ilustraciones de cada equipo | `public/js/dibujos.js` |
| Visor 3D (dibujado o escaneo real) | `public/js/visor3d.js` (solo se descarga al abrirlo) |
| Solicitudes de crédito y usados | se guardan en `data/solicitudes.jsonl` |

## Panel de administración (`/admin`)

Crea el primer usuario (la contraseña sale una sola vez en pantalla):

```bash
npm run usuario -- santiago dueno
npm run usuario -- vendedor1 empleado
npm run usuario -- vendedor1 --borrar
```

Volver a correr el comando con el mismo nombre genera una contraseña nueva y cierra las sesiones abiertas de ese usuario.

| Puede | Dueño | Empleado |
|---|---|---|
| Ver productos y cambiar existencias | ✓ | ✓ |
| Ver solicitudes y marcarlas atendidas | ✓ | ✓ |
| Crear, editar, eliminar, destacar u ocultar productos | ✓ | |
| Ver el registro de cambios | ✓ | |

- **Detalles 3D sin coordenadas:** en el editor de un seminuevo, toca el modelo donde está el rayón y escribe qué es.
- **Fotos:** hasta 6 por producto. Elige o arrastra; el navegador las reduce (máx. 1600 px, WEBP) antes de subirlas. La primera es la principal y se puede cambiar. Se guardan en `DATA_DIR/fotos/` y al quitarlas o eliminar el producto se borran del disco.
- **Escaneo 3D real:** sube el `.glb` de un escaneo del equipo y la tienda lo muestra en lugar del dibujado (ver abajo).
- **Plantillas de iPhone:** elegir el modelo llena medidas y cámaras (del 11 al 17).
- **Respaldos:** cada guardado deja una copia del catálogo en `data/respaldos/` (las últimas 30).
- **Registro:** quién creó, editó, ocultó o eliminó qué, y cambios de precio.

Seguridad de los escaneos: solo el dueño sube; se revisa que sea un GLB (glTF 2.0) autocontenido, sin archivos ni direcciones externas y sin compresión que el visor no abra; máximo 30 MB; uno por producto (el nuevo reemplaza y borra al anterior).

Seguridad de las fotos: solo el dueño sube; se valida el contenido real del archivo (JPG, PNG o WEBP; nunca SVG), máximo 4 MB, nombre generado por el servidor y atado al producto, se sirven con `nosniff`.

Seguridad del panel: contraseñas con scrypt, sesión en cookie firmada `HttpOnly` + `SameSite=Strict` de 8 horas, cabecera propia obligatoria en cada cambio (CSRF), bloqueo de 15 minutos tras 8 intentos fallidos por usuario o por IP, mismo mensaje si el usuario no existe, y `noindex`.
En producción define `SESSION_SECRET` (si falta, las sesiones se cierran al reiniciar) y `DATA_DIR` en una carpeta persistente.

## Seminuevos en 3D real (escaneo)

1. Escanea el equipo con una app gratis de celular: **Scaniverse**, **KIRI Engine** o **Polycam**. Rodéalo por completo, con luz pareja y sin reflejos directos (los vidrios muy brillantes pueden salir con huecos).
2. Exporta en formato **GLB**, sin compresión (Draco/Meshopt no se admiten).
3. En el panel, edita el producto → **Escaneo 3D real** → elige o arrastra el `.glb` → Guardar.
4. El visor lo endereza solo: busca los ejes del equipo, lo ajusta y adivina la espalda y el lado de arriba por el módulo de cámaras. Si queda al revés, usa **Pantalla ↔ espalda** o **Arriba ↔ abajo**.
5. Toca el escaneo donde está cada rayón o golpe para marcarlo, igual que con el dibujado.

Se guarda en `DATA_DIR/modelos3d/` (carpeta persistente en producción). Si el producto tiene modelo de iPhone, el escaneo se ajusta a su alto real; si no, se usa el tamaño del archivo (las apps exportan en metros).
Para que cargue rápido en celulares, procura que pese menos de 15 MB (las apps permiten exportar con menos detalle).

## Agregar un seminuevo con detalles 3D (a mano)

En `data/productos.json`, `"estado": "usado"`, sus medidas en `modelo` (mm) y una lista `marcas`:

```json
"marcas": [
  { "cara": "trasera", "u": 0.7, "v": 0.78, "texto": "Rayón fino en el vidrio trasero." }
]
```

- `cara`: `trasera`, `frontal`, `marco-izq`, `marco-der`, `marco-sup`, `marco-inf` (izquierda/derecha vistas de frente).
- `u`: de 0 (izquierda) a 1 (derecha) mirando esa cara. `v`: de 0 (arriba) a 1 (abajo).

## Seguridad

- CSP estricta: `script-src 'self'` sin `unsafe-inline`, sin estilos en línea, `frame-ancestors 'none'`, `object-src 'none'`. three.js se sirve desde el propio sitio.
- HSTS de un año, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, sin `X-Powered-By`.
- Límite de peticiones por IP (120/min en la API, 6 solicitudes cada 10 min) y cuerpo máximo de 8 KB.
- Todo el catálogo se valida en el servidor; en la página los textos se insertan como texto, nunca como HTML.
- Campo trampa contra bots en los formularios. Los errores no revelan detalles internos.
- La página no recibe datos de pago: el pedido se cierra por WhatsApp.

## Pendiente antes de publicar

- Precios, existencias y fotos reales (los del catálogo son **de ejemplo**).
- Número de WhatsApp, dirección y horario de la tienda.
- Revisar la política de privacidad con el dueño.
- Crear los usuarios reales del panel y definir `SESSION_SECRET`.
- Subir fotos reales y escaneos 3D desde el panel (hoy cada equipo se muestra con su ilustración y su modelo dibujado).
