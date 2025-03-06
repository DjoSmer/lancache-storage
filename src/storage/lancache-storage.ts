import winston from 'winston';

import { StorageFile } from './storage-file';
import { StorageFileData } from './types';

export abstract class LancacheStorage {
  protected openStorageFiles = new Map<string, StorageFile>();
  protected abstract logger: winston.Logger;

  protected constructor(readonly storagePath: string) {}

  get(basePath: string): StorageFile | undefined {
    try {
      const fileData = this.openStorageFiles.get(basePath) || new StorageFile(this, this.find(basePath));
      fileData.instanceCount++;

      if (!this.openStorageFiles.has(basePath)) this.openStorageFiles.set(basePath, fileData);

      return fileData;
    } catch (e) {
      return undefined;
    }
  }

  abstract find(basePath: string): StorageFileData;

  create(basePath: string) {
    const storageFile = new StorageFile(this, {
      createdAt: new Date(),
      updatedAt: new Date(),
      downloadCount: 0,
      target: basePath.split('/').at(0) || 'unknown',
      basePath,
      headers: {},
      status: 'idle',
    });
    storageFile.instanceCount++;

    this.logger.debug(`Create new file storage: ${basePath}`);
    this.openStorageFiles.set(basePath, storageFile);
    return storageFile;
  }

  save(data: StorageFileData) {
    const storageFile = this.openStorageFiles.get(data.basePath);
    if (storageFile && storageFile.instanceCount < 1) this.close(data);
  }

  saveAll() {
    Array.from(this.openStorageFiles.values()).forEach((storageFile) => storageFile.save());
  }

  close(data: StorageFileData) {
    this.openStorageFiles.delete(data.basePath);
  }
}
