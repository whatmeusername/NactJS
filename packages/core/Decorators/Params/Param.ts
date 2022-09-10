import { createRouteParamDecorator } from "../Utils";
import { RouteChild, NactRequest } from "../../index";

const Param = createRouteParamDecorator(function (req: NactRequest) {
	const route = req.route as RouteChild;
	const routeParams: { [K: string]: any } = {};
	let requestPathSchema = req.urldata.params;
	requestPathSchema = requestPathSchema.slice(requestPathSchema.length - route.schema.length);
	for (let i = 0; i < requestPathSchema.length; i++) {
		const param = requestPathSchema[i];
		const routeParam = route.schema[i];
		if (routeParam?.name && typeof routeParam === "object") {
			routeParams[routeParam.name] = param;
		}
	}
	return routeParams;
});

export { Param };
