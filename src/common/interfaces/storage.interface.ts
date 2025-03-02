export interface StorageService {
  upload(file: Express.Multer.File, tenantId?: string): Promise<string>;
  delete(filename: string, tenantId?: string): Promise<void>;
  get(filename: string, tenantId?: string): Promise<Buffer>;
  list?(): Promise<string[]>; // Optional
}