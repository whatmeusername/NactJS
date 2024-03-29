import { HANDLER__ALLOWED__EXPECTIONS } from "../nact-constants/router.const";
import type { NactRequest } from "../nact-request/ctx";
import { Reflector } from "../Reflector";
import { HttpExpection } from "./base-http-expection.expection";
import { getNamesForExpectionHandler, isExpectionObject } from "./utils";
import { HTTP_STATUS_MESSAGES, HTTP_STATUS_CODES } from "../nact-constants";

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
		if (!this.acceptAny && expection instanceof HttpExpection) {
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

class BaseHttpExpectionHandler extends HttpExpectionHandler {
	public catch(expection: HttpExpection, ctx: NactRequest): boolean {
		if (expection instanceof HttpExpection) {
			const response = ctx.getResponse();

			const resBody = expection.getBody();
			if (isExpectionObject(resBody)) {
				response.status(expection.getStatus());
				response.json(resBody);
				return true;
			} else {
				return this.handleUnknowException(expection, ctx);
			}
		} else {
			return this.handleUnknowException(expection, ctx);
		}
	}

	private handleUnknowException(expection: any, ctx: NactRequest): boolean {
		const response = ctx.getResponse();
		const res = isExpectionObject(expection)
			? {
					statusCode: expection.statusCode ?? HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
					message: expection.message ?? HTTP_STATUS_MESSAGES.InternalServerError,
			  }
			: { statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, message: HTTP_STATUS_MESSAGES.InternalServerError };

		ctx.setPayload(res);
		response.json(res);
		return true;
	}
}

export { HttpExpectionHandler, BaseHttpExpectionHandler };
