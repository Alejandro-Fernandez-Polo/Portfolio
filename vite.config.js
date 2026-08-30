import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import fs from "fs"

export default defineConfig({
  plugins: [
    react(),
    {
      name: "ugr-page",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.match(/^\/ugr\/?$/)) {
            req.url = "/ugr/index.html"
          }
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.match(/^\/ugr\/?$/)) {
            req.url = "/ugr/index.html"
          }
          next()
        })
      },
    },
  ],
})
