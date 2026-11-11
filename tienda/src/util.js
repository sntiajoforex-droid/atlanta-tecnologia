/* Utilidades compartidas de la tienda */
import { useEffect, useState, useSyncExternalStore } from "react";

export const pesos = n => "$ " + Math.round(n || 0).toLocaleString("es-CO");
export const sinTildes = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const tiene3D = p => !!p.escaneo || (p.familia === "iphone" && !!p.modelo);
export const estadoTexto = p => (p.estado === "usado" ? `Seminuevo${p.grado ? " " + p.grado : ""}` : "Nuevo");
export const variante = p => [p.capacidad, p.color?.nombre].filter(Boolean).join(", ");

/* ---------- Configuración y catálogo ---------- */
let config = { whatsapp: "", whatsappLink: "#", instagram: "#" };
export const enlaceWhatsapp = texto => (config.whatsapp ? `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(texto)}` : config.whatsappLink);
export function useCatalogo() {
  const [estado, setEstado] = useState({ cargando: true, error: false, productos: [], config });
  useEffect(() => {
    Promise.all([fetch("/api/config").then(r => r.json()), fetch("/api/productos").then(r => r.json())])
      .then(([c, productos]) => { config = c; setEstado({ cargando: false, error: false, productos, config: c }); })
      .catch(() => setEstado(e => ({ ...e, cargando: false, error: true })));
  }, []);
  return estado;
}

/* ---------- Carrito (se guarda en este navegador) ---------- */
const CLAVE = "atlanta-carrito";
let carrito = {};
try { carrito = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { carrito = {}; }
const oyentes = new Set();
const emitir = () => { try { localStorage.setItem(CLAVE, JSON.stringify(carrito)); } catch { /* modo privado */ } oyentes.forEach(f => f()); };
export const carritoApi = {
  sumar(p) {
    const actual = carrito[p.id] || 0;
    if (!p.stock) return "Este equipo está agotado";
    if (actual >= p.stock) return p.stock === 1 ? "Solo hay una unidad de este equipo" : `Solo hay ${p.stock} unidades`;
    carrito = { ...carrito, [p.id]: actual + 1 }; emitir(); return null;
  },
  restar(id) { const n = (carrito[id] || 0) - 1; carrito = { ...carrito }; if (n > 0) carrito[id] = n; else delete carrito[id]; emitir(); },
  quitar(id) { carrito = { ...carrito }; delete carrito[id]; emitir(); }
};
export const useCarrito = () => useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => carrito);

/* ---------- Aviso breve ---------- */
const avisos = new Set();
export const avisar = texto => avisos.forEach(f => f(texto));
export function useAviso() {
  const [texto, setTexto] = useState("");
  useEffect(() => {
    let t;
    const f = m => { setTexto(m); clearTimeout(t); t = setTimeout(() => setTexto(""), 2800); };
    avisos.add(f); return () => { avisos.delete(f); clearTimeout(t); };
  }, []);
  return texto;
}

/* ---------- Preferencias del sistema ---------- */
export const reducirMovimiento = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* El visor 3D vive en /js/visor3d.js (lo comparte el panel) y se descarga solo cuando hace falta */
let visorModulo = null;
export const cargarVisor = () => (visorModulo ||= import(/* @vite-ignore */ "/js/visor3d.js"));
