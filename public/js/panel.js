/* Panel de Atlanta Tecnología.
   Todo texto se inserta con textContent. Cada cambio va con la cabecera X-Atlanta (protección CSRF del servidor). */
import { portada } from "./dibujos.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pesos = n => "$ " + Math.round(n || 0).toLocaleString("es-CO");
const el = (tag, props = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v; /* solo SVG propios */
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h);
  return e;
};
const ICON = {
  editar: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  estrella: '<svg viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  ojo: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  ojoNo: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.3 7.6A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  principal: '<svg viewBox="0 0 24 24"><path d="m12 4 2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 15.8l-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z"/></svg>'
};

/* Medidas reales (mm) y cámaras de cada iPhone, para no escribirlas a mano */
const MODELOS = [
  ["iPhone 17 Pro Max", 163.4, 78, 8.75, "barra", 3], ["iPhone 17 Pro", 150, 71.9, 8.75, "barra", 3], ["iPhone Air", 156.2, 74.7, 5.64, "barra", 1], ["iPhone 17", 149.6, 71.5, 7.95, "cuadro", 2],
  ["iPhone 16 Pro Max", 163, 77.6, 8.25, "cuadro", 3], ["iPhone 16 Pro", 149.6, 71.5, 8.25, "cuadro", 3], ["iPhone 16 Plus", 160.9, 77.8, 7.8, "cuadro", 2], ["iPhone 16", 147.6, 71.6, 7.8, "cuadro", 2], ["iPhone 16e", 146.7, 71.5, 7.8, "cuadro", 1],
  ["iPhone 15 Pro Max", 159.9, 76.7, 8.25, "cuadro", 3], ["iPhone 15 Pro", 146.6, 70.6, 8.25, "cuadro", 3], ["iPhone 15 Plus", 160.9, 77.8, 7.8, "cuadro", 2], ["iPhone 15", 147.6, 71.6, 7.8, "cuadro", 2],
  ["iPhone 14 Pro Max", 160.7, 77.6, 7.85, "cuadro", 3], ["iPhone 14 Pro", 147.5, 71.5, 7.85, "cuadro", 3], ["iPhone 14 Plus", 160.8, 78.1, 7.8, "cuadro", 2], ["iPhone 14", 146.7, 71.5, 7.8, "cuadro", 2],
  ["iPhone 13 Pro Max", 160.8, 78.1, 7.65, "cuadro", 3], ["iPhone 13 Pro", 146.7, 71.5, 7.65, "cuadro", 3], ["iPhone 13", 146.7, 71.5, 7.65, "cuadro", 2], ["iPhone 13 mini", 131.5, 64.2, 7.65, "cuadro", 2],
  ["iPhone 12 Pro Max", 160.8, 78.1, 7.4, "cuadro", 3], ["iPhone 12 Pro", 146.7, 71.5, 7.4, "cuadro", 3], ["iPhone 12", 146.7, 71.5, 7.4, "cuadro", 2], ["iPhone 12 mini", 131.5, 64.2, 7.4, "cuadro", 2],
  ["iPhone 11 Pro Max", 158, 77.8, 8.1, "cuadro", 3], ["iPhone 11 Pro", 144, 71.4, 8.1, "cuadro", 3], ["iPhone 11", 150.9, 75.7, 8.3, "cuadro", 2], ["iPhone SE (3.ª gen.)", 138.4, 67.3, 7.3, "cuadro", 1]
];
const CARAS = { trasera: "Atrás", frontal: "Pantalla", "marco-izq": "Lado izquierdo", "marco-der": "Lado derecho", "marco-sup": "Borde de arriba", "marco-inf": "Borde de abajo" };

let yo = null, productos = [], solicitudes = [], filtroP = "todos", filtroS = "pendientes";

