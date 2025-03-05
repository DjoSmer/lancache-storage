import path from 'path';

import { createLogger } from '../logger';
import { StorageFile } from './storage-file';

export class LancacheStorage {
  openStorageFiles = new Map<string, StorageFile>();
  logger = createLogger(LancacheStorage.name);
  fileName = 'file';
  dataFileName = 'data.json';

  constructor(readonly storagePath: string) {}

  find(basePath: string): StorageFile | undefined {
    const relativePath = path.join(basePath, this.dataFileName);
    const fullPath = path.join(this.storagePath, relativePath);

    try {
      const fileData = this.openStorageFiles.get(basePath) || new StorageFile(this, require(fullPath));
      fileData.instanceCount++;

      if (!this.openStorageFiles.has(basePath)) this.openStorageFiles.set(relativePath, fileData);

      return fileData;
    } catch (e) {
      return undefined;
    }
  }

  create(basePath: string) {
    const storageFile = new StorageFile(this, {
      createdAt: new Date(),
      updatedAt: new Date(),
      downloadCount: 0,
      basePath,
      headers: {},
      status: 'idle',
    });
    storageFile.instanceCount++;

    this.logger.debug(`Create new file storage: ${basePath}`);
    this.openStorageFiles.set(basePath, storageFile);
    return storageFile;
  }

  saveAll() {
    Array.from(this.openStorageFiles.values()).forEach((storageFile) => storageFile.save());
  }

  close(storageFile: StorageFile) {
    this.openStorageFiles.delete(storageFile.basePath);
  }
}
