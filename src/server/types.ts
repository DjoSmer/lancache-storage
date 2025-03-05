import { RequestListener } from "http";

import { LancacheRequest } from "./lancache-request";
import { LancacheResponse } from "./lancache-response";

export type LancacheRequestListener = RequestListener<typeof LancacheRequest, typeof LancacheResponse>;
