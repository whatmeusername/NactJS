import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../index";

const Ctx = createRouteParamDecorator(function (req: NactRequest): NactRequest {
	return req;
});

export { Ctx };