/* ---------- API ---------- */
async function api(metodo, url, cuerpo) {
  const r = await fetch("/api/admin" + url, { method: metodo, credentials: "same-origin",
    headers: { "X-Atlanta": "1", ...(cuerpo ? { "Content-Type": "application/json" } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== "/login") { mostrarEntrada(); throw new Error(j.error || "Inicia sesión"); }
  if (!r.ok) throw new Error(j.error || "No se pudo completar");
  return j;
}
let tAviso;
const avisar = msg => { const a = $("#aviso"); a.textContent = msg; a.classList.add("visible"); clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove("visible"), 2600); };

/* ---------- Entrada ---------- */
function mostrarEntrada() { $("#tablero").hidden = true; $("#entrada").hidden = false; $("#editor").open && $("#editor").close(); setTimeout(() => $("#form-entrada").usuario.focus(), 50); }
$("#form-entrada").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, estado = $(".formulario__estado", f), b = $("button", f);
  if (!f.usuario.value.trim() || !f.clave.value) { estado.className = "formulario__estado error"; estado.textContent = "Escribe usuario y contraseña."; return; }
  b.disabled = true; estado.className = "formulario__estado"; estado.textContent = "Entrando…";
  try {
    await api("POST", "/login", { usuario: f.usuario.value.trim(), clave: f.clave.value });
    f.reset(); estado.textContent = ""; await arrancar();
  } catch (err) { estado.className = "formulario__estado error"; estado.textContent = err.message; f.clave.select(); }
  finally { b.disabled = false; }
});
$("#salir").addEventListener("click", async () => { await api("POST", "/salir").catch(() => {}); yo = null; mostrarEntrada(); });

async function arrancar() {
  try { yo = await api("GET", "/yo"); } catch { return; }
  $("#entrada").hidden = true; $("#tablero").hidden = false;
  $("#quien").replaceChildren(el("span", { text: yo.nombre }), el("b", { text: yo.rol === "dueno" ? "Dueño" : "Empleado" }));
  $$("[data-solo-dueno]").forEach(x => { x.hidden = yo.rol !== "dueno"; });
  await Promise.all([cargarProductos(), cargarSolicitudes()]);
}

/* ---------- Pestañas ---------- */
$$(".pestanas button").forEach(b => b.addEventListener("click", () => {
  $$(".pestanas button").forEach(x => x.setAttribute("aria-selected", x === b));
  for (const v of ["productos", "solicitudes", "registro"]) $("#vista-" + v).hidden = v !== b.dataset.pestana;
  if (b.dataset.pestana === "registro") cargarRegistro();
  if (b.dataset.pestana === "solicitudes") cargarSolicitudes();
}));

