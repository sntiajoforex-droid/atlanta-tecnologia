/* Crea un usuario del panel o le cambia la contraseña (eso cierra sus sesiones abiertas).
   Uso:  npm run usuario -- nombre dueno|empleado
         npm run usuario -- nombre --borrar
   La contraseña se genera al azar y se muestra una sola vez. */
const fs = require("fs");
const crypto = require("crypto");
try { process.loadEnvFile && fs.existsSync(".env") && process.loadEnvFile(".env"); } catch (e) { /* sin .env */ }
process.env.NODE_ENV = "test"; /* evita el aviso de SESSION_SECRET */
const { hashClave, USUARIOS } = require("../admin");

const [nombreCrudo, rol] = process.argv.slice(2), nombre = String(nombreCrudo || "").toLowerCase();
if (!/^[a-z0-9._-]{3,40}$/.test(nombre) || !["dueno", "empleado", "--borrar"].includes(rol)) {
  console.log("Uso: npm run usuario -- nombre dueno|empleado   (o --borrar)"); process.exit(1);
}
let usuarios = {};
try { usuarios = JSON.parse(fs.readFileSync(USUARIOS, "utf8")); } catch { /* primero */ }
if (rol === "--borrar") {
  delete usuarios[nombre];
  fs.writeFileSync(USUARIOS, JSON.stringify(usuarios, null, 2));
  console.log(`Usuario «${nombre}» eliminado.`); process.exit(0);
}
const clave = crypto.randomBytes(12).toString("base64url");
usuarios[nombre] = { rol, clave: hashClave(clave), version: ((usuarios[nombre] && usuarios[nombre].version) || 0) + 1 };
fs.writeFileSync(USUARIOS, JSON.stringify(usuarios, null, 2), { mode: 0o600 });
console.log(`Usuario «${nombre}» (${rol}) listo.\nContraseña: ${clave}\nGuárdala ahora: no se vuelve a mostrar.`);
