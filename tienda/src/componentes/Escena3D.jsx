/* Monta el visor 3D compartido (public/js/visor3d.js) dentro de un contenedor de React */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cargarVisor } from "../util.js";

const Escena3D = forwardRef(function Escena3D({ producto, interactivo = true, zoom = true, encuadre, holgura, className = "", alMarcar, alInteractuar, alListo, children }, ref) {
  const caja = useRef(null), visor = useRef(null);
  const [estado, setEstado] = useState({ fase: "cargando", progreso: 0 });
  useImperativeHandle(ref, () => ({
    vista: v => visor.current?.vista(v),
    enfocarMarca: i => visor.current?.enfocarMarca(i)
  }), []);

  useEffect(() => {
    let vivo = true, este = null;
    setEstado({ fase: "cargando", progreso: 0 });
    cargarVisor().then(({ crearVisor }) => {
      if (!vivo) return;
      este = visor.current = crearVisor(caja.current, producto, {
        interactivo, zoom, ...(encuadre ? { encuadre } : {}), ...(holgura ? { holgura } : {}),
        alMarcar: i => alMarcar?.(i),
        alInteractuar: () => alInteractuar?.(),
        alProgreso: f => vivo && setEstado({ fase: "cargando", progreso: f })
      });
      return este.listo;
    }).then(() => { if (vivo) { setEstado({ fase: "listo", progreso: 1 }); alListo?.(); } })
      .catch(e => { console.error(e); if (vivo) setEstado({ fase: "error", progreso: 0 }); });
    return () => { vivo = false; este?.destruir(); if (visor.current === este) visor.current = null; };
  }, [producto, interactivo, zoom, encuadre, holgura]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={caja} className={`escena3d ${className}`} data-fase={estado.fase}>
      {estado.fase === "cargando" && (
        <p className="escena3d__estado">{producto.escaneo ? `Cargando escaneo real${estado.progreso ? ` ${Math.round(estado.progreso * 100)} %` : "…"}` : "Cargando 3D…"}</p>
      )}
      {estado.fase === "error" && <p className="escena3d__estado">Tu navegador no pudo mostrar la vista 3D.</p>}
      {children}
    </div>
  );
});
export default Escena3D;
