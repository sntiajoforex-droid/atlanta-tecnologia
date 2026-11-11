/* Crédito (simulador + solicitud) y Vende tu equipo (paso a paso). Ambos llegan al panel como solicitudes. */
import { useState } from "react";
import CountUp from "../bits/CountUp/CountUp.jsx";
import Stepper, { Step } from "../bits/Stepper.jsx";
import BlurText from "../bits/BlurText/BlurText.jsx";
import AnimatedContent from "../bits/AnimatedContent/AnimatedContent.jsx";
import Selector from "./Selector.jsx";
import { enlaceWhatsapp, pesos } from "../util.js";

const telefonoValido = t => /^\+?\d{7,15}$/.test(String(t).replace(/[\s()-]/g, ""));
async function enviarSolicitud(datos) {
  const r = await fetch("/api/solicitud", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...datos, telefono: datos.telefono.replace(/[\s()-]/g, "") }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "No se pudo enviar. Intenta de nuevo o escríbenos por WhatsApp.");
}

function Campo({ etiqueta, error, ...props }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <input {...props} aria-invalid={error ? "true" : undefined} />
    </label>
  );
}
const Trampa = ({ valor, alCambiar }) => (
  <label className="trampa" aria-hidden="true">No llenar<input tabIndex={-1} autoComplete="off" value={valor} onChange={e => alCambiar(e.target.value)} /></label>
);

/* ---------- Crédito ---------- */
export function Credito() {
  const [valor, setValor] = useState(4000000);
  const [inicial, setInicial] = useState(30);
  const [cuotas, setCuotas] = useState(12);
  const [f, setF] = useState({ nombre: "", telefono: "", equipo: "", web: "" });
  const [estado, setEstado] = useState({ tipo: "", texto: "" });
  const cuota = Math.round(valor * (1 - inicial / 100) / cuotas / 1000) * 1000;

  const enviar = async e => {
    e.preventDefault();
    if (!f.nombre.trim()) return setEstado({ tipo: "error", texto: "Escribe tu nombre." });
    if (!telefonoValido(f.telefono)) return setEstado({ tipo: "error", texto: "Revisa el número de celular." });
    setEstado({ tipo: "", texto: "Enviando…" });
    try {
      await enviarSolicitud({ tipo: "credito", nombre: f.nombre, telefono: f.telefono, equipo: f.equipo, web: f.web,
        detalle: `Simulación: ${pesos(valor)}, inicial ${inicial} %, ${cuotas} cuotas de ${pesos(cuota)}` });
      setEstado({ tipo: "ok", texto: "Listo. Un asesor te escribe hoy mismo." });
      setF({ nombre: "", telefono: "", equipo: "", web: "" });
    } catch (err) { setEstado({ tipo: "error", texto: err.message }); }
  };

  return (
    <section className="seccion credito marco" id="credito" aria-labelledby="titulo-credito">
      <div className="credito__texto">
        <BlurText tag="h2" text="Estrénalo hoy y págalo a cuotas." className="titulo-animado" animateBy="words" delay={80} />
        <span id="titulo-credito" hidden>Estrénalo hoy y págalo a cuotas.</span>
        <p>Mueve los valores para ver una cuota de referencia. Después déjanos tu número y un asesor te confirma el plan.</p>
      </div>
      <AnimatedContent className="simulador" distance={40} duration={0.9} blur={6}>
        <label className="deslizador">
          <span>Valor del equipo <output>{pesos(valor)}</output></span>
          <input type="range" min="500000" max="8000000" step="50000" value={valor} onChange={e => setValor(+e.target.value)} />
        </label>
        <label className="deslizador">
          <span>Cuota inicial <output>{inicial} %, {pesos(valor * inicial / 100)}</output></span>
          <input type="range" min="0" max="70" step="5" value={inicial} onChange={e => setInicial(+e.target.value)} />
        </label>
        <fieldset className="cuotas">
          <legend>Número de cuotas</legend>
          {[6, 12, 18, 24].map(n => (
            <label key={n}><input type="radio" name="cuotas" value={n} checked={cuotas === n} onChange={() => setCuotas(n)} /><span>{n}</span></label>
          ))}
        </fieldset>
        <div className="simulador__resultado" aria-live="polite">
          <span>Cuota mensual de referencia</span>
          <CountUp to={cuota} from={0} duration={0.9} separator="." prefix="$ " mode="roll" trigger="view" className="simulador__cuota" />
          <small>Sin intereses, solo como guía. La tasa y la aprobación las define la entidad de crédito.</small>
        </div>
      </AnimatedContent>
      <AnimatedContent className="credito__formulario" distance={40} duration={0.9} delay={0.12} blur={6}>
      <form className="formulario" onSubmit={enviar} noValidate>
        <h3>Pide tu crédito</h3>
        <Campo etiqueta="Nombre completo" autoComplete="name" maxLength={80} value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} />
        <Campo etiqueta="Celular" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} placeholder="300 123 4567" value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} error={estado.tipo === "error" && !telefonoValido(f.telefono)} />
        <Campo etiqueta="Equipo que te interesa (opcional)" maxLength={80} placeholder="iPhone 16 Pro 128 GB" value={f.equipo} onChange={e => setF({ ...f, equipo: e.target.value })} />
        <Trampa valor={f.web} alCambiar={v => setF({ ...f, web: v })} />
        <button className="boton boton--lleno" disabled={estado.texto === "Enviando…"}>Quiero que me contacten</button>
        <p className={`formulario__estado ${estado.tipo}`} role="status">{estado.texto}</p>
      </form>
      </AnimatedContent>
    </section>
  );
}

