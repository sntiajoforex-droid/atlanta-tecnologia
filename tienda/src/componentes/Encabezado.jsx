import { useEffect, useState } from "react";
import { useCarrito } from "../util.js";

export const Logo = () => (
  <span className="logo">
    <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40 24 8l16 32" /><path d="M17 40l7-14 7 14" className="logo__interior" /></svg>
    <span className="logo__nombre">Atlanta</span>
    <span className="logo__apellido">Tecnología</span>
  </span>
);

const ENLACES = [
  { href: "#catalogo", texto: "Seminuevos", estado: "usado" },
  { href: "#catalogo", texto: "Nuevos", estado: "nuevo" },
  { href: "#credito", texto: "Crédito" },
  { href: "#vende", texto: "Vende tu equipo" }
];

export default function Encabezado({ alFiltrar, alAbrirCarrito }) {
  const carrito = useCarrito();
  const cuenta = Object.values(carrito).reduce((a, b) => a + b, 0);
  const [menu, setMenu] = useState(false);
  const [bajo, setBajo] = useState(false);
  const [salto, setSalto] = useState(0);
  useEffect(() => { const f = () => setBajo(scrollY > 12); f(); addEventListener("scroll", f, { passive: true }); return () => removeEventListener("scroll", f); }, []);
  useEffect(() => { if (cuenta) setSalto(s => s + 1); }, [cuenta]);
  useEffect(() => { document.documentElement.classList.toggle("menu-abierto", menu); }, [menu]);

  const ir = e => { setMenu(false); if (e.estado) alFiltrar(e.estado); };
  return (
    <header className={`encabezado${bajo ? " encabezado--bajo" : ""}`}>
      <div className="encabezado__fila marco">
        <a className="encabezado__logo" href="#inicio" aria-label="Atlanta Tecnología, inicio"><Logo /></a>
        <nav className={`navegacion${menu ? " navegacion--abierta" : ""}`} id="navegacion" aria-label="Secciones">
          {ENLACES.map(e => <a key={e.texto} href={e.href} onClick={() => ir(e)}>{e.texto}</a>)}
        </nav>
        <div className="encabezado__acciones">
          <button className="boton-icono" aria-label={cuenta ? `Ver bolsa, ${cuenta} equipo${cuenta > 1 ? "s" : ""}` : "Ver bolsa"} onClick={alAbrirCarrito}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
            {cuenta > 0 && <span key={salto} className="contador">{cuenta}</span>}
          </button>
          <button className="boton-icono boton-menu" aria-expanded={menu} aria-controls="navegacion" aria-label={menu ? "Cerrar menú" : "Abrir menú"} onClick={() => setMenu(m => !m)}>
            <span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
