export type UploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type StoredMedia = {
  key: string;
  url: string;
};

export interface MediaStorageAdapter {
  put(file: UploadFile): Promise<StoredMedia>;
  get(key: string): Promise<NodeJS.ReadableStream>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
