import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../index";

const Body = createRouteParamDecorator(function (req: NactRequest) {
	return req.getRequest().getBody();
});

export { Body };
