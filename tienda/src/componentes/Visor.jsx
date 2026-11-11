/* Inspección 3D a pantalla completa: el modelo a la izquierda y la lista de detalles a la derecha */
import { useRef, useState } from "react";
import Dialogo, { Cerrar } from "./Dialogo.jsx";
import Escena3D from "./Escena3D.jsx";
import { agregarAlCarrito } from "./Catalogo.jsx";
import { estadoTexto, pesos, variante } from "../util.js";

const VISTAS = [["trasera", "Atrás"], ["frontal", "Frente"], ["marco-der", "Lado"], ["giro", "Girar"]];

function Contenido({ p }) {
  const escena = useRef(null);
  const [vista, setVista] = useState("giro");
  const [activa, setActiva] = useState(-1);
  const [ayuda, setAyuda] = useState(true);
  const usado = p.estado === "usado";
  const datos = [["Precio", pesos(p.precio)], usado && p.bateria && ["Batería", `${p.bateria} %`], p.garantia && ["Garantía", p.garantia]].filter(Boolean);
  return (
    <div className="visor">
      <header className="visor__barra">
        <div>
          <p className="visor__tipo">{p.escaneo ? "Escaneo 3D del equipo real" : "Modelo 3D con sus medidas reales"}</p>
          <h2>{p.nombre} <span>{variante(p)}</span></h2>
        </div>
        <Cerrar etiqueta="Cerrar vista 3D" />
      </header>
      <Escena3D ref={escena} producto={p} className="visor__escena" alMarcar={setActiva} alInteractuar={() => setAyuda(false)}>
        <p className={`visor__ayuda${ayuda ? "" : " visor__ayuda--oculta"}`}>Arrastra para girar. Pellizca o usa la rueda para acercar.</p>
      </Escena3D>
      <aside className="visor__panel">
        <div className="segmentos segmentos--ancho" role="group" aria-label="Vistas">
          {VISTAS.map(([v, t]) => <button key={v} aria-pressed={vista === v} onClick={() => { setVista(v); escena.current?.vista(v); }}>{t}</button>)}
        </div>
        <h3>{usado ? `${estadoTexto(p)}: lo que tiene` : "Equipo nuevo"}</h3>
        <ol className="visor__marcas">
          {p.marcas.length
            ? p.marcas.map((m, i) => (
              <li key={i}><button className={activa === i ? "activa" : ""} onClick={() => { setVista(""); escena.current?.enfocarMarca(i); }}><b>{i + 1}</b><span>{m.texto}</span></button></li>
            ))
            : <li className="visor__sin-marcas">{usado ? "Sin detalles visibles: está como nuevo." : "Sellado de fábrica."}</li>}
        </ol>
        <dl className="visor__datos">{datos.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
        {p.stock > 0 && <button className="boton boton--lleno boton--ancho" onClick={() => agregarAlCarrito(p)}>Agregar a la bolsa</button>}
      </aside>
    </div>
  );
}

export default function Visor({ producto, alCerrar }) {
  return (
    <Dialogo abierto={!!producto} alCerrar={alCerrar} className="dialogo--completo" etiqueta={producto ? `Vista 3D de ${producto.nombre}` : "Vista 3D"}>
      {producto && <Contenido key={producto.id} p={producto} />}
    </Dialogo>
  );
}
