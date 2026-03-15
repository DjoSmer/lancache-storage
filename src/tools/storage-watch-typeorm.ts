import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from 'dotenv';
import { DataSource, In, LessThanOrEqual } from 'typeorm';
import winston from 'winston';
import { createLogger } from '../logger';
import { dataSourceOptions } from '../db-typeorm/data-source.options';
import { StorageEntity } from '../db-typeorm/storage.entity';

config();

const storageDir = process.env.APP_STORAGE_DIR;
const storageDiskSize = process.env.STORAGE_DISK_SIZE;
const storageMaxAge = process.env.STORAGE_MAX_AGE;

if (!storageDir) {
  throw new Error(`Storage Dir is empty`);
}

const maxAgeMatch = storageMaxAge?.match(/^([0-9.]*)([mwd])$/);
if (!maxAgeMatch) {
  throw new Error(`Storage Max Age doesn't match mask 1m/4w/31d`);
}

const diskSizeMatch = storageDiskSize?.match(/^([0-9.]*)([TGM])$/i);
if (!diskSizeMatch) {
  throw new Error(`Storage Disk Size doesn't match mask 1T/1024G/10240M`);
}

const db = new DataSource(dataSourceOptions);
let logger: winston.Logger;

const deleteFiles = async (storages: StorageEntity[]) => {
  if (!storages || !storages.length) return;

  const toDelete: string[] = [];
  for (const storage of storages) {
    let { updatedAt, downloadCount } = storage;
    let basePath = storage.basePath;
    const extname = path.extname(basePath);
    basePath = basePath + (!extname ? '.file' : '');
    const filepath = path.join(storageDir, basePath);
    if (fs.existsSync(filepath)) fs.rmSync(filepath);
    if (!fs.existsSync(filepath)) toDelete.push(storage.basePath);
    logger.debug(`Delete ${basePath} / ${downloadCount} / ${updatedAt.toJSON()}`);
  }

  for (let x = 0; x < toDelete.length; x += 100) {
    await db.getRepository(StorageEntity).delete({
      basePath: In(toDelete.slice(x, x + 100)),
    });
  }

  logger.warn(`Delete ${storages.length}/${toDelete.length} files in storage.`);
};

const [, maxAge, maxAgeUnit] = maxAgeMatch;
const [, size, unit] = diskSizeMatch;
const sizeUnits: Record<string, number> = {
  T: 1024 ** 3,
  G: 1024 ** 2,
  M: 1024,
};
const maxSize = +size * sizeUnits[unit.toUpperCase()];

const check = async () => {
  if (!db.isInitialized) await db.initialize();

  logger = createLogger('StorageWatchTypeorm', { saveToFile: true, console: true });

  const date = new Date();
  if (maxAgeUnit === 'm') {
    date.setMonth(date.getMonth() - +maxAge);
  } else if (maxAgeUnit === 'w') {
    date.setDate(date.getDate() - +maxAge * 7);
  } else if (maxAgeUnit === 'd') {
    date.setDate(date.getDate() - +maxAge);
  }

  const storages = await db.getRepository(StorageEntity).find({
    select: {
      updatedAt: true,
      downloadCount: true,
      basePath: true,
    },
    where: {
      updatedAt: LessThanOrEqual(date),
    },
  });
  await deleteFiles(storages);

  for (let i = 0; i < 100; i++) {
    //du command return size in kb
    const stdout = execSync(`du -sk ${storageDir} | grep ${storageDir} | awk '{print $1}'`);
    const totalSize = Number(stdout.toString().replace(/\s*/g, ''));

    logger.warn(`Current storage size ${totalSize}/${maxSize} - ${i}.`);

    if (totalSize < maxSize) {
      break;
    }

    const storages = await db.getRepository(StorageEntity).find({
      select: {
        updatedAt: true,
        downloadCount: true,
        basePath: true,
      },
      order: {
        updatedAt: 'asc',
      },
      take: 1000,
    });

    await deleteFiles(storages);
  }

  logger.close();
};

console.log(`${(new Date).toJSON()}: Storage watch is running`);

let times = 15 * 60 - 2 * 60 / 4;
const run = async () => {
  if (++times >= 15 * 60) {
    times = 0;
    await check();
  }
  setTimeout(run, 4000);
};
setTimeout(run, 4000);
