import { DataSource, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

import { createLogger } from '../logger';
import { LancacheStorage } from './lancache-storage';
import { StorageFileData } from './types';

export class LancacheStorageTypeorm extends LancacheStorage {
  logger = createLogger(LancacheStorageTypeorm.name);

  private db = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: 5432,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [StorageEntity, TargetEntity],
    synchronize: false,
    logging: false,
  });

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

    return { ...entity, headers: {} } as StorageFileData;
  }

  async save(data: StorageFileData) {
    try {
      if ((data as unknown as Storage).id) {
        await this.db.getRepository(StorageEntity).update({
          basePath: data.basePath,
        }, {
          updatedAt: data.updatedAt,
          status: data.status,
          downloadCount: data.downloadCount
        });
      } else {
        await this.db.getRepository(StorageEntity).save(data);
      }
    } catch (e) {
      this.logger.error('Cannot save in db', e);
    }

    super.save(data);
  }

  private async initTargets() {
    await this.db.initialize();
    const targets = await this.db.manager.find(TargetEntity, {
      where: {
        enabled: true,
      }
    });

    if (!targets.length) return;

    this.targets = [];

    for (const target of targets) {
      const { code, host, userAgent } = target;
      if (host) this.targets.push({ code, host });
      else if (userAgent) this.targets.push({ code, userAgent });
    }
  }
}

@Entity('storage')
class StorageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ type: 'character varying' })
  target: string

  @Column({ type: 'character varying' })
  status: string;

  @Column({ type: 'character varying', unique: true })
  basePath: string;
}

@Entity('target')
class TargetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'character varying' })
  code: string

  @Column({ type: 'character varying' })
  host?: string;

  @Column({ type: 'character varying' })
  userAgent?: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
