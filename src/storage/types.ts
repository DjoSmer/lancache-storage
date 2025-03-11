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

export interface StorageTarget {
    code: string;
    userAgent?: string;
    host?: string;
    https?: boolean;
}

export interface StorageTargetProps {
    host?: string;
    userAgent?: string;
    url?: string;
}