/* Ilustraciones SVG de cada equipo, coloreadas con el color del producto.
   Mientras no haya fotos reales, cada tarjeta se ve limpia y coherente. */
const tono = (hex, f) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
};
let uid = 0;

function telefono(p) {
  const hex = p.color.hex, id = "g" + (++uid), m = p.modelo || { modulo: "cuadro", lentes: 2, alto: 150, ancho: 72 };
  const W = 120, H = Math.round(W * m.alto / m.ancho), r = 19;
  const lente = (cx, cy, s = 11) => `<circle cx="${cx}" cy="${cy}" r="${s}" fill="#0c0c0e" stroke="${tono(hex, -.35)}" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="${s * .55}" fill="url(#${id}l)"/><circle cx="${cx - s * .25}" cy="${cy - s * .3}" r="${s * .16}" fill="#fff" opacity=".55"/>`;
  let modulo = "";
  if (m.modulo === "barra") {
    modulo = `<rect x="6" y="8" width="${W - 12}" height="50" rx="17" fill="${tono(hex, -.06)}" stroke="${tono(hex, -.18)}" stroke-width="1"/>`
      + (m.lentes === 3 ? lente(22, 22, 10) + lente(22, 45, 10) + lente(44, 33, 10) : m.lentes === 2 ? lente(24, 33, 10) + lente(50, 33, 10) : lente(26, 33, 12))
      + `<circle cx="${W - 26}" cy="24" r="4" fill="#e9e3d2" opacity=".8"/>`;
  } else {
    const s = m.lentes === 3 ? 54 : 46;
    modulo = `<rect x="8" y="8" width="${s}" height="${s}" rx="14" fill="${tono(hex, .08)}" stroke="${tono(hex, -.15)}" stroke-width="1"/>`
      + (m.lentes === 3 ? lente(22, 22, 9.5) + lente(22, 46, 9.5) + lente(46, 34, 9.5) : m.lentes === 2 ? lente(22, 22, 9.5) + lente(22, 44, 9.5) + `<circle cx="44" cy="22" r="3" fill="#e9e3d2" opacity=".8"/>` : lente(24, 24, 11) + `<circle cx="24" cy="44" r="3" fill="#e9e3d2" opacity=".8"/>`);
  }
  return `<svg viewBox="-4 -4 ${W + 8} ${H + 8}" role="img" aria-label="${p.nombre} color ${p.color.nombre}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tono(hex, .22)}"/><stop offset=".55" stop-color="${hex}"/><stop offset="1" stop-color="${tono(hex, -.22)}"/></linearGradient>
    <radialGradient id="${id}l"><stop offset="0" stop-color="#3a4a6a"/><stop offset="1" stop-color="#050507"/></radialGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect x="-2" y="-2" width="${W + 4}" height="${H + 4}" rx="${r + 2}" fill="${tono(hex, -.3)}"/>
    <rect width="${W}" height="${H}" rx="${r}" fill="url(#${id})"/>
    ${modulo}
  </svg>`;
}

function tableta(p) {
  const hex = p.color.hex, id = "g" + (++uid);
  return `<svg viewBox="0 0 200 270" role="img" aria-label="${p.nombre}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tono(hex, .25)}"/><stop offset="1" stop-color="${tono(hex, -.25)}"/></linearGradient></defs>
    <rect x="4" y="4" width="192" height="262" rx="18" fill="url(#${id})"/><rect x="13" y="13" width="174" height="244" rx="10" fill="#0a0a0c"/>
    <rect x="13" y="13" width="174" height="244" rx="10" fill="url(#${id})" opacity=".18"/><circle cx="100" cy="8.5" r="1.6" fill="#111"/></svg>`;
}
function portatil(p) {
  const hex = p.color.hex, id = "g" + (++uid);
  return `<svg viewBox="0 0 300 200" role="img" aria-label="${p.nombre}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tono(hex, .2)}"/><stop offset="1" stop-color="${tono(hex, -.2)}"/></linearGradient></defs>
    <rect x="40" y="20" width="220" height="146" rx="10" fill="${tono(hex, -.1)}"/><rect x="47" y="27" width="206" height="132" rx="5" fill="#0a0a0c"/>
    <rect x="47" y="27" width="206" height="132" rx="5" fill="url(#${id})" opacity=".14"/><rect x="138" y="27" width="24" height="5" rx="2.5" fill="#000"/>
    <path d="M14 168h272l-8 12H22z" fill="url(#${id})"/><rect x="130" y="168" width="40" height="4" rx="2" fill="${tono(hex, -.3)}"/></svg>`;
}
function accesorio(p) {
  const hex = p.color.hex;
  if (/airpods/i.test(p.nombre)) return `<svg viewBox="0 0 200 200" role="img" aria-label="${p.nombre}"><rect x="30" y="50" width="140" height="110" rx="38" fill="${hex}"/><path d="M30 92h140" stroke="#cfcfca" stroke-width="2"/><circle cx="100" cy="128" r="4" fill="#d9d9d4"/><rect x="88" y="150" width="24" height="5" rx="2.5" fill="#bdbdb8"/></svg>`;
  return `<svg viewBox="0 0 200 200" role="img" aria-label="${p.nombre}"><rect x="50" y="40" width="100" height="100" rx="22" fill="${hex}"/><rect x="85" y="140" width="30" height="40" rx="6" fill="${tono(hex, -.08)}"/><rect x="91" y="78" width="18" height="6" rx="3" fill="#d4d4cf"/></svg>`;
}

/* Primera foto real del producto o, si no tiene, su ilustración. Devuelve un elemento listo para insertar */
export function portada(p, { grande = false } = {}) {
  const f = (p.fotos || [])[0];
  if (f && /^[a-z0-9-]+\.(webp|jpg|png)$/.test(f)) {
    const img = document.createElement("img");
    img.src = "/fotos/" + f; img.alt = `${p.nombre} ${p.color?.nombre || ""}`.trim();
    img.className = "foto"; img.decoding = "async"; if (!grande) img.loading = "lazy";
    return img;
  }
  const t = document.createElement("template"); t.innerHTML = dibujo(p).trim();
  return t.content.firstElementChild;
}

const esc = v => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function dibujo(original) {
  const p = { ...original, nombre: esc(original.nombre), color: { hex: /^#[0-9a-f]{6}$/i.test(original.color.hex) ? original.color.hex : "#cccccc", nombre: esc(original.color.nombre) } };
  if (p.familia === "iphone") return telefono(p);
  if (p.familia === "ipad") return tableta(p);
  if (p.familia === "mac") return portatil(p);
  return accesorio(p);
}
