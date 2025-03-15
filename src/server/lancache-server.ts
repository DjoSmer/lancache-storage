import { createServer } from 'http';

import { LancacheRequest } from './lancache-request';
import { LancacheResponse } from './lancache-response';
import { LancacheRequestListener } from './types';

export class LancacheServer {
  routes = new Map<string, LancacheRequestListener>();
  readonly server = createServer({
    IncomingMessage: LancacheRequest,
    ServerResponse: LancacheResponse,
  });

  constructor(private readonly defaultRouteHandler: LancacheRequestListener) {
    this.server.on('request', async (lanReq, lanRes) => {
      const reqUrl = new URL(`http://${lanReq.headers.host}${lanReq.url}`);
      lanReq.rid = `${lanReq.url}:${lanReq.requestId}`;
      const routeHandler = this.routes.get(reqUrl.pathname);

      if (routeHandler) return routeHandler(lanReq, lanRes);

      return defaultRouteHandler(lanReq, lanRes);
    });
  }

  run() {
    this.server.listen(80);
  }

  addRoute(route: string, handler: LancacheRequestListener) {
    this.routes.set(route, handler);
  }

  async getConnections() {
    return new Promise<number>((resolve, reject) => {
      this.server.getConnections((error, count) => {
        return resolve(count);
      })
    });
  }
}
