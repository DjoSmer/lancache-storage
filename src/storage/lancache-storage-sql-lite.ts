import path from 'path';
import { DatabaseSync, SupportedValueType } from 'node:sqlite';

import { createLogger } from '../logger';
import { LancacheStorage } from './lancache-storage';
import { StorageEntity, StorageFileData } from './types';

export class LancacheStorageSqlLite extends LancacheStorage {
  logger = createLogger(LancacheStorageSqlLite.name);

  private dbFileName = 'sqlLite.db';
  private db: DatabaseSync;
  private lastId = 0;

  constructor(readonly storagePath: string) {
    super(storagePath);

    const dbFilePath = path.join(this.storagePath, this.dbFileName);
    this.db = new DatabaseSync(dbFilePath);
    this.getLastId();
  }

  init() {
    this.db.exec(`
      CREATE TABLE storage(
        id INTEGER PRIMARY KEY,
        createdAt INTEGER,
        updatedAt INTEGER,
        downloadCount INTEGER,
        status TEXT,
        basePath TEXT,
        headers TEXT
      ) STRICT
    `);
    this.logger.debug(`DB created`);
  }

  find(basePath: string): Promise<StorageFileData> {
    const q = this.db.prepare('SELECT * FROM storage WHERE basePath = ?');
    const entity = q.get(basePath) as StorageEntity;

    if (!entity) throw new Error('SqlLite: Data not found');

    const { headers, id, ...data } = entity;
    return Promise.resolve({ ...data, headers: JSON.parse(headers) });
  }

  async save(data: StorageFileData) {
    let entity: StorageFileData | undefined;
    try {
      entity = await this.find(data.basePath);
    } catch (e) {
      entity = undefined;
    }

    if (entity) {
      const keys = Object.keys(entity) as unknown as [keyof StorageFileData];
      const params: SupportedValueType[] = [];

      const setsSql: string[] = [];
      keys.forEach((key) => {
        const value = data[key];
        const entityValue = entity[key];
        if (value !== entityValue) {
          setsSql.push(`${key} = ?`);

          if (key === 'headers') {
            params.push(JSON.stringify(value));
          } else if (value instanceof Date) {
            params.push(value.getTime());
          } else {
            params.push(value as string);
          }
        }
      });
      params.push(data.basePath);

      this.logger.debug(`Update ${data.basePath}`, { setsSql, params });

      const q = this.db.prepare(`
        UPDATE storage SET
         ${setsSql.join(', ')}
         WHERE basePath = ?
      `);
      q.run(...params);

    } else {
      const { createdAt, updatedAt, downloadCount, basePath, headers, status } = data;
      const params: SupportedValueType[] = [
        ++this.lastId,
        createdAt.getTime(),
        updatedAt.getTime(),
        downloadCount,
        basePath,
        JSON.stringify(headers),
        status
      ];

      const q = this.db.prepare(`
        INSERT INTO storage (id, createdAt, updatedAt, downloadCount, basePath, headers, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      q.run(...params);

      this.logger.debug(`Add ${data.basePath}`, { params });
    }

    super.save(data);
  }

  private getLastId() {
    try {
      const q = this.db.prepare('SELECT id FROM storage ORDER BY id DESC LIMIT 1');
      const entity = (q.get() as StorageEntity);
      this.lastId = entity ? entity.id : 0;
      this.logger.debug(`Getting last id: ${this.lastId}`);
    } catch (e) {
      this.init();
    }
  }
}
