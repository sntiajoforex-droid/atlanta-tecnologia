import { useDeferredValue, useMemo } from "react";
import SpotlightCard from "../bits/SpotlightCard.jsx";
import Imagen from "./Imagen.jsx";
import { avisar, carritoApi, estadoTexto, pesos, sinTildes, tiene3D, variante } from "../util.js";

const ESTADOS = [["todos", "Todos"], ["usado", "Seminuevos"], ["nuevo", "Nuevos"]];
const FAMILIAS = [["todas", "Todo"], ["iphone", "iPhone"], ["ipad", "iPad"], ["mac", "MacBook"], ["accesorios", "Accesorios"]];
export const FILTRO_INICIAL = { estado: "todos", familia: "todas", q: "", orden: "destacados" };

export const agregarAlCarrito = p => { const error = carritoApi.sumar(p); avisar(error || `${p.nombre} quedó en tu bolsa`); };

function Tarjeta({ p, alAbrir, alVer3D }) {
  const usado = p.estado === "usado";
  return (
    <li>
      <SpotlightCard theme="light" className={`tarjeta${p.stock ? "" : " tarjeta--agotada"}`} spotlightColor="#8f7258" intensity={0.22} borderGlow={0.5} spotlightSize={260}>
        <button className="tarjeta__abrir" aria-label={`Ver ${p.nombre}, ${variante(p)}`} onClick={() => alAbrir(p)} />
        <div className="tarjeta__visual">
          <Imagen producto={p} />
          <span className={`sello sello--${p.estado}`}>{estadoTexto(p)}</span>
          {usado && tiene3D(p) && (
            <button className="tarjeta__3d" onClick={() => alVer3D(p)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></svg>
              {p.escaneo ? "Escaneo 3D" : "Ver en 3D"}
            </button>
          )}
        </div>
        <div className="tarjeta__cuerpo">
          <h3 className="tarjeta__nombre">{p.nombre}</h3>
          <p className="tarjeta__variante">
            <span className="muestra-color" aria-hidden="true" ref={n => n && n.style.setProperty("--tono", p.color.hex)} />
            {variante(p)}
          </p>
          {usado && (
            <p className="tarjeta__datos">
              {p.bateria ? <span className="bateria"><i aria-hidden="true" ref={n => n && n.style.setProperty("--nivel", p.bateria + "%")} />Batería {p.bateria} %</span> : null}
              {p.marcas.length ? <span>{p.marcas.length} detalle{p.marcas.length > 1 ? "s" : ""} marcado{p.marcas.length > 1 ? "s" : ""}</span> : <span>Sin detalles visibles</span>}
            </p>
          )}
          <div className="tarjeta__pie">
            <p className="tarjeta__precio">
              <span className="precio">{pesos(p.precio)}</span>
              {p.precioNuevo > p.precio && <span className="precio-nuevo">Nuevo {pesos(p.precioNuevo)}</span>}
            </p>
            {p.stock
              ? <button className="boton-agregar" aria-label={`Agregar ${p.nombre} a la bolsa`} onClick={() => agregarAlCarrito(p)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
              : <span className="agotado">Agotado</span>}
          </div>
        </div>
      </SpotlightCard>
    </li>
  );
}

export default function Catalogo({ productos, cargando, error, filtro, setFiltro, alAbrir, alVer3D }) {
  const q = useDeferredValue(filtro.q);
  const lista = useMemo(() => {
    const busca = sinTildes(q.trim());
    const r = productos.filter(p => (filtro.estado === "todos" || p.estado === filtro.estado) && (filtro.familia === "todas" || p.familia === filtro.familia)
      && (!busca || sinTildes(`${p.nombre} ${p.capacidad} ${p.color.nombre} ${p.estado === "usado" ? "seminuevo usado" : "nuevo"}`).includes(busca)));
    if (filtro.orden === "menor") r.sort((a, b) => a.precio - b.precio);
    else if (filtro.orden === "mayor") r.sort((a, b) => b.precio - a.precio);
    else r.sort((a, b) => (!!b.stock - !!a.stock) || (b.destacado - a.destacado));
    return r;
  }, [productos, filtro.estado, filtro.familia, filtro.orden, q]);
  const cambiar = c => setFiltro(f => ({ ...f, ...c }));

  return (
    <section className="seccion catalogo marco" id="catalogo" aria-labelledby="titulo-catalogo">
      <div className="catalogo__cabeza">
        <h2 id="titulo-catalogo">Equipos disponibles</h2>
        <p className="catalogo__cuenta" aria-live="polite">{cargando ? "Cargando…" : `${lista.length} de ${productos.length}`}</p>
      </div>

      <div className="filtros">
        <div className="segmentos" role="radiogroup" aria-label="Estado del equipo">
          {ESTADOS.map(([v, t]) => (
            <button key={v} role="radio" aria-checked={filtro.estado === v} onClick={() => cambiar({ estado: v })}>{t}</button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Tipo de equipo">
          {FAMILIAS.map(([v, t]) => <button key={v} className="chip" aria-pressed={filtro.familia === v} onClick={() => cambiar({ familia: v })}>{t}</button>)}
        </div>
        <label className="buscador">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <span className="solo-lector">Buscar equipo</span>
          <input id="busqueda" type="search" placeholder="Buscar, ej. 15 Pro" autoComplete="off" value={filtro.q} onChange={e => cambiar({ q: e.target.value })} />
        </label>
        <label className="orden">
          <span className="solo-lector">Ordenar</span>
          <select value={filtro.orden} onChange={e => cambiar({ orden: e.target.value })}>
            <option value="destacados">Destacados</option>
            <option value="menor">Menor precio</option>
            <option value="mayor">Mayor precio</option>
          </select>
        </label>
      </div>

      {filtro.estado === "usado" && (
        <p className="nota-3d">Toca <strong>Ver en 3D</strong> en cualquier seminuevo: gíralo, acércate y revisa cada detalle marcado donde realmente está.</p>
      )}

      {error
        ? <p className="vacio">No pudimos cargar el catálogo. Recarga la página o escríbenos por WhatsApp.</p>
        : <ul className="rejilla">{lista.map(p => <Tarjeta key={p.id} p={p} alAbrir={alAbrir} alVer3D={alVer3D} />)}</ul>}
      {!cargando && !error && !lista.length && (
        <p className="vacio">No hay equipos con esos filtros. <button className="enlace" onClick={() => setFiltro(FILTRO_INICIAL)}>Ver todos los equipos</button></p>
      )}
    </section>
  );
}
