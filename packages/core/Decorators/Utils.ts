import { ROUTE__PARAMETER__METADATA, ROUTE__PARAMS, NactRequest } from "../index";

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

function setParameterValue(paramKey: string) {
	return function (target: any, key: string): any {
		Reflect.defineMetadata(
			ROUTE__PARAMETER__METADATA,
			setMetaData(target, key, "params", paramKey),
			target.constructor,
			key
		);
	};
}

function createRouteParamDecorator(func: (req: NactRequest) => any) {
	return function (target: any, key: string, index: any): any {
		Reflect.defineMetadata(
			ROUTE__PARAMETER__METADATA,
			setMetaData(target, key, ROUTE__PARAMS, func),
			target.constructor,
			key
		);
	};
}

export { createRouteParamDecorator };
