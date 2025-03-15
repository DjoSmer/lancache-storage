import fs from 'fs';
import httpProxy from 'http-proxy';
import { Socket } from 'net';

import { createLogger } from '@app/logger';
import { LancacheRequest, LancacheResponse } from '@app/server';
import { downloadToStorage } from './downloadToStorage';

export class ProxyServer {
  private readonly logger = createLogger(ProxyServer.name);
  private readonly proxyServer = httpProxy.createProxyServer<LancacheRequest, LancacheResponse>({});

  web = this.proxyServer.web.bind(this.proxyServer);

  constructor() {
    this.proxyServer.on('proxyRes', this.handlerProxyRes.bind(this));
    this.proxyServer.on('end', this.handlerEnd.bind(this));
    this.proxyServer.on('error', this.handlerError.bind(this));
    this.proxyServer.on('close', () => {
      this.logger.debug(`close proxyRes`);
    });
  }

  private async handlerProxyRes(proxyRes: LancacheRequest, lanReq: LancacheRequest, lanRes: LancacheResponse) {
    const rid = lanReq.rid;
    this.logger.debug(`Proxy Headers ${rid} ${JSON.stringify([lanReq.headers, proxyRes.headers], null, 2)}`);

    proxyRes.on('error', (err) => {
      this.logger.error(`ResError ${rid}`, err);
      lanRes.destroy(err);
    });

    if (lanReq.method !== 'GET' || !lanRes.storageFile
      || (lanRes.storageFile.status !== 'idle' && lanRes.storageFile.status !== 'error')
    ) {
      lanRes.storageFile?.close(lanReq.requestId, lanReq.getIp());
      return;
    }

    const storageFile = lanRes.storageFile;
    storageFile.status = 'pending';

    if (!proxyRes.statusCode || proxyRes.statusCode > 299) {
      storageFile.close(lanReq.requestId, lanReq.getIp(), 'noSave');
      return;
    }

    let status: typeof storageFile['status'] = 'error';

    if (lanReq.headers.range) {
      lanRes.storageFile = undefined;

      for (let x = 0; x < 3; x++) {
        try {
          status = await downloadToStorage(lanReq, storageFile, this.logger);
          break;
        } catch (e) {}
      }
      storageFile.close(lanReq.requestId, lanReq.getIp(), status);

      return;
    }

    //Download full file
    const fileStream = fs.createWriteStream(storageFile.filepath);

    const handleFinish = () => {
      this.logger.debug(`File download in the storage: ${rid}`);
      fileStream.close();
      storageFile.close(lanReq.requestId, lanReq.getIp(), 'success');
    }

    fileStream.on('finish', handleFinish);

    proxyRes.on('error', (err) => {
      fileStream.removeListener('finish', handleFinish);
      fileStream.close();
      storageFile.close(lanReq.requestId, lanReq.getIp(), 'error');
      this.logger.error(`proxyRes.error ${rid}`, err);
    });

    storageFile.headers = proxyRes.headers as Record<string, string>;
    proxyRes.pipe(fileStream);
  }

  private handlerEnd(lanReq: LancacheRequest) {
    const rid = lanReq.rid;
    this.logger.debug(`Proxy is done: ${rid}`);
  }

  private handlerError(err: Error, lanReq: LancacheRequest, lanRes: LancacheResponse | Socket) {
    const rid = lanReq.rid;
    lanRes.destroy(err);
    this.logger.error(`Error: ${rid}`, err);
  }
}
