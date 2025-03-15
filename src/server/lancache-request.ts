import { IncomingMessage } from "http";
import { Socket } from 'net';

export class LancacheRequest extends IncomingMessage {
    requestId = Date.now();
    rid: string;

    constructor(socket: Socket) {
        super(socket);
        this.rid = `${this.requestId}`;
    }

    getIp() {
        const ip = this.headers['x-real-ip'];
        return ip ? ip.toString() : this.socket.remoteAddress || 'ip-unknown';
    }
}
