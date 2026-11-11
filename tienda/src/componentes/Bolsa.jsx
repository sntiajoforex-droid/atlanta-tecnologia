/* Bolsa de compra: el pedido se cierra por WhatsApp con un asesor */
import Dialogo, { Cerrar } from "./Dialogo.jsx";
import Imagen from "./Imagen.jsx";
import { carritoApi, enlaceWhatsapp, estadoTexto, pesos, useCarrito, variante } from "../util.js";

export default function Bolsa({ abierta, alCerrar, productos }) {
  const carrito = useCarrito();
  const items = Object.entries(carrito).map(([id, cant]) => ({ p: productos.find(x => x.id === id), cant })).filter(i => i.p && i.p.stock > 0);
  const total = items.reduce((s, i) => s + i.p.precio * i.cant, 0);
  const pedido = items.map(({ p, cant }) => `• ${cant} × ${p.nombre} ${variante(p)}${p.estado === "usado" ? ` (seminuevo ${p.grado || ""})` : ""}: ${pesos(p.precio * cant)}`);
  return (
    <Dialogo abierto={abierta} alCerrar={alCerrar} className="dialogo--lateral" etiqueta="Tu bolsa">
      <div className="bolsa">
        <header className="bolsa__cabeza"><h2>Tu bolsa</h2><Cerrar etiqueta="Cerrar bolsa" /></header>
        {items.length === 0
          ? <div className="bolsa__vacia"><p>Todavía no has agregado equipos.</p><form method="dialog"><button className="boton boton--linea">Seguir viendo equipos</button></form></div>
          : <>
            <ul className="bolsa__lista">
              {items.map(({ p, cant }) => (
                <li key={p.id}>
                  <div className="bolsa__imagen"><Imagen producto={p} /></div>
                  <div className="bolsa__texto">
                    <strong>{p.nombre}</strong>
                    <small>{variante(p)}. {estadoTexto(p)}</small>
                    <div className="cantidad">
                      <button aria-label={`Quitar una unidad de ${p.nombre}`} onClick={() => carritoApi.restar(p.id)}>−</button>
                      <span aria-live="polite">{cant}</span>
                      <button aria-label={`Agregar una unidad de ${p.nombre}`} onClick={() => carritoApi.sumar(p)} disabled={cant >= p.stock}>+</button>
                      <button className="enlace" onClick={() => carritoApi.quitar(p.id)}>Quitar</button>
                    </div>
                  </div>
                  <strong className="bolsa__subtotal">{pesos(p.precio * cant)}</strong>
                </li>
              ))}
            </ul>
            <footer className="bolsa__pie">
              <p className="bolsa__total"><span>Total</span><strong>{pesos(total)}</strong></p>
              <a className="boton boton--lleno boton--ancho" target="_blank" rel="noopener"
                href={enlaceWhatsapp(`Hola Atlanta Tecnología, quiero este pedido:\n${pedido.join("\n")}\nTotal: ${pesos(total)}`)}>Pedir por WhatsApp</a>
              <small>Un asesor confirma disponibilidad, envío y forma de pago.</small>
            </footer>
          </>}
      </div>
    </Dialogo>
  );
}
