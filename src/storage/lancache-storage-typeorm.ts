import { DataSource } from 'typeorm';
import { createLogger } from '../logger';
import { dataSourceOptions } from '../db-typeorm/data-source.options';
import { StorageEntity } from '../db-typeorm/storage.entity';
import { TargetEntity } from '../db-typeorm/target.entity';
import { LancacheStorage } from './lancache-storage';
import { StorageFileData } from './types';

export class LancacheStorageTypeorm extends LancacheStorage {
  logger = createLogger(LancacheStorageTypeorm.name);

  private db = new DataSource(dataSourceOptions);

  constructor(readonly storagePath: string) {
    super(storagePath);
    void this.initTargets();
  }

  async find(basePath: string): Promise<StorageFileData> {
    const entity = await this.db.getRepository(StorageEntity).findOne({
      where: {
        basePath
      }
    });

    if (!entity) throw new Error('File not found');

    return entity;
  }

  async save(storageFileData: StorageFileData, isNew: boolean) {
    const { status, ...data } = storageFileData;

    if (status === 'noSave') return;

    try {
      if (!isNew) {
        await this.db.getRepository(StorageEntity).update({
          basePath: data.basePath,
        }, {
          updatedAt: data.updatedAt,
          status,
          downloadCount: data.downloadCount
        });
      } else {
        await this.db.getRepository(StorageEntity).save({
          ...data,
          status
        });
      }
    } catch (e) {
      this.logger.error('Cannot save in db', e);
    }

    super.save(storageFileData, isNew);
  }

  private async initTargets() {
    await this.db.initialize();
    this.targets = await this.db.manager.find(TargetEntity, {
      where: {
        enabled: true,
      }
    });
  }
}


