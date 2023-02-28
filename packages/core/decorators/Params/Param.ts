import { createRouteParamDecorator } from "../Utils";
import { RouteChild, NactRequest } from "../../index";

const Param = createRouteParamDecorator(function (req: NactRequest): { [K: string]: any } {
	const route = req.getRouteData() as RouteChild;
	const routeParams: { [K: string]: any } = {};
	let requestPathSchema = req.getURLData().params;
	requestPathSchema = requestPathSchema.slice(requestPathSchema.length - route.schema.length);
	for (let i = 0; i < requestPathSchema.length; i++) {
		const param = requestPathSchema[i];
		const routeParam = route.schema[i];
		if (routeParam?.name && routeParam.parameter) {
			routeParams[routeParam.name] = param;
		}
	}
	return routeParams;
});

export { Param };
