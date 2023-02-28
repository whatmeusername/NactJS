import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../index";

const Body = createRouteParamDecorator(function (req: NactRequest): any {
	return req.getRequest().getBody();
});

export { Body };
