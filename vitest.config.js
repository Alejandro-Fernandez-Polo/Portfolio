import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Sin esto, Vite se niega a importar como módulo ningún fichero de `public/`
  // («can only be referenced via <script src>»), y `app.js` y las features de
  // `/ugr` viven ahí. Desactivarlo aquí —y solo aquí, en la config de tests— hace
  // que el grafo ESM real de `/ugr` sea importable desde los tests; el build de
  // producción sigue usando `vite.config.js` y no se entera.
  publicDir: false,
  resolve: {
    alias: [
      // `app.js` importa dos módulos por su **ruta servida** (`/ugr/src/…`), que
      // en disco es `public/ugr/src/…`. El alias las resuelve para los tests sin
      // tocar el monolito.
      { find: /^\/ugr\//, replacement: fileURLToPath(new URL("./public/ugr/", import.meta.url)) },
    ],
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
    globals: false,
  },
});
