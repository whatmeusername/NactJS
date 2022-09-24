import { isClassInstance } from "../../shared/index";
import { NactRouteWare } from "../../routing";
import { mapHandlers } from "../../expections/utils";
import type { HttpExpectionHandler } from "../../expections/index";
import { ROUTE__CONFIG } from "../../nact-constants";

function useHandler(...handlers: ({ new (...args: any[]): HttpExpectionHandler } | HttpExpectionHandler)[]) {
	return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
		if (handlers.length > 0) {
			let routeHandlers: NactRouteWare | undefined = undefined;
			if (isClassInstance(target) && !descriptor) {
				const routeConfig = Reflect.getMetadata(ROUTE__CONFIG, target) ?? {};
				routeHandlers = routeConfig["handlers"];
				if (!routeHandlers) {
					routeHandlers = { fns: [] } as NactRouteWare;
					routeConfig["handlers"] = routeHandlers;
				}
				mapHandlers(handlers, routeHandlers.fns);
				Reflect.defineMetadata(ROUTE__CONFIG, routeConfig, target);
				return target;
			} else if (isClassInstance(target) && typeof descriptor === "object") {
				const routeConfig = Reflect.getMetadata(ROUTE__CONFIG, descriptor.value) ?? {};
				routeHandlers = routeConfig["handlers"];
				if (!routeHandlers) {
					routeHandlers = { fns: [] } as NactRouteWare;
					routeConfig["handlers"] = routeHandlers;
				}
				mapHandlers(handlers, routeHandlers.fns);
				Reflect.defineMetadata(ROUTE__CONFIG, routeConfig, descriptor.value);
				return descriptor;
			}
		}
	};
}

export { useHandler };