/* ---------- Productos ---------- */
async function cargarProductos() { productos = await api("GET", "/productos"); pintarProductos(); }
function pintarProductos() {
  const q = $("#buscar").value.trim().toLowerCase();
  const lista = productos.filter(p => (filtroP === "todos" || (filtroP === "agotado" ? !p.stock : filtroP === "oculto" ? p.oculto : p.estado === filtroP))
    && (!q || `${p.nombre} ${p.capacidad} ${p.color.nombre}`.toLowerCase().includes(q)));
  const dueno = yo.rol === "dueno";
  $("#resumen").textContent = `${productos.length} productos · ${productos.filter(p => !p.oculto && p.stock).length} a la venta · ${productos.filter(p => !p.stock).length} agotados`;
  $("#filas").replaceChildren(...(lista.length ? lista.map(p => el("li", { class: "fila" + (p.oculto ? " apagada" : "") },
    el("div", { class: "fila__mini" }, portada(p)),
    el("div", { class: "fila__info" },
      el("div", { class: "fila__nombre", text: p.nombre }),
      el("div", { class: "fila__detalle" },
        el("span", { class: `etiqueta etiqueta--${p.estado}`, text: p.estado === "usado" ? `Seminuevo ${p.grado || ""}` : "Nuevo" }),
        el("span", { text: [p.capacidad, p.color.nombre].filter(Boolean).join(" · ") }),
        p.marcas.length ? el("span", { text: `· ${p.marcas.length} detalle${p.marcas.length > 1 ? "s" : ""} 3D` }) : null,
        p.oculto ? el("span", { text: "· Oculto" }) : null)),
    el("div", { class: "fila__precio", text: pesos(p.precio) }),
    pasoStock(p),
    el("div", { class: "fila__acciones" },
      dueno && el("button", { class: "boton-icono", html: ICON.estrella, title: "Destacado", "aria-label": `Destacar ${p.nombre}`, "aria-pressed": String(p.destacado), onclick: () => cambiar(p, { destacado: !p.destacado }) }),
      dueno && el("button", { class: "boton-icono", html: p.oculto ? ICON.ojoNo : ICON.ojo, title: p.oculto ? "Oculto: mostrar en la tienda" : "Visible: ocultar de la tienda", "aria-label": `${p.oculto ? "Mostrar" : "Ocultar"} ${p.nombre}`, onclick: () => cambiar(p, { oculto: !p.oculto }) }),
      dueno && el("button", { class: "boton-icono", html: ICON.editar, title: "Editar", "aria-label": `Editar ${p.nombre}`, onclick: () => abrirEditor(p) }))))
    : [el("li", { class: "vacio-panel", text: "No hay productos con ese filtro." })]));
}
function pasoStock(p) {
  const out = el("output", { text: p.stock }), caja = el("div", { class: "paso" + (p.stock ? "" : " cero"), title: "Existencias" });
  let t;
  const mover = d => {
    const n = Math.max(0, +out.textContent + d); out.textContent = n; caja.classList.toggle("cero", !n);
    clearTimeout(t); t = setTimeout(() => cambiar(p, { stock: n }, false), 500); /* espera a que deje de tocar */
  };
  caja.append(el("button", { "aria-label": `Restar existencias de ${p.nombre}`, text: "−", onclick: () => mover(-1) }), out,
    el("button", { "aria-label": `Sumar existencias de ${p.nombre}`, text: "+", onclick: () => mover(1) }));
  return caja;
}
async function cambiar(p, cambios, repintar = true) {
  try {
    const nuevo = await api("PATCH", `/productos/${encodeURIComponent(p.id)}`, cambios);
    productos = productos.map(x => x.id === p.id ? nuevo : x);
    avisar("stock" in cambios ? `${p.nombre}: ${nuevo.stock} en existencia` : "Guardado");
    if (repintar) pintarProductos(); else $("#resumen") && pintarResumen();
  } catch (e) { avisar(e.message); pintarProductos(); }
}
const pintarResumen = () => { $("#resumen").textContent = `${productos.length} productos · ${productos.filter(p => !p.oculto && p.stock).length} a la venta · ${productos.filter(p => !p.stock).length} agotados`; };
$$("[data-f]").forEach(b => b.addEventListener("click", () => { filtroP = b.dataset.f; $$("[data-f]").forEach(x => x.setAttribute("aria-pressed", x === b)); pintarProductos(); }));
$("#buscar").addEventListener("input", pintarProductos);

/* ---------- Editor ---------- */
const form = $("#form-producto"), dlg = $("#editor");
let editando = null, marcas = [], specs = [], fotos = [], nuevas = [], visor = null, tVisor, crearVisor = null;
for (const m of MODELOS) $("#plantilla").append(el("option", { value: m[0], text: m[0] }));

