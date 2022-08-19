import { ROUTE__PARAMS, ROUTE__PARAMETER__METADATA, ROUTE__OPTIONS } from "../../nact-constants/index";

import { setMethodForRoute, getRouteData } from "../Utils";
import { HandleRouteResponse, getRouteParameters } from "../../utils/RoutingUtils";
import type { NactRequest } from "../../nact-request/index";

function Get(path: string): any {
	return function (
		target: () => any,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<any>
	): TypedPropertyDescriptor<any> {
		const descriptorMethod = descriptor.value as (...args: any[]) => any;
		setMethodForRoute(descriptor, "GET", path);

		const routeData = getRouteData(path, target, propertyKey, descriptor);
		Reflect.defineMetadata(ROUTE__OPTIONS, routeData, target.constructor, propertyKey);

		descriptor.value = function (request: NactRequest) {
			const routeMetadata = Reflect.getMetadata(ROUTE__PARAMETER__METADATA, target.constructor, propertyKey);
			let methodParamsVariables: any[] = [];

			if (routeMetadata) {
				const methodParams = routeMetadata[ROUTE__PARAMS] ?? [];
				methodParamsVariables = getRouteParameters(routeData, methodParams, request);
			}

			const response = descriptorMethod.apply(this, [...methodParamsVariables]);
			return HandleRouteResponse(response, descriptor, request);
		};

		return descriptor;
	};
}

export { Get };
