import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { audioFileInfoSchema, insertAudioFileSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept audio files
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload audio file
  app.post("/api/audio/upload", upload.single("audioFile"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate unique filename
      const fileUuid = randomUUID();
      const fileExt = path.extname(file.originalname);
      const filename = `${fileUuid}${fileExt}`;

      // Save file to storage
      await storage.saveFileToStorage(filename, file.buffer);

      // Create file entry in database
      const fileData = insertAudioFileSchema.parse({
        filename,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uuid: fileUuid,
      });

      const savedFile = await storage.saveAudioFile(fileData);

      // Generate download URL
      const baseUrl = req.protocol + "://" + req.get("host");
      const downloadUrl = `${baseUrl}/api/audio/download/${fileUuid}`;

      // Return file info
      return res.status(201).json({
        ...savedFile,
        createdAt: savedFile.createdAt.toISOString(),
        downloadUrl,
        formattedSize: formatFileSize(savedFile.fileSize),
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  // Download audio file
  app.get("/api/audio/download/:uuid", async (req, res) => {
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
    } catch (error: any) {
      console.error("Download error:", error);
      return res.status(500).json({ message: error.message || "Failed to download file" });
    }
  });

  // Get all audio files
  app.get("/api/audio/files", async (req, res) => {
    try {
      const files = await storage.getAllAudioFiles();
      const baseUrl = req.protocol + "://" + req.get("host");
      
      const filesWithUrls = files.map(file => {
        const downloadUrl = `${baseUrl}/api/audio/download/${file.uuid}`;
        return audioFileInfoSchema.parse({
          ...file,
          createdAt: file.createdAt.toISOString(),
          downloadUrl,
        });
      });
      
      return res.json(filesWithUrls);
    } catch (error: any) {
      console.error("Get files error:", error);
      return res.status(500).json({ message: error.message || "Failed to get files" });
    }
  });
  
  // Get single audio file by UUID
  app.get("/api/audio/file/:uuid", async (req, res) => {
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
        downloadUrl,
      }));
    } catch (error: any) {
      console.error("Get file error:", error);
      return res.status(500).json({ message: error.message || "Failed to get file" });
    }
  });

  // Delete audio file
  app.delete("/api/audio/files/:id", async (req, res) => {
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
    } catch (error: any) {
      console.error("Delete error:", error);
      return res.status(500).json({ message: error.message || "Failed to delete file" });
    }
  });

  // Stream audio file
  app.get("/api/audio/stream/:uuid", async (req, res) => {
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
    } catch (error: any) {
      console.error("Stream error:", error);
      return res.status(500).json({ message: error.message || "Failed to stream file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
