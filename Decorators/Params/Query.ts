import { createRouteParamDecorator } from "../Utils";
import NactRequest from "../../request";

const Query = createRouteParamDecorator(function (req: NactRequest) {
	return req.urldata.query;
});

export default Query;
