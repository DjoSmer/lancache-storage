export interface StorageFileData {
    createdAt: Date;
    updatedAt: Date;
    downloadCount: number;
    targetId: number;
    basePath: string;
    status: StorageFileStatusEnum | 'noSave';
}

export interface StorageTarget {
    id: number;
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

export enum StorageFileStatusEnum {
    idle = 'idle',
    pending = 'pending',
    success = 'success',
    error = 'error',
}