/* Panel de administración.
   - Usuarios en DATA_DIR/usuarios.json con clave scrypt (se crean con: npm run usuario -- nombre dueno|empleado).
   - Sesión en una cookie firmada (HMAC), HttpOnly y SameSite=Strict, que vence a las 8 horas.
   - Toda petición que cambia algo exige la cabecera X-Atlanta: un sitio ajeno no puede enviarla sin permiso CORS.
   - Dueño: todo. Empleado: existencias y solicitudes. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cat = require("./catalogo");

const USUARIOS = path.join(cat.DATA_DIR, "usuarios.json");
const SOLICITUDES = path.join(cat.DATA_DIR, "solicitudes.jsonl");
const ESTADO_SOL = path.join(cat.DATA_DIR, "solicitudes_estado.json");
const COOKIE = "atl_sesion", DURACION = 8 * 3600e3;
const SECRETO = process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 ? process.env.SESSION_SECRET : crypto.randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== "test") console.warn("Aviso: sin SESSION_SECRET las sesiones del panel se cierran cada vez que se reinicia el servidor.");

/* ---------- Claves ---------- */
const hashClave = clave => {
  const sal = crypto.randomBytes(16);
  return `scrypt$${sal.toString("hex")}$${crypto.scryptSync(clave, sal, 64).toString("hex")}`;
};
const HASH_FALSO = hashClave(crypto.randomBytes(12).toString("hex"));
const claveValida = (clave, guardado) => {
  const [alg, sal, hash] = String(guardado || HASH_FALSO).split("$");
  if (alg !== "scrypt" || !sal || !hash) return false;
  const a = crypto.scryptSync(String(clave), Buffer.from(sal, "hex"), 64), b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const leerUsuarios = () => { try { return JSON.parse(fs.readFileSync(USUARIOS, "utf8")); } catch { return {}; } };

/* ---------- Sesión firmada ---------- */
const firmar = datos => {
  const cuerpo = Buffer.from(JSON.stringify(datos)).toString("base64url");
  return `${cuerpo}.${crypto.createHmac("sha256", SECRETO).update(cuerpo).digest("base64url")}`;
};
const verificar = token => {
  const [cuerpo, firma] = String(token || "").split(".");
  if (!cuerpo || !firma) return null;
  const a = Buffer.from(firma), b = Buffer.from(crypto.createHmac("sha256", SECRETO).update(cuerpo).digest("base64url"));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const d = JSON.parse(Buffer.from(cuerpo, "base64url").toString()); return d.exp > Date.now() ? d : null; } catch { return null; }
};
const leerCookie = (req, nombre) => {
  for (const par of String(req.headers.cookie || "").split(";")) {
    const i = par.indexOf("="); if (i > 0 && par.slice(0, i).trim() === nombre) return decodeURIComponent(par.slice(i + 1).trim());
  }
  return null;
};
const opcionesCookie = req => `Path=/; HttpOnly; SameSite=Strict${req.secure ? "; Secure" : ""}`;

/* ---------- Bloqueo por intentos fallidos (por IP y por usuario) ---------- */
const fallos = new Map(), MAX_FALLOS = 8, BLOQUEO = 15 * 60e3;
const bloqueado = k => { const f = fallos.get(k); return f && f.n >= MAX_FALLOS && Date.now() - f.t < BLOQUEO; };
const fallo = k => { const f = fallos.get(k); fallos.set(k, { n: f && Date.now() - f.t < BLOQUEO ? f.n + 1 : 1, t: Date.now() }); };
setInterval(() => { for (const [k, f] of fallos) if (Date.now() - f.t > BLOQUEO) fallos.delete(k); }, 60e3).unref();

