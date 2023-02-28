import { isClassInstance } from "../../../shared/index";
import { ClassInst, NactConfigItemMiddleWare, NactRouteWare } from "../../../routing";
import { MIDDLEWARE_DECORATOR_TYPE, ROUTE__CONFIG } from "../../../nact-constants";
import { NactConfigItem } from "../../../routing";
import { isInitializedClass, isFunction } from "../../../shared";
import { Reflector } from "../../../Reflector";
import type { WareGeneric } from "./interface";
import { isNactMiddleware, NactMiddleware } from "../../../middleware";

function mapWareInstance(items: any[], storeAt: (NactConfigItem | NactConfigItemMiddleWare)[]): NactConfigItem[] {
	for (let i = 0; i < items.length; i++) {
		let item = items[i];
		let inject = false;
		let name = "";

		let other = null;

		if (Array.isArray(item) && item.length > 0) {
			other = item[1];
			item = item[0];
		}

		if (isNactMiddleware(item?.prototype)) {
			other = Reflector.get(MIDDLEWARE_DECORATOR_TYPE, item);
		}

		let isFuncType = isFunction(item);

		const data: NactConfigItem | NactConfigItemMiddleWare = {
			name: isFuncType ? item.name : item.constructor.name,
			inject: isFuncType && !isInitializedClass(item),
			instance: item as any,
		};

		if (other) (data as NactConfigItemMiddleWare).type = other;

		storeAt.push(data);
	}
	return storeAt;
}

function createWareDecorator<T extends any = null>(WareName: string) {
	return function (...items: T extends null ? WareGeneric[] : T[]) {
		return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor): any {
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

export { createWareDecorator, mapWareInstance };
