import type { NactServer } from "../application/nact-application";
import type { RouteChild } from "./interface";

import { ControllerExpectionsHandler } from "../expections";

interface NactRouterChild {
	rn: string;
	RouteChild: RouteChild;
}

class NactRouter {
	private child: NactRouterChild[];
	private absolute: string[];
	private expectionHandler: ControllerExpectionsHandler;
	private instance: { new (): any };

	constructor(controller: { new (): any }, app: NactServer) {
		this.instance = controller;
		this.absolute = [];
		this.child = [];
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
		if (!this.child.find((r) => r.rn === routerName)) {
			const d = { rn: routerName, RouteChild: route };
			this.child.push(d);
			if (route.absolute) {
				this.absolute.push(routerName);
			}
		}
	}

	getChild(): NactRouterChild[];
	getChild(path?: string, method?: string | null): RouteChild | undefined;
	getChild(path?: string, method?: string | null): NactRouterChild[] | undefined | RouteChild {
		if (path) {
			const name = method ? path + "#" + method : path;
			return this.child.find((c) => c.rn === name)?.RouteChild;
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

export { NactRouter, NactRouterChild };
