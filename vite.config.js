import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import fs from "fs"

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
}

function ugrStatic(rootDir) {
  return {
    name: "ugr-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/ugr")) return next()
        let filePath =
          req.url === "/ugr" || req.url === "/ugr/"
            ? "/ugr/index.html"
            : req.url
        const fullPath = path.join(__dirname, rootDir, filePath)
        fs.readFile(fullPath, (err, data) => {
          if (err) return next()
          res.setHeader(
            "Content-Type",
            MIME[path.extname(fullPath)] || "application/octet-stream",
          )
          res.end(data)
        })
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/ugr")) return next()
        let filePath =
          req.url === "/ugr" || req.url === "/ugr/"
            ? "/ugr/index.html"
            : req.url
        const fullPath = path.join(__dirname, rootDir, filePath)
        fs.readFile(fullPath, (err, data) => {
          if (err) return next()
          res.setHeader(
            "Content-Type",
            MIME[path.extname(fullPath)] || "application/octet-stream",
          )
          res.end(data)
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), ugrStatic("public")],
})
