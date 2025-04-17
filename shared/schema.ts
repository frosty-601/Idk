import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uuid: text("uuid").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAudioFileSchema = createInsertSchema(audioFiles).omit({
  id: true,
  createdAt: true,
});

// Return type for file info with download URL
export const audioFileInfoSchema = z.object({
  id: z.number(),
  filename: z.string(),
  originalFilename: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  uuid: z.string(),
  createdAt: z.string(),
  downloadUrl: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
export type AudioFile = typeof audioFiles.$inferSelect;
export type AudioFileInfo = z.infer<typeof audioFileInfoSchema>;