const numero = v => { const n = String(v || "").replace(/[^\d]/g, ""); return n ? +n : null; };
function leerForm() {
  const f = form, usado = f.estado.value === "usado", iphone = f.familia.value === "iphone";
  const modelo = iphone && +f.alto.value && +f.ancho.value ? { alto: +f.alto.value, ancho: +f.ancho.value, grosor: +f.grosor.value || 8, modulo: f.modulo.value, lentes: +f.lentes.value } : null;
  return {
    nombre: f.nombre.value.trim(), familia: f.familia.value, estado: f.estado.value, capacidad: f.capacidad.value.trim(),
    color: { nombre: f.colorNombre.value.trim(), hex: f.colorHex.value }, precio: numero(f.precio.value), precioNuevo: usado ? numero(f.precioNuevo.value) : null,
    stock: Math.max(0, parseInt(f.stock.value, 10) || 0), garantia: f.garantia.value.trim(), destacado: f.destacado.checked, oculto: f.oculto.checked,
    grado: usado ? f.grado.value : null, bateria: usado && f.bateria.value ? +f.bateria.value : null,
    incluye: f.incluye.value.split(",").map(s => s.trim()).filter(Boolean),
    specs: Object.fromEntries(specs.filter(([k, v]) => k.trim() && v.trim()).map(([k, v]) => [k.trim(), v.trim()])),
    modelo, marcas: usado && modelo ? marcas : [], fotos: [...fotos]
  };
}
function llenarForm(p) {
  const f = form;
  f.reset();
  f.nombre.value = p.nombre || ""; f.familia.value = p.familia || "iphone"; f.estado.value = p.estado || "usado";
  f.capacidad.value = p.capacidad || ""; f.colorNombre.value = p.color?.nombre || ""; f.colorHex.value = p.color?.hex || "#cccccc";
  f.precio.value = p.precio ? p.precio.toLocaleString("es-CO") : ""; f.precioNuevo.value = p.precioNuevo ? p.precioNuevo.toLocaleString("es-CO") : "";
  f.stock.value = p.stock ?? 1; f.garantia.value = p.garantia || ""; f.destacado.checked = !!p.destacado; f.oculto.checked = !!p.oculto;
  f.grado.value = p.grado || "A"; f.bateria.value = p.bateria || ""; f.incluye.value = (p.incluye || []).join(", ");
  const m = p.modelo || {}; f.alto.value = m.alto || ""; f.ancho.value = m.ancho || ""; f.grosor.value = m.grosor || ""; f.modulo.value = m.modulo || "cuadro"; f.lentes.value = m.lentes || 2;
  $("#plantilla").value = "";
  specs = Object.entries(p.specs || {}); marcas = (p.marcas || []).map(x => ({ ...x }));
  fotos = [...(p.fotos || [])]; nuevas.forEach(n => URL.revokeObjectURL(n.url)); nuevas = [];
  $$("[aria-invalid]", form).forEach(i => i.removeAttribute("aria-invalid"));
}
function abrirEditor(p) {
  editando = p || null;
  $("#editor-titulo").textContent = p ? `Editar · ${p.nombre}` : "Nuevo producto";
  $("#eliminar").hidden = !p;
  $("#estado-editor").textContent = "";
  llenarForm(p || { familia: "iphone", estado: "usado", stock: 1, garantia: "6 meses Atlanta", grado: "A" });
  dlg.showModal(); document.body.classList.add("sin-scroll");
  pintarSpecs(); pintarFotos(); actualizar(true);
  form.nombre.focus();
}
$("#nuevo").addEventListener("click", () => abrirEditor(null));
dlg.addEventListener("click", e => { if (e.target.closest("[data-cerrar]")) dlg.close(); });
dlg.addEventListener("close", () => { document.body.classList.remove("sin-scroll"); visor?.destruir(); visor = null; });

