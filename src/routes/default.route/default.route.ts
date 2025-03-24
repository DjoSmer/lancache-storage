import { createLogger } from '@app/logger';
import { LancacheStorage } from '@app/storage/lancache-storage';
import { LancacheRequestListener, LancacheResponse, LancacheRequest } from '@app/server';
import { downloadToStorage } from './downloadToStorage';

import { ProxyServer } from './proxy-server';

export class DefaultRoute {
  private logger = createLogger(DefaultRoute.name);
  private proxyServer = new ProxyServer();

  constructor(private readonly lancacheStorage: LancacheStorage) {}

  /**
   * direct connection
   * @param lanReq
   * @param lanRes
   */
  proxyRoute: LancacheRequestListener = async (lanReq, lanRes) => {
    const isLocalhost = lanReq.headers.host?.match(/^127\.0\.0\.1|localhost$/);
    if (isLocalhost) {
      lanRes.writeHead(400, 'Host is localhost');
      lanRes.end();
      return true;
    }

    if (await this.checkInStorage(lanReq, lanRes)) {
      lanRes.sendFileFromStorage();
      return true;
    }

    lanRes.storageStatus('MISS');
    try {
      this.proxyServer.web(lanReq, lanRes, { target: `http://${lanReq.headers.host}`, proxyTimeout: 15000 });
    } catch (e) {
      this.logger.error(`Catch ProxyServer: `, e);
      lanRes.destroy(e as Error);
    }

    return true;
  };

  /**
   * through nginx
   * @param lanReq
   * @param lanRes
   */
  storageRoute: LancacheRequestListener = async (lanReq, lanRes) => {
    if (await this.checkInStorage(lanReq, lanRes)) {
      const storageFile = lanRes.storageFile!;

      //lanRes.setHeaders(new Headers(storageFile.headers as unknown as Headers));
      lanRes.storageStatus('HIT');
      lanRes.removeHeader('content-length');
      lanRes.writeHead(302, {
        'Location': `${storageFile.relativeFilepath}`,
      });
      lanRes.end();

      storageFile.increaseDownloadCount();
      storageFile.close(lanReq.requestId, lanReq.getIp());
      return true;
    }

    void this.downloadToStorage(lanReq, lanRes);

    lanRes.storageStatus('MISS');
    lanRes.writeHead(404, 'File not found in storage');
    lanRes.end();

    return true;
  };

  private async checkInStorage(lanReq: LancacheRequest, lanRes: LancacheResponse): Promise<boolean> {
    const rid = lanReq.rid;
    const { pathname } = new URL('http://localhost' + lanReq.url);

    const target = this.lancacheStorage.getTarget({
      host: lanReq.headers['host'],
      userAgent: lanReq.headers['user-agent'],
      url: pathname,
    });

    if (!target) return false;

    const basePath = target.code + pathname;

    const storageFile = await this.lancacheStorage.get(basePath) || this.lancacheStorage.create(basePath);
    storageFile.addInstance(lanReq.requestId, lanReq.getIp());
    lanRes.storageFile = storageFile;

    this.logger.debug(`Storage target: ${target.code}${rid} - ${storageFile.status}`);

    return storageFile.isSuccess();
  }

  private async downloadToStorage(lanReq: LancacheRequest, lanRes: LancacheResponse): Promise<boolean> {
    if (lanReq.method !== 'GET' || !lanRes.storageFile
      || (lanRes.storageFile.status !== 'idle' && lanRes.storageFile.status !== 'error')
    ) {
      lanRes.storageFile?.close(lanReq.requestId, lanReq.getIp());
      return false;
    }

    const storageFile = lanRes.storageFile;
    storageFile.status = 'pending';

    let status: typeof storageFile['status'] = 'error';
    for (let x = 0; x < 3; x++) {
      try {
        status = await downloadToStorage(lanReq, storageFile, this.logger);
        break;
      } catch (e) {}
    }
    storageFile.close(lanReq.requestId, lanReq.getIp(), status);

    return true;
  }
}
