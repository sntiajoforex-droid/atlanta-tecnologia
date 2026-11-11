/* Pruebas del panel: sesión, roles, CSRF, bloqueo por intentos y guardado del catálogo con respaldo. */
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), os = require("os"), path = require("path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atlanta-panel-"));
fs.copyFileSync(path.join(__dirname, "..", "data", "productos.json"), path.join(tmp, "productos.json"));
process.env.DATA_DIR = tmp;
process.env.NODE_ENV = "test";
const { hashClave } = require("../admin");
const USU = path.join(tmp, "usuarios.json");
const ponerUsuario = (nombre, rol, clave, version = 1) => {
  const u = fs.existsSync(USU) ? JSON.parse(fs.readFileSync(USU, "utf8")) : {};
  u[nombre] = { rol, clave: hashClave(clave), version };
  fs.writeFileSync(USU, JSON.stringify(u));
};
ponerUsuario("dueno1", "dueno", "clave-del-dueno");
ponerUsuario("emple1", "empleado", "clave-del-empleado");
const { app } = require("../server");
let srv, base;
before(() => new Promise(r => { srv = app.listen(0, () => { base = `http://127.0.0.1:${srv.address().port}`; r(); }); }));
after(() => { srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const pedir = (metodo, url, { cuerpo, cookie, csrf = true, ip = "10.1.0.1" } = {}) => fetch(base + "/api/admin" + url, { method: metodo,
  headers: { "Content-Type": "application/json", "X-Forwarded-For": ip, ...(csrf ? { "X-Atlanta": "1" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined });
const entrar = async (usuario, clave, ip) => {
  const r = await pedir("POST", "/login", { cuerpo: { usuario, clave }, ip });
  return { r, cookie: (r.headers.get("set-cookie") || "").split(";")[0] };
};
const usado = { nombre: "iPhone 12 de prueba", familia: "iphone", estado: "usado", precio: 1200000, capacidad: "128 GB", color: { nombre: "Azul", hex: "#223344" },
  grado: "B", bateria: 81, stock: 1, modelo: { alto: 146.7, ancho: 71.5, grosor: 7.4, modulo: "cuadro", lentes: 2 },
  marcas: [{ cara: "trasera", u: .3, v: .4, texto: "Rayón leve" }] };

test("la página del panel no se indexa", async () => {
  const r = await fetch(base + "/admin");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("x-robots-tag"), /noindex/);
  assert.match(await r.text(), /<meta name="robots" content="noindex/);
});

test("sin sesión no hay acceso", async () => {
  assert.equal((await pedir("GET", "/productos")).status, 401);
  assert.equal((await pedir("GET", "/yo", { cookie: "atl_sesion=falsa.firma" })).status, 401);
});

test("una cookie alterada no sirve", async () => {
  const { cookie } = await entrar("emple1", "clave-del-empleado", "10.1.0.2");
  const [nombre, valor] = cookie.split("="), [cuerpo, firma] = valor.split(".");
  assert.equal((await pedir("GET", "/yo", { cookie })).status, 200);
  const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString()); datos.r = "dueno"; datos.u = "dueno1";
  assert.equal((await pedir("GET", "/yo", { cookie: `${nombre}=${Buffer.from(JSON.stringify(datos)).toString("base64url")}.${firma}` })).status, 401);
});

test("la cookie es HttpOnly y SameSite=Strict", async () => {
  const { r } = await entrar("dueno1", "clave-del-dueno", "10.1.0.3");
  assert.equal(r.status, 200);
  const c = r.headers.get("set-cookie");
  assert.match(c, /HttpOnly/); assert.match(c, /SameSite=Strict/);
});

test("sin la cabecera del panel no se puede cambiar nada (CSRF)", async () => {
  const { cookie } = await entrar("dueno1", "clave-del-dueno", "10.1.0.5");
  assert.equal((await pedir("POST", "/productos", { cookie, cuerpo: usado, csrf: false })).status, 403);
  assert.equal((await pedir("POST", "/login", { cuerpo: { usuario: "dueno1", clave: "clave-del-dueno" }, csrf: false })).status, 403);
});

test("el dueño crea, edita, oculta y elimina; queda respaldo y registro", async () => {
  const { cookie } = await entrar("dueno1", "clave-del-dueno", "10.1.0.6");
  const r = await pedir("POST", "/productos", { cookie, cuerpo: { ...usado, id: "../../hack" } });
  assert.equal(r.status, 201);
  const p = await r.json();
  assert.match(p.id, /^iphone-12-de-prueba-128-gb-azul-[0-9a-f]{6}$/, "el id lo pone el servidor");
  assert.equal(p.marcas.length, 1);
  assert.equal((await pedir("PUT", `/productos/${p.id}`, { cookie, cuerpo: { ...usado, precio: 0 } })).status, 400);
  const e = await (await pedir("PUT", `/productos/${p.id}`, { cookie, cuerpo: { ...usado, precio: 1100000 } })).json();
  assert.equal(e.precio, 1100000);
  await pedir("PATCH", `/productos/${p.id}`, { cookie, cuerpo: { oculto: true } });
  const publico = await (await fetch(base + "/api/productos")).json();
  assert.ok(!publico.some(x => x.id === p.id), "un producto oculto no sale en la tienda");
  assert.ok(publico.every(x => !("oculto" in x)));
  assert.equal((await pedir("DELETE", `/productos/${p.id}`, { cookie })).status, 200);
  assert.ok(fs.readdirSync(path.join(tmp, "respaldos")).length >= 3);
  await new Promise(r => setTimeout(r, 50));
  const reg = await (await pedir("GET", "/registro", { cookie })).json();
  assert.deepEqual(reg.slice(0, 4).map(x => x.accion), ["eliminó", "cambió", "editó", "creó"]);
});

test("el empleado solo cambia existencias", async () => {
  const s = (await entrar("emple1", "clave-del-empleado", "10.1.0.7")).cookie;
  const lista = await (await pedir("GET", "/productos", { cookie: s })).json();
  const id = lista[0].id;
  assert.equal((await pedir("PATCH", `/productos/${id}`, { cookie: s, cuerpo: { stock: 7 } })).status, 200);
  assert.equal((await pedir("PATCH", `/productos/${id}`, { cookie: s, cuerpo: { stock: -1 } })).status, 400);
  assert.equal((await pedir("PATCH", `/productos/${id}`, { cookie: s, cuerpo: { oculto: true } })).status, 403);
  assert.equal((await pedir("PUT", `/productos/${id}`, { cookie: s, cuerpo: usado })).status, 403);
  assert.equal((await pedir("DELETE", `/productos/${id}`, { cookie: s })).status, 403);
  assert.equal((await pedir("GET", "/registro", { cookie: s })).status, 403);
});

test("solicitudes: llegan con id y se marcan atendidas", async () => {
  const r = await fetch(base + "/api/solicitud", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.2.0.1" },
    body: JSON.stringify({ tipo: "usado", nombre: "Luis", telefono: "3009998877", equipo: "iPhone 11" }) });
  assert.equal(r.status, 201);
  const s = (await entrar("dueno1", "clave-del-dueno", "10.1.0.10")).cookie;
  const [sol] = await (await pedir("GET", "/solicitudes", { cookie: s })).json();
  assert.equal(sol.nombre, "Luis"); assert.equal(sol.atendida, false);
  assert.equal((await pedir("PATCH", `/solicitudes/${sol.id}`, { cookie: s, cuerpo: { atendida: true } })).status, 200);
  assert.equal((await (await pedir("GET", "/solicitudes", { cookie: s })).json())[0].atendida, true);
  assert.equal((await pedir("PATCH", "/solicitudes/..%2f..%2fx", { cookie: s, cuerpo: { atendida: true } })).status, 400);
});

test("cambiar la contraseña (versión) cierra las sesiones abiertas", async () => {
  const s = (await entrar("dueno1", "clave-del-dueno", "10.1.0.9")).cookie;
  ponerUsuario("dueno1", "dueno", "clave-nueva", 2);
  assert.equal((await pedir("GET", "/yo", { cookie: s })).status, 401);
});

test("contraseña incorrecta y bloqueo tras varios intentos", async () => {
  assert.equal((await entrar("dueno1", "mala", "10.1.0.4")).r.status, 401);
  assert.equal((await entrar("nadie", "x", "10.1.0.4")).r.status, 401, "mismo mensaje si el usuario no existe");
  for (let i = 0; i < 8; i++) assert.equal((await entrar("emple1", "mala", "10.1.0." + (50 + i))).r.status, 401);
  /* tras 8 fallos, ni la contraseña correcta entra, aunque cambie de IP */
  assert.equal((await entrar("emple1", "clave-del-empleado", "10.1.0.99")).r.status, 429);
});

test("fotos: se validan por contenido, se sirven seguras y se borran con el producto", async () => {
  ponerUsuario("dueno9", "dueno", "clave-9"); ponerUsuario("emple9", "empleado", "clave-e9");
  const s = (await entrar("dueno9", "clave-9", "10.3.0.1")).cookie, e = (await entrar("emple9", "clave-e9", "10.3.0.2")).cookie;
  const p = await (await pedir("POST", "/productos", { cookie: s, cuerpo: usado })).json();
  const subir = (cuerpo, cookie = s, tipo = "image/png", csrf = true) => fetch(`${base}/api/admin/productos/${p.id}/fotos`, { method: "POST",
    headers: { "Content-Type": tipo, Cookie: cookie, "X-Forwarded-For": "10.3.0.3", ...(csrf ? { "X-Atlanta": "1" } : {}) }, body: cuerpo });
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);

  assert.equal((await subir(Buffer.from("<script>alert(1)</script>"), s, "image/png")).status, 415, "un archivo que dice ser PNG pero no lo es");
  assert.equal((await subir(Buffer.from("<svg onload=alert(1)>"), s, "image/svg+xml")).status, 415, "SVG no se acepta");
  assert.equal((await subir(png, e)).status, 403, "el empleado no sube fotos");
  assert.equal((await subir(png, s, "image/png", false)).status, 403, "sin cabecera del panel");
  assert.equal((await subir(Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]))).status, 413, "más de 4 MB");

  let r = await subir(png); assert.equal(r.status, 201);
  r = await subir(jpg, s, "text/plain"); assert.equal(r.status, 201, "manda el contenido, no el tipo que diga el navegador");
  const conFotos = await r.json();
  assert.equal(conFotos.fotos.length, 2);
  assert.match(conFotos.fotos[0], new RegExp(`^${p.id}-[0-9a-f]{12}\.png$`));
  assert.match(conFotos.fotos[1], /\.jpg$/);

  const f = await fetch(`${base}/fotos/${conFotos.fotos[0]}`);
  assert.equal(f.status, 200);
  assert.equal(f.headers.get("content-type"), "image/png");
  assert.equal(f.headers.get("x-content-type-options"), "nosniff");
  assert.match(f.headers.get("cache-control"), /immutable/);
  for (const malo of ["/fotos/..%2fusuarios.json", "/fotos/../usuarios.json", "/fotos/%2e%2e/usuarios.json"]) assert.notEqual((await fetch(base + malo)).status, 200, malo);

  const publico = (await (await fetch(base + "/api/productos")).json()).find(x => x.id === p.id);
  assert.deepEqual(publico.fotos, conFotos.fotos);

  for (let i = 0; i < 4; i++) await subir(png);
  assert.equal((await subir(png)).status, 400, "máximo 6 fotos");

  /* Reordenar y quitar: nombres ajenos o con rutas se ignoran, y la foto quitada se borra del disco */
  const [a, b] = conFotos.fotos;
  const editado = await (await pedir("PUT", `/productos/${p.id}`, { cookie: s, cuerpo: { ...usado, fotos: [b, "../usuarios.json", "otro-0123456789ab.png", `${p.id}-ffffffffffff.png`] } })).json();
  assert.deepEqual(editado.fotos, [b]);
  assert.ok(!fs.existsSync(path.join(tmp, "fotos", a)), "la foto quitada se borró");
  assert.equal(fs.readdirSync(path.join(tmp, "fotos")).filter(x => x.startsWith(p.id)).length, 1);

  await pedir("DELETE", `/productos/${p.id}`, { cookie: s });
  assert.equal(fs.readdirSync(path.join(tmp, "fotos")).filter(x => x.startsWith(p.id)).length, 0, "al eliminar el producto se van sus fotos");
});