/* Muestra u oculta secciones según tipo y estado, y refresca la vista previa */
function actualizar(rehacer3D) {
  const d = leerForm(), usado = d.estado === "usado", iphone = d.familia === "iphone";
  $$("[data-usado]", form).forEach(x => { x.hidden = !usado; });
  $("#campos-modelo").hidden = !iphone; $("#campo-plantilla").hidden = !iphone;
  const nueva = !fotos.length && nuevas[0];
  $("#previa").replaceChildren(nueva ? el("img", { class: "foto", src: nueva.url, alt: "" }) : portada({ ...d, nombre: d.nombre || "Vista previa" }));
  $("#bloque-3d").hidden = !iphone || !d.modelo;
  $("#ayuda-3d").textContent = usado ? "Toca el equipo donde está el rayón o golpe para marcarlo. Arrastra para girar." : "Vista previa del equipo en 3D. Los detalles solo se marcan en seminuevos.";
  pintarMarcas();
  if (rehacer3D) { clearTimeout(tVisor); tVisor = setTimeout(montarVisor, 350); }
}
async function montarVisor() {
  visor?.destruir(); visor = null;
  const d = leerForm();
  if (!dlg.open || d.familia !== "iphone" || !d.modelo) return;
  $("#cargando-editor").hidden = false;
  try {
    crearVisor ||= (await import("./visor3d.js")).crearVisor;
    visor = crearVisor($("#escena-editor"), { ...d, marcas: d.estado === "usado" ? marcas : [] }, {
      alColocar: d.estado === "usado" ? m => { marcas.push({ ...m, texto: "" }); visor.ponerMarcas(marcas); pintarMarcas(marcas.length - 1); } : null,
      alMarcar: i => $$("#marcas li").forEach((li, j) => li.classList.toggle("activa", i === j))
    });
    $("#cargando-editor").hidden = true;
    visor.vista("trasera");
  } catch (e) { console.error(e); $("#cargando-editor").textContent = "No se pudo mostrar el 3D en este navegador."; }
}
function pintarMarcas(enfocar = -1) {
  const usado = form.estado.value === "usado";
  $("#marcas").hidden = !usado;
  $("#marcas").replaceChildren(...(marcas.length ? marcas.map((m, i) => {
    const ta = el("textarea", { maxlength: "200", placeholder: "Ej. Rayón fino de 3 mm, solo se ve a contraluz", "aria-label": `Descripción del detalle ${i + 1}` });
    ta.value = m.texto;
    ta.addEventListener("input", () => { m.texto = ta.value; ta.removeAttribute("aria-invalid"); });
    ta.addEventListener("change", () => visor?.ponerMarcas(marcas));
    ta.addEventListener("focus", () => visor?.enfocarMarca(i));
    const li = el("li", {}, el("b", { text: i + 1 }), el("div", {}, el("small", { text: CARAS[m.cara] }), ta),
      el("button", { type: "button", html: ICON.x, "aria-label": `Quitar detalle ${i + 1}`, onclick: () => { marcas.splice(i, 1); visor?.ponerMarcas(marcas); pintarMarcas(); } }));
    if (i === enfocar) setTimeout(() => ta.focus({ preventScroll: true }), 30);
    return li;
  }) : [el("li", { class: "visor__sin-marcas", text: "Sin detalles marcados: se mostrará como «como nuevo»." })]));
}
function pintarSpecs() {
  $("#specs").replaceChildren(...specs.map((s, i) => {
    const k = el("input", { maxlength: "30", placeholder: "Pantalla", "aria-label": "Característica" }), v = el("input", { maxlength: "80", placeholder: "6,1\" Super Retina XDR", "aria-label": "Valor" });
    k.value = s[0]; v.value = s[1];
    k.addEventListener("input", () => { s[0] = k.value; }); v.addEventListener("input", () => { s[1] = v.value; });
    return el("li", {}, k, v, el("button", { type: "button", html: ICON.x, "aria-label": "Quitar característica", onclick: () => { specs.splice(i, 1); pintarSpecs(); } }));
  }));
}
/* ---------- Fotos del editor ----------
   Se reducen en el navegador (máx. 1600 px, WEBP o JPG) para que suban rápido y la tienda cargue liviana.
   Las nuevas se suben al guardar, después de crear o actualizar el producto. */
