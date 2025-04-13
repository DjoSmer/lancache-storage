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

  constructor(req: LancacheRequest) {
    super(req);

    this.on('close', () => {
      this.accessLog();
      this.logger.close();
    });
  }

  sendFileFromStorage() {
    const storageFile = this.storageFile;

    if (!storageFile) {
      this.writeHead(400, 'Storage file does not exist');
      this.end();
      return;
    }

    this.sendFile(storageFile.filepath);
  }

  sendFile(filepath: string) {
    const rid = this.req.rid;

    let stream: fs.ReadStream | null = null;

    this.on('close', () => {
      if (stream) stream.close();
    });

    try {
      const stat = fs.statSync(filepath);
      const total = stat.size;
      const rangeHeader = this.req.headers.range;

      this.storageStatus('HIT');

      this.logger.debug(`Stream file is stating: ${rid}`);

      //Complete file
      if (!rangeHeader) {
        stream = fs.createReadStream(filepath)
          .on('end', () => {
            this.logger.debug(`Stream is done: ${rid}`);
          });
        stream.pipe(this);
        return;
      }

      const ranges = rangeParser(total, rangeHeader);

      if (!Array.isArray(ranges)) {
        this.writeHead(416, { 'Content-Range': `bytes */${total}` });
        this.end();
        return;
      }

      // Ranges
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

          stream = fs.createReadStream(filepath, { start: range.start, end: range.end });
          stream.on('end', () => {
            stream?.close();
            callback();
          });
          stream.pipe(this, { end: false });
        };

        const sendNext = (index: number) => {
          if (index < ranges.length) {
            sendPart(ranges[index], () => sendNext(index + 1));
          } else {
            this.end(`\r\n--${boundary}--\r\n`);
            this.logger.debug(`Ranges Stream are done: ${rid}`);
          }
        };

        sendNext(0);
      } else {
        // Single range
        const range = ranges[0];
        this.writeHead(206, {
          'Content-Range': `bytes ${range.start}-${range.end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': (range.end - range.start) + 1,
        });

        stream = fs.createReadStream(filepath, { start: range.start, end: range.end })
          .on('end', () => {
            this.logger.debug(`Range Stream is done: ${rid}`);
          });
        stream.pipe(this);
      }

    } catch (err) {
      this.writeHead(500, 'When trying to send a file, something went wrong');
      this.end();
      this.logger.error(err);
    }
  }

  accessLog() {
    const req = this.req;
    this.logger.info(`[${req.requestId}] ${req.getIp()} > ${req.headers.host}${req.url} ${this.statusCode} ${this._storageStatus}`);
  }

  storageStatus(storageStatus: LancacheResponse['_storageStatus']) {
    this._storageStatus = storageStatus;
    this.setHeader('X-Lancache-Status', storageStatus);
  }
}
