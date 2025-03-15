import { LancacheServer } from '@app/server';
import { DefaultRoute } from './routes/default.route';

import { statusRoute } from './routes/status-route';
import { storageSaveRoute } from './routes/storage-save';
import { LancacheStorage, LancacheStoragePrisma } from './storage';

export class App {
  readonly httpServer: LancacheServer;
  readonly storage: LancacheStorage

  constructor(config: Record<string, string>) {
    this.storage = new LancacheStoragePrisma(config.storageDir);
    const defaultRoute = new DefaultRoute(this.storage);
    this.httpServer = new LancacheServer(config.mode === 'proxy' ? defaultRoute.proxyRoute : defaultRoute.storageRoute);

    this.httpServer.addRoute('/status', statusRoute);
    this.httpServer.addRoute('/storage-save', storageSaveRoute);
  }

  run() {
    this.httpServer.run();
  }
}

