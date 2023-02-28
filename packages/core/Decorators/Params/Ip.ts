import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../index";

const Ip = createRouteParamDecorator(function (req: NactRequest): string | null {
	return req.getIP();
});

export { Ip };
