import { NactMiddleware } from "./base-middleware";

function isNactMiddleware(value: any): value is NactMiddleware {
	return value instanceof NactMiddleware;
}

export { isNactMiddleware };
