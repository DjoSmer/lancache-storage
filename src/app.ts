import { LancacheServer } from '@app/server';
import { ProxyRoute } from './routes/proxy.route';

import { statusRoute } from './routes/status-route';
// import { StorageRoute } from './routes/storage.route';
import { LancacheStorage } from './storage';
import lancacheConfig from '../lancache.config.json';

export class App {
  readonly httpServer: LancacheServer;
  readonly storage: LancacheStorage

  constructor(config: Record<string, string>) {
    this.storage = new LancacheStorage(config.storageDir);
    const proxyRoute = new ProxyRoute(this.storage, lancacheConfig);
    // const storageRoute = new StorageRoute(this.storage, lancacheConfig);
    this.httpServer = new LancacheServer(proxyRoute.route);

    this.httpServer.addRoute('/status', statusRoute);
  }

  run() {
    this.httpServer.run();
  }
}
