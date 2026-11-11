/* Atlanta Tecnología — lógica de la tienda.
   Todo texto que viene del catálogo se inserta con textContent; los SVG de dibujos.js escapan lo que usan. */
import { dibujo, portada } from "./dibujos.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pesos = n => "$ " + Math.round(n).toLocaleString("es-CO");
const el = (tag, props = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v; /* solo para SVG propios */
    else if (k === "style") e.style.cssText = v; /* por CSSOM: la CSP no permite atributos style en línea */
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h);
  return e;
};
const ICONO_3D = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>';
const ICONO_MAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

let productos = [], config = { whatsapp: "", whatsappLink: "#", instagram: "#" };
const filtro = { estado: "todos", familia: "todas", q: "", orden: "destacados" };

/* ---------- WhatsApp ---------- */
const enlaceWhatsapp = texto => config.whatsapp ? `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(texto)}` : config.whatsappLink;

/* ---------- Aviso breve ---------- */
let tAviso;
const avisar = msg => { const a = $("#aviso"); a.textContent = msg; a.classList.add("visible"); clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove("visible"), 2600); };

/* ---------- Carrito (se guarda en este navegador) ---------- */
const CLAVE = "atlanta-carrito";
let carrito = {};
try { carrito = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { carrito = {}; }
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(carrito)); } catch { /* modo privado */ } };
const itemsCarrito = () => Object.entries(carrito).map(([id, cant]) => ({ p: productos.find(x => x.id === id), cant })).filter(i => i.p && i.p.stock > 0);
function agregar(p) {
  if (!p.stock) return avisar("Este equipo está agotado");
  const actual = carrito[p.id] || 0;
  if (actual >= p.stock) return avisar(p.stock === 1 ? "Solo hay una unidad de este equipo" : `Solo hay ${p.stock} unidades`);
  carrito[p.id] = actual + 1; guardar(); pintarCarrito();
  const c = $("#contador-carrito"); c.classList.remove("salta"); void c.offsetWidth; c.classList.add("salta");
  avisar(`${p.nombre} agregado al carrito`);
}
function pintarCarrito() {
  const items = itemsCarrito(), lista = $("#carrito-lista"), total = items.reduce((s, i) => s + i.p.precio * i.cant, 0);
  const cuenta = items.reduce((s, i) => s + i.cant, 0);
  $("#contador-carrito").hidden = !cuenta; $("#contador-carrito").textContent = cuenta;
  $("#carrito-vacio").hidden = !!items.length; $("#carrito-pie").hidden = !items.length;
  lista.replaceChildren(...items.map(({ p, cant }) => el("li", { class: "carrito__item" },
    el("div", { class: "mini" }, portada(p)),
    el("div", {},
      el("strong", { text: p.nombre }),
      el("small", { text: [p.capacidad, p.color.nombre, p.estado === "usado" ? `Seminuevo ${p.grado || ""}` : "Nuevo"].filter(Boolean).join(" · ") }),
      el("div", { class: "carrito__cant" },
        el("button", { "aria-label": "Quitar uno", text: "−", onclick: () => { carrito[p.id]--; if (carrito[p.id] <= 0) delete carrito[p.id]; guardar(); pintarCarrito(); } }),
        el("span", { text: cant }),
        el("button", { "aria-label": "Agregar uno", text: "+", onclick: () => agregar(p) }),
        el("button", { class: "carrito__quitar", text: "Quitar", onclick: () => { delete carrito[p.id]; guardar(); pintarCarrito(); } }))),
    el("strong", { text: pesos(p.precio * cant) }))));
  $("#carrito-total").textContent = pesos(total);
  const lineas = items.map(({ p, cant }) => `• ${cant} × ${p.nombre} ${p.capacidad} ${p.color.nombre}${p.estado === "usado" ? ` (seminuevo ${p.grado || ""})` : ""} — ${pesos(p.precio * cant)}`);
  $("#carrito-whatsapp").href = enlaceWhatsapp(`Hola Atlanta Tecnología, quiero este pedido:\n${lineas.join("\n")}\nTotal: ${pesos(total)}`);
}

