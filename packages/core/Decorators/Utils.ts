import type { HttpExpectionHandler } from "../expections";
import { NactConfigItem } from "../routing";
import { isInitializedClass, isFunc } from "../shared";
import { ROUTE__PARAMETER__METADATA, ROUTE__PARAMS } from "../nact-constants";
import { NactRequest } from "../nact-request";

function setMetaData(target: any, routeKey: string, key: string, value: any): any {
	const currentMetaData = Reflect.getMetadata(ROUTE__PARAMETER__METADATA, target.constructor, routeKey);
	if (currentMetaData) {
		const propertyExists = currentMetaData[key];
		if (propertyExists) {
			currentMetaData[key].unshift(value);
		} else {
			currentMetaData[key] = [value];
		}
	} else {
		return { [key]: [value] };
	}
	return currentMetaData;
}

function createRouteParamDecorator(func: (req: NactRequest) => any) {
	return function (target: any, key: string, index: any): any {
		Reflect.defineMetadata(
			ROUTE__PARAMETER__METADATA,
			setMetaData(target, key, ROUTE__PARAMS, func),
			target.constructor,
			key,
		);
	};
}

function mapWareInstance(items: any[], storeAt: NactConfigItem[]): NactConfigItem[] {
	for (let i = 0; i < items.length; i++) {
		const handler = items[i];
		let inject = false;
		let name = "";
		let isFuncType = isFunc(handler);
		const isInitialized = isInitializedClass(handler);
		if (isFuncType && !isInitialized) {
			inject = true;
			name = (handler as { new (): any }).name;
		} else {
			inject = false;
			name = isFuncType ? (handler as Function).name : (handler as new () => any).constructor.name;
		}
		storeAt.push({
			name: name,
			inject: inject,
			instance: handler as any,
		});
	}
	return storeAt;
}

export { createRouteParamDecorator, mapWareInstance };
