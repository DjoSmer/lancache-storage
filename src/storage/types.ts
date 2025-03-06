export interface StorageFileData {
    createdAt: Date;
    updatedAt: Date;
    downloadCount: number;
    target: string;
    basePath: string;
    headers: Record<string, string | ReadonlyArray<string>>;
    status: 'idle' | 'pending' | 'success' | 'error';
}

export interface StorageEntity extends Omit<StorageFileData, 'headers'> {
    id: number;
    headers: string;
}
