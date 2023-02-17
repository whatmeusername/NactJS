import type { RouteChild } from "./interface";

class RouteHandlerData {
	private ControllerInstance: new (...args: any) => any;
	private routeClass: object;
	private routeMethod: ((...args: any[]) => any) | undefined;
	private routeData: RouteChild;
	private routeArgs: any[];

	constructor(rc: new (...args: any) => any, rm: ((...args: any[]) => any) | undefined, rd: RouteChild) {
		this.ControllerInstance = rc;
		this.routeClass = rc.constructor;
		this.routeMethod = rm;
		this.routeData = rd;
		this.routeArgs = [];
	}

	set __routeMethod(value: (...args: any[]) => any) {
		this.routeMethod = value;
	}

	set __routeArgs(value: any[]) {
		this.routeArgs = value;
	}

	callMethod(): any {
		if (this.routeMethod) {
			return this.routeMethod.apply(this.ControllerInstance, this.routeArgs);
		}
		return undefined;
	}

	getArgs(): any[] {
		return this.routeArgs;
	}

	getHandlerClass(): object {
		return this.routeClass;
	}

	getHandler(): ((...args: any[]) => any) | undefined {
		return this.routeMethod;
	}

	getRouteData(): RouteChild {
		return this.routeData;
	}
}

export { RouteHandlerData };
