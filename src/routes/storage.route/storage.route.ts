import fs from 'fs';
import http from 'http';

import { createLogger } from '@app/logger';
import { LancacheStorage } from '@app/storage/lancache-storage';
import { LancacheRequestListener, LancacheResponse, LancacheRequest } from '@app/server';

import { StorageTarget } from './types';

export class StorageRoute {
  logger = createLogger(StorageRoute.name);

  constructor(private readonly lancacheStorage: LancacheStorage, private readonly lancacheConfig: {
    noStorage: string[],
    targets: StorageTarget[]
  }) {
  }

  route: LancacheRequestListener = (lanReq, lanRes) => {
    if (this.checkInStorage(lanReq, lanRes)) return;

    this.downloadToStorage(lanReq, lanRes);

    lanRes.storageStatus('MISS');
    lanRes.writeHead(404, 'File not found in storage');
    lanRes.end();

    return;
  };

  private downloadToStorage(lanReq: LancacheRequest, lanRes: LancacheResponse) {
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


  checkInStorage(lanReq: LancacheRequest, lanRes: LancacheResponse): boolean {
    const rid = lanReq.rid;
    const { noStorage, targets } = this.lancacheConfig;

    this.logger.debug(`Incoming Headers ${rid} ${JSON.stringify(lanReq.headers, null, 2)}`);

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

    lanRes.setHeaders(new Headers(storageFile.headers));
    lanRes.storageStatus('HIT');
    lanRes.removeHeader('content-length');
    lanRes.writeHead(301, {
      // ...storageFile.headers,
      'Location': `${storageFile.relativeFilepath}`,
    });
    lanRes.end();

    storageFile.increaseDownloadCount();
    storageFile.close();

    return true;
  }
}
