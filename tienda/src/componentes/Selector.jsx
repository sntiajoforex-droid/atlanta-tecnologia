/* Selector propio (reemplaza al <select> nativo, que cada sistema dibuja a su manera).
   Patrón «listbox» accesible: flechas, Inicio/Fin, Enter, Esc, letra inicial y clic afuera para cerrar. */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function Selector({ valor, opciones, alCambiar, etiqueta, visible = true, className = "" }) {
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const id = useId(), raiz = useRef(null), lista = useRef(null), boton = useRef(null);
  const actual = opciones.find(([v]) => v === valor) || opciones[0];
  /* La lista se dibuja en <body> (por encima de todo): así no la recorta un contenedor con overflow, como el formulario por pasos */
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!abierto) return;
    const r = boton.current.getBoundingClientRect(), alto = opciones.length * 44 + 16;
    const arriba = r.bottom + alto + 12 > innerHeight && r.top > alto + 12;
    setPos({ left: r.left, minWidth: r.width, top: arriba ? r.top - alto - 8 : r.bottom + 8, arriba });
    /* Si la página se desplaza de verdad (no un contenedor interno), la lista se cierra para no quedar flotando lejos del botón */
    const y0 = scrollY, cerrar = () => setAbierto(false), alDesplazar = () => { if (Math.abs(scrollY - y0) > 24) cerrar(); };
    addEventListener("resize", cerrar); addEventListener("scroll", alDesplazar, { passive: true });
    return () => { removeEventListener("resize", cerrar); removeEventListener("scroll", alDesplazar); };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!abierto) return;
    setActiva(Math.max(0, opciones.findIndex(([v]) => v === valor)));
    const fuera = e => { if (!raiz.current?.contains(e.target) && !lista.current?.contains(e.target)) setAbierto(false); };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const elegir = i => { alCambiar(opciones[i][0]); setAbierto(false); boton.current?.focus(); };
  const teclas = e => {
    const n = opciones.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiva(a => (a + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiva(a => (a - 1 + n) % n); }
    else if (e.key === "Home") { e.preventDefault(); setActiva(0); }
    else if (e.key === "End") { e.preventDefault(); setActiva(n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(activa); }
    else if (e.key === "Escape" || e.key === "Tab") { setAbierto(false); if (e.key === "Escape") boton.current?.focus(); }
    else if (e.key.length === 1) {
      const i = opciones.findIndex(([, t], j) => j > activa && t.toLowerCase().startsWith(e.key.toLowerCase()));
      const k = i >= 0 ? i : opciones.findIndex(([, t]) => t.toLowerCase().startsWith(e.key.toLowerCase()));
      if (k >= 0) setActiva(k);
    }
  };

  return (
    <div ref={raiz} className={`selector${abierto ? " selector--abierto" : ""} ${className}`}>
      {visible && <span className="selector__etiqueta" id={`${id}-e`}>{etiqueta}</span>}
      <button ref={boton} type="button" className="selector__boton" aria-haspopup="listbox" aria-expanded={abierto}
        aria-labelledby={visible ? `${id}-e ${id}-b` : undefined} aria-label={visible ? undefined : `${etiqueta}: ${actual[1]}`} id={`${id}-b`}
        onClick={() => setAbierto(a => !a)}
        onKeyDown={e => { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); setAbierto(true); } }}>
        <span>{actual[1]}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
      </button>
      {abierto && pos && createPortal(
        <ul ref={n => { if (n && lista.current !== n) n.focus({ preventScroll: true }); lista.current = n; }} className={`selector__lista${pos.arriba ? " selector__lista--arriba" : ""}`} role="listbox"
          style={{ top: pos.top, left: pos.left, minWidth: pos.minWidth }} tabIndex={-1} aria-labelledby={visible ? `${id}-e` : `${id}-b`}
          aria-activedescendant={`${id}-${activa}`} onKeyDown={teclas}>
          {opciones.map(([v, t], i) => (
            <li key={v} id={`${id}-${i}`} role="option" aria-selected={v === valor} className={i === activa ? "activa" : ""}
              onPointerEnter={() => setActiva(i)} onClick={() => elegir(i)}>
              {t}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </li>
          ))}
        </ul>, document.body
      )}
    </div>
  );
}
