import { LancacheRequestListener } from '../server';

export const storageSaveRoute: LancacheRequestListener = async (req, lanRes) => {
  const size = global.app.storage.saveAll();
  lanRes.writeHead(200, { 'Content-Type': 'text/plain' });
  lanRes.write(JSON.stringify({ size, done: 1 }, null, 2));
  lanRes.end();
  return;
}