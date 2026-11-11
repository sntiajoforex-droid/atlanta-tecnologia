/* Foto real del equipo o, si no tiene, su ilustración (los SVG de dibujos.js escapan los textos del catálogo) */
import { dibujo } from "../../../public/js/dibujos.js";

export const urlFoto = f => (/^[a-z0-9-]+\.(webp|jpg|png)$/.test(f) ? "/fotos/" + f : null);

export default function Imagen({ producto: p, foto, grande = false, className = "" }) {
  const src = urlFoto(foto ?? p.fotos?.[0] ?? "");
  if (src) return <img className={`imagen imagen--foto ${className}`} src={src} alt={`${p.nombre}, ${p.color?.nombre || ""}`} decoding="async" loading={grande ? "eager" : "lazy"} />;
  return <div className={`imagen imagen--dibujo ${className}`} role="img" aria-label={p.nombre} dangerouslySetInnerHTML={{ __html: dibujo(p) }} />;
}
