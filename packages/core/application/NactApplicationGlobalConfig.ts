import { isClassInstance, isFunction } from "../shared";
import { NactRequest } from "../nact-request";
import { getRouteConfig } from "../routing";
import { GUARDS_VAR_NAME, MIDDLEWARE_VAR_NAME } from "../nact-constants";

import type { NactGuardFunc } from "../guard";
import type { HttpExpectionHandler } from "../expections";
import type { MiddlewareType, NactMiddlewareFunc, NactMiddlewareObject } from "../middleware";
import type { NactServer } from "./NactApplication";
import { runGuards, runMiddlewares } from "./WareRunners";
import { NactWareExectionDirection } from "./interface";

class NactGlobalConfig {
	private middleware: NactMiddlewareObject<MiddlewareType>[];
	private handlers: HttpExpectionHandler[];
	private guards: NactGuardFunc[];

	// pipes
	//afterware

	constructor(private readonly server: NactServer) {
		this.middleware = [];
		this.handlers = [];
		this.guards = [];
	}

	getGlobalMiddleware(): NactMiddlewareObject<MiddlewareType>[] {
		return this.middleware;
	}

	public getHandlers(): HttpExpectionHandler[];
	public getHandlers(name: string): HttpExpectionHandler | undefined;
	public getHandlers(name?: string): HttpExpectionHandler | HttpExpectionHandler[] | undefined {
		if (name) {
			return this.handlers.find((handler) => (handler as any).name === name);
		}
		return this.handlers;
	}

	public getGuards(): NactGuardFunc[] {
		return this.guards;
	}

	public addGlobalHandler(
		handler: (new (...args: any[]) => HttpExpectionHandler) | (new (...args: any[]) => HttpExpectionHandler)[],
	): void {
		const coreModule = this.server.getTransferModule().getCoreModule();
		if (Array.isArray(handler)) {
			handler.forEach((handler) => {
				const provider = coreModule?.appendProvider(handler);
				if (provider?.instance) {
					this.handlers.push(provider.instance);
				}
			});
		} else {
			const provider = coreModule?.appendProvider(handler);
			if (provider?.instance) {
				this.handlers.unshift(provider.instance);
			}
		}
	}

	public addGlobalGuard(guards: NactGuardFunc[] | NactGuardFunc): void {
		guards = Array.isArray(guards) ? guards : [guards];
		const coreModule = this.server.getTransferModule().getCoreModule();
		for (let i = 0; i < guards.length; i++) {
			const guard = guards[i];
			if (isClassInstance(guard)) {
				const provider = coreModule?.appendProvider(guard);
				if (provider?.instance) {
					this.guards.push(provider.instance);
				}
			} else if (isFunction(guard)) {
				this.guards.push(guard);
			}
		}
	}

	public addGlobalMiddleware(middleware: NactMiddlewareFunc<typeof type>, type: MiddlewareType = "nact"): void {
		if (Array.isArray(middleware)) {
			const res: NactMiddlewareObject<typeof type> = { middleware: middleware, type: type ?? "nact" };
			this.middleware = [...this.middleware, ...middleware];
		} else {
			const res = { middleware: middleware, type: type ?? "nact" };
			this.middleware.push(res);
		}
	}

	public executeWare(
		direction: NactWareExectionDirection,
		ctx: NactRequest,
		target: object | ((...args: any[]) => any) | undefined,
	): boolean {
		if (!target) return false;

		const ware = getRouteConfig(target);
		let res = true;

		if (ware) {
			if (direction === "before") {
				if (!ctx.isSended() && ware[MIDDLEWARE_VAR_NAME] && ware[MIDDLEWARE_VAR_NAME].fns.length > 0) {
					runMiddlewares(ware[MIDDLEWARE_VAR_NAME].fns, ctx);
				}
				if (!ctx.isSended() && ware[GUARDS_VAR_NAME] && ware[GUARDS_VAR_NAME].fns.length > 0) {
					res = runGuards(ware[GUARDS_VAR_NAME].fns, ctx);
				}
			}
		}
		return res;
	}

	public executeGlobalWare(direction: NactWareExectionDirection, ctx: NactRequest): boolean {
		let res = true;

		if (direction === "before") {
			if (!ctx.isSended() && this.middleware.length > 0) {
				runMiddlewares(this.middleware, ctx);
			}
			if (!ctx.isSended() && this.guards.length > 0) {
			}
		}

		return res;
	}
}

export { NactGlobalConfig };
