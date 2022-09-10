import type { NactRequest } from "../../index";
import {
	HandleRouteResponse,
	getRouteParameters,
	ROUTE__PARAMS,
	ROUTE__PARAMETER__METADATA,
	ROUTE__OPTIONS,
	NactRouteData,
} from "../../index";

function createMethodDecorator(method: string, paths: (string | RegExp)[]) {
	return function (
		target: () => any,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<any>
	): TypedPropertyDescriptor<any> {
		const descriptorMethod = descriptor.value as (...args: any[]) => any;
		const routesData: NactRouteData = { [method]: { paths: paths, data: [], method: method } };
		Reflect.defineMetadata(ROUTE__OPTIONS, routesData, target.constructor, propertyKey);

		descriptor.value = function (request: NactRequest) {
			const routeMetadata = Reflect.getMetadata(ROUTE__PARAMETER__METADATA, target.constructor, propertyKey);
			let methodParamsVariables: any[] = [];

			if (routeMetadata) {
				const methodParams = routeMetadata[ROUTE__PARAMS] ?? [];
				methodParamsVariables = getRouteParameters(methodParams, request);
			}

			const response = descriptorMethod.apply(this, [...methodParamsVariables]);
			return HandleRouteResponse(response, descriptor, request);
		};

		return descriptor;
	};
}

const Get = (...paths: (string | RegExp)[]): any => createMethodDecorator("GET", paths);
const Post = (...paths: (string | RegExp)[]): any => createMethodDecorator("POST", paths);
const Head = (...paths: (string | RegExp)[]): any => createMethodDecorator("Head", paths);
const Trace = (...paths: (string | RegExp)[]): any => createMethodDecorator("TRACE", paths);
const Option = (...paths: (string | RegExp)[]): any => createMethodDecorator("OPTION", paths);
const Put = (...paths: (string | RegExp)[]): any => createMethodDecorator("PUT", paths);
const Delete = (...paths: (string | RegExp)[]): any => createMethodDecorator("DELETE", paths);
const Patch = (...paths: (string | RegExp)[]): any => createMethodDecorator("PATCH", paths);
const Connect = (...paths: (string | RegExp)[]): any => createMethodDecorator("CONNECT", paths);

export { Get, Post, Head, Trace, Option, Put, Delete, Patch, Connect };
