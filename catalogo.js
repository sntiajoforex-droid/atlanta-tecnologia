/* Catálogo: lectura validada, guardado atómico con respaldos y registro de cambios.
   DATA_DIR es la carpeta de datos que sobrevive a los despliegues; la primera vez se siembra con data/productos.json del repositorio. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PRODUCTOS = path.join(DATA_DIR, "productos.json");
const RESPALDOS = path.join(DATA_DIR, "respaldos");
const FOTOS = path.join(DATA_DIR, "fotos");
const MODELOS = path.join(DATA_DIR, "modelos3d");
const REGISTRO = path.join(DATA_DIR, "registro.jsonl");
const SEMILLA = path.join(__dirname, "data", "productos.json");
fs.mkdirSync(FOTOS, { recursive: true });
fs.mkdirSync(MODELOS, { recursive: true });
if (!fs.existsSync(PRODUCTOS) && fs.existsSync(SEMILLA) && path.resolve(SEMILLA) !== path.resolve(PRODUCTOS)) fs.copyFileSync(SEMILLA, PRODUCTOS);

const FAMILIAS = ["iphone", "ipad", "mac", "accesorios"], ESTADOS = ["nuevo", "usado"], GRADOS = ["A+", "A", "B"];
const CARAS = ["trasera", "frontal", "marco-izq", "marco-der", "marco-sup", "marco-inf"];
const txt = (v, max = 120) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
const num = (v, min, max) => (v !== null && v !== "" && Number.isFinite(+v) && +v >= min && +v <= max ? +v : null);

const MAX_FOTOS = 6;
const esFoto = f => /^[a-z0-9-]{2,60}-[0-9a-f]{12}\.(webp|jpg|png)$/.test(f);
/* La foto es de ESTE producto solo si después de «id-» viene exactamente el sufijo aleatorio (si no, «ab» podría tocar las de «ab-c») */
const deProducto = (f, id) => esFoto(f) && f.startsWith(id + "-") && /^[0-9a-f]{12}\.(webp|jpg|png)$/.test(f.slice(id.length + 1));
/* Escaneo 3D real (GLB): un archivo por producto, con el mismo esquema de nombre */
const esEscaneo = f => typeof f === "string" && /^[a-z0-9-]{2,60}-[0-9a-f]{12}\.glb$/.test(f);
const escaneoDe = (f, id) => esEscaneo(f) && f.startsWith(id + "-") && /^[0-9a-f]{12}\.glb$/.test(f.slice(id.length + 1));

function limpiarProducto(p) {
  if (!p || typeof p !== "object") return null;
  const id = txt(p.id, 60);
  if (!/^[a-z0-9-]{2,60}$/.test(id) || !FAMILIAS.includes(p.familia) || !ESTADOS.includes(p.estado) || !num(p.precio, 1, 1e10) || !txt(p.nombre)) return null;
  const color = p.color && /^#[0-9a-f]{6}$/i.test(p.color.hex) ? { nombre: txt(p.color.nombre, 40), hex: p.color.hex.toLowerCase() } : { nombre: txt(p.color && p.color.nombre, 40), hex: "#cccccc" };
  const specs = {};
  for (const [k, v] of Object.entries(p.specs && typeof p.specs === "object" ? p.specs : {}).slice(0, 8)) if (txt(k, 30) && txt(v, 80)) specs[txt(k, 30)] = txt(v, 80);
  const m = p.modelo;
  const modelo = p.familia === "iphone" && m && num(m.alto, 50, 400) && num(m.ancho, 30, 300) ? {
    alto: +m.alto, ancho: +m.ancho, grosor: num(m.grosor, 3, 20) || 8,
    modulo: m.modulo === "barra" ? "barra" : "cuadro", lentes: [1, 2, 3].includes(+m.lentes) ? +m.lentes : 2 } : null;
  const usado = p.estado === "usado";
  const e = p.escaneo;
  const escaneo = e && escaneoDe(e.archivo, id) ? { archivo: e.archivo, voltear: e.voltear === true, invertir: e.invertir === true } : null;
  return {
    id, nombre: txt(p.nombre), familia: p.familia, estado: p.estado, precio: Math.round(+p.precio),
    precioNuevo: num(p.precioNuevo, 1, 1e10) ? Math.round(+p.precioNuevo) : null,
    capacidad: txt(p.capacidad, 40), color, garantia: txt(p.garantia, 60),
    incluye: Array.isArray(p.incluye) ? p.incluye.map(i => txt(i, 60)).filter(Boolean).slice(0, 6) : [],
    destacado: p.destacado === true, oculto: p.oculto === true, stock: Math.max(0, Math.floor(num(p.stock, 0, 9999) || 0)), specs,
    grado: usado && GRADOS.includes(p.grado) ? p.grado : null,
    bateria: usado ? num(p.bateria, 1, 100) : null,
    modelo, escaneo,
    /* Solo nombres generados por el servidor para este mismo producto: nada de rutas ni archivos ajenos */
    fotos: Array.isArray(p.fotos) ? [...new Set(p.fotos.filter(f => typeof f === "string" && deProducto(f, id)))].slice(0, MAX_FOTOS) : [],
    marcas: usado && (modelo || escaneo) && Array.isArray(p.marcas) ? p.marcas.filter(k => k && CARAS.includes(k.cara) && num(k.u, 0, 1) !== null && num(k.v, 0, 1) !== null && txt(k.texto, 200))
      .slice(0, 12).map(k => ({ cara: k.cara, u: +k.u, v: +k.v, texto: txt(k.texto, 200) })) : []
  };
}

