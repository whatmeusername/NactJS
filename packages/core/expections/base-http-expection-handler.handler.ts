import { HANDLER__ALLOWED__EXPECTIONS } from "../nact-constants/router.const";
import type { NactRequest } from "../nact-request/request";
import { Reflector } from "../Reflector";
import { isClassInstance } from "../shared";
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
	}

	canAccept(expection: HttpExpection | { new (...args: any): HttpExpection }): boolean {
		if (!this.acceptAny) {
			const expectionName = isClassInstance(expection) ? expection.name : "";
			return this.acceptExpections.includes(expectionName);
		}
		return true;
	}

	abstract catch(expection: HttpExpection, request: NactRequest): void;
}

export { HttpExpectionHandler };
