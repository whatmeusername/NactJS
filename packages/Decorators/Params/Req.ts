import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../nact-request/index";

const Req = createRouteParamDecorator(function (req: NactRequest) {
	return req;
});

export { Req };
