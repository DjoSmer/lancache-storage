import { createServer } from 'http';

import { LancacheRequest } from './lancache-request';
import { LancacheResponse } from './lancache-response';
import { LancacheRequestListener } from './types';

export class LancacheServer {
  port: number;
  routes: LancacheRequestListener[] = [];
  readonly server = createServer({
    IncomingMessage: LancacheRequest,
    ServerResponse: LancacheResponse,
  });

  constructor() {
    this.port = Number(process.env?.HTTP_PORT) || 80;

    this.server.on('request', async (lanReq, lanRes) => {
      lanReq.rid = `${lanReq.url}:${lanReq.requestId}`;
      lanReq.urlClass = new URL(`http://localhost${lanReq.url}`);

      for (const route of this.routes) {
        if (await route(lanReq, lanRes)) break;
      }
    });
  }

  run() {
    this.server.listen(this.port);
  }

  addRoute(handler: LancacheRequestListener) {
    this.routes.push(handler);
  }

  async getConnections() {
    return new Promise<number>((resolve, reject) => {
      this.server.getConnections((error, count) => {
        return resolve(count);
      })
    });
  }
}