async function reducir(archivo) {
  const bmp = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  const como = tipo => new Promise(r => c.toBlob(r, tipo, .85));
  let blob = await como("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await como("image/jpeg");
  return blob;
}
async function agregarFotos(archivos) {
  for (const a of [...archivos]) {
    if (fotos.length + nuevas.length >= 6) { avisar("Máximo 6 fotos por producto"); break; }
    if (!/^image\//.test(a.type)) { avisar(`«${a.name}» no es una imagen`); continue; }
    try { const blob = await reducir(a); nuevas.push({ blob, url: URL.createObjectURL(blob) }); }
    catch { avisar(`No se pudo leer «${a.name}». Prueba con JPG o PNG.`); }
  }
  pintarFotos(); actualizar(false);
}
function pintarFotos() {
  const tarjeta = (src, pendiente, i, quitar, hacerPrincipal) => el("li", {},
    el("img", { src, alt: `Foto ${i + 1}` }),
    i === 0 && el("span", { class: "principal", text: "Principal" }),
    pendiente && el("span", { class: "pendiente", text: "Se sube al guardar" }),
    el("div", { class: "acciones-foto" },
      i > 0 && hacerPrincipal && el("button", { type: "button", html: ICON.principal, title: "Hacer principal", "aria-label": `Hacer principal la foto ${i + 1}`, onclick: hacerPrincipal }),
      el("button", { type: "button", html: ICON.x, title: "Quitar", "aria-label": `Quitar foto ${i + 1}`, onclick: quitar })));
  $("#fotos").replaceChildren(
    ...fotos.map((f, i) => tarjeta("/fotos/" + f, false, i, () => { fotos.splice(i, 1); pintarFotos(); actualizar(false); },
      () => { fotos.unshift(...fotos.splice(i, 1)); pintarFotos(); actualizar(false); })),
    ...nuevas.map((n, j) => tarjeta(n.url, true, fotos.length + j, () => { URL.revokeObjectURL(n.url); nuevas.splice(j, 1); pintarFotos(); actualizar(false); }, null)));
  $("#soltar").hidden = fotos.length + nuevas.length >= 6;
}
$("#elegir-fotos").addEventListener("change", e => { agregarFotos(e.target.files); e.target.value = ""; });
const zona = $("#soltar");
zona.addEventListener("dragover", e => { e.preventDefault(); zona.classList.add("encima"); });
zona.addEventListener("dragleave", () => zona.classList.remove("encima"));
zona.addEventListener("drop", e => { e.preventDefault(); zona.classList.remove("encima"); agregarFotos(e.dataTransfer.files); });

$("#agregar-spec").addEventListener("click", () => { if (specs.length >= 8) return avisar("Máximo 8 características"); specs.push(["", ""]); pintarSpecs(); $("#specs li:last-child input").focus(); });

$("#plantilla").addEventListener("change", e => {
  const m = MODELOS.find(x => x[0] === e.target.value); if (!m) return;
  form.alto.value = m[1]; form.ancho.value = m[2]; form.grosor.value = m[3]; form.modulo.value = m[4]; form.lentes.value = m[5];
  if (!form.nombre.value.trim()) form.nombre.value = m[0];
  actualizar(true);
});
const CAMPOS_3D = ["familia", "estado", "colorHex", "alto", "ancho", "grosor", "modulo", "lentes"];
form.addEventListener("input", e => actualizar(CAMPOS_3D.includes(e.target.name)));
form.addEventListener("change", e => { if (e.target.name === "estado" || e.target.name === "familia") actualizar(true); });
for (const n of ["precio", "precioNuevo"]) form[n].addEventListener("blur", e => { const v = numero(e.target.value); e.target.value = v ? v.toLocaleString("es-CO") : ""; });
$$(".editor .visor__vistas button").forEach(b => b.addEventListener("click", () => visor?.vista(b.dataset.vista)));

form.addEventListener("submit", async e => {
  e.preventDefault();
  const d = leerForm(), estado = $("#estado-editor");
  $$("[aria-invalid]", form).forEach(i => i.removeAttribute("aria-invalid"));
  const errores = [];
  if (!d.nombre) { form.nombre.setAttribute("aria-invalid", "true"); errores.push("el nombre"); }
  if (!d.precio) { form.precio.setAttribute("aria-invalid", "true"); errores.push("el precio"); }
  const sinTexto = d.marcas.findIndex(m => !m.texto.trim());
  if (sinTexto >= 0) { $$("#marcas textarea")[sinTexto]?.setAttribute("aria-invalid", "true"); errores.push(`la descripción del detalle ${sinTexto + 1}`); }
  if (errores.length) { estado.className = "formulario__estado editor__estado error"; estado.textContent = "Falta " + errores.join(", ") + "."; return; }
  estado.className = "formulario__estado editor__estado"; estado.textContent = "Guardando…";
  try {
    let p = editando ? await api("PUT", `/productos/${encodeURIComponent(editando.id)}`, d) : await api("POST", "/productos", d);
    const existia = productos.some(x => x.id === p.id);
    editando = p; /* si una foto falla, volver a guardar actualiza en vez de crear otro producto */
    const guardarEnLista = () => { productos = productos.some(x => x.id === p.id) ? productos.map(x => x.id === p.id ? p : x) : [...productos, p]; };
    while (nuevas.length) {
      estado.textContent = `Subiendo foto… (faltan ${nuevas.length})`;
      const f = nuevas[0];
      const r = await fetch(`/api/admin/productos/${encodeURIComponent(p.id)}/fotos`, { method: "POST", credentials: "same-origin", headers: { "X-Atlanta": "1", "Content-Type": f.blob.type }, body: f.blob });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { guardarEnLista(); fotos = [...p.fotos]; pintarFotos(); pintarProductos(); throw new Error(j.error || "No se pudo subir una foto"); }
      p = j; URL.revokeObjectURL(f.url); nuevas.shift();
    }
    guardarEnLista();
    dlg.close(); pintarProductos(); avisar(existia ? "Cambios guardados" : "Producto creado");
  } catch (err) { estado.className = "formulario__estado editor__estado error"; estado.textContent = err.message; }
});
$("#eliminar").addEventListener("click", async () => {
  if (!editando || !confirm(`¿Eliminar «${editando.nombre}»? Queda un respaldo del catálogo, pero dejará de verse en la tienda.`)) return;
  try { await api("DELETE", `/productos/${encodeURIComponent(editando.id)}`); productos = productos.filter(x => x.id !== editando.id); dlg.close(); pintarProductos(); avisar("Producto eliminado"); }
  catch (err) { avisar(err.message); }
});

/* ---------- Solicitudes ---------- */
const enlaceWa = (tel, texto) => { let n = String(tel).replace(/\D/g, ""); if (/^3\d{9}$/.test(n)) n = "57" + n; return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`; };
async function cargarSolicitudes() {
  try { solicitudes = await api("GET", "/solicitudes"); } catch { return; }
  const pend = solicitudes.filter(s => !s.atendida).length;
  $("#pendientes").hidden = !pend; $("#pendientes").textContent = pend;
  pintarSolicitudes();
}
function pintarSolicitudes() {
  const lista = solicitudes.filter(s => filtroS === "todas" || !s.atendida);
  $("#lista-solicitudes").replaceChildren(...(lista.length ? lista.map(s => el("li", { class: "solicitud" + (s.atendida ? " atendida" : "") },
    el("div", { class: "solicitud__cabeza" },
      el("span", { class: `etiqueta tipo-${s.tipo}`, text: s.tipo === "credito" ? "Crédito" : s.tipo === "usado" ? "Vende su usado" : "Reserva" }),
      el("time", { datetime: s.fecha, text: new Date(s.fecha).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) })),
    el("strong", { text: s.nombre }),
    el("p", { text: s.telefono }),
    s.equipo && el("p", { text: s.equipo }),
    s.detalle && el("p", { text: s.detalle }),
    el("div", { class: "solicitud__acciones" },
      el("a", { class: "boton boton--claro boton--chico", target: "_blank", rel: "noopener", href: enlaceWa(s.telefono, `Hola ${s.nombre}, te escribimos de Atlanta Tecnología por tu solicitud${s.equipo ? " sobre " + s.equipo : ""}.`), text: "WhatsApp" }),
      el("button", { class: "boton boton--borde boton--chico", text: s.atendida ? "Marcar pendiente" : "Marcar atendida", onclick: async () => {
        try { await api("PATCH", `/solicitudes/${s.id}`, { atendida: !s.atendida }); s.atendida = !s.atendida; await cargarSolicitudes(); } catch (e) { avisar(e.message); }
      } }))))
    : [el("li", { class: "vacio-panel", text: filtroS === "pendientes" ? "No hay solicitudes pendientes." : "Aún no llegan solicitudes." })]));
}
$$("[data-s]").forEach(b => b.addEventListener("click", () => { filtroS = b.dataset.s; $$("[data-s]").forEach(x => x.setAttribute("aria-pressed", x === b)); pintarSolicitudes(); }));

/* ---------- Registro ---------- */
async function cargarRegistro() {
  let lista = [];
  try { lista = await api("GET", "/registro"); } catch { return; }
  $("#lista-registro").replaceChildren(...(lista.length ? lista.map(r => {
    const { fecha, usuario, accion, id, nombre, ...resto } = r;
    return el("li", {}, el("time", { datetime: fecha, text: new Date(fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) }),
      el("b", { text: usuario }),
      el("span", { text: [accion, nombre, ...Object.entries(resto).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join(" · ") }));
  }) : [el("li", { class: "vacio-panel", text: "Sin movimientos todavía." })]));
}

arrancar().then(() => { if (!yo) mostrarEntrada(); });
