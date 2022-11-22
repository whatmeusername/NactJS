import { NactRequest } from "../nact-request";

abstract class NactGuard {
	abstract validate(ctx: NactRequest): boolean;
}

export { NactGuard };
