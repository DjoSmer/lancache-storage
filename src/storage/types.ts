// interface FilePart {
//     filepath: string;
//     headers: Record<string, string | ReadonlyArray<string>>
//     status: 'idle' | 'pending' | 'success' | 'error'
//     downloadCount: number;
// }

export interface StorageFileData {
    createdAt: Date;
    updatedAt: Date;
    downloadCount: number;
    basePath: string;
    //dir: string;
    // filepath: string;
    headers: Record<string, string | ReadonlyArray<string>>
    status: 'idle' | 'pending' | 'success' | 'error'
    //parts: Record<string, FilePart>;
}

