import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();

const storageDir = process.env.STORAGE_DIR;
const storageDiskSize = process.env.STORAGE_DISK_SIZE;
const storageMaxAge = process.env.STORAGE_MAX_AGE;

const maxAgeMatch = storageMaxAge.match(/^([0-9]*)([mwd])$/);
if (!maxAgeMatch) {
  throw new Error(`Storage Max Age doesn't match mask 1m/4w/31d`);
}

const diskSizeMatch = storageDiskSize.match(/^([0-9]*)([TGMK])$/i);
if (!diskSizeMatch) {
  throw new Error(`Storage Disk Size doesn't match mask 1T/1024G/10240M`);
}

const deleteFiles = async (storages) => {
  if (!storages || !storages.length) return;

  const ids = [];
  for (const storage of storages) {
    const { id, basePath } = storage;
    const filepath = path.join(storageDir, basePath);
    if (fs.existsSync(filepath)) fs.rmSync(filepath);
    ids.push(id);
  }

  await prisma.storage.deleteMany({
    where: {
      id: ids,
    },
  });

  console.log(`Delete ${storages.length} files in storage.`);
};

const [, maxAge, maxAgeUnit] = maxAgeMatch;
const [, size, unit] = diskSizeMatch;
const sizeUnits = {
  T: 1024 ** 3,
  G: 1024 ** 2,
  M: 1024,
};
const maxSize = +size * sizeUnits[unit.toUpperCase()];

const check = async () => {
  const prisma = new PrismaClient();

  const date = new Date();
  if (maxAgeUnit === 'm') {
    date.setMonth(date.getMonth() - maxAge);
  } else if (maxAgeUnit === 'w') {
    date.setDate(date.getDate() - maxAge * 7);
  } else if (maxAgeUnit === 'd') {
    date.setDate(date.getDate() - maxAge);
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
    const stdout = execSync(`du -sk ${storageDir}/postgres_data | awk '{print $1}'`);
    const totalSize = stdout.toString().replace(/\s*/g, '');

    console.log(`Current storage size ${totalSize}/${maxSize}.`);

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
};
//1 hour
console.log('Storage watch is running');
setInterval(check, 60 * 60 * 1000);