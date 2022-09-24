import { NactServer } from "../application";
import { isController } from "../Module";
import { NactRequest } from "../nact-request";
import { getRouteConfig, NactRouteWare } from "../routing";
import { isInitializedClass } from "../shared";
import { HttpExpectionHandler } from "./base-http-expection-handler.handler";
import { HttpExpection } from "./base-http-expection.expection";

function mapHandlers(handlers: NactRouteWare | undefined): HttpExpectionHandler[] {
	const res: HttpExpectionHandler[] = [];
	if (handlers) {
		handlers.fns.forEach((handler) => {
			if (isInitializedClass(handler.instance)) {
				res.push(handler.instance as any);
			}
		});
	}
	return res;
}

class ControllerExpectionsHandler {
	private readonly router: object;
	private handlers: HttpExpectionHandler[];
	constructor(app: NactServer, RouterClass: object) {
		this.handlers = [];
		this.router = this.__setRouter(RouterClass);
		this.__getFilters(app);
	}

	private __setRouter(RouterClass: any): object | Error {
		if (isController(RouterClass.constructor)) {
			return RouterClass;
		} else {
			throw new Error();
			// TODO
		}
	}
	private __getFilters(app: NactServer): void {
		const global = app.getGlobalConfig().getHandlers();
		const controller = getRouteConfig(this.router);
		const contorllerInstances: HttpExpectionHandler[] = mapHandlers(controller?.handlers);
		this.handlers = [...contorllerInstances, ...global];
	}

	handle(expection: HttpExpection, ctx: NactRequest): boolean {
		const routeMethod = ctx.getHandler();
		const methodHandlers = getRouteConfig(routeMethod)?.handlers;
		const instances: HttpExpectionHandler[] = mapHandlers(methodHandlers);
		const orderedFilters: HttpExpectionHandler[] = [...instances, ...this.handlers];
		for (let i = 0; i < orderedFilters.length; i++) {
			const filter = orderedFilters[i];
			if (filter.accept(expection, ctx)) return true;
		}

		return false;
	}
}

export { ControllerExpectionsHandler };
