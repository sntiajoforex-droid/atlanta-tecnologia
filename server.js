/* Atlanta Tecnología — servidor de la tienda.
   Sirve la página, el catálogo (data/productos.json) y recibe solicitudes de crédito y de equipos usados.
   La compra se cierra por WhatsApp: el servidor nunca recibe datos de pago. */
const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

try { process.loadEnvFile && fs.existsSync(path.join(__dirname, ".env")) && process.loadEnvFile(path.join(__dirname, ".env")); } catch (e) { /* sin .env */ }

const PORT = +process.env.PORT || 3000;
/* Número de WhatsApp con indicativo, solo dígitos (ej. 573001234567). Sin él se usa el enlace corto del perfil, que no permite mensaje prellenado */
const WHATSAPP = /^\d{8,15}$/.test(process.env.WHATSAPP || "") ? process.env.WHATSAPP : "";
const WHATSAPP_LINK = process.env.WHATSAPP_LINK || "https://wa.me/message/FEN6KCIAPELQD1";
const INSTAGRAM = process.env.INSTAGRAM || "https://www.instagram.com/atlantatecnologia1_79/";
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");
const CONTACTO_SEGURIDAD = process.env.CONTACTO_SEGURIDAD || "";
const cat = require("./catalogo");
const { crearPanel } = require("./admin");
const { txt } = cat;
const SOLICITUDES = path.join(cat.DATA_DIR, "solicitudes.jsonl");

/* ---------- Solicitudes (crédito y «recibimos tu usado») ---------- */
const TIPOS = ["credito", "usado", "reserva"];
const limpiarSolicitud = b => {
  if (!b || typeof b !== "object") return { error: "Datos inválidos" };
  const tipo = b.tipo, nombre = txt(b.nombre, 80), telefono = String(b.telefono || "").replace(/[^\d+]/g, "").slice(0, 16);
  if (!TIPOS.includes(tipo)) return { error: "Tipo de solicitud inválido" };
  if (nombre.length < 2 || /[<>]/.test(nombre)) return { error: "Escribe tu nombre" };
  if (!/^\+?\d{7,15}$/.test(telefono)) return { error: "Escribe un celular válido" };
  if (b.web) return { error: "Datos inválidos" }; /* trampa para bots: campo oculto que una persona no llena */
  return { data: { tipo, nombre, telefono, equipo: txt(b.equipo, 80), detalle: txt(b.detalle, 400), producto: txt(b.producto, 60) } };
};

/* ---------- App ---------- */
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
/* Algunos proxies (Azure) envían la IP con puerto; sin quitarlo cada conexión contaría como una IP distinta */
const ipCliente = req => { const ip = String(req.ip || ""), m = ip.match(/^\[(.+)\]:\d+$/) || ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/); return m ? m[1] : ip; };
const limite = o => rateLimit({ standardHeaders: true, legacyHeaders: false, keyGenerator: ipCliente, validate: { ip: false },
  message: { error: "Demasiadas solicitudes. Intenta en unos minutos." }, ...o });

app.use(helmet({
  contentSecurityPolicy: { useDefaults: false, directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "https://fonts.googleapis.com"],
    fontSrc: ["https://fonts.gstatic.com"], imgSrc: ["'self'", "data:", "blob:"], connectSrc: ["'self'", "blob:"],
    objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"], upgradeInsecureRequests: [] } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  crossOriginEmbedderPolicy: false
}));
app.use((req, res, next) => { res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"); next(); });
app.use(compression());

app.get("/.well-known/security.txt", (req, res) => {
  if (!CONTACTO_SEGURIDAD) return res.status(404).end();
  const vence = new Date(Date.now() + 330 * 864e5).toISOString().replace(/\.\d+Z$/, "Z");
  res.type("text/plain").send(`Contact: ${CONTACTO_SEGURIDAD}\nExpires: ${vence}\nPreferred-Languages: es\n`);
});
app.get("/robots.txt", (req, res) => res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n${SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml\n` : ""}`));
app.get("/sitemap.xml", (req, res) => {
  const base = SITE_URL || `https://${req.get("host")}`;
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc></url><url><loc>${base}/privacidad.html</loc></url></urlset>`);
});

/* Fotos de productos: cada archivo tiene nombre único y nunca cambia, así que se guardan en caché un año */
app.use("/fotos", express.static(cat.FOTOS, { index: false, dotfiles: "deny", immutable: true, maxAge: "365d", fallthrough: true }));
app.use("/modelos3d", express.static(cat.MODELOS, { index: false, dotfiles: "deny", immutable: true, maxAge: "365d", fallthrough: true,
  setHeaders: res => res.setHeader("Content-Type", "model/gltf-binary") }));
app.get(["/admin", "/admin/"], (req, res) => { res.setHeader("X-Robots-Tag", "noindex, nofollow"); res.setHeader("Cache-Control", "no-store"); res.sendFile(path.join(__dirname, "public", "admin.html")); });
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, p) => {
    if (/[\\/]vendor[\\/]/.test(p)) res.setHeader("Cache-Control", "public, max-age=2592000");
    else if (/\.(webp|png|jpe?g|svg|ico)$/i.test(p)) res.setHeader("Cache-Control", "public, max-age=604800");
    else res.setHeader("Cache-Control", "no-cache");
  }
}));

const api = express.Router();
api.use(limite({ windowMs: 60000, limit: 120 }));
api.get("/config", (req, res) => res.json({ whatsapp: WHATSAPP, whatsappLink: WHATSAPP_LINK, instagram: INSTAGRAM }));
api.get("/productos", (req, res) => { res.setHeader("Cache-Control", "no-cache"); res.json(cat.publico()); });
api.post("/solicitud", limite({ windowMs: 10 * 60000, limit: 6 }), express.json({ limit: "8kb" }), (req, res) => {
  const r = limpiarSolicitud(req.body);
  if (r.error) return res.status(400).json({ error: r.error });
  const registro = { id: crypto.randomUUID(), fecha: new Date().toISOString(), ...r.data };
  fs.appendFile(SOLICITUDES, JSON.stringify(registro) + "\n", e => {
    if (e) { console.error("solicitud:", e.message); return res.status(500).json({ error: "No pudimos guardar tu solicitud. Escríbenos por WhatsApp." }); }
    res.status(201).json({ ok: true });
  });
});
api.use("/admin", crearPanel({ ipCliente, limite }));
api.use((req, res) => res.status(404).json({ error: "No encontrado" }));
app.use("/api", api);

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "public", "404.html")));
/* Errores: nunca se muestra el detalle interno (JSON mal formado, etc.) */
app.use((err, req, res, next) => {
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Error interno" : "Solicitud inválida" });
});

if (require.main === module) app.listen(PORT, () => console.log(`Atlanta Tecnología en http://localhost:${PORT}`));
module.exports = { app, limpiarProducto: cat.limpiarProducto, limpiarSolicitud };
