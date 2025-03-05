import fs from 'fs';
import { ServerResponse } from 'http';
import rangeParser from 'range-parser';

import { createLogger } from '../logger';
import { LancacheRequest } from './lancache-request';
import { StorageFile } from '../storage/storage-file';

export class LancacheResponse extends ServerResponse<LancacheRequest> {
  storageFile?: StorageFile;
  private _storageStatus: 'HIT' | 'MISS' = 'MISS';
  private logger = createLogger(LancacheResponse.name);
  lanHeaders: Record<string, string> = {};

  sendFileFromStorage() {
    const rid = this.req.rid;
    const storageFile = this.storageFile;

    if (!storageFile) {
      this.writeHead(400, 'Storage file does not exist');
      this.end();
      return;
    }

    try {
      const stat = fs.statSync(storageFile.filepath);
      const total = stat.size;
      const rangeHeader = this.req.headers.range;

      const headers = new Headers(storageFile.headers);
      this.setHeaders(headers);
      this.storageStatus('HIT');

      this.logger.debug(`Stream file is stating: ${rid}`);

      if (!rangeHeader) {
        fs.createReadStream(storageFile.filepath)
          .pipe(this)
          .on('end', () => {
            storageFile.increaseDownloadCount();
            storageFile.close();
            this.logger.debug(`Stream is done: ${rid}`);
          });
        return;
      }

      const ranges = rangeParser(total, rangeHeader);

      if (!Array.isArray(ranges)) {
        this.writeHead(416, { 'Content-Range': `bytes */${total}` });
        this.end();
        return;
      }

      if (ranges.length > 1) {
        const contentType = this.getHeader('Content-Type');
        const boundary = 'MULTIPART_BOUNDARY';
        this.removeHeader('Content-Length');
        this.writeHead(206, {
          'Content-Type': `multipart/byteranges; boundary=${boundary}`,
        });

        const sendPart = (range: rangeParser.Range, callback: () => void) => {
          this.write(`\r\n--${boundary}\r\n`);
          this.write(`Content-Type: ${contentType}\r\n`);
          this.write(`Content-Range: bytes ${range.start}-${range.end}/${total}\r\n\r\n`);
          const stream = fs.createReadStream(storageFile.filepath, { start: range.start, end: range.end });
          stream.on('end', callback);
          stream.pipe(this, { end: false });
        };

        const sendNext = (index: number) => {
          if (index < ranges.length) {
            sendPart(ranges[index], () => sendNext(index + 1));
          } else {
            this.end(`\r\n--${boundary}--\r\n`);
            storageFile.increaseDownloadCount();
            storageFile.close();
            this.logger.debug(`Ranges Stream are done: ${rid}`);
          }
        };

        sendNext(0);
      } else {
        // Один диапазон
        const range = ranges[0];
        this.writeHead(206, {
          'Content-Range': `bytes ${range.start}-${range.end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': (range.end - range.start) + 1,
          // 'Content-Type': 'video/mp4',
        });
        fs.createReadStream(storageFile.filepath, { start: range.start, end: range.end })
          .pipe(this)
          .on('end', () => {
            storageFile.increaseDownloadCount();
            storageFile.close();
            this.logger.debug(`Range Stream is done: ${rid}`);
          });
      }

    } catch (err) {
      storageFile.close();
      this.writeHead(500, 'When trying to send a file, something went wrong');
      this.end();
      this.logger.error(err);
    }
  }

  accessLog() {
    const req = this.req;
    this.logger.info(`[${req.requestId}] Host: ${req.headers.host}${req.url} storageStatus: hit/miss `);
  }

  storageStatus(storageStatus: LancacheResponse['_storageStatus']) {
    this._storageStatus = storageStatus;
    this.setHeader('X-Lancache-Status', storageStatus);
  }
}