let cache = { mtime: 0, lista: [], nota: "" };
function leer() {
  try {
    const mtime = fs.statSync(PRODUCTOS).mtimeMs;
    if (mtime !== cache.mtime) {
      const crudo = JSON.parse(fs.readFileSync(PRODUCTOS, "utf8"));
      cache = { mtime, nota: crudo._nota || "", lista: (crudo.productos || []).map(limpiarProducto).filter(Boolean) };
    }
  } catch (e) { console.error("catálogo:", e.message); }
  return cache.lista;
}
const publico = () => leer().filter(p => !p.oculto).map(({ oculto, ...p }) => p);

/* Guarda la lista completa: primero un respaldo del archivo actual, luego escribe a un temporal y lo renombra (nunca queda a medias) */
function guardar(lista) {
  fs.mkdirSync(RESPALDOS, { recursive: true });
  if (fs.existsSync(PRODUCTOS)) {
    fs.copyFileSync(PRODUCTOS, path.join(RESPALDOS, `productos-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
    const viejos = fs.readdirSync(RESPALDOS).filter(f => /^productos-.*\.json$/.test(f)).sort();
    for (const f of viejos.slice(0, Math.max(0, viejos.length - 30))) fs.rmSync(path.join(RESPALDOS, f), { force: true });
  }
  const tmp = PRODUCTOS + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ _nota: cache.nota || undefined, productos: lista }, null, 2) + "\n");
  fs.renameSync(tmp, PRODUCTOS);
  cache.mtime = 0;
  return leer();
}

const registrar = (usuario, accion, detalle = {}) =>
  fs.appendFile(REGISTRO, JSON.stringify({ fecha: new Date().toISOString(), usuario, accion, ...detalle }) + "\n", e => e && console.error("registro:", e.message));
const leerRegistro = (max = 300) => {
  try { return fs.readFileSync(REGISTRO, "utf8").trim().split("\n").filter(Boolean).slice(-max).reverse().map(l => JSON.parse(l)); } catch { return []; }
};

const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44);
const nuevoId = p => `${slug(`${p.nombre} ${p.capacidad || ""} ${p.color && p.color.nombre || ""}`) || "producto"}-${crypto.randomBytes(3).toString("hex")}`;

/* Borra del disco las fotos de un producto que ya no están en su lista (o todas, si se eliminó) */
function limpiarFotos(id, conservar = []) {
  for (const f of fs.readdirSync(FOTOS)) if (deProducto(f, id) && !conservar.includes(f)) fs.rmSync(path.join(FOTOS, f), { force: true });
}
const fotoExiste = f => esFoto(f) && fs.existsSync(path.join(FOTOS, f));
/* Igual para el escaneo: se borra el archivo viejo al reemplazarlo, quitarlo o eliminar el producto */
function limpiarEscaneos(id, conservar = null) {
  for (const f of fs.readdirSync(MODELOS)) if (escaneoDe(f, id) && f !== conservar) fs.rmSync(path.join(MODELOS, f), { force: true });
}
const escaneoExiste = f => esEscaneo(f) && fs.existsSync(path.join(MODELOS, f));

/* Revisa que el archivo sea un GLB (glTF 2.0 binario) autocontenido y que el visor lo pueda abrir.
   Devuelve null si está bien o el motivo del rechazo. */
const EXT_ADMITIDAS = ["KHR_texture_transform", "KHR_mesh_quantization", "KHR_materials_unlit", "KHR_materials_emissive_strength", "KHR_materials_ior", "KHR_materials_specular"];
function revisarGlb(b) {
  const NO = "El archivo debe ser un escaneo en formato GLB";
  if (!Buffer.isBuffer(b) || b.length < 28 || b.toString("latin1", 0, 4) !== "glTF") return NO;
  if (b.readUInt32LE(4) !== 2 || b.readUInt32LE(8) !== b.length) return NO;
  const largo = b.readUInt32LE(12);
  if (b.readUInt32LE(16) !== 0x4e4f534a || largo > b.length - 20) return NO;
  let j;
  try { j = JSON.parse(b.toString("utf8", 20, 20 + largo)); } catch { return NO; }
  if (!j || typeof j !== "object" || !String(j.asset && j.asset.version).startsWith("2")) return NO;
  if (!Array.isArray(j.meshes) || !j.meshes.length) return "El escaneo no trae ninguna malla 3D";
  /* Nada de archivos o direcciones externas: todo debe venir dentro del GLB */
  if ((j.buffers || []).some(x => x && x.uri !== undefined) || (j.images || []).some(x => x && x.uri !== undefined))
    return "El GLB pide archivos externos. Expórtalo como un solo archivo .glb";
  const pide = (j.extensionsRequired || []).filter(x => !EXT_ADMITIDAS.includes(x));
  if (pide.length) return "El escaneo viene comprimido (" + pide.join(", ").slice(0, 80) + "). Expórtalo en GLB sin compresión";
  return null;
}

module.exports = { DATA_DIR, FOTOS, MODELOS, MAX_FOTOS, limpiarFotos, fotoExiste, limpiarEscaneos, escaneoExiste, revisarGlb, limpiarProducto, leer, publico, guardar, registrar, leerRegistro, nuevoId, txt };
