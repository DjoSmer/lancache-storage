import fs from 'fs';
import http from 'http';
import httpProxy from 'http-proxy';
import { Socket } from 'net';

import { createLogger } from '@app/logger';
import { LancacheRequest, LancacheResponse } from '@app/server';

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

  private handlerProxyRes(proxyRes: LancacheRequest, lanReq: LancacheRequest, lanRes: LancacheResponse) {
    const rid = lanReq.rid;
    this.logger.debug(`Client Headers ${rid} ${JSON.stringify(lanReq.headers, null, 2)}`);
    this.logger.debug(`Proxy Headers ${rid} ${JSON.stringify(proxyRes.headers, null, 2)}`);
    //this.logger.debug(`Proxy is starting to steam: ${rid}`);

    proxyRes.on('error', (err) => {
      this.logger.error(`ResError ${rid}`, err);
      lanRes.destroy(err);
    });

    if (lanReq.method !== 'GET' || !lanRes.storageFile
      || (lanRes.storageFile.status !== 'idle' && lanRes.storageFile.status !== 'error')
    ) {
      return;
    }

    const storageFile = lanRes.storageFile;
    storageFile.status = 'pending';

    if (lanReq.headers.range) {
      lanRes.storageFile = undefined;

      const { range, ...headers } = lanReq.headers;
      http.get(`http://${lanReq.headers.host}${lanReq.url}`, {
        method: 'GET',
        headers,
      }, (res) => {
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

      return;
    }

    //Download full file
    const fileStream = fs.createWriteStream(storageFile.filepath);
    fileStream.on('finish', () => {
      this.logger.debug(`File download in the storage: ${rid}`);
      storageFile.close('success');
      fileStream.close();
    });

    proxyRes.on('error', (err) => {
      lanRes?.storageFile?.close('error');
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
