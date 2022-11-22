import type { NactRequest } from "../nact-request";

type NactGuardFunc = (ctx: NactRequest) => boolean;

export type { NactGuardFunc };
