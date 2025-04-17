import { audioFiles, type AudioFile, type InsertAudioFile, type User, type InsertUser, users } from "@shared/schema";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Audio file storage methods
  saveAudioFile(fileData: InsertAudioFile): Promise<AudioFile>;
  getAudioFile(id: number): Promise<AudioFile | undefined>;
  getAudioFileByUuid(uuid: string): Promise<AudioFile | undefined>;
  getAllAudioFiles(): Promise<AudioFile[]>;
  deleteAudioFile(id: number): Promise<boolean>;
  
  // File system operations
  saveFileToStorage(filePath: string, buffer: Buffer): Promise<void>;
  getFileFromStorage(filename: string): Promise<Buffer>;
  deleteFileFromStorage(filename: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private uploadDir: string;

  constructor() {
    // Create uploads directory if it doesn't exist
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Audio file methods
  async saveAudioFile(fileData: InsertAudioFile): Promise<AudioFile> {
    const [audioFile] = await db
      .insert(audioFiles)
      .values(fileData)
      .returning();
    return audioFile;
  }

  async getAudioFile(id: number): Promise<AudioFile | undefined> {
    const [audioFile] = await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.id, id));
    return audioFile || undefined;
  }

  async getAudioFileByUuid(uuid: string): Promise<AudioFile | undefined> {
    const [audioFile] = await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.uuid, uuid));
    return audioFile || undefined;
  }

  async getAllAudioFiles(): Promise<AudioFile[]> {
    const files = await db
      .select()
      .from(audioFiles)
      .orderBy(audioFiles.createdAt);
    return files.reverse(); // Most recent first
  }

  async deleteAudioFile(id: number): Promise<boolean> {
    const file = await this.getAudioFile(id);
    if (!file) return false;
    
    try {
      await this.deleteFileFromStorage(file.filename);
      await db.delete(audioFiles).where(eq(audioFiles.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  // File system operations
  async saveFileToStorage(filePath: string, buffer: Buffer): Promise<void> {
    const writeFile = util.promisify(fs.writeFile);
    const fullPath = path.join(this.uploadDir, filePath);
    await writeFile(fullPath, buffer);
  }

  async getFileFromStorage(filename: string): Promise<Buffer> {
    const readFile = util.promisify(fs.readFile);
    const filePath = path.join(this.uploadDir, filename);
    return readFile(filePath);
  }

  async deleteFileFromStorage(filename: string): Promise<void> {
    const unlink = util.promisify(fs.unlink);
    const filePath = path.join(this.uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
    }
  }
}

export const storage = new DatabaseStorage();
