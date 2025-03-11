import { PrismaClient } from '@prisma/client';

import { createLogger } from '../logger';
import { LancacheStorage } from './lancache-storage';
import { StorageFileData } from './types';

export class LancacheStoragePrisma extends LancacheStorage {
  protected logger = createLogger(LancacheStoragePrisma.name);

  private prisma = new PrismaClient();

  constructor(readonly storagePath: string) {
    super(storagePath);

    void this.initTargets();
  }

  async find(basePath: string): Promise<StorageFileData> {
    const entity = await this.prisma.storage.findFirst({
      where: {
        basePath
      }
    })

    if (!entity) throw new Error('SqlLite: Data not found');

    const { id, ...data } = entity;
    return { ...data } as StorageFileData;
  }

  async save(data: StorageFileData) {
    await this.prisma.storage.upsert({
      where: {
        basePath: data.basePath,
      },
      update: {
        updatedAt: data.updatedAt,
        status: data.status,
        headers: data.headers,
        downloadCount: data.downloadCount
      },
      create: data
    });

    super.save(data);
  }

  private async initTargets() {
    const targets = await this.prisma.target.findMany({
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
