import fs from 'fs';
import http from 'http';
import winston from 'winston';

import { LancacheRequest } from '@app/server';
import { StorageFile } from '@app/storage/storage-file';

export const downloadToStorage = async (lanReq: LancacheRequest, storageFile: StorageFile, logger: winston.Logger): Promise<StorageFile['status']> => {
  const rid = lanReq.rid;
  const { range, ...headers } = lanReq.headers;

  return new Promise<StorageFile['status']>((resolve, reject) => {
    http.get(`http://${lanReq.headers.host}${lanReq.url}`,
      {
        method: 'GET',
        headers,
        timeout: 15000,
      },
      (res) => {
        if (!res.statusCode || res.statusCode > 299) {
          return reject('noSave');
        }

        const fileStream = fs.createWriteStream(storageFile.filepath);
        const handleFinish = () => {
          logger.debug(`File was saved in the storage: ${rid}`);
          fileStream.close();
          return resolve('success');
        }

        fileStream.on('finish', handleFinish);

        res.on('error', (err) => {
          fileStream.removeListener('finish', handleFinish);
          fileStream.close();
          logger.error(`When saving to the storage: ${rid}`, err);
          return reject('error');
        });

        storageFile.headers = res.headers as Record<string, string>;
        res.pipe(fileStream);
      })
      .on('error', (e) => {
        logger.error(`Got error: ${rid} - ${e.message}`);
        return reject('error');
      })
      .on('timeout', () => {
        logger.error(`Can download a file timeout is done. ${rid}`);
        return reject('error');
      });
  });
}