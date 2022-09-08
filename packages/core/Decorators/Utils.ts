import { ROUTE__PARAMETER__METADATA, ROUTE__PATH, ROUTE__METHOD, ROUTE__PARAMS } from "../nact-constants/index";
import { getNactLogger } from "../nact-logger/logger";
import { NactRequest } from "../nact-request/index";

import { getPathSchema } from "../../utils/RoutingUtils";
import { removeSlashes } from "../../utils/Other";

import type { ChildRouteSchema, RouteChild } from "../../../app";

const getRegexPreset = (regexString: string): string => {
	if (regexString === "*") {
		regexString = ".*";
	}
	return regexString;
};

const getRouteData = (path: string | RegExp, propertyKey: string): RouteChild => {
	let clearedPath = null;
	let pathSchema: ChildRouteSchema = [];
	let isAbsolute = false;
	let dynamicIndexes: number[] = [];
	const isRegex = path instanceof RegExp;
	if (!isRegex) {
		clearedPath = removeSlashes(path);
		pathSchema = getPathSchema(clearedPath);

		dynamicIndexes = [];
		isAbsolute = true;
		pathSchema.forEach((seg, index) => {
			if (seg?.parameter) {
				isAbsolute = false;
			}
		});
	} else if (isRegex) {
		pathSchema = [{ name: null, regexp: path as RegExp }];
	}

	return {
		path: clearedPath,
		name: propertyKey,
		method: "GET",
		absolute: isAbsolute,
		schema: pathSchema,
		dynamicIndexes: dynamicIndexes,
	};
};

const setMethodForRoute = (
	descriptor: TypedPropertyDescriptor<any>,
	method: string,
	paths: string | RegExp | (string | RegExp)[]
): void | null => {
	const routeMethod = Reflect.getMetadata(ROUTE__METHOD, descriptor);
	const pathMethod = Reflect.getMetadata(ROUTE__PATH, descriptor);

	let isPathsSame = false;
	if (Array.isArray(pathMethod) && Array.isArray(paths)) {
		if (pathMethod.length === paths.length) {
			isPathsSame = true;
			for (let i = 0; i < paths.length; i++) {
				if (pathMethod[i] !== paths[i]) {
					isPathsSame = false;
					break;
				}
			}
		}
	} else {
		isPathsSame = pathMethod !== paths;
	}

	if (!routeMethod && !pathMethod) {
		Reflect.defineMetadata(ROUTE__METHOD, "GET", descriptor);
		Reflect.defineMetadata(ROUTE__PATH, paths, descriptor);
	} else if (routeMethod !== method || isPathsSame) {
		const logger = getNactLogger();
		logger.error(
			`Routes can have only one path, but route with path "${pathMethod}" got another path "${
				Array.isArray(paths) ? paths.join(", ") : paths
			}"`
		);
	}
};

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

export { createRouteParamDecorator, setMethodForRoute, getRouteData };
