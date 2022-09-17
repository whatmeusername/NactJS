import { isClassInstance } from "../../shared/index";
import { NactRouteWare, getRouteConfig, setRouteConfig } from "../../routing";
import { mapHandlers } from "../../expections/utils";
import type { HttpExpectionHandler } from "../../expections/index";

function useHandler(...handlers: ({ new (...args: any[]): HttpExpectionHandler } | HttpExpectionHandler)[]) {
	return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
		if (handlers.length > 0) {
			let routeHandlers: NactRouteWare | undefined = undefined;
			if (isClassInstance(target) && !descriptor) {
				// TODO
			} else if (isClassInstance(target) && typeof descriptor === "object") {
				const routeConfig = getRouteConfig(target.constructor, propertyKey as string);
				routeHandlers = routeConfig["handlers"];
				if (!routeHandlers) {
					routeHandlers = { fns: [] } as NactRouteWare;
					routeConfig["handlers"] = routeHandlers;
				}
				mapHandlers(handlers, routeHandlers.fns);
				setRouteConfig(target.constructor, propertyKey as string, routeConfig);
			}
		}
	};
}

export { useHandler };
