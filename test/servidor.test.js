/* Pruebas del servidor: arrancan la app en un puerto libre, sin tocar los datos reales de solicitudes. */
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), os = require("os"), path = require("path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atlanta-"));
fs.copyFileSync(path.join(__dirname, "..", "data", "productos.json"), path.join(tmp, "productos.json"));
process.env.DATA_DIR = tmp;
process.env.WHATSAPP = "573001234567";
process.env.NODE_ENV = "test";
const { app, limpiarProducto } = require("../server");
let srv, base;
before(() => new Promise(r => { srv = app.listen(0, () => { base = `http://127.0.0.1:${srv.address().port}`; r(); }); }));
after(() => { srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
const post = (body, ip = "10.0.0.1") => fetch(base + "/api/solicitud", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": ip }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("la portada carga con cabeceras de seguridad", async () => {
  const r = await fetch(base + "/");
  assert.equal(r.status, 200);
  const csp = r.headers.get("content-security-policy");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'(;|$)/, "sin unsafe-inline en scripts");
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(r.headers.get("strict-transport-security"), /max-age=31536000/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-powered-by"), null);
  assert.match(r.headers.get("permissions-policy"), /camera=\(\)/);
});

test("la página no tiene scripts ni estilos en línea (los bloquearía la CSP)", () => {
  /* La tienda compilada (dist, la genera «npm run build» antes de las pruebas) y las páginas estáticas */
  for (const f of ["dist/index.html", "public/404.html", "public/privacidad.html", "public/admin.html"]) {
    const html = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, f + ": script en línea");
    assert.doesNotMatch(html, /\sstyle=/i, f + ": atributo style");
    assert.doesNotMatch(html, /\son[a-z]+=/i, f + ": evento en línea");
  }
});

test("el catálogo responde limpio y validado", async () => {
  const r = await fetch(base + "/api/productos");
  const lista = await r.json();
  assert.ok(lista.length >= 10);
  for (const p of lista) {
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.match(p.color.hex, /^#[0-9a-f]{6}$/i);
    if (p.estado === "nuevo") assert.equal(p.marcas.length, 0);
  }
  assert.ok(lista.some(p => p.estado === "usado" && p.modelo && p.marcas.length), "hay seminuevos con marcas 3D");
});

test("un producto con datos peligrosos se descarta o se limpia", () => {
  assert.equal(limpiarProducto({ id: "../x", nombre: "a", familia: "iphone", estado: "nuevo", precio: 1 }), null);
  assert.equal(limpiarProducto({ id: "ok", nombre: "a", familia: "otra", estado: "nuevo", precio: 1 }), null);
  const p = limpiarProducto({ id: "ok", nombre: "x".repeat(500), familia: "iphone", estado: "nuevo", precio: 10, color: { hex: "red;}" }, marcas: [{ cara: "trasera", u: .5, v: .5, texto: "no" }] });
  assert.equal(p.nombre.length, 120);
  assert.equal(p.color.hex, "#cccccc");
  assert.equal(p.marcas.length, 0, "los nuevos no llevan marcas");
  const u = limpiarProducto({ id: "usado-1", nombre: "u", familia: "iphone", estado: "usado", precio: 10, modelo: { alto: 147, ancho: 71 }, marcas: [{ cara: "techo", u: .5, v: .5, texto: "x" }, { cara: "frontal", u: 2, v: .5, texto: "x" }, { cara: "frontal", u: .1, v: .2, texto: "bien" }] });
  assert.deepEqual(u.marcas, [{ cara: "frontal", u: .1, v: .2, texto: "bien" }]);
});

test("config entrega el WhatsApp configurado", async () => {
  const c = await (await fetch(base + "/api/config")).json();
  assert.equal(c.whatsapp, "573001234567");
});

test("solicitudes: valida, guarda y rechaza bots", async () => {
  assert.equal((await post({ tipo: "credito", nombre: "Ana", telefono: "3001234567", equipo: "iPhone 15" })).status, 201);
  assert.equal((await post({ tipo: "hackeo", nombre: "Ana", telefono: "3001234567" }, "10.0.0.2")).status, 400);
  assert.equal((await post({ tipo: "usado", nombre: "<script>", telefono: "3001234567" }, "10.0.0.2")).status, 400);
  assert.equal((await post({ tipo: "usado", nombre: "Ana", telefono: "12" }, "10.0.0.2")).status, 400);
  assert.equal((await post({ tipo: "usado", nombre: "Ana", telefono: "3001234567", web: "spam.com" }, "10.0.0.2")).status, 400);
  const json = await post("{malo", "10.0.0.3");
  assert.equal(json.status, 400);
  assert.doesNotMatch(await json.text(), /SyntaxError|at /, "no revela detalles internos");
  const lineas = fs.readFileSync(path.join(tmp, "solicitudes.jsonl"), "utf8").trim().split("\n");
  assert.equal(lineas.length, 1);
  assert.equal(JSON.parse(lineas[0]).nombre, "Ana");
});

test("solicitudes: límite por IP", async () => {
  let ultimo;
  for (let i = 0; i < 8; i++) ultimo = await post({ tipo: "credito", nombre: "Ana", telefono: "3001234567" }, "10.9.9.9");
  assert.equal(ultimo.status, 429);
});

test("cuerpo demasiado grande se rechaza", async () => {
  const r = await post({ tipo: "credito", nombre: "Ana", telefono: "3001234567", detalle: "x".repeat(20000) }, "10.0.0.4");
  assert.equal(r.status, 413);
});

test("404, robots y archivos privados", async () => {
  assert.equal((await fetch(base + "/no-existe")).status, 404);
  assert.equal((await fetch(base + "/api/nada")).status, 404);
  for (const f of ["/server.js", "/package.json", "/data/productos.json", "/.env", "/../server.js"]) assert.equal((await fetch(base + f)).status, 404, f);
  assert.match(await (await fetch(base + "/robots.txt")).text(), /Disallow: \/api\//);
});
