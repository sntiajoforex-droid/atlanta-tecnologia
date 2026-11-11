/* Copia three.js a public/vendor y cambia las importaciones «from 'three'» por rutas locales.
   Así la página no necesita un importmap en línea y la CSP puede quedar en script-src 'self'. */
const fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, ".."), three = path.join(raiz, "node_modules", "three"), dest = path.join(raiz, "public", "vendor");
fs.mkdirSync(dest, { recursive: true });
for (const f of ["three.module.js", "three.core.js"]) fs.copyFileSync(path.join(three, "build", f), path.join(dest, f));
/* GLTFLoader (escaneos reales) importa sus utilidades con «../utils/»: todo queda plano en la misma carpeta */
for (const f of ["controls/OrbitControls.js", "geometries/RoundedBoxGeometry.js", "environments/RoomEnvironment.js", "loaders/GLTFLoader.js", "utils/BufferGeometryUtils.js", "utils/SkeletonUtils.js"]) {
  const src = fs.readFileSync(path.join(three, "examples", "jsm", f), "utf8").replace(/from\s+['"]three['"]/g, "from './three.module.js'").replace(/from\s+['"]\.\.\/utils\//g, "from './");
  fs.writeFileSync(path.join(dest, path.basename(f)), src);
}
console.log("three.js copiado a public/vendor");
