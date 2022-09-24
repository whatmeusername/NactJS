import { HANDLER__ALLOWED__EXPECTIONS } from "../nact-constants/router.const";
import type { NactRequest } from "../nact-request/request";
import { Reflector } from "../Reflector";
import type { HttpExpection } from "./base-http-expection.expection";
import { getNamesForExpectionHandler } from "./utils";

abstract class HttpExpectionHandler {
	private acceptExpections: string[];
	private acceptAny: boolean;

	constructor() {
		this.acceptExpections = [];
		this.acceptAny = this.acceptExpections.length === 0;
		this.__getAcceptNames();
	}
	private __getAcceptNames(): void {
		const acceptExpections = Reflector.get(HANDLER__ALLOWED__EXPECTIONS, this);
		this.acceptExpections = getNamesForExpectionHandler(acceptExpections);
		this.acceptAny = this.acceptExpections.length === 0;
	}

	canAccept(expection: HttpExpection | { new (...args: any): HttpExpection }): boolean {
		if (!this.acceptAny) {
			const expectionName = expection instanceof Error ? expection.constructor.name : "";
			return this.acceptExpections.includes(expectionName);
		}
		return true;
	}

	accept(expection: HttpExpection, ctx: NactRequest): boolean {
		if (this.canAccept(expection)) {
			this.catch(expection, ctx);
			return true;
		}
		return false;
	}

	abstract catch(expection: HttpExpection, request: NactRequest): void;
}

class BaseHttpExpectionHandler extends HttpExpectionHandler{
	catch(expection: HttpExpection, ctx: NactRequest){

	}
}

export { HttpExpectionHandler };
