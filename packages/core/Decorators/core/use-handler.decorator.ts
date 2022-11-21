import { isClassInstance } from "../../shared/index";
import { NactRouteWare } from "../../routing";
import type { HttpExpectionHandler } from "../../expections/index";
import { ROUTE__CONFIG } from "../../nact-constants";
import { mapWareInstance } from "../Utils";

const HANDLER_VAR_NAME = "handlers";
const GUARDS_VAR_NAME = "guards";
const MIDDLEWARE_VAR_NAME = "middleware";
const AFTERWARE_VAR_NAME = "afterware";

export { HANDLER_VAR_NAME, GUARDS_VAR_NAME, MIDDLEWARE_VAR_NAME, AFTERWARE_VAR_NAME };

type WareGeneric =
	| ((...args: any[]) => any)
	| {
			new (...args: any[]): any;
	  }
	| { new (...args: any[]): HttpExpectionHandler }
	| HttpExpectionHandler;

function createWareDecorator<T extends any = null>(WareName: string) {
	return function (...items: T extends null ? WareGeneric[] : T[]) {
		return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
			if (items.length > 0) {
				if (isClassInstance(target) && !descriptor) {
					const routeConfig = Reflect.getMetadata(ROUTE__CONFIG, target) ?? {};
					let routeWare = routeConfig[WareName];
					if (!routeWare) {
						routeWare = { fns: [] } as NactRouteWare;
						routeConfig[WareName] = routeWare;
					}
					mapWareInstance(items, routeWare.fns);
					Reflect.defineMetadata(ROUTE__CONFIG, routeConfig, target);
					return target;
				} else if (isClassInstance(target) && typeof descriptor === "object") {
					const routeConfig = Reflect.getMetadata(ROUTE__CONFIG, descriptor.value) ?? {};
					let routeWare = routeConfig[WareName];
					if (!routeWare) {
						routeWare = { fns: [] } as NactRouteWare;
						routeConfig[WareName] = routeWare;
					}
					mapWareInstance(items, routeWare.fns);
					Reflect.defineMetadata(ROUTE__CONFIG, routeConfig, descriptor.value);

					return descriptor;
				}
			}
		};
	};
}

const useHandler = createWareDecorator<{ new (...arg: any[]): HttpExpectionHandler } | HttpExpectionHandler>(
	HANDLER_VAR_NAME,
);
const useGuard = createWareDecorator<(...args: any[]) => boolean>(GUARDS_VAR_NAME);

// TBD
//const useMiddleware = createWareDecorator<(...args: any[]) => void>("middlewares");
//const useAfterware = createWareDecorator<(...args: any[]) => void>("middlewares");

export { useHandler, useGuard };
