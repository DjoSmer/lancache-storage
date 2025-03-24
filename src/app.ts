import { LancacheServer } from '@app/server';
import { DefaultRoute } from './routes/default.route';

import { statusRoute } from './routes/status.route';
import { storageSaveRoute } from './routes/storage-save.route';
import { downloadRoute } from './routes/download.route';
import { LancacheStorage, LancacheStorageTypeorm } from './storage';

export class App {
  readonly httpServer: LancacheServer;
  readonly storage: LancacheStorage

  constructor(config: Record<string, string>) {
    this.storage = new LancacheStorageTypeorm(config.storageDir);
    const defaultRoute = new DefaultRoute(this.storage);
    this.httpServer = new LancacheServer();

    this.httpServer.addRoute(statusRoute);
    this.httpServer.addRoute(storageSaveRoute);
    this.httpServer.addRoute(downloadRoute);
    this.httpServer.addRoute(config.mode === 'proxy' ? defaultRoute.proxyRoute : defaultRoute.storageRoute);
  }

  run() {
    this.httpServer.run();
  }
}

