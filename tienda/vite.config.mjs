/* Tienda en React (Vite). Compila a /dist, que sirve server.js.
   En desarrollo (npm run dev:tienda) las rutas del servidor se piden al Express en el puerto 3000. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL(".", import.meta.url));
const servidor = "http://localhost:3000";

export default defineConfig({
  root: raiz,
  plugins: [react()],
  build: { outDir: fileURLToPath(new URL("../dist", import.meta.url)), emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0 },
  server: { proxy: Object.fromEntries(["/api", "/js", "/vendor", "/fotos", "/modelos3d", "/img", "/privacidad.html"].map(r => [r, servidor])) }
});
