import { NactIncomingMessage, NactServerResponse } from "../nact-request";

abstract class NactMiddleware {
	abstract use(ctx?: any): void;
	abstract use(req?: NactIncomingMessage, res?: NactServerResponse, next?: any): void;
}

export { NactMiddleware };
