import { createRouteParamDecorator } from "../Utils";
import NactRequest from "../../request";

const Req = createRouteParamDecorator(function (req: NactRequest) {
	return req;
});

export default Req;
