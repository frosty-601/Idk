// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import * as fs from "fs";
import * as path from "path";
import * as util from "util";
var FileSystemStorage = class {
  uploadDir;
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }
  // File system operations
  async saveFileToStorage(filePath, buffer) {
    const writeFile2 = util.promisify(fs.writeFile);
    const fullPath = path.join(this.uploadDir, filePath);
    await writeFile2(fullPath, buffer);
  }
  async getFileFromStorage(filename) {
    const readFile2 = util.promisify(fs.readFile);
    const filePath = path.join(this.uploadDir, filename);
    return readFile2(filePath);
  }
  async deleteFileFromStorage(filename) {
    const unlink2 = util.promisify(fs.unlink);
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      await unlink2(filePath);
    }
  }
  // Optional dummy methods for handling file metadata (UUID-based)
  async getAllAudioFiles() {
    const files = fs.readdirSync(this.uploadDir);
    return files;
  }
  async getAudioFileByUuid(uuid) {
    const file = fs.readdirSync(this.uploadDir).find((f) => f.includes(uuid));
    return file;
  }
  async deleteAudioFileByUuid(uuid) {
    const file = fs.readdirSync(this.uploadDir).find((f) => f.includes(uuid));
    if (file) {
      await this.deleteFileFromStorage(file);
      return true;
    }
    return false;
  }
};
var storage = new FileSystemStorage();

// server/routes.ts
import multer from "multer";
import path2 from "path";
import { randomUUID } from "crypto";
import { audioFileInfoSchema, insertAudioFileSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
    // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  }
});
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
async function registerRoutes(app2) {
  app2.post("/api/audio/upload", upload.single("audioFile"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const fileUuid = randomUUID();
      const fileExt = path2.extname(file.originalname);
      const filename = `${fileUuid}${fileExt}`;
      await storage.saveFileToStorage(filename, file.buffer);
      const fileData = insertAudioFileSchema.parse({
        filename,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uuid: fileUuid
      });
      const savedFile = await storage.saveAudioFile(fileData);
      const baseUrl = req.protocol + "://" + req.get("host");
      const downloadUrl = `${baseUrl}/api/audio/download/${fileUuid}`;
      return res.status(201).json({
        ...savedFile,
        createdAt: savedFile.createdAt.toISOString(),
        downloadUrl,
        formattedSize: formatFileSize(savedFile.fileSize)
      });
    } catch (error) {
      console.error("Upload error:", error);
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });
  app2.get("/api/audio/download/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      const file = await storage.getAudioFileByUuid(uuid);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      const fileBuffer = await storage.getFileFromStorage(file.filename);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.originalFilename}"`);
      res.setHeader("Content-Length", fileBuffer.length);
      return res.send(fileBuffer);
    } catch (error) {
      console.error("Download error:", error);
      return res.status(500).json({ message: error.message || "Failed to download file" });
    }
  });
  app2.get("/api/audio/files", async (req, res) => {
    try {
      const files = await storage.getAllAudioFiles();
      const baseUrl = req.protocol + "://" + req.get("host");
      const filesWithUrls = files.map((file) => {
        const downloadUrl = `${baseUrl}/api/audio/download/${file.uuid}`;
        return audioFileInfoSchema.parse({
          ...file,
          createdAt: file.createdAt.toISOString(),
          downloadUrl
        });
      });
      return res.json(filesWithUrls);
    } catch (error) {
      console.error("Get files error:", error);
      return res.status(500).json({ message: error.message || "Failed to get files" });
    }
  });
  app2.get("/api/audio/file/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      const file = await storage.getAudioFileByUuid(uuid);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      const baseUrl = req.protocol + "://" + req.get("host");
      const downloadUrl = `${baseUrl}/api/audio/download/${file.uuid}`;
      return res.json(audioFileInfoSchema.parse({
        ...file,
        createdAt: file.createdAt.toISOString(),
        downloadUrl
      }));
    } catch (error) {
      console.error("Get file error:", error);
      return res.status(500).json({ message: error.message || "Failed to get file" });
    }
  });
  app2.delete("/api/audio/files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      const deleted = await storage.deleteAudioFile(id);
      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }
      return res.status(204).end();
    } catch (error) {
      console.error("Delete error:", error);
      return res.status(500).json({ message: error.message || "Failed to delete file" });
    }
  });
  app2.get("/api/audio/stream/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      const file = await storage.getAudioFileByUuid(uuid);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      const fileBuffer = await storage.getFileFromStorage(file.filename);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", fileBuffer.length);
      res.setHeader("Accept-Ranges", "bytes");
      return res.send(fileBuffer);
    } catch (error) {
      console.error("Stream error:", error);
      return res.status(500).json({ message: error.message || "Failed to stream file" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  base: "/AudioLink",
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
