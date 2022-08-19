import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../nact-request/index";

const Ip = createRouteParamDecorator(function (req: NactRequest) {
	return req.ip;
});

export { Ip };
