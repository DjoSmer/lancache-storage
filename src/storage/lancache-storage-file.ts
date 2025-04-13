import fs from 'fs';
import path from 'path';

import { createLogger } from '../logger';
import { LancacheStorage } from './lancache-storage';
import { StorageFileData } from './types';

export class LancacheStorageFile extends LancacheStorage {
  logger = createLogger(LancacheStorage.name);

  constructor(readonly storagePath: string) {
    super(storagePath)
  }

  find(basePath: string): Promise<StorageFileData> {
    const fullPath = path.join(this.storagePath, basePath + '.json');
    return Promise.resolve(require(fullPath));
  }

  save(data: StorageFileData) {
    const filepath = path.join(this.storagePath, data.basePath + '.json');
    const dir =  path.dirname(filepath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(filepath, JSON.stringify(data));

    super.save(data, false);
  }

}
