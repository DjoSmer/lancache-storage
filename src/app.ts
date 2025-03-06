import { LancacheServer } from '@app/server';
import { ProxyRoute } from './routes/proxy.route';

import { statusRoute } from './routes/status-route';
import { storageSaveRoute } from './routes/storage-save';
import { StorageRoute } from './routes/storage.route';
import { LancacheStorage, LancacheStorageSqlLite, LancacheStorageFile } from './storage';
import lancacheConfig from '../lancache.config.json';

export class App {
  readonly httpServer: LancacheServer;
  readonly storage: LancacheStorage

  constructor(config: Record<string, string>) {
    this.storage = new LancacheStorageSqlLite(config.storageDir);
    const defaultRoute = new ProxyRoute(this.storage, lancacheConfig);
    // const defaultRoute = new StorageRoute(this.storage, lancacheConfig);
    this.httpServer = new LancacheServer(defaultRoute.route);

    this.httpServer.addRoute('/status', statusRoute);
    this.httpServer.addRoute('/storage-save', storageSaveRoute);
  }

  run() {
    this.httpServer.run();
  }
}
