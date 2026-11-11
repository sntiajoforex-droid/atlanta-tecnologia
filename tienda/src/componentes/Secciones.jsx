import Magnet from "../bits/Magnet/Magnet.jsx";
import { Logo } from "./Encabezado.jsx";
import { enlaceWhatsapp } from "../util.js";

/* Lo que respalda la compra: cuatro hechos, sin adornos */
export const Garantias = () => (
  <section className="garantias marco" aria-label="Por qué comprar aquí">
    <dl>
      <div><dt>Originales</dt><dd>Verificas el número de serie antes de pagar.</dd></div>
      <div><dt>Garantía escrita</dt><dd>Hasta 1 año en nuevos y 6 meses en seminuevos.</dd></div>
      <div><dt>Revisión de 40 puntos</dt><dd>Face ID, cámaras, señal, carga, altavoces y pantalla.</dd></div>
      <div><dt>Envíos a todo el país</dt><dd>Te compartimos la guía apenas sale el pedido.</dd></div>
    </dl>
  </section>
);

/* Los grados son una escala de desgaste, así que se muestran sobre una sola línea */
const GRADOS = [
  { g: "A+", t: "Como nuevo", d: "Sin marcas visibles.", b: "Batería desde 90 %" },
  { g: "A", t: "Excelente", d: "Marcas mínimas que solo se ven de cerca.", b: "Batería desde 85 %" },
  { g: "B", t: "Muy bueno", d: "Rayones leves en vidrio o marco. Funciona al 100 %.", b: "El mejor precio" }
];
export const Grados = () => (
  <section className="seccion grados marco" aria-labelledby="titulo-grados">
    <div className="grados__texto">
      <h2 id="titulo-grados">Cómo calificamos un seminuevo</h2>
      <p>El grado describe cómo se ve. Cómo funciona no cambia: todos pasan la misma revisión. Y en la vista 3D ves exactamente dónde está cada marca.</p>
    </div>
    <ol className="escala">
      {GRADOS.map(x => (
        <li key={x.g}>
          <span className="escala__grado">{x.g}</span>
          <h3>{x.t}</h3>
          <p>{x.d}</p>
          <p className="escala__bateria">{x.b}</p>
        </li>
      ))}
    </ol>
  </section>
);

const PREGUNTAS = [
  ["¿Los equipos son originales?", "Sí. Todos son Apple originales y puedes verificar el número de serie antes de pagar."],
  ["¿Qué es la vista 3D de los seminuevos?", "Es el modelo del equipo con sus detalles reales marcados donde están: rayones, golpes o desgaste. Algunos equipos tienen además un escaneo 3D del equipo real. Así sabes qué recibes antes de ir a la tienda."],
  ["¿Qué garantía tienen los seminuevos?", "Entre 3 y 6 meses según el equipo, por escrito. Cubre fallas de funcionamiento, no golpes ni humedad."],
  ["¿Hacen envíos?", "Sí, a todo el país. Te compartimos la guía apenas sale el pedido."],
  ["¿Cómo pago?", "Efectivo, transferencia, tarjeta o crédito. El pedido se confirma por WhatsApp con un asesor."]
];
export const Preguntas = () => (
  <section className="seccion preguntas marco" aria-labelledby="titulo-preguntas">
    <h2 id="titulo-preguntas">Preguntas frecuentes</h2>
    <div className="preguntas__lista">
      {PREGUNTAS.map(([q, r]) => <details key={q} name="preguntas"><summary>{q}</summary><p>{r}</p></details>)}
    </div>
  </section>
);

export const Pie = ({ instagram }) => (
  <footer className="pie">
    <div className="pie__fila marco">
      <div>
        <Logo />
        <p>iPhone, iPad y MacBook nuevos y seminuevos.</p>
      </div>
      <nav className="pie__enlaces" aria-label="Contacto">
        <a href={enlaceWhatsapp("Hola Atlanta Tecnología, quiero información.")} target="_blank" rel="noopener">WhatsApp</a>
        <a href={instagram} target="_blank" rel="noopener">Instagram</a>
        <a href="/privacidad.html">Privacidad</a>
      </nav>
    </div>
    <p className="pie__marca" aria-hidden="true">Atlanta</p>
    <p className="pie__legal marco">© {new Date().getFullYear()} Atlanta Tecnología. Apple, iPhone, iPad y MacBook son marcas de Apple Inc. No somos Apple.</p>
  </footer>
);

export const BotonWhatsapp = () => (
  <Magnet padding={70} magnetStrength={3} wrapperClassName="whatsapp-flotante">
    <a href={enlaceWhatsapp("Hola Atlanta Tecnología, quiero información.")} target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.4L3 21l4.7-1.2A9 9 0 1 0 12 3z" /><path className="relleno" d="M8.8 8.2c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.1-.2.3 0 .5.5.9 1.4 1.8 2.4 2.3.2.1.4.1.5 0l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .9-.7 1.7-1.6 1.8-1 .1-2.6-.3-4.3-1.9-1.6-1.5-2.3-3-2.3-4 0-.4.1-.7.3-1.1z" /></svg>
    </a>
  </Magnet>
);
