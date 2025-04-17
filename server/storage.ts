import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import { randomUUID } from "crypto";

// modify the interface to remove any database-related methods
export interface IStorage {
  // File system operations
  saveFileToStorage(filePath: string, buffer: Buffer): Promise<void>;
  getFileFromStorage(filename: string): Promise<Buffer>;
  deleteFileFromStorage(filename: string): Promise<void>;

  // Dummy method for file metadata handling (optional)
  getAllAudioFiles(): Promise<string[]>;
  getAudioFileByUuid(uuid: string): Promise<string | undefined>;
  deleteAudioFileByUuid(uuid: string): Promise<boolean>;
}

export class FileSystemStorage implements IStorage {
  private uploadDir: string;

  constructor() {
    // Create uploads directory if it doesn't exist
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
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

  // Optional dummy methods for handling file metadata (UUID-based)
  async getAllAudioFiles(): Promise<string[]> {
    // Just list all files in the uploads folder (you can change this to handle more metadata)
    const files = fs.readdirSync(this.uploadDir);
    return files;
  }

  async getAudioFileByUuid(uuid: string): Promise<string | undefined> {
    const file = fs.readdirSync(this.uploadDir).find(f => f.includes(uuid));
    return file;
  }

  async deleteAudioFileByUuid(uuid: string): Promise<boolean> {
    const file = fs.readdirSync(this.uploadDir).find(f => f.includes(uuid));
    if (file) {
      await this.deleteFileFromStorage(file);
      return true;
    }
    return false;
  }
}

export const storage = new FileSystemStorage();