/* ---------- Vende tu equipo ---------- */
export function VendeTuEquipo() {
  const [paso, setPaso] = useState(1);
  const [d, setD] = useState({ equipo: "", bateria: "", estado: "Como nuevo", nombre: "", telefono: "", web: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const valido = paso === 1 ? d.equipo.trim().length > 2 : paso === 2 ? true : d.nombre.trim() && telefonoValido(d.telefono);
  const detalle = `Batería: ${d.bateria || "?"} %. Estado: ${d.estado}`;

  const terminar = async () => {
    setEnviando(true); setError("");
    try {
      await enviarSolicitud({ tipo: "usado", nombre: d.nombre, telefono: d.telefono, equipo: d.equipo, detalle, web: d.web });
      setPaso(4);
    } catch (err) { setError(err.message); } finally { setEnviando(false); }
  };

  return (
    <section className="seccion vende marco" id="vende" aria-labelledby="titulo-vende">
      <div className="vende__texto">
        <BlurText tag="h2" text="Tu equipo actual es parte del pago." className="titulo-animado" animateBy="words" delay={80} />
        <span id="titulo-vende" hidden>Tu equipo actual es parte del pago.</span>
        <p>Cuéntanos qué tienes. Te enviamos una oferta por WhatsApp el mismo día y, si te sirve, la descontamos del equipo que te lleves después de revisarlo en tienda.</p>
      </div>
      <Stepper className="vende__pasos" theme="light" accentColor="#6e523a" width={520} radius={22} transition="slide"
        step={paso} onStepChange={n => { setError(""); setPaso(n); }} onFinalStepCompleted={terminar} linear
        backButtonText="Atrás" nextButtonText="Siguiente" completeButtonText={enviando ? "Enviando…" : "Recibir oferta"}
        nextButtonProps={{ disabled: !valido || enviando }}
        completedContent={
          <div className="vende__listo">
            <h3>Recibimos los datos de tu {d.equipo}.</h3>
            <p>Te escribimos hoy con la oferta. Si quieres adelantar, mándanos fotos del equipo.</p>
            <a className="boton boton--linea" target="_blank" rel="noopener" href={enlaceWhatsapp(`Hola, quiero vender mi ${d.equipo}. ${detalle}. Soy ${d.nombre}.`)}>Enviar fotos por WhatsApp</a>
          </div>
        }>
        <Step title="Equipo">
          <Campo etiqueta="¿Qué equipo tienes?" maxLength={80} placeholder="iPhone 13 Pro 256 GB" value={d.equipo} onChange={e => setD({ ...d, equipo: e.target.value })} />
        </Step>
        <Step title="Estado">
          <div className="par">
            <Campo etiqueta="Salud de batería (%)" type="number" min="1" max="100" inputMode="numeric" placeholder="87" value={d.bateria} onChange={e => setD({ ...d, bateria: e.target.value })} />
            <Selector etiqueta="Cómo está" className="campo" valor={d.estado} alCambiar={v => setD({ ...d, estado: v })}
              opciones={["Como nuevo", "Rayones leves", "Golpes o pantalla rota"].map(x => [x, x])} />
          </div>
          <p className="ayuda-campo">La batería la ves en Configuración, Batería, Estado de la batería.</p>
        </Step>
        <Step title="Contacto">
          <Campo etiqueta="Tu nombre" autoComplete="name" maxLength={80} value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })} />
          <Campo etiqueta="Celular" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} placeholder="300 123 4567" value={d.telefono} onChange={e => setD({ ...d, telefono: e.target.value })} />
          <Trampa valor={d.web} alCambiar={v => setD({ ...d, web: v })} />
          {error && <p className="formulario__estado error" role="alert">{error}</p>}
        </Step>
      </Stepper>
    </section>
  );
}
