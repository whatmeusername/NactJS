import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../index";

const Query = createRouteParamDecorator(function (req: NactRequest) {
	return req.urldata.query;
});

export { Query };
