import { NactGuard } from "./base-guard";

function isNactGuard(value: any): value is NactGuard {
	return value instanceof NactGuard;
}

export { isNactGuard };
