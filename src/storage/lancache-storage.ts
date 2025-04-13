import winston from 'winston';

import lancacheConfig from '../../lancache.config.json';

import { StorageFile } from './storage-file';
import { StorageFileData, StorageFileStatusEnum, StorageTarget, StorageTargetProps } from './types';

export abstract class LancacheStorage {
  abstract logger: winston.Logger;
  protected openStorageFiles = new Map<string, StorageFile>();
  protected noStorage: string[] = [];
  protected targets: StorageTarget[] = [];

  protected constructor(readonly storagePath: string) {
    const {noStorage, targets} = lancacheConfig;

    this.noStorage = noStorage;
    this.targets = targets;
  }

  async get(basePath: string): Promise<StorageFile | undefined> {
    try {
      const fileData = this.openStorageFiles.get(basePath) || new StorageFile(this, await this.find(basePath));

      if (!this.openStorageFiles.has(basePath)) this.openStorageFiles.set(basePath, fileData);

      return fileData;
    } catch (e) {
      return undefined;
    }
  }

  abstract find(basePath: string): Promise<StorageFileData>;

  create(basePath: string, target: StorageTarget) {
    const storageFile = new StorageFile(this, {
      createdAt: new Date(),
      updatedAt: new Date(),
      downloadCount: 0,
      targetId: target.id,
      basePath,
      status: StorageFileStatusEnum.idle,
    });
    storageFile.isNew = true;

    if (this.openStorageFiles.has(basePath)) {
      this.logger.debug(`Return exist file storage: ${basePath}`);
      return this.openStorageFiles.get(basePath);
    }

    this.logger.debug(`Create new file storage: ${basePath}`);
    this.openStorageFiles.set(basePath, storageFile);
    return storageFile;
  }

  save(data: StorageFileData, isNew: boolean) {
    const storageFile = this.openStorageFiles.get(data.basePath);
    if (storageFile && storageFile.instances.size < 1) this.close(data);
  }

  saveAll() {
    return Array.from(this.openStorageFiles.values()).map((storageFile) => Array.from(storageFile.save().instances));
  }

  close(data: StorageFileData) {
    const beforeSize = this.openStorageFiles.size;
    this.openStorageFiles.delete(data.basePath);
    const afterSize = this.openStorageFiles.size;
    this.logger.debug(`Close ${data.basePath} storage file ${beforeSize}/${afterSize}`);
  }

  getTarget({ host, url, userAgent }: StorageTargetProps) {
    if (this.noStorage.some((regExp) => url?.match(new RegExp(regExp, 'i')))) return false;

    return this.targets.find((target) => {
      if (target.userAgent && target.userAgent === userAgent) return true;
      else if (target.host && host?.includes(target.host)) return true;
      return false;
    });
  }
}
