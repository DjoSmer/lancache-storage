import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../db-typeorm/data-source.options';
import { StorageEntity } from '../db-typeorm/storage.entity';
import { StorageFileStatusEnum } from '../storage';

config();

const storageDir = process.env.APP_STORAGE_DIR;
const db = new DataSource(dataSourceOptions);

const getFiles = async (dir: string)=> {
  const files = fs.readdirSync(dir);

  for (const file of files) {

    if (file === 'postgres_data') continue;

    const filepath = path.join(dir, file);

    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      console.log(`Dir: ${dir}/${file}`);
      void getFiles(filepath);
    } else if (storageDir !== dir) {
      const basePath = filepath.replace('.file', '').replace(storageDir + '/', '');
      const result = await db.getRepository(StorageEntity).exists({
        where: { basePath }
      });

      if (result) continue;

      await db.getRepository(StorageEntity).save({
        basePath,
        createdAt: stat.mtime,
        updatedAt: stat.mtime,
        downloadCount: 0,
        status: StorageFileStatusEnum.success,
        targetId: 3
      });
    }
  }
};

db.initialize().then(() => getFiles(storageDir));
