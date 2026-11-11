import { useRef, useState } from "react";
import Dialogo, { Cerrar } from "./Dialogo.jsx";
import Imagen from "./Imagen.jsx";
import { agregarAlCarrito } from "./Catalogo.jsx";
import { enlaceWhatsapp, estadoTexto, pesos, tiene3D, variante } from "../util.js";

function Contenido({ p, alVer3D }) {
  const [foto, setFoto] = useState(0);
  const usado = p.estado === "usado";
  const filas = { ...p.specs, ...(p.bateria ? { "Salud de batería": `${p.bateria} %` } : {}), ...(p.garantia ? { Garantía: p.garantia } : {}) };
  const ahorro = p.precioNuevo > p.precio ? p.precioNuevo - p.precio : 0;
  return (
    <div className="ficha">
      <div className="ficha__visual">
        <Imagen producto={p} foto={p.fotos[foto]} grande />
        {p.fotos.length > 1 && (
          <div className="galeria" role="group" aria-label="Fotos del equipo">
            {p.fotos.map((f, i) => (
              <button key={f} aria-label={`Ver foto ${i + 1}`} aria-pressed={i === foto} onClick={() => setFoto(i)}>
                <img src={"/fotos/" + f} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {tiene3D(p) && <button className="boton boton--chico boton--vidrio ficha__3d" onClick={() => alVer3D(p)}>{usado ? "Inspeccionar en 3D" : "Ver en 3D"}</button>}
      </div>
      <div className="ficha__info">
        <p className={`sello sello--${p.estado}`}>{estadoTexto(p)}</p>
        <h2 className="ficha__nombre">{p.nombre}</h2>
        <p className="ficha__variante">{variante(p)}</p>
        <p className="ficha__precio">{pesos(p.precio)}</p>
        {ahorro > 0 && <p className="ficha__ahorro">{pesos(ahorro)} menos que uno nuevo</p>}
        {usado && p.marcas.length > 0 && (
          <div className="ficha__marcas">
            <h3>Detalles marcados</h3>
            <ol>{p.marcas.map((m, i) => <li key={i}>{m.texto}</li>)}</ol>
          </div>
        )}
        {Object.keys(filas).length > 0 && <dl className="especificaciones">{Object.entries(filas).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        {p.incluye.length > 0 && <p className="ficha__incluye"><span>Incluye</span> {p.incluye.join(", ")}</p>}
        <div className="ficha__acciones">
          {p.stock
            ? <button className="boton boton--lleno" onClick={() => agregarAlCarrito(p)}>Agregar a la bolsa</button>
            : <p className="agotado">Agotado por ahora. Escríbenos y te avisamos cuando llegue.</p>}
          <a className="boton boton--linea" target="_blank" rel="noopener" href={enlaceWhatsapp(`Hola, me interesa el ${p.nombre} ${variante(p)}${usado ? " seminuevo" : ""} (${pesos(p.precio)}). ¿Está disponible?`)}>Preguntar por WhatsApp</a>
        </div>
      </div>
    </div>
  );
}

export default function Ficha({ producto, alCerrar, alVer3D }) {
  /* Se conserva el último equipo mientras la ficha se desvanece al cerrar */
  const ultimo = useRef(producto);
  if (producto) ultimo.current = producto;
  const p = ultimo.current;
  return (
    <Dialogo abierto={!!producto} alCerrar={alCerrar} className="dialogo--ficha" etiqueta={producto ? producto.nombre : "Equipo"}>
      <Cerrar />
      {p && <Contenido key={p.id} p={p} alVer3D={alVer3D} />}
    </Dialogo>
  );
}
