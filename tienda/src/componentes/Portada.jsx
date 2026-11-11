/* Portada: el titular y, a la derecha, un seminuevo real girando en 3D con sus detalles marcados.
   El 3D se monta cuando el navegador queda libre (no compite con la primera pintura) y nunca si se pidió reducir movimiento. */
import { useEffect, useRef, useState } from "react";
import SplitText from "../bits/SplitText/SplitText.jsx";
import Escena3D from "./Escena3D.jsx";
import Imagen from "./Imagen.jsx";
import { estadoTexto, reducirMovimiento, tiene3D } from "../util.js";

export const elegirEstrella = productos => {
  const candidatos = productos.filter(p => p.estado === "usado" && tiene3D(p) && p.stock > 0);
  const puntaje = p => (p.escaneo ? 100 : 0) + (p.destacado ? 10 : 0) + p.marcas.length;
  return candidatos.sort((a, b) => puntaje(b) - puntaje(a))[0] || productos.find(tiene3D) || null;
};

export default function Portada({ estrella, alVerSeminuevos, alVerNuevos, alInspeccionar }) {
  const [montar3D, setMontar3D] = useState(false);
  const [listo, setListo] = useState(false);
  /* El escenario se inclina apenas hacia el mouse, como una vitrina que se mira de lado */
  const escenario = useRef(null);
  const inclinar = e => {
    if (e.pointerType !== "mouse" || reducirMovimiento()) return;
    const r = escenario.current.getBoundingClientRect();
    escenario.current.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - .5) * -5}deg`);
    escenario.current.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - .5) * 6}deg`);
  };
  const soltar = () => { escenario.current?.style.setProperty("--rx", "0deg"); escenario.current?.style.setProperty("--ry", "0deg"); };
  /* En pantallas angostas el escenario es cuadrado: la cámara se aleja un poco para que quepa el equipo entero */
  const [encuadre] = useState(() => (typeof matchMedia !== "undefined" && matchMedia("(max-width: 960px)").matches ? 2.3 : 1.75));
  useEffect(() => {
    if (!estrella || reducirMovimiento()) return;
    const id = (window.requestIdleCallback || (f => setTimeout(f, 900)))(() => setMontar3D(true), { timeout: 2500 });
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, [estrella]);

  return (
    <section className="portada marco" id="inicio" aria-label="Inicio">
      <div className="portada__texto">
        <SplitText tag="h1" text="Mira cada rayón antes de comprarlo." className="portada__titulo" splitType="chars" effect="rise" mask
          trigger="load" delay={22} duration={1.1} textAlign="left" />
        <p className="portada__bajada">
          iPhone, iPad y MacBook originales. Cada seminuevo se gira en 3D con sus marcas señaladas donde están, para que sepas qué recibes antes de pagar.
        </p>
        <div className="portada__botones">
          <a className="boton boton--lleno" href="#catalogo" onClick={alVerSeminuevos}>Ver seminuevos</a>
          <a className="boton boton--linea" href="#catalogo" onClick={alVerNuevos}>Equipos nuevos</a>
        </div>
      </div>

      {estrella && (
        <figure className="portada__escenario">
          <div ref={escenario} onPointerMove={inclinar} onPointerLeave={soltar} className={`escenario${listo ? " escenario--listo" : ""}`}>
            <Imagen producto={estrella} grande className="escenario__respaldo" />
            {montar3D && <Escena3D producto={estrella} interactivo={false} zoom={false} encuadre={encuadre} className="escenario__3d" alListo={() => setListo(true)} />}
          </div>
          <figcaption className="escenario__pie">
            <span>
              <strong>{estrella.nombre}</strong>
              <span>{estadoTexto(estrella)}{estrella.bateria ? `, batería ${estrella.bateria} %` : ""}</span>
              <span>{estrella.marcas.length ? `${estrella.marcas.length} detalle${estrella.marcas.length > 1 ? "s" : ""} marcado${estrella.marcas.length > 1 ? "s" : ""} en el modelo` : "Sin detalles visibles"}</span>
            </span>
            <button className="boton boton--chico boton--linea" onClick={() => alInspeccionar(estrella)}>Inspeccionar en 3D</button>
          </figcaption>
        </figure>
      )}
    </section>
  );
}
