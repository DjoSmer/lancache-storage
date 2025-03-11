import fs from 'fs';
import path from 'path';

import { createLogger } from '../logger';
import { LancacheStorage } from './lancache-storage';
import { StorageFileData } from './types';

export class StorageFile {
  instanceCount = 0;
  private logger = createLogger(StorageFile.name);

  constructor(
    private readonly lancacheStorage: LancacheStorage,
    private data: StorageFileData,
  ) {}

  close(status?: StorageFileData['status']) {
    this.instanceCount--;

    if (status) this.status = status;

    this.logger.debug(`Close instance storage: ${this.data.basePath}/${this.instanceCount}`);
    if (this.instanceCount < 1) this.save();
  }

  save() {
    this.lancacheStorage.save(this.data);
    this.logger.debug(`Save storage: ${this.data.basePath}/${this.instanceCount}`);
  }

  increaseDownloadCount() {
    this.data.downloadCount++;
    this.data.updatedAt = new Date();
  }

  get status() {
    return this.data.status;
  }

  set status(status: StorageFileData['status']) {
    this.data.status = status;
    this.data.updatedAt = new Date();
  }

  get headers() {
    return this.data.headers;
  }

  set headers(headers: StorageFileData['headers']) {
    this.data.headers = headers;
    this.data.updatedAt = new Date();
  }

  get filepath() {
    this.mkdir();
    return path.join(this.lancacheStorage.storagePath, this.data.basePath);
  }

  get relativeFilepath() {
    return path.join('/', this.data.basePath);
  }

  private mkdir() {
    const filepath = path.join(this.lancacheStorage.storagePath, this.data.basePath);
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
