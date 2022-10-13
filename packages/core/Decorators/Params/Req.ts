import { createRouteParamDecorator } from "../Utils";
import { NactIncomingMessage, NactRequest } from "../../index";

const Req = createRouteParamDecorator(function (req: NactRequest): NactIncomingMessage {
	return req.getRequest();
});

export { Req };
