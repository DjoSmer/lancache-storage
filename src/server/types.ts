import { LancacheRequest } from "./lancache-request";
import { LancacheResponse } from "./lancache-response";

export type LancacheRequestListener = (req: InstanceType<typeof LancacheRequest>, res: InstanceType<typeof LancacheResponse> & { req: InstanceType<typeof LancacheRequest> }) => Promise<boolean>
