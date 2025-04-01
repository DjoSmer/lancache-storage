import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from 'dotenv';
import { PrismaClient, storage } from '@prisma/client';
import winston from 'winston';
import { createLogger } from '../logger';

config();

const storageDir = process.env.APP_STORAGE_DIR;
const storageDiskSize = process.env.STORAGE_DISK_SIZE;
const storageMaxAge = process.env.STORAGE_MAX_AGE;

if (!storageDir) {
  throw new Error(`Storage Dir is empty`);
}

const maxAgeMatch = storageMaxAge?.match(/^([0-9]*)([mwd])$/);
if (!maxAgeMatch) {
  throw new Error(`Storage Max Age doesn't match mask 1m/4w/31d`);
}

const diskSizeMatch = storageDiskSize?.match(/^([0-9]*)([TGM])$/i);
if (!diskSizeMatch) {
  throw new Error(`Storage Disk Size doesn't match mask 1T/1024G/10240M`);
}

let prisma: PrismaClient;
let logger: winston.Logger;

const deleteFiles = async (storages: storage[]) => {
  if (!storages || !storages.length || !prisma) return;

  const ids = [];
  for (const storage of storages) {
    let { id, basePath, createdAt } = storage;
    const extname = path.extname(basePath);
    //TODO remove date check
    basePath = createdAt.getTime() > 1741801602071 ? basePath + (!extname ? '.file' : '') : basePath;
    const filepath = path.join(storageDir, basePath);
    if (fs.existsSync(filepath)) fs.rmSync(filepath);
    ids.push(id);
  }

  for (let x = 0; x < ids.length; x += 1000) {
    await prisma.storage.deleteMany({
      where: {
        id: {
          in: ids.slice(x, x + 1000),
        },
      },
    });
  }

  logger.warn(`${(new Date).toJSON()} Delete ${storages.length} files in storage.`);
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
  prisma = new PrismaClient();
  logger = createLogger('StorageWatchPrisma', { saveToFile: true, console: true });

  const date = new Date();
  if (maxAgeUnit === 'm') {
    date.setMonth(date.getMonth() - +maxAge);
  } else if (maxAgeUnit === 'w') {
    date.setDate(date.getDate() - +maxAge * 7);
  } else if (maxAgeUnit === 'd') {
    date.setDate(date.getDate() - +maxAge);
  }

  const storages = await prisma.storage.findMany({
    where: {
      updatedAt: {
        lte: date,
      },
    },
  });
  await deleteFiles(storages);

  for (let i = 0; i < 100; i++) {
    //du command return size in kb
    const stdout = execSync(`du -sk ${storageDir} | grep ${storageDir} | awk '{print $1}'`);
    const totalSize = Number(stdout.toString().replace(/\s*/g, ''));

    logger.warn(stdout.toString(), 'stdout');
    logger.warn(`${(new Date).toJSON()} Current storage size ${totalSize}/${maxSize}.`);

    if (totalSize < maxSize) {
      break;
    }

    const storages = await prisma.storage.findMany({
      orderBy: {
        updatedAt: 'asc',
      },
      take: 100,
    });

    await deleteFiles(storages);
  }

  prisma.$disconnect();
  logger.close();
};
console.log(`${(new Date).toJSON()} Storage watch is running`);
let minutes = 0;
setInterval(() => {
  if (++minutes >= 60) {
    void check();
    minutes = 0;
  }
}, 60 * 1000);