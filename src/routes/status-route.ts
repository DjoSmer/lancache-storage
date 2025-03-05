import { LancacheRequestListener } from '../server';

export const statusRoute: LancacheRequestListener = async (req, lanRes) => {
  const connectCount = await global.app.httpServer.getConnections();
  lanRes.writeHead(200, { 'Content-Type': 'text/plain' });
  lanRes.write(JSON.stringify({ connectCount }, null, 2));
  lanRes.end();
  return;
}