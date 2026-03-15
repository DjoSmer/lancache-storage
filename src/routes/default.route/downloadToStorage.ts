import fs from 'fs';
import winston from 'winston';
import { pipeline as streamPipeline } from 'node:stream/promises';

import { LancacheRequest } from '@app/server';
import { StorageFile } from '@app/storage/storage-file';
import { StorageFileStatusEnum } from '@app/storage';


export const downloadToStorage = async (lanReq: LancacheRequest, storageFile: StorageFile, logger: winston.Logger): Promise<StorageFile['status']> => {
  const rid = lanReq.rid;
  const { range, ...headers } = lanReq.headers;
  const got = (await import('got')).default;

  return new Promise<StorageFile['status']>((resolve, reject) => {
    const readStream = got.stream(`http://${lanReq.headers.host}${lanReq.url}`, {
      retry: {
        limit: 2
      },
      headers,
      dnsCache: true,
      dnsLookupIpVersion: 4
    });

    const onError = (e: Error) => {
      logger.error(`Got error: ${rid} - ${e.message}`);
      setTimeout(() => {
        reject('error');
      }, 3 * 60 * 1000);
    };

    readStream.on('response', async (res) => {
      if (!res?.statusCode || res?.statusCode > 299) {
        return resolve('noSave');
      }

      const fileStream = fs.createWriteStream(storageFile.filepath);
      const handleFinish = () => {
        logger.debug(`File was saved in the storage: ${rid}`);
        fileStream.close();
        return resolve(StorageFileStatusEnum.success);
      };
      readStream.off('error', onError);

      try {
        await streamPipeline(readStream, fileStream);
        handleFinish();
      } catch (error) {
        fileStream.close();
        logger.error(`When saving to the storage: ${rid}`);
        console.log(error);
        setTimeout(() => {
          reject('error');
        }, 3 * 60 * 1000);
      }

    });

    readStream.once('error', onError);
  });
};
