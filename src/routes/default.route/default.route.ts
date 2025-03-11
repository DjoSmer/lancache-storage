import fs from 'fs';
import http from 'http';

import { createLogger } from '@app/logger';
import { LancacheStorage } from '@app/storage/lancache-storage';
import { LancacheRequestListener, LancacheResponse, LancacheRequest } from '@app/server';

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
      return;
    }

    if (await this.checkInStorage(lanReq, lanRes)) {
      lanRes.sendFileFromStorage();
      return;
    }

    lanRes.storageStatus('MISS');

    this.proxyServer.web(lanReq, lanRes, { target: `http://${lanReq.headers.host}`, proxyTimeout: 15000 });

    return;
  };

  /**
   * through nginx
   * @param lanReq
   * @param lanRes
   */
  storageRoute: LancacheRequestListener = async (lanReq, lanRes) => {
    if (await this.checkInStorage(lanReq, lanRes)) {
      const storageFile = lanRes.storageFile!;

      lanRes.setHeaders(new Headers(storageFile.headers as unknown as Headers));
      lanRes.storageStatus('HIT');
      lanRes.removeHeader('content-length');
      lanRes.writeHead(301, {
        'Location': `${storageFile.relativeFilepath}`,
      });
      lanRes.end();

      storageFile.increaseDownloadCount();
      storageFile.close();
      return;
    }

    this.downloadToStorage(lanReq, lanRes);

    lanRes.storageStatus('MISS');
    lanRes.writeHead(404, 'File not found in storage');
    lanRes.end();

    return;
  };

  private async checkInStorage(lanReq: LancacheRequest, lanRes: LancacheResponse): Promise<boolean> {
    const rid = lanReq.rid;

    const target = this.lancacheStorage.getTarget({
      host: lanReq.headers['host'],
      userAgent: lanReq.headers['user-agent'],
      url: lanReq.url,
    });

    if (!target) return false;

    const basePath = target.code + lanReq.url;

    const storageFile = await this.lancacheStorage.get(basePath) || this.lancacheStorage.create(basePath);
    lanRes.storageFile = storageFile;

    this.logger.debug(`Storage target - status: ${target.code}${rid} - ${storageFile.status}`);

    return storageFile.status === 'success';
  }

  private downloadToStorage(lanReq: LancacheRequest, lanRes: LancacheResponse): boolean {
    const rid = lanReq.rid;
    const { range, ...headers } = lanReq.headers;

    if (lanReq.method !== 'GET' || !lanRes.storageFile
      || (lanRes.storageFile.status !== 'idle' && lanRes.storageFile.status !== 'error')
    ) {
      return false;
    }

    const storageFile = lanRes.storageFile;
    storageFile.status = 'pending';

    http.get(`http://${lanReq.headers.host}${lanReq.url}`, {
      method: 'GET',
      headers,
    }, (res) => {
      this.logger.debug(`Target Headers ${rid} ${JSON.stringify(res.headers, null, 2)}`);

      const fileStream = fs.createWriteStream(storageFile.filepath);
      fileStream.on('finish', () => {
        this.logger.debug(`File was saved in the storage: ${rid}`);
        storageFile.close('success');
        fileStream.close();
      });

      res.on('error', (err) => {
        this.logger.error(`When saving to the storage: ${rid}`, err);
        storageFile.close('error');
      });

      storageFile.headers = res.headers as Record<string, string>;
      res.pipe(fileStream);
    });

    return true;
  }
}
