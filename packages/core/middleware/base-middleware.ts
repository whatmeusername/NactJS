import { NactIncomingMessage, NactServerResponse } from "../nact-request";

abstract class NactMiddleware {
	abstract use(req?: NactIncomingMessage, res?: NactServerResponse, next?: any): void;
}

export { NactMiddleware };
