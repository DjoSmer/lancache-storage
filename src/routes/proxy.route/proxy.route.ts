import { createLogger } from '@app/logger';
import { LancacheStorage } from '@app/storage/lancache-storage';
import { LancacheRequestListener, LancacheResponse, LancacheRequest } from '@app/server';

import { ProxyServer } from './proxy-server';
import { StorageTarget } from './types';

export class ProxyRoute {
  logger = createLogger(ProxyRoute.name);
  proxyServer = new ProxyServer();

  constructor(private readonly lancacheStorage: LancacheStorage, private readonly lancacheConfig: {
    noStorage: string[],
    targets: StorageTarget[]
  }) {}

  route: LancacheRequestListener = (lanReq, lanRes) => {
    const isLocalhost = lanReq.headers.host?.match(/^127\.0\.0\.1|localhost$/);
    if (isLocalhost) {
      lanRes.writeHead(400, 'Host is localhost');
      lanRes.end();
      return;
    }

    if (this.checkInStorage(lanReq, lanRes)) return;

    lanRes.storageStatus('MISS');

    this.proxyServer.web(lanReq, lanRes, { target: `http://${lanReq.headers.host}`, proxyTimeout: 15000 });

    return;
  };

  checkInStorage(lanReq: LancacheRequest, lanRes: LancacheResponse): boolean {
    const rid = lanReq.rid;
    const { noStorage, targets } = this.lancacheConfig;

    if (noStorage.some((regExp) => lanReq.url?.match(new RegExp(regExp, 'i')))) return false;

    const target = targets.find((target) => {
      if (target.userAgent && target.userAgent === lanReq.headers['user-agent']) return true;
      else if (target.host && lanReq.headers.host?.includes(target.host)) return true;
      return false;
    });

    if (!target) return false;

    const basePath = target.id + lanReq.url;

    const storageFile = this.lancacheStorage.get(basePath) || this.lancacheStorage.create(basePath);
    lanRes.storageFile = storageFile;

    this.logger.debug(`Storage target/status: ${target.id}${rid}/${storageFile.status}`);

    if (storageFile.status !== 'success') return false;

    lanRes.sendFileFromStorage();
    return true;
  }
}
