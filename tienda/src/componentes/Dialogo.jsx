/* <dialog> nativo controlado desde React: foco atrapado, Esc para cerrar y fondo inerte gratis */
import { useEffect, useRef } from "react";

export default function Dialogo({ abierto, alCerrar, className = "", etiqueta, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (abierto && !d.open) { d.showModal(); document.documentElement.classList.add("sin-scroll"); }
    if (!abierto && d.open) d.close();
  }, [abierto]);
  useEffect(() => {
    const d = ref.current;
    const cerrar = () => { if (!document.querySelector("dialog[open]")) document.documentElement.classList.remove("sin-scroll"); alCerrar(); };
    d.addEventListener("close", cerrar);
    return () => d.removeEventListener("close", cerrar);
  }, [alCerrar]);
  return (
    <dialog ref={ref} className={`dialogo ${className}`} aria-label={etiqueta} onClick={e => { if (e.target === ref.current) ref.current.close(); }}>
      {abierto && children}
    </dialog>
  );
}

export const Cerrar = ({ etiqueta = "Cerrar", className = "" }) => (
  <form method="dialog" className={`cerrar ${className}`}>
    <button aria-label={etiqueta}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
  </form>
);
