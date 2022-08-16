import { createRouteParamDecorator } from "../Utils";
import NactRequest from "../../request";

const Ip = createRouteParamDecorator(function (req: NactRequest) {
	return req.ip;
});

export default Ip;
