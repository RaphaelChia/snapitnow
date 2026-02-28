export interface UploadParams {
  bucket: string
  objectKey: string
  data: Buffer | Blob
  contentType: string
}

export interface StorageService {
  upload(params: UploadParams): Promise<{ objectKey: string }>
  download(bucket: string, objectKey: string): Promise<Buffer>
  getSignedUrl(bucket: string, objectKey: string, expiresIn?: number): Promise<string>
  delete(bucket: string, objectKey: string): Promise<void>
  deleteMany(bucket: string, objectKeys: string[]): Promise<void>
}

export const BUCKET = "snapitnow-photos" as const
