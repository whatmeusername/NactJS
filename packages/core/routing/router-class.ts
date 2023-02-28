import type { NactServer } from "../application/NactApplication";
import type { NactRouterChild, RouteChild } from "./interface";

import { ControllerExpectionsHandler } from "../expections";

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

	public getInstance(): { new (): any } {
		return this.instance;
	}

	public getControllerHandler(): ControllerExpectionsHandler {
		return this.expectionHandler;
	}

	public addRoute(route: RouteChild): void {
		const routerName = route.path + "#" + route.method;
		if (!this.child.find((r) => r.rn === routerName)) {
			const d = { rn: routerName, RouteChild: route };
			this.child.push(d);
			if (route.absolute) {
				this.absolute.push(routerName);
			}
		}
	}

	public getChild(): NactRouterChild[];
	public getChild(path?: string, method?: string | null): RouteChild | undefined;
	public getChild(path?: string, method?: string | null): NactRouterChild[] | undefined | RouteChild {
		if (path) {
			const name = method ? path + "#" + method : path;
			return this.child.find((c) => c.rn === name)?.RouteChild;
		}
		return this.child;
	}

	public getAbsolute(): string[] {
		return this.absolute;
	}

	public hasAbsolute(path: string, method?: string | null): boolean {
		const name = method ? path + "#" + method : path;
		return this.absolute.includes(name);
	}

	public getAbsoluteOrNull(path: string, method?: string | null): RouteChild | null {
		const name = method ? path + "#" + method : path;
		return this.child.find((c) => c.rn === name && c.RouteChild.absolute)?.RouteChild ?? null;
	}
}

export { NactRouter };
