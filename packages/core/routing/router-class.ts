import type { NactServer } from "../application/nact-application";
import type { RouteChild } from "./interface";

import { ControllerExpectionsHandler } from "../expections";

class NactRouter {
	private child: { [K: string]: RouteChild };
	private absolute: string[];
	private expectionHandler: ControllerExpectionsHandler;
	private instance: { new (): any };

	constructor(controller: { new (): any }, app: NactServer) {
		this.instance = controller;
		this.absolute = [];
		this.child = {};
		this.expectionHandler = new ControllerExpectionsHandler(app, controller);
	}

	getInstance(): { new (): any } {
		return this.instance;
	}

	getControllerHandler(): ControllerExpectionsHandler {
		return this.expectionHandler;
	}

	addRoute(route: RouteChild): void {
		const routerName = route.path + "#" + route.method;
		if (!this.child[routerName]) {
			this.child[routerName] = route;
			if (route.absolute) {
				this.absolute.push(routerName);
			}
		}
	}

	getChild(): { [K: string]: RouteChild };
	getChild(path?: string, method?: string | null): RouteChild | undefined;
	getChild(path?: string, method?: string | null): { [K: string]: RouteChild } | undefined | RouteChild {
		if (path) {
			const name = method ? path + "#" + method : path;
			return this.child[name];
		}
		return this.child;
	}

	getAbsolute(): string[] {
		return this.absolute;
	}

	hasAbsolute(path: string, method?: string | null): boolean {
		const name = method ? path + "#" + method : path;
		return this.absolute.includes(name);
	}
}

export { NactRouter };
