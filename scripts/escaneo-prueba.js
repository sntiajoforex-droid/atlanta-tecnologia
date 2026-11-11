/* Genera un escaneo de prueba (.glb): un teléfono con módulo de cámara, en metros, acostado y girado como lo dejaría una app de escaneo.
   Sirve para probar el panel sin escanear un equipo real. Uso: node scripts/escaneo-prueba.js prueba.glb [giroX°] [giroY°] */
const fs = require("fs");
const pos = [], col = [], nor = [], idx = [];
function caja(cx, cy, cz, w, h, d, colores) {
  /* 6 caras, cada una en una cuadrícula div×div */
  const caras = [
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], c: colores.frente },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], c: colores.atras },
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], c: colores.lado },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], c: colores.lado },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], c: colores.lado },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], c: colores.lado }];
  const half = [w / 2, h / 2, d / 2];
  for (const f of caras) {
    const base = pos.length / 3;
    const ext = k => Math.abs(f.u[k]) * half[k] + Math.abs(f.v[k]) * half[k];
    /* Cuadrícula proporcional al tamaño de la cara (como un escaneo real: vértices repartidos por área) */
    const lu = 2 * [0, 1, 2].reduce((s, k) => s + Math.abs(f.u[k]) * half[k], 0), lv = 2 * [0, 1, 2].reduce((s, k) => s + Math.abs(f.v[k]) * half[k], 0);
    const du = Math.max(1, Math.round(lu / .002)), dv = Math.max(1, Math.round(lv / .002));
    for (let i = 0; i <= du; i++) for (let j = 0; j <= dv; j++) {
      const a = i / du * 2 - 1, b = j / dv * 2 - 1, p = [];
      for (let k = 0; k < 3; k++) p.push([cx, cy, cz][k] + f.n[k] * half[k] + f.u[k] * a * half[k] + f.v[k] * b * half[k]);
      pos.push(...p); nor.push(...f.n); col.push(...f.c);
    }
    for (let i = 0; i < du; i++) for (let j = 0; j < dv; j++) {
      const q = base + i * (dv + 1) + j;
      idx.push(q, q + dv + 1, q + 1, q + 1, q + dv + 1, q + dv + 2);
    }
  }
}
const W = .0715, H = .1476, D = .0078;
caja(0, 0, 0, W, H, D, { frente: [.02, .02, .03], atras: [.15, .3, .7], lado: [.6, .6, .65] });
/* Módulo de cámara: atrás, arriba, del lado +X (izquierda vista desde atrás) */
caja(W / 2 - .006 - .0135, H / 2 - .006 - .0135, -D / 2 - .0008, .027, .027, .0016, { frente: [.2, .2, .22], atras: [.2, .2, .22], lado: [.2, .2, .22] });

/* Acostado (pantalla hacia arriba = +Y) y girado 30° sobre la mesa, desplazado */
const rx = +(process.argv[3] ?? -90) * Math.PI / 180, ry = +(process.argv[4] ?? 30) * Math.PI / 180;
for (let i = 0; i < pos.length; i += 3) {
  for (const arr of [pos, nor]) {
    let [x, y, z] = arr.slice(i, i + 3);
    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    if (arr === pos) { x += .3; y += .05; z -= .2; }
    arr[i] = x; arr[i + 1] = y; arr[i + 2] = z;
  }
}
const f32 = a => Buffer.from(new Float32Array(a).buffer), u32 = Buffer.from(new Uint32Array(idx).buffer);
const bP = f32(pos), bN = f32(nor), bC = f32(col);
const bin = Buffer.concat([bP, bN, bC, u32]);
const mn = [0, 1, 2].map(k => Math.min(...pos.filter((_, i) => i % 3 === k))), mx = [0, 1, 2].map(k => Math.max(...pos.filter((_, i) => i % 3 === k)));
const json = {
  asset: { version: "2.0", generator: "prueba atlanta" },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: .5 } }],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: bP.length, target: 34962 },
    { buffer: 0, byteOffset: bP.length, byteLength: bN.length, target: 34962 },
    { buffer: 0, byteOffset: bP.length + bN.length, byteLength: bC.length, target: 34962 },
    { buffer: 0, byteOffset: bP.length + bN.length + bC.length, byteLength: u32.length, target: 34963 }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: pos.length / 3, type: "VEC3", min: mn, max: mx },
    { bufferView: 1, componentType: 5126, count: nor.length / 3, type: "VEC3" },
    { bufferView: 2, componentType: 5126, count: col.length / 3, type: "VEC3" },
    { bufferView: 3, componentType: 5125, count: idx.length, type: "SCALAR" }]
};
const pad = (b, c) => Buffer.concat([b, Buffer.alloc((4 - b.length % 4) % 4, c)]);
const J = pad(Buffer.from(JSON.stringify(json)), 0x20), B = pad(bin, 0);
const head = Buffer.alloc(12); head.write("glTF", 0, "latin1"); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + J.length + 8 + B.length, 8);
const ch = (len, tipo) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(tipo, 4); return b; };
fs.writeFileSync(process.argv[2], Buffer.concat([head, ch(J.length, 0x4e4f534a), J, ch(B.length, 0x004e4942), B]));
console.log("ok", process.argv[2], (12 + 16 + J.length + B.length) + " bytes");
