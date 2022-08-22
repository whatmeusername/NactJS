import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../nact-request/index";

const Query = createRouteParamDecorator(function (req: NactRequest) {
	return req.urldata.query;
});

export { Query };
