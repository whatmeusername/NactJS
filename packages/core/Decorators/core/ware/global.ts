import { isClassInstance } from "../../../shared/index";
import { NactConfigItemMiddleWare, NactRouteWare } from "../../../routing";
import { MIDDLEWARE_VAR_NAME, ROUTE__CONFIG } from "../../../nact-constants";
import { NactConfigItem } from "../../../routing";
import { isInitializedClass, isFunc } from "../../../shared";
import { Reflector } from "../../../Reflector";
import type { WareGeneric } from "./interface";
import { NactMiddleware } from "../../../middleware";

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
		if (item instanceof NactMiddleware) {
			other = Reflector.get(MIDDLEWARE_VAR_NAME, item);
		}

		let isFuncType = isFunc(item);
		const isInitialized = isInitializedClass(item);
		if (isFuncType && !isInitialized) {
			inject = true;
			name = (item as { new (): any }).name;
		} else {
			inject = false;
			name = isFuncType ? (item as Function).name : (item as new () => any).constructor.name;
		}

		const data: NactConfigItem | NactConfigItemMiddleWare = {
			name: name,
			inject: inject,
			instance: item as any,
		};

		if (other) (data as NactConfigItemMiddleWare).type = other;

		storeAt.push(data);
	}
	return storeAt;
}

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

export { createWareDecorator, mapWareInstance };
