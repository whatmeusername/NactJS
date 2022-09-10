import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../index";

const Req = createRouteParamDecorator(function (req: NactRequest) {
	return req;
});

export { Req };
