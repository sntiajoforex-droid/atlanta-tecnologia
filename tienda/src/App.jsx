import { useCallback, useMemo, useState } from "react";
import Encabezado from "./componentes/Encabezado.jsx";
import Portada, { elegirEstrella } from "./componentes/Portada.jsx";
import Catalogo, { FILTRO_INICIAL } from "./componentes/Catalogo.jsx";
import Ficha from "./componentes/Ficha.jsx";
import Visor from "./componentes/Visor.jsx";
import Bolsa from "./componentes/Bolsa.jsx";
import { Credito, VendeTuEquipo } from "./componentes/Formularios.jsx";
import { BandaModelos, BotonWhatsapp, Garantias, Grados, Pie, Preguntas } from "./componentes/Secciones.jsx";
import { useAviso, useCatalogo } from "./util.js";

export default function App() {
  const { productos, cargando, error, config } = useCatalogo();
  const [filtro, setFiltro] = useState(FILTRO_INICIAL);
  const [ficha, setFicha] = useState(null);
  const [visor, setVisor] = useState(null);
  const [bolsa, setBolsa] = useState(false);
  const aviso = useAviso();
  const estrella = useMemo(() => elegirEstrella(productos), [productos]);

  const filtrarEstado = useCallback(estado => setFiltro({ ...FILTRO_INICIAL, estado }), []);
  const ver3D = useCallback(p => { setFicha(null); setVisor(p); }, []);
  const cerrarFicha = useCallback(() => setFicha(null), []);
  const cerrarVisor = useCallback(() => setVisor(null), []);
  const cerrarBolsa = useCallback(() => setBolsa(false), []);

  return (
    <>
      <Encabezado alFiltrar={filtrarEstado} alAbrirCarrito={() => setBolsa(true)} />
      <main id="principal">
        <Portada estrella={estrella} alVerSeminuevos={() => filtrarEstado("usado")} alVerNuevos={() => filtrarEstado("nuevo")} alInspeccionar={ver3D} />
        <Garantias />
        <BandaModelos />
        <Catalogo productos={productos} cargando={cargando} error={error} filtro={filtro} setFiltro={setFiltro} alAbrir={setFicha} alVer3D={ver3D} />
        <Grados />
        <Credito />
        <VendeTuEquipo />
        <Preguntas />
      </main>
      <Pie instagram={config.instagram} />
      <BotonWhatsapp />
      <Ficha producto={ficha} alCerrar={cerrarFicha} alVer3D={ver3D} />
      <Visor producto={visor} alCerrar={cerrarVisor} />
      <Bolsa abierta={bolsa} alCerrar={cerrarBolsa} productos={productos} />
      <p className={`aviso${aviso ? " aviso--visible" : ""}`} role="status" aria-live="polite">{aviso}</p>
    </>
  );
}