/* ---------- Modales ---------- */
function abrir(d) { if (!d.open) { d.showModal(); document.body.classList.add("sin-scroll"); } }
for (const d of $$("dialog")) {
  d.addEventListener("close", () => { if (!$$("dialog[open]").length) document.body.classList.remove("sin-scroll"); });
  d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-cerrar]")) d.close(); });
}

/* ---------- Catálogo ---------- */
function visibles() {
  const q = filtro.q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let lista = productos.filter(p => (filtro.estado === "todos" || p.estado === filtro.estado) && (filtro.familia === "todas" || p.familia === filtro.familia)
    && (!q || `${p.nombre} ${p.capacidad} ${p.color.nombre} ${p.estado === "usado" ? "seminuevo usado" : "nuevo"}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)));
  if (filtro.orden === "menor") lista.sort((a, b) => a.precio - b.precio);
  else if (filtro.orden === "mayor") lista.sort((a, b) => b.precio - a.precio);
  else lista.sort((a, b) => (!!b.stock - !!a.stock) || (b.destacado - a.destacado));
  return lista;
}
const tiene3D = p => p.familia === "iphone" && !!p.modelo;

function tarjeta(p, i) {
  const detalle = el("p", { class: "tarjeta__detalle" },
    el("span", { class: "punto-color", style: `background:${p.color.hex}`, "aria-hidden": "true" }),
    el("span", { text: [p.capacidad, p.color.nombre].filter(Boolean).join(" · ") }));
  if (p.bateria) detalle.append(el("span", { class: "bateria", title: "Salud de batería" }, el("i", { style: `--nivel:${p.bateria}%` }), el("span", { text: `${p.bateria} %` })));
  return el("li", {}, el("article", { class: "tarjeta", style: `--i:${i}` },
    el("button", { class: "tarjeta__abrir", "aria-label": `Ver ${p.nombre} ${p.capacidad}`, onclick: () => abrirFicha(p) }),
    el("div", { class: "tarjeta__visual" + (p.fotos.length ? " con-foto" : "") }, portada(p),
      el("div", { class: "etiquetas" },
        el("span", { class: `etiqueta etiqueta--${p.estado}`, text: p.estado === "usado" ? `Seminuevo ${p.grado || ""}` : "Nuevo" }),
      ),
      p.estado === "usado" && p.fotos.length ? el("span", { class: "etiqueta etiqueta--fotos", text: p.fotos.length > 1 ? `${p.fotos.length} fotos reales` : "Foto real" }) : null,
      p.estado === "usado" && tiene3D(p) && el("button", { class: "tarjeta__3d", html: ICONO_3D + "<span>Ver en 3D</span>", onclick: () => abrirVisor(p) })),
    el("div", { class: "tarjeta__cuerpo" },
      el("h3", { class: "tarjeta__nombre", text: p.nombre }), detalle,
      el("div", { class: "tarjeta__pie" },
        el("div", {}, p.precioNuevo && el("span", { class: "precio-antes", text: `Nuevo: ${pesos(p.precioNuevo)}` }), el("span", { class: "precio", text: pesos(p.precio) })),
        p.stock ? el("button", { class: "boton-mas", html: ICONO_MAS, "aria-label": `Agregar ${p.nombre} al carrito`, onclick: () => agregar(p) }) : el("span", { class: "agotado", text: "Agotado" })))));
}
function pintarCatalogo() {
  const lista = visibles();
  $("#rejilla").replaceChildren(...lista.map(tarjeta));
  $("#vacio").hidden = !!lista.length;
  $("#banda-3d").hidden = filtro.estado !== "usado";
  $$(".segmentado button").forEach(b => b.setAttribute("aria-selected", b.dataset.estado === filtro.estado));
  $$("#chips-familia .chip").forEach(b => b.setAttribute("aria-pressed", b.dataset.familia === filtro.familia));
}

/* ---------- Ficha ---------- */
function abrirFicha(p) {
  const visual = $("#ficha-visual");
  visual.classList.toggle("con-foto", p.fotos.length > 0);
  const principal = portada(p, { grande: true });
  visual.replaceChildren(principal);
  /* Galería: las miniaturas cambian la foto grande */
  if (p.fotos.length > 1) visual.append(el("div", { class: "galeria", role: "group", "aria-label": "Fotos del equipo" },
    ...p.fotos.map((f, i) => el("button", { class: "galeria__mini", "aria-label": `Ver foto ${i + 1}`, "aria-pressed": String(i === 0), onclick: e => {
      principal.src = "/fotos/" + f;
      $$(".galeria__mini", visual).forEach(b => b.setAttribute("aria-pressed", b === e.currentTarget));
    } }, el("img", { src: "/fotos/" + f, alt: "", loading: "lazy" })))));
  if (tiene3D(p)) visual.append(el("button", { class: "tarjeta__3d", html: ICONO_3D + `<span>${p.estado === "usado" ? "Inspeccionar en 3D" : "Ver en 3D"}</span>`, onclick: () => abrirVisor(p) }));
  const sub = el("p", { class: "ficha__sub" },
    el("span", { class: `etiqueta etiqueta--${p.estado}`, text: p.estado === "usado" ? "Seminuevo" : "Nuevo" }),
    p.grado && el("span", { class: `grado grado--${p.grado === "A+" ? "Aplus" : p.grado}`, text: `Grado ${p.grado}` }),
    el("span", { text: [p.capacidad, p.color.nombre].filter(Boolean).join(" · ") }));
  const specs = el("dl", { class: "specs" });
  const filas = { ...p.specs, ...(p.bateria ? { "Salud de batería": `${p.bateria} %` } : {}), ...(p.garantia ? { "Garantía": p.garantia } : {}) };
  for (const [k, v] of Object.entries(filas)) specs.append(el("dt", { text: k }), el("dd", { text: v }));
  const ahorro = p.precioNuevo && p.precioNuevo > p.precio ? `Ahorras ${pesos(p.precioNuevo - p.precio)} frente a uno nuevo` : "";
  $("#ficha-info").replaceChildren(
    el("div", {}, el("h2", { id: "ficha-nombre", text: p.nombre })), sub,
    el("div", {}, el("p", { class: "ficha__precio", text: pesos(p.precio) }), ahorro && el("p", { class: "ficha__ahorro", text: ahorro })),
    specs,
    p.incluye.length && el("div", { class: "incluye" }, ...p.incluye.map(t => el("span", { text: t }))),
    el("div", { class: "ficha__acciones" },
      p.stock ? el("button", { class: "boton boton--claro", text: "Agregar al carrito", onclick: () => agregar(p) }) : el("p", { class: "agotado", text: "Agotado por ahora. Escríbenos y te avisamos cuando llegue." }),
      el("a", { class: "boton boton--borde", target: "_blank", rel: "noopener", href: enlaceWhatsapp(`Hola, me interesa el ${p.nombre} ${p.capacidad} ${p.color.nombre}${p.estado === "usado" ? " seminuevo" : ""} (${pesos(p.precio)}). ¿Está disponible?`), text: "Preguntar por WhatsApp" })));
  abrir($("#modal-producto"));
}

/* ---------- Visor 3D (se descarga solo cuando se usa) ---------- */
let visor = null, visorProducto = null;
async function abrirVisor(p) {
  $("#modal-producto").close();
  visorProducto = p;
  const usado = p.estado === "usado";
  $("#visor-sobre").textContent = usado ? `Inspección 3D · Grado ${p.grado || ""}` : "Vista 3D";
  $("#visor-titulo").textContent = `${p.nombre} · ${p.capacidad} · ${p.color.nombre}`;
  $("#visor-datos").replaceChildren(...[["Precio", pesos(p.precio)], usado && ["Batería", `${p.bateria} %`], ["Garantía", p.garantia], usado && ["Grado", p.grado]].filter(Boolean)
    .map(([a, b]) => el("div", {}, el("span", { text: a }), el("strong", { text: b }))));
  const lista = $("#visor-marcas");
  lista.replaceChildren(...(p.marcas.length ? p.marcas.map((m, i) => el("li", {}, el("button", { "data-marca": i, onclick: () => visor && visor.enfocarMarca(i) }, el("b", { text: i + 1 }), el("span", { text: m.texto }))))
    : [el("li", { class: "visor__sin-marcas", text: usado ? "Sin detalles visibles: este equipo está como nuevo." : "Equipo nuevo, sellado de fábrica." })]));
  $("#visor-agregar").hidden = !p.stock;
  abrir($("#modal-3d"));
  $("#visor-cargando").hidden = false;
  try {
    const { crearVisor } = await import("./visor3d.js");
    if (visor) visor.destruir();
    visor = crearVisor($("#visor-escena"), p, {
      alMarcar: i => $$("#visor-marcas button").forEach(b => b.classList.toggle("activa", +b.dataset.marca === i)),
      alInteractuar: () => $("#visor-ayuda").classList.add("oculta")
    });
    $("#visor-cargando").hidden = true;
    marcarVista("giro");
  } catch (e) {
    console.error(e);
    $("#visor-cargando").textContent = "Tu navegador no pudo mostrar la vista 3D.";
  }
}
const marcarVista = v => $$(".visor__vistas button").forEach(b => b.setAttribute("aria-pressed", b.dataset.vista === v));
$$(".visor__vistas button").forEach(b => b.addEventListener("click", () => { if (!visor) return; visor.vista(b.dataset.vista); marcarVista(b.dataset.vista); }));
$("#visor-agregar").addEventListener("click", () => visorProducto && agregar(visorProducto));
$("#modal-3d").addEventListener("close", () => { if (visor) { visor.destruir(); visor = null; } $("#visor-ayuda").classList.remove("oculta"); });

/* ---------- Filtros y navegación ---------- */
$$(".segmentado button").forEach(b => b.addEventListener("click", () => { filtro.estado = b.dataset.estado; pintarCatalogo(); }));
$$("#chips-familia .chip").forEach(b => b.addEventListener("click", () => { filtro.familia = b.dataset.familia; pintarCatalogo(); }));
let tBusca;
$("#busqueda").addEventListener("input", e => { clearTimeout(tBusca); tBusca = setTimeout(() => { filtro.q = e.target.value; pintarCatalogo(); }, 120); });
$("#orden").addEventListener("change", e => { filtro.orden = e.target.value; pintarCatalogo(); });
$("#limpiar-filtros").addEventListener("click", () => { Object.assign(filtro, { estado: "todos", familia: "todas", q: "" }); $("#busqueda").value = ""; pintarCatalogo(); });
$$("[data-filtro-estado]").forEach(a => a.addEventListener("click", () => { filtro.estado = a.dataset.filtroEstado; filtro.familia = "todas"; pintarCatalogo(); }));
$("#abrir-busqueda").addEventListener("click", () => { $("#catalogo").scrollIntoView({ behavior: "smooth" }); setTimeout(() => $("#busqueda").focus({ preventScroll: true }), 450); });
$("#abrir-carrito").addEventListener("click", () => abrir($("#modal-carrito")));
const enc = $("#encabezado");
addEventListener("scroll", () => enc.classList.toggle("con-borde", scrollY > 8), { passive: true });

/* ---------- Simulador de crédito ---------- */
function simular() {
  const valor = +$("#sim-valor").value, ini = +$("#sim-inicial").value, cuotas = +($("#sim-cuotas input:checked") || {}).value || 12;
  $("#sim-valor-txt").textContent = pesos(valor);
  $("#sim-inicial-txt").textContent = `${ini} % · ${pesos(valor * ini / 100)}`;
  $("#sim-cuota").textContent = pesos(valor * (1 - ini / 100) / cuotas);
}
$$("#sim-valor, #sim-inicial, #sim-cuotas input").forEach(i => i.addEventListener("input", simular));

/* ---------- Formularios (crédito y usado) ---------- */
for (const f of $$("form[data-tipo]")) {
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const estado = $(".formulario__estado", f), boton = $("button[type=submit]", f), datos = Object.fromEntries(new FormData(f));
    let invalido = null;
    for (const i of $$("input[required]", f)) {
      const mal = !i.value.trim() || (i.type === "tel" && !/^\+?\d{7,15}$/.test(i.value.replace(/[\s()-]/g, "")));
      i.setAttribute("aria-invalid", mal); if (mal && !invalido) invalido = i;
    }
    if (invalido) { estado.className = "formulario__estado error"; estado.textContent = invalido.type === "tel" ? "Revisa el número de celular." : "Completa los campos marcados."; invalido.focus(); return; }
    const tipo = f.dataset.tipo;
    const detalle = tipo === "usado" ? `Batería: ${datos.bateria || "?"} % · Estado: ${datos.estado}` : `Simulación: ${$("#sim-valor-txt").textContent}, inicial ${$("#sim-inicial-txt").textContent}, ${$("#sim-cuotas input:checked").value} cuotas`;
    boton.disabled = true; estado.className = "formulario__estado"; estado.textContent = "Enviando…";
    try {
      const r = await fetch("/api/solicitud", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, nombre: datos.nombre, telefono: datos.telefono.replace(/[\s()-]/g, ""), equipo: datos.equipo, detalle, web: datos.web }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo enviar");
      estado.className = "formulario__estado ok"; estado.textContent = "¡Listo! Te contactamos pronto. ";
      const texto = tipo === "usado" ? `Hola, quiero vender mi ${datos.equipo}. ${detalle}. Soy ${datos.nombre}.` : `Hola, quiero información de crédito${datos.equipo ? " para un " + datos.equipo : ""}. Soy ${datos.nombre}.`;
      estado.append(el("a", { class: "enlace", href: enlaceWhatsapp(texto), target: "_blank", rel: "noopener", text: "Escríbenos ya por WhatsApp" }));
      f.reset(); simular();
    } catch (err) {
      estado.className = "formulario__estado error"; estado.textContent = err.message;
    } finally { boton.disabled = false; }
  });
}

/* ---------- Portada ---------- */
function pintarPortada() {
  const a = productos.find(p => p.familia === "iphone" && p.estado === "nuevo" && p.destacado && p.modelo?.modulo === "barra") || productos.find(p => p.familia === "iphone");
  const b = productos.find(p => p.familia === "iphone" && p.estado === "usado" && p.destacado && p !== a) || productos.find(p => p.familia === "iphone" && p !== a);
  $("#portada-visual").replaceChildren(...[a, b].filter(Boolean).map(p => el("div", { class: "tel", html: dibujo(p) })));
}

/* ---------- Arranque ---------- */
$("#anio").textContent = new Date().getFullYear();
simular();
(async () => {
  try {
    const [c, p] = await Promise.all([fetch("/api/config").then(r => r.json()), fetch("/api/productos").then(r => r.json())]);
    config = c; productos = p;
  } catch (e) {
    $("#vacio").hidden = false; $("#vacio").textContent = "No pudimos cargar el catálogo. Recarga la página.";
    return;
  }
  for (const a of ["#pie-whatsapp", "#flotante-wa"]) $(a).href = enlaceWhatsapp("Hola Atlanta Tecnología, quiero información.");
  $("#pie-instagram").href = config.instagram;
  pintarPortada(); pintarCatalogo(); pintarCarrito();
})();