/* ---------- Solicitudes ---------- */
const leerJson = (f, def) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return def; } };
const leerSolicitudes = () => {
  let lineas = [];
  try { lineas = fs.readFileSync(SOLICITUDES, "utf8").trim().split("\n").filter(Boolean); } catch { /* aún no hay */ }
  const estado = leerJson(ESTADO_SOL, {});
  return lineas.slice(-1000).reverse().map(l => { try { const s = JSON.parse(l); return { ...s, atendida: !!estado[s.id] }; } catch { return null; } }).filter(s => s && s.id);
};

function crearPanel({ ipCliente, limite }) {
  const r = express.Router();
  r.use((req, res, next) => { res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Robots-Tag", "noindex, nofollow"); next(); });
  r.use(express.json({ limit: "64kb" }));
  /* Contra CSRF: cualquier cambio exige la cabecera propia del panel */
  r.use((req, res, next) => (req.method === "GET" || req.get("x-atlanta") === "1") ? next() : res.status(403).json({ error: "Solicitud no permitida" }));

  r.post("/login", limite({ windowMs: 15 * 60e3, limit: 30 }), (req, res) => {
    const usuario = cat.txt(req.body && req.body.usuario, 40).toLowerCase(), clave = String((req.body && req.body.clave) || "").slice(0, 200);
    const kIp = "ip:" + ipCliente(req), kU = "u:" + usuario;
    if (bloqueado(kIp) || bloqueado(kU)) return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
    const u = leerUsuarios()[usuario];
    if (!claveValida(clave, u && u.clave) || !u) {
      fallo(kIp); fallo(kU);
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    fallos.delete(kIp); fallos.delete(kU);
    res.setHeader("Set-Cookie", `${COOKIE}=${firmar({ u: usuario, r: u.rol, v: u.version || 1, exp: Date.now() + DURACION })}; ${opcionesCookie(req)}; Max-Age=${DURACION / 1000}`);
    cat.registrar(usuario, "entró");
    res.json({ usuario, rol: u.rol });
  });
  r.post("/salir", (req, res) => { res.setHeader("Set-Cookie", `${COOKIE}=; ${opcionesCookie(req)}; Max-Age=0`); res.json({ ok: true }); });

  /* Todo lo demás exige sesión. El rol y la versión se revisan contra el archivo: quitar un usuario o cambiar su clave cierra sus sesiones */
  r.use((req, res, next) => {
    const s = verificar(leerCookie(req, COOKIE)), u = s && leerUsuarios()[s.u];
    if (!s || !u || (u.version || 1) !== s.v) return res.status(401).json({ error: "Inicia sesión" });
    req.usuario = { nombre: s.u, rol: u.rol };
    next();
  });
  const soloDueno = (req, res, next) => req.usuario.rol === "dueno" ? next() : res.status(403).json({ error: "Solo el dueño puede hacer esto" });

  r.get("/yo", (req, res) => res.json(req.usuario));
  r.get("/productos", (req, res) => res.json(cat.leer()));

  const buscar = id => { const lista = cat.leer(), i = lista.findIndex(p => p.id === id); return { lista, i }; };
  r.post("/productos", soloDueno, (req, res) => {
    const p = cat.limpiarProducto({ ...req.body, id: cat.nuevoId(req.body || {}), fotos: [] });
    if (!p) return res.status(400).json({ error: "Revisa nombre, tipo, estado y precio" });
    cat.guardar([...cat.leer(), p]);
    cat.registrar(req.usuario.nombre, "creó", { id: p.id, nombre: p.nombre, precio: p.precio });
    res.status(201).json(p);
  });
  r.put("/productos/:id", soloDueno, (req, res) => {
    const { lista, i } = buscar(req.params.id);
    if (i < 0) return res.status(404).json({ error: "No existe" });
    /* Las fotos solo se pueden reordenar o quitar: las que no existan en disco se ignoran */
    const p = cat.limpiarProducto({ ...req.body, id: lista[i].id, fotos: (Array.isArray(req.body && req.body.fotos) ? req.body.fotos : []).filter(cat.fotoExiste) });
    if (!p) return res.status(400).json({ error: "Revisa nombre, tipo, estado y precio" });
    const antes = lista[i]; lista[i] = p; cat.guardar(lista);
    cat.limpiarFotos(p.id, p.fotos);
    cat.registrar(req.usuario.nombre, "editó", { id: p.id, nombre: p.nombre, ...(antes.precio !== p.precio ? { precio: `${antes.precio} → ${p.precio}` } : {}) });
    res.json(p);
  });
  r.patch("/productos/:id", (req, res) => {
    const { lista, i } = buscar(req.params.id);
    if (i < 0) return res.status(404).json({ error: "No existe" });
    const b = req.body || {}, cambios = {};
    if (b.stock !== undefined) { const n = Number(b.stock); if (!Number.isInteger(n) || n < 0 || n > 9999) return res.status(400).json({ error: "Existencias inválidas" }); cambios.stock = n; }
    for (const k of ["oculto", "destacado"]) if (b[k] !== undefined) {
      if (req.usuario.rol !== "dueno") return res.status(403).json({ error: "Solo el dueño puede hacer esto" });
      cambios[k] = b[k] === true;
    }
    if (!Object.keys(cambios).length) return res.status(400).json({ error: "Nada que cambiar" });
    const antes = lista[i];
    lista[i] = cat.limpiarProducto({ ...antes, ...cambios }); cat.guardar(lista);
    cat.registrar(req.usuario.nombre, "cambió", { id: antes.id, nombre: antes.nombre, ...Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, `${antes[k]} → ${v}`])) });
    res.json(lista[i]);
  });
  /* Fotos: llegan ya reducidas desde el navegador. Se valida el contenido real (no la extensión ni el tipo que diga el navegador) */
  const tipoReal = b => {
    if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
    if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp";
    return null;
  };
  r.post("/productos/:id/fotos", soloDueno, express.raw({ type: () => true, limit: "4mb" }), (req, res) => {
    const { lista, i } = buscar(req.params.id);
    if (i < 0) return res.status(404).json({ error: "No existe" });
    if (lista[i].fotos.length >= cat.MAX_FOTOS) return res.status(400).json({ error: `Máximo ${cat.MAX_FOTOS} fotos por producto` });
    const ext = Buffer.isBuffer(req.body) ? tipoReal(req.body) : null;
    if (!ext) return res.status(415).json({ error: "La foto debe ser JPG, PNG o WEBP" });
    const nombre = `${lista[i].id}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(cat.FOTOS, nombre), req.body, { flag: "wx" });
    lista[i] = cat.limpiarProducto({ ...lista[i], fotos: [...lista[i].fotos, nombre] }); cat.guardar(lista);
    cat.registrar(req.usuario.nombre, "subió foto", { id: lista[i].id, nombre: lista[i].nombre });
    res.status(201).json(lista[i]);
  });
  r.delete("/productos/:id", soloDueno, (req, res) => {
    const { lista, i } = buscar(req.params.id);
    if (i < 0) return res.status(404).json({ error: "No existe" });
    const [p] = lista.splice(i, 1); cat.guardar(lista); cat.limpiarFotos(p.id);
    cat.registrar(req.usuario.nombre, "eliminó", { id: p.id, nombre: p.nombre });
    res.json({ ok: true });
  });

  r.get("/solicitudes", (req, res) => res.json(leerSolicitudes()));
  r.patch("/solicitudes/:id", (req, res) => {
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: "Solicitud inválida" });
    const estado = leerJson(ESTADO_SOL, {});
    if (req.body && req.body.atendida === true) estado[id] = { por: req.usuario.nombre, fecha: new Date().toISOString() }; else delete estado[id];
    fs.writeFileSync(ESTADO_SOL, JSON.stringify(estado));
    res.json({ ok: true });
  });
  r.get("/registro", soloDueno, (req, res) => res.json(cat.leerRegistro()));
  return r;
}

module.exports = { crearPanel, hashClave, USUARIOS };
