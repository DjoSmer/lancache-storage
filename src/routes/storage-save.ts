import { LancacheRequestListener } from '../server';

export const storageSaveRoute: LancacheRequestListener = async (req, lanRes) => {
  const instances = global.app.storage.saveAll();
  lanRes.writeHead(200, { 'Content-Type': 'application/json' });
  lanRes.write(JSON.stringify({ size: instances.length, instances }));
  lanRes.end();
  return;
}