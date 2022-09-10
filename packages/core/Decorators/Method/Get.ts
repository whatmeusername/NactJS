import type { NactRequest } from "../../index";
import {
	HandleRouteResponse,
	getRouteParameters,
	ROUTE__PARAMS,
	ROUTE__PARAMETER__METADATA,
	ROUTE__OPTIONS,
	NactRouteData,
} from "../../index";

function Get(...paths: (string | RegExp)[]): any {
	return function (
		target: () => any,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<any>
	): TypedPropertyDescriptor<any> {
		const descriptorMethod = descriptor.value as (...args: any[]) => any;
		const routesData: NactRouteData = { ["GET"]: { paths: paths, data: [], method: "GET" } };
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

export { Get };
