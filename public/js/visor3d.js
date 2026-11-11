/* Visor 3D de equipos.
   Arma el teléfono con las medidas reales del catálogo (mm) y ubica cada detalle (rayón, golpe) en la cara donde está.
   Si el producto trae un escaneo real (GLB), se muestra ese en lugar del dibujado.
   Unidades: 1 = 10 mm. El frente mira a +Z, la espalda a −Z, el lado derecho (visto de frente) a +X. */
import * as THREE from "../vendor/three.module.js";
import { OrbitControls } from "../vendor/OrbitControls.js";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";
import { RoundedBoxGeometry } from "../vendor/RoundedBoxGeometry.js";

const forma = (w, h, r) => {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
};
const mezclar = (hex, otro, f) => new THREE.Color(hex).lerp(new THREE.Color(otro), f);

/* Fondo de pantalla con la hora, dibujado en un canvas */
function texturaPantalla(w, h, hex) {
  const c = document.createElement("canvas"), k = 512 / w;
  c.width = 512; c.height = Math.round(h * k);
  const g = c.getContext("2d"), base = new THREE.Color(hex);
  const grad = g.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, "#" + mezclar(base, "#000", .55).getHexString());
  grad.addColorStop(.6, "#" + mezclar(base, "#000", .82).getHexString());
  grad.addColorStop(1, "#050506");
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
  const halo = g.createRadialGradient(c.width * .7, c.height * .75, 10, c.width * .7, c.height * .75, c.width * .9);
  halo.addColorStop(0, "#" + mezclar(base, "#fff", .1).getHexString() + "66"); halo.addColorStop(1, "transparent");
  g.fillStyle = halo; g.fillRect(0, 0, c.width, c.height);
  const ahora = new Date(), hora = `${ahora.getHours() % 12 || 12}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  g.fillStyle = "rgba(255,255,255,.92)"; g.textAlign = "center";
  g.font = "600 30px Manrope, system-ui, sans-serif";
  g.fillText(ahora.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }), c.width / 2, c.height * .16);
  g.font = "200 150px Manrope, system-ui, sans-serif";
  g.fillText(hora, c.width / 2, c.height * .16 + 150);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function texturaSombra() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(0,0,0,.55)"); r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function construirTelefono(p) {
  const m = p.modelo, W = m.ancho / 10, H = m.alto / 10, D = m.grosor / 10, R = W * .17, b = Math.min(.12, D * .22);
  const grupo = new THREE.Group(), hex = p.color.hex;
  const pro = m.modulo === "barra" || m.lentes === 3;

  const marco = new THREE.MeshPhysicalMaterial({ color: mezclar(hex, "#ffffff", .25), metalness: 1, roughness: pro ? .38 : .22, clearcoat: .4 });
  const cuerpo = new THREE.ExtrudeGeometry(forma(W - 2 * b, H - 2 * b, R - b), { depth: D - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 8, curveSegments: 32 });
  cuerpo.translate(0, 0, -(D - 2 * b) / 2);
  grupo.add(new THREE.Mesh(cuerpo, marco));

  /* Vidrio trasero: esmerilado en los Pro, brillante en los demás */
  const vidrio = new THREE.Mesh(new THREE.ShapeGeometry(forma(W - .1, H - .1, R - .05), 32), new THREE.MeshPhysicalMaterial({
    color: hex, metalness: .1, roughness: pro ? .55 : .2, clearcoat: 1, clearcoatRoughness: pro ? .35 : .05 }));
  vidrio.rotation.y = Math.PI; vidrio.position.z = -D / 2 - .002;
  grupo.add(vidrio);

  /* Pantalla */
  const bisel = .13, pw = W - 2 * bisel, ph = H - 2 * bisel;
  const geoPantalla = new THREE.ShapeGeometry(forma(pw, ph, R - bisel), 32);
  const uv = geoPantalla.attributes.uv, pos = geoPantalla.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / pw + .5, pos.getY(i) / ph + .5);
  const marcoNegro = new THREE.Mesh(new THREE.ShapeGeometry(forma(W - .04, H - .04, R - .02), 32), new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: .1, clearcoat: 1 }));
  marcoNegro.position.z = D / 2 + .001;
  const pantalla = new THREE.Mesh(geoPantalla, new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: texturaPantalla(pw, ph, hex), emissiveIntensity: .6, roughness: .12, clearcoat: 1, clearcoatRoughness: 0 }));
  pantalla.position.z = D / 2 + .003;
  const isla = new THREE.Mesh(new THREE.ShapeGeometry(forma(W * .3, .36, .18), 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  isla.position.set(0, ph / 2 - .42, D / 2 + .004);
  grupo.add(marcoNegro, pantalla, isla);

  /* Módulo de cámaras: arriba a la izquierda vista desde atrás = lado +X */
  const metalLente = new THREE.MeshPhysicalMaterial({ color: mezclar(hex, "#888888", .4), metalness: 1, roughness: .25 });
  const cristal = new THREE.MeshPhysicalMaterial({ color: 0x0a0d14, metalness: .2, roughness: .05, clearcoat: 1, clearcoatRoughness: 0, iridescence: .6, iridescenceIOR: 1.5 });
  const fondoLente = new THREE.MeshBasicMaterial({ color: 0x1b2440 });
  const modulo = new THREE.Group(), margen = W * .06;
  let mw, mh, lentes;
  const rl = W * (m.lentes === 1 ? .1 : .085);
  if (m.modulo === "barra") {
    mw = W - 2 * margen; mh = H * .19;
    const cx = mw / 2 - W * .16;
    lentes = m.lentes === 3 ? [[cx, mh * .22], [cx, -mh * .22], [cx - W * .2, 0]] : m.lentes === 2 ? [[cx, 0], [cx - W * .22, 0]] : [[cx, 0]];
    lentes.push(["flash", -mw / 2 + W * .14, mh * .2]);
  } else {
    mw = mh = W * (m.lentes === 3 ? .44 : .38);
    const d = mw * .23;
    lentes = m.lentes === 3 ? [[d, d], [d, -d], [-d * 1.05, 0]] : m.lentes === 2 ? [[d, d], [d, -d]] : [[d, d]];
    lentes.push(["flash", -d, d]);
  }
  const placa = new THREE.ExtrudeGeometry(forma(mw, mh, Math.min(mw, mh) * .3), { depth: .06, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 5, curveSegments: 24 });
  modulo.add(new THREE.Mesh(placa, new THREE.MeshPhysicalMaterial({ color: mezclar(hex, "#000", .06), metalness: m.modulo === "barra" ? .9 : .1, roughness: m.modulo === "barra" ? .35 : .15, clearcoat: 1 })));
  for (const l of lentes) {
    if (l[0] === "flash") {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(rl * .32, rl * .32, .04, 24), new THREE.MeshPhysicalMaterial({ color: 0xf2ead6, roughness: .3, transmission: .2 }));
      f.rotation.x = Math.PI / 2; f.position.set(l[1], l[2], .14); modulo.add(f); continue;
    }
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(rl, rl * 1.04, .16, 40), metalLente);
    aro.rotation.x = Math.PI / 2; aro.position.set(l[0], l[1], .18);
    const vid = new THREE.Mesh(new THREE.CircleGeometry(rl * .82, 40), cristal); vid.position.set(l[0], l[1], .262);
    const centro = new THREE.Mesh(new THREE.CircleGeometry(rl * .32, 32), fondoLente); centro.position.set(l[0], l[1], .258);
    modulo.add(aro, centro, vid);
  }
  modulo.rotation.y = Math.PI;
  modulo.position.set(W / 2 - margen - mw / 2, H / 2 - margen - mh / 2, -D / 2 - .005);
  grupo.add(modulo);

  /* Botones laterales */
  const boton = (lado, y, largo) => {
    const g = new RoundedBoxGeometry(.07, largo, D * .45, 3, .03);
    const mesh = new THREE.Mesh(g, marco); mesh.position.set(lado * (W / 2 + .02), y, 0); grupo.add(mesh);
  };
  boton(1, H * .18, H * .1);           /* encendido */
  boton(-1, H * .27, H * .045);        /* acción */
  boton(-1, H * .16, H * .075);        /* volumen + */
  boton(-1, H * .06, H * .075);        /* volumen − */
  if (pro) boton(1, -H * .12, H * .05); /* control de cámara */

  return { grupo, W, H, D, R };
}

/* Punto y normal de cada detalle, según la cara y (u, v) de 0 a 1 */
function ubicar(k, { W, H, D, R }) {
  const p = new THREE.Vector3(), n = new THREE.Vector3(), e = .02;
  const esquina = (a, lim) => { const d = Math.abs(a) - (lim - R); return d > 0 ? R - Math.sqrt(Math.max(0, R * R - d * d)) : 0; };
  switch (k.cara) {
    case "frontal": p.set((k.u - .5) * W * .9, (.5 - k.v) * H * .92, D / 2 + e); n.set(0, 0, 1); break;
    case "trasera": p.set((.5 - k.u) * W * .9, (.5 - k.v) * H * .92, -D / 2 - e); n.set(0, 0, -1); break;
    case "marco-der": { const y = (.5 - k.v) * H; p.set(W / 2 - esquina(y, H / 2) + e, y, (.5 - k.u) * D * .6); n.set(1, 0, 0); break; }
    case "marco-izq": { const y = (.5 - k.v) * H; p.set(-W / 2 + esquina(y, H / 2) - e, y, (.5 - k.u) * D * .6); n.set(-1, 0, 0); break; }
    case "marco-sup": { const x = (k.u - .5) * W; p.set(x, H / 2 - esquina(x, W / 2) + e, (.5 - k.v) * D * .6); n.set(Math.sign(x) * esquina(x, W / 2), 1, 0).normalize(); break; }
    case "marco-inf": { const x = (k.u - .5) * W; p.set(x, -H / 2 + esquina(x, W / 2) - e, (.5 - k.v) * D * .6); n.set(Math.sign(x) * esquina(x, W / 2), -1, 0).normalize(); break; }
  }
  return { p, n };
}

/* Lo inverso de ubicar(): de un punto del modelo a cara y (u, v). Se usa en el panel para marcar con un clic.
   En un escaneo la superficie no es una caja perfecta: la normal del punto tocado decide si es pantalla o espalda */
function caraDe(q, { W, H, D, escaneo }, normal) {
  const c = v => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
  const frenteOAtras = escaneo && normal ? Math.abs(normal.z) > .55 : Math.abs(q.z) >= D / 2 - .03;
  const atras = escaneo && normal ? normal.z < 0 : q.z < 0;
  if (frenteOAtras) return atras
    ? { cara: "trasera", u: c(.5 - q.x / (W * .9)), v: c(.5 - q.y / (H * .92)) }
    : { cara: "frontal", u: c(q.x / (W * .9) + .5), v: c(.5 - q.y / (H * .92)) };
  if (Math.abs(q.x) / (W / 2) >= Math.abs(q.y) / (H / 2))
    return { cara: q.x > 0 ? "marco-der" : "marco-izq", u: c(.5 - q.z / (D * .6)), v: c(.5 - q.y / H) };
  return { cara: q.y > 0 ? "marco-sup" : "marco-inf", u: c(q.x / W + .5), v: c(.5 - q.z / (D * .6)) };
}

/* ---------- Escaneo real (GLB) ----------
   Las apps de escaneo dejan el equipo en cualquier posición (acostado, girado sobre la mesa...).
   Con los ejes principales de sus vértices (PCA) se endereza solo: el eje más largo queda como alto y el más corto como grosor.
   Lo que el cálculo no puede saber (cuál cara es la pantalla y cuál lado va arriba) se corrige con «voltear» e «invertir». */
function jacobi(A) {
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let it = 0; it < 60; it++) {
    let p = 0, q = 1;
    if (Math.abs(A[0][2]) > Math.abs(A[p][q])) { p = 0; q = 2; }
    if (Math.abs(A[1][2]) > Math.abs(A[p][q])) { p = 1; q = 2; }
    if (Math.abs(A[p][q]) < 1e-14 * (Math.abs(A[0][0]) + Math.abs(A[1][1]) + Math.abs(A[2][2]))) break;
    const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
    const t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
    for (let k = 0; k < 3; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = cs * a - sn * b; A[k][q] = sn * a + cs * b; }
    for (let k = 0; k < 3; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = cs * a - sn * b; A[q][k] = sn * a + cs * b; }
    for (let k = 0; k < 3; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = cs * a - sn * b; V[k][q] = sn * a + cs * b; }
  }
  return [0, 1, 2].map(j => ({ valor: A[j][j], eje: new THREE.Vector3(V[0][j], V[1][j], V[2][j]) })).sort((a, b) => b.valor - a.valor);
}
function recorrerVertices(raiz, f) {
  const v = new THREE.Vector3();
  raiz.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, paso = Math.max(1, Math.floor(pos.count / 150000));
    for (let i = 0; i < pos.count; i += paso) f(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
  });
}
function analizarEscaneo(raiz) {
  raiz.updateMatrixWorld(true);
  /* Puntos de muestra (hasta ~150 mil por malla), relativos al promedio */
  const lista = [];
  recorrerVertices(raiz, p => lista.push(p.x, p.y, p.z));
  const n = lista.length / 3;
  if (!n) throw new Error("El escaneo no tiene vértices");
  const media = new THREE.Vector3();
  for (let i = 0; i < lista.length; i += 3) { media.x += lista[i]; media.y += lista[i + 1]; media.z += lista[i + 2]; }
  media.divideScalar(n);
  const P = new Float32Array(lista.length);
  for (let i = 0; i < lista.length; i += 3) { P[i] = lista[i] - media.x; P[i + 1] = lista[i + 1] - media.y; P[i + 2] = lista[i + 2] - media.z; }

  /* 1) Ejes principales (PCA) */
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) for (let b = a; b < 3; b++) C[a][b] += P[i + a] * P[i + b];
  C[1][0] = C[0][1]; C[2][0] = C[0][2]; C[2][1] = C[1][2];
  const [largo, medio] = jacobi(C);
  const firmar = v => { const a = v.toArray(), k = a.reduce((m, x, i) => Math.abs(x) > Math.abs(a[m]) ? i : m, 0); return a[k] < 0 ? v.negate() : v; };
  const ey = firmar(largo.eje.clone().normalize()), ex = firmar(medio.eje.clone().normalize());
  const ez = new THREE.Vector3().crossVectors(ex, ey).normalize();
  const giro = new THREE.Matrix4().makeBasis(ex, ey, ez).transpose(); /* del espacio del archivo a ejes del equipo */
  const e = giro.elements; /* columna mayor */
  for (let i = 0; i < P.length; i += 3) {
    const x = P[i], y = P[i + 1], z = P[i + 2];
    P[i] = e[0] * x + e[4] * y + e[8] * z; P[i + 1] = e[1] * x + e[5] * y + e[9] * z; P[i + 2] = e[2] * x + e[6] * y + e[10] * z;
  }

  /* 2) Ajuste fino: la cámara que sobresale tuerce un poco el PCA. En cada plano se busca el ángulo (±8°) con la caja más ajustada */
  const paso = Math.max(1, Math.floor(n / 20000));
  for (const [a, b] of [[0, 1], [1, 2], [0, 2], [0, 1]]) {
    let mejor = 0, menor = Infinity;
    for (let g = -8; g <= 8; g += .2) {
      const t = g * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (let i = 0; i < P.length; i += 3 * paso) {
        const u = c * P[i + a] - s * P[i + b], v = s * P[i + a] + c * P[i + b];
        if (u < a0) a0 = u; if (u > a1) a1 = u; if (v < b0) b0 = v; if (v > b1) b1 = v;
      }
      const area = (a1 - a0) * (b1 - b0);
      if (area < menor - 1e-12) { menor = area; mejor = t; }
    }
    if (!mejor) continue;
    const c = Math.cos(mejor), s = Math.sin(mejor);
    for (let i = 0; i < P.length; i += 3) { const u = P[i + a], v = P[i + b]; P[i + a] = c * u - s * v; P[i + b] = s * u + c * v; }
    const R = new THREE.Matrix4(), m = R.elements; /* rotación en el plano (a, b) */
    m[a * 4 + a] = c; m[b * 4 + a] = -s; m[a * 4 + b] = s; m[b * 4 + b] = c;
    giro.premultiply(R);
  }

  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = min.clone().negate(), q = new THREE.Vector3();
  for (let i = 0; i < P.length; i += 3) { q.fromArray(P, i); min.min(q); max.max(q); }

  /* 3) Adivina cuál cara es la espalda y cuál lado va arriba: el módulo de cámaras sobresale de la espalda, en la parte de arriba.
     La pantalla y la espalda son los planos con más puntos (percentiles 25 y 75 del grosor); lo que pasa más allá de uno de ellos es la cámara. */
  const zs = new Float32Array(n);
  for (let i = 0; i < n; i++) zs[i] = P[i * 3 + 2];
  const orden = Float32Array.from(zs).sort(), pct = f => orden[Math.floor(f * (n - 1))];
  const planoMenos = pct(.25), planoMas = pct(.75), sobraMas = max.z - planoMas, sobraMenos = planoMenos - min.z;
  let girarZ = false, girarY = false;
  if (Math.abs(sobraMas - sobraMenos) > (planoMas - planoMenos) * .08) {
    const camaraEnMas = sobraMas > sobraMenos, umbral = camaraEnMas ? planoMas + sobraMas * .4 : planoMenos - sobraMenos * .4;
    let suma = 0, k = 0;
    for (let i = 0; i < n; i++) if (camaraEnMas ? zs[i] > umbral : zs[i] < umbral) { suma += P[i * 3 + 1]; k++; }
    girarZ = camaraEnMas; /* la espalda debe mirar a −Z */
    girarY = k > 0 && suma / k < (min.y + max.y) / 2; /* la cámara debe quedar arriba */
  }
  if (girarZ || girarY) {
    const sx = girarZ !== girarY ? -1 : 1, sy = girarY ? -1 : 1, sz = girarZ ? -1 : 1;
    giro.premultiply(new THREE.Matrix4().makeScale(sx, sy, sz));
    const k = new THREE.Vector3(sx, sy, sz), a = min.clone().multiply(k), b = max.clone().multiply(k);
    min.copy(a).min(b); max.copy(a).max(b);
  }
  return { media, giro, centro: min.clone().add(max).multiplyScalar(.5), medidas: max.clone().sub(min) };
}
function orientarEscaneo(interior, a, escala, { voltear, invertir }) {
  const F = new THREE.Matrix4().makeScale((voltear ? -1 : 1) * (invertir ? -1 : 1), invertir ? -1 : 1, voltear ? -1 : 1);
  interior.matrix.makeScale(escala, escala, escala).multiply(F)
    .multiply(new THREE.Matrix4().makeTranslation(-a.centro.x, -a.centro.y, -a.centro.z)).multiply(a.giro)
    .multiply(new THREE.Matrix4().makeTranslation(-a.media.x, -a.media.y, -a.media.z));
  interior.updateMatrixWorld(true);
}
async function cargarEscaneo(producto, alProgreso) {
  const { GLTFLoader } = await import("../vendor/GLTFLoader.js");
  const e = producto.escaneo, url = e.url || "/modelos3d/" + encodeURIComponent(e.archivo);
  const gltf = await new GLTFLoader().loadAsync(url, ev => ev.total && alProgreso(ev.loaded / ev.total));
  const raiz = gltf.scene, a = analizarEscaneo(raiz);
  /* Tamaño: el alto real del modelo si se conoce; si no, las apps exportan en metros (1 m = 100 unidades de 10 mm) */
  const alto = producto.modelo ? producto.modelo.alto / 10 : a.medidas.y < 1 ? a.medidas.y * 100 : 15;
  const escala = alto / a.medidas.y;
  const interior = new THREE.Group(); interior.matrixAutoUpdate = false; interior.add(raiz);
  raiz.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { m.side = THREE.DoubleSide; if ("envMapIntensity" in m) m.envMapIntensity = .7; } });
  orientarEscaneo(interior, a, escala, e);
  const grupo = new THREE.Group(); grupo.add(interior);
  const W = a.medidas.x * escala, H = a.medidas.y * escala, D = a.medidas.z * escala;
  return { grupo, W, H, D, R: W * .17, escaneo: true, interior, analisis: a, escala };
}

export function crearVisor(contenedor, producto, { alMarcar = () => {}, alInteractuar = () => {}, alColocar = null, alProgreso = () => {}, zoom = true, interactivo = true, encuadre = 2.3, holgura = 0 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  contenedor.prepend(renderer.domElement);

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  escena.environment = entorno;
  const luz = new THREE.DirectionalLight(0xffffff, 1.6); luz.position.set(4, 8, 6); escena.add(luz);
  const luz2 = new THREE.DirectionalLight(0xd8c3a0, .8); luz2.position.set(-6, -2, -6); escena.add(luz2);

  const camara = new THREE.PerspectiveCamera(32, 1, .1, 400);
  const controles = new OrbitControls(camara, renderer.domElement);
  Object.assign(controles, { enableDamping: true, dampingFactor: .08, enablePan: false, enableZoom: zoom, enabled: interactivo, autoRotate: true, autoRotateSpeed: 1.6, rotateSpeed: .8 });
  /* De adorno (portada): no captura el arrastre ni la rueda, para no frenar el scroll de la página */
  if (!interactivo) { renderer.domElement.style.touchAction = "auto"; renderer.domElement.style.pointerEvents = "none"; }

  let tel = null, distancia = 30, destruido = false;
  /* Coloca el equipo (dibujado o escaneado) y ajusta cámara y sombra a su tamaño */
  function montar(t) {
    if (destruido) return;
    tel = t; escena.add(tel.grupo);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(tel.W * 2.2, tel.D * 9 + 2), new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = -tel.H / 2 - .9; escena.add(sombra);
    distancia = tel.H * encuadre; ajustar();
    camara.position.set(-.45, .12, -.9).setLength(distancia);
    Object.assign(controles, { minDistance: tel.H * .9, maxDistance: Math.max(tel.H * 3.4, distancia * 1.2) });
    ponerMarcas(listaMarcas);
  }

  /* En un escaneo, cada marca se lleva desde la caja que lo envuelve hasta la superficie real, con un rayo hacia adentro */
  const rayo = new THREE.Raycaster();
  const normalDe = golpe => golpe.face ? golpe.face.normal.clone().transformDirection(golpe.object.matrixWorld) : null;
  function posicion(k) {
    const { p, n } = ubicar(k, tel);
    if (!tel.escaneo) return { p, n };
    rayo.set(p.clone().addScaledVector(n, tel.H), n.clone().negate());
    const golpe = rayo.intersectObject(tel.interior, true)[0];
    if (!golpe) return { p, n };
    let nn = normalDe(golpe) || n.clone();
    if (nn.dot(n) < 0) nn.negate();
    return { p: golpe.point.clone().addScaledVector(nn, .02), n: nn.lerp(n, .5).normalize() };
  }

  /* Marcas como elementos HTML sobre el lienzo */
  let marcas = [], globo = null, activa = -1, listaMarcas = producto.marcas || [];
  function ponerMarcas(lista) {
    listaMarcas = lista || [];
    marcas.forEach(m => m.punto.remove()); globo?.remove(); globo = null; activa = -1;
    if (!tel) { marcas = []; return; }
    marcas = listaMarcas.map((k, i) => {
      const { p, n } = posicion(k);
      const punto = document.createElement("button");
      punto.type = "button"; punto.className = "marca-3d"; punto.textContent = i + 1; punto.setAttribute("aria-label", `Detalle ${i + 1}: ${k.texto || "sin texto"}`);
      punto.addEventListener("click", () => enfocarMarca(i));
      contenedor.append(punto);
      return { ...k, p, n, punto };
    });
  }

  /* Panel: un clic (sin arrastrar) sobre el equipo crea un detalle en ese punto */
  if (alColocar) {
    const puntero = new THREE.Vector2();
    let inicio = null;
    renderer.domElement.addEventListener("pointerdown", e => { inicio = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener("pointerup", e => {
      if (!tel || !inicio || Math.hypot(e.clientX - inicio[0], e.clientY - inicio[1]) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      puntero.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      rayo.setFromCamera(puntero, camara);
      const golpe = rayo.intersectObject(tel.grupo, true)[0];
      if (!golpe) return;
      let nn = normalDe(golpe);
      if (nn && nn.dot(rayo.ray.direction) > 0) nn.negate();
      alColocar(caraDe(tel.grupo.worldToLocal(golpe.point.clone()), tel, nn));
    });
  }
  const mostrarGlobo = i => {
    globo?.remove(); globo = null; activa = i;
    marcas.forEach((m, j) => m.punto.classList.toggle("activa", j === i));
    alMarcar(i);
    if (i < 0) return;
    globo = document.createElement("div"); globo.className = "globo"; globo.textContent = marcas[i].texto || "Escribe la descripción de este detalle";
    contenedor.append(globo);
  };

  /* Movimiento suave de la cámara entre vistas */
  let viaje = null;
  const viajar = (destino, radio, centro = new THREE.Vector3()) => {
    const a = new THREE.Spherical().setFromVector3(camara.position.clone().sub(controles.target));
    const b = new THREE.Spherical().setFromVector3(destino);
    let dt = b.theta - a.theta; if (dt > Math.PI) dt -= 2 * Math.PI; if (dt < -Math.PI) dt += 2 * Math.PI;
    b.theta = a.theta + dt; b.radius = radio;
    b.phi = Math.min(Math.PI - .15, Math.max(.15, b.phi));
    viaje = { a, b, t: 0, c0: controles.target.clone(), c1: centro };
    controles.autoRotate = false;
  };
  const DIRS = { trasera: new THREE.Vector3(-.25, .1, -1), frontal: new THREE.Vector3(.2, .08, 1), "marco-der": new THREE.Vector3(1, .1, .15), "marco-izq": new THREE.Vector3(-1, .1, .15) };
  /* Vuelve al encuadre completo (centrado, a la altura de siempre) y retoma el giro */
  let tVolver = 0;
  function volver() {
    clearTimeout(tVolver); mostrarGlobo(-1);
    const d = camara.position.clone().sub(controles.target); d.y = Math.hypot(d.x, d.z) * .13;
    viajar(d, distancia); controles.autoRotate = true;
  }
  function vista(nombre) {
    clearTimeout(tVolver);
    if (nombre === "giro") return volver();
    mostrarGlobo(-1);
    viajar(DIRS[nombre] || DIRS.trasera, distancia);
  }
  function enfocarMarca(i) {
    const m = marcas[i]; if (!m) return;
    /* Tocar otra vez el detalle abierto lo cierra y regresa a la vista completa */
    if (i === activa) return volver();
    alInteractuar();
    clearTimeout(tVolver);
    /* De adorno (portada) no hay botones para regresar: vuelve solo tras unos segundos */
    if (!interactivo) tVolver = setTimeout(volver, 5500);
    const dir = m.n.clone().multiplyScalar(1).add(new THREE.Vector3(0, .15, 0));
    if (Math.abs(m.n.z) < .5) dir.add(new THREE.Vector3(0, 0, .55)); /* lados: un poco de frente para ver el contexto */
    viajar(dir, distancia * .72, m.p.clone().multiplyScalar(.55));
    mostrarGlobo(i);
  }
  /* Solo escaneos: cambia cuál cara es la pantalla (voltear) o cuál lado va arriba (invertir), sin volver a descargar */
  function orientar(o) {
    if (!tel || !tel.escaneo) return;
    orientarEscaneo(tel.interior, tel.analisis, tel.escala, o);
    ponerMarcas(listaMarcas);
  }
  controles.addEventListener("start", () => { viaje = null; controles.autoRotate = false; alInteractuar(); });

  const tam = () => {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camara.aspect = w / h;
    camara.fov = w < h ? 42 : 32; camara.updateProjectionMatrix();
    /* Con «holgura», la distancia sale del tamaño del marco: el equipo entero cabe con aire alrededor, sea cual sea la proporción */
    if (holgura && tel) {
      ajustar(); controles.maxDistance = Math.max(tel.H * 3.4, distancia * 1.2);
      if (!viaje && activa < 0) camara.position.sub(controles.target).setLength(distancia).add(controles.target);
    }
  };
  function ajustar() {
    if (!holgura || !tel) return;
    const t = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    const alto = tel.H / 2 / t, ancho = Math.hypot(tel.W, tel.D) / 2 / (t * camara.aspect);
    distancia = Math.max(alto, ancho) * holgura + tel.D;
  }
  /* Portada: un clic en el fondo del escenario también cierra el detalle abierto */
  if (!interactivo) contenedor.addEventListener("click", e => { if (activa >= 0 && !e.target.closest(".marca-3d")) volver(); });
  const ro = new ResizeObserver(tam); ro.observe(contenedor); tam();

  const v = new THREE.Vector3(), haciaCam = new THREE.Vector3();
  let raf = 0;
  const reloj = new THREE.Clock();
  (function cuadro() {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(reloj.getDelta(), .05);
    if (viaje) {
      viaje.t = Math.min(1, viaje.t + dt / .9);
      const e = 1 - Math.pow(1 - viaje.t, 3), s = new THREE.Spherical(
        THREE.MathUtils.lerp(viaje.a.radius, viaje.b.radius, e), THREE.MathUtils.lerp(viaje.a.phi, viaje.b.phi, e), THREE.MathUtils.lerp(viaje.a.theta, viaje.b.theta, e));
      controles.target.lerpVectors(viaje.c0, viaje.c1, e);
      camara.position.setFromSpherical(s).add(controles.target);
      if (viaje.t >= 1) viaje = null;
    }
    controles.update();
    renderer.render(escena, camara);
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    for (const [i, m] of marcas.entries()) {
      v.copy(m.p).project(camara);
      haciaCam.copy(camara.position).sub(m.p).normalize();
      const visible = m.n.dot(haciaCam) > .05;
      const x = (v.x * .5 + .5) * w, y = (-v.y * .5 + .5) * h;
      m.punto.style.translate = `${x}px ${y}px`;
      m.punto.classList.toggle("oculta", !visible);
      if (i === activa && globo) { globo.style.left = x + "px"; globo.style.top = y + "px"; globo.style.opacity = visible ? 1 : 0; globo.classList.toggle("abajo", y < 130); }
    }
  })();

  function destruir() {
    destruido = true;
    clearTimeout(tVolver); cancelAnimationFrame(raf); ro.disconnect(); controles.dispose();
    escena.traverse(o => { o.geometry?.dispose(); const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; mats.forEach(mt => { for (const k of ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap"]) mt[k]?.dispose(); mt.dispose(); }); });
    entorno.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
    renderer.domElement.remove(); marcas.forEach(m => m.punto.remove()); globo?.remove();
  }

  /* «listo» se cumple cuando el equipo ya está en pantalla (al instante si es dibujado; al descargar si es escaneo) */
  const listo = producto.escaneo
    ? cargarEscaneo(producto, alProgreso).then(t => { if (destruido) { t.grupo.traverse(o => o.geometry?.dispose()); return; } montar(t); })
    : Promise.resolve().then(() => montar(construirTelefono(producto)));

  return { vista, enfocarMarca, ponerMarcas, orientar, destruir, listo, get esEscaneo() { return !!tel?.escaneo; } };
}
