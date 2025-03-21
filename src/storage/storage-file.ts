import fs from 'fs';
import path from 'path';
import winston from 'winston';

import { LancacheStorage } from './lancache-storage';
import { StorageFileData } from './types';

export class StorageFile {
  instances = new Set<number>();
  private ip: Record<string, { count: number, timerId?: NodeJS.Timeout }> = {}
  private ipDelay = 7500;
  private limitForOneIp = 3;
  private logger: winston.Logger;
  private timeout = 10 * 60 * 1000; //10min
  private timeoutTimerId: NodeJS.Timeout | undefined;

  constructor(
    private readonly lancacheStorage: LancacheStorage,
    private data: StorageFileData,
  ) {
    this.logger = lancacheStorage.logger;
    this.runTimer();
  }

  addInstance(instance: number, ip: string) {
    if (!this.ip[ip]) this.ip[ip] = { count: 1 };
    else {
      this.ip[ip].count++
      clearTimeout(this.ip[ip].timerId);
    }

    this.instances.add(instance);

    if (this.ip[ip].count >= this.limitForOneIp && this.status === 'success') {
      this.status = 'error';
      this.logger.warn(`${ip} asked for ${this.ip[ip].count} times ${this.data.basePath}`);
    }

    this.runTimer();
  }

  close(instanceId: number, ip: string, status?: StorageFileData['status']) {
    if (!this.instances.has(instanceId)) return;

    this.instances.delete(instanceId);

    if (status) this.status = status;

    this.ip[ip].timerId = setTimeout(() => this.decreaseIpCount(ip), this.ipDelay);

    this.logger.debug(`Close instance storage: ${this.data.basePath}:${instanceId}/${this.instances.size}`);
  }

  save() {
    if (this.status === 'noSave') {
      this.lancacheStorage.close(this.data);
      return this;
    }

    this.lancacheStorage.save(this.data);
    this.logger.debug(`Save storage: ${this.data.basePath}/${this.instances.size}`);
    return this;
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

  /**
   * if basePath doesn't have extname it can be a dir or a file.
   * if basePath is first/second a file save to first/second.file.
   * if basePath is first/second/third a file save to first/second/third.file.
   * if basePath is first/second/third.ext a file save to first/second/third.ext.
   */
  get filepath() {
    this.mkdir();
    const extname = path.extname(this.data.basePath);
    //TODO check for old files in storage | remove date check
    const basePath = this.data.createdAt.getTime() > 1741801602071 ? this.data.basePath + (!extname ? '.file' : '') : this.data.basePath;
    return path.join(this.lancacheStorage.storagePath, basePath);
  }

  get relativeFilepath() {
    const extname = path.extname(this.data.basePath);
    //TODO check for old files in storage | remove date check
    const basePath = this.data.createdAt.getTime() > 1741801602071 ? this.data.basePath + (!extname ? '.file' : '') : this.data.basePath;
    return path.join('/', basePath);
  }

  isSuccess() {
    return this.status === 'success' && fs.existsSync(this.filepath);
  }

  private mkdir() {
    const filepath = path.join(this.lancacheStorage.storagePath, this.data.basePath);
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private decreaseIpCount(ip: string) {
    this.ip[ip].count = 0;
    if (this.instances.size < 1) {
      this.save();
      clearTimeout(this.timeoutTimerId);
    }
  }

  private runTimer() {
    clearTimeout(this.timeoutTimerId);
    this.timeoutTimerId = setTimeout(() => {
      this.logger.warn(`Storage File Timer has run. ${this.data.basePath}`);
      this.save();
      this.lancacheStorage.close(this.data);
    }, this.timeout);
  }
}
