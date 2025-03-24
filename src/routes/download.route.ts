import { LancacheRequestListener } from '../server';

export const downloadRoute: LancacheRequestListener = async (req, lanRes) => {
  if (!req.urlClass.pathname.match(/^\/download\/.*/)) return false;
  lanRes.sendFile(global.app.storage.storagePath + req.urlClass.pathname);
  return true;
}