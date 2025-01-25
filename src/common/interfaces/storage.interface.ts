export interface StorageService {
  upload(file: Express.Multer.File): Promise<string>;
  delete(filename: string): Promise<void>;
  get(filename: string): Promise<Buffer>;
  list?(): Promise<string[]>; // Optional
}